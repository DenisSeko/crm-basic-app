-- database/schema.sql - AŽURIRANA ZA EMAIL-ONLY AUTH BEZ DUPLICIRANJA

-- Kreiranje baze podataka
DROP DATABASE IF EXISTS crm_demo;
CREATE DATABASE crm_demo;
\c crm_demo;

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

-- Tablica klijenata
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    company VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Veza korisnika i klijenata
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
    content TEXT NOT NULL,
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

-- KREIRANJE INDEKSA - AŽURIRANO

-- Osnovni indeksi
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_notes_client_id ON notes(client_id);
CREATE INDEX idx_notes_created_at ON notes(created_at);
CREATE INDEX idx_activities_client_id ON activities(client_id);
CREATE INDEX idx_activities_date ON activities(activity_date);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_verification_token ON users(verification_token);
CREATE INDEX idx_users_email_verified ON users(email_verified);

-- NOVI INDEKSI ZA EMAIL-ONLY AUTH
CREATE INDEX idx_users_auth_method ON users(auth_method);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_verification_tokens_token ON verification_tokens(token);
CREATE INDEX idx_verification_tokens_user_id ON verification_tokens(user_id);
CREATE INDEX idx_verification_tokens_expires_at ON verification_tokens(expires_at);

-- Ostali indeksi
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_department ON users(department);
CREATE INDEX idx_users_created_by ON users(created_by);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_user_clients_user_id ON user_clients(user_id);
CREATE INDEX idx_user_clients_client_id ON user_clients(client_id);
CREATE INDEX idx_user_activity_user_id ON user_activity_log(user_id);
CREATE INDEX idx_user_activity_created_at ON user_activity_log(created_at);
CREATE INDEX idx_user_login_user_id ON user_login_history(user_id);
CREATE INDEX idx_user_login_login_at ON user_login_history(login_at);

-- DODAJ CONSTRAINT-E ZA VALIDACIJU
ALTER TABLE users 
ADD CONSTRAINT chk_users_status 
CHECK (status IN ('pending_verification', 'active', 'inactive', 'suspended'));

ALTER TABLE users 
ADD CONSTRAINT chk_users_auth_method 
CHECK (auth_method IN ('email_only', 'email_password', 'oauth'));

ALTER TABLE users 
ADD CONSTRAINT chk_users_role 
CHECK (role IN ('admin', 'manager', 'user'));

-- INSERT DEMO PODACI SAMO AKO NE POSTOJE - AŽURIRANO ZA EMAIL-ONLY AUTH

-- Ubacivanje demo korisnika samo ako ne postoje
INSERT INTO users (username, email, password_hash, first_name, last_name, full_name, phone_mobile, company, department, role, auth_method, status, email_verified, can_export, can_manage_clients, can_view_reports, created_by) 
SELECT 
    'admin', 'admin@crm.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'Korisnik', 'Admin Korisnik', '+385 99 123 4567', 'CRM Solutions', 'IT', 'admin', 'email_password', 'active', TRUE, TRUE, TRUE, TRUE, 1
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@crm.com');

INSERT INTO users (username, email, password_hash, first_name, last_name, full_name, phone_mobile, company, department, role, auth_method, status, email_verified, can_export, can_manage_clients, can_view_reports, created_by) 
SELECT 
    'ivan.horvat', 'ivan.horvat@primjer.hr', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Ivan', 'Horvat', 'Ivan Horvat', '+385 91 234 5678', 'Tech Company', 'Sales', 'user', 'email_password', 'active', TRUE, FALSE, TRUE, TRUE, 1
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'ivan.horvat@primjer.hr');

INSERT INTO users (username, email, password_hash, first_name, last_name, full_name, phone_mobile, company, department, role, auth_method, status, email_verified, can_export, can_manage_clients, can_view_reports, created_by) 
SELECT 
    'ana.kovac', 'ana.kovac@primjer.hr', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Ana', 'Kovač', 'Ana Kovač', '+385 95 345 6789', 'Digital Agency', 'Marketing', 'manager', 'email_password', 'active', TRUE, TRUE, TRUE, TRUE, 1
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'ana.kovac@primjer.hr');

INSERT INTO users (username, email, password_hash, first_name, last_name, full_name, phone_mobile, company, department, role, auth_method, status, email_verified, can_export, can_manage_clients, can_view_reports, created_by) 
SELECT 
    'marko.petrov', 'marko.petrov@primjer.hr', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Marko', 'Petrov', 'Marko Petrov', '+385 98 456 7890', 'Web Studio', 'Development', 'user', 'email_password', 'active', TRUE, FALSE, TRUE, TRUE, 1
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'marko.petrov@primjer.hr');

INSERT INTO users (username, email, password_hash, first_name, last_name, full_name, phone_mobile, company, department, role, auth_method, status, email_verified, can_export, can_manage_clients, can_view_reports, created_by) 
SELECT 
    'maja.juric', 'maja.juric@primjer.hr', NULL, 'Maja', 'Jurić', 'Maja Jurić', '+385 97 567 8901', 'Design Studio', 'Design', 'user', 'email_only', 'pending_verification', FALSE, FALSE, TRUE, TRUE, 1
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'maja.juric@primjer.hr');

INSERT INTO users (username, email, password_hash, first_name, last_name, full_name, phone_mobile, company, department, role, auth_method, status, email_verified, can_export, can_manage_clients, can_view_reports, created_by) 
SELECT 
    'petar.kovac', 'petar.kovac@primjer.hr', NULL, 'Petar', 'Kovač', 'Petar Kovač', '+385 99 678 9012', 'Cloud Services', 'IT', 'user', 'email_only', 'pending_verification', FALSE, FALSE, TRUE, TRUE, 1
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'petar.kovac@primjer.hr');

INSERT INTO users (username, email, password_hash, first_name, last_name, full_name, phone_mobile, company, department, role, auth_method, status, email_verified, can_export, can_manage_clients, can_view_reports, created_by) 
SELECT 
    'demo.emailonly', 'demo.emailonly@primjer.hr', NULL, 'Demo', 'EmailOnly', 'Demo EmailOnly', '+385 95 111 2222', 'Test Company', 'Sales', 'user', 'email_only', 'pending_verification', FALSE, FALSE, TRUE, TRUE, 1
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'demo.emailonly@primjer.hr');

INSERT INTO users (username, email, password_hash, first_name, last_name, full_name, phone_mobile, company, department, role, auth_method, status, email_verified, can_export, can_manage_clients, can_view_reports, created_by) 
SELECT 
    'test.manager', 'test.manager@primjer.hr', NULL, 'Test', 'Manager', 'Test Manager', '+385 95 333 4444', 'Management Inc', 'Management', 'manager', 'email_only', 'pending_verification', FALSE, TRUE, TRUE, TRUE, 1
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'test.manager@primjer.hr');

-- Ubacivanje demo rola samo ako ne postoje
INSERT INTO roles (name, description, level) 
SELECT 'admin', 'Administrator sustava', 100
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'admin');

INSERT INTO roles (name, description, level) 
SELECT 'manager', 'Manager tima', 50
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'manager');

INSERT INTO roles (name, description, level) 
SELECT 'user', 'Obični korisnik', 10
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'user');

-- Ubacivanje demo dozvola samo ako ne postoje
INSERT INTO permissions (code, name, description, category) 
SELECT 'user.create', 'Kreiranje korisnika', 'Može kreirati nove korisnike', 'users'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'user.create');

INSERT INTO permissions (code, name, description, category) 
SELECT 'user.read', 'Čitanje korisnika', 'Može vidjeti podatke korisnika', 'users'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'user.read');

INSERT INTO permissions (code, name, description, category) 
SELECT 'user.update', 'Ažuriranje korisnika', 'Može ažurirati podatke korisnika', 'users'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'user.update');

INSERT INTO permissions (code, name, description, category) 
SELECT 'user.delete', 'Brisanje korisnika', 'Može brisati korisnike', 'users'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'user.delete');

INSERT INTO permissions (code, name, description, category) 
SELECT 'client.create', 'Kreiranje klijenata', 'Može kreirati nove klijente', 'clients'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'client.create');

INSERT INTO permissions (code, name, description, category) 
SELECT 'client.read', 'Čitanje klijenata', 'Može vidjeti podatke klijenata', 'clients'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'client.read');

INSERT INTO permissions (code, name, description, category) 
SELECT 'client.update', 'Ažuriranje klijenata', 'Može ažurirati podatke klijenata', 'clients'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'client.update');

INSERT INTO permissions (code, name, description, category) 
SELECT 'client.delete', 'Brisanje klijenata', 'Može brisati klijente', 'clients'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'client.delete');

INSERT INTO permissions (code, name, description, category) 
SELECT 'note.create', 'Kreiranje bilješki', 'Može kreirati nove bilješke', 'notes'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'note.create');

INSERT INTO permissions (code, name, description, category) 
SELECT 'note.read', 'Čitanje bilješki', 'Može vidjeti bilješke', 'notes'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'note.read');

INSERT INTO permissions (code, name, description, category) 
SELECT 'note.update', 'Ažuriranje bilješki', 'Može ažurirati bilješke', 'notes'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'note.update');

INSERT INTO permissions (code, name, description, category) 
SELECT 'note.delete', 'Brisanje bilješki', 'Može brisati bilješke', 'notes'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'note.delete');

INSERT INTO permissions (code, name, description, category) 
SELECT 'system.settings', 'Postavke sustava', 'Može mijenjati postavke sustava', 'system'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'system.settings');

INSERT INTO permissions (code, name, description, category) 
SELECT 'reports.view', 'Pregled izvještaja', 'Može vidjeti sve izvještaje', 'reports'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'reports.view');

-- Dodjela dozvola rolama samo ako ne postoje
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'admin'
AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'manager' AND p.category IN ('clients', 'notes', 'reports')
AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'user' AND p.code IN ('client.read', 'note.read', 'note.create')
AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);

-- Dodjela rola korisnicima samo ako ne postoje
INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT u.id, r.id, 1
FROM users u, roles r 
WHERE u.username = 'admin' AND r.name = 'admin'
AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id);

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT u.id, r.id, 1
FROM users u, roles r 
WHERE u.username = 'ivan.horvat' AND r.name = 'user'
AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id);

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT u.id, r.id, 1
FROM users u, roles r 
WHERE u.username = 'ana.kovac' AND r.name = 'manager'
AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id);

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT u.id, r.id, 1
FROM users u, roles r 
WHERE u.username = 'marko.petrov' AND r.name = 'user'
AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id);

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT u.id, r.id, 1
FROM users u, roles r 
WHERE u.username = 'maja.juric' AND r.name = 'user'
AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id);

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT u.id, r.id, 1
FROM users u, roles r 
WHERE u.username = 'petar.kovac' AND r.name = 'user'
AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id);

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT u.id, r.id, 1
FROM users u, roles r 
WHERE u.username = 'demo.emailonly' AND r.name = 'user'
AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id);

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT u.id, r.id, 1
FROM users u, roles r 
WHERE u.username = 'test.manager' AND r.name = 'manager'
AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id);

-- Ubacivanje demo klijenata samo ako ne postoje
INSERT INTO clients (name, email, company, phone, address, created_by) 
SELECT 'Tech Solutions d.o.o.', 'info@techsolutions.hr', 'Tech Solutions', '+385 1 2345 678', 'Ilica 123, 10000 Zagreb', 1
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE email = 'info@techsolutions.hr');

INSERT INTO clients (name, email, company, phone, address, created_by) 
SELECT 'Web Studio Pro', 'contact@webstudiopro.hr', 'Web Studio Pro', '+385 1 3456 789', 'Vlaška 45, 10000 Zagreb', 2
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE email = 'contact@webstudiopro.hr');

INSERT INTO clients (name, email, company, phone, address, created_by) 
SELECT 'Digital Agency', 'hello@digitalagency.hr', 'Digital Agency', '+385 1 4567 890', 'Trg bana Jelačića 15, 10000 Zagreb', 1
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE email = 'hello@digitalagency.hr');

INSERT INTO clients (name, email, company, phone, address, created_by) 
SELECT 'IT Consulting', 'office@itconsulting.hr', 'IT Consulting', '+385 1 5678 901', 'Heinzelova 25, 10000 Zagreb', 3
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE email = 'office@itconsulting.hr');

INSERT INTO clients (name, email, company, phone, address, created_by) 
SELECT 'Software House', 'info@softwarehouse.hr', 'Software House', '+385 1 6789 012', 'Vukovarska 178, 10000 Zagreb', 2
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE email = 'info@softwarehouse.hr');

-- Dodjela klijenata korisnicima samo ako ne postoje
INSERT INTO user_clients (user_id, client_id, assigned_by, is_primary)
SELECT u.id, c.id, 1, TRUE
FROM users u, clients c 
WHERE u.username = 'ivan.horvat' AND c.email = 'info@techsolutions.hr'
AND NOT EXISTS (SELECT 1 FROM user_clients uc WHERE uc.user_id = u.id AND uc.client_id = c.id);

INSERT INTO user_clients (user_id, client_id, assigned_by, is_primary)
SELECT u.id, c.id, 1, FALSE
FROM users u, clients c 
WHERE u.username = 'ivan.horvat' AND c.email = 'contact@webstudiopro.hr'
AND NOT EXISTS (SELECT 1 FROM user_clients uc WHERE uc.user_id = u.id AND uc.client_id = c.id);

INSERT INTO user_clients (user_id, client_id, assigned_by, is_primary)
SELECT u.id, c.id, 1, TRUE
FROM users u, clients c 
WHERE u.username = 'ana.kovac' AND c.email = 'hello@digitalagency.hr'
AND NOT EXISTS (SELECT 1 FROM user_clients uc WHERE uc.user_id = u.id AND uc.client_id = c.id);

INSERT INTO user_clients (user_id, client_id, assigned_by, is_primary)
SELECT u.id, c.id, 1, TRUE
FROM users u, clients c 
WHERE u.username = 'marko.petrov' AND c.email = 'office@itconsulting.hr'
AND NOT EXISTS (SELECT 1 FROM user_clients uc WHERE uc.user_id = u.id AND uc.client_id = c.id);

INSERT INTO user_clients (user_id, client_id, assigned_by, is_primary)
SELECT u.id, c.id, 1, FALSE
FROM users u, clients c 
WHERE u.username = 'ana.kovac' AND c.email = 'info@softwarehouse.hr'
AND NOT EXISTS (SELECT 1 FROM user_clients uc WHERE uc.user_id = u.id AND uc.client_id = c.id);

-- Ubacivanje demo bilješki samo ako ne postoje
INSERT INTO notes (client_id, content, created_by)
SELECT c.id, 'Klijent zainteresiran za nadogradnju web stranice. Dogovoren sastanak sljedeći tjedan.', 1
FROM clients c WHERE c.email = 'info@techsolutions.hr'
AND NOT EXISTS (SELECT 1 FROM notes n WHERE n.client_id = c.id AND n.content LIKE 'Klijent zainteresiran za nadogradnju%');

INSERT INTO notes (client_id, content, created_by)
SELECT c.id, 'Poslana ponuda za redesign web stranice. Čekamo povratnu informaciju.', 2
FROM clients c WHERE c.email = 'info@techsolutions.hr'
AND NOT EXISTS (SELECT 1 FROM notes n WHERE n.client_id = c.id AND n.content LIKE 'Poslana ponuda za redesign%');

-- Dnevnik aktivnosti samo ako je prazan
INSERT INTO user_activity_log (user_id, activity_type, description, ip_address, user_agent)
SELECT 1, 'user.created', 'Kreiran novi korisnik: ivan.horvat', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
WHERE NOT EXISTS (SELECT 1 FROM user_activity_log WHERE user_id = 1 AND activity_type = 'user.created');

INSERT INTO user_activity_log (user_id, activity_type, description, ip_address, user_agent)
SELECT 2, 'client.updated', 'Ažuriran klijent: Tech Solutions d.o.o.', '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
WHERE NOT EXISTS (SELECT 1 FROM user_activity_log WHERE user_id = 2 AND activity_type = 'client.updated');

INSERT INTO user_activity_log (user_id, activity_type, description, ip_address, user_agent)
SELECT 3, 'note.created', 'Dodana nova bilješka za klijenta: Digital Agency', '192.168.1.102', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
WHERE NOT EXISTS (SELECT 1 FROM user_activity_log WHERE user_id = 3 AND activity_type = 'note.created');

-- Povijest prijava samo ako je prazna
INSERT INTO user_login_history (user_id, ip_address, user_agent, success)
SELECT 1, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', TRUE
WHERE NOT EXISTS (SELECT 1 FROM user_login_history WHERE user_id = 1 AND ip_address = '192.168.1.100');

INSERT INTO user_login_history (user_id, ip_address, user_agent, success)
SELECT 2, '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', TRUE
WHERE NOT EXISTS (SELECT 1 FROM user_login_history WHERE user_id = 2 AND ip_address = '192.168.1.101');

INSERT INTO user_login_history (user_id, ip_address, user_agent, success)
SELECT 3, '192.168.1.102', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36', TRUE
WHERE NOT EXISTS (SELECT 1 FROM user_login_history WHERE user_id = 3 AND ip_address = '192.168.1.102');

-- PROVJERA PODATAKA - AŽURIRANO

-- Prikaz broja unosa po tablicama
SELECT 'Users' as table_name, COUNT(*) as count FROM users
UNION ALL SELECT 'Clients', COUNT(*) FROM clients
UNION ALL SELECT 'Notes', COUNT(*) FROM notes
UNION ALL SELECT 'Activities', COUNT(*) FROM activities
UNION ALL SELECT 'Roles', COUNT(*) FROM roles
UNION ALL SELECT 'Permissions', COUNT(*) FROM permissions
UNION ALL SELECT 'User Roles', COUNT(*) FROM user_roles
UNION ALL SELECT 'User Clients', COUNT(*) FROM user_clients
UNION ALL SELECT 'User Activity Log', COUNT(*) FROM user_activity_log
UNION ALL SELECT 'User Login History', COUNT(*) FROM user_login_history
UNION ALL SELECT 'Verification Tokens', COUNT(*) FROM verification_tokens;

-- Status korisnika po auth metodi
SELECT 
    auth_method,
    role,
    status,
    COUNT(*) as user_count,
    SUM(CASE WHEN email_verified = TRUE THEN 1 ELSE 0 END) as verified
FROM users 
GROUP BY auth_method, role, status 
ORDER BY auth_method, role, status;

-- Pregled dozvola po rolama
SELECT 
    r.name as role_name,
    COUNT(rp.permission_id) as permission_count,
    STRING_AGG(p.name, ', ') as permissions
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
GROUP BY r.id, r.name;

-- Dodjela klijenata korisnicima
SELECT 
    u.username,
    u.first_name,
    u.last_name,
    u.role,
    u.auth_method,
    COUNT(uc.client_id) as assigned_clients,
    STRING_AGG(c.name, ', ') as client_names
FROM users u
LEFT JOIN user_clients uc ON u.id = uc.user_id
LEFT JOIN clients c ON uc.client_id = c.id
GROUP BY u.id, u.username, u.first_name, u.last_name, u.role, u.auth_method;

-- Prikaz svih tablica u bazi
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;