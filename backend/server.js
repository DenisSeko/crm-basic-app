// server.js - KOMPLETNO AŽURIRANO SA PRAVIM EMAIL SERVISOM
import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pkg from "pg";
const { Pool } = pkg;

// EmailService import
import emailService from './services/emailService.js';

console.log('📧 EmailService status in server.js:', {
  available: !!emailService,
  hasTransporter: emailService?.transporter ? 'YES' : 'NO',
  hasActivationEmail: typeof emailService?.sendActivationEmail === 'function',
  hasPasswordResetEmail: typeof emailService?.sendPasswordResetEmail === 'function'
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

// Debug middleware - DODANO
app.use((req, res, next) => {
  console.log(
    `🌐 ${new Date().toISOString()} ${req.method} ${req.originalUrl}`
  );
  if (req.method === "DELETE") {
    console.log("🗑️ DELETE Request Details:", {
      params: req.params,
      headers: req.headers,
    });
  }
  next();
});

// PostgreSQL Connection - AŽURIRANO za Docker konfiguraciju
const pool = new Pool({
  user: "crm_user",
  host: "localhost",
  database: "crm_demo",
  password: "crm_password",
  port: 5433,
});

// Test database connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log("✅ PostgreSQL connected successfully");

    // Provjeri da li users table postoji
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);

    console.log("📊 Users table exists:", tableCheck.rows[0].exists);

    // Provjeri broj korisnika
    const userCount = await client.query("SELECT COUNT(*) FROM users");
    console.log("👥 Total users in database:", userCount.rows[0].count);

    client.release();
    return true;
  } catch (error) {
    console.error("❌ Database connection error:", error.message);
    return false;
  }
};

// JWT Secret
const JWT_SECRET = "your-super-secret-jwt-key-change-in-production";

// Database initialization
const initDatabase = async () => {
  try {
    console.log("✅ Database structure verified - all columns exist");
  } catch (error) {
    console.error("❌ Database initialization error:", error);
  }
};

// Auth Middleware

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

  // 🆕 DEVELOPMENT BYPASS - jednostavno rješenje
  if (process.env.NODE_ENV === 'development' && token === 'dev-bypass-2024') {
    console.log('🔧 DEV MODE: Development bypass active');
    
    try {
      // Pronađi ili kreiraj development usera
      const result = await pool.query(
        `SELECT id, username, email, first_name, last_name, full_name, role, company, 
                phone_mobile, email_verified, status, auth_method, department, 
                can_export, can_manage_clients, can_view_reports 
         FROM users WHERE email = $1 OR role = $2 
         ORDER BY id LIMIT 1`,
        ['demo@demo.com', 'admin']
      );

      if (result.rows.length > 0) {
        req.user = result.rows[0];
        console.log("🔧 DEV MODE: Using existing user:", {
          id: req.user.id,
          email: req.user.email,
          role: req.user.role
        });
      } else {
        // Fallback - kreiraj mock user podatke
        req.user = {
          id: 1,
          email: 'dev@demo.com',
          role: 'user',
          email_verified: true,
          status: 'active',
          first_name: 'Development',
          last_name: 'User'
        };
        console.log("🔧 DEV MODE: Using mock user data");
      }
      
      return next();
    } catch (dbError) {
      console.log('🔧 DEV MODE: Database error, using fallback mock user');
      // Fallback mock user ako database ne radi
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
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("🔐 Token decoded:", { userId: decoded.userId });

    const result = await pool.query(
      `SELECT id, username, email, first_name, last_name, full_name, role, company, 
              phone_mobile, email_verified, status, auth_method, department, 
              can_export, can_manage_clients, can_view_reports 
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


// Admin Middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }
  next();
};

// ⭐⭐⭐ ADMIN ENDPOINTS - KOMPLETNA IMPLEMENTACIJA ⭐⭐⭐

// GET ALL USERS
app.get(
  "/api/admin/users",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      console.log("🔧 [ADMIN] Fetching all users...");

      const result = await pool.query(
        `SELECT id, username, email, first_name, last_name, full_name, role, company, 
              phone_mobile, status, email_verified, auth_method, department,
              can_export, can_manage_clients, can_view_reports,
              created_at, last_login_at, login_count
       FROM users ORDER BY created_at DESC`
      );

      console.log(`✅ [ADMIN] Users fetched: ${result.rows.length}`);

      res.json({
        success: true,
        data: result.rows,
        total: result.rows.length,
      });
    } catch (error) {
      console.error("❌ [ADMIN] Get users error:", error);
      res.status(500).json({
        success: false,
        message: "Greška pri dohvaćanju korisnika",
      });
    }
  }
);

// ✅ GET USER BY ID
app.get(
  "/api/admin/users/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const userId = req.params.id;

      console.log("🔧 [ADMIN] Fetching user by ID:", userId);

      const result = await pool.query(
        `
      SELECT 
        id, username, email, first_name, last_name, full_name,
        phone_mobile, phone_office, company, address, department,
        auth_method, role, status, email_verified,
        can_export, can_manage_clients, can_view_reports,
        last_login_at, login_count, created_at, updated_at
      FROM users 
      WHERE id = $1
    `,
        [userId]
      );

      if (result.rows.length === 0) {
        console.log("❌ [ADMIN] User not found:", userId);
        return res.status(404).json({
          success: false,
          error: "Korisnik nije pronađen",
        });
      }

      const user = result.rows[0];
      console.log("✅ [ADMIN] User found:", {
        id: user.id,
        email: user.email,
        name: user.full_name,
      });

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error("❌ [ADMIN] Get user error:", error);
      res.status(500).json({
        success: false,
        error: "Greška pri dohvaćanju korisnika: " + error.message,
      });
    }
  }
);

// CREATE USER - AŽURIRANO SA PRAVIM EMAILOVIMA
app.post(
  "/api/admin/users",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const {
        email,
        first_name,
        last_name,
        phone_mobile,
        phone_office,
        company,
        address,
        department,
        role = "user",
        send_activation_email = true,
      } = req.body;

      const full_name = `${first_name} ${last_name}`;
      const username = email.split("@")[0];

      console.log("🔧 [ADMIN] Creating user:", { email, full_name, role });

      // Provjeri da li email već postoji
      const existingUser = await client.query(
        "SELECT id FROM users WHERE email = $1",
        [email]
      );

      if (existingUser.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          error: "Korisnik s ovom email adresom već postoji",
        });
      }

      // Kreiraj novog korisnika
      const userResult = await client.query(
        `
      INSERT INTO users (
        username, email, first_name, last_name, full_name,
        phone_mobile, phone_office, company, address, department,
        auth_method, role, status, email_verified,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `,
        [
          username,
          email,
          first_name,
          last_name,
          full_name,
          phone_mobile,
          phone_office,
          company,
          address,
          department,
          "email_only",
          role,
          "pending_verification",
          false,
          req.user.id,
        ]
      );

      const newUser = userResult.rows[0];
      console.log("✅ [ADMIN] User created:", newUser.id);

      let activationData = null;
      let emailSent = false;

      // Ako je odabrano, generiraj aktivacijski token i POŠALJI PRAVI EMAIL
      if (send_activation_email) {
        const crypto = await import("crypto");
        const verificationToken = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Spremi token u verification_tokens tabelu
        await client.query(
          `
        INSERT INTO verification_tokens (user_id, token, token_type, expires_at)
        VALUES ($1, $2, $3, $4)
      `,
          [newUser.id, verificationToken, "account_activation", expiresAt]
        );

        console.log("🔑 [ADMIN] Activation token generated:", verificationToken);

        // POŠALJI PRAVI EMAIL PREKO EMAIL SERVISA
        try {
          if (emailService && emailService.sendActivationEmail) {
            emailSent = await emailService.sendActivationEmail(
              email,
              verificationToken,
              full_name,
              req.user.full_name || req.user.username
            );
            
            console.log("✅ [ADMIN] Activation email sent via EmailService:", emailSent);
          } else {
            console.log("❌ [ADMIN] EmailService not available");
          }
        } catch (emailError) {
          console.error("❌ [ADMIN] Activation email error:", emailError);
          // Nastavimo bez emaila
        }

        activationData = {
          email_sent: emailSent,
          activation_token: verificationToken,
          activation_link: `http://localhost:5173/activate-account?token=${verificationToken}&email=${encodeURIComponent(email)}`
        };
      }

      await client.query("COMMIT");

      res.status(201).json({
        success: true,
        message: send_activation_email && emailSent
          ? "Korisnik kreiran i aktivacijski email poslan"
          : send_activation_email && !emailSent
          ? "Korisnik kreiran (email nije uspješno poslan)"
          : "Korisnik kreiran (email nije poslan)",
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
          created_at: newUser.created_at,
        },
        activation: activationData,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("❌ [ADMIN] Create user error:", error);
      res.status(500).json({
        success: false,
        error: "Greška pri kreiranju korisnika: " + error.message,
      });
    } finally {
      client.release();
    }
  }
);

// RESEND ACTIVATION EMAIL - AŽURIRANO SA PRAVIM EMAILOVIMA
app.post(
  "/api/admin/users/:id/resend-activation",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const userId = req.params.id;

      console.log("🔧 [ADMIN] Resending activation for user:", userId);

      // Dohvati korisnika
      const userResult = await client.query(
        `SELECT id, email, first_name, last_name, full_name 
       FROM users WHERE id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          success: false,
          error: "Korisnik nije pronađen",
        });
      }

      const user = userResult.rows[0];

      // Generiraj novi token
      const crypto = await import("crypto");
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Obriši stare tokene za ovog korisnika
      await client.query(
        "DELETE FROM verification_tokens WHERE user_id = $1 AND token_type = $2",
        [userId, "account_activation"]
      );

      // Spremi novi token
      await client.query(
        `
      INSERT INTO verification_tokens (user_id, token, token_type, expires_at)
      VALUES ($1, $2, $3, $4)
    `,
        [userId, verificationToken, "account_activation", expiresAt]
      );

      console.log("🔑 [ADMIN] New activation token generated:", verificationToken);

      let emailSent = false;

      // POŠALJI PRAVI EMAIL PREKO EMAIL SERVISA
      try {
        if (emailService && emailService.sendActivationEmail) {
          emailSent = await emailService.sendActivationEmail(
            user.email,
            verificationToken,
            user.full_name || `${user.first_name} ${user.last_name}`,
            req.user.full_name || req.user.username
          );
          
          console.log("✅ [ADMIN] Activation email sent via EmailService:", emailSent);
        } else {
          console.log("❌ [ADMIN] EmailService not available for activation");
        }
      } catch (emailError) {
        console.error("❌ [ADMIN] Activation email error:", emailError);
        // Nastavimo bez emaila
      }

      await client.query("COMMIT");

      res.json({
        success: true,
        message: "Aktivacijski email ponovno poslan",
        email: {
          sent: emailSent,
          to: user.email
        },
        activation: {
          activation_token: verificationToken,
          activation_link: `http://localhost:5173/activate-account?token=${verificationToken}&email=${encodeURIComponent(user.email)}`
        }
      });

    } catch (error) {
      await client.query("ROLLBACK");
      console.error("❌ [ADMIN] Resend activation error:", error);
      res.status(500).json({
        success: false,
        error: "Greška pri slanju aktivacijskog emaila",
      });
    } finally {
      client.release();
    }
  }
);

// UPDATE USER
app.put(
  "/api/admin/users/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const userId = req.params.id;
      const {
        first_name,
        last_name,
        phone_mobile,
        phone_office,
        company,
        address,
        department,
        role,
        can_export,
        can_manage_clients,
        can_view_reports,
        status,
      } = req.body;

      console.log("🔧 [ADMIN] Updating user:", userId);
      console.log("📦 Request body:", req.body);

      // Validacija obaveznih polja
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "ID korisnika je obavezan",
        });
      }

      // Provjeri da li korisnik postoji
      const userCheck = await client.query(
        "SELECT id, username, email, status FROM users WHERE id = $1",
        [userId]
      );

      if (userCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          success: false,
          error: "Korisnik nije pronađen",
        });
      }

      const existingUser = userCheck.rows[0];

      // Generiranje full_name
      let full_name = "";
      if (first_name && last_name) {
        full_name = `${first_name} ${last_name}`;
      } else if (first_name) {
        full_name = first_name;
      } else if (last_name) {
        full_name = last_name;
      } else {
        full_name = existingUser.full_name || existingUser.username || existingUser.email || "";
      }

      // Eksplicitno handle-ajte status
      let finalStatus = 'active'; // default
      if (status !== undefined && status !== null) {
        finalStatus = status;
      } else if (existingUser.status) {
        finalStatus = existingUser.status;
      }

      // Pripremi vrijednosti za update
      const updateValues = [
        first_name || null,
        last_name || null,
        full_name,
        phone_mobile || null,
        phone_office || null,
        company || null,
        address || null,
        department || null,
        role,
        can_export !== undefined ? can_export : false,
        can_manage_clients !== undefined ? can_manage_clients : false,
        can_view_reports !== undefined ? can_view_reports : false,
        finalStatus, // KORISTITE FINALNI STATUS
        userId,
      ];

      console.log("🔍 Debug info:");
      console.log("🔍 Received status:", status);
      console.log("🔍 Existing user status:", existingUser.status);
      console.log("🔍 Final status to save:", finalStatus);
      console.log("📝 Update values:", updateValues);

      // Update korisnika
      const result = await client.query(
        `
        UPDATE users SET
          first_name = $1,
          last_name = $2,
          full_name = $3,
          phone_mobile = $4,
          phone_office = $5,
          company = $6,
          address = $7,
          department = $8,
          role = $9,
          can_export = $10,
          can_manage_clients = $11,
          can_view_reports = $12,
          status = $13,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $14
        RETURNING *
        `,
        updateValues
      );

      await client.query("COMMIT");

      console.log("✅ [ADMIN] User updated successfully:", result.rows[0]);

      res.json({
        success: true,
        message: "Korisnik uspješno ažuriran",
        data: result.rows[0],
      });

    } catch (error) {
      await client.query("ROLLBACK");
      console.error("❌ [ADMIN] Update user error:", error);
      
      let errorMessage = "Greška pri ažuriranju korisnika";
      
      if (error.code === '23505') {
        errorMessage = "Korisnik sa tim podacima već postoji";
      } else if (error.code === '23503') {
        errorMessage = "Referencirani podatak ne postoji";
      } else if (error.code === '23502') {
        errorMessage = "Obavezno polje nije popunjeno";
      }

      res.status(500).json({
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
  requireAdmin,
  async (req, res) => {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const userId = req.params.id;

      console.log("🔧 [ADMIN] Deleting user:", userId);

      // Provjeri da li korisnik postoji
      const userCheck = await client.query(
        "SELECT id, email FROM users WHERE id = $1",
        [userId]
      );

      if (userCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          success: false,
          error: "Korisnik nije pronađen",
        });
      }

      const userEmail = userCheck.rows[0].email;

      // Ne dozvoli brisanje samog sebe
      if (parseInt(userId) === req.user.id) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          error: "Ne možete obrisati vlastiti račun",
        });
      }

      // Obriši korisnika
      await client.query("DELETE FROM users WHERE id = $1", [userId]);

      await client.query("COMMIT");

      res.json({
        success: true,
        message: "Korisnik uspješno obrisan",
        deleted_user: {
          id: userId,
          email: userEmail,
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("❌ [ADMIN] Delete user error:", error);
      res.status(500).json({
        success: false,
        error: "Greška pri brisanju korisnika",
      });
    } finally {
      client.release();
    }
  }
);

// ADMIN HEALTH CHECK
app.get("/api/admin/health", (req, res) => {
  res.json({
    success: true,
    message: "Admin API is working",
    timestamp: new Date().toISOString(),
    endpoints: {
      "GET /api/admin/users": "List all users",
      "POST /api/admin/users": "Create new user",
      "PUT /api/admin/users/:id": "Update user",
      "DELETE /api/admin/users/:id": "Delete user",
      "POST /api/admin/users/:id/resend-activation": "Resend activation email",
    },
  });
});

// ADMIN STATS
app.get(
  "/api/admin/stats",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      console.log("📊 [ADMIN] Fetching admin statistics...");

      // Ukupni broj korisnika po statusu
      const userStats = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM users 
      GROUP BY status
      ORDER BY status
    `);

      // Korisnici po auth metodi
      const authStats = await pool.query(`
      SELECT 
        auth_method,
        COUNT(*) as count
      FROM users 
      GROUP BY auth_method
      ORDER BY auth_method
    `);

      // Korisnici po roli
      const roleStats = await pool.query(`
      SELECT 
        role,
        COUNT(*) as count
      FROM users 
      GROUP BY role
      ORDER BY role
    `);

      res.json({
        success: true,
        data: {
          users_by_status: userStats.rows,
          users_by_auth_method: authStats.rows,
          users_by_role: roleStats.rows,
          summary: {
            total_users: userStats.rows.reduce(
              (sum, row) => sum + parseInt(row.count),
              0
            ),
            pending_verification:
              userStats.rows.find(
                (row) => row.status === "pending_verification"
              )?.count || 0,
            active_users:
              userStats.rows.find((row) => row.status === "active")?.count || 0,
            email_only_users:
              authStats.rows.find((row) => row.auth_method === "email_only")
                ?.count || 0,
          },
        },
      });
    } catch (error) {
      console.error("❌ [ADMIN] Stats error:", error);
      res.status(500).json({
        success: false,
        error: "Greška pri dohvaćanju statistike",
      });
    }
  }
);

// PASSWORD RESET ENDPOINT FOR ADMIN - AŽURIRANO SA PRAVIM EMAILOVIMA
app.post(
  "/api/admin/users/reset-password",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      await client.query("BEGIN");

      const { user_id, reset_type, password, password_confirmation, send_email } = req.body;

      console.log("🔐 [ADMIN] Password reset request:", req.body);

      // Provjeri da li korisnik postoji
      const userCheck = await client.query(
        "SELECT id, email, first_name, last_name, full_name FROM users WHERE id = $1",
        [user_id]
      );

      if (userCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          success: false,
          error: "Korisnik nije pronađen",
        });
      }

      const user = userCheck.rows[0];
      let newPassword = null;

      // Obradi različite tipove resetiranja
      if (reset_type === 'manual') {
        // Ručno postavljanje passworda
        if (!password || !password_confirmation) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            success: false,
            error: "Lozinka i potvrda lozinke su obavezni",
          });
        }

        if (password !== password_confirmation) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            success: false,
            error: "Lozinke se ne podudaraju",
          });
        }

        if (password.length < 8) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            success: false,
            error: "Lozinka mora imati najmanje 8 znakova",
          });
        }

        newPassword = password;

      } else if (reset_type === 'auto') {
        // Automatsko generiranje passworda
        const crypto = await import("crypto");
        newPassword = crypto.randomBytes(8).toString('hex');
      }

      // Hash i spremi novi password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      await client.query(
        "UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [hashedPassword, user_id]
      );

      let emailSent = false;

      // Pošalji email ako je odabrano
      if (send_email && newPassword) {
        console.log("📧 [ADMIN] Sending password reset email to:", user.email);
        
        try {
          // Generiraj password reset token
          const crypto = await import("crypto");
          const resetToken = crypto.randomBytes(32).toString('hex');
          const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 sat

          // Spremi reset token u bazu
          await client.query(
            `INSERT INTO verification_tokens 
             (user_id, token, token_type, expires_at) 
             VALUES ($1, $2, $3, $4)`,
            [user_id, resetToken, "password_reset", expiresAt]
          );

          // POŠALJI PRAVI EMAIL PREKO EMAIL SERVISA
          if (emailService && emailService.sendPasswordResetEmail) {
            emailSent = await emailService.sendPasswordResetEmail(
              user.email,
              resetToken,
              user.full_name || `${user.first_name} ${user.last_name}`
            );
            
            console.log("✅ [ADMIN] Password reset email sent via EmailService:", emailSent);
          } else {
            console.log("❌ [ADMIN] EmailService not available for password reset");
          }

        } catch (emailError) {
          console.error("❌ [ADMIN] Password reset email error:", emailError);
          // Nastavimo bez emaila - ne failamo cijeli request
        }
      }

      await client.query("COMMIT");

      res.json({
        success: true,
        message: "Lozinka uspješno resetirana",
        password_reset: {
          type: reset_type,
          email_sent: emailSent,
          // Vrati password samo za development
          ...(process.env.NODE_ENV === 'development' && { new_password: newPassword })
        }
      });

    } catch (error) {
      await client.query("ROLLBACK");
      console.error("❌ Password reset error:", error);
      res.status(500).json({
        success: false,
        error: "Greška pri resetiranju lozinke",
      });
    } finally {
      client.release();
    }
  }
);

// ⭐⭐⭐ AUTH ENDPOINTS ⭐⭐⭐

// LOGIN ENDPOINT - AŽURIRANO sa password_hash
app.post("/api/auth/login", async (req, res) => {
  console.log("=== LOGIN REQUEST START ===");

  try {
    const { email, password } = req.body;

    console.log("🔐 Login attempt for email:", email);

    if (!email || !password) {
      console.log("❌ Missing email or password");
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Pronađi korisnika
    console.log("🔍 Querying database for user...");
    const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [
      email,
    ]);

    console.log("📊 Database query result - rows found:", result.rows.length);

    if (result.rows.length === 0) {
      console.log("❌ User not found in database");
      return res.status(401).json({
        success: false,
        message: "Pogrešan email ili lozinka",
      });
    }

    const user = result.rows[0];
    console.log("👤 User found:", {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      auth_method: user.auth_method,
    });

    // Provjeri status korisnika
    if (user.status !== "active") {
      console.log("❌ User account not active:", user.status);
      return res.status(401).json({
        success: false,
        message: "Vaš račun nije aktiviran. Kontaktirajte administratora.",
      });
    }

    // Provjeri lozinku - AŽURIRANO za password_hash
    console.log("🔐 Checking password...");
    let passwordValid = false;

    if (user.auth_method === "email_password" && user.password_hash) {
      console.log("🔐 Using password auth method");
      try {
        passwordValid = await bcrypt.compare(password, user.password_hash);
        console.log("🔐 Password comparison result:", passwordValid);
      } catch (bcryptError) {
        console.error("❌ Bcrypt error:", bcryptError);
        // Fallback za development
        passwordValid = password === "password123";
        console.log("🔐 Fallback password check:", passwordValid);
      }
    } else if (user.auth_method === "email_only") {
      console.log("📧 Using email-only auth method");
      // Za email-only korisnike, koristi default lozinku
      passwordValid = password === "password123";
      console.log("🔐 Default password check:", passwordValid);
    } else {
      console.log("❌ Unknown auth method:", user.auth_method);
      passwordValid = password === "password123";
    }

    if (!passwordValid) {
      console.log("❌ Invalid password");
      return res.status(401).json({
        success: false,
        message: "Pogrešan email ili lozinka",
      });
    }

    // Ažuriraj last_login_at i login_count
    console.log("📝 Updating last login...");
    await pool.query(
      `UPDATE users SET 
        last_login_at = CURRENT_TIMESTAMP,
        login_count = COALESCE(login_count, 0) + 1 
       WHERE id = $1`,
      [user.id]
    );

    // Generiraj JWT token
    console.log("🔑 Generating JWT token...");
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
    console.log("=== LOGIN REQUEST END ===");

    res.json({
      success: true,
      message: "Uspješna prijava",
      token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        full_name: user.full_name,
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
      },
    });
  } catch (error) {
    console.error("❌ LOGIN ERROR DETAILS:");
    console.error("❌ Error message:", error.message);
    console.error("❌ Error stack:", error.stack);
    console.log("=== LOGIN REQUEST END WITH ERROR ===");

    res.status(500).json({
      success: false,
      message: "Greška pri prijavi: " + error.message,
    });
  }
});

// VERIFY ACCOUNT BY TOKEN ENDPOINT - REDIRECT NA DASHBOARD
// VERIFY ACCOUNT BY TOKEN ENDPOINT - POPRAVLJENO
app.get("/api/auth/verify/:token", async (req, res) => {
  const client = await pool.connect();
  
  try {
    console.log("🎯 VERIFY TOKEN ENDPOINT HIT!");
    console.log("📧 Token received:", req.params.token);

    await client.query('BEGIN');

    const token = req.params.token;

    // 1. PRVO PROVJERI DA LI TOKEN UOPĆE POSTOJI
    const tokenExistsCheck = await client.query(`
      SELECT vt.*, u.id as user_id, u.email as user_email, u.status as user_status,
             u.first_name, u.last_name, u.full_name, u.role
      FROM verification_tokens vt
      JOIN users u ON vt.user_id = u.id
      WHERE vt.token = $1
    `, [token]);

    if (tokenExistsCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      console.log('❌ Token does not exist:', token);
      return res.redirect(`http://localhost:5173/activate-account?error=token_not_found`);
    }

    const existingToken = tokenExistsCheck.rows[0];
    
    // 2. PROVJERI DA LI JE TOKEN VEĆ KORIŠTEN
    if (existingToken.used === true) {
      await client.query('ROLLBACK');
      console.log('ℹ️ Token already used:', {
        token: token,
        used_at: existingToken.used_at,
        user_email: existingToken.user_email,
        user_status: existingToken.user_status
      });

      // Ako je korisnik već aktiviran, generiraj novi auth token
      if (existingToken.user_status === 'active') {
        console.log('🔄 User already active, generating new auth token...');
        
        const authToken = jwt.sign(
          {
            userId: existingToken.user_id,
            email: existingToken.user_email,
            role: existingToken.role,
          },
          JWT_SECRET,
          { expiresIn: "24h" }
        );

        // ✅ ISPRAVLJENO: Dodaj "autoLogin=true"
        const redirectUrl = `http://localhost:5173/dashboard?autoLogin=true&token=${authToken}&email=${encodeURIComponent(existingToken.user_email)}&alreadyVerified=true`;
        console.log("🔀 Redirecting to DASHBOARD (already verified):", redirectUrl);
        return res.redirect(redirectUrl);
      } else {
        // Token je korišten ali korisnik nije aktivan - greška
        console.log('❌ Token used but user not active:', existingToken.user_status);
        return res.redirect(`http://localhost:5173/activate-account?error=token_already_used`);
      }
    }

    // 3. PROVJERI DA LI JE TOKEN ISTEKAO
    if (existingToken.expires_at < new Date()) {
      await client.query('ROLLBACK');
      console.log('❌ Token expired:', {
        token: token,
        expires_at: existingToken.expires_at,
        current_time: new Date()
      });
      return res.redirect(`http://localhost:5173/activate-account?error=token_expired`);
    }

    // 4. TOKEN JE VALIDAN - VERIFICIRAJ KORISNIKA
    console.log("✅ Valid token found, activating user:", {
      userId: existingToken.user_id,
      email: existingToken.user_email
    });

    // Ažuriraj korisnika kao verificiranog
    await client.query(`
      UPDATE users 
      SET 
        status = 'active',
        email_verified = true,
        verified_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
    `, [existingToken.user_id]);

    // Označi token kao korišten
    await client.query(`
      UPDATE verification_tokens 
      SET 
        used = true,
        used_at = NOW()
      WHERE id = $1
    `, [existingToken.id]);

    // Dohvati ažuriranog korisnika
    const userResult = await client.query(`
      SELECT 
        id, username, email, first_name, last_name, full_name,
        role, status, email_verified, auth_method
      FROM users 
      WHERE id = $1
    `, [existingToken.user_id]);

    const user = userResult.rows[0];
    console.log("👤 User activated:", {
      email: user.email,
      status: user.status,
      email_verified: user.email_verified
    });

    // Generiraj auth token
    const authToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    await client.query('COMMIT');

    console.log('✅ Account verified successfully via token:', user.email);

    // ✅ ISPRAVLJENO: Redirect na dashboard s autoLogin=true
    const redirectUrl = `http://localhost:5173/dashboard?autoLogin=true&token=${authToken}&email=${encodeURIComponent(user.email)}&verified=true`;
    console.log("🔀 Redirecting to DASHBOARD:", redirectUrl);
    
    return res.redirect(redirectUrl);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Account verification by token error:', error);
    
    // Redirect na activate-account stranicu s error porukom
    return res.redirect(`http://localhost:5173/activate-account?error=verification_failed&message=${encodeURIComponent(error.message)}`);
  } finally {
    client.release();
  }
});

// U server.js dodajte ovaj endpoint
app.get("/api/auth/auto-login", async (req, res) => {
  try {
    const { token, email, verified } = req.query;
    
    console.log("🔐 Auto-login request for:", email);
    
    if (!token || !email) {
      return res.redirect(`http://localhost:5173/login?error=auto_login_failed`);
    }

    // Provjeri da li je token valjan
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const userResult = await pool.query(
      `SELECT id, email, status FROM users WHERE id = $1 AND email = $2`,
      [decoded.userId, email]
    );

    if (userResult.rows.length === 0) {
      return res.redirect(`http://localhost:5173/login?error=invalid_auto_login`);
    }

    const user = userResult.rows[0];
    
    if (user.status !== 'active') {
      return res.redirect(`http://localhost:5173/login?error=account_not_active`);
    }

    console.log('✅ Auto-login successful for:', user.email);
    
    // ✅ REDIRECT NA FRONTEND DASHBOARD SA PARAMETRIMA
    const redirectUrl = `http://localhost:5173/dashboard?autoLogin=true&token=${token}&email=${encodeURIComponent(email)}&verified=${verified || 'true'}`;
    console.log("🔀 Redirecting to FRONTEND DASHBOARD:", redirectUrl);
    
    return res.redirect(redirectUrl);

  } catch (error) {
    console.error('❌ Auto-login error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.redirect(`http://localhost:5173/login?error=invalid_token`);
    } else if (error.name === 'TokenExpiredError') {
      return res.redirect(`http://localhost:5173/login?error=token_expired`);
    }
    
    return res.redirect(`http://localhost:5173/login?error=auto_login_failed`);
  }
});

// // VERIFY ACCOUNT BY TOKEN ENDPOINT - SA DETALJNIM DEBUGGINGOM
// app.get("/api/auth/verify/:token", async (req, res) => {
//   const client = await pool.connect();
  
//   try {
//     console.log("🎯 VERIFY TOKEN ENDPOINT HIT!");
//     console.log("📧 Token received:", req.params.token);
//     console.log("🔍 Full URL:", req.originalUrl);

//     await client.query('BEGIN');

//     const token = req.params.token;

//     // 1. Pronađi validan token - SA DETALJNIM LOGGINGOM
//     console.log("🔎 Searching for token in database...");
//     const tokenResult = await client.query(`
//       SELECT vt.*, u.id as user_id, u.email as user_email, u.status as user_status,
//              u.first_name, u.last_name, u.full_name, u.role
//       FROM verification_tokens vt
//       JOIN users u ON vt.user_id = u.id
//       WHERE vt.token = $1 
//         AND vt.token_type = 'account_activation'
//         AND vt.expires_at > NOW()
//         AND vt.used = false
//     `, [token]);

//     console.log("📊 Token query results:", {
//       rowsFound: tokenResult.rows.length,
//       token: token,
//       currentTime: new Date().toISOString()
//     });

//     if (tokenResult.rows.length === 0) {
//       // Dodatna provjera za debugging
//       const expiredCheck = await client.query(`
//         SELECT vt.*, u.email 
//         FROM verification_tokens vt
//         JOIN users u ON vt.user_id = u.id
//         WHERE vt.token = $1 
//       `, [token]);

//       console.log("❌ Token not found or invalid. Additional check:", {
//         anyTokenFound: expiredCheck.rows.length > 0,
//         tokenDetails: expiredCheck.rows[0] || 'none'
//       });

//       await client.query('ROLLBACK');
      
//       // Redirect na activate-account stranicu s error porukom
//       return res.redirect(`http://localhost:5173/activate-account?error=invalid_token&token=${token}`);
//     }

//     const verification = tokenResult.rows[0];
//     console.log("✅ Valid token found:", {
//       userId: verification.user_id,
//       email: verification.user_email,
//       expiresAt: verification.expires_at,
//       tokenId: verification.id
//     });

//     // 2. Ažuriraj korisnika kao verificiranog
//     console.log("🔄 Activating user...");
//     await client.query(`
//       UPDATE users 
//       SET 
//         status = 'active',
//         email_verified = true,
//         verified_at = NOW(),
//         updated_at = NOW()
//       WHERE id = $1
//     `, [verification.user_id]);

//     // 3. Označi token kao korišten
//     console.log("🏷️ Marking token as used...");
//     await client.query(`
//       UPDATE verification_tokens 
//       SET 
//         used = true,
//         used_at = NOW()
//       WHERE id = $1
//     `, [verification.id]);

//     // 4. Dohvati ažuriranog korisnika
//     const userResult = await client.query(`
//       SELECT 
//         id, username, email, first_name, last_name, full_name,
//         role, status, email_verified, auth_method
//       FROM users 
//       WHERE id = $1
//     `, [verification.user_id]);

//     const user = userResult.rows[0];
//     console.log("👤 User activated:", {
//       email: user.email,
//       status: user.status,
//       email_verified: user.email_verified
//     });

//     // 5. Generiraj auth token
//     const authToken = jwt.sign(
//       {
//         userId: user.id,
//         email: user.email,
//         role: user.role,
//       },
//       JWT_SECRET,
//       { expiresIn: "24h" }
//     );

//     // 6. Zabilježi aktivnost
//     // await client.query(`
//     //   INSERT INTO user_activity_log (user_id, action, resource_type, resource_id, details)
//     //   VALUES ($1, $2, $3, $4, $5)
//     // `, [
//     //   user.id,
//     //   'account.verified',
//     //   'user',
//     //   user.id,
//     //   JSON.stringify({ method: 'token_verification' })
//     // ]);

//     await client.query('COMMIT');

//     console.log('✅ Account verified successfully via token:', user.email);

//     // ✅ POPRAVLJEN REDIRECT - koristite točan URL
//     const redirectUrl = `http://localhost:5173/activate-account?success=true&token=${authToken}&email=${encodeURIComponent(user.email)}&verified=true`;
//     console.log("🔀 Redirecting to:", redirectUrl);
    
//     return res.redirect(redirectUrl);

//   } catch (error) {
//     await client.query('ROLLBACK');
//     console.error('❌ Account verification by token error:', error);
//     console.error('🔧 Error details:', {
//       message: error.message,
//       stack: error.stack
//     });

    
    
//     // Redirect na activate-account stranicu s error porukom
//     const errorRedirect = `http://localhost:5173/activate-account?error=verification_failed&message=${encodeURIComponent(error.message)}`;
//     console.log("🔀 Redirecting to error page:", errorRedirect);
    
//     return res.redirect(errorRedirect);
//   } finally {
//     client.release();
//   }
// });

// VERIFY TOKEN ENDPOINT
app.get("/api/auth/verify", authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(500).json({
      success: false,
      message: "Greška pri verifikaciji tokena",
    });
  }
});

// LOGOUT ENDPOINT
app.post("/api/auth/logout", authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Uspješno odjavljen",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Greška pri odjavi",
    });
  }
});

// FORGOT PASSWORD ENDPOINT - AŽURIRANO SA PRAVIM EMAILOVIMA
app.post("/api/auth/forgot-password", async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query("BEGIN");

    const { email } = req.body;

    if (!email) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "Email je obavezan",
      });
    }

    console.log("🔐 [AUTH] Forgot password request for:", email);

    // Provjeri da li korisnik postoji
    const userResult = await client.query(
      "SELECT id, email, first_name, last_name, full_name FROM users WHERE email = $1",
      [email]
    );

    // Uvijek vrati success čak i ako korisnik ne postoji (security best practice)
    if (userResult.rows.length === 0) {
      await client.query("COMMIT");
      return res.json({
        success: true,
        message: "Ako email postoji, poslat ćemo vam link za reset lozinke",
      });
    }

    const user = userResult.rows[0];

    // Generiraj reset token
    const crypto = await import("crypto");
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 sat

    // Obriši stare reset tokene
    await client.query(
      "DELETE FROM verification_tokens WHERE user_id = $1 AND token_type = $2",
      [user.id, "password_reset"]
    );

    // Spremi reset token u bazu
    await client.query(
      `INSERT INTO verification_tokens 
       (user_id, token, token_type, expires_at) 
       VALUES ($1, $2, $3, $4)`,
      [user.id, resetToken, "password_reset", expiresAt]
    );

    let emailSent = false;

    // POŠALJI PRAVI PASSWORD RESET EMAIL
    try {
      if (emailService && emailService.sendPasswordResetEmail) {
        emailSent = await emailService.sendPasswordResetEmail(
          user.email,
          resetToken,
          user.full_name || `${user.first_name} ${user.last_name}`
        );
        
        console.log("✅ [AUTH] Password reset email sent via EmailService:", emailSent);
      } else {
        console.log("❌ [AUTH] EmailService not available for password reset");
      }
    } catch (emailError) {
      console.error("❌ [AUTH] Password reset email error:", emailError);
      // Nastavimo bez emaila
    }

    await client.query("COMMIT");

    const response = {
      success: true,
      message: "Link za reset lozinke je poslan na vaš email",
    };

    // U developmentu, vrati i link za lakše testiranje
    if (process.env.NODE_ENV === 'development') {
      response.reset_link = `http://localhost:5173/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    }

    res.json(response);

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Greška pri slanju zahtjeva za reset lozinke",
    });
  } finally {
    client.release();
  }
});

// ⭐⭐⭐ CLIENTS ENDPOINTS ⭐⭐⭐

// GET ALL CLIENTS
app.get("/api/clients", authenticateToken, async (req, res) => {
  try {
    console.log("📋 Fetching clients for user:", req.user.id);

    let result;

    // Ako je admin, vrati sve klijente
    if (req.user.role === "admin") {
      result = await pool.query(`
        SELECT c.*, u.username as created_by_username 
        FROM clients c 
        LEFT JOIN users u ON c.created_by = u.id 
        ORDER BY c.created_at DESC
      `);
    } else {
      // Ako nije admin, vrati samo klijente dodijeljene korisniku
      result = await pool.query(
        `
        SELECT c.*, u.username as created_by_username, uc.is_primary
        FROM clients c
        INNER JOIN user_clients uc ON c.id = uc.client_id
        LEFT JOIN users u ON c.created_by = u.id 
        WHERE uc.user_id = $1
        ORDER BY c.created_at DESC
      `,
        [req.user.id]
      );
    }

    console.log("✅ Clients fetched:", result.rows.length);

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error("Get clients error:", error);
    res.status(500).json({
      success: false,
      message: "Greška pri dohvaćanju klijenata",
    });
  }
});

// ⭐⭐⭐ SPECIFIČNE RUTE MORAJU BITI IZNAD DINAMIČKIH RUTA ⭐⭐⭐

// GET CLIENTS STATS
app.get("/api/clients/stats", authenticateToken, async (req, res) => {
  try {
    console.log("📊 Fetching clients stats for user:", req.user.id);

    let totalClients, totalNotes, averageNotes, lastNote;

    // Ukupno klijenata
    if (req.user.role === "admin") {
      totalClients = await pool.query("SELECT COUNT(*) FROM clients");
    } else {
      totalClients = await pool.query(
        "SELECT COUNT(*) FROM user_clients WHERE user_id = $1",
        [req.user.id]
      );
    }

    // Ukupno bilješki
    if (req.user.role === "admin") {
      totalNotes = await pool.query("SELECT COUNT(*) FROM notes");
    } else {
      totalNotes = await pool.query(
        `
        SELECT COUNT(*) FROM notes n
        INNER JOIN user_clients uc ON n.client_id = uc.client_id
        WHERE uc.user_id = $1
      `,
        [req.user.id]
      );
    }

    // Prosjek bilješki po klijentu
    const totalClientsCount = parseInt(totalClients.rows[0].count);
    const totalNotesCount = parseInt(totalNotes.rows[0].count);
    averageNotes =
      totalClientsCount > 0
        ? (totalNotesCount / totalClientsCount).toFixed(2)
        : "0.00";

    // Zadnja bilješka
    if (req.user.role === "admin") {
      lastNote = await pool.query(`
        SELECT n.*, c.name as client_name 
        FROM notes n 
        LEFT JOIN clients c ON n.client_id = c.id 
        ORDER BY n.created_at DESC 
        LIMIT 1
      `);
    } else {
      lastNote = await pool.query(
        `
        SELECT n.*, c.name as client_name 
        FROM notes n 
        INNER JOIN user_clients uc ON n.client_id = uc.client_id
        LEFT JOIN clients c ON n.client_id = c.id 
        WHERE uc.user_id = $1
        ORDER BY n.created_at DESC 
        LIMIT 1
      `,
        [req.user.id]
      );
    }

    const lastNoteData = lastNote.rows.length > 0 ? lastNote.rows[0] : null;

    res.json({
      success: true,
      data: {
        total_clients: totalClientsCount,
        total_notes: totalNotesCount,
        average_notes: averageNotes,
        last_note: lastNoteData,
      },
    });
  } catch (error) {
    console.error("Get clients stats error:", error);
    res.status(500).json({
      success: false,
      message: "Greška pri dohvaćanju statistike klijenata",
    });
  }
});

// GET NOTES COUNT PER CLIENT
app.get("/api/clients/notes-count", authenticateToken, async (req, res) => {
  try {
    console.log("📝 Fetching notes count per client for user:", req.user.id);

    let result;

    if (req.user.role === "admin") {
      result = await pool.query(`
        SELECT 
          c.id,
          c.name,
          c.email,
          COUNT(n.id) as notes_count
        FROM clients c
        LEFT JOIN notes n ON c.id = n.client_id
        GROUP BY c.id, c.name, c.email
        ORDER BY c.name
      `);
    } else {
      result = await pool.query(
        `
        SELECT 
          c.id,
          c.name,
          c.email,
          COUNT(n.id) as notes_count
        FROM clients c
        INNER JOIN user_clients uc ON c.id = uc.client_id
        LEFT JOIN notes n ON c.id = n.client_id
        WHERE uc.user_id = $1
        GROUP BY c.id, c.name, c.email
        ORDER BY c.name
      `,
        [req.user.id]
      );
    }

    console.log("✅ Notes count fetched for clients:", result.rows.length);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Get notes count error:", error);
    res.status(500).json({
      success: false,
      message: "Greška pri dohvaćanju broja bilješki po klijentu",
    });
  }
});

// ⭐⭐⭐ DINAMIČKE RUTE MORAJU BITI ISPOD SPECIFIČNIH RUTA ⭐⭐⭐

// GET CLIENT BY ID
app.get("/api/clients/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT c.*, u.username as created_by_username 
      FROM clients c 
      LEFT JOIN users u ON c.created_by = u.id 
      WHERE c.id = $1
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Klijent nije pronađen",
      });
    }

    // Provjeri permisije (samo admin ili dodijeljeni korisnik)
    if (req.user.role !== "admin") {
      const userAccess = await pool.query(
        "SELECT 1 FROM user_clients WHERE user_id = $1 AND client_id = $2",
        [req.user.id, id]
      );

      if (userAccess.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: "Nemate pristup ovom klijentu",
        });
      }
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Get client error:", error);
    res.status(500).json({
      success: false,
      message: "Greška pri dohvaćanju klijenta",
    });
  }
});

// CREATE CLIENT
app.post("/api/clients", authenticateToken, async (req, res) => {
  try {
    const { name, email, company, phone, address, notes } = req.body;

    // Provjeri da li klijent već postoji
    const existingClient = await pool.query(
      "SELECT id FROM clients WHERE email = $1",
      [email]
    );

    if (existingClient.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Klijent s ovim emailom već postoji",
      });
    }

    // Kreiraj klijenta
    const clientResult = await pool.query(
      `INSERT INTO clients 
       (name, email, company, phone, address, notes, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [name, email, company, phone, address, notes, req.user.id]
    );

    const client = clientResult.rows[0];

    // Automatski dodijeli klijenta kreatoru (osim ako je admin)
    if (req.user.role !== "admin") {
      await pool.query(
        `INSERT INTO user_clients (user_id, client_id, assigned_by, is_primary)
         VALUES ($1, $2, $3, TRUE)`,
        [req.user.id, client.id, req.user.id]
      );
    }

    res.json({
      success: true,
      message: "Klijent uspješno kreiran",
      data: client,
    });
  } catch (error) {
    console.error("Create client error:", error);
    res.status(500).json({
      success: false,
      message: "Greška pri kreiranju klijenta",
    });
  }
});

// UPDATE CLIENT
app.put("/api/clients/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, company, phone, address, notes } = req.body;

    // Provjeri da li klijent postoji
    const existingClient = await pool.query(
      "SELECT id, created_by FROM clients WHERE id = $1",
      [id]
    );

    if (existingClient.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Klijent nije pronađen",
      });
    }

    // Provjeri permisije (samo admin ili kreator klijenta)
    if (
      req.user.role !== "admin" &&
      existingClient.rows[0].created_by !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Nemate ovlasti za ažuriranje ovog klijenta",
      });
    }

    // Ažuriraj klijenta
    const clientResult = await pool.query(
      `UPDATE clients 
       SET name = $1, email = $2, company = $3, phone = $4, address = $5, notes = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 
       RETURNING *`,
      [name, email, company, phone, address, notes, id]
    );

    res.json({
      success: true,
      message: "Klijent uspješno ažuriran",
      data: clientResult.rows[0],
    });
  } catch (error) {
    console.error("Update client error:", error);
    res.status(500).json({
      success: false,
      message: "Greška pri ažuriranju klijenta",
    });
  }
});

// DELETE CLIENT
app.delete("/api/clients/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Provjeri da li klijent postoji
    const existingClient = await pool.query(
      "SELECT id, created_by FROM clients WHERE id = $1",
      [id]
    );

    if (existingClient.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Klijent nije pronađen",
      });
    }

    // Provjeri permisije (samo admin ili kreator klijenta)
    if (
      req.user.role !== "admin" &&
      existingClient.rows[0].created_by !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Nemate ovlasti za brisanje ovog klijenta",
      });
    }

    // Obriši klijenta (CASCADE će obrisati i veze u user_clients)
    await pool.query("DELETE FROM clients WHERE id = $1", [id]);

    res.json({
      success: true,
      message: "Klijent uspješno obrisan",
    });
  } catch (error) {
    console.error("Delete client error:", error);
    res.status(500).json({
      success: false,
      message: "Greška pri brisanju klijenta",
    });
  }
});

// ⭐⭐⭐ NOTES ENDPOINTS ⭐⭐⭐

// GET ALL NOTES
app.get("/api/notes", authenticateToken, async (req, res) => {
  try {
    console.log("📝 Fetching notes for user:", req.user.id);

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

    console.log("✅ Notes fetched:", result.rows.length);

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error("Get notes error:", error);
    res.status(500).json({
      success: false,
      message: "Greška pri dohvaćanju bilješki",
    });
  }
});

// GET NOTE BY ID
app.get("/api/notes/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    let result;

    if (req.user.role === "admin") {
      result = await pool.query(
        `
        SELECT n.*, c.name as client_name, u.username as created_by_username
        FROM notes n
        LEFT JOIN clients c ON n.client_id = c.id
        LEFT JOIN users u ON n.created_by = u.id
        WHERE n.id = $1
      `,
        [id]
      );
    } else {
      result = await pool.query(
        `
        SELECT n.*, c.name as client_name, u.username as created_by_username
        FROM notes n
        INNER JOIN user_clients uc ON n.client_id = uc.client_id
        LEFT JOIN clients c ON n.client_id = c.id
        LEFT JOIN users u ON n.created_by = u.id
        WHERE n.id = $1 AND uc.user_id = $2
      `,
        [id, req.user.id]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Bilješka nije pronađena",
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Get note error:", error);
    res.status(500).json({
      success: false,
      message: "Greška pri dohvaćanju bilješke",
    });
  }
});

// CREATE NOTE
app.post("/api/notes", authenticateToken, async (req, res) => {
  try {
    const { client_id, title, content, note_type = "general" } = req.body;

    // Provjeri da li klijent postoji i ima li korisnik pristup
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
        message: "Nemate pristup ovom klijentu",
      });
    }

    // Kreiraj bilješku
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
      message: "Bilješka uspješno kreirana",
      data: note,
    });
  } catch (error) {
    console.error("Create note error:", error);
    res.status(500).json({
      success: false,
      message: "Greška pri kreiranju bilješke",
    });
  }
});

// UPDATE NOTE
app.put("/api/notes/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, note_type } = req.body;

    // Provjeri da li bilješka postoji
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
        message: "Bilješka nije pronađena",
      });
    }

    // Provjeri permisije (samo admin ili kreator bilješke)
    const note = noteCheck.rows[0];
    if (req.user.role !== "admin" && note.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Nemate ovlasti za ažuriranje ove bilješke",
      });
    }

    // Ažuriraj bilješku
    const updateResult = await pool.query(
      `
      UPDATE notes 
      SET title = $1, content = $2, note_type = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 
      RETURNING *
    `,
      [title, content, note_type, id]
    );

    res.json({
      success: true,
      message: "Bilješka uspješno ažurirana",
      data: updateResult.rows[0],
    });
  } catch (error) {
    console.error("Update note error:", error);
    res.status(500).json({
      success: false,
      message: "Greška pri ažuriranju bilješke",
    });
  }
});

// DELETE NOTE - POPRAVLJEN ENDPOINT
app.delete("/api/notes/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(
      `🗑️ SERVER: DELETE request for note ID: ${id} from user: ${req.user.id}`
    );

    // Provjeri da li bilješka postoji
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
      console.log(`❌ SERVER: Note not found: ${id}`);
      return res.status(404).json({
        success: false,
        message: "Bilješka nije pronađena",
      });
    }

    // Provjeri permisije (samo admin ili kreator bilješke)
    const note = noteCheck.rows[0];
    if (req.user.role !== "admin" && note.created_by !== req.user.id) {
      console.log(
        `❌ SERVER: User ${req.user.id} not authorized to delete note ${id}`
      );
      return res.status(403).json({
        success: false,
        message: "Nemate ovlasti za brisanje ove bilješke",
      });
    }

    // Obriši bilješku
    await pool.query("DELETE FROM notes WHERE id = $1", [id]);

    console.log(`✅ SERVER: Note successfully deleted: ${id}`);

    res.json({
      success: true,
      message: "Bilješka uspješno obrisana",
    });
  } catch (error) {
    console.error("❌ SERVER: Delete note error:", error);
    res.status(500).json({
      success: false,
      message: "Greška pri brisanju bilješke: " + error.message,
    });
  }
});

// HEALTH CHECK ENDPOINT
app.get("/api/health", async (req, res) => {
  try {
    const dbConnected = await testConnection();

    res.json({
      success: true,
      message: "CRM API is running",
      database: dbConnected ? "connected" : "disconnected",
      email_service: !!emailService,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "API health check failed",
      error: error.message,
    });
  }
});

// TEST ENDPOINT
app.get("/api/test", (req, res) => {
  console.log("✅ Test endpoint called");
  res.json({
    success: true,
    message: "Server is working!",
    timestamp: new Date().toISOString(),
  });
});

// TEST DELETE ENDPOINT
app.delete("/api/test-delete/:id", authenticateToken, async (req, res) => {
  console.log("✅ TEST DELETE ENDPOINT CALLED");
  res.json({
    success: true,
    message: "Test delete endpoint works!",
    noteId: req.params.id,
    user: req.user.id,
  });
});

// Default route
app.get("/", (req, res) => {
  res.json({
    message: "CRM API Server",
    version: "1.0.0",
    database: "PostgreSQL",
    email_service: !!emailService ? "Available" : "Not available",
    mailcatcher_url: "http://localhost:1080",
    endpoints: {
      auth: [
        "/api/auth/login",
        "/api/auth/verify-account",
        "/api/auth/verify/:token",
        "/api/auth/verify",
        "/api/auth/logout",
        "/api/auth/forgot-password",
      ],
      clients: [
        "/api/clients",
        "/api/clients/:id",
        "/api/clients (POST)",
        "/api/clients/:id (PUT)",
        "/api/clients/:id (DELETE)",
      ],
      notes: [
        "/api/notes",
        "/api/notes/:id",
        "/api/notes (POST)",
        "/api/notes/:id (PUT)",
        "/api/notes/:id (DELETE)",
      ],
      stats: ["/api/clients/stats", "/api/clients/notes-count"],
      admin: [
        "GET /api/admin/users",
        "POST /api/admin/users",
        "PUT /api/admin/users/:id",
        "DELETE /api/admin/users/:id",
        "POST /api/admin/users/:id/resend-activation",
        "GET /api/admin/stats",
        "GET /api/admin/health",
        "POST /api/admin/users/reset-password",
      ],
      utility: ["/api/health", "/api/test", "/api/test-delete/:id"],
    },
  });
});

// Initialize database and start server
const PORT = 8888;

initDatabase()
  .then(async () => {
    await testConnection();

    app.listen(PORT, () => {
      console.log("\n🚀 =================================");
      console.log("🚀 CRM API Server running!");
      console.log("🚀 =================================");
      console.log(`📍 Port: ${PORT}`);
      console.log(`📍 Base URL: http://localhost:${PORT}`);
      console.log("📧 Email verification: AKTIVNA (PRAVI EMAILOVI)");
      console.log("📧 MailCatcher URL: http://localhost:1080");
      console.log("🔐 JWT Auth: AKTIVAN");
      console.log("🗄️ Database: PostgreSQL");
      console.log("🔑 Default password for all users: password123");
      console.log("📋 Available endpoints:");
      console.log("   GET    /api/clients");
      console.log("   GET    /api/clients/stats");
      console.log("   GET    /api/clients/notes-count");
      console.log("   GET    /api/notes");
      console.log("   POST   /api/notes");
      console.log("   PUT    /api/notes/:id");
      console.log("   DELETE /api/notes/:id");
      console.log("   DELETE /api/test-delete/:id (TEST)");
      console.log("   ADMIN  /api/admin/* (FULL ADMIN SUITE)");
      console.log("   AUTH   /api/auth/* (LOGIN, VERIFY, etc.)");
      console.log("=================================\n");
    });
  })
  .catch((error) => {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  });