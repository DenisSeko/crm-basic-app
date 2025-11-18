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
                    <p>Sada možete:</p>
                    <ul>
                        <li>Dodavati i upravljati klijentima</li>
                        <li>Pisati bilješke za klijente</li>
                        <li>Pratiti statistiku</li>
                    </ul>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="http://localhost:5173/login" 
                           style="background-color: #28a745; color: white; padding: 12px 24px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;">
                            🚀 Prijavi se
                        </a>
                    </div>
                </div>
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
            html: '<h1>TEST Email</h1><p>This is a test email from CRM backend.</p>'
        };

        try {
            console.log('📤 Sending test email...');
            const info = await this.transporter.sendMail(mailOptions);
            console.log('🎉 Test email sent!');
            console.log('   📨 Message ID:', info.messageId);
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

export default emailServiceInstance;