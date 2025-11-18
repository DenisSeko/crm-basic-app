import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import { body, validationResult } from 'express-validator';

console.log('🚀 Starting CRM Backend Server - DEVELOPMENT MODE...');

const app = express();

// ⭐⭐⭐ DEVELOPMENT CONFIGURATION ⭐⭐⭐
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
const isProduction = process.env.NODE_ENV === 'production';

console.log(`🔧 Environment: ${isDevelopment ? 'DEVELOPMENT' : 'PRODUCTION'}`);
console.log(`🔧 Security Mode: ${isDevelopment ? 'RELAXED' : 'STRICT'}`);

// ⭐⭐⭐ DEVELOPMENT-FRIENDLY SECURITY MIDDLEWARE ⭐⭐⭐

// 1. Helmet - Development-friendly security headers
app.use(helmet({
    contentSecurityPolicy: isProduction ? {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"]
        }
    } : false, // Disable CSP in development for easier testing
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 2. CORS - Development-friendly configuration
app.use(cors({
    origin: isProduction 
        ? process.env.FRONTEND_URL || 'http://localhost:5173'
        : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', '*'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'Accept']
}));

// 3. DEVELOPMENT RATE LIMITING - Very relaxed
const generalLimiter = rateLimit({
    windowMs: isProduction ? 15 * 60 * 1000 : 2 * 60 * 1000, // 15min prod vs 2min dev
    max: isProduction ? 100 : 1000, // 100 prod vs 1000 dev
    message: {
        error: 'Too many requests',
        message: isProduction ? 
            'Please try again after 15 minutes' : 
            'Development: Please wait 2 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for certain development endpoints
        if (isDevelopment) {
            return req.path === '/api/health' || req.path === '/api/debug-routes';
        }
        return false;
    },
    handler: (req, res) => {
        const retryTime = isProduction ? '15 minutes' : '2 minutes';
        res.status(429).json({
            success: false,
            error: 'Rate limit exceeded',
            message: `Too many requests. Please try again after ${retryTime}.`,
            environment: isDevelopment ? 'development' : 'production',
            retryAfter: retryTime,
            timestamp: new Date().toISOString()
        });
    }
});

// Apply general rate limiting
app.use(generalLimiter);

// DEVELOPMENT AUTH RATE LIMITING - Very relaxed
const authLimiter = rateLimit({
    windowMs: isProduction ? 15 * 60 * 1000 : 1 * 60 * 1000, // 15min prod vs 1min dev
    max: isProduction ? 5 : 50, // 5 prod vs 50 dev
    message: {
        error: 'Too many authentication attempts',
        message: isProduction ? 
            'Please try again after 15 minutes' : 
            'Development: Please wait 1 minute'
    },
    standardHeaders: true,
    skip: (req) => {
        // Skip for health checks in development
        return isDevelopment && req.path.includes('health');
    },
    handler: (req, res) => {
        const retryTime = isProduction ? '15 minutes' : '1 minute';
        res.status(429).json({
            success: false,
            error: 'Authentication rate limit exceeded',
            message: `Too many authentication attempts. Please try again after ${retryTime}.`,
            environment: isDevelopment ? 'development' : 'production',
            retryAfter: retryTime,
            timestamp: new Date().toISOString(),
            tip: isDevelopment ? 'This is development mode - limits are relaxed' : 'Production security mode active'
        });
    }
});

// Apply auth rate limiting
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/resend-verification', authLimiter);

// 4. Body parsing with development-friendly limits
app.use(express.json({
    limit: isProduction ? '10kb' : '1mb' // 10kb prod vs 1mb dev
}));

app.use(express.urlencoded({
    extended: true,
    limit: isProduction ? '10kb' : '1mb'
}));

// 5. Data sanitization
app.use(mongoSanitize({
    replaceWith: '_'
}));

// 6. Prevent parameter pollution
app.use(hpp({
    whitelist: ['page', 'limit', 'sort', 'fields']
}));

// 7. Development-friendly security headers
app.use((req, res, next) => {
    // Remove X-Powered-By header
    res.removeHeader('X-Powered-By');
    
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    if (isProduction) {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        res.setHeader('Permissions-Policy', 'geolocation=(), microphone=()');
    }
    
    next();
});

// Development-friendly XSS protection
const xssProtection = (req, res, next) => {
    if (isProduction) {
        // Strict sanitization for production
        const sanitize = (obj) => {
            if (obj && typeof obj === 'object') {
                for (let key in obj) {
                    if (typeof obj[key] === 'string') {
                        obj[key] = obj[key]
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;')
                            .replace(/"/g, '&quot;')
                            .replace(/'/g, '&#x27;')
                            .replace(/\//g, '&#x2F;');
                    } else if (typeof obj[key] === 'object') {
                        sanitize(obj[key]);
                    }
                }
            }
        };
        
        sanitize(req.query);
        sanitize(req.body);
        sanitize(req.params);
    }
    // In development, skip strict sanitization for easier testing
    next();
};

app.use(xssProtection);

// Enhanced development logging
app.use((req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const userAgent = req.get('User-Agent') || 'Unknown';
    
    if (isDevelopment) {
        console.log(`🔧 ${new Date().toLocaleTimeString()} ${req.method} ${req.path} - IP: ${clientIP}`);
        if (req.method === 'POST' && req.body) {
            console.log('   📦 Body:', JSON.stringify(req.body).substring(0, 200) + '...');
        }
    } else {
        console.log(`${new Date().toISOString()} ${req.method} ${req.path} - IP: ${clientIP}`);
    }
    next();
});

// ⭐⭐⭐ ROUTES ⭐⭐⭐

// Root endpoint with environment info
app.get('/', (req, res) => {
    res.json({
        message: 'CRM Backend API - DEVELOPMENT MODE',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        environment: isDevelopment ? 'development' : 'production',
        security: {
            mode: isDevelopment ? 'relaxed' : 'strict',
            rate_limiting: 'enabled',
            xss_protection: isDevelopment ? 'development' : 'strict',
            cors: 'development-friendly'
        },
        development_features: isDevelopment ? [
            'Relaxed rate limiting (50 auth attempts/min)',
            'Large request size limits (1MB)',
            'Detailed error messages',
            'CORS allowed for all localhost origins'
        ] : ['Production security mode active'],
        endpoints: {
            health: '/api/health',
            test_email: '/api/test-email',
            auth: '/api/auth/*',
            debug: '/api/debug-routes'
        }
    });
});

// Health endpoint with environment info
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'CRM Backend',
        environment: isDevelopment ? 'development' : 'production',
        timestamp: new Date().toISOString(),
        node_version: process.version,
        security_mode: isDevelopment ? 'development-relaxed' : 'production-strict',
        rate_limits: isDevelopment ? {
            general: '1000 requests/2min',
            auth: '50 attempts/1min'
        } : {
            general: '100 requests/15min', 
            auth: '5 attempts/15min'
        },
        features: ['rate_limiting', 'xss_protection', 'helmet_headers', 'cors']
    });
});

// Validation middleware
const validateEmail = [
    body('testEmail')
        .optional()
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address')
];

// ⭐⭐⭐ EMAIL TEST ENDPOINT ⭐⭐⭐
app.post('/api/test-email', validateEmail, async (req, res) => {
    console.log('🎯 DEVELOPMENT EMAIL TEST ENDPOINT HIT!');
    
    // Development-friendly validation
    const errors = validationResult(req);
    if (!errors.isEmpty() && isProduction) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors.array()
        });
    }
    // In development, just log validation errors but continue
    
    try {
        const { testEmail = 'test@example.com' } = req.body;

        console.log('1. Importing nodemailer...');
        const nodemailerModule = await import('nodemailer');
        const nodemailer = nodemailerModule.default;
        
        console.log('2. Creating transporter...');
        const transporter = nodemailer.createTransport({
            host: 'localhost',
            port: 1025,
            secure: false,
            ignoreTLS: true,
            auth: null,
            connectionTimeout: 10000,
            socketTimeout: 10000
        });

        console.log('3. Testing SMTP connection...');
        await transporter.verify();
        console.log('✅ SMTP connection verified');

        console.log('4. Preparing development email...');
        const mailOptions = {
            from: '"CRM DEV TEST" <dev@crm.com>',
            to: testEmail,
            subject: 'DEV MODE TEST - ' + new Date().toLocaleTimeString(),
            text: 'This is a DEVELOPMENT mode test email!',
            html: `
                <h1>🚀 DEVELOPMENT MODE TEST SUCCESS!</h1>
                <p>This email was sent in <strong>DEVELOPMENT MODE</strong></p>
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                <p><strong>Environment:</strong> ${isDevelopment ? 'Development' : 'Production'}</p>
                <p><strong>Security:</strong> ${isDevelopment ? 'Relaxed' : 'Strict'}</p>
                <p>If you see this in MailCatcher, everything is working in development mode!</p>
            `
        };

        console.log('5. Sending development email...');
        const info = await transporter.sendMail(mailOptions);
        
        console.log('🎉 DEVELOPMENT EMAIL TEST SUCCESS!');
        console.log('   📨 Message ID:', info.messageId);

        res.json({
            success: true,
            message: 'Development test email sent successfully!',
            details: {
                messageId: info.messageId,
                environment: isDevelopment ? 'development' : 'production',
                timestamp: new Date().toISOString(),
                security: {
                    mode: isDevelopment ? 'development-relaxed' : 'production-strict',
                    rate_limiting: 'development-friendly',
                    validation: 'development-lenient'
                }
            }
        });

    } catch (error) {
        console.error('💥 DEVELOPMENT EMAIL TEST FAILED:');
        console.error('   ❌ Error:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'Email sending failed',
            details: isDevelopment ? {
                error: error.message,
                stack: error.stack,
                environment: 'development'
            } : {
                error: 'Internal server error',
                environment: 'production'
            },
            timestamp: new Date().toISOString()
        });
    }
});

// ⭐⭐⭐ REGISTRATION ENDPOINT - WITH CORRECT ACTIVATION LINK ⭐⭐⭐
app.post('/api/auth/register', [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Unesite ispravan email'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Lozinka mora imati najmanje 6 znakova'),
    body('firstName')
        .notEmpty()
        .trim()
        .withMessage('Ime je obavezno'),
    body('lastName')
        .notEmpty()
        .trim()
        .withMessage('Prezime je obavezno')
], async (req, res) => {
    console.log('🎯 REGISTER ENDPOINT HIT!');
    
    // Validacija
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('❌ VALIDATION ERRORS:', errors.array());
        return res.status(400).json({
            success: false,
            error: 'Validacija neuspješna',
            details: errors.array(),
            environment: isDevelopment ? 'development' : 'production'
        });
    }
    
    try {
        const { email, password, firstName, lastName } = req.body;
        
        console.log('📝 Registration attempt:', { email, firstName, lastName });
        
        // Kombiniraj u fullName
        const fullName = `${firstName} ${lastName}`;
        
        // ⭐⭐⭐ DODAJ EMAIL SLANJE OVDJE ⭐⭐⭐
        console.log('1. Importing nodemailer for activation email...');
        const nodemailerModule = await import('nodemailer');
        const nodemailer = nodemailerModule.default;
        
        console.log('2. Creating transporter for MailCatcher...');
        const transporter = nodemailer.createTransport({
            host: 'localhost',
            port: 1025,
            secure: false,
            ignoreTLS: true,
            auth: null
        });

        console.log('3. Testing SMTP connection to MailCatcher...');
        await transporter.verify();
        console.log('✅ SMTP connection to MailCatcher verified');

        console.log('4. Preparing activation email...');
        
        // Generiraj aktivacijski token (simulacija)
        const activationToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
        
        // ⭐⭐⭐ ISPRAVLJEN LINK - sada ide na /activate rutu ⭐⭐⭐
        const activationLink = `http://localhost:5173/activate?token=${activationToken}&email=${encodeURIComponent(email)}`;
        
        const mailOptions = {
            from: '"CRM System" <noreply@crm.com>',
            to: email,
            subject: 'Aktivacija računa - CRM System',
            text: `Poštovani ${firstName} ${lastName},\n\nMolimo aktivirajte svoj račun putem ovog linka: ${activationLink}\n\nLijep pozdrav,\nCRM Tim`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #2563eb;">Dobrodošli u CRM System!</h1>
                    <p>Poštovani <strong>${firstName} ${lastName}</strong>,</p>
                    <p>Hvala vam što ste se registrirali. Molimo potvrdite svoju email adresu kako biste aktivirali račun.</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${activationLink}" 
                           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                           Aktiviraj Moj Račun
                        </a>
                    </div>
                    
                    <p>Ili kopirajte ovaj link u svoj preglednik:</p>
                    <p style="word-break: break-all; color: #666;">${activationLink}</p>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                        <p><small>Ako se niste registrirali, molimo ignorirajte ovaj email.</small></p>
                        <p><small>CRM Development Team<br>Development Mode</small></p>
                    </div>
                </div>
            `
        };

        console.log('5. Sending activation email to:', email);
        const emailInfo = await transporter.sendMail(mailOptions);
        console.log('✅ Activation email sent! Message ID:', emailInfo.messageId);
        
        // ✅ SAMO JSON RESPONSE - BEZ REDIREKCIJE
        res.status(201).json({
            success: true,
            message: 'Uspješno ste registrirani! Poslan vam je aktivacijski mail.',
            user: {
                id: 'temp-' + Date.now(),
                email: email,
                firstName: firstName,
                lastName: lastName,
                fullName: fullName,
                activationToken: activationToken,
                isVerified: false,
                createdAt: new Date().toISOString()
            },
            email: {
                sent: true,
                messageId: emailInfo.messageId,
                to: email
            },
            activation: {
                frontendUrl: activationLink,
                instructions: 'Kliknite na link u emailu za aktivaciju računa'
            },
            nextStep: 'verify_email',
            instructions: 'Provjerite svoj email za aktivacijski link',
            environment: 'development',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('💥 Registration error:', error);
        
        // Ako email ne uspije, ipak vrati success ali sa warningom
        if (error.code === 'ECONNREFUSED') {
            console.error('❌ MailCatcher nije pokrenut! Pokreni ga sa: mailcatcher');
            return res.status(201).json({
                success: true,
                message: 'Uspješno ste registrirani!',
                user: {
                    id: 'temp-' + Date.now(),
                    email: req.body.email,
                    firstName: req.body.firstName,
                    lastName: req.body.lastName,
                    fullName: `${req.body.firstName} ${req.body.lastName}`,
                    isVerified: false,
                    createdAt: new Date().toISOString()
                },
                warning: 'MailCatcher nije pokrenut - aktivacijski email nije poslan',
                mailcatcherTip: 'Pokreni MailCatcher sa: mailcatcher',
                environment: 'development',
                timestamp: new Date().toISOString()
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Registracija neuspješna',
            details: isDevelopment ? {
                error: error.message,
                stack: error.stack
            } : {
                error: 'Internal server error'
            },
            timestamp: new Date().toISOString()
        });
    }
});

// ⭐⭐⭐ LOGIN ENDPOINT - WITH VERIFICATION CHECK ⭐⭐⭐
app.post('/api/auth/login', [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Unesite ispravan email'),
    body('password')
        .notEmpty()
        .withMessage('Lozinka je obavezna')
], async (req, res) => {
    console.log('🎯 LOGIN ENDPOINT HIT!');
    
    // Validacija
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('❌ LOGIN VALIDATION ERRORS:', errors.array());
        return res.status(400).json({
            success: false,
            error: 'Validacija neuspješna',
            details: errors.array(),
            environment: isDevelopment ? 'development' : 'production'
        });
    }
    
    try {
        const { email, password } = req.body;
        
        console.log('🔐 Login attempt for email:', email);
        
        // ⭐⭐⭐ VERIFIKACIJSKA PROVJERA ⭐⭐⭐
        const isVerified = email.includes('admin') || email.includes('verified') || email.includes('demo');
        
        if (!isVerified) {
            console.log('❌ Login blocked - account not verified:', email);
            return res.status(403).json({
                success: false,
                error: 'Račun nije verificiran',
                message: 'Molimo verificirajte svoj račun prije prijave',
                details: {
                    email: email,
                    isVerified: false,
                    status: 'pending_verification'
                },
                nextStep: 'verify_email',
                instructions: 'Provjerite svoj email za aktivacijski link ili zatražite novi',
                environment: 'development',
                timestamp: new Date().toISOString()
            });
        }
        
        // Privremeni odgovor za development
        const user = {
            id: 'user-' + Date.now(),
            email: email,
            firstName: 'Demo',
            lastName: 'Korisnik',
            fullName: 'Demo Korisnik',
            role: email.includes('admin') ? 'admin' : 'user',
            isActive: true,
            isVerified: true,
            email_verified: true,
            lastLogin: new Date().toISOString()
        };
        
        // Generiraj mock token
        const token = 'dev-token-' + Math.random().toString(36).substring(2) + Date.now().toString(36);
        
        console.log('✅ Login successful for:', email);
        
        res.json({
            success: true,
            message: 'Prijava uspješna',
            user: user,
            token: token,
            expiresIn: '24h',
            environment: 'development',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('💥 Login error:', error);
        
        // Simulacija neuspješne prijave
        if (email.includes('invalid') || password.includes('wrong')) {
            return res.status(401).json({
                success: false,
                error: 'Neispravni podaci za prijavu',
                message: 'Provjerite email i lozinku',
                environment: 'development',
                timestamp: new Date().toISOString()
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Greška pri prijavi',
            details: isDevelopment ? {
                error: error.message,
                stack: error.stack
            } : {
                error: 'Internal server error'
            },
            timestamp: new Date().toISOString()
        });
    }
});

// ⭐⭐⭐ RESEND VERIFICATION EMAIL ENDPOINT - WITH CORRECT ACTIVATION LINK ⭐⭐⭐
app.post('/api/auth/resend-verification', [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Unesite ispravan email')
], async (req, res) => {
    console.log('🎯 RESEND VERIFICATION ENDPOINT HIT!');
    
    // Validacija
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('❌ RESEND VERIFICATION VALIDATION ERRORS:', errors.array());
        return res.status(400).json({
            success: false,
            error: 'Validacija neuspješna',
            details: errors.array(),
            environment: isDevelopment ? 'development' : 'production'
        });
    }
    
    try {
        const { email } = req.body;
        
        console.log('📧 Resend verification request for email:', email);
        
        // ⭐⭐⭐ EMAIL SLANJE ⭐⭐⭐
        console.log('1. Importing nodemailer for resend verification...');
        const nodemailerModule = await import('nodemailer');
        const nodemailer = nodemailerModule.default;
        
        console.log('2. Creating transporter for MailCatcher...');
        const transporter = nodemailer.createTransport({
            host: 'localhost',
            port: 1025,
            secure: false,
            ignoreTLS: true,
            auth: null
        });

        console.log('3. Testing SMTP connection to MailCatcher...');
        await transporter.verify();
        console.log('✅ SMTP connection to MailCatcher verified');

        console.log('4. Preparing resend verification email...');
        
        // Generiraj novi aktivacijski token
        const newActivationToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
        
        // ⭐⭐⭐ ISPRAVLJEN LINK - sada ide na /activate rutu ⭐⭐⭐
        const activationLink = `http://localhost:5173/activate?token=${newActivationToken}&email=${encodeURIComponent(email)}`;
        
        const mailOptions = {
            from: '"CRM System" <noreply@crm.com>',
            to: email,
            subject: 'Novi aktivacijski link - CRM System',
            text: `Poštovani,\n\nZatražili ste novi aktivacijski link. Molimo aktivirajte svoj račun putem ovog linka: ${activationLink}\n\nLijep pozdrav,\nCRM Tim`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #2563eb;">Novi aktivacijski link</h1>
                    <p>Poštovani,</p>
                    <p>Zatražili ste novi aktivacijski link za vaš račun.</p>
                    <p>Molimo potvrdite svoju email adresu kako biste aktivirali račun.</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${activationLink}" 
                           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                           Aktiviraj Moj Račun
                        </a>
                    </div>
                    
                    <p>Ili kopirajte ovaj link u svoj preglednik:</p>
                    <p style="word-break: break-all; color: #666;">${activationLink}</p>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                        <p><small>Ako niste zatražili novi aktivacijski link, molimo ignorirajte ovaj email.</small></p>
                        <p><small>CRM Development Team<br>Development Mode</small></p>
                    </div>
                </div>
            `
        };

        console.log('5. Sending resend verification email to:', email);
        const emailInfo = await transporter.sendMail(mailOptions);
        console.log('✅ Resend verification email sent! Message ID:', emailInfo.messageId);
        
        res.json({
            success: true,
            message: 'Novi aktivacijski mail je poslan!',
            email: {
                sent: true,
                messageId: emailInfo.messageId,
                to: email
            },
            activation: {
                frontendUrl: activationLink,
                token: newActivationToken
            },
            instructions: 'Provjerite svoj email za novi aktivacijski link',
            environment: 'development',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('💥 Resend verification error:', error);
        
        // Ako email ne uspije, vrati odgovarajući error
        if (error.code === 'ECONNREFUSED') {
            console.error('❌ MailCatcher nije pokrenut!');
            return res.status(500).json({
                success: false,
                error: 'MailCatcher nije dostupan',
                message: 'Aktivacijski email nije poslan - MailCatcher nije pokrenut',
                mailcatcherTip: 'Pokreni MailCatcher sa: mailcatcher',
                environment: 'development',
                timestamp: new Date().toISOString()
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Slanje aktivacijskog maila neuspješno',
            details: isDevelopment ? {
                error: error.message,
                stack: error.stack
            } : {
                error: 'Internal server error'
            },
            timestamp: new Date().toISOString()
        });
    }
});

// ⭐⭐⭐ ACCOUNT ACTIVATION ENDPOINT - FIXED TO POST METHOD ⭐⭐⭐
app.post('/api/auth/activate', [
    body('token')
        .notEmpty()
        .withMessage('Token je obavezan'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email je obavezan')
], async (req, res) => {
    console.log('🎯 ACCOUNT ACTIVATION ENDPOINT HIT!');
    
    try {
        const { token, email } = req.body;
        
        console.log('🔐 Account activation attempt:', { email, token });
        
        if (!token || !email) {
            console.log('❌ Missing activation parameters in body');
            return res.status(400).json({
                success: false,
                error: 'Nedostaju parametri za aktivaciju',
                message: 'Aktivacijski podaci nisu ispravni',
                missing: {
                    token: !token,
                    email: !email
                },
                received: req.body,
                instructions: 'Kliknite na link u emailu ponovno ili zatražite novi aktivacijski email',
                timestamp: new Date().toISOString()
            });
        }
        
        // SIMULACIJA uspješne aktivacije
        console.log('✅ Account activated successfully for:', email);
        
        // ⭐⭐⭐ FIX: Vraćamo JSON response umjesto redirecta ⭐⭐⭐
        res.json({
            success: true,
            message: 'Račun je uspješno aktiviran! 🎉',
            email: email,
            activated: true,
            timestamp: new Date().toISOString(),
            frontend: {
                // Instrukcije za frontend
                redirectTo: '/email-verified',
                suggestedActions: [
                    'Preusmjerite korisnika na /email-verified stranicu',
                    'Prikažite poruku o uspješnoj aktivaciji',
                    'Omogućite prijavu u sustav'
                ],
                queryParams: {
                    email: email,
                    success: 'true',
                    activated: 'true'
                }
            },
            user: {
                email: email,
                isVerified: true,
                activatedAt: new Date().toISOString()
            },
            nextSteps: {
                login: 'Sada se možete prijaviti u svoj račun',
                instructions: 'Idite na stranicu za prijavu i unesite svoje podatke'
            }
        });
        
    } catch (error) {
        console.error('💥 Activation error:', error);
        
        res.status(500).json({
            success: false,
            error: 'Aktivacija računa neuspješna',
            message: 'Došlo je do greške prilikom aktivacije računa',
            email: req.body.email,
            instructions: 'Kontaktirajte podršku ili zatražite novi aktivacijski link',
            timestamp: new Date().toISOString()
        });
    }
});

// ⭐⭐⭐ KEEP GET ACTIVATION FOR BACKWARD COMPATIBILITY ⭐⭐⭐
app.get('/api/auth/activate', async (req, res) => {
    console.log('🎯 GET ACCOUNT ACTIVATION ENDPOINT HIT!');
    
    try {
        const { token, email } = req.query;
        
        console.log('🔐 GET Account activation attempt:', { email, token });
        
        if (!token || !email) {
            console.log('❌ Missing activation parameters in query');
            return res.status(400).json({
                success: false,
                error: 'Nedostaju parametri za aktivaciju',
                message: 'Aktivacijski link nije ispravan',
                missing: {
                    token: !token,
                    email: !email
                },
                received: req.query,
                instructions: 'Kliknite na link u emailu ponovno ili zatražite novi aktivacijski email',
                timestamp: new Date().toISOString()
            });
        }
        
        // SIMULACIJA uspješne aktivacije
        console.log('✅ GET Account activated successfully for:', email);
        
        res.json({
            success: true,
            message: 'Račun je uspješno aktiviran! 🎉',
            email: email,
            activated: true,
            method: 'GET',
            timestamp: new Date().toISOString(),
            user: {
                email: email,
                isVerified: true,
                activatedAt: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('💥 GET Activation error:', error);
        
        res.status(500).json({
            success: false,
            error: 'Aktivacija računa neuspješna',
            message: 'Došlo je do greške prilikom aktivacije računa',
            email: req.query.email,
            instructions: 'Kontaktirajte podršku ili zatražite novi aktivacijski link',
            timestamp: new Date().toISOString()
        });
    }
});

// ⭐⭐⭐ CHECK ACCOUNT STATUS ENDPOINT ⭐⭐⭐
app.post('/api/auth/check-status', [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Unesite ispravan email')
], async (req, res) => {
    console.log('🎯 CHECK ACCOUNT STATUS ENDPOINT HIT!');
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Validacija neuspješna',
            details: errors.array()
        });
    }
    
    try {
        const { email } = req.body;
        
        console.log('🔍 Checking account status for:', email);
        
        // Simulacija - u stvarnoj app provjeri bazu
        const isVerified = email.includes('admin') || email.includes('verified') || email.includes('demo');
        
        res.json({
            success: true,
            email: email,
            isVerified: isVerified,
            status: isVerified ? 'verified' : 'pending_verification',
            message: isVerified 
                ? 'Račun je verificiran' 
                : 'Račun nije verificiran'
        });
        
    } catch (error) {
        console.error('💥 Check status error:', error);
        res.status(500).json({
            success: false,
            error: 'Provjera statusa neuspješna'
        });
    }
});

// ⭐⭐⭐ AUTH RUTES WITH DEVELOPMENT SETTINGS ⭐⭐⭐
console.log('🔧 Setting up development-friendly auth routes...');

// Development auth test endpoint
app.post('/api/auth/instant-test', validateEmail, async (req, res) => {
    console.log('🎯 DEVELOPMENT AUTH INSTANT-TEST ENDPOINT HIT!');
    
    // Development-friendly validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('⚠️  Validation warnings (development):', errors.array());
        // In development, continue anyway but log warnings
    }
    
    try {
        const { testEmail = 'test@example.com' } = req.body;

        console.log('1. Importing nodemailer for development auth...');
        const nodemailerModule = await import('nodemailer');
        const nodemailer = nodemailerModule.default;
        
        console.log('2. Creating transporter...');
        const transporter = nodemailer.createTransport({
            host: 'localhost',
            port: 1025,
            secure: false,
            ignoreTLS: true,
            auth: null
        });

        console.log('3. Testing SMTP connection...');
        await transporter.verify();
        console.log('✅ SMTP connection verified for development auth');

        console.log('4. Preparing development auth test email...');
        const mailOptions = {
            from: '"DEV AUTH TEST" <dev-auth@crm.com>',
            to: testEmail,
            subject: 'DEV AUTH TEST - ' + new Date().toLocaleTimeString(),
            text: 'This is a DEVELOPMENT auth test email!',
            html: `
                <h1>🚀 DEVELOPMENT AUTH TEST SUCCESS!</h1>
                <p>This email was sent from <strong>development auth endpoint</strong></p>
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                <p><strong>Environment:</strong> Development</p>
                <p><strong>Rate Limits:</strong> 50 attempts per minute</p>
                <p><strong>Security:</strong> Development-relaxed mode</p>
                <p>If you see this in MailCatcher, auth is working in development mode!</p>
            `
        };

        console.log('5. Sending development auth test email...');
        const info = await transporter.sendMail(mailOptions);
        
        console.log('🎉 DEVELOPMENT AUTH TEST SUCCESS!');
        console.log('   📨 Message ID:', info.messageId);

        res.json({
            success: true,
            message: 'Development auth test email sent successfully!',
            details: {
                messageId: info.messageId,
                environment: 'development',
                endpoint: '/api/auth/instant-test',
                timestamp: new Date().toISOString(),
                security: {
                    rate_limiting: '50 attempts per minute',
                    mode: 'development-relaxed',
                    validation: 'lenient'
                }
            }
        });

    } catch (error) {
        console.error('💥 DEVELOPMENT AUTH TEST FAILED:');
        console.error('   ❌ Error:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'Development authentication test failed',
            details: isDevelopment ? {
                error: error.message,
                stack: error.stack,
                environment: 'development'
            } : {
                error: 'Internal server error'
            },
            timestamp: new Date().toISOString()
        });
    }
});

// Development auth health endpoint
app.get('/api/auth/health', (req, res) => {
    console.log('🔧 Development auth health check endpoint hit');
    
    res.json({
        status: 'OK',
        service: 'Development Auth Routes',
        environment: 'development',
        timestamp: new Date().toISOString(),
        security: {
            mode: 'development-relaxed',
            rate_limiting: '50 attempts per minute',
            validation: 'lenient'
        },
        development_features: [
            'Relaxed rate limiting',
            'Detailed error messages',
            'Lenient validation',
            'CORS enabled for all localhost'
        ],
        endpoints: {
            instant_test: 'POST /api/auth/instant-test',
            health: 'GET /api/auth/health',
            register: 'POST /api/auth/register',
            login: 'POST /api/auth/login',
            resend_verification: 'POST /api/auth/resend-verification',
            activate: 'POST /api/auth/activate (NEW)',
            activate_get: 'GET /api/auth/activate (legacy)',
            check_status: 'POST /api/auth/check-status'
        }
    });
});

// Development debug endpoint
app.get('/api/debug-routes', (req, res) => {
    const routes = [];
    
    function processStack(stack, prefix = '') {
        stack.forEach((layer) => {
            if (layer.route) {
                const route = layer.route;
                routes.push({
                    path: prefix + route.path,
                    methods: Object.keys(route.methods),
                    security: route.path.includes('/auth/') ? 'development-rate-limited' : 'development-standard'
                });
            } else if (layer.name === 'router' && layer.handle.stack) {
                processStack(layer.handle.stack, prefix);
            }
        });
    }
    
    processStack(app._router.stack);
    
    res.json({
        message: 'Development Routes Debug',
        environment: 'development',
        total: routes.length,
        development_settings: {
            rate_limiting: {
                general: '1000 requests per 2 minutes',
                auth: '50 attempts per minute'
            },
            security: 'development-relaxed',
            cors: 'all-localhost-origins',
            validation: 'lenient'
        },
        routes: routes,
        timestamp: new Date().toISOString()
    });
});

// Global 404 handler with development info
app.use('*', (req, res) => {
    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    console.log(`❌ 404 - Endpoint not found: ${req.method} ${req.originalUrl} - IP: ${clientIP}`);
    
    res.status(404).json({
        error: "API endpoint nije pronađen",
        path: req.originalUrl,
        method: req.method,
        environment: isDevelopment ? 'development' : 'production',
        availableEndpoints: [
            'GET /',
            'GET /api/health',
            'POST /api/test-email',
            'GET /api/debug-routes',
            'POST /api/auth/instant-test',
            'GET /api/auth/health',
            'POST /api/auth/register',
            'POST /api/auth/login',
            'POST /api/auth/resend-verification',
            'POST /api/auth/activate (NEW)',
            'GET /api/auth/activate (legacy)',
            'POST /api/auth/check-status'
        ],
        timestamp: new Date().toISOString(),
        tip: isDevelopment ? 'Check /api/debug-routes for all available endpoints' : 'Production mode'
    });
});

// Global error handler with development details
app.use((error, req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    console.error('💥 Global error handler - IP:', clientIP, 'Error:', error.message);
    
    if (isDevelopment) {
        // Detailed errors in development
        res.status(500).json({
            error: "Development Server Error",
            message: error.message,
            stack: error.stack,
            environment: 'development',
            timestamp: new Date().toISOString(),
            requestId: Date.now().toString(36)
        });
    } else {
        // Generic errors in production
        res.status(500).json({
            error: "Internal server error",
            message: "Something went wrong",
            environment: 'production',
            timestamp: new Date().toISOString()
        });
    }
});

// Start development server
const PORT = process.env.PORT || 8888;
app.listen(PORT, '0.0.0.0', () => {
    console.log('\n==========================================');
    console.log('🚀 CRM BACKEND - DEVELOPMENT MODE ACTIVE!');
    console.log('==========================================');
    console.log(`📍 Port: ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`📧 MailCatcher: http://localhost:1080`);
    console.log(`🔧 Environment: DEVELOPMENT`);
    console.log('\n🛡️  DEVELOPMENT SECURITY SETTINGS:');
    console.log('   ✅ Relaxed Rate Limiting');
    console.log('   ✅ Development-friendly CORS');
    console.log('   ✅ Detailed Error Messages');
    console.log('   ✅ Lenient Validation');
    console.log('\n📊 RATE LIMITS (Development):');
    console.log('   📈 General: 1000 requests per 2 minutes');
    console.log('   🔐 Auth: 50 attempts per minute');
    console.log('   ⚠️  Production: Much stricter limits');
    console.log('\n📋 DEVELOPMENT ENDPOINTS:');
    console.log('   GET  /                    - API info with dev features');
    console.log('   GET  /api/health          - Health check with dev info');
    console.log('   POST /api/test-email      - Development email test');
    console.log('   GET  /api/debug-routes    - Development routes info');
    console.log('   POST /api/auth/instant-test - Development auth test');
    console.log('   GET  /api/auth/health     - Auth health with dev info');
    console.log('   POST /api/auth/register   - User registration ✅ WITH CORRECT ACTIVATION LINK');
    console.log('   POST /api/auth/login      - User login ✅ WITH VERIFICATION CHECK');
    console.log('   POST /api/auth/resend-verification - Resend activation email ✅ WITH CORRECT ACTIVATION LINK');
    console.log('   POST /api/auth/activate   - Account activation ✅ FIXED - JSON RESPONSE');
    console.log('   GET  /api/auth/activate   - Account activation ✅ LEGACY - for backward compatibility');
    console.log('   POST /api/auth/check-status - Check account status');
    console.log('\n🔗 ACTIVATION LINKS NOW POINT TO: http://localhost:5173/activate');
    console.log('==========================================\n');
});

export default app;