-- database/schema.sql - AŽURIRANA ZA HYBRID 3-LEVEL SYSTEM

-- Kreiranje baze podataka
DROP DATABASE IF EXISTS crm_demo;
CREATE DATABASE crm_demo;
\c crm_demo;

-- ============ HYBRID 3-LEVEL TABLICE ============

-- Tablica korisnika za autentikaciju (AŽURIRANA ZA EMAIL-ONLY AUTH)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- NULLable za email-only auth
    
    -- Personal info (AŽURIRANO - dodan full_name)
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    
    -- Contact info
    phone_mobile VARCHAR(20),
    phone_office VARCHAR(20),
    company VARCHAR(100),
    address TEXT,
    department VARCHAR(50),
    
    -- AUTH & STATUS (AŽURIRANO)
    auth_method VARCHAR(20) DEFAULT 'email_only',
    role VARCHAR(20) DEFAULT 'user',
    status VARCHAR(30) DEFAULT 'pending_verification',
    
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    verified_at TIMESTAMP,
    
    -- 🔴 NOVO: Password change tracking za security flow
    requires_password_change BOOLEAN DEFAULT FALSE,
    password_changed_at TIMESTAMP,
    
    -- Permissions (NOVO - za admin kontrolu)
    can_export BOOLEAN DEFAULT FALSE,
    can_manage_clients BOOLEAN DEFAULT TRUE,
    can_view_reports BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    last_login_at TIMESTAMP,
    login_count INTEGER DEFAULT 0,
    timezone VARCHAR(50) DEFAULT 'Europe/Zagreb',
    language VARCHAR(10) DEFAULT 'hr',
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TIMOVI (HYBRID 3-LEVEL) - NOVA TABLICA
CREATE TABLE teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    manager_id INTEGER REFERENCES users(id),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ČLANOVI TIMA (HYBRID 3-LEVEL) - NOVA TABLICA
CREATE TABLE team_members (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    added_by INTEGER REFERENCES users(id),
    UNIQUE(team_id, user_id)
);

-- Tablica klijenata - AŽURIRANA ZA HYBRID 3-LEVEL
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    company VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    
    -- HYBRID 3-LEVEL POLJA
    is_global BOOLEAN DEFAULT FALSE,
    team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============ OSTALE TABLICE ============

-- NOVA TABLICA: Verification Tokens (bolja organizacija)
CREATE TABLE verification_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    token_type VARCHAR(50) NOT NULL CHECK (token_type IN ('account_activation', 'password_reset', 'email_change', 'email_verification')),
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tablica rola
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    level INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tablica dozvola
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Veza rola i dozvola
CREATE TABLE role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

-- Veza korisnika i rola
CREATE TABLE user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, role_id)
);

-- Veza korisnika i klijenata (za backward compatibility)
CREATE TABLE user_clients (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_primary BOOLEAN DEFAULT FALSE,
    UNIQUE(user_id, client_id)
);

-- Tablica bilješki
CREATE TABLE notes (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    note_type VARCHAR(50) DEFAULT 'general',
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tablica aktivnosti
CREATE TABLE activities (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('call', 'email', 'meeting', 'note', 'other')),
    description TEXT NOT NULL,
    activity_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dnevnik aktivnosti korisnika
CREATE TABLE user_activity_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    activity_type VARCHAR(100) NOT NULL,
    description TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Povijest prijava
CREATE TABLE user_login_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    success BOOLEAN DEFAULT TRUE,
    failure_reason TEXT
);

-- ============ KREIRANJE INDEKSA ============

-- Users indeksi
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_auth_method ON users(auth_method);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_department ON users(department);
CREATE INDEX idx_users_created_by ON users(created_by);
CREATE INDEX idx_users_verification_token ON users(verification_token);
CREATE INDEX idx_users_email_verified ON users(email_verified);
-- 🔴 NOVO: Indeksi za password change funkcionalnost
CREATE INDEX idx_users_requires_password_change ON users(requires_password_change);
CREATE INDEX idx_users_password_changed_at ON users(password_changed_at);

-- HYBRID 3-LEVEL indeksi
CREATE INDEX idx_teams_name ON teams(name);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_clients_is_global ON clients(is_global);
CREATE INDEX idx_clients_team_id ON clients(team_id);
CREATE INDEX idx_clients_created_by ON clients(created_by);

-- Clients indeksi
CREATE INDEX idx_clients_email ON clients(email);

-- Other indeksi
CREATE INDEX idx_verification_tokens_token ON verification_tokens(token);
CREATE INDEX idx_verification_tokens_user_id ON verification_tokens(user_id);
CREATE INDEX idx_verification_tokens_expires_at ON verification_tokens(expires_at);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_user_clients_user_id ON user_clients(user_id);
CREATE INDEX idx_user_clients_client_id ON user_clients(client_id);
CREATE INDEX idx_user_activity_user_id ON user_activity_log(user_id);
CREATE INDEX idx_user_activity_created_at ON user_activity_log(created_at);
CREATE INDEX idx_user_login_user_id ON user_login_history(user_id);
CREATE INDEX idx_user_login_login_at ON user_login_history(login_at);
CREATE INDEX idx_notes_client_id ON notes(client_id);
CREATE INDEX idx_notes_created_at ON notes(created_at);
CREATE INDEX idx_activities_client_id ON activities(client_id);
CREATE INDEX idx_activities_date ON activities(activity_date);

-- ============ CONSTRAINTS ============

ALTER TABLE users 
ADD CONSTRAINT chk_users_status 
CHECK (status IN ('pending_verification', 'active', 'inactive', 'suspended'));

ALTER TABLE users 
ADD CONSTRAINT chk_users_auth_method 
CHECK (auth_method IN ('email_only', 'email_password', 'oauth'));

ALTER TABLE users 
ADD CONSTRAINT chk_users_role 
CHECK (role IN ('admin', 'manager', 'user'));

-- ============ HYBRID 3-LEVEL DEMO PODACI ============

-- Ubacivanje demo korisnika
INSERT INTO users (username, email, password_hash, first_name, last_name, full_name, phone_mobile, company, department, role, auth_method, status, email_verified, requires_password_change, password_changed_at, can_export, can_manage_clients, can_view_reports, created_by) VALUES
('admin', 'admin@crm.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'Korisnik', 'Admin Korisnik', '+385 99 123 4567', 'CRM Solutions', 'IT', 'admin', 'email_password', 'active', TRUE, FALSE, CURRENT_TIMESTAMP, TRUE, TRUE, TRUE, NULL),
('ivan.horvat', 'ivan.horvat@primjer.hr', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Ivan', 'Horvat', 'Ivan Horvat', '+385 91 234 5678', 'Tech Company', 'Sales', 'user', 'email_password', 'active', TRUE, FALSE, CURRENT_TIMESTAMP, FALSE, TRUE, TRUE, 1),
('ana.kovac', 'ana.kovac@primjer.hr', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Ana', 'Kovač', 'Ana Kovač', '+385 95 345 6789', 'Digital Agency', 'Marketing', 'manager', 'email_password', 'active', TRUE, FALSE, CURRENT_TIMESTAMP, TRUE, TRUE, TRUE, 1),
('marko.petrov', 'marko.petrov@primjer.hr', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Marko', 'Petrov', 'Marko Petrov', '+385 98 456 7890', 'Web Studio', 'Development', 'user', 'email_password', 'active', TRUE, FALSE, CURRENT_TIMESTAMP, FALSE, TRUE, TRUE, 1),
-- 🔴 DEMO ZA PASSWORD CHANGE FLOW: Novi korisnici koji trebaju promijeniti lozinku
('maja.juric', 'maja.juric@primjer.hr', NULL, 'Maja', 'Jurić', 'Maja Jurić', '+385 97 567 8901', 'Design Studio', 'Design', 'user', 'email_only', 'pending_verification', FALSE, TRUE, NULL, FALSE, TRUE, TRUE, 1),
('petar.kovac', 'petar.kovac@primjer.hr', NULL, 'Petar', 'Kovač', 'Petar Kovač', '+385 99 678 9012', 'Cloud Services', 'IT', 'user', 'email_only', 'pending_verification', FALSE, TRUE, NULL, FALSE, TRUE, TRUE, 1),
('demo.emailonly', 'demo.emailonly@primjer.hr', NULL, 'Demo', 'EmailOnly', 'Demo EmailOnly', '+385 95 111 2222', 'Test Company', 'Sales', 'user', 'email_only', 'pending_verification', FALSE, TRUE, NULL, FALSE, TRUE, TRUE, 1),
('test.manager', 'test.manager@primjer.hr', NULL, 'Test', 'Manager', 'Test Manager', '+385 95 333 4444', 'Management Inc', 'Management', 'manager', 'email_only', 'pending_verification', FALSE, TRUE, NULL, TRUE, TRUE, TRUE, 1);

-- Ubacivanje HYBRID 3-LEVEL timova
INSERT INTO teams (name, description, manager_id, created_by) VALUES
('Sales Team', 'Prodaja i razvoj poslovanja', 2, 1),
('Marketing Team', 'Marketing i promocije', 3, 1),
('Development Team', 'Razvoj softvera', 4, 1);

-- Dodjela korisnika timovima
INSERT INTO team_members (team_id, user_id, role, added_by) VALUES
(1, 2, 'leader', 1),  -- Ivan Horvat u Sales Team
(1, 7, 'member', 1),  -- Demo EmailOnly u Sales Team
(2, 3, 'leader', 1),  -- Ana Kovač u Marketing Team
(3, 4, 'leader', 1),  -- Marko Petrov u Development Team
(3, 6, 'member', 1);  -- Petar Kovač u Development Team

-- Ubacivanje HYBRID 3-LEVEL klijenata
INSERT INTO clients (name, email, company, phone, address, is_global, team_id, created_by) VALUES
-- 🌍 Globalni klijenti (vide svi)
('Tech Solutions d.o.o.', 'info@techsolutions.hr', 'Tech Solutions', '+385 1 2345 678', 'Ilica 123, 10000 Zagreb', TRUE, NULL, 1),
('Software House', 'info@softwarehouse.hr', 'Software House', '+385 1 6789 012', 'Vukovarska 178, 10000 Zagreb', TRUE, NULL, 2),
-- 👥 Timski klijenti (vide samo članovi tima)
('Web Studio Pro', 'contact@webstudiopro.hr', 'Web Studio Pro', '+385 1 3456 789', 'Vlaška 45, 10000 Zagreb', FALSE, 1, 2),
('Digital Agency', 'hello@digitalagency.hr', 'Digital Agency', '+385 1 4567 890', 'Trg bana Jelačića 15, 10000 Zagreb', FALSE, 3, 1),
('Marketing Experts', 'info@marketingexperts.hr', 'Marketing Experts', '+385 1 8901 234', 'Gundulićeva 12, 10000 Zagreb', FALSE, 2, 3),
-- 👤 Privatni klijenti (vide samo vlasnici)
('IT Consulting', 'office@itconsulting.hr', 'IT Consulting', '+385 1 5678 901', 'Heinzelova 25, 10000 Zagreb', FALSE, NULL, 4),
('Cloud Services', 'cloud@services.hr', 'Cloud Services', '+385 1 7890 123', 'Jadranska 45, 10000 Zagreb', FALSE, NULL, 2),
('Data Analytics', 'analytics@data.hr', 'Data Analytics', '+385 1 9012 345', 'Savska 78, 10000 Zagreb', FALSE, NULL, 1),
('Design Studio', 'hello@designstudio.hr', 'Design Studio', '+385 1 2345 901', 'Preradovićeva 34, 10000 Zagreb', FALSE, NULL, 3);

-- ============ OSTALI DEMO PODACI ============

-- Ubacivanje demo rola
INSERT INTO roles (name, description, level) VALUES
('admin', 'Administrator sustava', 100),
('manager', 'Manager tima', 50),
('user', 'Obični korisnik', 10);

-- Ubacivanje demo dozvola
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
('reports.view', 'Pregled izvještaja', 'Može vidjeti sve izvještaje', 'reports');

-- Dodjela dozvola rolama
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'manager' AND p.category IN ('clients', 'notes', 'reports');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'user' AND p.code IN ('client.read', 'note.read', 'note.create');

-- Dodjela rola korisnicima
INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES
(1, 1, NULL),  -- admin
(2, 3, 1),     -- ivan.horvat
(3, 2, 1),     -- ana.kovac
(4, 3, 1),     -- marko.petrov
(5, 3, 1),     -- maja.juric
(6, 3, 1),     -- petar.kovac
(7, 3, 1),     -- demo.emailonly
(8, 2, 1);     -- test.manager

-- Dodjela klijenata korisnicima (za backward compatibility)
INSERT INTO user_clients (user_id, client_id, assigned_by, is_primary) VALUES
(2, 1, 1, TRUE),   -- Ivan Horvat -> Tech Solutions
(2, 3, 1, FALSE),  -- Ivan Horvat -> Web Studio Pro
(3, 4, 1, TRUE),   -- Ana Kovač -> Digital Agency
(4, 6, 1, TRUE),   -- Marko Petrov -> IT Consulting
(3, 2, 1, FALSE);  -- Ana Kovač -> Software House

-- Ubacivanje demo bilješki (sada sa title poljem)
INSERT INTO notes (client_id, title, content, created_by) VALUES
(1, 'Sastanak o nadogradnji', 'Klijent zainteresiran za nadogradnju web stranice. Dogovoren sastanak sljedeći tjedan.', 1),
(1, 'Ponuda za redesign', 'Poslana ponuda za redesign web stranice. Čekamo povratnu informaciju.', 2),
(4, 'Marketing strategija', 'Razgovor o novoj marketing strategiji za Q4.', 3),
(6, 'IT konsultacije', 'Savjetovanje o migraciji na cloud.', 4);

-- Dnevnik aktivnosti
INSERT INTO user_activity_log (user_id, activity_type, description, ip_address, user_agent) VALUES
(1, 'user.created', 'Kreiran novi korisnik: ivan.horvat', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
(2, 'client.updated', 'Ažuriran klijent: Tech Solutions d.o.o.', '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'),
(3, 'note.created', 'Dodana nova bilješka za klijenta: Digital Agency', '192.168.1.102', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'),
(4, 'password.changed', 'Promijenjena lozinka za korisnika', '192.168.1.103', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

-- Povijest prijava
INSERT INTO user_login_history (user_id, ip_address, user_agent, success) VALUES
(1, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', TRUE),
(2, '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', TRUE),
(3, '192.168.1.102', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36', TRUE),
(4, '192.168.1.103', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', TRUE);

-- ============ VERIFIKACIJA ============

SELECT '✅ HYBRID 3-LEVEL SISTEM USPIJEŠNO KREIRAN' as message;
SELECT '🔐 PASSWORD CHANGE FUNCTIONALITY: ACTIVATED' as security_info;

SELECT '📊 HYBRID 3-LEVEL STATISTIKA:' as info;
SELECT '👥 Korisnici:' as tip, COUNT(*) as broj FROM users
UNION ALL SELECT '🔐 Trebaju promjenu lozinke:', COUNT(*) FROM users WHERE requires_password_change = true
UNION ALL SELECT '👥 Timovi:', COUNT(*) FROM teams
UNION ALL SELECT '🤝 Članovi timova:', COUNT(*) FROM team_members
UNION ALL SELECT '🌍 Globalni klijenti:', COUNT(*) FROM clients WHERE is_global = true
UNION ALL SELECT '👥 Timski klijenti:', COUNT(*) FROM clients WHERE team_id IS NOT NULL
UNION ALL SELECT '👤 Privatni klijenti:', COUNT(*) FROM clients WHERE is_global = false AND team_id IS NULL;

SELECT '🔍 PREGLED KORISNIKA I PASSWORD STATUS:' as info;
SELECT 
    u.username,
    u.email,
    u.role,
    u.auth_method,
    u.status,
    CASE 
        WHEN u.password_hash IS NULL THEN '❌ Nema lozinku'
        ELSE '✅ Ima lozinku'
    END as password_status,
    CASE 
        WHEN u.requires_password_change = true THEN '🔴 Potrebna promjena'
        ELSE '🟢 Lozinka postavljena'
    END as password_change_status,
    COALESCE(TO_CHAR(u.password_changed_at, 'DD.MM.YYYY HH24:MI'), 'Nije postavljena') as zadnja_promjena,
    CASE 
        WHEN u.email_verified = true THEN '✅ Verificiran'
        ELSE '❌ Nije verificiran'
    END as email_status
FROM users u
ORDER BY 
    CASE 
        WHEN u.requires_password_change = true THEN 1
        ELSE 2
    END,
    u.id;

SELECT '🔍 DETALJAN PREGLED KLIJENATA:' as info;
SELECT 
    c.name,
    c.email,
    CASE 
        WHEN c.is_global = true THEN '🌍 Globalni'
        WHEN c.team_id IS NOT NULL THEN '👥 Timski'
        ELSE '👤 Privatni'
    END as tip_klijenta,
    t.name as tim,
    u.username as kreirao
FROM clients c
LEFT JOIN teams t ON c.team_id = t.id
LEFT JOIN users u ON c.created_by = u.id
ORDER BY 
    CASE 
        WHEN c.is_global = true THEN 1
        WHEN c.team_id IS NOT NULL THEN 2
        ELSE 3
    END,
    c.name;

SELECT '👥 PREGLED TIMOVA:' as info;
SELECT 
    t.name as tim,
    t.description,
    u.username as manager,
    COUNT(tm.user_id) as broj_clanova,
    COUNT(c.id) as broj_klijenata
FROM teams t
LEFT JOIN users u ON t.manager_id = u.id
LEFT JOIN team_members tm ON t.id = tm.team_id
LEFT JOIN clients c ON t.id = c.team_id
GROUP BY t.id, t.name, t.description, u.username
ORDER BY t.name;

SELECT '👤 TESTNI KORISNICI I PRISTUP:' as info;
SELECT 
    u.username,
    u.email,
    u.role,
    CASE 
        WHEN u.requires_password_change = true THEN '🔴 TREBA PROMJENU LOZINKE'
        ELSE '🟢 OK'
    END as password_status,
    STRING_AGG(t.name, ', ') as timovi,
    COUNT(DISTINCT c.id) as ukupno_klijenata,
    COUNT(DISTINCT CASE WHEN c.is_global = true THEN c.id END) as globalni_klijenti,
    COUNT(DISTINCT CASE WHEN c.team_id IS NOT NULL THEN c.id END) as timski_klijenti,
    COUNT(DISTINCT CASE WHEN c.is_global = false AND c.team_id IS NULL THEN c.id END) as privatni_klijenti
FROM users u
LEFT JOIN team_members tm ON u.id = tm.user_id
LEFT JOIN teams t ON tm.team_id = t.id
LEFT JOIN clients c ON (
    c.is_global = true 
    OR c.team_id = tm.team_id 
    OR c.created_by = u.id
)
WHERE u.email LIKE '%@crm.com' OR u.email LIKE '%@primjer.hr'
GROUP BY u.id, u.username, u.email, u.role, u.requires_password_change
ORDER BY 
    CASE 
        WHEN u.requires_password_change = true THEN 1
        ELSE 2
    END,
    u.id;

-- 🔴 DEMO SCENARIO ZA PASSWORD CHANGE FLOW
SELECT '🔴 DEMO SCENARIO: PASSWORD CHANGE FLOW' as scenario_title;
SELECT 
    '1. Admin kreira novog korisnika (Maja Jurić) sa generisanom lozinkom' as step,
    '   → requires_password_change = TRUE' as result
UNION ALL
SELECT 
    '2. Korisnik dobiva aktivacijski email',
    '   → Klikne na link /api/auth/verify/TOKEN'
UNION ALL
SELECT 
    '3. Backend verificira token i vidi requires_password_change = TRUE',
    '   → Redirect na /change-password sa parametrima'
UNION ALL
SELECT 
    '4. Frontend prikazuje formu za postavljanje lozinke',
    '   → Koristi endpoint /api/auth/force-change-password'
UNION ALL
SELECT 
    '5. Nakon uspješne promjene',
    '   → requires_password_change = FALSE, password_changed_at = NOW()'
UNION ALL
SELECT 
    '6. Korisnik se sada može normalno prijaviti',
    '   → Login uspješan, redirect na /dashboard';

SELECT '✅ SISTEM SPREMAN ZA PASSWORD CHANGE SECURITY FLOW' as completion_message;