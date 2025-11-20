// routes/admin.js
import express from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../database/config.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();

console.log('🔧 Admin Routes loading...');

// Validation rules for user creation
const createUserValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Unesite ispravan email'),
  body('first_name')
    .notEmpty()
    .trim()
    .escape()
    .withMessage('Ime je obavezno'),
  body('last_name')
    .notEmpty()
    .trim()
    .escape()
    .withMessage('Prezime je obavezno'),
  body('role')
    .isIn(['admin', 'manager', 'user'])
    .withMessage('Uloga mora biti admin, manager ili user')
];

// Helper function za slanje emaila
async function sendActivationEmail(emailData) {
  try {
    const { to, activation_link, user_name, admin_name } = emailData;
    
    console.log('📧 Sending activation email to:', to);
    
    // Ovdje integrirajte svoj email service
    // Za sada ćemo samo loggati
    console.log('✅ Activation email prepared:', {
      to,
      activation_link,
      user_name,
      admin_name
    });
    
    return true;
  } catch (error) {
    console.error('❌ Email sending error:', error);
    return false;
  }
}

// ✅ 1. GET /api/admin/users - Get all users (Admin only)
router.get('/users', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    console.log('🔧 Admin fetching all users...');
    
    const result = await pool.query(`
      SELECT 
        id, username, email, first_name, last_name, full_name,
        phone_mobile, phone_office, company, address, department,
        auth_method, role, status, email_verified,
        can_export, can_manage_clients, can_view_reports,
        last_login_at, login_count, created_at, updated_at
      FROM users 
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });

  } catch (error) {
    console.error('❌ Admin get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Greška pri dohvaćanju korisnika'
    });
  }
});

// ✅ 2. POST /api/admin/users - Create new user (Email-only auth)
router.post('/users', authenticateToken, requireRole(['admin']), createUserValidation, async (req, res) => {
  console.log('🔧 Admin creating new user...');
  
  // Check validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validacija neuspješna',
      details: errors.array()
    });
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const {
      email,
      first_name,
      last_name,
      phone_mobile,
      phone_office,
      company,
      address,
      department,
      role = 'user',
      send_activation_email = true,
      can_export = false,
      can_manage_clients = true,
      can_view_reports = true
    } = req.body;

    const full_name = `${first_name} ${last_name}`;
    const username = email.split('@')[0]; // Generiraj username iz emaila

    console.log('📝 Creating user:', { email, full_name, role });

    // 1. Provjeri da li email već postoji
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Korisnik s ovom email adresom već postoji'
      });
    }

    // 2. Kreiraj novog korisnika (bez passworda - email_only auth)
    const userResult = await client.query(`
      INSERT INTO users (
        username, email, first_name, last_name, full_name,
        phone_mobile, phone_office, company, address, department,
        auth_method, role, status, email_verified,
        can_export, can_manage_clients, can_view_reports,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `, [
      username, email, first_name, last_name, full_name,
      phone_mobile, phone_office, company, address, department,
      'email_only', // auth_method
      role,
      'pending_verification', // status
      false, // email_verified
      can_export, can_manage_clients, can_view_reports,
      req.user.id // created_by
    ]);

    const newUser = userResult.rows[0];
    console.log('✅ User created:', newUser.id);

    let activationData = null;

    // 3. Ako je odabrano, pošalji aktivacijski email
    if (send_activation_email) {
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 sata

      // Spremi token u verification_tokens tabelu
      await client.query(`
        INSERT INTO verification_tokens (user_id, token, token_type, expires_at)
        VALUES ($1, $2, $3, $4)
      `, [newUser.id, verificationToken, 'account_activation', expiresAt]);

      // Generiraj aktivacijski link
      const activationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-account?token=${verificationToken}&email=${encodeURIComponent(email)}`;
      
      // Pošalji email
      const emailSent = await sendActivationEmail({
        to: email,
        activation_link: activationLink,
        user_name: full_name,
        admin_name: req.user.full_name || req.user.username
      });

      activationData = {
        email_sent: emailSent,
        activation_link: activationLink
      };

      console.log('📧 Activation email sent:', emailSent);
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: send_activation_email 
        ? 'Korisnik kreiran i aktivacijski email poslan' 
        : 'Korisnik kreiran (email nije poslan)',
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
        created_at: newUser.created_at
      },
      activation: activationData
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Admin create user error:', error);
    res.status(500).json({
      success: false,
      error: 'Greška pri kreiranju korisnika'
    });
  } finally {
    client.release();
  }
});

// ✅ 3. POST /api/admin/users/:id/resend-activation - Resend activation email
router.post('/users/:id/resend-activation', authenticateToken, requireRole(['admin']), async (req, res) => {
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

    // Generiraj aktivacijski link
    const activationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-account?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;
    
    // Pošalji email
    const emailSent = await sendActivationEmail({
      to: user.email,
      activation_link: activationLink,
      user_name: user.full_name,
      admin_name: req.user.full_name || req.user.username
    });

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Aktivacijski email ponovno poslan',
      email: {
        sent: emailSent,
        to: user.email
      },
      activation: {
        activation_link: activationLink
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Resend activation error:', error);
    res.status(500).json({
      success: false,
      error: 'Greška pri slanju aktivacijskog emaila'
    });
  } finally {
    client.release();
  }
});

// ✅ 4. GET /api/admin/users/:id - Get user by ID
router.get('/users/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const userId = req.params.id;
    
    console.log('🔧 Fetching user:', userId);

    const result = await pool.query(`
      SELECT 
        id, username, email, first_name, last_name, full_name,
        phone_mobile, phone_office, company, address, department,
        auth_method, role, status, email_verified,
        can_export, can_manage_clients, can_view_reports,
        last_login_at, login_count, created_at, updated_at
      FROM users 
      WHERE id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Korisnik nije pronađen'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Greška pri dohvaćanju korisnika'
    });
  }
});

// ✅ 5. PUT /api/admin/users/:id - Update user
router.put('/users/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

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
      status
    } = req.body;

    const full_name = `${first_name} ${last_name}`;

    console.log('🔧 Updating user:', userId);

    // Provjeri da li korisnik postoji
    const userCheck = await client.query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Korisnik nije pronađen'
      });
    }

    // Update korisnika
    const result = await client.query(`
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
    `, [
      first_name, last_name, full_name,
      phone_mobile, phone_office, company, address, department,
      role, can_export, can_manage_clients, can_view_reports,
      status, userId
    ]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Korisnik uspješno ažuriran',
      data: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Greška pri ažuriranju korisnika'
    });
  } finally {
    client.release();
  }
});

// ✅ 6. DELETE /api/admin/users/:id - Delete user
router.delete('/users/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const userId = req.params.id;

    console.log('🔧 Deleting user:', userId);

    // Provjeri da li korisnik postoji
    const userCheck = await client.query(
      'SELECT id, email FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Korisnik nije pronađen'
      });
    }

    const userEmail = userCheck.rows[0].email;

    // Ne dozvoli brisanje samog sebe
    if (parseInt(userId) === req.user.id) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Ne možete obrisati vlastiti račun'
      });
    }

    // Obriši korisnika (CASCADE će obrisati sve povezane podatke)
    await client.query('DELETE FROM users WHERE id = $1', [userId]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Korisnik uspješno obrisan',
      deleted_user: {
        id: userId,
        email: userEmail
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Greška pri brisanju korisnika'
    });
  } finally {
    client.release();
  }
});

// ✅ 7. GET /api/admin/stats - Get admin statistics
router.get('/stats', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    console.log('📊 Fetching admin statistics...');

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

    // Aktivnosti po danu (zadnjih 7 dana)
    const activityStats = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as activity_count
      FROM user_activity_log 
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    res.json({
      success: true,
      data: {
        users_by_status: userStats.rows,
        users_by_auth_method: authStats.rows,
        users_by_role: roleStats.rows,
        recent_activities: activityStats.rows,
        summary: {
          total_users: userStats.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
          pending_verification: userStats.rows.find(row => row.status === 'pending_verification')?.count || 0,
          active_users: userStats.rows.find(row => row.status === 'active')?.count || 0,
          email_only_users: authStats.rows.find(row => row.auth_method === 'email_only')?.count || 0
        }
      }
    });

  } catch (error) {
    console.error('❌ Admin stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Greška pri dohvaćanju statistike'
    });
  }
});

console.log('✅ Admin routes loaded successfully');
console.log('📋 Admin endpoints:');
console.log('   GET    /api/admin/users');
console.log('   POST   /api/admin/users');
console.log('   GET    /api/admin/users/:id');
console.log('   PUT    /api/admin/users/:id');
console.log('   DELETE /api/admin/users/:id');
console.log('   POST   /api/admin/users/:id/resend-activation');
console.log('   GET    /api/admin/stats');

export default router;