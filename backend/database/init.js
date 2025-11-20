// database/init.js - AŽURIRANO ZA EMAIL-ONLY AUTH
import pkg from 'pg';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://crm_user:crm_password@localhost:5433/crm_demo',
  ssl: false
});

async function initializeDatabase() {
  let dbClient;
  
  try {
    console.log('🚀 Starting database initialization...');
    console.log('📊 Database:', process.env.DATABASE_URL || 'postgresql://crm_user:crm_password@localhost:5433/crm_demo');
    
    dbClient = await pool.connect();
    console.log('✅ Connected to database');

    // ⭐⭐⭐ PRVO UKLONI NOT NULL CONSTRAINT SA password_hash ⭐⭐⭐
    console.log('🔧 Modifying users table constraints...');

    // Prvo provjeri da li postoji NOT NULL constraint i ukloni ga
    const constraintCheck = await dbClient.query(`
      SELECT 
        column_name,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users' 
        AND column_name = 'password_hash'
        AND is_nullable = 'NO'
    `);

    if (constraintCheck.rows.length > 0) {
      console.log('📝 Removing NOT NULL constraint from password_hash...');
      
      // Ukloni NOT NULL constraint
      await dbClient.query(`
        ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL
      `);
      
      console.log('✅ NOT NULL constraint removed from password_hash');
    } else {
      console.log('✅ password_hash already allows NULL values');
    }

    // ⭐⭐⭐ DODAJ NOVE KOLONE U POSTOJEĆE TABELE ⭐⭐⭐
    console.log('🔧 Adding new columns to existing tables...');

    await dbClient.query(`
      DO $$ 
      BEGIN
        -- Dodaj full_name ako ne postoji
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='full_name') THEN
          ALTER TABLE users ADD COLUMN full_name VARCHAR(100);
        END IF;
        
        -- Dodaj permissions kolone
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='can_export') THEN
          ALTER TABLE users ADD COLUMN can_export BOOLEAN DEFAULT FALSE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='can_manage_clients') THEN
          ALTER TABLE users ADD COLUMN can_manage_clients BOOLEAN DEFAULT TRUE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='can_view_reports') THEN
          ALTER TABLE users ADD COLUMN can_view_reports BOOLEAN DEFAULT TRUE;
        END IF;
        
        -- Ostale kolone...
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='phone_mobile') THEN
          ALTER TABLE users ADD COLUMN phone_mobile VARCHAR(20);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='phone_office') THEN
          ALTER TABLE users ADD COLUMN phone_office VARCHAR(20);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='company') THEN
          ALTER TABLE users ADD COLUMN company VARCHAR(100);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='address') THEN
          ALTER TABLE users ADD COLUMN address TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='department') THEN
          ALTER TABLE users ADD COLUMN department VARCHAR(50);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='auth_method') THEN
          ALTER TABLE users ADD COLUMN auth_method VARCHAR(20) DEFAULT 'email_only';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='status') THEN
          ALTER TABLE users ADD COLUMN status VARCHAR(30) DEFAULT 'pending_verification';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='verified_at') THEN
          ALTER TABLE users ADD COLUMN verified_at TIMESTAMP;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='created_by') THEN
          ALTER TABLE users ADD COLUMN created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_login_at') THEN
          ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='login_count') THEN
          ALTER TABLE users ADD COLUMN login_count INTEGER DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='timezone') THEN
          ALTER TABLE users ADD COLUMN timezone VARCHAR(50) DEFAULT 'Europe/Zagreb';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='language') THEN
          ALTER TABLE users ADD COLUMN language VARCHAR(10) DEFAULT 'hr';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='notes') THEN
          ALTER TABLE users ADD COLUMN notes TEXT;
        END IF;
      END $$;
    `);

    console.log('✅ Users table columns updated');

    // ⭐⭐⭐ KREIRANJE VERIFICATION TOKENS TABELE ⭐⭐⭐
    console.log('🔐 Creating verification_tokens table...');

    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS verification_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        token_type VARCHAR(50) NOT NULL CHECK (token_type IN ('account_activation', 'password_reset', 'email_change')),
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ⭐⭐⭐ KREIRANJE OSTALIH TABELA ⭐⭐⭐
    console.log('📋 Creating other tables if they don\'t exist...');

    // Roles table
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        level INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Permissions table
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id SERIAL PRIMARY KEY,
        code VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Role permissions table
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id SERIAL PRIMARY KEY,
        role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(role_id, permission_id)
      )
    `);

    // User roles table
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, role_id)
      )
    `);

    // User clients table
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS user_clients (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_primary BOOLEAN DEFAULT FALSE,
        UNIQUE(user_id, client_id)
      )
    `);

    // User activity log table
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS user_activity_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(100),
        resource_id INTEGER,
        details JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User login history table
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS user_login_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(45),
        user_agent TEXT,
        success BOOLEAN DEFAULT TRUE,
        failure_reason TEXT
      )
    `);

    console.log('✅ All tables created/verified');

    // ⭐⭐⭐ INSERT/UPDATE DEMO PODACI - AŽURIRANO ZA EMAIL-ONLY AUTH ⭐⭐⭐
    console.log('👥 Inserting/updating demo users with extended data...');
    
    const demoUsers = [
      {
        username: 'admin',
        email: 'admin@crm.com',
        password: 'password123',
        firstName: 'Admin',
        lastName: 'Korisnik',
        fullName: 'Admin Korisnik',
        phoneMobile: '+385 99 123 4567',
        company: 'CRM Solutions',
        department: 'IT',
        role: 'admin',
        authMethod: 'email_password',
        status: 'active',
        emailVerified: true,
        canExport: true,
        canManageClients: true,
        canViewReports: true
      },
      {
        username: 'ivan.horvat',
        email: 'ivan.horvat@primjer.hr',
        password: 'password123',
        firstName: 'Ivan',
        lastName: 'Horvat',
        fullName: 'Ivan Horvat',
        phoneMobile: '+385 91 234 5678',
        company: 'Tech Company',
        department: 'Sales',
        role: 'user',
        authMethod: 'email_password',
        status: 'active',
        emailVerified: true,
        canExport: false,
        canManageClients: true,
        canViewReports: true
      },
      {
        username: 'ana.kovac',
        email: 'ana.kovac@primjer.hr',
        password: 'password123',
        firstName: 'Ana',
        lastName: 'Kovač',
        fullName: 'Ana Kovač',
        phoneMobile: '+385 95 345 6789',
        company: 'Digital Agency',
        department: 'Marketing',
        role: 'manager',
        authMethod: 'email_password',
        status: 'active',
        emailVerified: true,
        canExport: true,
        canManageClients: true,
        canViewReports: true
      },
      {
        username: 'marko.petrov',
        email: 'marko.petrov@primjer.hr',
        password: 'password123',
        firstName: 'Marko',
        lastName: 'Petrov',
        fullName: 'Marko Petrov',
        phoneMobile: '+385 98 456 7890',
        company: 'Web Studio',
        department: 'Development',
        role: 'user',
        authMethod: 'email_password',
        status: 'active',
        emailVerified: true,
        canExport: false,
        canManageClients: true,
        canViewReports: true
      },
      {
        username: 'maja.juric',
        email: 'maja.juric@primjer.hr',
        password: null,
        firstName: 'Maja',
        lastName: 'Jurić',
        fullName: 'Maja Jurić',
        phoneMobile: '+385 97 567 8901',
        company: 'Design Studio',
        department: 'Design',
        role: 'user',
        authMethod: 'email_only',
        status: 'pending_verification',
        emailVerified: false,
        canExport: false,
        canManageClients: true,
        canViewReports: true
      },
      {
        username: 'petar.kovac',
        email: 'petar.kovac@primjer.hr',
        password: null,
        firstName: 'Petar',
        lastName: 'Kovač',
        fullName: 'Petar Kovač',
        phoneMobile: '+385 99 678 9012',
        company: 'Cloud Services',
        department: 'IT',
        role: 'user',
        authMethod: 'email_only',
        status: 'pending_verification',
        emailVerified: false,
        canExport: false,
        canManageClients: true,
        canViewReports: true
      },
      // ⭐⭐⭐ NOVI EMAIL-ONLY DEMO KORISNICI ⭐⭐⭐
      {
        username: 'demo.emailonly',
        email: 'demo.emailonly@primjer.hr',
        password: null,
        firstName: 'Demo',
        lastName: 'EmailOnly',
        fullName: 'Demo EmailOnly',
        phoneMobile: '+385 95 111 2222',
        company: 'Test Company',
        department: 'Sales',
        role: 'user',
        authMethod: 'email_only',
        status: 'pending_verification',
        emailVerified: false,
        canExport: false,
        canManageClients: true,
        canViewReports: true
      },
      {
        username: 'test.manager',
        email: 'test.manager@primjer.hr',
        password: null,
        firstName: 'Test',
        lastName: 'Manager',
        fullName: 'Test Manager',
        phoneMobile: '+385 95 333 4444',
        company: 'Management Inc',
        department: 'Management',
        role: 'manager',
        authMethod: 'email_only',
        status: 'pending_verification',
        emailVerified: false,
        canExport: true,
        canManageClients: true,
        canViewReports: true
      }
    ];

    for (const user of demoUsers) {
      const passwordHash = user.password ? await bcrypt.hash(user.password, 10) : null;
      
      // Prvo provjeri da li korisnik postoji
      const existingUser = await dbClient.query(
        'SELECT id FROM users WHERE email = $1',
        [user.email]
      );

      if (existingUser.rows.length > 0) {
        // Update postojećeg korisnika
        console.log(`🔄 Updating existing user: ${user.email}`);
        await dbClient.query(`
          UPDATE users SET 
            username = $1,
            password_hash = $2,
            first_name = $3,
            last_name = $4,
            full_name = $5,
            phone_mobile = $6,
            company = $7,
            department = $8,
            role = $9,
            auth_method = $10,
            status = $11,
            email_verified = $12,
            can_export = $13,
            can_manage_clients = $14,
            can_view_reports = $15,
            updated_at = CURRENT_TIMESTAMP
          WHERE email = $16
        `, [
          user.username, passwordHash, user.firstName, user.lastName, user.fullName,
          user.phoneMobile, user.company, user.department, user.role,
          user.authMethod, user.status, user.emailVerified,
          user.canExport, user.canManageClients, user.canViewReports,
          user.email
        ]);
      } else {
        // Insert novog korisnika - password_hash može biti NULL
        console.log(`➕ Inserting new user: ${user.email}`);
        await dbClient.query(`
          INSERT INTO users (
            username, email, password_hash, first_name, last_name, full_name,
            phone_mobile, company, department, role, auth_method, 
            status, email_verified, can_export, can_manage_clients, can_view_reports,
            created_by
          ) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 1)
        `, [
          user.username, user.email, passwordHash, user.firstName, user.lastName, user.fullName,
          user.phoneMobile, user.company, user.department, user.role, user.authMethod,
          user.status, user.emailVerified, user.canExport, user.canManageClients, user.canViewReports
        ]);
      }
    }

    console.log('✅ Demo users inserted/updated');

    // ⭐⭐⭐ KREIRAJ VERIFICATION TOKEN ZA EMAIL-ONLY KORISNIKE ⭐⭐⭐
    console.log('🔐 Creating verification tokens for email-only users...');
    
    const emailOnlyUsers = demoUsers.filter(user => user.authMethod === 'email_only');
    
    for (const user of emailOnlyUsers) {
      // Dohvati user ID
      const userResult = await dbClient.query('SELECT id FROM users WHERE email = $1', [user.email]);
      
      if (userResult.rows.length > 0) {
        const userId = userResult.rows[0].id;
        
        // Generiraj verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 sata
        
        // Spremi token
        await dbClient.query(`
          INSERT INTO verification_tokens (user_id, token, token_type, expires_at)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (token) DO NOTHING
        `, [userId, verificationToken, 'account_activation', expiresAt]);
        
        console.log(`   ✅ Token created for ${user.email}`);
      }
    }

    // Ubacivanje rola
    console.log('🎭 Inserting roles...');
    
    await dbClient.query(`
      INSERT INTO roles (name, description, level) VALUES
      ('admin', 'Administrator sustava', 100),
      ('manager', 'Manager tima', 50),
      ('user', 'Obični korisnik', 10)
      ON CONFLICT (name) DO UPDATE SET
        description = EXCLUDED.description,
        level = EXCLUDED.level
    `);

    // Ubacivanje dozvola
    console.log('🔐 Inserting permissions...');
    
    await dbClient.query(`
      INSERT INTO permissions (code, name, description, category) VALUES
      ('user.create', 'Kreiranje korisnika', 'Može kreirati nove korisnike', 'users'),
      ('user.read', 'Čitanje korisnika', 'Može vidjeti podatke korisnika', 'users'),
      ('user.update', 'Ažuriranje korisnika', 'Može ažurirati podatke korisnika', 'users'),
      ('user.delete', 'Brisanje korisnika', 'Može brisati korisnike', 'users'),
      ('client.create', 'Kreiranje klijenata', 'Može kreirati nove klijente', 'clients'),
      ('client.read', 'Čitanje klijenata', 'Može vidjeti podatke klijenata', 'clients'),
      ('client.update', 'Ažuriranje klijenata', 'Može ažurirati podatke klijenata', 'clients'),
      ('client.delete', 'Brisanje klijenata', 'Može brisati klijente', 'clients'),
      ('note.create', 'Kreiranje bilješki', 'Može kreirati nove bilješke', 'notes'),
      ('note.read', 'Čitanje bilješki', 'Može vidjeti bilješke', 'notes'),
      ('note.update', 'Ažuriranje bilješki', 'Može ažurirati bilješke', 'notes'),
      ('note.delete', 'Brisanje bilješki', 'Može brisati bilješke', 'notes'),
      ('system.settings', 'Postavke sustava', 'Može mijenjati postavke sustava', 'system'),
      ('reports.view', 'Pregled izvještaja', 'Može vidjeti sve izvještaje', 'reports')
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        category = EXCLUDED.category
    `);

    // Dodjela dozvola rolama
    console.log('📋 Assigning permissions to roles...');
    
    // Admin dobiva sve dozvole
    await dbClient.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r, permissions p 
      WHERE r.name = 'admin'
      ON CONFLICT (role_id, permission_id) DO NOTHING
    `);

    // Manager dobiva clients, notes, reports dozvole
    await dbClient.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r, permissions p 
      WHERE r.name = 'manager' AND p.category IN ('clients', 'notes', 'reports')
      ON CONFLICT (role_id, permission_id) DO NOTHING
    `);

    // User dobiva osnovne dozvole
    await dbClient.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r, permissions p 
      WHERE r.name = 'user' AND p.code IN ('client.read', 'note.read', 'note.create')
      ON CONFLICT (role_id, permission_id) DO NOTHING
    `);

    // Dodjela rola korisnicima
    console.log('👤 Assigning roles to users...');
    
    const roleAssignments = [
      { username: 'admin', roleName: 'admin' },
      { username: 'ivan.horvat', roleName: 'user' },
      { username: 'ana.kovac', roleName: 'manager' },
      { username: 'marko.petrov', roleName: 'user' },
      { username: 'maja.juric', roleName: 'user' },
      { username: 'petar.kovac', roleName: 'user' },
      { username: 'demo.emailonly', roleName: 'user' },
      { username: 'test.manager', roleName: 'manager' }
    ];

    for (const assignment of roleAssignments) {
      await dbClient.query(`
        INSERT INTO user_roles (user_id, role_id, assigned_by)
        SELECT u.id, r.id, 1 
        FROM users u, roles r 
        WHERE u.username = $1 AND r.name = $2
        ON CONFLICT (user_id, role_id) DO NOTHING
      `, [assignment.username, assignment.roleName]);
    }

    // Ubacivanje demo klijenata (ako ne postoje)
    console.log('🏢 Checking/inserting demo clients...');
    
    const demoClients = [
      {
        name: 'Tech Solutions d.o.o.',
        email: 'info@techsolutions.hr',
        company: 'Tech Solutions',
        phone: '+385 1 2345 678',
        address: 'Ilica 123, 10000 Zagreb',
        createdBy: 1
      },
      {
        name: 'Web Studio Pro',
        email: 'contact@webstudiopro.hr',
        company: 'Web Studio Pro',
        phone: '+385 1 3456 789',
        address: 'Vlaška 45, 10000 Zagreb',
        createdBy: 2
      },
      {
        name: 'Digital Agency',
        email: 'hello@digitalagency.hr',
        company: 'Digital Agency',
        phone: '+385 1 4567 890',
        address: 'Trg bana Jelačića 15, 10000 Zagreb',
        createdBy: 1
      },
      {
        name: 'IT Consulting',
        email: 'office@itconsulting.hr',
        company: 'IT Consulting',
        phone: '+385 1 5678 901',
        address: 'Heinzelova 25, 10000 Zagreb',
        createdBy: 3
      },
      {
        name: 'Software House',
        email: 'info@softwarehouse.hr',
        company: 'Software House',
        phone: '+385 1 6789 012',
        address: 'Vukovarska 178, 10000 Zagreb',
        createdBy: 2
      }
    ];

    for (const clientData of demoClients) {
      await dbClient.query(`
        INSERT INTO clients (name, email, company, phone, address, created_by) 
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (email) DO UPDATE SET
          name = EXCLUDED.name,
          company = EXCLUDED.company,
          phone = EXCLUDED.phone,
          address = EXCLUDED.address,
          updated_at = CURRENT_TIMESTAMP
      `, [clientData.name, clientData.email, clientData.company, clientData.phone, clientData.address, clientData.createdBy]);
    }

    console.log('✅ Demo clients inserted/updated');

    // Dodjela klijenata korisnicima
    console.log('🔗 Assigning clients to users...');
    
    const clientAssignments = [
      { username: 'ivan.horvat', clientEmail: 'info@techsolutions.hr', isPrimary: true },
      { username: 'ivan.horvat', clientEmail: 'contact@webstudiopro.hr', isPrimary: false },
      { username: 'ana.kovac', clientEmail: 'hello@digitalagency.hr', isPrimary: true },
      { username: 'marko.petrov', clientEmail: 'office@itconsulting.hr', isPrimary: true },
      { username: 'ana.kovac', clientEmail: 'info@softwarehouse.hr', isPrimary: false }
    ];

    for (const assignment of clientAssignments) {
      await dbClient.query(`
        INSERT INTO user_clients (user_id, client_id, assigned_by, is_primary)
        SELECT u.id, c.id, 1, $3
        FROM users u, clients c 
        WHERE u.username = $1 AND c.email = $2
        ON CONFLICT (user_id, client_id) DO UPDATE SET
          is_primary = EXCLUDED.is_primary,
          assigned_at = CURRENT_TIMESTAMP
      `, [assignment.username, assignment.clientEmail, assignment.isPrimary]);
    }

    // Dnevnik aktivnosti
    console.log('📊 Inserting demo activity logs...');
    
    await dbClient.query(`
      INSERT INTO user_activity_log (user_id, action, resource_type, resource_id, details) VALUES
      (1, 'user.created', 'user', 2, '{"username": "ivan.horvat", "email": "ivan.horvat@primjer.hr"}'),
      (2, 'client.updated', 'client', 1, '{"changes": ["phone", "address"]}'),
      (3, 'note.created', 'note', 3, '{"client_id": 2, "content_preview": "Klijent zadovoljan..."}')
      ON CONFLICT DO NOTHING
    `);

    // Povijest prijava
    console.log('🔐 Inserting demo login history...');
    
    await dbClient.query(`
      INSERT INTO user_login_history (user_id, ip_address, user_agent, success) VALUES
      (1, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', TRUE),
      (2, '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', TRUE),
      (3, '192.168.1.102', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36', TRUE)
      ON CONFLICT DO NOTHING
    `);

    // ⭐⭐⭐ KREIRANJE INDEKSA - AŽURIRANO ZA EMAIL-ONLY AUTH ⭐⭐⭐
    console.log('📊 Creating indexes...');
    
    // Novi indeksi za email-only auth
    await dbClient.query('CREATE INDEX IF NOT EXISTS idx_users_auth_method ON users(auth_method)');
    await dbClient.query('CREATE INDEX IF NOT EXISTS idx_verification_tokens_token ON verification_tokens(token)');
    await dbClient.query('CREATE INDEX IF NOT EXISTS idx_verification_tokens_user_id ON verification_tokens(user_id)');
    await dbClient.query('CREATE INDEX IF NOT EXISTS idx_verification_tokens_expires_at ON verification_tokens(expires_at)');
    
    // Ostali indeksi
    await dbClient.query('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
    await dbClient.query('CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)');
    await dbClient.query('CREATE INDEX IF NOT EXISTS idx_users_department ON users(department)');
    await dbClient.query('CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(created_by)');
    await dbClient.query('CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id)');
    await dbClient.query('CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id)');
    await dbClient.query('CREATE INDEX IF NOT EXISTS idx_user_clients_user_id ON user_clients(user_id)');
    await dbClient.query('CREATE INDEX IF NOT EXISTS idx_user_clients_client_id ON user_clients(client_id)');
    await dbClient.query('CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity_log(user_id)');
    await dbClient.query('CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity_log(created_at)');
    await dbClient.query('CREATE INDEX IF NOT EXISTS idx_user_login_user_id ON user_login_history(user_id)');
    await dbClient.query('CREATE INDEX IF NOT EXISTS idx_user_login_login_at ON user_login_history(login_at)');

    console.log('✅ All indexes created');

    // ⭐⭐⭐ PROVJERA PODATAKA - AŽURIRANO ZA EMAIL-ONLY AUTH ⭐⭐⭐
    console.log('\n📈 Database Statistics:');
    
    const tables = [
      'users', 'clients', 'notes', 'activities', 
      'roles', 'permissions', 'user_roles', 'user_clients',
      'user_activity_log', 'user_login_history', 'verification_tokens'
    ];

    for (const table of tables) {
      const result = await dbClient.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`   ${table}: ${result.rows[0].count}`);
    }

    // Detaljnija statistika korisnika
    const userStats = await dbClient.query(`
      SELECT 
        role,
        status,
        auth_method,
        COUNT(*) as count,
        SUM(CASE WHEN email_verified = true THEN 1 ELSE 0 END) as verified
      FROM users 
      GROUP BY role, status, auth_method
      ORDER BY role, status
    `);

    console.log('\n👥 User Statistics:');
    for (const stat of userStats.rows) {
      console.log(`   ${stat.role}.${stat.status} (${stat.auth_method}): ${stat.count} users (${stat.verified} verified)`);
    }

    // Pregled dozvola
    const permissionStats = await dbClient.query(`
      SELECT 
        r.name as role,
        COUNT(rp.permission_id) as permission_count
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      GROUP BY r.id, r.name
      ORDER BY r.name
    `);

    console.log('\n🔐 Role Permissions:');
    for (const stat of permissionStats.rows) {
      console.log(`   ${stat.role}: ${stat.permission_count} permissions`);
    }

    // Dodjela klijenata
    const clientStats = await dbClient.query(`
      SELECT 
        u.username,
        u.auth_method,
        COUNT(uc.client_id) as client_count
      FROM users u
      LEFT JOIN user_clients uc ON u.id = uc.user_id
      GROUP BY u.id, u.username, u.auth_method
      ORDER BY client_count DESC
    `);

    console.log('\n🏢 Client Assignments:');
    for (const stat of clientStats.rows) {
      console.log(`   ${stat.username} (${stat.auth_method}): ${stat.client_count} clients`);
    }

    console.log('\n🎉 Database migration completed successfully!');
    console.log('\n🔐 Demo login credentials:');
    console.log('   admin@crm.com / password123 (admin) - email_password - verified');
    console.log('   ivan.horvat@primjer.hr / password123 (user) - email_password - verified');
    console.log('   ana.kovac@primjer.hr / password123 (manager) - email_password - verified');
    console.log('   marko.petrov@primjer.hr / password123 (user) - email_password - verified');
    console.log('   maja.juric@primjer.hr (email-only) - pending verification');
    console.log('   petar.kovac@primjer.hr (email-only) - pending verification');
    console.log('   demo.emailonly@primjer.hr (email-only) - pending verification');
    console.log('   test.manager@primjer.hr (email-only) - pending verification');
    console.log('\n📧 Email-only users have verification tokens ready for activation');
    console.log('📧 Check verification_tokens table for activation links');

  } catch (error) {
    console.error('💥 Error during database migration:', error);
    throw error;
  } finally {
    if (dbClient) {
      dbClient.release();
    }
    await pool.end();
  }
}

// Pokretanje migracije
initializeDatabase().catch(error => {
  console.error('💥 Failed to migrate database:', error);
  process.exit(1);
});