// database/init.js - AŽURIRANO ZA HYBRID 3-LEVEL SYSTEM I PASSWORD CHANGE FEATURE
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
    console.log('🚀 Pokretanje inicijalizacije baze podataka s HYBRID 3-LEVEL sistemom...');
    console.log('🔐 NOVO: Password change funkcionalnost aktivirana');
    console.log('📊 Baza podataka:', process.env.DATABASE_URL || 'postgresql://crm_user:crm_password@localhost:5433/crm_demo');
    
    dbClient = await pool.connect();
    console.log('✅ Povezano s bazom podataka');

    // ⭐⭐⭐ PRVO UKLONI NOT NULL OGRANIČENJE ZA password_hash ⭐⭐⭐
    console.log('🔧 Mijenjanje ograničenja tablice users...');

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
      console.log('📝 Uklanjanje NOT NULL ograničenja s password_hash...');
      await dbClient.query(`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`);
      console.log('✅ NOT NULL ograničenje uklonjeno s password_hash');
    } else {
      console.log('✅ password_hash već dopušta NULL vrijednosti');
    }

    // ⭐⭐⭐ DODAJ VERIFICATION_TOKEN KOLONU AKO NE POSTOJI ⭐⭐⭐
    console.log('🔍 Provjera kolone verification_token...');
    
    const verificationTokenExists = await dbClient.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'verification_token'
    `);

    if (verificationTokenExists.rows.length === 0) {
      console.log('➕ Dodavanje kolone verification_token u users tablicu...');
      await dbClient.query(`ALTER TABLE users ADD COLUMN verification_token VARCHAR(255)`);
      console.log('✅ Kolona verification_token dodana');
    }

    // 🔴 NOVO: DODAJ KOLONE ZA PASSWORD CHANGE FUNCTIONALITY
    console.log('🔐 Dodavanje kolona za password change funkcionalnost...');
    
    const passwordChangeColumns = [
      { name: 'requires_password_change', type: 'BOOLEAN DEFAULT FALSE' },
      { name: 'password_changed_at', type: 'TIMESTAMP' }
    ];

    for (const column of passwordChangeColumns) {
      const columnExists = await dbClient.query(`
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = $1
      `, [column.name]);

      if (columnExists.rows.length === 0) {
        console.log(`   ➕ Dodavanje kolone u users: ${column.name}`);
        try {
          await dbClient.query(`ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`);
        } catch (error) {
          console.log(`   ⚠️  Greška pri dodavanju ${column.name}: ${error.message}`);
        }
      } else {
        console.log(`   ✅ ${column.name} kolona već postoji`);
      }
    }

    // ⭐⭐⭐ DODAJ NOVE KOLONE ZA HYBRID 3-LEVEL SISTEM ⭐⭐⭐
    console.log('🔧 Dodavanje novih kolona za HYBRID 3-LEVEL sistem...');

    // Dodaj kolone koje nedostaju u users tablici (usklađeno s SQL shemom)
    const userColumnsToAdd = [
      { name: 'full_name', type: 'VARCHAR(100) NOT NULL DEFAULT \'\'' },
      { name: 'phone_mobile', type: 'VARCHAR(20)' },
      { name: 'phone_office', type: 'VARCHAR(20)' },
      { name: 'company', type: 'VARCHAR(100)' },
      { name: 'address', type: 'TEXT' },
      { name: 'department', type: 'VARCHAR(50)' },
      { name: 'auth_method', type: 'VARCHAR(20) DEFAULT \'email_only\'' },
      { name: 'status', type: 'VARCHAR(30) DEFAULT \'pending_verification\'' },
      { name: 'verified_at', type: 'TIMESTAMP' },
      { name: 'can_export', type: 'BOOLEAN DEFAULT FALSE' },
      { name: 'can_manage_clients', type: 'BOOLEAN DEFAULT TRUE' },
      { name: 'can_view_reports', type: 'BOOLEAN DEFAULT TRUE' },
      { name: 'created_by', type: 'INTEGER REFERENCES users(id) ON DELETE SET NULL' },
      { name: 'last_login_at', type: 'TIMESTAMP' },
      { name: 'login_count', type: 'INTEGER DEFAULT 0' },
      { name: 'timezone', type: 'VARCHAR(50) DEFAULT \'Europe/Zagreb\'' },
      { name: 'language', type: 'VARCHAR(10) DEFAULT \'hr\'' },
      { name: 'notes', type: 'TEXT' }
    ];

    for (const column of userColumnsToAdd) {
      const columnExists = await dbClient.query(`
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = $1
      `, [column.name]);

      if (columnExists.rows.length === 0) {
        console.log(`   ➕ Dodavanje kolone u users: ${column.name}`);
        try {
          await dbClient.query(`ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`);
        } catch (error) {
          console.log(`   ⚠️  Greška pri dodavanju ${column.name}: ${error.message}`);
        }
      }
    }

    console.log('✅ Users tablica ažurirana');

    // ⭐⭐⭐ KREIRAJ TABLICU VERIFIKACIJSKIH TOKENA AKO NE POSTOJI ⭐⭐⭐
    console.log('🔐 Kreiranje verification_tokens tablice...');
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS verification_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        token_type VARCHAR(50) NOT NULL CHECK (token_type IN ('account_activation', 'password_reset', 'email_change', 'email_verification')),
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ⭐⭐⭐ KREIRAJ HYBRID 3-LEVEL SISTEM TABLICE ⭐⭐⭐
    console.log('🎯 Kreiranje HYBRID 3-LEVEL sistema tablica...');

    const hybridTablesToCreate = [
      {
        name: 'teams',
        sql: `
          CREATE TABLE IF NOT EXISTS teams (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) UNIQUE NOT NULL,
            description TEXT,
            manager_id INTEGER REFERENCES users(id),
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'team_members',
        sql: `
          CREATE TABLE IF NOT EXISTS team_members (
            id SERIAL PRIMARY KEY,
            team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            role VARCHAR(50) DEFAULT 'member',
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            added_by INTEGER REFERENCES users(id),
            UNIQUE(team_id, user_id)
          )
        `
      }
    ];

    for (const table of hybridTablesToCreate) {
      const tableExists = await dbClient.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = '${table.name}'
        )
      `);

      if (!tableExists.rows[0].exists) {
        console.log(`   🆕 Kreiranje tablice: ${table.name}`);
        await dbClient.query(table.sql);
      }
      console.log(`   ✅ ${table.name} tablica kreirana/provjerena`);
    }

    // ⭐⭐⭐ KREIRAJ OSTALE TABLICE AKO NE POSTOJE ⭐⭐⭐
    console.log('📋 Kreiranje ostalih tablica ako ne postoje...');

    const tablesToCreate = [
      {
        name: 'roles',
        sql: `
          CREATE TABLE IF NOT EXISTS roles (
            id SERIAL PRIMARY KEY,
            name VARCHAR(50) UNIQUE NOT NULL,
            description TEXT,
            level INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'permissions',
        sql: `
          CREATE TABLE IF NOT EXISTS permissions (
            id SERIAL PRIMARY KEY,
            code VARCHAR(100) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            category VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'role_permissions',
        sql: `
          CREATE TABLE IF NOT EXISTS role_permissions (
            id SERIAL PRIMARY KEY,
            role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
            permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(role_id, permission_id)
          )
        `
      },
      {
        name: 'user_roles',
        sql: `
          CREATE TABLE IF NOT EXISTS user_roles (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
            assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, role_id)
          )
        `
      },
      {
        name: 'clients',
        sql: `
          CREATE TABLE IF NOT EXISTS clients (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            company VARCHAR(100),
            phone VARCHAR(20),
            address TEXT,
            is_global BOOLEAN DEFAULT FALSE,
            team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
            created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'user_clients',
        sql: `
          CREATE TABLE IF NOT EXISTS user_clients (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
            assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_primary BOOLEAN DEFAULT FALSE,
            UNIQUE(user_id, client_id)
          )
        `
      },
      {
        name: 'notes',
        sql: `
          CREATE TABLE IF NOT EXISTS notes (
            id SERIAL PRIMARY KEY,
            client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL DEFAULT '',
            content TEXT NOT NULL,
            note_type VARCHAR(50) DEFAULT 'general',
            created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'activities',
        sql: `
          CREATE TABLE IF NOT EXISTS activities (
            id SERIAL PRIMARY KEY,
            client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
            type VARCHAR(20) NOT NULL CHECK (type IN ('call', 'email', 'meeting', 'note', 'other')),
            description TEXT NOT NULL,
            activity_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'user_activity_log',
        sql: `
          CREATE TABLE IF NOT EXISTS user_activity_log (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            activity_type VARCHAR(100) NOT NULL,
            description TEXT,
            ip_address INET,
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'user_login_history',
        sql: `
          CREATE TABLE IF NOT EXISTS user_login_history (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ip_address VARCHAR(45),
            user_agent TEXT,
            success BOOLEAN DEFAULT TRUE,
            failure_reason TEXT
          )
        `
      }
    ];

    for (const table of tablesToCreate) {
      const tableExists = await dbClient.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = '${table.name}'
        )
      `);

      if (!tableExists.rows[0].exists) {
        console.log(`   🆕 Kreiranje tablice: ${table.name}`);
        await dbClient.query(table.sql);
      }
      console.log(`   ✅ ${table.name} tablica kreirana/provjerena`);
    }

    // ⭐⭐⭐ DODAJ HYBRID KOLONE U CLIENTS TABLICU AKO NE POSTOJE ⭐⭐⭐
    console.log('🔧 Dodavanje HYBRID kolona u clients tablicu...');
    
    const clientHybridColumns = [
      { name: 'is_global', type: 'BOOLEAN DEFAULT FALSE' },
      { name: 'team_id', type: 'INTEGER REFERENCES teams(id) ON DELETE SET NULL' },
      { name: 'created_by', type: 'INTEGER REFERENCES users(id) ON DELETE SET NULL' }
    ];

    for (const column of clientHybridColumns) {
      const columnExists = await dbClient.query(`
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = $1
      `, [column.name]);

      if (columnExists.rows.length === 0) {
        console.log(`   ➕ Dodavanje kolone u clients: ${column.name}`);
        try {
          await dbClient.query(`ALTER TABLE clients ADD COLUMN ${column.name} ${column.type}`);
        } catch (error) {
          console.log(`   ⚠️  Greška pri dodavanju ${column.name}: ${error.message}`);
        }
      }
    }

    // ⭐⭐⭐ DODAJ VALIDACIJSKA OGRANIČENJA ⭐⭐⭐
    console.log('🔒 Dodavanje validacijskih ograničenja...');

    const constraints = [
      {
        name: 'chk_users_status',
        sql: `ALTER TABLE users ADD CONSTRAINT chk_users_status CHECK (status IN ('pending_verification', 'active', 'inactive', 'suspended'))`
      },
      {
        name: 'chk_users_auth_method', 
        sql: `ALTER TABLE users ADD CONSTRAINT chk_users_auth_method CHECK (auth_method IN ('email_only', 'email_password', 'oauth'))`
      },
      {
        name: 'chk_users_role',
        sql: `ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (role IN ('admin', 'manager', 'user'))`
      }
    ];

    for (const constraint of constraints) {
      try {
        await dbClient.query(constraint.sql);
        console.log(`   ✅ ${constraint.name} ograničenje dodano`);
      } catch (error) {
        if (error.code === '23514' || error.message.includes('already exists')) {
          console.log(`   ⚠️  ${constraint.name} ograničenje već postoji`);
        } else {
          console.log(`   ⚠️  Ne mogu dodati ${constraint.name}: ${error.message}`);
        }
      }
    }

    // ⭐⭐⭐ PROVJERI POSTOJEĆE PODATKE PRIJE UMEĆANJA ⭐⭐⭐
    console.log('🔍 Provjera postojećih podataka...');

    const existingUsersCount = await dbClient.query('SELECT COUNT(*) FROM users');
    const existingClientsCount = await dbClient.query('SELECT COUNT(*) FROM clients');
    const existingRolesCount = await dbClient.query('SELECT COUNT(*) FROM roles');

    console.log(`   Postojeći korisnici: ${existingUsersCount.rows[0].count}`);
    console.log(`   Postojeći klijenti: ${existingClientsCount.rows[0].count}`);
    console.log(`   Postojeće uloge: ${existingRolesCount.rows[0].count}`);

    const shouldInsertDemoData = existingUsersCount.rows[0].count <= 1;

    if (shouldInsertDemoData) {
      // ⭐⭐⭐ UMEĆI DEMO PODATKE SAMO AKO JE BAZA PRAZNA ⭐⭐⭐
      console.log('👥 Umećem demo korisnike s proširenim podacima...');
      
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
          requiresPasswordChange: false, // 🔴 NOVO: Admin ne treba promjenu lozinke
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
          requiresPasswordChange: false, // 🔴 NOVO: Već postojeći korisnici ne trebaju promjenu
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
          requiresPasswordChange: false, // 🔴 NOVO: Već postojeći korisnici ne trebaju promjenu
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
          requiresPasswordChange: false, // 🔴 NOVO: Već postojeći korisnici ne trebaju promjenu
          canExport: false,
          canManageClients: true,
          canViewReports: true
        },
        // 🔴 NOVO: Korisnici koji TREBAJU promijeniti lozinku (email-only korisnici)
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
          requiresPasswordChange: true, // 🔴 KLJUČNO: Ovi korisnici trebaju promijeniti lozinku
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
          requiresPasswordChange: true, // 🔴 KLJUČNO: Ovi korisnici trebaju promijeniti lozinku
          canExport: false,
          canManageClients: true,
          canViewReports: true
        },
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
          requiresPasswordChange: true, // 🔴 KLJUČNO: Ovi korisnici trebaju promijeniti lozinku
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
          requiresPasswordChange: true, // 🔴 KLJUČNO: Ovi korisnici trebaju promijeniti lozinku
          canExport: true,
          canManageClients: true,
          canViewReports: true
        }
      ];

      for (const user of demoUsers) {
        const passwordHash = user.password ? await bcrypt.hash(user.password, 10) : null;
        
        const existingUser = await dbClient.query(
          'SELECT id FROM users WHERE email = $1',
          [user.email]
        );

        if (existingUser.rows.length === 0) {
          console.log(`➕ Umećem novog korisnika: ${user.email} ${user.requiresPasswordChange ? '(TREBA PROMJENU LOZINKE)' : ''}`);
          
          try {
            await dbClient.query(`
              INSERT INTO users (
                username, email, password_hash, first_name, last_name, full_name,
                phone_mobile, company, department, role, auth_method, 
                status, email_verified, requires_password_change, password_changed_at,
                can_export, can_manage_clients, can_view_reports,
                created_by, created_at
              ) 
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, CURRENT_TIMESTAMP)
            `, [
              user.username, user.email, passwordHash, user.firstName, user.lastName, user.fullName,
              user.phoneMobile, user.company, user.department, user.role, user.authMethod,
              user.status, user.emailVerified, user.requiresPasswordChange, 
              user.password ? 'NOW()' : null, // 🔴 Ako ima lozinku, postavi password_changed_at
              user.canExport, user.canManageClients, user.canViewReports,
              1
            ]);
          } catch (error) {
            console.log(`   ⚠️  Greška pri umetanju korisnika ${user.email}: ${error.message}`);
          }
        } else {
          console.log(`⏭️  Preskačem postojećeg korisnika: ${user.email}`);
        }
      }

      console.log('✅ Demo korisnici umetnuti');

      // ⭐⭐⭐ KREIRAJ VERIFIKACIJSKI TOKEN ZA EMAIL-ONLY KORISNIKE ⭐⭐⭐
      console.log('🔐 Kreiranje verifikacijskih tokena za email-only korisnike...');
      
      const emailOnlyUsers = demoUsers.filter(user => user.authMethod === 'email_only');
      
      for (const user of emailOnlyUsers) {
        const userResult = await dbClient.query('SELECT id FROM users WHERE email = $1', [user.email]);
        
        if (userResult.rows.length > 0) {
          const userId = userResult.rows[0].id;
          
          // Također spremi token u verification_token kolonu korisnika
          const verificationToken = crypto.randomBytes(32).toString('hex');
          
          // Ažuriraj users tablicu
          await dbClient.query(
            'UPDATE users SET verification_token = $1 WHERE id = $2',
            [verificationToken, userId]
          );
          
          // Stvori zapis u verification_tokens tablici
          const existingToken = await dbClient.query(
            'SELECT id FROM verification_tokens WHERE user_id = $1 AND token_type = $2',
            [userId, 'account_activation']
          );

          if (existingToken.rows.length === 0) {
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
            
            await dbClient.query(`
              INSERT INTO verification_tokens (user_id, token, token_type, expires_at)
              VALUES ($1, $2, $3, $4)
            `, [userId, verificationToken, 'account_activation', expiresAt]);
            
            console.log(`   ✅ Token kreiran za ${user.email}`);
          } else {
            console.log(`   ⏭️  Token već postoji za ${user.email}`);
          }
        }
      }

      // ⭐⭐⭐ UMEĆI HYBRID 3-LEVEL DEMO PODATKE ⭐⭐⭐
      console.log('🎯 Umećem HYBRID 3-LEVEL demo podatke...');
      
      // Umeći demo timove
      console.log('👥 Umećem demo timove...');
      await dbClient.query(`
        INSERT INTO teams (name, description, manager_id, created_by) VALUES
        ('Sales Team', 'Prodaja i razvoj poslovanja', 2, 1),
        ('Marketing Team', 'Marketing i promocije', 3, 1),
        ('Development Team', 'Razvoj softvera', 4, 1)
        ON CONFLICT (name) DO NOTHING
      `);

      // Dodaj korisnike u timove
      console.log('🤝 Dodajem korisnike u timove...');
      const teamMemberships = [
        { teamName: 'Sales Team', username: 'ivan.horvat', role: 'leader' },
        { teamName: 'Sales Team', username: 'demo.emailonly', role: 'member' },
        { teamName: 'Marketing Team', username: 'ana.kovac', role: 'leader' },
        { teamName: 'Development Team', username: 'marko.petrov', role: 'leader' },
        { teamName: 'Development Team', username: 'petar.kovac', role: 'member' }
      ];

      for (const membership of teamMemberships) {
        await dbClient.query(`
          INSERT INTO team_members (team_id, user_id, role, added_by)
          SELECT t.id, u.id, $3, 1
          FROM teams t, users u
          WHERE t.name = $1 AND u.username = $2
          ON CONFLICT (team_id, user_id) DO NOTHING
        `, [membership.teamName, membership.username, membership.role]);
      }

      // Umeći uloge samo ako ne postoje
      console.log('🎭 Umećem uloge...');
      await dbClient.query(`
        INSERT INTO roles (name, description, level) VALUES
        ('admin', 'Administrator sustava', 100),
        ('manager', 'Manager tima', 50),
        ('user', 'Obični korisnik', 10)
        ON CONFLICT (name) DO NOTHING
      `);

      // Umeći dozvole samo ako ne postoje
      console.log('🔐 Umećem dozvole...');
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
        ON CONFLICT (code) DO NOTHING
      `);

      // Dodjeli dozvole ulogama samo ako ne postoje
      console.log('📋 Dodjeljujem dozvole ulogama...');
      
      const rolesResult = await dbClient.query('SELECT id, name FROM roles');
      const permissionsResult = await dbClient.query('SELECT id, code FROM permissions');
      
      const rolesMap = {};
      const permissionsMap = {};
      
      rolesResult.rows.forEach(role => { rolesMap[role.name] = role.id; });
      permissionsResult.rows.forEach(perm => { permissionsMap[perm.code] = perm.id; });

      // Admin dobiva sve dozvole
      for (const permCode in permissionsMap) {
        await dbClient.query(`
          INSERT INTO role_permissions (role_id, permission_id)
          VALUES ($1, $2)
          ON CONFLICT (role_id, permission_id) DO NOTHING
        `, [rolesMap['admin'], permissionsMap[permCode]]);
      }

      // Manager dobiva dozvole za klijente, bilješke, izvještaje
      const managerPermissions = Object.keys(permissionsMap).filter(code => 
        ['client.create', 'client.read', 'client.update', 'client.delete', 
         'note.create', 'note.read', 'note.update', 'note.delete',
         'reports.view'].includes(code)
      );
      
      for (const permCode of managerPermissions) {
        await dbClient.query(`
          INSERT INTO role_permissions (role_id, permission_id)
          VALUES ($1, $2)
          ON CONFLICT (role_id, permission_id) DO NOTHING
        `, [rolesMap['manager'], permissionsMap[permCode]]);
      }

      // User dobiva osnovne dozvole
      const userPermissions = ['client.read', 'note.read', 'note.create'];
      for (const permCode of userPermissions) {
        if (permissionsMap[permCode]) {
          await dbClient.query(`
            INSERT INTO role_permissions (role_id, permission_id)
            VALUES ($1, $2)
            ON CONFLICT (role_id, permission_id) DO NOTHING
          `, [rolesMap['user'], permissionsMap[permCode]]);
        }
      }

      // Dodjeli uloge korisnicima samo ako ne postoje
      console.log('👤 Dodjeljujem uloge korisnicima...');
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

      // ⭐⭐⭐ UMEĆI HYBRID 3-LEVEL KLIJENTE ⭐⭐⭐
      console.log('🏢 Umećem HYBRID 3-LEVEL demo klijente...');
      
      // Dobavi ID-jeve timova za timske klijente
      const teamsResult = await dbClient.query('SELECT id, name FROM teams');
      const teamsMap = {};
      teamsResult.rows.forEach(team => { teamsMap[team.name] = team.id; });

      // Dobavi ID-jeve korisnika za privatne klijente
      const usersResult = await dbClient.query('SELECT id, username FROM users');
      const usersMap = {};
      usersResult.rows.forEach(user => { usersMap[user.username] = user.id; });

      const hybridClients = [
        // 🌍 Globalni klijenti (vide svi)
        {
          name: 'Tech Solutions d.o.o.',
          email: 'info@techsolutions.hr',
          company: 'Tech Solutions',
          phone: '+385 1 2345 678',
          address: 'Ilica 123, 10000 Zagreb',
          is_global: true,
          created_by: usersMap['admin']
        },
        {
          name: 'Software House',
          email: 'info@softwarehouse.hr',
          company: 'Software House',
          phone: '+385 1 6789 012',
          address: 'Vukovarska 178, 10000 Zagreb',
          is_global: true,
          created_by: usersMap['ivan.horvat']
        },
        // 👥 Timski klijenti (vide samo članovi tima)
        {
          name: 'Web Studio Pro',
          email: 'contact@webstudiopro.hr',
          company: 'Web Studio Pro',
          phone: '+385 1 3456 789',
          address: 'Vlaška 45, 10000 Zagreb',
          team_id: teamsMap['Sales Team'],
          created_by: usersMap['ivan.horvat']
        },
        {
          name: 'Digital Agency',
          email: 'hello@digitalagency.hr',
          company: 'Digital Agency',
          phone: '+385 1 4567 890',
          address: 'Trg bana Jelačića 15, 10000 Zagreb',
          team_id: teamsMap['Development Team'],
          created_by: usersMap['admin']
        },
        {
          name: 'Marketing Experts',
          email: 'info@marketingexperts.hr',
          company: 'Marketing Experts',
          phone: '+385 1 8901 234',
          address: 'Gundulićeva 12, 10000 Zagreb',
          team_id: teamsMap['Marketing Team'],
          created_by: usersMap['ana.kovac']
        },
        // 👤 Privatni klijenti (vide samo vlasnici)
        {
          name: 'IT Consulting',
          email: 'office@itconsulting.hr',
          company: 'IT Consulting',
          phone: '+385 1 5678 901',
          address: 'Heinzelova 25, 10000 Zagreb',
          created_by: usersMap['marko.petrov']
        },
        {
          name: 'Cloud Services',
          email: 'cloud@services.hr',
          company: 'Cloud Services',
          phone: '+385 1 7890 123',
          address: 'Jadranska 45, 10000 Zagreb',
          created_by: usersMap['ivan.horvat']
        },
        {
          name: 'Data Analytics',
          email: 'analytics@data.hr',
          company: 'Data Analytics',
          phone: '+385 1 9012 345',
          address: 'Savska 78, 10000 Zagreb',
          created_by: usersMap['admin']
        },
        {
          name: 'Design Studio',
          email: 'hello@designstudio.hr',
          company: 'Design Studio',
          phone: '+385 1 2345 901',
          address: 'Preradovićeva 34, 10000 Zagreb',
          created_by: usersMap['ana.kovac']
        }
      ];

      for (const clientData of hybridClients) {
        await dbClient.query(`
          INSERT INTO clients (name, email, company, phone, address, is_global, team_id, created_by) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (email) DO NOTHING
        `, [
          clientData.name, clientData.email, clientData.company, clientData.phone, 
          clientData.address, clientData.is_global || false, 
          clientData.team_id || null, clientData.created_by
        ]);
      }

      console.log('✅ Hybrid 3-level klijenti umetnuti');

      // Dodjeli klijente korisnicima (za backward compatibility)
      console.log('🔗 Dodjeljujem klijente korisnicima (backward compatibility)...');
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
          ON CONFLICT (user_id, client_id) DO NOTHING
        `, [assignment.username, assignment.clientEmail, assignment.isPrimary]);
      }

      // Umeći demo bilješke
      console.log('📝 Umećem demo bilješke...');
      await dbClient.query(`
        INSERT INTO notes (client_id, title, content, created_by)
        SELECT c.id, 'Sastanak o nadogradnji', 'Klijent zainteresiran za nadogradnju web stranice. Dogovoren sastanak sljedeći tjedan.', 1
        FROM clients c WHERE c.email = 'info@techsolutions.hr'
        ON CONFLICT DO NOTHING
      `);

      await dbClient.query(`
        INSERT INTO notes (client_id, title, content, created_by)
        SELECT c.id, 'Ponuda za redesign', 'Poslana ponuda za redesign web stranice. Čekamo povratnu informaciju.', 2
        FROM clients c WHERE c.email = 'info@techsolutions.hr'
        ON CONFLICT DO NOTHING
      `);

      // Umeći dnevnik aktivnosti
      console.log('📊 Umećem dnevnik aktivnosti...');
      await dbClient.query(`
        INSERT INTO user_activity_log (user_id, activity_type, description, ip_address, user_agent) VALUES
        (1, 'user.created', 'Kreiran novi korisnik: ivan.horvat', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
        (2, 'client.updated', 'Ažuriran klijent: Tech Solutions d.o.o.', '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'),
        (3, 'note.created', 'Dodana nova bilješka za klijenta: Digital Agency', '192.168.1.102', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36')
        ON CONFLICT DO NOTHING
      `);

      // Umeći povijest prijava
      console.log('🔐 Umećem povijest prijava...');
      await dbClient.query(`
        INSERT INTO user_login_history (user_id, ip_address, user_agent, success) VALUES
        (1, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', TRUE),
        (2, '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', TRUE),
        (3, '192.168.1.102', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36', TRUE)
        ON CONFLICT DO NOTHING
      `);

    } else {
      console.log('⏭️  Baza već sadrži podatke, ažuriram HYBRID 3-LEVEL strukturu...');
      
      // 🔴 NOVO: Ažuriraj postojeće korisnike s password change kolonama
      console.log('🔐 Ažuriram postojeće korisnike s password change kolonama...');
      
      // Postavi requires_password_change na false za postojeće korisnike
      await dbClient.query(`
        UPDATE users 
        SET requires_password_change = false,
            password_changed_at = COALESCE(password_changed_at, NOW())
        WHERE requires_password_change IS NULL
      `);
      
      // Postavi requires_password_change na true za email-only korisnike bez lozinke
      await dbClient.query(`
        UPDATE users 
        SET requires_password_change = true,
            password_changed_at = NULL
        WHERE auth_method = 'email_only' 
          AND password_hash IS NULL
          AND status = 'pending_verification'
      `);
      
      // ⭐⭐⭐ POPRAVI POSTOJEĆE PODATKE - DODAJ TIMOVE I AŽURIRAJ KLIJENTE ⭐⭐⭐
      console.log('🔧 Popravljam HYBRID 3-LEVEL strukturu podataka...');
      
      // 1. Kreiraj timove ako ne postoje
      const teamsToCreate = [
        { name: 'Sales Team', description: 'Prodaja i razvoj poslovanja', manager_id: 2 },
        { name: 'Marketing Team', description: 'Marketing i promocije', manager_id: 3 },
        { name: 'Development Team', description: 'Razvoj softvera', manager_id: 4 }
      ];
      
      for (const team of teamsToCreate) {
        const teamCheck = await dbClient.query('SELECT id FROM teams WHERE name = $1', [team.name]);
        
        if (teamCheck.rows.length === 0) {
          console.log(`   ➕ Kreiranje tima: ${team.name}`);
          await dbClient.query(
            'INSERT INTO teams (name, description, manager_id, created_by) VALUES ($1, $2, $3, $4)',
            [team.name, team.description, team.manager_id, 1]
          );
        }
      }
      
      // 2. Dodaj korisnike u timove
      console.log('🤝 Dodajem korisnike u timove...');
      const teamMemberships = [
        { teamName: 'Sales Team', username: 'ivan.horvat', role: 'leader' },
        { teamName: 'Sales Team', username: 'demo.emailonly', role: 'member' },
        { teamName: 'Marketing Team', username: 'ana.kovac', role: 'leader' },
        { teamName: 'Development Team', username: 'marko.petrov', role: 'leader' },
        { teamName: 'Development Team', username: 'petar.kovac', role: 'member' }
      ];
      
      for (const membership of teamMemberships) {
        await dbClient.query(`
          INSERT INTO team_members (team_id, user_id, role, added_by)
          SELECT t.id, u.id, $3, 1
          FROM teams t, users u
          WHERE t.name = $1 AND u.username = $2
          ON CONFLICT (team_id, user_id) DO NOTHING
        `, [membership.teamName, membership.username, membership.role]);
      }
      
      // 3. Ažuriraj klijente s HYBRID atributima
      console.log('🔄 Ažuriram klijente s HYBRID 3-LEVEL atributima...');
      
      // Prvo, dobavi ID-jeve timova
      const teamsResult = await dbClient.query('SELECT id, name FROM teams');
      const teamsMap = {};
      teamsResult.rows.forEach(team => { teamsMap[team.name] = team.id; });
      
      // Ažuriraj postojeće klijente prema tvojoj SQL shemi
      await dbClient.query(`
        -- Postavi globalne klijente
        UPDATE clients 
        SET is_global = true, team_id = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE email IN ('info@techsolutions.hr', 'info@softwarehouse.hr');
      `);
      
      await dbClient.query(`
        -- Postavi timske klijente
        UPDATE clients 
        SET is_global = false, team_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE email IN ('contact@webstudiopro.hr', 'info@marketingexperts.hr');
      `, [teamsMap['Sales Team']]);
      
      await dbClient.query(`
        UPDATE clients 
        SET is_global = false, team_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE email = 'hello@digitalagency.hr';
      `, [teamsMap['Development Team']]);
      
      // Privatni klijenti ostaju s is_global = false, team_id = NULL
      console.log('✅ HYBRID 3-LEVEL struktura podataka popravljena');
      
      // Ažuriraj postojeće klijente da imaju created_by (za backward compatibility)
      console.log('🔄 Ažuriram postojeće klijente s created_by...');
      await dbClient.query(`
        UPDATE clients c
        SET created_by = (
          SELECT MIN(u.id) 
          FROM users u 
          WHERE u.role = 'admin'
        )
        WHERE c.created_by IS NULL
      `);
    }

    // 🔴 NOVO: DODAJ INDEKSE ZA PASSWORD CHANGE FUNCTIONALITY
    console.log('📊 Kreiranje indeksa za password change funkcionalnost...');
    const passwordChangeIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_requires_password_change ON users(requires_password_change)',
      'CREATE INDEX IF NOT EXISTS idx_users_password_changed_at ON users(password_changed_at)'
    ];

    for (const index of passwordChangeIndexes) {
      try {
        await dbClient.query(index);
        console.log(`   ✅ Kreiran indeks: ${index.split(' ')[4]}`);
      } catch (error) {
        if (!error.message.includes('already exists')) {
          console.log(`   ⚠️  Greška pri kreiranju indeksa: ${error.message}`);
        }
      }
    }

    // ⭐⭐⭐ KREIRANJE INDEKSA ZA HYBRID SISTEM ⭐⭐⭐
    console.log('📊 Kreiranje indeksa za HYBRID 3-LEVEL sistem...');
    const indexes = [
      // Users indeksi
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_auth_method ON users(auth_method)',
      'CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)',
      'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
      'CREATE INDEX IF NOT EXISTS idx_users_department ON users(department)',
      'CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(created_by)',
      'CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token)',
      'CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified)',
      
      // HYBRID 3-LEVEL indeksi
      'CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(name)',
      'CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id)',
      'CREATE INDEX IF NOT EXISTS idx_clients_is_global ON clients(is_global)',
      'CREATE INDEX IF NOT EXISTS idx_clients_team_id ON clients(team_id)',
      'CREATE INDEX IF NOT EXISTS idx_clients_created_by ON clients(created_by)',
      
      // Verification tokens indeksi
      'CREATE INDEX IF NOT EXISTS idx_verification_tokens_token ON verification_tokens(token)',
      'CREATE INDEX IF NOT EXISTS idx_verification_tokens_user_id ON verification_tokens(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_verification_tokens_expires_at ON verification_tokens(expires_at)',
      
      // Other indeksi
      'CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_clients_user_id ON user_clients(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_clients_client_id ON user_clients(client_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity_log(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity_log(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_user_login_user_id ON user_login_history(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_login_login_at ON user_login_history(login_at)',
      'CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email)',
      'CREATE INDEX IF NOT EXISTS idx_notes_client_id ON notes(client_id)',
      'CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_activities_client_id ON activities(client_id)',
      'CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(activity_date)'
    ];

    for (const index of indexes) {
      try {
        await dbClient.query(index);
        console.log(`   ✅ Kreiran indeks: ${index.split(' ')[4]}`);
      } catch (error) {
        // Ignoriraj greške ako indeksi već postoje
        if (!error.message.includes('already exists')) {
          console.log(`   ⚠️  Greška pri kreiranju indeksa: ${error.message}`);
        }
      }
    }

    console.log('✅ Svi indeksi kreirani');

    // ⭐⭐⭐ VERIFIKACIJA PODATAKA ⭐⭐⭐
    console.log('\n📈 HYBRID 3-LEVEL Statistika sistema:');
    
    const tables = [
      'users', 'teams', 'team_members', 'clients', 'notes', 'activities', 
      'roles', 'permissions', 'user_roles', 'user_clients',
      'user_activity_log', 'user_login_history', 'verification_tokens'
    ];

    for (const table of tables) {
      try {
        const result = await dbClient.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`   ${table}: ${result.rows[0].count}`);
      } catch (error) {
        console.log(`   ${table}: Tablica ne postoji`);
      }
    }

    // 🔴 NOVO: PRIKAŽI PASSWORD CHANGE STATISTIKU
    console.log('\n🔐 PASSWORD CHANGE STATISTIKA:');
    try {
      const passwordStats = await dbClient.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN requires_password_change = true THEN 1 END) as need_password_change,
          COUNT(CASE WHEN requires_password_change = false THEN 1 END) as password_ok,
          COUNT(CASE WHEN password_hash IS NULL THEN 1 END) as no_password,
          COUNT(CASE WHEN password_hash IS NOT NULL THEN 1 END) as has_password
        FROM users
      `);
      
      if (passwordStats.rows.length > 0) {
        const stats = passwordStats.rows[0];
        console.log(`   👥 Ukupno korisnika: ${stats.total_users}`);
        console.log(`   🔴 Treba promjenu lozinke: ${stats.need_password_change}`);
        console.log(`   🟢 Lozinka u redu: ${stats.password_ok}`);
        console.log(`   ❌ Bez lozinke: ${stats.no_password}`);
        console.log(`   ✅ Sa lozinkom: ${stats.has_password}`);
      }
    } catch (error) {
      console.log(`   ⚠️  Ne mogu dohvatiti password statistiku: ${error.message}`);
    }

    // Prikaz distribucije klijenata po tipu
    console.log('\n🎯 Distribucija klijenata po tipu:');
    try {
      const clientTypes = await dbClient.query(`
        SELECT 
          CASE 
            WHEN is_global = true THEN '🌍 Globalni'
            WHEN team_id IS NOT NULL THEN '👥 Timski'
            ELSE '👤 Privatni'
          END as client_type,
          COUNT(*) as count
        FROM clients 
        GROUP BY is_global, team_id
        ORDER BY 
          CASE 
            WHEN is_global = true THEN 1
            WHEN team_id IS NOT NULL THEN 2
            ELSE 3
          END
      `);
      
      clientTypes.rows.forEach(row => {
        console.log(`   ${row.client_type}: ${row.count} klijenata`);
      });
    } catch (error) {
      console.log(`   ⚠️  Ne mogu dohvatiti distribuciju klijenata: ${error.message}`);
    }

    // Prikaz informacija o timovima
    console.log('\n👥 Informacije o timovima:');
    try {
      const teamInfo = await dbClient.query(`
        SELECT 
          t.name as team_name,
          COUNT(tm.user_id) as member_count,
          COUNT(c.id) as client_count
        FROM teams t
        LEFT JOIN team_members tm ON t.id = tm.team_id
        LEFT JOIN clients c ON t.id = c.team_id
        GROUP BY t.id, t.name
        ORDER BY t.name
      `);
      
      teamInfo.rows.forEach(row => {
        console.log(`   ${row.team_name}: ${row.member_count} članova, ${row.client_count} klijenata`);
      });
    } catch (error) {
      console.log(`   ⚠️  Ne mogu dohvatiti informacije o timovima: ${error.message}`);
    }

    // 🔴 NOVO: PRIKAŽI KORISNIKE KOJI TREBAJU PROMIJENITI LOZINKU
    console.log('\n🔴 KORISNICI KOJI TREBAJU PROMIJENITI LOZINKU:');
    try {
      const usersNeedPasswordChange = await dbClient.query(`
        SELECT username, email, role, auth_method, status
        FROM users 
        WHERE requires_password_change = true
        ORDER BY role, username
      `);
      
      if (usersNeedPasswordChange.rows.length > 0) {
        usersNeedPasswordChange.rows.forEach(user => {
          console.log(`   👤 ${user.username} (${user.email}) - ${user.role} - ${user.auth_method} - ${user.status}`);
        });
      } else {
        console.log('   ✅ Svi korisnici imaju postavljenu lozinku');
      }
    } catch (error) {
      console.log(`   ⚠️  Ne mogu dohvatiti korisnike: ${error.message}`);
    }

    console.log('\n🎉 HYBRID 3-LEVEL migracija baze podataka uspješno završena!');
    
    if (shouldInsertDemoData) {
      console.log('\n🔐 Pregled demo HYBRID 3-LEVEL sistema:');
      console.log('   🌍 2 Globalna klijenta (vide svi)');
      console.log('   👥 3 Timska klijenta (vide samo članovi tima)');
      console.log('   👤 4 Privatna klijenta (vide samo vlasnici)');
      console.log('   👥 3 Tima s dodijeljenim članovima');
      console.log('\n🔐 Demo pristupni podaci:');
      console.log('   admin@crm.com / password123 (admin)');
      console.log('   ivan.horvat@primjer.hr / password123 (voditelj Sales Tima)');
      console.log('   ana.kovac@primjer.hr / password123 (voditelj Marketing Tima)');
      console.log('   marko.petrov@primjer.hr / password123 (voditelj Development Tima)');
      console.log('\n🔴 KORISNICI KOJI TREBAJU PROMIJENITI LOZINKU:');
      console.log('   maja.juric@primjer.hr (email-only, čeka aktivaciju)');
      console.log('   petar.kovac@primjer.hr (email-only, čeka aktivaciju)');
      console.log('   demo.emailonly@primjer.hr (email-only, čeka aktivaciju)');
      console.log('   test.manager@primjer.hr (email-only, čeka aktivaciju)');
      console.log('\n💡 Testirajte PASSWORD CHANGE flow:');
      console.log('   1. Kliknite na aktivacijski link za demo.emailonly@primjer.hr');
      console.log('   2. Trebalo bi vas redirectati na /change-password');
      console.log('   3. Postavite novu lozinku');
      console.log('   4. Nakon toga možete se prijaviti');
      console.log('\n💡 Testirajte HYBRID 3-LEVEL sistem:');
      console.log('   1. Prijavite se kao ivan.horvat (trebao bi vidjeti 2 globalna + 2 timska + 2 privatna klijenta)');
      console.log('   2. Prijavite se kao ana.kovac (trebala bi vidjeti 2 globalna + 2 timska + 1 privatni klijent)');
      console.log('   3. Prijavite se kao demo.emailonly (trebao bi vidjeti 2 globalna + 1 timski + 0 privatnih klijenata)');
    }

  } catch (error) {
    console.error('💥 Greška tijekom migracije baze podataka:', error);
    throw error;
  } finally {
    if (dbClient) {
      dbClient.release();
    }
    await pool.end();
  }
}

// Pokreni migraciju
initializeDatabase().catch(error => {
  console.error('💥 Migracija baze podataka nije uspjela:', error);
  process.exit(1);
});