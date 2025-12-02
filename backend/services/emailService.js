// services/EmailService.js - AŽURIRANO S ACTIVATION EMAIL METODOM
import nodemailer from 'nodemailer';

console.log('📧 EmailService module loading with ES Modules...');

class EmailService {
    constructor() {
        console.log('🔄 EmailService constructor called');
        
        const smtpHost = process.env.EMAIL_HOST || 'localhost';
        const smtpPort = process.env.EMAIL_PORT || 1025;
        
        console.log(`🔧 Email config: ${smtpHost}:${smtpPort}`);
        console.log(`🔧 Environment: EMAIL_HOST=${process.env.EMAIL_HOST}, EMAIL_PORT=${process.env.EMAIL_PORT}`);
        
        try {
            this.transporter = nodemailer.createTransport({
                host: smtpHost,
                port: smtpPort,
                secure: false,
                ignoreTLS: true,
                auth: null,
                connectionTimeout: 10000,
                socketTimeout: 10000
            });
            
            console.log('✅ Transporter created successfully');
            
            // Test connection
            this.testConnection();
            
        } catch (error) {
            console.error('❌ Failed to create transporter:', error.message);
            this.transporter = null;
        }
    }
    
    async testConnection() {
        if (!this.transporter) {
            console.error('❌ No transporter available for connection test');
            return false;
        }
        
        try {
            console.log('🔌 Testing SMTP connection...');
            await this.transporter.verify();
            console.log('✅ SMTP connection test PASSED');
            return true;
        } catch (error) {
            console.error('❌ SMTP connection test FAILED:', error.message);
            return false;
        }
    }

    // ✅ VERIFIKACIJSKI EMAIL ZA KORISNIKE KOJI SE SAMI REGISTRIRAJU
    async sendVerificationEmail(userEmail, verificationToken) {
        console.log(`🚀 sendVerificationEmail CALLED for: ${userEmail}`);
        
        if (!this.transporter) {
            console.error('❌ Transporter not available - email cannot be sent');
            return false;
        }
        
        if (!userEmail || !verificationToken) {
            console.error('❌ Missing email or token:', { userEmail, verificationToken });
            return false;
        }

        const verificationUrl = `http://localhost:8888/api/auth/verify/${verificationToken}`;
        
        const mailOptions = {
            from: '"CRM Demo" <noreply@crmdemo.com>',
            to: userEmail,
            subject: 'Verifikacija email adrese - CRM Demo',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Dobrodošli u CRM Demo! 👋</h2>
                    <p>Hvala vam što ste se registrirali. Kliknite na gumb ispod da verifirate svoju email adresu:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verificationUrl}" 
                           style="background-color: #007bff; color: white; padding: 12px 24px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;">
                            ✅ Verificiraj Email
                        </a>
                    </div>
                    <p>Ili kopirajte ovaj link u browser:</p>
                    <p style="background-color: #f8f9fa; padding: 10px; border-radius: 5px; 
                              word-break: break-all; font-size: 12px;">
                        ${verificationUrl}
                    </p>
                </div>
            `,
            text: `Verificirajte svoj email: ${verificationUrl}`
        };

        try {
            console.log('📤 Sending verification email...');
            const info = await this.transporter.sendMail(mailOptions);
            
            console.log('✅ Verification email sent successfully!');
            console.log('   📨 Message ID:', info.messageId);
            console.log('   ✅ Accepted:', info.accepted);
            
            return true;
        } catch (error) {
            console.error('❌ Verification email send failed:');
            console.error('   💥 Error:', error.message);
            console.error('   🔧 Code:', error.code);
            
            return false;
        }
    }

    // ✅ AKTIVACIJSKI EMAIL ZA KORISNIKE KOJE KREIRA ADMIN
    async sendActivationEmail(userEmail, activationToken, userName, adminName = 'Administrator') {
        console.log(`🚀 sendActivationEmail CALLED for: ${userEmail}`);
        console.log(`   👤 User: ${userName}`);
        console.log(`   👨‍💼 Admin: ${adminName}`);
        
        if (!this.transporter) {
            console.error('❌ Transporter not available - email cannot be sent');
            return false;
        }
        
        if (!userEmail || !activationToken) {
            console.error('❌ Missing email or token:', { userEmail, activationToken });
            return false;
        }

        const activationUrl = `http://localhost:8888/api/auth/verify/${activationToken}`;
        
        const mailOptions = {
            from: '"CRM Demo Admin" <admin@crmdemo.com>',
            to: userEmail,
            subject: `Aktivacija računa - CRM Demo`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Dobrodošli u CRM Demo, ${userName}! 👋</h2>
                    
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0; color: #666;">
                            <strong>Administrator ${adminName}</strong> kreirao vam je račun u CRM sustavu.
                        </p>
                    </div>
                    
                    <p>Kliknite na gumb ispod da aktivirate svoj račun i postavite lozinku:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${activationUrl}" 
                           style="background-color: #28a745; color: white; padding: 12px 24px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;
                                  font-size: 16px; font-weight: bold;">
                            🚀 Aktiviraj Račun
                        </a>
                    </div>
                    
                    <p>Ili kopirajte ovaj link u browser:</p>
                    <p style="background-color: #f1f3f4; padding: 12px; border-radius: 5px; 
                              word-break: break-all; font-size: 12px; border-left: 4px solid #28a745;">
                        ${activationUrl}
                    </p>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        <p style="font-size: 12px; color: #666;">
                            <strong>Napomena:</strong> Nakon aktivacije možete se prijaviti u sustav.<br>
                            Ako niste očekivali ovaj email, kontaktirajte administratora.
                        </p>
                    </div>
                </div>
            `,
            text: `
Dobrodošli u CRM Demo, ${userName}!

Administrator ${adminName} kreirao vam je račun u CRM sustavu.

Aktivirajte svoj račun na sljedećoj poveznici:
${activationUrl}

Nakon aktivacije možete se prijaviti u sustav.

Ako niste očekivali ovaj email, kontaktirajte administratora.
            `
        };

        try {
            console.log('📤 Sending activation email...');
            const info = await this.transporter.sendMail(mailOptions);
            
            console.log('✅ Activation email sent successfully!');
            console.log('   📨 Message ID:', info.messageId);
            console.log('   👤 To:', userEmail);
            console.log('   ✅ Accepted:', info.accepted);
            
            return true;
        } catch (error) {
            console.error('❌ Activation email send failed:');
            console.error('   💥 Error:', error.message);
            console.error('   🔧 Code:', error.code);
            
            return false;
        }
    }

    // ✅ WELCOME EMAIL NAKON VERIFIKACIJE
    async sendWelcomeEmail(userEmail, userName) {
        console.log(`🚀 sendWelcomeEmail CALLED for: ${userEmail}`);
        
        if (!this.transporter) {
            console.error('❌ Transporter not available');
            return false;
        }

        const mailOptions = {
            from: '"CRM Demo" <noreply@crmdemo.com>',
            to: userEmail,
            subject: 'Dobrodošli u CRM Demo! 🎉',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Dobrodošli, ${userName}! 🎉</h2>
                    <p>Vaš račun je uspješno verificiran i spreman je za korištenje.</p>
                    
                    <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #2e7d32; margin-top: 0;">Što možete raditi:</h3>
                        <ul style="color: #2e7d32;">
                            <li>Dodavati i upravljati klijentima</li>
                            <li>Pisati bilješke za klijente</li>
                            <li>Pratiti aktivnosti i statistiku</li>
                            <li>Komunicirati s timom</li>
                        </ul>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="http://localhost:5173/login" 
                           style="background-color: #007bff; color: white; padding: 12px 24px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;
                                  font-size: 16px;">
                            🚀 Prijavi se u CRM
                        </a>
                    </div>
                    
                    <p style="font-size: 14px; color: #666;">
                        Ako imate bilo kakvih pitanja, slobodno kontaktirajte naš tim za podršku.
                    </p>
                </div>
            `,
            text: `
Dobrodošli, ${userName}! 🎉

Vaš račun je uspješno verificiran i spreman je za korištenje.

Što možete raditi:
• Dodavati i upravljati klijentima
• Pisati bilješke za klijente  
• Pratiti aktivnosti i statistiku
• Komunicirati s timom

Prijavite se u CRM: http://localhost:5173/login

Ako imate bilo kakvih pitanja, kontaktirajte naš tim za podršku.
            `
        };

        try {
            console.log('📤 Sending welcome email...');
            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Welcome email sent:', info.messageId);
            return true;
        } catch (error) {
            console.error('❌ Welcome email failed:', error.message);
            return false;
        }
    }

    // ✅ PASSWORD RESET EMAIL
    async sendPasswordResetEmail(userEmail, resetToken, userName) {
        console.log(`🚀 sendPasswordResetEmail CALLED for: ${userEmail}`);
        
        if (!this.transporter) {
            console.error('❌ Transporter not available');
            return false;
        }

        const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;
        
        const mailOptions = {
            from: '"CRM Demo" <noreply@crmdemo.com>',
            to: userEmail,
            subject: 'Resetiranje lozinke - CRM Demo',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Resetiranje lozinke</h2>
                    <p>Poštovani ${userName},</p>
                    <p>Zatražili ste resetiranje lozinke za vaš CRM Demo račun.</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" 
                           style="background-color: #dc3545; color: white; padding: 12px 24px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;">
                            🔑 Resetiraj Lozinku
                        </a>
                    </div>
                    
                    <p>Ili kopirajte ovaj link u browser:</p>
                    <p style="background-color: #f8f9fa; padding: 10px; border-radius: 5px; 
                              word-break: break-all; font-size: 12px;">
                        ${resetUrl}
                    </p>
                    
                    <p style="font-size: 12px; color: #666;">
                        <strong>Napomena:</strong> Ovaj link će istići za 1 sat.<br>
                        Ako niste zatražili resetiranje lozinke, zanemarite ovaj email.
                    </p>
                </div>
            `,
            text: `
Resetiranje lozinke - CRM Demo

Poštovani ${userName},

Zatražili ste resetiranje lozinke za vaš CRM Demo račun.

Resetirajte lozinku na: ${resetUrl}

Napomena: Ovaj link će istići za 1 sat.
Ako niste zatražili resetiranje lozinke, zanemarite ovaj email.
            `
        };

        try {
            console.log('📤 Sending password reset email...');
            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Password reset email sent:', info.messageId);
            return true;
        } catch (error) {
            console.error('❌ Password reset email failed:', error.message);
            return false;
        }
    }

    // ✅ TEST EMAIL
    async sendTestEmail() {
        console.log('🧪 sendTestEmail CALLED');
        
        if (!this.transporter) {
            console.error('❌ Transporter not available for test');
            return false;
        }

        const mailOptions = {
            from: '"CRM Test" <test@crm.com>',
            to: 'test@example.com',
            subject: 'TEST Email - ' + new Date().toLocaleTimeString(),
            text: 'This is a test email from CRM backend.',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #333;">TEST Email</h1>
                    <p>This is a test email from CRM backend.</p>
                    <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
                    <p><strong>Service:</strong> EmailService</p>
                </div>
            `
        };

        try {
            console.log('📤 Sending test email...');
            const info = await this.transporter.sendMail(mailOptions);
            console.log('🎉 Test email sent!');
            console.log('   📨 Message ID:', info.messageId);
            console.log('   ✅ Accepted:', info.accepted);
            return true;
        } catch (error) {
            console.error('💥 Test email failed:', error.message);
            return false;
        }
    }
}

console.log('✅ Creating EmailService instance...');
const emailServiceInstance = new EmailService();
console.log('✅ EmailService instance created');

// Log available methods
console.log('📧 Available EmailService methods:');
console.log('   - sendVerificationEmail');
console.log('   - sendActivationEmail'); 
console.log('   - sendWelcomeEmail');
console.log('   - sendPasswordResetEmail');
console.log('   - sendTestEmail');

export default emailServiceInstance;