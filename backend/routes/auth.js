// routes/auth.js - KOMPLETNO AŽURIRANO
import express from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import { pool } from '../database/config.js';
import { generateToken, authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

console.log('🔧 Auth Routes loading with Email-Only Auth support...');

// Validation rules
const emailValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Unesite ispravan email')
];

const passwordLoginValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Unesite ispravan email'),
    body('password')
        .notEmpty()
        .withMessage('Lozinka je obavezna')
];

const verifyAccountValidation = [
    body('token')
        .notEmpty()
        .withMessage('Token je obavezan'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email je obavezan')
];

// ✅ HEALTH ENDPOINT - PODRŠKA ZA GET I POST
router.get('/health', (req, res) => {
    console.log('🔧 Auth health check endpoint hit (GET)');
    
    res.json({
        status: 'OK',
        service: 'Auth Routes',
        timestamp: new Date().toISOString(),
        method: 'GET',
        features: [
            'email-only authentication',
            'password authentication', 
            'magic link login',
            'account verification',
            'JWT tokens'
        ],
        endpoints: [
            'POST /verify-account',
            'POST /email-login',
            'POST /magic-login', 
            'POST /password-login',
            'POST /check-status',
            'GET /me',
            'POST /logout',
            'GET/POST /health'
        ],
        security: {
            jwt: 'enabled',
            rate_limiting: 'enabled',
            input_validation: 'express-validator'
        }
    });
});

router.post('/health', (req, res) => {
    console.log('🔧 Auth health check endpoint hit (POST)');
    
    res.json({
        status: 'OK',
        service: 'Auth Routes',
        timestamp: new Date().toISOString(),
        method: 'POST',
        features: [
            'email-only authentication',
            'password authentication', 
            'magic link login',
            'account verification',
            'JWT tokens'
        ],
        endpoints: [
            'POST /verify-account',
            'POST /email-login',
            'POST /magic-login', 
            'POST /password-login',
            'POST /check-status',
            'GET /me',
            'POST /logout',
            'GET/POST /health'
        ],
        security: {
            jwt: 'enabled',
            rate_limiting: 'enabled',
            input_validation: 'express-validator'
        }
    });
});

// ✅ 1. POST /api/auth/verify-account - Verify email account
router.post('/verify-account', verifyAccountValidation, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        const { token, email } = req.body;
        
        console.log('🔐 Account verification attempt:', { email });

        // 1. Pronađi validan token
        const tokenResult = await client.query(`
            SELECT vt.*, u.id as user_id, u.email as user_email, u.status as user_status
            FROM verification_tokens vt
            JOIN users u ON vt.user_id = u.id
            WHERE vt.token = $1 
                AND vt.token_type = 'account_activation'
                AND vt.expires_at > NOW()
                AND vt.used = false
                AND u.email = $2
        `, [token, email]);

        if (tokenResult.rows.length === 0) {
            await client.query('ROLLBACK');
            console.log('❌ Invalid or expired token:', { token, email });
            return res.status(400).json({
                success: false,
                error: 'Nevažeći ili istekao verifikacijski link',
                code: 'INVALID_VERIFICATION_TOKEN'
            });
        }

        const verification = tokenResult.rows[0];

        // 2. Ažuriraj korisnika kao verificiranog
        await client.query(`
            UPDATE users 
            SET 
                status = 'active',
                email_verified = true,
                verified_at = NOW(),
                updated_at = NOW()
            WHERE id = $1
        `, [verification.user_id]);

        // 3. Označi token kao korišten
        await client.query(`
            UPDATE verification_tokens 
            SET 
                used = true,
                used_at = NOW()
            WHERE id = $1
        `, [verification.id]);

        // 4. Dohvati ažuriranog korisnika
        const userResult = await client.query(`
            SELECT 
                id, username, email, first_name, last_name, full_name,
                role, status, email_verified, auth_method,
                created_at, verified_at
            FROM users 
            WHERE id = $1
        `, [verification.user_id]);

        const user = userResult.rows[0];

        // 5. Generiraj auth token
        const authToken = generateToken(user);

        // 6. Zabilježi login aktivnost
        await client.query(`
            INSERT INTO user_activity_log (user_id, action, resource_type, resource_id, details)
            VALUES ($1, $2, $3, $4, $5)
        `, [
            user.id,
            'account.verified',
            'user',
            user.id,
            JSON.stringify({ method: 'email_verification' })
        ]);

        await client.query('COMMIT');

        console.log('✅ Account verified successfully:', user.email);

        res.json({
            success: true,
            message: 'Račun uspješno aktiviran! 🎉',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                full_name: user.full_name,
                role: user.role,
                email_verified: user.email_verified,
                auth_method: user.auth_method
            },
            token: authToken,
            redirect_to: '/dashboard'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Account verification error:', error);
        res.status(500).json({
            success: false,
            error: 'Greška pri verifikaciji računa',
            code: 'VERIFICATION_ERROR'
        });
    } finally {
        client.release();
    }
});

// ✅ 2. POST /api/auth/email-login - Login for email-only users
router.post('/email-login', emailValidation, async (req, res) => {
    try {
        const { email } = req.body;
        
        console.log('🔐 Email login attempt:', email);

        // 1. Pronađi korisnika
        const userResult = await pool.query(`
            SELECT 
                id, username, email, first_name, last_name, full_name,
                role, status, email_verified, auth_method,
                last_login_at, login_count
            FROM users 
            WHERE email = $1
        `, [email]);

        if (userResult.rows.length === 0) {
            console.log('❌ User not found:', email);
            return res.status(404).json({
                success: false,
                error: 'Korisnik s ovom email adresom nije pronađen',
                code: 'USER_NOT_FOUND'
            });
        }

        const user = userResult.rows[0];

        // 2. Provjeri status korisnika
        if (user.status !== 'active') {
            console.log('❌ User not active:', { email, status: user.status });
            return res.status(403).json({
                success: false,
                error: 'Račun nije aktiviran. Provjerite svoj email za aktivacijski link.',
                code: 'ACCOUNT_NOT_ACTIVE'
            });
        }

        if (!user.email_verified) {
            console.log('❌ Email not verified:', email);
            return res.status(403).json({
                success: false,
                error: 'Email adresa nije verificirana',
                code: 'EMAIL_NOT_VERIFIED'
            });
        }

        // 3. Ako je email-only auth, generiraj magic link
        if (user.auth_method === 'email_only') {
            const magicToken = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minuta

            // Spremi magic link token
            await pool.query(`
                INSERT INTO verification_tokens (user_id, token, token_type, expires_at)
                VALUES ($1, $2, $3, $4)
            `, [user.id, magicToken, 'password_reset', expiresAt]);

            const magicLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/magic-login?token=${magicToken}&email=${encodeURIComponent(email)}`;
            
            // Simulacija slanja emaila - u produkciji pošaljite stvarni email
            console.log('📧 Magic link generated (simulacija):', magicLink);

            return res.json({
                success: true,
                message: 'Poslan vam je magic link za prijavu',
                magic_link_sent: true,
                magic_link: magicLink, // Samo za development
                user: {
                    id: user.id,
                    email: user.email,
                    auth_method: user.auth_method
                },
                instructions: 'Provjerite svoj email za magic link (u developmentu pogledajte konzolu)'
            });
        }

        // 4. Ako je email_password auth, vrati grešku (treba password)
        if (user.auth_method === 'email_password') {
            return res.status(400).json({
                success: false,
                error: 'Za ovaj račun je potreban password. Koristite regularnu prijavu.',
                code: 'PASSWORD_REQUIRED'
            });
        }

    } catch (error) {
        console.error('❌ Email login error:', error);
        res.status(500).json({
            success: false,
            error: 'Greška pri prijavi',
            code: 'LOGIN_ERROR'
        });
    }
});

// ✅ 3. POST /api/auth/magic-login - Login with magic link
router.post('/magic-login', verifyAccountValidation, async (req, res) => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        const { token, email } = req.body;
        
        console.log('🔐 Magic login attempt:', { email });

        // 1. Pronađi validan magic token
        const tokenResult = await client.query(`
            SELECT vt.*, u.id as user_id, u.email as user_email, u.status as user_status
            FROM verification_tokens vt
            JOIN users u ON vt.user_id = u.id
            WHERE vt.token = $1 
                AND vt.token_type = 'password_reset'
                AND vt.expires_at > NOW()
                AND vt.used = false
                AND u.email = $2
                AND u.auth_method = 'email_only'
        `, [token, email]);

        if (tokenResult.rows.length === 0) {
            await client.query('ROLLBACK');
            console.log('❌ Invalid or expired magic token:', { token, email });
            return res.status(400).json({
                success: false,
                error: 'Nevažeći ili istekao magic link',
                code: 'INVALID_MAGIC_LINK'
            });
        }

        const magicToken = tokenResult.rows[0];

        // 2. Dohvati korisnika
        const userResult = await client.query(`
            SELECT 
                id, username, email, first_name, last_name, full_name,
                role, status, email_verified, auth_method
            FROM users 
            WHERE id = $1
        `, [magicToken.user_id]);

        const user = userResult.rows[0];

        // 3. Označi token kao korišten
        await client.query(`
            UPDATE verification_tokens 
            SET 
                used = true,
                used_at = NOW()
            WHERE id = $1
        `, [magicToken.id]);

        // 4. Ažuriraj login statistiku
        await client.query(`
            UPDATE users 
            SET 
                last_login_at = NOW(),
                login_count = login_count + 1,
                updated_at = NOW()
            WHERE id = $1
        `, [user.id]);

        // 5. Generiraj auth token
        const authToken = generateToken(user);

        // 6. Zabilježi aktivnost
        await client.query(`
            INSERT INTO user_activity_log (user_id, action, resource_type, resource_id, details)
            VALUES ($1, $2, $3, $4, $5)
        `, [
            user.id,
            'user.logged_in',
            'user',
            user.id,
            JSON.stringify({ method: 'magic_link' })
        ]);

        await client.query('COMMIT');

        console.log('✅ Magic login successful:', user.email);

        res.json({
            success: true,
            message: 'Uspješno ste prijavljeni!',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                full_name: user.full_name,
                role: user.role,
                email_verified: user.email_verified,
                auth_method: user.auth_method
            },
            token: authToken,
            redirect_to: '/dashboard'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Magic login error:', error);
        res.status(500).json({
            success: false,
            error: 'Greška pri prijavi',
            code: 'MAGIC_LOGIN_ERROR'
        });
    } finally {
        client.release();
    }
});

// ✅ 4. POST /api/auth/password-login - Traditional password login
router.post('/password-login', passwordLoginValidation, async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('🔐 Password login attempt:', email);

        // 1. Pronađi korisnika
        const userResult = await pool.query(`
            SELECT 
                id, username, email, first_name, last_name, full_name,
                role, status, email_verified, auth_method, password_hash
            FROM users 
            WHERE email = $1 AND auth_method = 'email_password'
        `, [email]);

        if (userResult.rows.length === 0) {
            console.log('❌ User not found or wrong auth method:', email);
            // Simulacija vremenske odgode za sigurnost
            await new Promise(resolve => setTimeout(resolve, 1000));
            return res.status(401).json({
                success: false,
                error: 'Neispravni podaci za prijavu',
                code: 'INVALID_CREDENTIALS'
            });
        }

        const user = userResult.rows[0];

        // 2. Provjeri password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            console.log('❌ Invalid password for:', email);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return res.status(401).json({
                success: false,
                error: 'Neispravni podaci za prijavu',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // 3. Provjeri status korisnika
        if (user.status !== 'active') {
            console.log('❌ User not active:', { email, status: user.status });
            return res.status(403).json({
                success: false,
                error: 'Račun nije aktiviran',
                code: 'ACCOUNT_NOT_ACTIVE'
            });
        }

        if (!user.email_verified) {
            console.log('❌ Email not verified:', email);
            return res.status(403).json({
                success: false,
                error: 'Email adresa nije verificirana',
                code: 'EMAIL_NOT_VERIFIED'
            });
        }

        // 4. Ažuriraj login statistiku
        await pool.query(`
            UPDATE users 
            SET 
                last_login_at = NOW(),
                login_count = login_count + 1,
                updated_at = NOW()
            WHERE id = $1
        `, [user.id]);

        // 5. Generiraj auth token
        const authToken = generateToken(user);

        // 6. Zabilježi aktivnost
        await pool.query(`
            INSERT INTO user_activity_log (user_id, action, resource_type, resource_id, details)
            VALUES ($1, $2, $3, $4, $5)
        `, [
            user.id,
            'user.logged_in',
            'user',
            user.id,
            JSON.stringify({ method: 'password' })
        ]);

        console.log('✅ Password login successful:', user.email);

        res.json({
            success: true,
            message: 'Uspješno ste prijavljeni!',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                full_name: user.full_name,
                role: user.role,
                email_verified: user.email_verified,
                auth_method: user.auth_method
            },
            token: authToken,
            redirect_to: '/dashboard'
        });

    } catch (error) {
        console.error('❌ Password login error:', error);
        await new Promise(resolve => setTimeout(resolve, 1000));
        res.status(500).json({
            success: false,
            error: 'Greška pri prijavi',
            code: 'LOGIN_ERROR'
        });
    }
});

// ✅ 5. POST /api/auth/check-status - Check account status
router.post('/check-status', emailValidation, async (req, res) => {
    try {
        const { email } = req.body;
        
        console.log('🔍 Checking account status for:', email);

        const result = await pool.query(`
            SELECT 
                id, email, status, email_verified, auth_method,
                created_at, verified_at
            FROM users 
            WHERE email = $1
        `, [email]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Korisnik nije pronađen',
                code: 'USER_NOT_FOUND'
            });
        }

        const user = result.rows[0];

        res.json({
            success: true,
            email: user.email,
            status: user.status,
            email_verified: user.email_verified,
            auth_method: user.auth_method,
            created_at: user.created_at,
            verified_at: user.verified_at
        });

    } catch (error) {
        console.error('❌ Check status error:', error);
        res.status(500).json({
            success: false,
            error: 'Greška pri provjeri statusa',
            code: 'STATUS_CHECK_ERROR'
        });
    }
});

// ✅ 6. GET /api/auth/me - Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        
        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                full_name: user.full_name,
                role: user.role,
                status: user.status,
                email_verified: user.email_verified,
                auth_method: user.auth_method,
                last_login_at: user.last_login_at,
                login_count: user.login_count,
                permissions: user.permissions
            }
        });

    } catch (error) {
        console.error('❌ Get profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Greška pri dohvaćanju profila',
            code: 'PROFILE_ERROR'
        });
    }
});

// ✅ 7. POST /api/auth/logout - Logout (client-side token cleanup)
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        
        // Zabilježi logout aktivnost
        await pool.query(`
            INSERT INTO user_activity_log (user_id, action, resource_type, resource_id, details)
            VALUES ($1, $2, $3, $4, $5)
        `, [
            user.id,
            'user.logged_out',
            'user',
            user.id,
            JSON.stringify({ method: 'token_invalidation' })
        ]);

        console.log('✅ User logged out:', user.email);

        res.json({
            success: true,
            message: 'Uspješno ste odjavljeni'
        });

    } catch (error) {
        console.error('❌ Logout error:', error);
        res.status(500).json({
            success: false,
            error: 'Greška pri odjavi',
            code: 'LOGOUT_ERROR'
        });
    }
});

// ✅ 8. POST /api/auth/resend-verification - Resend verification email
router.post('/resend-verification', emailValidation, async (req, res) => {
    try {
        const { email } = req.body;
        
        console.log('📧 Resend verification request for:', email);

        // 1. Pronađi korisnika
        const userResult = await pool.query(`
            SELECT id, email, first_name, last_name, full_name, status
            FROM users 
            WHERE email = $1
        `, [email]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Korisnik nije pronađen',
                code: 'USER_NOT_FOUND'
            });
        }

        const user = userResult.rows[0];

        // 2. Provjeri da li je već verificiran
        if (user.status === 'active') {
            return res.status(400).json({
                success: false,
                error: 'Račun je već aktiviran',
                code: 'ALREADY_ACTIVE'
            });
        }

        // 3. Generiraj novi token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 sata

        // 4. Obriši stare tokene
        await pool.query(`
            DELETE FROM verification_tokens 
            WHERE user_id = $1 AND token_type = 'account_activation'
        `, [user.id]);

        // 5. Spremi novi token
        await pool.query(`
            INSERT INTO verification_tokens (user_id, token, token_type, expires_at)
            VALUES ($1, $2, $3, $4)
        `, [user.id, verificationToken, 'account_activation', expiresAt]);

        // 6. Generiraj aktivacijski link
        const activationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-account?token=${verificationToken}&email=${encodeURIComponent(email)}`;
        
        // Simulacija slanja emaila
        console.log('📧 Verification email sent (simulacija):', activationLink);

        res.json({
            success: true,
            message: 'Verifikacijski email je ponovno poslan!',
            activation_link: activationLink, // Samo za development
            instructions: 'Provjerite svoj email za verifikacijski link (u developmentu pogledajte konzolu)'
        });

    } catch (error) {
        console.error('❌ Resend verification error:', error);
        res.status(500).json({
            success: false,
            error: 'Greška pri slanju verifikacijskog emaila',
            code: 'RESEND_VERIFICATION_ERROR'
        });
    }
});

console.log('✅ Auth routes loaded successfully');
console.log('📋 Available auth endpoints:');
console.log('   GET/POST /api/auth/health           - Health check');
console.log('   POST /api/auth/verify-account       - Verify email account');
console.log('   POST /api/auth/email-login          - Email-only login');
console.log('   POST /api/auth/magic-login          - Magic link login');
console.log('   POST /api/auth/password-login       - Password login');
console.log('   POST /api/auth/check-status         - Check account status');
console.log('   GET  /api/auth/me                   - Get current user');
console.log('   POST /api/auth/logout               - Logout');
console.log('   POST /api/auth/resend-verification  - Resend verification email');

export default router;