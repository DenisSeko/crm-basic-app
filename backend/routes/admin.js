// routes/admin.js
import express from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../database/config.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import crypto from 'crypto';

// EmailService import s boljim error handlingom
let emailService;
try {
  emailService = await import('../services/emailService.js').then(module => module.default);
  console.log('✅ EmailService uspješno uvezen');
} catch (error) {
  console.error('❌ Greška pri uvoženju EmailService:', error.message);
  emailService = null;
}

console.log('🔧 Admin Routes loading...');
console.log('📧 EmailService status:', {
  available: !!emailService,
  hasTransporter: emailService?.transporter ? 'YES' : 'NO',
  hasTestEmail: typeof emailService?.sendTestEmail === 'function',
  hasActivationEmail: typeof emailService?.sendActivationEmail === 'function'
});

const router = express.Router();

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

// Helper function za slanje emaila PREKO PRAVOG EMAIL SERVISA
async function sendActivationEmail(emailData) {
  try {
    const { to, activation_token, user_name, admin_name } = emailData;
    
    console.log('📧 Sending REAL activation email to:', to);
    console.log('🔑 Activation token:', activation_token);
    console.log('👤 User name:', user_name);
    
    if (!emailService) {
      console.error('❌ EmailService nije dostupan');
      return false;
    }
    
    if (!emailService.sendActivationEmail) {
      console.error('❌ sendActivationEmail metoda nije dostupna');
      return false;
    }
    
    // Pozovite pravi EmailService
    const emailSent = await emailService.sendActivationEmail(
      to,
      activation_token,
      user_name
    );
    
    console.log('✅ Email service response:', emailSent);
    return emailSent;
    
  } catch (error) {
    console.error('❌ Email sending error:', error);
    return false;
  }
}

// ✅ HEALTH CHECK ENDPOINT (PUBLIC)
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Admin routes are working',
    timestamp: new Date().toISOString(),
    services: {
      email_service: !!emailService,
      database: true,
      authentication: true
    },
    endpoints: [
      'GET /api/admin/health',
      'GET /api/admin/test-email',
      'GET /api/admin/users (AUTH)',
      'POST /api/admin/users (AUTH)',
      'GET /api/admin/users/:id (AUTH)',
      'PUT /api/admin/users/:id (AUTH)',
      'DELETE /api/admin/users/:id (AUTH)'
    ]
  });
});

// ✅ PUBLIC TEST ENDPOINT - Test EmailService direktno
router.get('/test-email', async (req, res) => {
  try {
    console.log('🧪 PUBLIC Testing EmailService directly...');
    
    // Provjeri je li EmailService dostupan
    if (!emailService) {
      return res.status(500).json({
        success: false,
        error: 'EmailService nije dostupan',
        solution: 'Provjerite da li je EmailService.js u services folderu'
      });
    }
    
    console.log('🔧 EmailService status:', {
      hasTransporter: !!emailService.transporter,
      hasTestEmail: typeof emailService.sendTestEmail === 'function',
      hasActivationEmail: typeof emailService.sendActivationEmail === 'function'
    });
    
    let testResults = {};
    
    // Test 1: Test email
    if (emailService.sendTestEmail) {
      console.log('📤 Sending test email...');
      testResults.test_email = await emailService.sendTestEmail();
    } else {
      testResults.test_email = 'sendTestEmail metoda nije dostupna';
    }
    
    // Test 2: Activation email (opcionalno)
    if (emailService.sendActivationEmail) {
      console.log('📤 Sending test activation email...');
      testResults.activation_email = await emailService.sendActivationEmail(
        'test@example.com',
        'test-activation-token-' + Date.now(),
        'Test Korisnik'
      );
    } else {
      testResults.activation_email = 'sendActivationEmail metoda nije dostupna';
    }
    
    res.json({
      success: true,
      message: 'Test emailovi pokrenuti',
      results: testResults,
      mailcatcher_url: 'http://localhost:1080',
      next_steps: [
        '1. Otvorite http://localhost:1080 u browseru',
        '2. Provjerite ima li novih emailova',
        '3. Ako nema, provjerite backend logove za greške'
      ],
      debug_info: {
        email_service_available: !!emailService,
        node_env: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Test email error:', error);
    res.status(500).json({
      success: false,
      error: 'Greška pri testiranju email servisa: ' + error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      debug: {
        email_service: !!emailService,
        error_name: error.name
      }
    });
  }
});

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
    const username = email.split('@')[0];

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

    // 2. Kreiraj novog korisnika
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
      'email_only',
      role,
      'pending_verification',
      false,
      can_export, can_manage_clients, can_view_reports,
      req.user.id
    ]);

    const newUser = userResult.rows[0];
    console.log('✅ User created:', newUser.id);

    let activationData = null;

    // 3. Ako je odabrano, pošalji aktivacijski email PREKO PRAVOG EMAIL SERVISA
    if (send_activation_email) {
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Spremi token u verification_tokens tabelu
      await client.query(`
        INSERT INTO verification_tokens (user_id, token, token_type, expires_at)
        VALUES ($1, $2, $3, $4)
      `, [newUser.id, verificationToken, 'account_activation', expiresAt]);

      console.log('🔑 Activation token generated:', verificationToken);

      // POŠALJI EMAIL PREKO PRAVOG EMAIL SERVISA
      const emailSent = await sendActivationEmail({
        to: email,
        activation_token: verificationToken,
        user_name: full_name,
        admin_name: req.user.full_name || req.user.username
      });

      activationData = {
        email_sent: emailSent,
        activation_token: verificationToken
      };

      console.log('📧 Activation email sent via EmailService:', emailSent);
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
      error: 'Greška pri kreiranju korisnika: ' + error.message
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

    console.log('🔑 New activation token generated:', verificationToken);

    // POŠALJI EMAIL PREKO PRAVOG EMAIL SERVISA
    const emailSent = await sendActivationEmail({
      to: user.email,
      activation_token: verificationToken,
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
        activation_token: verificationToken
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

// ✅ 4. GET /api/admin/users/:id - Get user by ID (NOVA RUTA)
router.get('/users/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const userId = req.params.id;
    
    console.log('🔧 [BACKEND] Fetching user by ID:', userId);

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
      console.log('❌ [BACKEND] User not found:', userId);
      return res.status(404).json({
        success: false,
        error: 'Korisnik nije pronađen'
      });
    }

    const user = result.rows[0];
    console.log('✅ [BACKEND] User found:', { id: user.id, email: user.email, name: user.full_name });

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('❌ [BACKEND] Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Greška pri dohvaćanju korisnika: ' + error.message
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
      name,
      email,
      company,
      role,
      first_name,
      last_name,
      phone_mobile,
      phone_office,
      address,
      department,
      can_export,
      can_manage_clients,
      can_view_reports,
      status
    } = req.body;

    console.log('🔧 [BACKEND] Updating user:', userId, 'with data:', req.body);

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

    // Pripremi podatke za update
    let updateFields = [];
    let updateValues = [];
    let paramCount = 1;

    // Mapiranje polja iz frontenda na backend
    if (name !== undefined) {
      // Ako frontend šalje "name", podijeli na first_name i last_name
      const nameParts = name.split(' ');
      const first_name = nameParts[0];
      const last_name = nameParts.slice(1).join(' ') || '';
      const full_name = name;
      
      updateFields.push(`first_name = $${paramCount++}`);
      updateValues.push(first_name);
      
      updateFields.push(`last_name = $${paramCount++}`);
      updateValues.push(last_name);
      
      updateFields.push(`full_name = $${paramCount++}`);
      updateValues.push(full_name);
    }

    if (email !== undefined) {
      updateFields.push(`email = $${paramCount++}`);
      updateValues.push(email);
    }

    if (company !== undefined) {
      updateFields.push(`company = $${paramCount++}`);
      updateValues.push(company);
    }

    if (role !== undefined) {
      updateFields.push(`role = $${paramCount++}`);
      updateValues.push(role);
    }

    if (status !== undefined) {
      updateFields.push(`status = $${paramCount++}`);
      updateValues.push(status);
    }

    // Dodaj ostala polja ako su poslana
    if (first_name !== undefined) {
      updateFields.push(`first_name = $${paramCount++}`);
      updateValues.push(first_name);
    }

    if (last_name !== undefined) {
      updateFields.push(`last_name = $${paramCount++}`);
      updateValues.push(last_name);
    }

    if (phone_mobile !== undefined) {
      updateFields.push(`phone_mobile = $${paramCount++}`);
      updateValues.push(phone_mobile);
    }

    if (phone_office !== undefined) {
      updateFields.push(`phone_office = $${paramCount++}`);
      updateValues.push(phone_office);
    }

    if (address !== undefined) {
      updateFields.push(`address = $${paramCount++}`);
      updateValues.push(address);
    }

    if (department !== undefined) {
      updateFields.push(`department = $${paramCount++}`);
      updateValues.push(department);
    }

    if (can_export !== undefined) {
      updateFields.push(`can_export = $${paramCount++}`);
      updateValues.push(can_export);
    }

    if (can_manage_clients !== undefined) {
      updateFields.push(`can_manage_clients = $${paramCount++}`);
      updateValues.push(can_manage_clients);
    }

    if (can_view_reports !== undefined) {
      updateFields.push(`can_view_reports = $${paramCount++}`);
      updateValues.push(can_view_reports);
    }

    // Dodaj updated_at
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    // Dodaj user_id na kraj
    updateValues.push(userId);

    if (updateFields.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Nema podataka za ažuriranje'
      });
    }

    const updateQuery = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await client.query(updateQuery, updateValues);

    await client.query('COMMIT');

    console.log('✅ [BACKEND] User updated successfully:', userId);

    res.json({
      success: true,
      message: 'Korisnik uspješno ažuriran',
      data: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ [BACKEND] Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Greška pri ažuriranju korisnika: ' + error.message
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

    // Obriši korisnika
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
console.log('   GET    /api/admin/health (PUBLIC)');
console.log('   GET    /api/admin/test-email (PUBLIC)');
console.log('   GET    /api/admin/users (AUTH)');
console.log('   POST   /api/admin/users (AUTH)');
console.log('   GET    /api/admin/users/:id (AUTH)');
console.log('   PUT    /api/admin/users/:id (AUTH)');
console.log('   DELETE /api/admin/users/:id (AUTH)');
console.log('   POST   /api/admin/users/:id/resend-activation (AUTH)');
console.log('   GET    /api/admin/stats (AUTH)');

// ✅ DEBUG: Test specific user route
router.get('/debug-user/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const userId = req.params.id;
    console.log('🔍 [DEBUG] Testing user route for ID:', userId);
    
    const result = await pool.query('SELECT id, email FROM users WHERE id = $1', [userId]);
    
    if (result.rows.length === 0) {
      return res.json({
        success: false,
        message: 'User not found in database',
        tested_id: userId
      });
    }
    
    res.json({
      success: true,
      message: 'User found in database',
      user: result.rows[0],
      tested_id: userId
    });
    
  } catch (error) {
    console.error('❌ Debug route error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;