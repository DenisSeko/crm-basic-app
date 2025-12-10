// services/EmailService.js - AŽURIRANO SA NOVIM SIGURNOSNIM FUNKCIONALNOSTIMA
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

    // ✅ AKTIVACIJSKI EMAIL ZA KORISNIKE KOJE KREIRA ADMIN (BEZ LOZINKE)
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
                    
                    <p>Kliknite na gumb ispod da aktivirate svoj račun.</p>
                    <p><strong>Nakon aktivacije bit ćete automatski prijavljeni i preusmjereni na CRM dashboard.</strong></p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${activationUrl}" 
                           style="background-color: #28a745; color: white; padding: 12px 24px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;
                                  font-size: 16px; font-weight: bold;">
                            🚀 Aktiviraj Račun
                        </a>
                    </div>
                    
                    <div style="background-color: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ffc107;">
                        <h4 style="color: #856404; margin-top: 0;">⚠️ Važna napomena:</h4>
                        <p style="color: #856404; margin-bottom: 0;">
                            Nakon aktivacije računa, bit ćete upućeni na stranicu za postavljanje lozinke.<br>
                            <strong>Sigurnosna lozinka vam je već generisana i dostupna je administratoru.</strong>
                        </p>
                    </div>
                    
                    <p>Ili kopirajte ovaj link u browser:</p>
                    <p style="background-color: #f1f3f4; padding: 12px; border-radius: 5px; 
                              word-break: break-all; font-size: 12px; border-left: 4px solid #28a745;">
                        ${activationUrl}
                    </p>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        <p style="font-size: 12px; color: #666;">
                            <strong>Napomena:</strong> Link za aktivaciju ističe za 24 sata.<br>
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

VAŽNA NAPOMENA:
Nakon aktivacije računa, bit ćete upućeni na stranicu za postavljanje lozinke.
Sigurnosna lozinka vam je već generisana i dostupna je administratoru.

Link za aktivaciju ističe za 24 sata.
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

    // ✅ NOVI: AKTIVACIJSKI EMAIL SA SETOVANJEM LOZINKE
    async sendActivationWithPasswordSetup(userEmail, activationToken, userName, adminName = 'Administrator') {
        console.log(`🚀 sendActivationWithPasswordSetup CALLED for: ${userEmail}`);
        
        if (!this.transporter) {
            console.error('❌ Transporter not available');
            return false;
        }
        
        if (!userEmail || !activationToken) {
            console.error('❌ Missing email or token');
            return false;
        }

        const setupPasswordUrl = `http://localhost:5173/set-password/${activationToken}`;
        
        const mailOptions = {
            from: '"CRM Demo Admin" <admin@crmdemo.com>',
            to: userEmail,
            subject: `Postavite svoju lozinku - CRM Demo`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Dobrodošli u CRM Demo, ${userName}! 👋</h2>
                    
                    <div style="background-color: #e8f4f8; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0; color: #31708f;">
                            <strong>Administrator ${adminName}</strong> kreirao vam je račun u CRM sustavu.
                        </p>
                    </div>
                    
                    <p>Kliknite na gumb ispod da postavite svoju lozinku i aktivirate račun:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${setupPasswordUrl}" 
                           style="background-color: #17a2b8; color: white; padding: 14px 28px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;
                                  font-size: 16px; font-weight: bold;">
                            🔐 Postavi Lozinku
                        </a>
                    </div>
                    
                    <div style="background-color: #d4edda; padding: 15px; border-radius: 6px; margin: 20px 0;">
                        <h4 style="color: #155724; margin-top: 0;">📝 Uputstvo:</h4>
                        <ol style="color: #155724;">
                            <li>Kliknite na gumb iznad</li>
                            <li>Postavite svoju sigurnu lozinku</li>
                            <li>Vaš račun će se automatski aktivirati</li>
                            <li>Bit ćete preusmjereni na CRM dashboard</li>
                        </ol>
                    </div>
                    
                    <div style="background-color: #f8d7da; padding: 15px; border-radius: 6px; margin: 20px 0;">
                        <p style="color: #721c24; margin: 0;">
                            <strong>⚠️ Sigurnosna napomena:</strong><br>
                            Administratoru je dostupna privremena lozinka, ali preporučujemo da postavite vlastitu.
                        </p>
                    </div>
                    
                    <p>Ili kopirajte ovaj link u browser:</p>
                    <p style="background-color: #f1f3f4; padding: 12px; border-radius: 5px; 
                              word-break: break-all; font-size: 12px; border-left: 4px solid #17a2b8;">
                        ${setupPasswordUrl}
                    </p>
                </div>
            `,
            text: `
Dobrodošli u CRM Demo, ${userName}!

Administrator ${adminName} kreirao vam je račun u CRM sustavu.

Postavite svoju lozinku na sljedećoj poveznici:
${setupPasswordUrl}

UPUTSTVO:
1. Kliknite na link iznad
2. Postavite svoju sigurnu lozinku
3. Vaš račun će se automatski aktivirati
4. Bit ćete preusmjereni na CRM dashboard

SIGURNOSNA NAPOMENA:
Administratoru je dostupna privremena lozinka, ali preporučujemo da postavite vlastitu.
            `
        };

        try {
            console.log('📤 Sending activation with password setup email...');
            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Activation with password setup email sent:', info.messageId);
            return true;
        } catch (error) {
            console.error('❌ Activation with password setup email failed:', error.message);
            return false;
        }
    }

    // ✅ NOVI: EMAIL ZA OBAVJEŠTAVANJE ADMINA O NOVOM KORISNIKU
    async sendAdminNotification(adminEmail, newUserEmail, newUserName, temporaryPassword) {
        console.log(`🚀 sendAdminNotification CALLED for admin: ${adminEmail}`);
        
        if (!this.transporter) {
            console.error('❌ Transporter not available');
            return false;
        }

        const mailOptions = {
            from: '"CRM Demo System" <system@crmdemo.com>',
            to: adminEmail,
            subject: `Novi korisnik kreiran - ${newUserName}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">📋 Novi korisnik kreiran</h2>
                    
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #dee2e6;">
                        <h3 style="color: #495057; margin-top: 0;">Podaci o korisniku:</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;"><strong>Ime:</strong></td>
                                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${newUserName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;"><strong>Email:</strong></td>
                                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${newUserEmail}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px;"><strong>Datum kreiranja:</strong></td>
                                <td style="padding: 8px;">${new Date().toLocaleString()}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px dashed #ffc107;">
                        <h3 style="color: #856404; margin-top: 0;">🔐 Privremena lozinka</h3>
                        <p style="color: #856404; font-size: 14px; margin-bottom: 10px;">
                            Ova lozinka je generisana za novog korisnika. Prikazuje se samo jednom.
                        </p>
                        <div style="background-color: white; padding: 15px; border-radius: 4px; margin: 15px 0;">
                            <code style="font-size: 18px; font-weight: bold; color: #dc3545; letter-spacing: 1px;">
                                ${temporaryPassword}
                            </code>
                        </div>
                        <button onclick="navigator.clipboard.writeText('${temporaryPassword}')" 
                                style="background-color: #6c757d; color: white; border: none; padding: 8px 16px; 
                                       border-radius: 4px; cursor: pointer; font-size: 14px;">
                            📋 Kopiraj lozinku
                        </button>
                    </div>
                    
                    <div style="background-color: #d1ecf1; padding: 15px; border-radius: 6px; margin: 20px 0;">
                        <h4 style="color: #0c5460; margin-top: 0;">ℹ️ Sigurnosne napomene:</h4>
                        <ul style="color: #0c5460; font-size: 13px;">
                            <li>Ova lozinka se prikazuje samo jednom u ovom emailu</li>
                            <li>Korisnik će morati promijeniti lozinku pri prvoj prijavi</li>
                            <li>Nikad ne šaljite lozinku putem emaila korisniku</li>
                            <li>Preporučite korisniku da koristi menadžer lozinki</li>
                        </ul>
                    </div>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        <p style="font-size: 12px; color: #666;">
                            <strong>Napomena:</strong> Ovaj email je automatski generisan.<br>
                            Privremenu lozinku možete resetovati u admin panelu ako je potrebno.
                        </p>
                    </div>
                </div>
            `,
            text: `
NOVI KORISNIK KREIRAN

Podaci o korisniku:
-------------------
Ime: ${newUserName}
Email: ${newUserEmail}
Datum: ${new Date().toLocaleString()}

PRIVREMENA LOZINKA:
-------------------
${temporaryPassword}

SIGURNOSNE NAPOMENE:
- Ova lozinka se prikazuje samo jednom
- Korisnik će morati promijeniti lozinku pri prvoj prijavi
- Nikad ne šaljite lozinku putem emaila korisniku

Ovaj email je automatski generisan.
            `
        };

        try {
            console.log('📤 Sending admin notification email...');
            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Admin notification email sent:', info.messageId);
            return true;
        } catch (error) {
            console.error('❌ Admin notification email failed:', error.message);
            return false;
        }
    }

    // ✅ NOVI: EMAIL ZA OBAVJEŠTAVANJE KORISNIKA O POTREBI ZA PROMJENOM LOZINKE
    async sendPasswordChangeRequiredEmail(userEmail, userName, adminName = 'Administrator') {
        console.log(`🚀 sendPasswordChangeRequiredEmail CALLED for: ${userEmail}`);
        
        if (!this.transporter) {
            console.error('❌ Transporter not available');
            return false;
        }

        const loginUrl = `http://localhost:5173/login`;
        
        const mailOptions = {
            from: '"CRM Demo Security" <security@crmdemo.com>',
            to: userEmail,
            subject: `Zahtjev za promjenom lozinke - CRM Demo`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Zahtjev za promjenom lozinke 🔒</h2>
                    
                    <p>Poštovani ${userName},</p>
                    
                    <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                        <p style="color: #856404; margin: 0;">
                            <strong>Administrator ${adminName}</strong> je postavio zahtjev da promijenite svoju lozinku pri sljedećoj prijavi.
                        </p>
                    </div>
                    
                    <p>Ovo je sigurnosna mjera koja se preduzima:</p>
                    <ul>
                        <li>Nakon perioda neaktivnosti</li>
                        <li>Kao dio redovnih sigurnosnih procedura</li>
                        <li>Prilikom podešavanja novog računa</li>
                    </ul>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${loginUrl}" 
                           style="background-color: #17a2b8; color: white; padding: 12px 24px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;">
                            🔑 Prijavi se i promijeni lozinku
                        </a>
                    </div>
                    
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
                        <h4 style="color: #495057; margin-top: 0;">💡 Preporuke za sigurnu lozinku:</h4>
                        <ul style="color: #495057; font-size: 14px;">
                            <li>Koristite najmanje 12 karaktera</li>
                            <li>Kombinujte velika i mala slova, brojeve i simbole</li>
                            <li>Ne koristite lične podatke (ime, datum rođenja)</li>
                            <li>Koristite jedinstvenu lozinku za CRM sistem</li>
                            <li>Razmislite o korištenju menadžera lozinki</li>
                        </ul>
                    </div>
                    
                    <p style="font-size: 14px; color: #666;">
                        Ako niste zatražili promjenu lozinke ili imate pitanja, kontaktirajte administratora.
                    </p>
                </div>
            `,
            text: `
ZAHTJEV ZA PROMJENOM LOZINKE

Poštovani ${userName},

Administrator ${adminName} je postavio zahtjev da promijenite svoju lozinku pri sljedećoj prijavi.

Ovo je sigurnosna mjera koja se preduzima:
- Nakon perioda neaktivnosti
- Kao dio redovnih sigurnosnih procedura
- Prilikom podešavanja novog računa

Prijavite se i promijenite lozinku na:
${loginUrl}

PREPORUKE ZA SIGURNU LOZINKU:
- Koristite najmanje 12 karaktera
- Kombinujte velika i mala slova, brojeve i simbole
- Ne koristite lične podatke
- Koristite jedinstvenu lozinku za CRM sistem

Ako niste zatražili promjenu lozinke, kontaktirajte administratora.
            `
        };

        try {
            console.log('📤 Sending password change required email...');
            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Password change required email sent:', info.messageId);
            return true;
        } catch (error) {
            console.error('❌ Password change required email failed:', error.message);
            return false;
        }
    }

    // ✅ WELCOME EMAIL NAKON VERIFIKACIJE I POSTAVLJANJA LOZINKE
    async sendWelcomeEmail(userEmail, userName) {
        console.log(`🚀 sendWelcomeEmail CALLED for: ${userEmail}`);
        
        if (!this.transporter) {
            console.error('❌ Transporter not available');
            return false;
        }

        const mailOptions = {
            from: '"CRM Demo" <welcome@crmdemo.com>',
            to: userEmail,
            subject: 'Dobrodošli u CRM Demo! 🎉 Vaš račun je spreman',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Dobrodošli, ${userName}! 🎉</h2>
                    
                    <div style="background-color: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="color: #155724; margin: 0;">
                            <strong>✅ Vaš račun je uspješno aktiviran i lozinka je postavljena.</strong><br>
                            Sada možete koristiti sve funkcionalnosti CRM sistema.
                        </p>
                    </div>
                    
                    <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #2e7d32; margin-top: 0;">🚀 Što možete raditi:</h3>
                        <ul style="color: #2e7d32;">
                            <li>Dodavati i upravljati klijentima</li>
                            <li>Pisati bilješke za klijente</li>
                            <li>Pratiti aktivnosti i statistiku</li>
                            <li>Komunicirati s timom</li>
                            <li>Generisati izvještaje</li>
                            <li>Upravljati zadacima</li>
                        </ul>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="http://localhost:5173/dashboard" 
                           style="background-color: #28a745; color: white; padding: 14px 28px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;
                                  font-size: 16px; font-weight: bold;">
                            📊 Idi na Dashboard
                        </a>
                    </div>
                    
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
                        <h4 style="color: #495057; margin-top: 0;">🔒 Sigurnosni savjeti:</h4>
                        <ul style="color: #495057; font-size: 14px;">
                            <li>Nikad dijelite svoju lozinku</li>
                            <li>Odjavite se kada ne koristite sistem</li>
                            <li>Pravilno čuvajte podatke o klijentima</li>
                            <li>Prijavite svaku sumnjivu aktivnost</li>
                        </ul>
                    </div>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        <p style="font-size: 14px; color: #666;">
                            Ako imate bilo kakvih pitanja ili vam je potrebna pomoć,<br>
                            kontaktirajte naš tim za podršku na <strong>podrska@crmdemo.com</strong>
                        </p>
                    </div>
                </div>
            `,
            text: `
Dobrodošli, ${userName}! 🎉

Vaš račun je uspješno aktiviran i lozinka je postavljena.
Sada možete koristiti sve funkcionalnosti CRM sistema.

Što možete raditi:
• Dodavati i upravljati klijentima
• Pisati bilješke za klijente  
• Pratiti aktivnosti i statistiku
• Komunicirati s timom
• Generisati izvještaje
• Upravljati zadacima

Idi na Dashboard: http://localhost:5173/dashboard

SIGURNOSNI SAVJETI:
- Nikad dijelite svoju lozinku
- Odjavite se kada ne koristite sistem
- Pravilno čuvajte podatke o klijentima
- Prijavite svaku sumnjivu aktivnost

Ako imate pitanja, kontaktirajte podršku: podrska@crmdemo.com
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
            from: '"CRM Demo Security" <security@crmdemo.com>',
            to: userEmail,
            subject: 'Resetiranje lozinke - CRM Demo',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Resetiranje lozinke 🔑</h2>
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
                    
                    <div style="background-color: #f8d7da; padding: 15px; border-radius: 6px; margin: 20px 0;">
                        <p style="color: #721c24; margin: 0;">
                            <strong>⚠️ Sigurnosna napomena:</strong><br>
                            Ovaj link će istići za 1 sat. Ako niste zatražili resetiranje lozinke,<br>
                            <strong>ignorišite ovaj email i kontaktirajte administratora.</strong>
                        </p>
                    </div>
                    
                    <div style="background-color: #e8f4f8; padding: 15px; border-radius: 6px; margin: 20px 0;">
                        <h4 style="color: #31708f; margin-top: 0;">💡 Preporuke:</h4>
                        <ul style="color: #31708f; font-size: 14px;">
                            <li>Postavite jedinstvenu lozinku</li>
                            <li>Koristite menadžer lozinki</li>
                            <li>Omogućite 2FA ako je dostupno</li>
                            <li>Redovno ažurirajte lozinke</li>
                        </ul>
                    </div>
                </div>
            `,
            text: `
Resetiranje lozinke - CRM Demo

Poštovani ${userName},

Zatražili ste resetiranje lozinke za vaš CRM Demo račun.

Resetirajte lozinku na: ${resetUrl}

SIGURNOSNA NAPOMENA:
Ovaj link će istići za 1 sat. Ako niste zatražili resetiranje lozinke,
ignorišite ovaj email i kontaktirajte administratora.

PREPORUKE:
- Postavite jedinstvenu lozinku
- Koristite menadžer lozinki
- Omogućite 2FA ako je dostupno
- Redovno ažurirajte lozinke
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

    // ✅ PASSWORD CHANGED CONFIRMATION EMAIL
    async sendPasswordChangedConfirmation(userEmail, userName, changedAt = new Date()) {
        console.log(`🚀 sendPasswordChangedConfirmation CALLED for: ${userEmail}`);
        
        if (!this.transporter) {
            console.error('❌ Transporter not available');
            return false;
        }

        const formattedDate = changedAt.toLocaleString();
        
        const mailOptions = {
            from: '"CRM Demo Security" <security@crmdemo.com>',
            to: userEmail,
            subject: 'Potvrda promjene lozinke - CRM Demo',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Potvrda promjene lozinke ✅</h2>
                    
                    <div style="background-color: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="color: #155724; margin: 0;">
                            <strong>Vaša lozinka je uspješno promijenjena.</strong><br>
                            Vrijeme promjene: ${formattedDate}
                        </p>
                    </div>
                    
                    <p>Poštovani ${userName},</p>
                    <p>Ovo je potvrda da je lozinka za vaš CRM Demo račun promijenjena.</p>
                    
                    <div style="background-color: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0;">
                        <h4 style="color: #856404; margin-top: 0;">⚠️ Ako niste vi promijenili lozinku:</h4>
                        <ol style="color: #856404;">
                            <li>Odmah kontaktirajte administratora</li>
                            <li>Promijenite lozinku na drugim servisima ako ste koristili istu</li>
                            <li>Provjerite aktivnosti na svom računu</li>
                        </ol>
                    </div>
                    
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
                        <h4 style="color: #495057; margin-top: 0;">🔒 Sigurnosni savjeti:</h4>
                        <ul style="color: #495057; font-size: 14px;">
                            <li>Nikad dijelite svoju lozinku</li>
                            <li>Koristite jedinstvene lozinke za različite servise</li>
                            <li>Razmotrite korištenje menadžera lozinki</li>
                            <li>Redovno ažurirajte lozinke</li>
                        </ul>
                    </div>
                    
                    <p style="font-size: 14px; color: #666;">
                        Ako imate bilo kakvih pitanja ili primijetite sumnjivu aktivnost,<br>
                        odmah kontaktirajte podršku na <strong>podrska@crmdemo.com</strong>
                    </p>
                </div>
            `,
            text: `
POTVRDA PROMJENE LOZINKE

Vaša lozinka je uspješno promijenjena.
Vrijeme promjene: ${formattedDate}

Poštovani ${userName},

Ovo je potvrda da je lozinka za vaš CRM Demo račun promijenjena.

⚠️ AKO NISTE VI PROMIJENILI LOZINKU:
1. Odmah kontaktirajte administratora
2. Promijenite lozinku na drugim servisima ako ste koristili istu
3. Provjerite aktivnosti na svom računu

🔒 SIGURNOSNI SAVJETI:
- Nikad dijelite svoju lozinku
- Koristite jedinstvene lozinke za različite servise
- Razmotrite korištenje menadžera lozinki
- Redovno ažurirajte lozinke

Za pitanja ili sumnjivu aktivnost: podrska@crmdemo.com
            `
        };

        try {
            console.log('📤 Sending password changed confirmation...');
            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Password changed confirmation sent:', info.messageId);
            return true;
        } catch (error) {
            console.error('❌ Password changed confirmation failed:', error.message);
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
                    <p><strong>Version:</strong> Enhanced Security v2.0</p>
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

    // ✅ NOVI: EMAIL ZA ADMINA O POKUŠAJU NEAUTORIZOVANE PROMJENE LOZINKE
    async sendSecurityAlertEmail(adminEmail, userEmail, userName, action, ipAddress, timestamp = new Date()) {
        console.log(`🚀 sendSecurityAlertEmail CALLED for admin: ${adminEmail}`);
        
        if (!this.transporter) {
            console.error('❌ Transporter not available');
            return false;
        }

        const formattedTime = timestamp.toLocaleString();
        
        const mailOptions = {
            from: '"CRM Demo Security Alert" <security-alert@crmdemo.com>',
            to: adminEmail,
            subject: `🚨 SIGURNOSNA UPOZORENJE: ${action} - ${userName}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #dc3545;">
                        <h2 style="color: #721c24; margin-top: 0;">🚨 SIGURNOSNA UPOZORENJE</h2>
                        <p style="color: #721c24; font-size: 16px;">
                            Detektovana je potencijalno neautorizovana aktivnost na korisničkom računu.
                        </p>
                    </div>
                    
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #dee2e6;">
                        <h3 style="color: #495057; margin-top: 0;">📋 Detalji aktivnosti:</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;"><strong>Akcija:</strong></td>
                                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${action}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;"><strong>Korisnik:</strong></td>
                                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${userName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;"><strong>Email:</strong></td>
                                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${userEmail}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;"><strong>IP Adresa:</strong></td>
                                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${ipAddress}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px;"><strong>Vrijeme:</strong></td>
                                <td style="padding: 8px;">${formattedTime}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <div style="background-color: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0;">
                        <h4 style="color: #856404; margin-top: 0;">🚨 Preporučene akcije:</h4>
                        <ol style="color: #856404;">
                            <li>Kontaktirajte korisnika da potvrdi aktivnost</li>
                            <li>Provjerite logove za dodatne detalje</li>
                            <li>Blokirajte račun ako je sumnjiva aktivnost potvrđena</li>
                            <li>Resetujte lozinku ako je potrebno</li>
                            <li>Obavijestite korisnika o sigurnosnim procedurama</li>
                        </ol>
                    </div>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        <p style="font-size: 12px; color: #666;">
                            <strong>Napomena:</strong> Ovo je automatski generisano sigurnosno upozorenje.<br>
                            Ako ova aktivnost nije autorizovana, preduzmite odgovarajuće mjere.
                        </p>
                    </div>
                </div>
            `,
            text: `
🚨 SIGURNOSNA UPOZORENJE

Detektovana je potencijalno neautorizovana aktivnost na korisničkom računu.

DETALJI AKTIVNOSTI:
-------------------
Akcija: ${action}
Korisnik: ${userName}
Email: ${userEmail}
IP Adresa: ${ipAddress}
Vrijeme: ${formattedTime}

PREPORUČENE AKCIJE:
1. Kontaktirajte korisnika da potvrdi aktivnost
2. Provjerite logove za dodatne detalje
3. Blokirajte račun ako je sumnjiva aktivnost potvrđena
4. Resetujte lozinku ako je potrebno
5. Obavijestite korisnika o sigurnosnim procedurama

Ovo je automatski generisano sigurnosno upozorenje.
            `
        };

        try {
            console.log('📤 Sending security alert email...');
            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Security alert email sent:', info.messageId);
            return true;
        } catch (error) {
            console.error('❌ Security alert email failed:', error.message);
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
console.log('   - sendActivationWithPasswordSetup (NEW)');
console.log('   - sendAdminNotification (NEW)');
console.log('   - sendPasswordChangeRequiredEmail (NEW)');
console.log('   - sendWelcomeEmail');
console.log('   - sendPasswordResetEmail');
console.log('   - sendPasswordChangedConfirmation (NEW)');
console.log('   - sendSecurityAlertEmail (NEW)');
console.log('   - sendTestEmail');

export default emailServiceInstance;