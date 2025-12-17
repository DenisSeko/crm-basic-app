import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pkg from "pg";
import crypto from "crypto";

const { Pool } = pkg;

// EmailService import
import emailService from './services/emailService.js';

console.log('📧 EmailService status:', {
  available: !!emailService,
  hasTransporter: emailService?.transporter ? 'YES' : 'NO',
  hasActivationEmail: typeof emailService?.sendActivationEmail === 'function',
  hasPasswordResetEmail: typeof emailService?.sendPasswordResetEmailSimple === 'function'
});

const app = express();

// Middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);
app.use(express.json());

// Debug middleware
app.use((req, res, next) => {
  console.log(`🌐 ${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});

// PostgreSQL Connection
const pool = new Pool({
  user: "crm_user",
  host: "localhost",
  database: "crm_demo",
  password: "crm_password",
  port: 5433,
});

// JWT Secret
const JWT_SECRET = "your-super-secret-jwt-key-change-in-production";

// ============ AUTHENTICATION MIDDLEWARE ============
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    console.log("❌ No token provided");
    return res.status(401).json({
      success: false,
      message: "Access token required",
    });
  }

  // DEVELOPMENT BYPASS
  if (process.env.NODE_ENV === 'development' && token === 'dev-bypass-2024') {
    console.log('🔧 DEV MODE: Development bypass active');
    req.user = {
      id: 1,
      email: 'dev@demo.com',
      role: 'user',
      email_verified: true,
      status: 'active',
      first_name: 'Development',
      last_name: 'User'
    };
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("🔐 Token decoded:", { userId: decoded.userId });

    const result = await pool.query(
      `SELECT id, username, email, first_name, last_name, full_name, role, company, 
              phone_mobile, email_verified, status, auth_method, department, 
              can_export, can_manage_clients, can_view_reports,
              requires_password_change, password_changed_at
       FROM users WHERE id = $1`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      console.log("❌ User not found for token");
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    req.user = result.rows[0];
    console.log("✅ User authenticated:", {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      requires_password_change: req.user.requires_password_change
    });
    next();
  } catch (error) {
    console.error("❌ Token verification error:", error);
    return res.status(403).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

// Role-based Middleware (konzistentno s auth.js)
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }
    
    if (!roles.includes(req.user.role)) {
      console.log(`🚫 Access denied for role ${req.user.role}, required: ${roles.join(", ")}`);
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(", ")}`,
        user_role: req.user.role,
        required_roles: roles
      });
    }
    
    console.log(`✅ Role check passed: ${req.user.role} in [${roles.join(", ")}]`);
    next();
  };
};

// Backward compatibility for requireAdmin
const requireAdmin = requireRole(['admin']);

// Helper funkcija za generiranje display_name iz emaila
const generateDisplayNameFromEmail = (email) => {
  if (!email) return 'Korisnik';
  
  const nameFromEmail = email.split('@')[0];
  const cleanName = nameFromEmail
    .replace(/[0-9._-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const displayName = cleanName.split(' ')[0] || nameFromEmail;
  return displayName.charAt(0).toUpperCase() + displayName.slice(1);
};

// Helper funkcija za generiranje sigurne lozinke
const generateSecurePassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  return Array.from(crypto.randomBytes(16))
    .map(byte => chars[byte % chars.length])
    .join('');
};

// ============ REQUEST PASSWORD RESET (FORGOT PASSWORD) - POPRAVLJENO ============
app.post("/api/auth/request-password-reset", async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email je obavezan"
      });
    }
    
    console.log("🔐 Forgot password request for:", email);
    
    // Pronađi korisnika
    const userResult = await client.query(
      `SELECT id, email, first_name, last_name, full_name, 
              email_verified, status
       FROM users WHERE email = $1`,
      [email]
    );
    
    // Uvijek vraćaj success (security by obscurity)
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      console.log('ℹ️ User not found, returning generic message');
      return res.json({
        success: true,
        message: "Ako email postoji, poslat ćemo reset link"
      });
    }
    
    const user = userResult.rows[0];
    
    // Provjeri da li je korisnik aktivan
    if (user.status !== 'active') {
      await client.query('ROLLBACK');
      console.log('❌ User not active:', user.status);
      return res.status(400).json({
        success: false,
        message: "Račun nije aktivan"
      });
    }
    
    // Provjeri da li je email verificirani
    if (!user.email_verified) {
      await client.query('ROLLBACK');
      console.log('❌ Email not verified');
      return res.status(400).json({
        success: false,
        message: "Email nije verifikovan"
      });
    }
    
    // Generiraj reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 sat
    
    // Obriši stare reset tokene
    await client.query(
      'DELETE FROM verification_tokens WHERE user_id = $1 AND token_type = $2',
      [user.id, 'password_reset']
    );
    
    // Spremi novi token
    await client.query(
      `INSERT INTO verification_tokens (user_id, token, token_type, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [user.id, resetToken, 'password_reset', expiresAt]
    );
    
    // 🔴 KLJUČNA PROMJENA: Pozovi email servis s PRAVIM tokenom
    let emailSent = false;
    let emailError = null;
    
    try {
      if (emailService && emailService.sendPasswordResetEmailSimple) {
        console.log(`📧 Pozivanje email servisa s tokenom: ${resetToken.substring(0, 15)}...`);
        emailSent = await emailService.sendPasswordResetEmailSimple(
          user.email,
          resetToken,  // ← PRAVI TOKEN IZ BAZE
          user.full_name || user.first_name || 'Korisnik'
        );
        console.log(`📧 Password reset email sent to ${user.email}:`, emailSent ? 'Success' : 'Failed');
      } else {
        console.log('📧 Email service not available. Reset token:', resetToken);
        // Za development, možemo vratiti token u response
        emailSent = false;
        emailError = 'Email servis nije konfigurisan';
      }
    } catch (emailErr) {
      console.error('❌ Error sending password reset email:', emailErr);
      emailError = emailErr.message;
    }
    
    await client.query('COMMIT');
    
    console.log('✅ Password reset token generated for:', user.email);
    console.log('🔐 Actual token saved to DB:', resetToken);  // ← BITNO ZA DEBUG
    
    const response = {
      success: true,
      message: emailSent 
        ? "Link za reset lozinke je poslan na vaš email" 
        : "Reset token generiran" + (emailError ? ` (${emailError})` : ''),
      email_sent: emailSent,
      // 🔴 VAŽNO: Vrati token samo u development modu za debug
      ...(process.env.NODE_ENV === 'development' && { 
        debug_token: resetToken,  // ← Token iz baze
        debug_reset_link: `http://localhost:5173/change-password?token=${resetToken}`
      })
    };
    
    res.json(response);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: "Greška pri slanju reset linka"
    });
  } finally {
    client.release();
  }
});

// ============ VERIFY PASSWORD RESET TOKEN ============
app.get("/api/auth/verify-reset-token/:token", async (req, res) => {
  try {
    const { token } = req.params;
    
    console.log("🔐 Verifying reset token:", token.substring(0, 20) + "...");
    
    const result = await pool.query(
      `SELECT vt.*, u.id as user_id, u.email, u.status, u.email_verified,
              u.first_name, u.last_name, u.full_name
       FROM verification_tokens vt
       JOIN users u ON vt.user_id = u.id
       WHERE vt.token = $1 
         AND vt.token_type = 'password_reset'
         AND vt.used = false
         AND vt.expires_at > NOW()`,
      [token]
    );
    
    if (result.rows.length === 0) {
      console.log('❌ Invalid or expired reset token');
      return res.status(400).json({
        success: false,
        valid: false,
        message: "Reset token je istekao ili je nevažeći"
      });
    }
    
    const tokenData = result.rows[0];
    
    // Provjeri da li je korisnik aktivan
    if (tokenData.status !== 'active') {
      return res.status(400).json({
        success: false,
        valid: false,
        message: "Račun nije aktivan"
      });
    }
    
    console.log('✅ Valid reset token for user:', tokenData.email);
    
    res.json({
      success: true,
      valid: true,
      token: token,
      user: {
        id: tokenData.user_id,
        email: tokenData.email,
        first_name: tokenData.first_name,
        last_name: tokenData.last_name,
        full_name: tokenData.full_name
      }
    });
    
  } catch (error) {
    console.error('❌ Verify reset token error:', error);
    res.status(500).json({
      success: false,
      valid: false,
      message: "Greška pri verifikaciji tokena"
    });
  }
});

// ============ RESET PASSWORD WITH TOKEN ============
app.post("/api/auth/reset-password", async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { token, new_password } = req.body;
    
    if (!token || !new_password) {
      return res.status(400).json({
        success: false,
        message: "Token i nova lozinka su obavezni"
      });
    }
    
    if (new_password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Lozinka mora imati najmanje 8 karaktera"
      });
    }
    
    console.log("🔐 Resetting password with token:", token.substring(0, 20) + "...");
    
    // Provjeri token
    const tokenResult = await client.query(
      `SELECT vt.*, u.id as user_id, u.email, u.status
       FROM verification_tokens vt
       JOIN users u ON vt.user_id = u.id
       WHERE vt.token = $1 
         AND vt.token_type = 'password_reset'
         AND vt.used = false
         AND vt.expires_at > NOW()`,
      [token]
    );
    
    if (tokenResult.rows.length === 0) {
      await client.query('ROLLBACK');
      console.log('❌ Invalid reset token');
      return res.status(400).json({
        success: false,
        message: "Reset token je istekao ili je nevažeći"
      });
    }
    
    const tokenData = tokenResult.rows[0];
    
    // Hash novu lozinku
    const hashedPassword = await bcrypt.hash(new_password, 10);
    
    // Ažuriraj lozinku
    await client.query(
      `UPDATE users SET 
        password_hash = $1,
        requires_password_change = false,
        password_changed_at = NOW(),
        updated_at = NOW()
       WHERE id = $2`,
      [hashedPassword, tokenData.user_id]
    );
    
    // Označi token kao iskorišten
    await client.query(
      `UPDATE verification_tokens SET 
        used = true,
        used_at = NOW()
       WHERE id = $1`,
      [tokenData.id]
    );
    
    // Obriši sve ostale reset tokene za ovog korisnika
    await client.query(
      `DELETE FROM verification_tokens 
       WHERE user_id = $1 
         AND token_type = 'password_reset'
         AND id != $2`,
      [tokenData.user_id, tokenData.id]
    );
    
    await client.query('COMMIT');
    
    console.log(`✅ Password reset successful for user: ${tokenData.email}`);
    
    res.json({
      success: true,
      message: "Lozinka je uspješno resetovana. Sada se možete prijaviti sa novom lozinkom."
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Reset password error:', error);
    res.status(500).json({
      success: false,
      message: "Greška pri resetovanju lozinke"
    });
  } finally {
    client.release();
  }
});

// ============ VERIFY EMAIL TOKEN ENDPOINT ============
app.get("/api/auth/verify/:token", async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const token = req.params.token;
    console.log("🔐 Verify email token:", token.substring(0, 20) + "...");

    // Provjeri token
    const tokenCheck = await client.query(
      `SELECT vt.*, u.id as user_id, u.email, u.first_name, u.last_name, 
              u.full_name, u.role, u.status, u.email_verified, 
              u.requires_password_change
       FROM verification_tokens vt
       JOIN users u ON vt.user_id = u.id
       WHERE vt.token = $1 AND vt.token_type = 'account_activation'`,
      [token]
    );

    if (tokenCheck.rows.length === 0) {
      console.log('❌ Token not found');
      // REDIRECT NA FRONTEND SA ERROROM
      return res.redirect(`http://localhost:5173/activate?error=token_not_found`);
    }

    const tokenData = tokenCheck.rows[0];
    
    // Provjeri da li je token već iskorišten
    if (tokenData.used === true) {
      console.log('ℹ️ Token already used');
      return res.redirect(`http://localhost:5173/activate?error=token_already_used&email=${encodeURIComponent(tokenData.email)}`);
    }
    
    // Provjeri da li je token istekao
    if (tokenData.expires_at < new Date()) {
      console.log('❌ Token expired');
      return res.redirect(`http://localhost:5173/activate?error=token_expired&email=${encodeURIComponent(tokenData.email)}`);
    }

    console.log("✅ Valid token found for user:", {
      email: tokenData.email,
      user_id: tokenData.user_id,
      status: tokenData.status,
      email_verified: tokenData.email_verified
    });

    // Ažuriraj korisnika kao verificiranog
    await client.query(
      `UPDATE users SET 
        status = 'active',
        email_verified = true,
        verified_at = NOW(),
        updated_at = NOW()
       WHERE id = $1`,
      [tokenData.user_id]
    );

    // Označi token kao iskorišten
    await client.query(
      `UPDATE verification_tokens SET 
        used = true,
        used_at = NOW()
       WHERE id = $1`,
      [tokenData.id]
    );

    await client.query('COMMIT');

    console.log("✅ Email verified successfully for:", tokenData.email);

    // Generiraj JWT token za automatsku prijavu
    const authToken = jwt.sign(
      {
        userId: tokenData.user_id,
        email: tokenData.email,
        role: tokenData.role,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    // **KLJUČNA PROMJENA**: REDIRECT NA FRONTEND SA TOKENOM
    const redirectUrl = `http://localhost:5173/activate?token=${authToken}&email=${encodeURIComponent(tokenData.email)}&success=true&requires_password_change=${tokenData.requires_password_change || false}`;
    console.log('🔄 Redirecting to frontend:', redirectUrl);
    
    res.redirect(redirectUrl);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Verify email error:', error);
    // REDIRECT NA FRONTEND SA ERROROM
    const errorUrl = `http://localhost:5173/activate?error=verification_failed&message=${encodeURIComponent("Došlo je do greške pri verifikaciji emaila")}`;
    res.redirect(errorUrl);
  } finally {
    client.release();
  }
});

// ============ VERIFY AUTH TOKEN ENDPOINT ============
app.get("/api/auth/verify", authenticateToken, async (req, res) => {
  try {
    // Ensure user has proper first_name and full_name
    let userFirstName = req.user.first_name;
    let userFullName = req.user.full_name;
    
    // If first_name is empty, generate from email
    if (!userFirstName || !userFirstName.trim()) {
      userFirstName = generateDisplayNameFromEmail(req.user.email);
      console.log(`🔄 Auto-generated first_name for verify: ${userFirstName}`);
    }
    
    // If full_name is empty, create from first_name + last_name
    if (!userFullName || !userFullName.trim()) {
      userFullName = userFirstName + (req.user.last_name ? ' ' + req.user.last_name : userFirstName);
      console.log(`🔄 Auto-generated full_name for verify: ${userFullName}`);
    }

    res.json({
      success: true,
      user: {
        ...req.user,
        first_name: userFirstName,
        full_name: userFullName,
      },
    });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(500).json({
      success: false,
      message: "Error verifying token",
    });
  }
});

// ============ VERIFY ENDPOINT - ROLE-BASED REDIRECT ============
app.get("/api/auth/activate/:token", async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const token = req.params.token;
    const email = req.query.email;
    
    console.log("🎯 Activate account endpoint hit:", {
      token: token.substring(0, 20) + "...",
      email: email || 'No email provided'
    });

    // Check if token exists
    const tokenExistsCheck = await client.query(`
      SELECT vt.*, u.id as user_id, u.email as user_email, u.status as user_status,
             u.first_name, u.last_name, u.full_name, u.role, u.auth_method,
             u.requires_password_change, u.password_hash
      FROM verification_tokens vt
      JOIN users u ON vt.user_id = u.id
      WHERE vt.token = $1 AND vt.token_type = 'account_activation'
    `, [token]);

    if (tokenExistsCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      console.log('❌ Token not found');
      return res.status(404).json({
        success: false,
        error: "Aktivacijski token nije pronađen ili je istekao"
      });
    }

    const existingToken = tokenExistsCheck.rows[0];
    console.log("📋 Token found for user:", {
      email: existingToken.user_email,
      role: existingToken.role,
      status: existingToken.user_status,
      used: existingToken.used,
      auth_method: existingToken.auth_method,
      requires_password_change: existingToken.requires_password_change,
      has_password: !!existingToken.password_hash
    });
    
    // Check if token already used
    if (existingToken.used === true) {
      await client.query('ROLLBACK');
      console.log('ℹ️ Token already used');
      
      if (existingToken.user_status === 'active') {
        // User already active, generate new token for login
        const authToken = jwt.sign(
          {
            userId: existingToken.user_id,
            email: existingToken.user_email,
            role: existingToken.role,
          },
          JWT_SECRET,
          { expiresIn: "24h" }
        );

        // Determine response based on password requirements
        const response = {
          success: true,
          message: "Račun je već aktiviran",
          token: authToken,
          user: {
            id: existingToken.user_id,
            email: existingToken.user_email,
            first_name: existingToken.first_name,
            last_name: existingToken.last_name,
            full_name: existingToken.full_name,
            role: existingToken.role,
            email_verified: true,
            status: 'active',
            requires_password_change: existingToken.requires_password_change
          }
        };
        
        console.log("✅ Account already active, returning user data");
        return res.json(response);
      } else {
        return res.status(400).json({
          success: false,
          error: "Aktivacijski token je već iskorišten"
        });
      }
    }

    // Check if token expired
    if (existingToken.expires_at < new Date()) {
      await client.query('ROLLBACK');
      console.log('❌ Token expired');
      return res.status(400).json({
        success: false,
        error: "Aktivacijski token je istekao"
      });
    }

    // Token valid - activate user
    console.log("✅ Valid token, activating user...");

    // Update user as verified
    await client.query(`
      UPDATE users 
      SET 
        status = 'active',
        email_verified = true,
        verified_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
    `, [existingToken.user_id]);

    // Mark token as used
    await client.query(`
      UPDATE verification_tokens 
      SET 
        used = true,
        used_at = NOW()
      WHERE id = $1
    `, [existingToken.id]);

    // Generate auth token
    const authToken = jwt.sign(
      {
        userId: existingToken.user_id,
        email: existingToken.user_email,
        role: existingToken.role,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    await client.query('COMMIT');

    console.log('✅ Account verified successfully:', existingToken.user_email);

    // Determine if password change is required
    const requiresPasswordChange = existingToken.requires_password_change === true;

    // Prepare response
    const response = {
      success: true,
      message: "Račun je uspješno aktiviran",
      token: authToken,
      user: {
        id: existingToken.user_id,
        email: existingToken.user_email,
        first_name: existingToken.first_name,
        last_name: existingToken.last_name,
        full_name: existingToken.full_name,
        role: existingToken.role,
        email_verified: true,
        status: 'active',
        requires_password_change: requiresPasswordChange
      }
    };

    // If password change is required, add this flag
    if (requiresPasswordChange) {
      response.requires_password_change = true;
      console.log("🔐 Password change required for newly activated user");
    }

    console.log("✅ Activation response prepared:", {
      email: existingToken.user_email,
      role: existingToken.role,
      requires_password_change: requiresPasswordChange
    });
    
    return res.json(response);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Account activation error:', error);
    return res.status(500).json({
      success: false,
      error: "Došlo je do greške pri aktivaciji računa"
    });
  } finally {
    client.release();
  }
});

// ============ RESEND VERIFICATION EMAIL ============
app.post("/api/auth/resend-verification", async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email je obavezan"
      });
    }
    
    // Pronađi korisnika
    const userResult = await client.query(
      `SELECT id, email, first_name, last_name, full_name, 
              email_verified, status
       FROM users WHERE email = $1`,
      [email]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Korisnik s ovim emailom nije pronađen"
      });
    }
    
    const user = userResult.rows[0];
    
    // Provjeri da li je već verificiran
    if (user.email_verified) {
      return res.status(400).json({
        success: false,
        message: "Email je već verificiran"
      });
    }
    
    // Generiraj novi token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    // Obriši stare tokene
    await client.query(
      'DELETE FROM verification_tokens WHERE user_id = $1 AND token_type = $2',
      [user.id, 'account_activation']
    );
    
    // Spremi novi token
    await client.query(
      `INSERT INTO verification_tokens (user_id, token, token_type, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [user.id, verificationToken, 'account_activation', expiresAt]
    );
    
    // Pošalji email
    let emailSent = false;
    try {
      if (emailService && emailService.sendActivationEmail) {
        emailSent = await emailService.sendActivationEmail(
          user.email,
          verificationToken,
          user.full_name || user.first_name,
          'CRM System'
        );
        console.log(`📧 Resent activation email to ${user.email}`);
      }
    } catch (emailError) {
      console.error('❌ Error resending activation email:', emailError);
    }
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: emailSent ? "Verifikacijski email je poslan" : "Token generiran ali email nije poslan",
      email_sent: emailSent
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: "Greška pri slanju verifikacijskog emaila"
    });
  } finally {
    client.release();
  }
});

// ============ DEBUG: TEST TOKEN VERIFICATION ============
app.get("/api/auth/debug-verify/:token", async (req, res) => {
  try {
    const { token } = req.params;
    
    console.log("🔍 DEBUG: Verifikacija tokena:", token);
    
    // Provjeri u bazi
    const result = await pool.query(
      `SELECT vt.*, u.email, u.status, u.first_name
       FROM verification_tokens vt
       JOIN users u ON vt.user_id = u.id
       WHERE vt.token = $1 AND vt.token_type = 'password_reset'`,
      [token]
    );
    
    res.json({
      token: token,
      exists_in_db: result.rows.length > 0,
      details: result.rows[0] || null,
      token_length: token.length,
      token_sample: token.substring(0, 20) + '...'
    });
    
  } catch (error) {
    console.error('❌ Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ AUTH ENDPOINTS ============

// LOGIN ENDPOINT - AŽURIRANO SA PASSWORD CHANGE CHECK
app.post("/api/auth/login", async (req, res) => {
  console.log("=== LOGIN REQUEST START ===");

  try {
    const { email, password } = req.body;

    console.log("🔐 Login attempt for email:", email);

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find user
    const result = await pool.query(
      `SELECT id, email, username, first_name, last_name, full_name, 
              role, status, auth_method, email_verified, password_hash,
              company, phone_mobile, department, 
              can_export, can_manage_clients, can_view_reports,
              requires_password_change, password_changed_at
       FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      console.log("❌ User not found in database");
      return res.status(401).json({
        success: false,
        message: "Incorrect email or password",
      });
    }

    const user = result.rows[0];

    // Check user status
    if (user.status !== "active") {
      console.log("❌ User account not active:", user.status);
      return res.status(401).json({
        success: false,
        message: "Your account is not activated. Contact administrator.",
      });
    }

    // Check password
    let passwordValid = false;
    if (user.password_hash) {
      passwordValid = await bcrypt.compare(password, user.password_hash);
    }
    
    // Development fallback
    if (!passwordValid && process.env.NODE_ENV !== 'production' && password === "password123") {
      passwordValid = true;
      console.log("🔧 DEV MODE: Password accepted");
    }

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: "Incorrect email or password",
      });
    }

    // Update last login
    await pool.query(
      `UPDATE users SET 
        last_login_at = CURRENT_TIMESTAMP,
        login_count = COALESCE(login_count, 0) + 1 
       WHERE id = $1`,
      [user.id]
    );

    // Ensure user has proper first_name and full_name
    let userFirstName = user.first_name;
    let userFullName = user.full_name;
    
    // If first_name is empty, generate from email
    if (!userFirstName || !userFirstName.trim()) {
      userFirstName = generateDisplayNameFromEmail(user.email);
      console.log(`🔄 Auto-generated first_name for login: ${userFirstName}`);
    }
    
    // If full_name is empty, create from first_name + last_name
    if (!userFullName || !userFullName.trim()) {
      userFullName = userFirstName + (user.last_name ? ' ' + user.last_name : userFirstName);
      console.log(`🔄 Auto-generated full_name for login: ${userFullName}`);
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    console.log("✅ Login successful for:", user.email);
    console.log("🔍 Password change status:", user.requires_password_change);

    // Check if password change is required
    if (user.requires_password_change === true) {
      console.log("⚠️ User requires password change - returning 403 with redirect flag");
      return res.status(403).json({
        success: false,
        message: "Morate promijeniti lozinku pri prvoj prijavi",
        requires_password_change: true,
        code: "PASSWORD_CHANGE_REQUIRED",
        token: token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          first_name: userFirstName,
          last_name: user.last_name,
          full_name: userFullName,
          role: user.role,
          email_verified: user.email_verified,
          status: user.status,
          requires_password_change: true,
        }
      });
    }

    // Normal successful login
    res.json({
      success: true,
      message: "Login successful",
      token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        first_name: userFirstName,
        last_name: user.last_name,
        full_name: userFullName,
        role: user.role,
        company: user.company,
        phone_mobile: user.phone_mobile,
        email_verified: user.email_verified,
        status: user.status,
        auth_method: user.auth_method,
        department: user.department,
        can_export: user.can_export,
        can_manage_clients: user.can_manage_clients,
        can_view_reports: user.can_view_reports,
        requires_password_change: false, // Explicitly false
        password_changed_at: user.password_changed_at,
      },
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login error",
    });
  }
});

// CHANGE PASSWORD ENDPOINT (regular password change)
app.post("/api/auth/change-password", authenticateToken, async (req, res) => {
  console.log("=== REGULAR PASSWORD CHANGE REQUEST ===");
  
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Trenutna i nova lozinka su obavezne"
      });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Nova lozinka mora imati najmanje 8 karaktera"
      });
    }
    
    // Get user with password hash
    const userResult = await pool.query(
      `SELECT id, password_hash FROM users WHERE id = $1`,
      [req.user.id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Korisnik nije pronađen"
      });
    }
    
    const user = userResult.rows[0];
    
    // Verify current password
    if (user.password_hash) {
      const passwordValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!passwordValid) {
        return res.status(401).json({
          success: false,
          message: "Trenutna lozinka nije ispravna"
        });
      }
    }
    
    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await pool.query(
      `UPDATE users SET 
        password_hash = $1,
        password_changed_at = NOW(),
        updated_at = NOW()
       WHERE id = $2`,
      [newPasswordHash, req.user.id]
    );
    
    console.log("✅ Regular password changed successfully for user:", req.user.email);
    
    res.json({
      success: true,
      message: "Lozinka je uspješno promijenjena"
    });
    
  } catch (error) {
    console.error("❌ Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Greška pri promjeni lozinke"
    });
  }
});

// FORCE PASSWORD CHANGE ENDPOINT (for users with required password change)
app.post("/api/auth/force-change-password", authenticateToken, async (req, res) => {
  console.log("=== FORCE PASSWORD CHANGE REQUEST ===");
  
  try {
    const { newPassword } = req.body;
    
    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: "Nova lozinka je obavezna"
      });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Lozinka mora imati najmanje 8 karaktera"
      });
    }
    
    // Verify that user requires password change
    if (!req.user.requires_password_change) {
      return res.status(400).json({
        success: false,
        message: "Promjena lozinke nije potrebna"
      });
    }
    
    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    
    // Update password and clear the requires_password_change flag
    await pool.query(
      `UPDATE users SET 
        password_hash = $1,
        requires_password_change = false,
        password_changed_at = NOW(),
        updated_at = NOW()
       WHERE id = $2`,
      [newPasswordHash, req.user.id]
    );
    
    // Generate new token with updated user info
    const newToken = jwt.sign(
      {
        userId: req.user.id,
        email: req.user.email,
        role: req.user.role,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );
    
    console.log("✅ Force password change successful for user:", req.user.email);
    
    res.json({
      success: true,
      message: "Lozinka je uspješno postavljena",
      token: newToken,
      user: {
        ...req.user,
        requires_password_change: false,
        password_changed_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error("❌ Force change password error:", error);
    res.status(500).json({
      success: false,
      message: "Greška pri postavljanju lozinke"
    });
  }
});

// ============ ADMIN ENDPOINTS ============

// GET ALL USERS
app.get(
  "/api/admin/users",
  authenticateToken,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, username, email, first_name, last_name, full_name, role, company, 
              phone_mobile, status, email_verified, auth_method, department,
              can_export, can_manage_clients, can_view_reports,
              requires_password_change, password_changed_at,
              created_at, last_login_at, login_count
       FROM users ORDER BY created_at DESC`
      );

      res.json({
        success: true,
        data: result.rows,
        total: result.rows.length,
      });
    } catch (error) {
      console.error("❌ Get users error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching users",
      });
    }
  }
);

// CREATE USER - SEND ACTIVATION EMAIL SA GENERISANJEM LOZINKE
app.post(
  "/api/admin/users",
  authenticateToken,
  requireRole(['admin']),
  async (req, res) => {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const {
        email,
        first_name = "",
        last_name = "",
        phone_mobile = "",
        phone_office = "",
        company = "",
        address = "",
        department = "",
        role = "user",
        send_activation_email = true,
        generate_password = true,
      } = req.body;

      console.log("🔧 Creating user with data:", { 
        email, 
        first_name,
        last_name,
        role,
        generate_password 
      });

      // VALIDACIJA: Email je obavezan
      if (!email || !email.trim()) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          error: "Email je obavezno polje",
        });
      }

      // Check if email already exists
      const existingEmailCheck = await client.query(
        "SELECT id FROM users WHERE email = $1",
        [email]
      );

      if (existingEmailCheck.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          error: "Korisnik s ovim emailom već postoji",
        });
      }

      // GENERIRAJ PRIVREMENU LOZINKU AKO JE TRAŽENA
      let temporaryPassword = null;
      let passwordHash = null;
      
      if (generate_password) {
        temporaryPassword = generateSecurePassword();
        console.log(`🔐 Generated temporary password for ${email}: ${temporaryPassword}`);
        passwordHash = await bcrypt.hash(temporaryPassword, 10);
      }

      // NORMALIZACIJA: Očisti i popuni prazna polja
      let finalFirstName = first_name ? first_name.trim() : "";
      let finalLastName = last_name ? last_name.trim() : "";
      
      if (!finalFirstName) {
        finalFirstName = generateDisplayNameFromEmail(email);
        console.log(`🔄 Auto-generated first_name from email: ${finalFirstName}`);
      }

      if (!finalLastName) {
        finalLastName = "Korisnik";
        console.log(`🔄 Using default last_name: ${finalLastName}`);
      }

      // Generiraj full_name
      let finalFullName = `${finalFirstName} ${finalLastName}`.trim();
      console.log(`🔄 Generated full_name: ${finalFullName}`);

      // GENERIRAJ UNIKATNI USERNAME
      let baseUsername = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      let username = baseUsername;
      let usernameCounter = 1;
      let maxAttempts = 100;
      
      // Provjeri da li username već postoji i generiraj jedinstveni
      while (true) {
        const usernameExists = await client.query(
          "SELECT id FROM users WHERE username = $1",
          [username]
        );
        
        if (usernameExists.rows.length === 0) {
          break; // Username je slobodan
        }
        
        // Generiraj novi username sa brojem
        username = `${baseUsername}${usernameCounter}`;
        usernameCounter++;
        
        if (usernameCounter > maxAttempts) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            success: false,
            error: "Nije moguće generirati jedinstveni username. Pokušajte s drugim email-om."
          });
        }
      }
      
      console.log(`🔄 Generated unique username: ${username}`);

      // Odredi auth_method
      const authMethod = generate_password ? "email_password" : "email_only";

      // Create new user
      const userResult = await client.query(
        `INSERT INTO users (
          username, email, first_name, last_name, full_name,
          phone_mobile, phone_office, company, address, department,
          auth_method, role, status, email_verified,
          password_hash, requires_password_change, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *`,
        [
          username,
          email,
          finalFirstName,
          finalLastName,
          finalFullName,
          phone_mobile,
          phone_office,
          company,
          address,
          department,
          authMethod,
          role,
          "pending_verification",
          false,
          passwordHash,
          generate_password ? true : false,
          req.user.id,
        ]
      );

      const newUser = userResult.rows[0];

      let activationData = null;
      let emailSent = false;

      // If selected, generate activation token
      if (send_activation_email) {
        const verificationToken = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Save token
        await client.query(
          `INSERT INTO verification_tokens (user_id, token, token_type, expires_at)
           VALUES ($1, $2, $3, $4)`,
          [newUser.id, verificationToken, "account_activation", expiresAt]
        );

        // Send email
        try {
          if (emailService && emailService.sendActivationEmail) {
            emailSent = await emailService.sendActivationEmail(
              email,
              verificationToken,
              finalFullName,
              req.user.full_name || req.user.username
            );
          }
        } catch (emailError) {
          console.error("❌ Activation email error:", emailError);
        }

        activationData = {
          email_sent: emailSent,
          activation_token: verificationToken,
          activation_link: `http://localhost:8888/api/auth/verify/${verificationToken}` // PROMJENA: koristi /verify umjesto /activate
        };
      }

      await client.query("COMMIT");

      console.log("✅ User created successfully:", {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        full_name: newUser.full_name,
        has_password: !!passwordHash,
        requires_password_change: newUser.requires_password_change
      });

      // SAČUVAJ ODGOVOR
      const response = {
        success: true,
        message: generate_password
          ? "Korisnik kreiran. Privremena lozinka je generisana."
          : "Korisnik kreiran.",
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          first_name: newUser.first_name,
          last_name: newUser.last_name,
          full_name: newUser.full_name,
          role: newUser.role,
          status: newUser.status,
          email_verified: newUser.email_verified,
          auth_method: newUser.auth_method,
          requires_password_change: newUser.requires_password_change,
          created_at: newUser.created_at,
        },
        activation: activationData,
      };

      // DODAJ PRIVREMENU LOZINKU SAMO U ODGOVORU ADMINU
      if (generate_password && temporaryPassword) {
        response.temporary_password = temporaryPassword;
        response.password_note = "Ova lozinka se prikazuje samo jednom. Korisnik će morati promijeniti lozinku pri prvoj prijavi.";
        response.password_warning = "Kopirajte i spremite ovu lozinku odmah. Neće biti ponovno prikazana.";
      }

      res.status(201).json(response);

    } catch (error) {
      await client.query("ROLLBACK");
      console.error("❌ Create user error:", error);
      
      let errorMessage = "Greška pri kreiranju korisnika";
      
      // Specifične poruke za različite greške
      if (error.message.includes("users_username_key") || error.message.includes("duplicate key")) {
        errorMessage = "Generirani username već postoji u sustavu. Pokušajte ponovo.";
      } else {
        errorMessage += ": " + error.message;
      }
      
      res.status(500).json({
        success: false,
        error: errorMessage,
      });
    } finally {
      client.release();
    }
  }
);

// GET SINGLE USER
app.get(
  "/api/admin/users/:id",
  authenticateToken,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const userId = req.params.id;
      console.log("🔍 GET User ID:", userId);

      const result = await pool.query(
        `SELECT id, username, email, first_name, last_name, full_name, role, company, 
              phone_mobile, phone_office, address, department,
              status, email_verified, auth_method,
              can_export, can_manage_clients, can_view_reports, notes,
              requires_password_change, password_changed_at,
              created_at, updated_at, last_login_at, login_count
       FROM users WHERE id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Korisnik nije pronađen'
        });
      }

      const user = result.rows[0];

      console.log("✅ User found:", {
        id: user.id,
        email: user.email,
        role: user.role
      });

      res.json({
        success: true,
        user: user
      });

    } catch (error) {
      console.error('❌ Get user error:', error);
      res.status(500).json({
        success: false,
        error: 'Greška pri dohvaćanju korisnika: ' + error.message
      });
    }
  }
);

// UPDATE USER
app.put(
  "/api/admin/users/:id",
  authenticateToken,
  requireRole(['admin']),
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const userId = req.params.id;
      const {
        first_name,
        last_name,
        email,
        phone_mobile,
        phone_office,
        company,
        address,
        department,
        role,
        auth_method,
        status,
        email_verified,
        can_export,
        can_manage_clients,
        can_view_reports,
        notes
      } = req.body;

      console.log("🔧 Updating user ID:", userId, "with data:", req.body);

      // Provjeri da li korisnik postoji
      const existingUser = await client.query(
        "SELECT id, email FROM users WHERE id = $1",
        [userId]
      );

      if (existingUser.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Korisnik nije pronađen'
        });
      }

      // Ako se mijenja email, provjeri da li je novi email slobodan
      if (email && email !== existingUser.rows[0].email) {
        const emailCheck = await client.query(
          "SELECT id FROM users WHERE email = $1 AND id != $2",
          [email, userId]
        );

        if (emailCheck.rows.length > 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            error: 'Email već postoji u sustavu'
          });
        }
      }

      // Generiraj full_name ako se mijenjaju ime/prezime
      let finalFullName = '';
      if (first_name || last_name) {
        const currentUser = await client.query(
          "SELECT first_name, last_name, full_name FROM users WHERE id = $1",
          [userId]
        );
        
        const currentFirstName = currentUser.rows[0]?.first_name || '';
        const currentLastName = currentUser.rows[0]?.last_name || '';
        
        const newFirstName = first_name !== undefined ? first_name : currentFirstName;
        const newLastName = last_name !== undefined ? last_name : currentLastName;
        
        finalFullName = `${newFirstName} ${newLastName}`.trim();
      }

      // Ažuriraj korisnika
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      if (first_name !== undefined) {
        updateFields.push(`first_name = $${paramIndex++}`);
        updateValues.push(first_name);
      }
      
      if (last_name !== undefined) {
        updateFields.push(`last_name = $${paramIndex++}`);
        updateValues.push(last_name);
      }
      
      if (email !== undefined) {
        updateFields.push(`email = $${paramIndex++}`);
        updateValues.push(email);
      }
      
      if (phone_mobile !== undefined) {
        updateFields.push(`phone_mobile = $${paramIndex++}`);
        updateValues.push(phone_mobile);
      }
      
      if (phone_office !== undefined) {
        updateFields.push(`phone_office = $${paramIndex++}`);
        updateValues.push(phone_office);
      }
      
      if (company !== undefined) {
        updateFields.push(`company = $${paramIndex++}`);
        updateValues.push(company);
      }
      
      if (address !== undefined) {
        updateFields.push(`address = $${paramIndex++}`);
        updateValues.push(address);
      }
      
      if (department !== undefined) {
        updateFields.push(`department = $${paramIndex++}`);
        updateValues.push(department);
      }
      
      if (role !== undefined) {
        updateFields.push(`role = $${paramIndex++}`);
        updateValues.push(role);
      }
      
      if (auth_method !== undefined) {
        updateFields.push(`auth_method = $${paramIndex++}`);
        updateValues.push(auth_method);
      }
      
      if (status !== undefined) {
        updateFields.push(`status = $${paramIndex++}`);
        updateValues.push(status);
      }
      
      if (email_verified !== undefined) {
        updateFields.push(`email_verified = $${paramIndex++}`);
        updateValues.push(email_verified);
      }
      
      if (can_export !== undefined) {
        updateFields.push(`can_export = $${paramIndex++}`);
        updateValues.push(can_export);
      }
      
      if (can_manage_clients !== undefined) {
        updateFields.push(`can_manage_clients = $${paramIndex++}`);
        updateValues.push(can_manage_clients);
      }
      
      if (can_view_reports !== undefined) {
        updateFields.push(`can_view_reports = $${paramIndex++}`);
        updateValues.push(can_view_reports);
      }
      
      if (notes !== undefined) {
        updateFields.push(`notes = $${paramIndex++}`);
        updateValues.push(notes);
      }
      
      if (finalFullName) {
        updateFields.push(`full_name = $${paramIndex++}`);
        updateValues.push(finalFullName);
      }

      // Dodaj updated_at
      updateFields.push(`updated_at = NOW()`);

      if (updateFields.length === 1) { // Samo updated_at
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: 'Nema podataka za ažuriranje'
        });
      }

      // Izvrši update
      updateValues.push(userId);
      
      const updateQuery = `
        UPDATE users 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(updateQuery, updateValues);
      const updatedUser = result.rows[0];

      await client.query('COMMIT');

      console.log("✅ User updated successfully:", {
        id: updatedUser.id,
        email: updatedUser.email,
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        role: updatedUser.role
      });

      res.json({
        success: true,
        message: 'Korisnik uspješno ažuriran',
        user: updatedUser
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Update user error:', error);
      res.status(500).json({
        success: false,
        error: 'Greška pri ažuriranju korisnika: ' + error.message
      });
    } finally {
      client.release();
    }
  }
);

// RESEND ACTIVATION EMAIL
app.post(
  "/api/admin/users/:id/resend-activation",
  authenticateToken,
  requireRole(['admin']),
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const userId = req.params.id;
      
      console.log('🔧 Resending activation for user:', userId);

      // Dohvati korisnika
      const userResult = await client.query(
        `SELECT id, email, first_name, last_name, full_name 
         FROM users WHERE id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Korisnik nije pronađen'
        });
      }

      const user = userResult.rows[0];

      // Provjeri da li korisnik već nije aktivan
      const userStatusCheck = await client.query(
        `SELECT status, email_verified FROM users WHERE id = $1`,
        [userId]
      );
      
      if (userStatusCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Korisnik nije pronađen'
        });
      }

      const userStatus = userStatusCheck.rows[0];
      
      if (userStatus.status === 'active' || userStatus.email_verified === true) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: 'Korisnik je već aktivan i verificiran'
        });
      }

      // Generiraj novi token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Obriši stare tokene za ovog korisnika
      await client.query(
        'DELETE FROM verification_tokens WHERE user_id = $1 AND token_type = $2',
        [userId, 'account_activation']
      );

      // Spremi novi token
      await client.query(`
        INSERT INTO verification_tokens (user_id, token, token_type, expires_at)
        VALUES ($1, $2, $3, $4)
      `, [userId, verificationToken, 'account_activation', expiresAt]);

      console.log('🔑 New activation token generated:', verificationToken);

      // POŠALJI EMAIL
      let emailSent = false;
      try {
        if (emailService && emailService.sendActivationEmail) {
          emailSent = await emailService.sendActivationEmail(
            user.email,
            verificationToken,
            user.full_name || user.first_name,
            req.user.full_name || req.user.username
          );
          console.log(`📧 Activation email sent to ${user.email}:`, emailSent ? 'Success' : 'Failed');
        } else {
          console.log('⚠️ Email service not available for resend activation');
        }
      } catch (emailError) {
        console.error('❌ Activation email error:', emailError);
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: emailSent ? 'Aktivacijski email ponovno poslan' : 'Token generiran ali email nije poslan',
        email: {
          sent: emailSent,
          to: user.email
        },
        activation: {
          activation_token: verificationToken,
          activation_link: `http://localhost:8888/api/auth/verify/${verificationToken}` // PROMJENA: koristi /verify
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Resend activation error:', error);
      res.status(500).json({
        success: false,
        error: 'Greška pri slanju aktivacijskog emaila: ' + error.message
      });
    } finally {
      client.release();
    }
  }
);

// RESET USER PASSWORD (admin can reset user's password)
app.post(
  "/api/admin/users/:id/reset-password",
  authenticateToken,
  requireRole(['admin']),
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const userId = req.params.id;
      const { send_email = false } = req.body;
      
      console.log('🔧 Resetting password for user:', userId);

      // Dohvati korisnika
      const userResult = await client.query(
        `SELECT id, email, first_name, last_name, full_name 
         FROM users WHERE id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Korisnik nije pronađen'
        });
      }

      const user = userResult.rows[0];

      // Generiraj novu privremenu lozinku
      const temporaryPassword = generateSecurePassword();
      console.log(`🔐 Generated new password for ${user.email}: ${temporaryPassword}`);
      
      // Hash lozinku
      const passwordHash = await bcrypt.hash(temporaryPassword, 10);

      // Ažuriraj korisnika
      await client.query(
        `UPDATE users SET 
          password_hash = $1,
          requires_password_change = true,
          password_changed_at = NULL,
          updated_at = NOW()
         WHERE id = $2`,
        [passwordHash, userId]
      );

      let emailSent = false;
      let emailError = null;
      
      // Pošalji email sa novom lozinkom ako je traženo
      if (send_email && emailService) {
        try {
          if (emailService.transporter) {
            console.log(`📧 Sending password reset email to ${user.email}...`);
            
            const mailOptions = {
              from: '"CRM System" <noreply@crm.com>',
              to: user.email,
              subject: '🔐 Nova lozinka za CRM sustav',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #333;">Nova lozinka za CRM sustav</h2>
                  <p>Poštovani ${user.full_name || user.first_name || 'korisniče'},</p>
                  <p>Administrator sustava je generirao novu lozinku za vaš račun.</p>
                  
                  <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Vaša nova privremena lozinka:</strong></p>
                    <p style="font-size: 18px; font-weight: bold; color: #dc3545; margin: 10px 0;">
                      ${temporaryPassword}
                    </p>
                  </div>
                  
                  <p><strong>Važne napomene:</strong></p>
                  <ul>
                    <li>Ova lozinka je privremena</li>
                    <li>Morat ćete promijeniti lozinku pri sljedećoj prijavi</li>
                    <li>Lozinku ne dijelite s drugima</li>
                  </ul>
                  
                  <p>Za prijavu koristite svoj email: <strong>${user.email}</strong></p>
                  
                  <div style="background-color: #fff3cd; color: #856404; padding: 10px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>⚠️ Sigurnosna napomena:</strong></p>
                    <p style="margin: 5px 0 0 0;">Nakon što se prijavite, obavezno promijenite lozinku u nešto što ćete lako pamtiti.</p>
                  </div>
                  
                  <p>Lijep pozdrav,<br>CRM Administratorski tim</p>
                </div>
              `
            };
            
            const info = await emailService.transporter.sendMail(mailOptions);
            emailSent = true;
            console.log('📧 Password reset email sent successfully:', info.messageId);
          }
        } catch (transporterError) {
          console.error('❌ Error sending password reset email:', transporterError);
          emailError = transporterError.message;
        }
      }

      await client.query('COMMIT');

      // Vrati novu lozinku adminu
      const response = {
        success: true,
        message: 'Lozinka uspješno resetovana',
        temporary_password: temporaryPassword,
        password_note: 'Ova lozinka se prikazuje samo jednom. Korisnik će morati promijeniti lozinku pri sljedećoj prijavi.',
        user: {
          id: user.id,
          email: user.email,
          name: user.full_name,
          requires_password_change: true
        }
      };

      // Dodaj informacije o emailu u odgovor
      if (send_email) {
        response.email_sent = emailSent;
        if (!emailSent && emailError) {
          response.email_error = emailError;
        }
      }

      res.json(response);

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Reset password error:', error);
      res.status(500).json({
        success: false,
        error: 'Greška pri resetovanju lozinke: ' + error.message
      });
    } finally {
      client.release();
    }
  }
);

// DELETE USER
app.delete(
  "/api/admin/users/:id",
  authenticateToken,
  requireRole(['admin']),
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const userId = req.params.id;
      const requestingAdminId = req.user.id;
      
      console.log('🗑️ Deleting user ID:', userId, 'by admin:', requestingAdminId);

      // 1. Provjeri da li korisnik postoji
      const userCheck = await client.query(
        `SELECT id, email, role, status FROM users WHERE id = $1`,
        [userId]
      );

      if (userCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Korisnik nije pronađen'
        });
      }

      const user = userCheck.rows[0];

      // 2. Provjeri da li se pokušava obrisati admin
      if (user.role === 'admin') {
        await client.query('ROLLBACK');
        return res.status(403).json({
          success: false,
          error: 'Ne možete obrisati administratora'
        });
      }

      // 3. Provjeri da li se admin pokušava obrisati samog sebe
      if (parseInt(userId) === requestingAdminId) {
        await client.query('ROLLBACK');
        return res.status(403).json({
          success: false,
          error: 'Ne možete obrisati vlastiti račun'
        });
      }

      // 4. SOFT DELETE pristup: Označi korisnika kao obrisanog
      // (Umjesto fizičkog brisanja, mijenjamo status)
      // const result = await client.query(
      //   `UPDATE users SET 
      //     status = 'deleted',
      //     email = $1,
      //     username = $2,
      //     is_deleted = true,
      //     deleted_at = NOW(),
      //     deleted_by = $3,
      //     updated_at = NOW()
      //    WHERE id = $4
      //    RETURNING id, email, status, deleted_at`,
      //   [
      //     `deleted_${user.email}_${Date.now()}`, // maskiraj email
      //     `deleted_${user.id}_${Date.now()}`,    // maskiraj username
      //     requestingAdminId,
      //     userId
      //   ]
      // );

      // 5. Alternativno: FIZIČKO BRISANJE (ako želite)
      // Komentirajte soft delete gore i odkomentirajte ovu liniju:
      const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING id, email', [userId]);

      const deletedUser = result.rows[0];

      // 6. Obriši sve verification tokene za ovog korisnika
      await client.query(
        'DELETE FROM verification_tokens WHERE user_id = $1',
        [userId]
      );

      await client.query('COMMIT');

      console.log('✅ User deleted successfully:', {
        id: deletedUser.id,
        original_email: user.email,
        status: deletedUser.status,
        deleted_at: deletedUser.deleted_at
      });

      res.json({
        success: true,
        message: 'Korisnik je uspješno obrisan',
        user: {
          id: deletedUser.id,
          original_email: user.email,
          status: deletedUser.status,
          deleted_at: deletedUser.deleted_at
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Delete user error:', error);
      
      // Specifične poruke za greške
      let errorMessage = 'Greška pri brisanju korisnika';
      
      if (error.message.includes('foreign key constraint')) {
        errorMessage = 'Korisnik ima povezane podatke (klijenti, bilješke) i ne može biti obrisan';
      }
      
      res.status(500).json({
        success: false,
        error: errorMessage + ': ' + error.message
      });
    } finally {
      client.release();
    }
  }
);

// PATCH USER (parcijalni update)
app.patch(
  "/api/admin/users/:id",
  authenticateToken,
  requireRole(['admin']),
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const userId = req.params.id;
      
      console.log('🔧 Patching user ID:', userId, 'with data:', req.body);

      // Provjeri da li korisnik postoji
      const userCheck = await client.query(
        "SELECT id FROM users WHERE id = $1",
        [userId]
      );

      if (userCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Korisnik nije pronađen'
        });
      }

      // Dinamički buildanje update query-ja
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      // Prođi kroz sve polja u request body-ju
      Object.entries(req.body).forEach(([key, value]) => {
        // Provjeri da li polje postoji u users tabeli (dodaj validaciju prema vašoj shemi)
        const allowedFields = [
          'first_name', 'last_name', 'email', 'phone_mobile', 'phone_office',
          'company', 'address', 'department', 'role', 'auth_method',
          'status', 'email_verified', 'can_export', 'can_manage_clients',
          'can_view_reports', 'notes', 'requires_password_change'
        ];
        
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = $${paramIndex++}`);
          updateValues.push(value);
        }
      });

      // Dodaj updated_at
      updateFields.push(`updated_at = NOW()`);

      if (updateFields.length === 1) { // Samo updated_at
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: 'Nema podataka za ažuriranje'
        });
      }

      // Izvrši update
      updateValues.push(userId);
      
      const updateQuery = `
        UPDATE users 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(updateQuery, updateValues);
      const updatedUser = result.rows[0];

      await client.query('COMMIT');

      console.log("✅ User patched successfully:", {
        id: updatedUser.id,
        email: updatedUser.email,
        fields_updated: updateFields.length - 1 // minus updated_at
      });

      res.json({
        success: true,
        message: 'Korisnik uspješno ažuriran',
        user: updatedUser
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Patch user error:', error);
      res.status(500).json({
        success: false,
        error: 'Greška pri ažuriranju korisnika: ' + error.message
      });
    } finally {
      client.release();
    }
  }
);

// ============ CLIENTS ENDPOINTS ============
app.get("/api/clients", authenticateToken, async (req, res) => {
  try {
    let query = "";
    let params = [];

    if (req.user.role === "admin") {
      query = `
        SELECT c.*, u.username as created_by_username,
               u.email as creator_email
        FROM clients c
        LEFT JOIN users u ON c.created_by = u.id
        ORDER BY c.created_at DESC
      `;
    } else {
      query = `
        SELECT c.*, u.username as created_by_username,
               u.email as creator_email
        FROM clients c
        LEFT JOIN users u ON c.created_by = u.id
        LEFT JOIN user_clients uc ON c.id = uc.client_id
        WHERE uc.user_id = $1 OR c.created_by = $1
        ORDER BY c.created_at DESC
      `;
      params = [req.user.id];
    }

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error("Get clients error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching clients",
    });
  }
});

// CREATE CLIENT
app.post("/api/clients", authenticateToken, async (req, res) => {
  try {
    const { 
      name, 
      email, 
      company, 
      phone, 
      address, 
      notes
    } = req.body;

    // Check if client already exists
    const existingClient = await pool.query(
      "SELECT id FROM clients WHERE email = $1",
      [email]
    );

    if (existingClient.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Client with this email already exists",
      });
    }

    // Create client
    const clientResult = await pool.query(
      `INSERT INTO clients 
       (name, email, company, phone, address, notes, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [name, email, company, phone, address, notes, req.user.id]
    );

    const client = clientResult.rows[0];

    res.json({
      success: true,
      message: "Client successfully created",
      data: client,
    });
  } catch (error) {
    console.error("Create client error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating client",
    });
  }
});

// DELETE CLIENT
app.delete("/api/clients/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if client exists
    const existingClient = await pool.query(
      "SELECT id, created_by FROM clients WHERE id = $1",
      [id]
    );

    if (existingClient.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    // Check permissions
    if (
      req.user.role !== "admin" &&
      existingClient.rows[0].created_by !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete this client",
      });
    }

    // Delete client
    await pool.query("DELETE FROM clients WHERE id = $1", [id]);

    res.json({
      success: true,
      message: "Client successfully deleted",
    });
  } catch (error) {
    console.error("Delete client error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting client",
    });
  }
});

// ============ NOTES ENDPOINTS ============
app.get("/api/notes", authenticateToken, async (req, res) => {
  try {
    let result;

    if (req.user.role === "admin") {
      result = await pool.query(`
        SELECT n.*, c.name as client_name, u.username as created_by_username
        FROM notes n
        LEFT JOIN clients c ON n.client_id = c.id
        LEFT JOIN users u ON n.created_by = u.id
        ORDER BY n.created_at DESC
      `);
    } else {
      result = await pool.query(
        `
        SELECT n.*, c.name as client_name, u.username as created_by_username
        FROM notes n
        INNER JOIN user_clients uc ON n.client_id = uc.client_id
        LEFT JOIN clients c ON n.client_id = c.id
        LEFT JOIN users u ON n.created_by = u.id
        WHERE uc.user_id = $1
        ORDER BY n.created_at DESC
      `,
        [req.user.id]
      );
    }

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error("Get notes error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching notes",
    });
  }
});

// CREATE NOTE
app.post("/api/notes", authenticateToken, async (req, res) => {
  try {
    const { client_id, title, content, note_type = "general" } = req.body;

    // Check if client exists and user has access
    let clientCheck;
    if (req.user.role === "admin") {
      clientCheck = await pool.query("SELECT id FROM clients WHERE id = $1", [
        client_id,
      ]);
    } else {
      clientCheck = await pool.query(
        `
        SELECT c.id FROM clients c
        INNER JOIN user_clients uc ON c.id = uc.client_id
        WHERE c.id = $1 AND uc.user_id = $2
      `,
        [client_id, req.user.id]
      );
    }

    if (clientCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to this client",
      });
    }

    // Create note
    const noteResult = await pool.query(
      `
      INSERT INTO notes 
      (client_id, title, content, note_type, created_by) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING *
    `,
      [client_id, title, content, note_type, req.user.id]
    );

    const note = noteResult.rows[0];

    res.json({
      success: true,
      message: "Note successfully created",
      data: note,
    });
  } catch (error) {
    console.error("Create note error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating note",
    });
  }
});

// DELETE NOTE
app.delete("/api/notes/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if note exists
    let noteCheck;
    if (req.user.role === "admin") {
      noteCheck = await pool.query("SELECT * FROM notes WHERE id = $1", [id]);
    } else {
      noteCheck = await pool.query(
        `
        SELECT n.* FROM notes n
        INNER JOIN user_clients uc ON n.client_id = uc.client_id
        WHERE n.id = $1 AND uc.user_id = $2
      `,
        [id, req.user.id]
      );
    }

    if (noteCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    // Check permissions
    const note = noteCheck.rows[0];
    if (req.user.role !== "admin" && note.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete this note",
      });
    }

    // Delete note
    await pool.query("DELETE FROM notes WHERE id = $1", [id]);

    res.json({
      success: true,
      message: "Note successfully deleted",
    });
  } catch (error) {
    console.error("Delete note error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting note",
    });
  }
});

// ============ HEALTH CHECK ============
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      success: true,
      message: "API is running",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

// ============ TEST PASSWORD RESET FLOW ============
app.get("/api/auth/test-reset-flow", async (req, res) => {
  try {
    // Pronađi korisnika za test
    const userResult = await pool.query(
      "SELECT id, email, first_name FROM users WHERE status = 'active' LIMIT 1"
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Nema aktivnih korisnika za test"
      });
    }
    
    const user = userResult.rows[0];
    
    // Generiraj token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000);
    
    // Obriši stare tokene
    await pool.query(
      'DELETE FROM verification_tokens WHERE user_id = $1 AND token_type = $2',
      [user.id, 'password_reset']
    );
    
    // Spremi novi token
    await pool.query(
      `INSERT INTO verification_tokens (user_id, token, token_type, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [user.id, resetToken, 'password_reset', expiresAt]
    );
    
    const testData = {
      success: true,
      message: "Test token generiran",
      test_user: {
        id: user.id,
        email: user.email,
        name: user.first_name
      },
      token: resetToken,
      endpoints: {
        verify_token: `http://localhost:8888/api/auth/verify-reset-token/${resetToken}`,
        debug_verify: `http://localhost:8888/api/auth/debug-verify/${resetToken}`,
        frontend_link: `http://localhost:5173/change-password?token=${resetToken}`,
        reset_password: `http://localhost:8888/api/auth/reset-password (POST sa token i new_password)`
      },
      instructions: [
        "1. Kopiraj token i testiraj verify endpoint",
        "2. Koristi frontend link za ručno testiranje",
        "3. Testiraj reset password sa tokenom"
      ]
    };
    
    res.json(testData);
    
  } catch (error) {
    console.error('❌ Test reset flow error:', error);
    res.status(500).json({
      success: false,
      message: "Greška pri testiranju reset flow-a"
    });
  }
});

// ============ START SERVER ============
const PORT = 8888;
app.listen(PORT, () => {
  console.log("\n🚀 CRM API Server running!");
  console.log(`📍 Port: ${PORT}`);
  console.log(`📍 Base URL: http://localhost:${PORT}`);
  console.log("🔐 JWT Auth: ACTIVE");
  console.log("🔐 Password Security: ENHANCED");
  console.log("📧 Email verification: ACTIVE");
  console.log("🎯 Role-based redirect: ACTIVE");
  console.log("🔀 Admin → /admin");
  console.log("🔀 User/Manager → /dashboard");
  console.log("\n📋 NEW SECURITY FEATURES:");
  console.log("   ✅ Temporary password generation");
  console.log("   ✅ Force password change on first login");
  console.log("   ✅ Secure password hashing");
  console.log("   ✅ Admin password reset");
  console.log("   ✅ Unique username generation");
  console.log("\n🔑 PASSWORD RESET FLOW (POPRAVLJENO):");
  console.log("   ✅ POST /api/auth/request-password-reset - Request reset link");
  console.log("   ✅ GET /api/auth/verify-reset-token/:token - Verify reset token");
  console.log("   ✅ POST /api/auth/reset-password - Reset password with token");
  console.log("   🔗 Email servis šalje PRAVI token iz baze");
  console.log("\n🛠️ DEBUG ENDPOINTS:");
  console.log("   GET  /api/auth/debug-verify/:token - Debug token info");
  console.log("   GET  /api/auth/test-reset-flow - Test reset flow");
  console.log("\n📋 Available endpoints:");
  console.log("   POST   /api/auth/request-password-reset (FORGOT PASSWORD)");
  console.log("   GET    /api/auth/verify-reset-token/:token");
  console.log("   POST   /api/auth/reset-password");
  console.log("   GET    /api/auth/verify/:token");
  console.log("   GET    /api/auth/activate/:token");
  console.log("   POST   /api/auth/resend-verification");
  console.log("   POST   /api/auth/login");
  console.log("   GET    /api/auth/verify");
  console.log("   POST   /api/auth/change-password");
  console.log("   POST   /api/auth/force-change-password");
  console.log("   GET    /api/clients");
  console.log("   POST   /api/clients");
  console.log("   GET    /api/notes");
  console.log("   POST   /api/notes");
  console.log("   GET    /api/admin/users");
  console.log("   POST   /api/admin/users");
  console.log("   PUT    /api/admin/users/:id");
  console.log("   PATCH  /api/admin/users/:id");
  console.log("   DELETE /api/admin/users/:id");
  console.log("   POST   /api/admin/users/:id/resend-activation");
  console.log("   POST   /api/admin/users/:id/reset-password");
  console.log("   GET    /api/health");
  console.log("\n👤 PASSWORD RESET FLOW:");
  console.log("   1. User clicks 'Forgot Password'");
  console.log("   2. Enters email → POST /api/auth/request-password-reset");
  console.log("   3. Generira se token i sprema u bazu");
  console.log("   4. Email servis šalje email s PRAVIM tokenom");
  console.log("   5. User klikne link → Frontend /change-password?token=xxx");
  console.log("   6. Frontend poziva → GET /api/auth/verify-reset-token/:token");
  console.log("   7. Unosi novu lozinku → POST /api/auth/reset-password");
  console.log("   8. Password reset complete → Redirect to login");
  console.log("\n🔗 Frontend reset link: http://localhost:5173/change-password?token=xxx");
  console.log("=================================\n");
});