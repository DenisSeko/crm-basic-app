// database/init.js - AŽURIRANA ZA KONZISTENTNU STRUKTURU
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
      await dbClient.query(`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`);
      console.log('✅ NOT NULL constraint removed from password_hash');
    } else {
      console.log('✅ password_hash already allows NULL values');
    }

    // ⭐⭐⭐ DODAJ NOVE KOLONE U POSTOJEĆE TABELE ⭐⭐⭐
    console.log('🔧 Adding new columns to existing tables...');

    const columnsToAdd = [
      { name: 'full_name', type: 'VARCHAR(100)' },
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

    for (const column of columnsToAdd) {
      const columnExists = await dbClient.query(`
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = $1
      `, [column.name]);

      if (columnExists.rows.length === 0) {
        console.log(`   ➕ Adding column: ${column.name}`);
        await dbClient.query(`ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`);
      }
    }

    console.log('✅ Users table columns updated');

    // ⭐⭐⭐ KREIRAJ VERIFICATION TOKENS TABELU AKO NE POSTOJI ⭐⭐⭐
    console.log('🔐 Creating verification_tokens table...');
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

    // ⭐⭐⭐ KREIRAJ OSTALE TABELE AKO NE POSTOJE ⭐⭐⭐
    console.log('📋 Creating other tables if they don\'t exist...');

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
            content TEXT NOT NULL,
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
            resource_type VARCHAR(100),
            resource_id INTEGER,
            details JSONB,
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
      await dbClient.query(table.sql);
      console.log(`   ✅ ${table.name} table created/verified`);
    }

    // ⭐⭐⭐ DODAJ CONSTRAINT-E ZA VALIDACIJU ⭐⭐⭐
    console.log('🔒 Adding validation constraints...');

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
        console.log(`   ✅ ${constraint.name} constraint added`);
      } catch (error) {
        if (error.code === '23514' || error.message.includes('already exists')) {
          console.log(`   ⚠️  ${constraint.name} constraint already exists`);
        } else {
          console.log(`   ⚠️  Could not add ${constraint.name}: ${error.message}`);
        }
      }
    }

    // ⭐⭐⭐ PROVJERA POSTOJEĆIH PODATAKA PRIJE INSERTA ⭐⭐⭐
    console.log('🔍 Checking existing data...');

    const existingUsersCount = await dbClient.query('SELECT COUNT(*) FROM users');
    const existingClientsCount = await dbClient.query('SELECT COUNT(*) FROM clients');
    const existingRolesCount = await dbClient.query('SELECT COUNT(*) FROM roles');

    console.log(`   Existing users: ${existingUsersCount.rows[0].count}`);
    console.log(`   Existing clients: ${existingClientsCount.rows[0].count}`);
    console.log(`   Existing roles: ${existingRolesCount.rows[0].count}`);

    const shouldInsertDemoData = existingUsersCount.rows[0].count <= 1;

    if (shouldInsertDemoData) {
      // ⭐⭐⭐ INSERT DEMO PODACI SAMO AKO BAZA JE PRAZNA ⭐⭐⭐
      console.log('👥 Inserting demo users with extended data...');
      
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
        
        const existingUser = await dbClient.query(
          'SELECT id FROM users WHERE email = $1',
          [user.email]
        );

        if (existingUser.rows.length === 0) {
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
        } else {
          console.log(`⏭️  Skipping existing user: ${user.email}`);
        }
      }

      console.log('✅ Demo users inserted');

      // ⭐⭐⭐ KREIRAJ VERIFICATION TOKEN ZA EMAIL-ONLY KORISNIKE ⭐⭐⭐
      console.log('🔐 Creating verification tokens for email-only users...');
      
      const emailOnlyUsers = demoUsers.filter(user => user.authMethod === 'email_only');
      
      for (const user of emailOnlyUsers) {
        const userResult = await dbClient.query('SELECT id FROM users WHERE email = $1', [user.email]);
        
        if (userResult.rows.length > 0) {
          const userId = userResult.rows[0].id;
          
          const existingToken = await dbClient.query(
            'SELECT id FROM verification_tokens WHERE user_id = $1 AND token_type = $2',
            [userId, 'account_activation']
          );

          if (existingToken.rows.length === 0) {
            const verificationToken = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
            
            await dbClient.query(`
              INSERT INTO verification_tokens (user_id, token, token_type, expires_at)
              VALUES ($1, $2, $3, $4)
            `, [userId, verificationToken, 'account_activation', expiresAt]);
            
            console.log(`   ✅ Token created for ${user.email}`);
          } else {
            console.log(`   ⏭️  Token already exists for ${user.email}`);
          }
        }
      }

      // Ubacivanje rola samo ako ne postoje
      console.log('🎭 Inserting roles...');
      await dbClient.query(`
        INSERT INTO roles (name, description, level) VALUES
        ('admin', 'Administrator sustava', 100),
        ('manager', 'Manager tima', 50),
        ('user', 'Obični korisnik', 10)
        ON CONFLICT (name) DO NOTHING
      `);

      // Ubacivanje dozvola samo ako ne postoje
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
        ON CONFLICT (code) DO NOTHING
      `);

      // Dodjela dozvola rolama samo ako ne postoje
      console.log('📋 Assigning permissions to roles...');
      
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

      // Manager dobiva clients, notes, reports dozvole
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

      // Dodjela rola korisnicima samo ako ne postoje
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

      // Ubacivanje demo klijenata samo ako ne postoje
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
          ON CONFLICT (email) DO NOTHING
        `, [clientData.name, clientData.email, clientData.company, clientData.phone, clientData.address, clientData.createdBy]);
      }

      console.log('✅ Demo clients inserted');

      // Dodjela klijenata korisnicima samo ako ne postoje
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
          ON CONFLICT (user_id, client_id) DO NOTHING
        `, [assignment.username, assignment.clientEmail, assignment.isPrimary]);
      }

      // ⭐⭐⭐ ISPRAVLJENO: DNEVNIK AKTIVNOSTI - KORISTI PRAVU STRUKTURU ⭐⭐⭐
      console.log('📊 Inserting demo activity logs...');
      
      const existingLogsCount = await dbClient.query('SELECT COUNT(*) FROM user_activity_log');
      
      if (existingLogsCount.rows[0].count === 0) {
        // Provjeri strukturu tabele
        const tableStructure = await dbClient.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'user_activity_log' 
          ORDER BY ordinal_position
        `);
        
        console.log('   Table structure:', tableStructure.rows.map(r => r.column_name));
        
        const hasResourceType = tableStructure.rows.some(r => r.column_name === 'resource_type');
        const hasResourceId = tableStructure.rows.some(r => r.column_name === 'resource_id');
        const hasDetails = tableStructure.rows.some(r => r.column_name === 'details');
        const hasActivityType = tableStructure.rows.some(r => r.column_name === 'activity_type');

        if (hasResourceType && hasResourceId && hasDetails && hasActivityType) {
          // Struktura s resource_type, resource_id, details, activity_type
          console.log('   Using resource_type + activity_type structure for activity logs');
          await dbClient.query(`
            INSERT INTO user_activity_log (user_id, activity_type, resource_type, resource_id, details, ip_address, user_agent) VALUES
            (1, 'user.created', 'user', 2, '{"action": "user.created", "username": "ivan.horvat", "email": "ivan.horvat@primjer.hr"}', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
            (2, 'client.updated', 'client', 1, '{"action": "client.updated", "changes": ["phone", "address"]}', '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'),
            (3, 'note.created', 'note', 3, '{"action": "note.created", "client_id": 2, "content_preview": "Klijent zadovoljan..."}', '192.168.1.102', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36')
            ON CONFLICT DO NOTHING
          `);
        } else if (hasActivityType) {
          // Struktura samo s activity_type
          console.log('   Using activity_type only structure for activity logs');
          await dbClient.query(`
            INSERT INTO user_activity_log (user_id, activity_type, ip_address, user_agent) VALUES
            (1, 'user.created', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
            (2, 'client.updated', '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'),
            (3, 'note.created', '192.168.1.102', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36')
            ON CONFLICT DO NOTHING
          `);
        } else {
          console.log('   ⚠️  Unknown user_activity_log structure, skipping demo data');
        }
        console.log('   ✅ Demo activity logs inserted');
      } else {
        console.log('   ⏭️  Activity logs already exist, skipping');
      }

      // Povijest prijava - samo ako je prazna
      console.log('🔐 Inserting demo login history...');
      const existingLoginHistoryCount = await dbClient.query('SELECT COUNT(*) FROM user_login_history');
      
      if (existingLoginHistoryCount.rows[0].count === 0) {
        await dbClient.query(`
          INSERT INTO user_login_history (user_id, ip_address, user_agent, success) VALUES
          (1, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', TRUE),
          (2, '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', TRUE),
          (3, '192.168.1.102', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36', TRUE)
          ON CONFLICT DO NOTHING
        `);
      } else {
        console.log('   ⏭️  Login history already exists, skipping');
      }

    } else {
      console.log('⏭️  Database already contains data, skipping demo data insertion');
      console.log('💡 Only updating table structure and constraints');
    }

    // ⭐⭐⭐ KREIRANJE INDEKSA ⭐⭐⭐
    console.log('📊 Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_auth_method ON users(auth_method)',
      'CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)',
      'CREATE INDEX IF NOT EXISTS idx_verification_tokens_token ON verification_tokens(token)',
      'CREATE INDEX IF NOT EXISTS idx_verification_tokens_user_id ON verification_tokens(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_verification_tokens_expires_at ON verification_tokens(expires_at)',
      'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
      'CREATE INDEX IF NOT EXISTS idx_users_department ON users(department)',
      'CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(created_by)',
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
      'CREATE INDEX IF NOT EXISTS idx_activities_client_id ON activities(client_id)',
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)'
    ];

    for (const index of indexes) {
      try {
        await dbClient.query(index);
      } catch (error) {
        // Ignoriraj greške ako indeksi već postoje
      }
    }

    console.log('✅ All indexes created');

    // ⭐⭐⭐ PROVJERA PODATAKA ⭐⭐⭐
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

    console.log('\n🎉 Database migration completed successfully!');
    
    if (shouldInsertDemoData) {
      console.log('\n🔐 Demo login credentials:');
      console.log('   admin@crm.com / password123 (admin) - email_password - verified');
      console.log('   ivan.horvat@primjer.hr / password123 (user) - email_password - verified');
      console.log('   ana.kovac@primjer.hr / password123 (manager) - email_password - verified');
      console.log('   marko.petrov@primjer.hr / password123 (user) - email_password - verified');
      console.log('   maja.juric@primjer.hr (email-only) - pending verification');
      console.log('   petar.kovac@primjer.hr (email-only) - pending verification');
      console.log('   demo.emailonly@primjer.hr (email-only) - pending verification');
      console.log('   test.manager@primjer.hr (email-only) - pending verification');
    }

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

// Ovo ako prorardi sigurno sam bio pijan 3 puta danas :)