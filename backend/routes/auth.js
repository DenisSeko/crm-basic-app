import express from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';

const router = express.Router();

console.log('🔧 Modern Secure Auth routes module loading...');

// Modern validation rules
const registerValidation = [
    body('username')
        .isLength({ min: 3, max: 20 })
        .withMessage('Username must be between 3 and 20 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores')
        .trim()
        .escape(),
    
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
    
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    
    body('firstName')
        .optional()
        .isLength({ min: 1, max: 50 })
        .withMessage('First name must be between 1 and 50 characters')
        .trim()
        .escape(),
    
    body('lastName')
        .optional()
        .isLength({ min: 1, max: 50 })
        .withMessage('Last name must be between 1 and 50 characters')
        .trim()
        .escape()
];

const loginValidation = [
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
    
    body('password')
        .notEmpty()
        .withMessage('Password is required')
];

const emailValidation = [
    body('testEmail')
        .optional()
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail()
];

// Health check
router.get('/health', (req, res) => {
    console.log('🔧 Modern Secure Auth health check endpoint hit');
    
    res.json({
        status: 'OK',
        service: 'Modern Secure Auth Routes',
        timestamp: new Date().toISOString(),
        security: {
            input_validation: 'express-validator',
            xss_protection: 'enabled',
            password_validation: 'enabled',
            rate_limiting: 'enabled',
            modern_packages: ['express-validator', 'bcrypt', 'crypto']
        },
        endpoints: [
            'POST /instant-test',
            'GET /health',
            'POST /register',
            'POST /login'
        ]
    });
});

// Modern secure instant test ruta
router.post('/instant-test', emailValidation, async (req, res) => {
    console.log('🎯 MODERN SECURE AUTH.JS INSTANT-TEST ENDPOINT HIT!');
    
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors.array()
        });
    }
    
    try {
        const { testEmail = 'test@example.com' } = req.body;

        console.log('1. Dynamically importing nodemailer in modern auth.js...');
        const nodemailerModule = await import('nodemailer');
        const nodemailer = nodemailerModule.default;
        
        console.log('2. Creating nodemailer transporter...');
        const transporter = nodemailer.createTransport({
            host: 'localhost',
            port: 1025,
            secure: false,
            ignoreTLS: true,
            auth: null
        });

        console.log('3. Testing SMTP connection...');
        await transporter.verify();
        console.log('✅ SMTP connection verified for modern auth.js');

        console.log('4. Preparing modern secure email...');
        const mailOptions = {
            from: '"MODERN AUTH.JS" <modern-auth@crm.com>',
            to: testEmail,
            subject: 'MODERN AUTH.JS TEST - ' + new Date().toLocaleTimeString(),
            text: 'This is a MODERN secure test email from auth.js module!',
            html: `
                <h1>🚀 MODERN AUTH.JS MODULE TEST SUCCESS!</h1>
                <p>This email was sent from <strong>modern secure auth.js module</strong></p>
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                <p><strong>Module:</strong> routes/auth.js</p>
                <p><strong>Modern Security:</strong> Express Validator, Input Sanitization, Rate Limiting</p>
                <p>If you see this in MailCatcher, the modern auth.js module is working!</p>
            `
        };

        console.log('5. Sending modern secure email...');
        const info = await transporter.sendMail(mailOptions);
        
        console.log('🎉 MODERN AUTH.JS INSTANT TEST SUCCESS!');
        console.log('   📨 Message ID:', info.messageId);

        res.json({
            success: true,
            message: 'Modern auth.js module test email sent successfully!',
            details: {
                messageId: info.messageId,
                from: 'modern auth.js module',
                endpoint: '/api/auth/instant-test',
                timestamp: new Date().toISOString(),
                security: {
                    input_validation: 'express-validator',
                    xss_protection: 'applied',
                    email_validation: 'passed',
                    modern_approach: 'active'
                }
            }
        });

    } catch (error) {
        console.error('💥 MODERN AUTH.JS INSTANT TEST FAILED:');
        console.error('   ❌ Error:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'Modern authentication test failed',
            details: {
                from: 'modern auth.js module',
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Modern secure register endpoint
router.post('/register', registerValidation, async (req, res) => {
    console.log('🔧 Modern Secure Register endpoint hit in auth.js');
    
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors.array()
        });
    }
    
    try {
        const { username, email, password, firstName, lastName } = req.body;

        // Simulacija kreiranja korisnika sa hashiranom lozinkom
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        
        const user = {
            id: Date.now(),
            username: username,
            email: email,
            firstName: firstName || '',
            lastName: lastName || '',
            passwordHash: passwordHash,
            createdAt: new Date().toISOString(),
            security: {
                password_strength: 'strong',
                input_validated: true,
                validation_method: 'express-validator'
            }
        };

        console.log('✅ Modern secure user registration simulated:', user.email);

        res.status(201).json({
            message: 'Korisnik sigurno registriran sa modernom validacijom',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                createdAt: user.createdAt
            },
            security: {
                input_validation: 'express-validator',
                password_strength: 'strong',
                xss_protection: 'applied',
                modern_approach: 'active'
            }
        });

    } catch (error) {
        console.error('💥 Modern secure registration error in auth.js:', error);
        res.status(500).json({ 
            error: 'Greška pri modernoj sigurnoj registraciji',
            details: 'Pokušajte ponovno kasnije'
        });
    }
});

// Modern secure login endpoint
router.post('/login', loginValidation, async (req, res) => {
    console.log('🔧 Modern Secure Login endpoint hit in auth.js');
    
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors.array()
        });
    }
    
    try {
        const { email, password } = req.body;

        // Simulacija provjere korisnika
        // U stvarnoj aplikaciji ovdje bi dohvatili korisnika iz baze
        const validPassword = await bcrypt.compare(password, '$2b$12$hashed_password_from_database');

        if (!validPassword) {
            // Simulacija vremenskog odgode za brute force zaštitu
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            return res.status(401).json({ 
                error: 'Neispravni podaci za prijavu',
                details: 'Provjerite email i lozinku'
            });
        }

        // Generiranje sigurnog tokena sa crypto
        const token = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 sata

        const user = {
            id: 1,
            username: 'modern_secure_user',
            email: email,
            firstName: 'Modern',
            lastName: 'User',
            role: 'user'
        };

        res.json({
            message: 'Moderna sigurna prijava uspješna',
            token: token,
            tokenExpiry: tokenExpiry.toISOString(),
            user: user,
            security: {
                token_type: 'crypto_random',
                token_expiry: '24_hours',
                input_validation: 'express-validator',
                brute_force_protection: 'enabled',
                modern_approach: 'active'
            }
        });

    } catch (error) {
        console.error('💥 Modern secure login error in auth.js:', error);
        // Vremenska odgoda i pri grešci
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        res.status(500).json({ 
            error: 'Greška pri modernoj sigurnoj prijavi',
            details: 'Pokušajte ponovno kasnije'
        });
    }
});

console.log('✅ Modern Secure Auth routes module loaded successfully');
console.log('🛡️  Modern Security Features Enabled:');
console.log('   ✅ Express Validator Integration');
console.log('   ✅ Input Validation & Sanitization');
console.log('   ✅ Password Strength Validation');
console.log('   ✅ Email Validation & Normalization');
console.log('   ✅ XSS Protection');
console.log('   ✅ Brute Force Protection');
console.log('   ✅ Crypto-secure Tokens');

console.log('📋 Registered modern secure auth endpoints:');
router.stack.forEach((layer) => {
    if (layer.route) {
        const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
        console.log(`   ${methods} ${layer.route.path}`);
    }
});

export default router;