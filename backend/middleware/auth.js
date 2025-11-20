// middleware/auth.js - AŽURIRANO ZA EMAIL-ONLY AUTH
import jwt from 'jsonwebtoken';
import { pool } from '../database/config.js';

const JWT_SECRET = process.env.JWT_SECRET || 'crm_demo_jwt_secret_key_2024_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_ISSUER = process.env.JWT_ISSUER || 'crm-demo-app';

export const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log('🔐 Token authentication attempt:', {
        hasToken: !!token,
        path: req.path,
        method: req.method
    });

    if (!token) {
        console.log('❌ No token provided');
        return res.status(401).json({ 
            error: 'Access token je obavezan',
            code: 'MISSING_TOKEN'
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Dodatna validacija decoded podataka
        if (!decoded.id || !decoded.email || !decoded.role) {
            console.log('❌ Token missing required fields:', decoded);
            return res.status(403).json({ 
                error: 'Token sadrži neispravne podatke',
                code: 'INVALID_TOKEN_PAYLOAD'
            });
        }

        // Dohvati fresh user podatke iz baze
        const userResult = await pool.query(`
            SELECT 
                id, username, email, first_name, last_name, full_name,
                role, status, email_verified, auth_method,
                last_login_at, login_count,
                can_export, can_manage_clients, can_view_reports
            FROM users 
            WHERE id = $1 AND status = 'active'
        `, [decoded.id]);

        if (userResult.rows.length === 0) {
            console.log('❌ User not found or inactive:', decoded.id);
            return res.status(403).json({ 
                error: 'Korisnik nije pronađen ili nije aktivan',
                code: 'USER_NOT_FOUND'
            });
        }

        const user = userResult.rows[0];

        // Provjeri email verification za sve korisnike
        if (!user.email_verified) {
            console.log('❌ Email not verified:', user.email);
            return res.status(403).json({ 
                error: 'Email adresa nije verificirana. Provjerite svoj email za verifikacijski link.',
                code: 'EMAIL_NOT_VERIFIED'
            });
        }

        console.log('✅ Token valid for user:', {
            id: user.id,
            email: user.email,
            role: user.role,
            auth_method: user.auth_method,
            status: user.status
        });

        req.user = {
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
            permissions: {
                can_export: user.can_export,
                can_manage_clients: user.can_manage_clients,
                can_view_reports: user.can_view_reports
            }
        };

        next();

    } catch (error) {
        console.log('❌ Token verification failed:', error.name);
        
        let errorMessage = 'Token nije validan';
        let statusCode = 403;
        let errorCode = 'INVALID_TOKEN';

        if (error.name === 'TokenExpiredError') {
            errorMessage = 'Token je istekao';
            statusCode = 401;
            errorCode = 'TOKEN_EXPIRED';
        } else if (error.name === 'JsonWebTokenError') {
            errorMessage = 'Token nije ispravan';
            errorCode = 'MALFORMED_TOKEN';
        }

        return res.status(statusCode).json({ 
            error: errorMessage,
            code: errorCode,
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export const generateToken = (user) => {
    const payload = {
        id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        full_name: user.full_name,
        role: user.role,
        auth_method: user.auth_method,
        email_verified: user.email_verified,
        iss: JWT_ISSUER,
        iat: Math.floor(Date.now() / 1000)
    };

    const options = {
        expiresIn: JWT_EXPIRES_IN,
        issuer: JWT_ISSUER
    };

    const token = jwt.sign(payload, JWT_SECRET, options);
    
    console.log('🔐 Token generated for user:', {
        id: user.id,
        email: user.email,
        role: user.role,
        auth_method: user.auth_method,
        expiresIn: JWT_EXPIRES_IN
    });

    return token;
};

export const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        // Ako nema tokena, nastavi bez user objekta
        return next();
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        if (decoded.id && decoded.email && decoded.role) {
            // Dohvati fresh user podatke
            const userResult = await pool.query(`
                SELECT 
                    id, username, email, first_name, last_name, full_name,
                    role, status, email_verified, auth_method,
                    can_export, can_manage_clients, can_view_reports
                FROM users 
                WHERE id = $1 AND status = 'active' AND email_verified = true
            `, [decoded.id]);

            if (userResult.rows.length > 0) {
                const user = userResult.rows[0];
                req.user = {
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
                    permissions: {
                        can_export: user.can_export,
                        can_manage_clients: user.can_manage_clients,
                        can_view_reports: user.can_view_reports
                    }
                };
                console.log('✅ Optional auth - user authenticated:', req.user.email);
            }
        }
        
        next();
    } catch (error) {
        // Ako je token invalid, samo nastavi bez user objekta
        console.log('⚠️ Optional auth - invalid token, continuing without user');
        next();
    }
};

export const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                error: 'Potrebna je prijava',
                code: 'UNAUTHORIZED'
            });
        }

        const userRole = req.user.role;
        const allowedRoles = Array.isArray(roles) ? roles : [roles];

        if (!allowedRoles.includes(userRole)) {
            console.log('❌ Role check failed:', {
                required: allowedRoles,
                userRole: userRole,
                user: req.user.email
            });
            return res.status(403).json({ 
                error: 'Nemate dovoljne privilegije za ovu akciju',
                code: 'INSUFFICIENT_PERMISSIONS',
                requiredRoles: allowedRoles,
                userRole: userRole
            });
        }

        console.log('✅ Role check passed:', {
            user: req.user.email,
            role: userRole,
            required: allowedRoles
        });

        next();
    };
};

export const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                error: 'Potrebna je prijava',
                code: 'UNAUTHORIZED'
            });
        }

        // Provjeri permisije na temelju role i user permissions
        const user = req.user;
        
        // Admin ima sve permisije
        if (user.role === 'admin') {
            return next();
        }

        // Provjeri specificne permisije
        let hasPermission = false;

        switch (permission) {
            case 'export':
                hasPermission = user.permissions?.can_export || false;
                break;
            case 'manage_clients':
                hasPermission = user.permissions?.can_manage_clients || false;
                break;
            case 'view_reports':
                hasPermission = user.permissions?.can_view_reports || false;
                break;
            case 'create_users':
                hasPermission = user.role === 'admin' || user.role === 'manager';
                break;
            default:
                hasPermission = false;
        }

        if (!hasPermission) {
            console.log('❌ Permission check failed:', {
                permission: permission,
                user: user.email,
                role: user.role,
                userPermissions: user.permissions
            });
            return res.status(403).json({ 
                error: 'Nemate dovoljne dozvole za ovu akciju',
                code: 'INSUFFICIENT_PERMISSIONS',
                requiredPermission: permission
            });
        }

        console.log('✅ Permission check passed:', {
            user: user.email,
            permission: permission
        });

        next();
    };
};

export const requireVerifiedEmail = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            error: 'Potrebna je prijava',
            code: 'UNAUTHORIZED'
        });
    }

    if (!req.user.email_verified) {
        console.log('❌ Email verification required:', req.user.email);
        return res.status(403).json({ 
            error: 'Email adresa nije verificirana',
            code: 'EMAIL_VERIFICATION_REQUIRED',
            message: 'Molimo verificirajte svoju email adresu prije pristupa ovom dijelu sustava.'
        });
    }

    next();
};

export const requireActiveStatus = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            error: 'Potrebna je prijava',
            code: 'UNAUTHORIZED'
        });
    }

    if (req.user.status !== 'active') {
        console.log('❌ User not active:', {
            email: req.user.email,
            status: req.user.status
        });
        return res.status(403).json({ 
            error: 'Račun nije aktivan',
            code: 'ACCOUNT_NOT_ACTIVE',
            message: 'Vaš račun nije aktivan. Kontaktirajte administratora.'
        });
    }

    next();
};

export const decodeTokenWithoutVerification = (token) => {
    try {
        // Ova funkcija samo dekodira token bez verifikacije (korisno za debug)
        const decoded = jwt.decode(token, { complete: true });
        return decoded;
    } catch (error) {
        console.error('Token decoding error:', error);
        return null;
    }
};

export const getTokenInfo = (token) => {
    try {
        const decoded = jwt.decode(token);
        if (!decoded) return null;

        const currentTime = Math.floor(Date.now() / 1000);
        const isExpired = decoded.exp < currentTime;
        const timeUntilExpiry = decoded.exp - currentTime;

        return {
            issuedAt: new Date(decoded.iat * 1000),
            expiresAt: new Date(decoded.exp * 1000),
            isExpired,
            timeUntilExpiry,
            userId: decoded.id,
            userEmail: decoded.email,
            userRole: decoded.role,
            authMethod: decoded.auth_method,
            emailVerified: decoded.email_verified
        };
    } catch (error) {
        console.error('Token info error:', error);
        return null;
    }
};

// Middleware za logovanje svih zahtjeva (korisno za debug)
export const requestLogger = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const userInfo = req.user ? `[user:${req.user.email}]` : '[anonymous]';
        
        console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms ${userInfo}`);
    });

    next();
};

// Middleware za ažuriranje zadnje aktivnosti korisnika
export const updateUserActivity = async (req, res, next) => {
    if (req.user && req.user.id) {
        try {
            // Ažuriraj last_login_at samo ako je prošlo više od 5 minuta
            await pool.query(`
                UPDATE users 
                SET last_login_at = NOW() 
                WHERE id = $1 AND (
                    last_login_at IS NULL OR 
                    last_login_at < NOW() - INTERVAL '5 minutes'
                )
            `, [req.user.id]);
        } catch (error) {
            console.error('Error updating user activity:', error);
            // Ne prekidaj request zbog ove greške
        }
    }
    next();
};

export default {
    authenticateToken,
    generateToken,
    optionalAuth,
    requireRole,
    requirePermission,
    requireVerifiedEmail,
    requireActiveStatus,
    decodeTokenWithoutVerification,
    getTokenInfo,
    requestLogger,
    updateUserActivity,
    JWT_SECRET,
    JWT_EXPIRES_IN,
    JWT_ISSUER
};