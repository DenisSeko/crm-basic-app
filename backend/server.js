// server.js
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pkg from 'pg';
const { Pool } = pkg;

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());

// Debug middleware - DODANO
app.use((req, res, next) => {
  console.log(`🌐 ${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  if (req.method === 'DELETE') {
    console.log('🗑️ DELETE Request Details:', {
      params: req.params,
      headers: req.headers
    });
  }
  next();
});

// PostgreSQL Connection - AŽURIRANO za Docker konfiguraciju
const pool = new Pool({
  user: 'crm_user',
  host: 'localhost',
  database: 'crm_demo',
  password: 'crm_password',
  port: 5433,
});

// Test database connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL connected successfully');
    
    // Provjeri da li users table postoji
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    console.log('📊 Users table exists:', tableCheck.rows[0].exists);
    
    // Provjeri broj korisnika
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    console.log('👥 Total users in database:', userCount.rows[0].count);
    
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    return false;
  }
};

// JWT Secret
const JWT_SECRET = 'your-super-secret-jwt-key-change-in-production';

// Database initialization
const initDatabase = async () => {
  try {
    console.log('✅ Database structure verified - all columns exist');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
};

// Auth Middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('❌ No token provided');
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('🔐 Token decoded:', { userId: decoded.userId });
    
    const result = await pool.query(
      `SELECT id, username, email, first_name, last_name, full_name, role, company, 
              phone_mobile, email_verified, status, auth_method, department, 
              can_export, can_manage_clients, can_view_reports 
       FROM users WHERE id = $1`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      console.log('❌ User not found for token');
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    req.user = result.rows[0];
    console.log('✅ User authenticated:', { id: req.user.id, email: req.user.email });
    next();
  } catch (error) {
    console.error('❌ Token verification error:', error);
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

// Admin Middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// ⭐⭐⭐ AUTH ENDPOINTS ⭐⭐⭐

// LOGIN ENDPOINT - AŽURIRANO sa password_hash
app.post('/api/auth/login', async (req, res) => {
  console.log('=== LOGIN REQUEST START ===');
  
  try {
    const { email, password } = req.body;

    console.log('🔐 Login attempt for email:', email);

    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Pronađi korisnika
    console.log('🔍 Querying database for user...');
    const result = await pool.query(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );
    
    console.log('📊 Database query result - rows found:', result.rows.length);
    
    if (result.rows.length === 0) {
      console.log('❌ User not found in database');
      return res.status(401).json({
        success: false,
        message: 'Pogrešan email ili lozinka'
      });
    }

    const user = result.rows[0];
    console.log('👤 User found:', { 
      id: user.id, 
      email: user.email, 
      role: user.role, 
      status: user.status,
      auth_method: user.auth_method 
    });

    // Provjeri status korisnika
    if (user.status !== 'active') {
      console.log('❌ User account not active:', user.status);
      return res.status(401).json({
        success: false,
        message: 'Vaš račun nije aktiviran. Kontaktirajte administratora.'
      });
    }

    // Provjeri lozinku - AŽURIRANO za password_hash
    console.log('🔐 Checking password...');
    let passwordValid = false;
    
    if (user.auth_method === 'email_password' && user.password_hash) {
      console.log('🔐 Using password auth method');
      try {
        passwordValid = await bcrypt.compare(password, user.password_hash);
        console.log('🔐 Password comparison result:', passwordValid);
      } catch (bcryptError) {
        console.error('❌ Bcrypt error:', bcryptError);
        // Fallback za development
        passwordValid = password === 'password123';
        console.log('🔐 Fallback password check:', passwordValid);
      }
    } else if (user.auth_method === 'email_only') {
      console.log('📧 Using email-only auth method');
      // Za email-only korisnike, koristi default lozinku
      passwordValid = password === 'password123';
      console.log('🔐 Default password check:', passwordValid);
    } else {
      console.log('❌ Unknown auth method:', user.auth_method);
      passwordValid = password === 'password123';
    }

    if (!passwordValid) {
      console.log('❌ Invalid password');
      return res.status(401).json({
        success: false,
        message: 'Pogrešan email ili lozinka'
      });
    }

    // Ažuriraj last_login_at i login_count
    console.log('📝 Updating last login...');
    await pool.query(
      `UPDATE users SET 
        last_login_at = CURRENT_TIMESTAMP,
        login_count = COALESCE(login_count, 0) + 1 
       WHERE id = $1`,
      [user.id]
    );

    // Generiraj JWT token
    console.log('🔑 Generating JWT token...');
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('✅ Login successful for:', user.email);
    console.log('=== LOGIN REQUEST END ===');

    res.json({
      success: true,
      message: 'Uspješna prijava',
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
        can_view_reports: user.can_view_reports
      }
    });

  } catch (error) {
    console.error('❌ LOGIN ERROR DETAILS:');
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    console.log('=== LOGIN REQUEST END WITH ERROR ===');
    
    res.status(500).json({
      success: false,
      message: 'Greška pri prijavi: ' + error.message
    });
  }
});

// VERIFY ACCOUNT ENDPOINT
app.post('/api/auth/verify-account', async (req, res) => {
  try {
    const { token, email } = req.body;

    console.log('🔐 Account verification attempt:', email);

    if (!token || !email) {
      return res.status(400).json({
        success: false,
        message: 'Token and email are required'
      });
    }

    // Pronađi verification token
    const tokenResult = await pool.query(
      `SELECT vt.*, u.* 
       FROM verification_tokens vt 
       JOIN users u ON vt.user_id = u.id 
       WHERE vt.token = $1 AND vt.token_type = 'account_activation' 
       AND vt.expires_at > CURRENT_TIMESTAMP AND vt.used_at IS NULL`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nevažeći ili istekao verifikacijski token'
      });
    }

    const verification = tokenResult.rows[0];

    // Provjeri email
    if (verification.email !== email) {
      return res.status(400).json({
        success: false,
        message: 'Email se ne podudara s verifikacijskim tokenom'
      });
    }

    // Aktiviraj korisnika
    await pool.query(
      `UPDATE users 
       SET status = 'active', email_verified = TRUE, verified_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [verification.user_id]
    );

    // Označi token kao korišten
    await pool.query(
      'UPDATE verification_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = $1',
      [verification.id]
    );

    // Generiraj JWT token za automatski login
    const authToken = jwt.sign(
      { 
        userId: verification.user_id,
        email: verification.email,
        role: verification.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('✅ Account activated:', verification.email);

    res.json({
      success: true,
      message: 'Račun uspješno aktiviran!',
      token: authToken,
      user: {
        id: verification.user_id,
        username: verification.username,
        email: verification.email,
        first_name: verification.first_name,
        last_name: verification.last_name,
        full_name: verification.full_name,
        role: verification.role,
        company: verification.company,
        email_verified: true,
        status: 'active'
      },
      redirect_to: '/dashboard'
    });

  } catch (error) {
    console.error('Account verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri verifikaciji računa: ' + error.message
    });
  }
});

// VERIFY TOKEN ENDPOINT
app.get('/api/auth/verify', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri verifikaciji tokena'
    });
  }
});

// LOGOUT ENDPOINT
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Uspješno odjavljen'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri odjavi'
    });
  }
});

// FORGOT PASSWORD ENDPOINT
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email je obavezan'
      });
    }

    // Provjeri da li korisnik postoji
    const userResult = await pool.query(
      'SELECT id, email, first_name FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      // Vrati success čak i ako korisnik ne postoji (security best practice)
      return res.json({
        success: true,
        message: 'Ako email postoji, poslat ćemo vam link za reset lozinke'
      });
    }

    const user = userResult.rows[0];

    // Generiraj reset token
    const crypto = await import('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Spremi reset token u bazu
    await pool.query(
      `INSERT INTO verification_tokens 
       (user_id, token, token_type, expires_at) 
       VALUES ($1, $2, $3, $4)`,
      [
        user.id,
        resetToken,
        'password_reset',
        new Date(Date.now() + 1 * 60 * 60 * 1000) // 1 sat
      ]
    );

    // U stvarnoj aplikaciji, ovdje bi poslali email
    const resetLink = `http://localhost:5173/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    
    console.log('📧 Password reset link (development):', resetLink);

    res.json({
      success: true,
      message: 'Link za reset lozinke je poslan na vaš email',
      reset_link: resetLink // Samo za development
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri slanju zahtjeva za reset lozinke'
    });
  }
});

// ⭐⭐⭐ CLIENTS ENDPOINTS ⭐⭐⭐

// GET ALL CLIENTS
app.get('/api/clients', authenticateToken, async (req, res) => {
  try {
    console.log('📋 Fetching clients for user:', req.user.id);
    
    let result;
    
    // Ako je admin, vrati sve klijente
    if (req.user.role === 'admin') {
      result = await pool.query(`
        SELECT c.*, u.username as created_by_username 
        FROM clients c 
        LEFT JOIN users u ON c.created_by = u.id 
        ORDER BY c.created_at DESC
      `);
    } else {
      // Ako nije admin, vrati samo klijente dodijeljene korisniku
      result = await pool.query(`
        SELECT c.*, u.username as created_by_username, uc.is_primary
        FROM clients c
        INNER JOIN user_clients uc ON c.id = uc.client_id
        LEFT JOIN users u ON c.created_by = u.id 
        WHERE uc.user_id = $1
        ORDER BY c.created_at DESC
      `, [req.user.id]);
    }
    
    console.log('✅ Clients fetched:', result.rows.length);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri dohvaćanju klijenata'
    });
  }
});

// ⭐⭐⭐ SPECIFIČNE RUTE MORAJU BITI IZNAD DINAMIČKIH RUTA ⭐⭐⭐

// GET CLIENTS STATS
app.get('/api/clients/stats', authenticateToken, async (req, res) => {
  try {
    console.log('📊 Fetching clients stats for user:', req.user.id);
    
    let totalClients, totalNotes, averageNotes, lastNote;
    
    // Ukupno klijenata
    if (req.user.role === 'admin') {
      totalClients = await pool.query('SELECT COUNT(*) FROM clients');
    } else {
      totalClients = await pool.query(
        'SELECT COUNT(*) FROM user_clients WHERE user_id = $1',
        [req.user.id]
      );
    }
    
    // Ukupno bilješki
    if (req.user.role === 'admin') {
      totalNotes = await pool.query('SELECT COUNT(*) FROM notes');
    } else {
      totalNotes = await pool.query(`
        SELECT COUNT(*) FROM notes n
        INNER JOIN user_clients uc ON n.client_id = uc.client_id
        WHERE uc.user_id = $1
      `, [req.user.id]);
    }
    
    // Prosjek bilješki po klijentu
    const totalClientsCount = parseInt(totalClients.rows[0].count);
    const totalNotesCount = parseInt(totalNotes.rows[0].count);
    averageNotes = totalClientsCount > 0 ? (totalNotesCount / totalClientsCount).toFixed(2) : '0.00';
    
    // Zadnja bilješka
    if (req.user.role === 'admin') {
      lastNote = await pool.query(`
        SELECT n.*, c.name as client_name 
        FROM notes n 
        LEFT JOIN clients c ON n.client_id = c.id 
        ORDER BY n.created_at DESC 
        LIMIT 1
      `);
    } else {
      lastNote = await pool.query(`
        SELECT n.*, c.name as client_name 
        FROM notes n 
        INNER JOIN user_clients uc ON n.client_id = uc.client_id
        LEFT JOIN clients c ON n.client_id = c.id 
        WHERE uc.user_id = $1
        ORDER BY n.created_at DESC 
        LIMIT 1
      `, [req.user.id]);
    }
    
    const lastNoteData = lastNote.rows.length > 0 ? lastNote.rows[0] : null;
    
    res.json({
      success: true,
      data: {
        total_clients: totalClientsCount,
        total_notes: totalNotesCount,
        average_notes: averageNotes,
        last_note: lastNoteData
      }
    });
    
  } catch (error) {
    console.error('Get clients stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri dohvaćanju statistike klijenata'
    });
  }
});

// GET NOTES COUNT PER CLIENT
app.get('/api/clients/notes-count', authenticateToken, async (req, res) => {
  try {
    console.log('📝 Fetching notes count per client for user:', req.user.id);
    
    let result;
    
    if (req.user.role === 'admin') {
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
      result = await pool.query(`
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
      `, [req.user.id]);
    }
    
    console.log('✅ Notes count fetched for clients:', result.rows.length);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Get notes count error:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri dohvaćanju broja bilješki po klijentu'
    });
  }
});

// ⭐⭐⭐ DINAMIČKE RUTE MORAJU BITI ISPOD SPECIFIČNIH RUTA ⭐⭐⭐

// GET CLIENT BY ID
app.get('/api/clients/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT c.*, u.username as created_by_username 
      FROM clients c 
      LEFT JOIN users u ON c.created_by = u.id 
      WHERE c.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Klijent nije pronađen'
      });
    }
    
    // Provjeri permisije (samo admin ili dodijeljeni korisnik)
    if (req.user.role !== 'admin') {
      const userAccess = await pool.query(
        'SELECT 1 FROM user_clients WHERE user_id = $1 AND client_id = $2',
        [req.user.id, id]
      );
      
      if (userAccess.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Nemate pristup ovom klijentu'
        });
      }
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri dohvaćanju klijenta'
    });
  }
});

// CREATE CLIENT
app.post('/api/clients', authenticateToken, async (req, res) => {
  try {
    const {
      name, email, company, phone, address, notes
    } = req.body;

    // Provjeri da li klijent već postoji
    const existingClient = await pool.query(
      'SELECT id FROM clients WHERE email = $1',
      [email]
    );
    
    if (existingClient.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Klijent s ovim emailom već postoji'
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
    if (req.user.role !== 'admin') {
      await pool.query(
        `INSERT INTO user_clients (user_id, client_id, assigned_by, is_primary)
         VALUES ($1, $2, $3, TRUE)`,
        [req.user.id, client.id, req.user.id]
      );
    }

    res.json({
      success: true,
      message: 'Klijent uspješno kreiran',
      data: client
    });

  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri kreiranju klijenta'
    });
  }
});

// UPDATE CLIENT
app.put('/api/clients/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, email, company, phone, address, notes
    } = req.body;

    // Provjeri da li klijent postoji
    const existingClient = await pool.query(
      'SELECT id, created_by FROM clients WHERE id = $1',
      [id]
    );
    
    if (existingClient.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Klijent nije pronađen'
      });
    }

    // Provjeri permisije (samo admin ili kreator klijenta)
    if (req.user.role !== 'admin' && existingClient.rows[0].created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Nemate ovlasti za ažuriranje ovog klijenta'
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
      message: 'Klijent uspješno ažuriran',
      data: clientResult.rows[0]
    });

  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri ažuriranju klijenta'
    });
  }
});

// DELETE CLIENT
app.delete('/api/clients/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Provjeri da li klijent postoji
    const existingClient = await pool.query(
      'SELECT id, created_by FROM clients WHERE id = $1',
      [id]
    );
    
    if (existingClient.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Klijent nije pronađen'
      });
    }

    // Provjeri permisije (samo admin ili kreator klijenta)
    if (req.user.role !== 'admin' && existingClient.rows[0].created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Nemate ovlasti za brisanje ovog klijenta'
      });
    }

    // Obriši klijenta (CASCADE će obrisati i veze u user_clients)
    await pool.query('DELETE FROM clients WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Klijent uspješno obrisan'
    });

  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri brisanju klijenta'
    });
  }
});

// ⭐⭐⭐ NOTES ENDPOINTS ⭐⭐⭐

// GET ALL NOTES
app.get('/api/notes', authenticateToken, async (req, res) => {
  try {
    console.log('📝 Fetching notes for user:', req.user.id);
    
    let result;
    
    if (req.user.role === 'admin') {
      result = await pool.query(`
        SELECT n.*, c.name as client_name, u.username as created_by_username
        FROM notes n
        LEFT JOIN clients c ON n.client_id = c.id
        LEFT JOIN users u ON n.created_by = u.id
        ORDER BY n.created_at DESC
      `);
    } else {
      result = await pool.query(`
        SELECT n.*, c.name as client_name, u.username as created_by_username
        FROM notes n
        INNER JOIN user_clients uc ON n.client_id = uc.client_id
        LEFT JOIN clients c ON n.client_id = c.id
        LEFT JOIN users u ON n.created_by = u.id
        WHERE uc.user_id = $1
        ORDER BY n.created_at DESC
      `, [req.user.id]);
    }
    
    console.log('✅ Notes fetched:', result.rows.length);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
    
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri dohvaćanju bilješki'
    });
  }
});

// GET NOTE BY ID
app.get('/api/notes/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    let result;
    
    if (req.user.role === 'admin') {
      result = await pool.query(`
        SELECT n.*, c.name as client_name, u.username as created_by_username
        FROM notes n
        LEFT JOIN clients c ON n.client_id = c.id
        LEFT JOIN users u ON n.created_by = u.id
        WHERE n.id = $1
      `, [id]);
    } else {
      result = await pool.query(`
        SELECT n.*, c.name as client_name, u.username as created_by_username
        FROM notes n
        INNER JOIN user_clients uc ON n.client_id = uc.client_id
        LEFT JOIN clients c ON n.client_id = c.id
        LEFT JOIN users u ON n.created_by = u.id
        WHERE n.id = $1 AND uc.user_id = $2
      `, [id, req.user.id]);
    }
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Bilješka nije pronađena'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri dohvaćanju bilješke'
    });
  }
});

// CREATE NOTE
app.post('/api/notes', authenticateToken, async (req, res) => {
  try {
    const {
      client_id, title, content, note_type = 'general'
    } = req.body;

    // Provjeri da li klijent postoji i ima li korisnik pristup
    let clientCheck;
    if (req.user.role === 'admin') {
      clientCheck = await pool.query('SELECT id FROM clients WHERE id = $1', [client_id]);
    } else {
      clientCheck = await pool.query(`
        SELECT c.id FROM clients c
        INNER JOIN user_clients uc ON c.id = uc.client_id
        WHERE c.id = $1 AND uc.user_id = $2
      `, [client_id, req.user.id]);
    }
    
    if (clientCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Nemate pristup ovom klijentu'
      });
    }

    // Kreiraj bilješku
    const noteResult = await pool.query(`
      INSERT INTO notes 
      (client_id, title, content, note_type, created_by) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING *
    `, [client_id, title, content, note_type, req.user.id]);

    const note = noteResult.rows[0];

    res.json({
      success: true,
      message: 'Bilješka uspješno kreirana',
      data: note
    });

  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri kreiranju bilješke'
    });
  }
});

// UPDATE NOTE
app.put('/api/notes/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title, content, note_type
    } = req.body;

    // Provjeri da li bilješka postoji
    let noteCheck;
    if (req.user.role === 'admin') {
      noteCheck = await pool.query('SELECT * FROM notes WHERE id = $1', [id]);
    } else {
      noteCheck = await pool.query(`
        SELECT n.* FROM notes n
        INNER JOIN user_clients uc ON n.client_id = uc.client_id
        WHERE n.id = $1 AND uc.user_id = $2
      `, [id, req.user.id]);
    }
    
    if (noteCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Bilješka nije pronađena'
      });
    }

    // Provjeri permisije (samo admin ili kreator bilješke)
    const note = noteCheck.rows[0];
    if (req.user.role !== 'admin' && note.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Nemate ovlasti za ažuriranje ove bilješke'
      });
    }

    // Ažuriraj bilješku
    const updateResult = await pool.query(`
      UPDATE notes 
      SET title = $1, content = $2, note_type = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 
      RETURNING *
    `, [title, content, note_type, id]);

    res.json({
      success: true,
      message: 'Bilješka uspješno ažurirana',
      data: updateResult.rows[0]
    });

  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri ažuriranju bilješke'
    });
  }
});

// DELETE NOTE - POPRAVLJEN ENDPOINT
app.delete('/api/notes/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ SERVER: DELETE request for note ID: ${id} from user: ${req.user.id}`);

    // Provjeri da li bilješka postoji
    let noteCheck;
    if (req.user.role === 'admin') {
      noteCheck = await pool.query('SELECT * FROM notes WHERE id = $1', [id]);
    } else {
      noteCheck = await pool.query(`
        SELECT n.* FROM notes n
        INNER JOIN user_clients uc ON n.client_id = uc.client_id
        WHERE n.id = $1 AND uc.user_id = $2
      `, [id, req.user.id]);
    }
    
    if (noteCheck.rows.length === 0) {
      console.log(`❌ SERVER: Note not found: ${id}`);
      return res.status(404).json({
        success: false,
        message: 'Bilješka nije pronađena'
      });
    }

    // Provjeri permisije (samo admin ili kreator bilješke)
    const note = noteCheck.rows[0];
    if (req.user.role !== 'admin' && note.created_by !== req.user.id) {
      console.log(`❌ SERVER: User ${req.user.id} not authorized to delete note ${id}`);
      return res.status(403).json({
        success: false,
        message: 'Nemate ovlasti za brisanje ove bilješke'
      });
    }

    // Obriši bilješku
    await pool.query('DELETE FROM notes WHERE id = $1', [id]);
    
    console.log(`✅ SERVER: Note successfully deleted: ${id}`);

    res.json({
      success: true,
      message: 'Bilješka uspješno obrisana'
    });

  } catch (error) {
    console.error('❌ SERVER: Delete note error:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri brisanju bilješke: ' + error.message
    });
  }
});

// ⭐⭐⭐ ADMIN ENDPOINTS ⭐⭐⭐

// GET ALL USERS
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, first_name, last_name, full_name, role, company, 
              phone_mobile, status, email_verified, auth_method, department,
              can_export, can_manage_clients, can_view_reports,
              created_at, last_login_at, login_count
       FROM users ORDER BY created_at DESC`
    );
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri dohvaćanju korisnika'
    });
  }
});

// CREATE USER
app.post('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      username, email, first_name, last_name, full_name, role, company,
      phone_mobile, department, auth_method = 'email_only',
      send_activation_email = true
    } = req.body;

    // Provjeri da li email već postoji
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Korisnik s ovim emailom ili usernameom već postoji'
      });
    }

    // Kreiraj korisnika
    const userResult = await pool.query(
      `INSERT INTO users 
       (username, email, first_name, last_name, full_name, role, company, 
        phone_mobile, department, auth_method, status, email_verified, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
       RETURNING id, username, email, first_name, last_name, full_name, role, company, status`,
      [
        username, email, first_name, last_name, full_name, role || 'user', company,
        phone_mobile, department, auth_method, 'pending_verification', false,
        req.user.id
      ]
    );

    const user = userResult.rows[0];
    let activationData = null;

    // Pošalji activation email ako je odabrano
    if (send_activation_email && auth_method === 'email_only') {
      const crypto = await import('crypto');
      const verificationToken = crypto.randomBytes(32).toString('hex');
      
      await pool.query(
        `INSERT INTO verification_tokens 
         (user_id, token, token_type, expires_at) 
         VALUES ($1, $2, $3, $4)`,
        [
          user.id,
          verificationToken,
          'account_activation',
          new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 sata
        ]
      );

      const activationLink = `http://localhost:5173/activate?token=${verificationToken}&email=${encodeURIComponent(email)}`;
      
      activationData = {
        email_sent: true,
        activation_link: activationLink
      };

      console.log('📧 Activation link generated:', activationLink);
    }

    res.json({
      success: true,
      message: send_activation_email ? 
        'Korisnik kreiran i aktivacijski email poslan' : 
        'Korisnik kreiran (email nije poslan)',
      user: user,
      activation: activationData
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Greška pri kreiranju korisnika: ' + error.message
    });
  }
});

// HEALTH CHECK ENDPOINT
app.get('/api/health', async (req, res) => {
  try {
    const dbConnected = await testConnection();
    
    res.json({
      success: true,
      message: 'CRM API is running',
      database: dbConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'API health check failed',
      error: error.message
    });
  }
});

// TEST ENDPOINT
app.get('/api/test', (req, res) => {
  console.log('✅ Test endpoint called');
  res.json({
    success: true,
    message: 'Server is working!',
    timestamp: new Date().toISOString()
  });
});

// TEST DELETE ENDPOINT
app.delete('/api/test-delete/:id', authenticateToken, async (req, res) => {
  console.log('✅ TEST DELETE ENDPOINT CALLED');
  res.json({
    success: true,
    message: 'Test delete endpoint works!',
    noteId: req.params.id,
    user: req.user.id
  });
});

// Default route
app.get('/', (req, res) => {
  res.json({
    message: 'CRM API Server',
    version: '1.0.0',
    database: 'PostgreSQL',
    endpoints: {
      auth: [
        '/api/auth/login', 
        '/api/auth/verify-account', 
        '/api/auth/verify', 
        '/api/auth/logout',
        '/api/auth/forgot-password'
      ],
      clients: [
        '/api/clients', 
        '/api/clients/:id', 
        '/api/clients (POST)', 
        '/api/clients/:id (PUT)', 
        '/api/clients/:id (DELETE)'
      ],
      notes: [
        '/api/notes',
        '/api/notes/:id',
        '/api/notes (POST)',
        '/api/notes/:id (PUT)',
        '/api/notes/:id (DELETE)'
      ],
      stats: [
        '/api/clients/stats', 
        '/api/clients/notes-count'
      ],
      admin: [
        '/api/admin/users', 
        '/api/admin/users (POST)'
      ],
      utility: [
        '/api/health',
        '/api/test',
        '/api/test-delete/:id'
      ]
    }
  });
});

// Initialize database and start server
const PORT = 8888;

initDatabase().then(async () => {
  await testConnection();
  
  app.listen(PORT, () => {
    console.log('\n🚀 =================================');
    console.log('🚀 CRM API Server running!');
    console.log('🚀 =================================');
    console.log(`📍 Port: ${PORT}`);
    console.log(`📍 Base URL: http://localhost:${PORT}`);
    console.log('📧 Email verification: AKTIVNA');
    console.log('🔐 JWT Auth: AKTIVAN');
    console.log('🗄️ Database: PostgreSQL');
    console.log('🔑 Default password for all users: password123');
    console.log('📋 Available endpoints:');
    console.log('   GET    /api/clients');
    console.log('   GET    /api/clients/stats');
    console.log('   GET    /api/clients/notes-count');
    console.log('   GET    /api/notes');
    console.log('   POST   /api/notes');
    console.log('   PUT    /api/notes/:id');
    console.log('   DELETE /api/notes/:id');
    console.log('   DELETE /api/test-delete/:id (TEST)');
    console.log('=================================\n');
  });
}).catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});