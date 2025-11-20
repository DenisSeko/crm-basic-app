-- database/schema.sql - AŽURIRANA ZA EMAIL-ONLY AUTH

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
    token_type VARCHAR(50) NOT NULL CHECK (token_type IN ('account_activation', 'password_reset', 'email_change')),
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ostale tabele ostaju iste...
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
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id INTEGER,
    details JSONB,
    ip_address VARCHAR(45),
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

-- INSERT DEMO PODACI - AŽURIRANO ZA EMAIL-ONLY AUTH

-- Ubacivanje demo korisnika (AŽURIRANO - email-only korisnici imaju NULL password_hash i full_name)
INSERT INTO users (username, email, password_hash, first_name, last_name, full_name, phone_mobile, company, department, role, auth_method, status, email_verified, created_by) VALUES
('admin', 'admin@crm.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'Korisnik', 'Admin Korisnik', '+385 99 123 4567', 'CRM Solutions', 'IT', 'admin', 'email_password', 'active', TRUE, 1),
('ivan.horvat', 'ivan.horvat@primjer.hr', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Ivan', 'Horvat', 'Ivan Horvat', '+385 91 234 5678', 'Tech Company', 'Sales', 'user', 'email_password', 'active', TRUE, 1),
('ana.kovac', 'ana.kovac@primjer.hr', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Ana', 'Kovač', 'Ana Kovač', '+385 95 345 6789', 'Digital Agency', 'Marketing', 'manager', 'email_password', 'active', TRUE, 1),
('marko.petrov', 'marko.petrov@primjer.hr', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Marko', 'Petrov', 'Marko Petrov', '+385 98 456 7890', 'Web Studio', 'Development', 'user', 'email_password', 'active', TRUE, 1),
('maja.juric', 'maja.juric@primjer.hr', NULL, 'Maja', 'Jurić', 'Maja Jurić', '+385 97 567 8901', 'Design Studio', 'Design', 'user', 'email_only', 'pending_verification', FALSE, 1),
('petar.kovac', 'petar.kovac@primjer.hr', NULL, 'Petar', 'Kovač', 'Petar Kovač', '+385 99 678 9012', 'Cloud Services', 'IT', 'user', 'email_only', 'pending_verification', FALSE, 1);

-- NOVI DEMO KORISNICI ZA EMAIL-ONLY AUTH TEST
INSERT INTO users (username, email, password_hash, first_name, last_name, full_name, phone_mobile, company, department, role, auth_method, status, email_verified, created_by) VALUES
('demo.emailonly', 'demo.emailonly@primjer.hr', NULL, 'Demo', 'EmailOnly', 'Demo EmailOnly', '+385 95 111 2222', 'Test Company', 'Sales', 'user', 'email_only', 'pending_verification', FALSE, 1),
('test.manager', 'test.manager@primjer.hr', NULL, 'Test', 'Manager', 'Test Manager', '+385 95 333 4444', 'Management Inc', 'Management', 'manager', 'email_only', 'pending_verification', FALSE, 1);

-- Ubacivanje demo rola
INSERT INTO roles (name, description, level) VALUES
('admin', 'Administrator sustava', 100),
('manager', 'Manager tima', 50),
('user', 'Obični korisnik', 10);

-- Ubacivanje demo dozvola
INSERT INTO permissions (code, name, description, category) VALUES
-- User permissions
('user.create', 'Kreiranje korisnika', 'Može kreirati nove korisnike', 'users'),
('user.read', 'Čitanje korisnika', 'Može vidjeti podatke korisnika', 'users'),
('user.update', 'Ažuriranje korisnika', 'Može ažurirati podatke korisnika', 'users'),
('user.delete', 'Brisanje korisnika', 'Može brisati korisnike', 'users'),
-- Client permissions
('client.create', 'Kreiranje klijenata', 'Može kreirati nove klijente', 'clients'),
('client.read', 'Čitanje klijenata', 'Može vidjeti podatke klijenata', 'clients'),
('client.update', 'Ažuriranje klijenata', 'Može ažurirati podatke klijenata', 'clients'),
('client.delete', 'Brisanje klijenata', 'Može brisati klijente', 'clients'),
-- Note permissions
('note.create', 'Kreiranje bilješki', 'Može kreirati nove bilješke', 'notes'),
('note.read', 'Čitanje bilješki', 'Može vidjeti bilješke', 'notes'),
('note.update', 'Ažuriranje bilješki', 'Može ažurirati bilješke', 'notes'),
('note.delete', 'Brisanje bilješki', 'Može brisati bilješke', 'notes'),
-- Admin permissions
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

-- Dodjela rola korisnicima (AŽURIRANO - dodani novi korisnici)
INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES
(1, 1, 1), -- admin je admin
(2, 3, 1), -- ivan je user
(3, 2, 1), -- ana je manager
(4, 3, 1), -- marko je user
(5, 3, 1), -- maja je user
(6, 3, 1), -- petar je user
(7, 3, 1), -- demo.emailonly je user
(8, 2, 1); -- test.manager je manager

-- Ostali INSERTI ostaju isti...
-- Ubacivanje demo klijenata
INSERT INTO clients (name, email, company, phone, address, created_by) VALUES
('Tech Solutions d.o.o.', 'info@techsolutions.hr', 'Tech Solutions', '+385 1 2345 678', 'Ilica 123, 10000 Zagreb', 1),
('Web Studio Pro', 'contact@webstudiopro.hr', 'Web Studio Pro', '+385 1 3456 789', 'Vlaška 45, 10000 Zagreb', 2),
('Digital Agency', 'hello@digitalagency.hr', 'Digital Agency', '+385 1 4567 890', 'Trg bana Jelačića 15, 10000 Zagreb', 1),
('IT Consulting', 'office@itconsulting.hr', 'IT Consulting', '+385 1 5678 901', 'Heinzelova 25, 10000 Zagreb', 3),
('Software House', 'info@softwarehouse.hr', 'Software House', '+385 1 6789 012', 'Vukovarska 178, 10000 Zagreb', 2),
('Design Studio', 'studio@designstudio.hr', 'Design Studio', '+385 1 7890 123', 'Prilaz Gjure Deželića 27, 10000 Zagreb', 4),
('Marketing Experts', 'contact@marketingexperts.hr', 'Marketing Experts', '+385 1 8901 234', 'Avenija Dubrovnik 15, 10000 Zagreb', 1),
('Cloud Services', 'info@cloudservices.hr', 'Cloud Services', '+385 1 9012 345', 'Jadranska avenija 32, 10000 Zagreb', 3),
('Data Analytics', 'hello@dataanalytics.hr', 'Data Analytics', '+385 1 0123 456', 'Slavonska avenija 12, 10000 Zagreb', 2),
('Mobile Dev Team', 'team@mobiledev.hr', 'Mobile Dev Team', '+385 1 1234 567', 'Vrbani 3, 10000 Zagreb', 4);

-- Dodjela klijenata korisnicima
INSERT INTO user_clients (user_id, client_id, assigned_by, is_primary) VALUES
(2, 1, 1, TRUE),  -- Ivan -> Tech Solutions
(2, 2, 1, FALSE), -- Ivan -> Web Studio Pro
(3, 3, 1, TRUE),  -- Ana -> Digital Agency
(4, 4, 1, TRUE),  -- Marko -> IT Consulting
(3, 5, 1, FALSE); -- Ana -> Software House

-- Ubacivanje demo bilješki
INSERT INTO notes (client_id, content, created_by) VALUES
(1, 'Klijent zainteresiran za nadogradnju web stranice. Dogovoren sastanak sljedeći tjedan.', 1),
(1, 'Poslana ponuda za redesign web stranice. Čekamo povratnu informaciju.', 2),
(2, 'Klijent zadovoljan trenutnim rezultatima. Razgovarali o mogućnostima proširenja suradnje.', 3),
(3, 'Problemi s hostingom. Riješeno prebacivanje na novi server.', 1),
(4, 'Početna analiza poslovanja. Pripremljen detaljan izvještaj.', 4),
(4, 'Klijent traži dodatne mogućnosti u CRM sustavu. Pripremiti demo za sljedeći tjedan.', 2),
(5, 'Usvojena nova funkcionalnost. Početi s implementacijom.', 3),
(6, 'Klijent predložio promjenu boja u dizajnu. Poslati prijedloge.', 1),
(7, 'Razgovor o digitalnoj marketinškoj strategiji za sljedeći kvartal.', 4),
(8, 'Migracija podataka završena. Testiranje u toku.', 2);

-- Ubacivanje demo aktivnosti
INSERT INTO activities (client_id, type, description, activity_date, created_by) VALUES
(1, 'meeting', 'Sastanak o nadogradnji web stranice', '2024-01-15 10:00:00', 1),
(2, 'call', 'Telefonski razgovor o novim zahtjevima', '2024-01-16 14:30:00', 2),
(3, 'email', 'Slanje tehničke dokumentacije', '2024-01-17 09:15:00', 3),
(4, 'meeting', 'Demo prezentacija novih funkcionalnosti', '2024-01-18 11:00:00', 1),
(5, 'call', 'Konsultacije o optimizaciji performansi', '2024-01-19 16:45:00', 4),
(1, 'email', 'Slanje ponude za redesign', '2024-01-20 13:20:00', 2),
(6, 'meeting', 'Razgovor o rebrandingu', '2024-01-21 10:30:00', 3),
(7, 'call', 'Analiza rezultata marketinške kampanje', '2024-01-22 15:00:00', 1),
(8, 'email', 'Uputstva za korištenje novog sustava', '2024-01-23 08:45:00', 4),
(9, 'meeting', 'Prezentacija analize podataka', '2024-01-24 12:00:00', 2);

-- Dnevnik aktivnosti
INSERT INTO user_activity_log (user_id, action, resource_type, resource_id, details) VALUES
(1, 'user.created', 'user', 2, '{"username": "ivan.horvat", "email": "ivan.horvat@primjer.hr"}'),
(2, 'client.updated', 'client', 1, '{"changes": ["phone", "address"]}'),
(3, 'note.created', 'note', 3, '{"client_id": 2, "content_preview": "Klijent zadovoljan..."}');

-- Povijest prijava
INSERT INTO user_login_history (user_id, ip_address, user_agent, success) VALUES
(1, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', TRUE),
(2, '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', TRUE),
(3, '192.168.1.102', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36', TRUE);

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