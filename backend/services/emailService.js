// services/EmailService.js - KOMPLETNO AŽURIRANO SA ISPRAVNIM PASSWORD RESET TOKENIMA
import nodemailer from 'nodemailer';

console.log('📧 EmailService modul se učitava s ES modulima...');

class EmailService {
    constructor() {
        console.log('🔄 EmailService konstruktor pozvan');
        
        const smtpHost = process.env.EMAIL_HOST || 'localhost';
        const smtpPort = process.env.EMAIL_PORT || 1025;
        
        console.log(`🔧 Email konfiguracija: ${smtpHost}:${smtpPort}`);
        console.log(`🔧 Okruženje: EMAIL_HOST=${process.env.EMAIL_HOST}, EMAIL_PORT=${process.env.EMAIL_PORT}`);
        
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
            
            console.log('✅ Transporter uspješno kreiran');
            
            // Testiraj vezu
            this.testConnection();
            
        } catch (error) {
            console.error('❌ Neuspješno kreiranje transportera:', error.message);
            this.transporter = null;
        }
    }
    
    async testConnection() {
        if (!this.transporter) {
            console.error('❌ Transporter nije dostupan za test veze');
            return false;
        }
        
        try {
            console.log('🔌 Testiranje SMTP veze...');
            await this.transporter.verify();
            console.log('✅ SMTP test veze PROŠAO');
            return true;
        } catch (error) {
            console.error('❌ SMTP test veze PAO:', error.message);
            return false;
        }
    }

    // ============ GLASNAČKA METODA ZA PASSWORD RESET ============
    // Ovo je metoda koju backend poziva s PRAVIM tokenom iz baze
    async sendPasswordResetEmailSimple(toEmail, resetToken, userName) {
        console.log(`🚀 sendPasswordResetEmailSimple POZVAN za: ${toEmail}`);
        console.log(`🔐 Token koji se šalje: ${resetToken.substring(0, 15)}...`);
        console.log(`🔐 Dužina tokena: ${resetToken.length} znakova`);
        
        if (!this.transporter) {
            console.log('📧 Razvojni mod: Simulacija reset emaila');
            // 🔴 ISPRAVAN LINK: koristi /change-password?token=
            const resetLink = `http://localhost:5173/change-password?token=${resetToken}`;
            console.log(`🔗 Reset link za ${toEmail}: ${resetLink}`);
            console.log(`🔍 Token u linku: ${resetToken}`);
            console.log(`📝 Tip tokena: ${typeof resetToken}`);
            console.log(`🔍 Početak tokena: ${resetToken.substring(0, 20)}`);
            console.log(`🔍 Kraj tokena: ${resetToken.substring(resetToken.length - 20)}`);
            
            // Dodatne informacije za debug
            console.log('\n📊 DEBUG INFO:');
            console.log(`   Email: ${toEmail}`);
            console.log(`   User: ${userName}`);
            console.log(`   Link: ${resetLink}`);
            console.log(`   Validan hex? ${/^[0-9a-fA-F]+$/.test(resetToken) ? 'DA' : 'NE'}`);
            
            return true;
        }
        
        if (!toEmail || !resetToken) {
            console.error('❌ Nedostaje email ili token:', { 
                toEmail, 
                hasToken: !!resetToken,
                tokenLength: resetToken?.length,
                tokenSample: resetToken?.substring(0, 10) 
            });
            return false;
        }

        // 🔴 ISPRAVAN FRONTEND URL: /change-password?token=
        const resetLink = `http://localhost:5173/change-password?token=${resetToken}`;
        
        console.log('📧 Generiran reset link:', resetLink);
        
        const mailOptions = {
            from: '"CRM Sustav" <security@crm.com>',
            to: toEmail,
            subject: '🔐 Resetiranje lozinke - CRM Sustav',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Resetiranje lozinke</title>
                    <style>
                        body { 
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                            line-height: 1.6; 
                            color: #333; 
                            margin: 0; 
                            padding: 0; 
                            background-color: #f5f5f5;
                        }
                        .container { 
                            max-width: 600px; 
                            margin: 0 auto; 
                            background-color: #ffffff; 
                            border-radius: 10px;
                            overflow: hidden;
                            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                        }
                        .header { 
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                            padding: 40px 30px; 
                            text-align: center; 
                            color: white; 
                        }
                        .content { 
                            padding: 40px 30px; 
                        }
                        .logo { 
                            font-size: 32px; 
                            font-weight: bold; 
                            margin-bottom: 10px; 
                        }
                        .button { 
                            display: inline-block; 
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                            color: white; 
                            text-decoration: none; 
                            padding: 16px 32px; 
                            border-radius: 8px; 
                            font-weight: bold; 
                            font-size: 18px; 
                            text-align: center; 
                            margin: 25px 0; 
                            box-shadow: 0 4px 6px rgba(50, 50, 93, 0.11); 
                            transition: transform 0.2s, box-shadow 0.2s;
                        }
                        .button:hover {
                            transform: translateY(-2px);
                            box-shadow: 0 7px 14px rgba(50, 50, 93, 0.1);
                        }
                        .info-box { 
                            background-color: #f8f9fa; 
                            border-left: 4px solid #17a2b8; 
                            padding: 20px; 
                            margin: 25px 0; 
                            border-radius: 6px; 
                        }
                        .warning-box { 
                            background-color: #fff3cd; 
                            border-left: 4px solid #ffc107; 
                            padding: 20px; 
                            margin: 25px 0; 
                            border-radius: 6px; 
                        }
                        .footer { 
                            background-color: #f8f9fa; 
                            padding: 25px; 
                            text-align: center; 
                            color: #666; 
                            font-size: 14px; 
                            border-top: 1px solid #eee; 
                        }
                        .code { 
                            background-color: #f1f3f4; 
                            padding: 15px; 
                            border-radius: 6px; 
                            font-family: 'Courier New', monospace; 
                            word-break: break-all; 
                            font-size: 14px; 
                            margin: 20px 0; 
                            border: 1px dashed #ddd; 
                            color: #333;
                        }
                        .user-info { 
                            background-color: #e8f4f8; 
                            padding: 20px; 
                            border-radius: 8px; 
                            margin: 20px 0; 
                        }
                        ul { 
                            margin: 15px 0; 
                            padding-left: 25px; 
                        }
                        li { 
                            margin-bottom: 10px; 
                        }
                        h2 {
                            color: #333;
                            margin-top: 0;
                        }
                        .token-info {
                            background-color: #f8f9fa;
                            padding: 10px;
                            border-radius: 5px;
                            margin: 10px 0;
                            font-size: 12px;
                            color: #666;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <div class="logo">🔐 CRM Sustav</div>
                            <p style="font-size: 18px; opacity: 0.9; margin: 5px 0;">Resetiranje lozinke</p>
                        </div>
                        
                        <div class="content">
                            <h2>Zdravo ${userName || 'korisniče'}!</h2>
                            
                            <div class="user-info">
                                <p style="margin: 0; color: #31708f; font-size: 16px;">
                                    <strong>Primili smo zahtjev za resetiranjem lozinke za vaš CRM račun.</strong>
                                </p>
                            </div>
                            
                            <p>Kliknite na gumb ispod da resetirate svoju lozinku:</p>
                            
                            <div style="text-align: center;">
                                <a href="${resetLink}" class="button">🔐 Resetiraj Lozinku</a>
                            </div>
                            
                            <p>Ako gumb ne radi, kopirajte ovaj link u preglednik:</p>
                            <div class="code">${resetLink}</div>
                            
                            <div class="info-box">
                                <h4 style="color: #0c5460; margin-top: 0;">📋 Upute za resetiranje:</h4>
                                <ol>
                                    <li><strong>Kliknite na gumb "Resetiraj Lozinku" iznad</strong></li>
                                    <li>Unesite novu lozinku (najmanje 8 znakova)</li>
                                    <li>Potvrdite novu lozinku u drugom polju</li>
                                    <li>Kliknite "Resetiraj lozinku"</li>
                                    <li>Bit ćete preusmjereni na stranicu za prijavu</li>
                                </ol>
                            </div>
                            
                            <div class="warning-box">
                                <h4 style="color: #856404; margin-top: 0;">⚠️ Važne sigurnosne napomene:</h4>
                                <ul>
                                    <li>Ovaj link vrijedi <strong>60 minuta</strong></li>
                                    <li>Link možete koristiti <strong>samo jednom</strong></li>
                                    <li>Ako <strong>niste zatražili</strong> resetiranje lozinke, ignoriraj te ovaj email</li>
                                    <li>Nikada ne dijelite ovaj link s drugima</li>
                                    <li>Ako sumnjate u sigurnost računa, kontaktirajte podršku</li>
                                </ul>
                            </div>
                            
                            <div style="background-color: #e8f5e8; padding: 20px; border-radius: 6px; margin: 25px 0;">
                                <h4 style="color: #2e7d32; margin-top: 0;">💡 Preporuke za sigurnu lozinku:</h4>
                                <ul>
                                    <li>Koristite najmanje 12 znakova</li>
                                    <li>Kombinirajte velika i mala slova, brojeve i simbole</li>
                                    <li>Ne koristite osobne podatke (ime, datum rođenja)</li>
                                    <li>Koristite jedinstvenu lozinku za CRM sustav</li>
                                    <li>Razmislite o korištenju upravitelja lozinki</li>
                                </ul>
                            </div>
                            
                            <div class="token-info">
                                <p style="margin: 0; font-size: 11px; color: #666;">
                                    <strong>Token informacija:</strong> Ovo je sigurnosni token generiran za resetiranje lozinke. 
                                    Ne dijelite ga s drugima.
                                </p>
                            </div>
                            
                            <p style="color: #666; font-size: 14px; line-height: 1.6;">
                                Ako imate bilo kakvih problema s resetiranjem lozinke,<br>
                                kontaktirajte naš tim za podršku na <strong>podrska@crm.hr</strong>.
                            </p>
                        </div>
                        
                        <div class="footer">
                            <p style="margin: 0 0 10px 0; font-size: 16px;">
                                <strong>CRM Sustav</strong><br>
                                Profesionalni CRM za upravljanje klijentima
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #999;">
                                Ovo je automatski generirani email. Molimo ne odgovarajte na ovaj email.<br>
                                © ${new Date().getFullYear()} CRM Sustav. Sva prava pridržana.
                            </p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `
🔐 RESETIRANJE LOZINKE - CRM SUSTAV

Zdravo ${userName || 'korisniče'}!

Primili smo zahtjev za resetiranjem lozinke za vaš CRM račun.

Resetirajte lozinku na sljedećoj poveznici:
${resetLink}

📋 Upute za resetiranje:
1. Kliknite na gore navedeni link
2. Unesite novu lozinku (najmanje 8 znakova)
3. Potvrdite novu lozinku u drugom polju
4. Kliknite "Resetiraj lozinku"
5. Bit ćete preusmjereni na stranicu za prijavu

⚠️ Važne sigurnosne napomene:
• Ovaj link vrijedi 60 minuta
• Link možete koristiti samo jednom
• Ako niste zatražili resetiranje lozinke, ignoriraj te ovaj email
• Nikada ne dijelite ovaj link s drugima
• Ako sumnjate u sigurnost računa, kontaktirajte podršku

💡 Preporuke za sigurnu lozinku:
- Koristite najmanje 12 znakova
- Kombinirajte velika i mala slova, brojeve i simbole
- Ne koristite osobne podatke (ime, datum rođenja)
- Koristite jedinstvenu lozinku za CRM sustav
- Razmislite o korištenju upravitelja lozinki

Ako imate problema s resetiranjem lozinke,
kontaktirajte podršku na podrska@crm.hr.

---
CRM Sustav
Profesionalni CRM za upravljanje klijentima
© ${new Date().getFullYear()} CRM Sustav. Sva prava pridržana.
            `
        };

        try {
            console.log('📤 Slanje pojednostavljenog reset emaila...');
            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Pojednostavljeni reset email poslan!');
            console.log('   📨 ID poruke:', info.messageId);
            console.log('   👤 Za:', toEmail);
            console.log('   ✅ Prihvaćeno:', info.accepted);
            console.log('   🔗 Reset link poslan:', resetLink);
            console.log('   🔐 Token u linku:', resetToken);
            console.log('   📊 Token dužina:', resetToken.length, 'znakova');
            return true;
        } catch (error) {
            console.error('❌ Slanje pojednostavljenog reset emaila nije uspjelo:');
            console.error('   💥 Greška:', error.message);
            console.error('   🔧 Kod:', error.code);
            console.error('   🔍 Stack:', error.stack);
            console.log('   🔗 Debug link za ručno testiranje:', resetLink);
            console.log('   🔐 Debug token za ručno testiranje:', resetToken);
            console.log('   📝 Debug token početak:', resetToken.substring(0, 20));
            console.log('   📝 Debug token kraj:', resetToken.substring(resetToken.length - 20));
            return false;
        }
    }

    // ============ STARA METODA (ZADRŽANA ZA BACKWARD COMPATIBILITY) ============
    async sendPasswordResetEmail(toEmail, userName) {
        console.log(`🚀 sendPasswordResetEmail POZVAN za: ${toEmail}`);
        console.log('⚠️ UPOTREBLJAVAJTE sendPasswordResetEmailSimple UMJESTO OVE!');
        
        // Vrati false jer ova metoda ne treba više biti korištena
        console.error('❌ OVA METODA GENERIRA LAŽNI TOKEN - KORISTITE sendPasswordResetEmailSimple!');
        return false;
    }

    // ============ VERIFIKACIJSKI EMAIL ZA KORISNIKE KOJI SE SAMI REGISTRIRAJU ============
    async sendVerificationEmail(userEmail, verificationToken, userName = 'Korisnik') {
        console.log(`🚀 sendVerificationEmail POZVAN za: ${userEmail}`);
        
        if (!this.transporter) {
            console.log('📧 Razvojni mod: Simulacija verifikacijskog emaila');
            console.log(`🔗 Verifikacijski link za ${userEmail}: http://localhost:8888/api/auth/verify/${verificationToken}`);
            return true;
        }
        
        if (!userEmail || !verificationToken) {
            console.error('❌ Nedostaje email ili token:', { userEmail, verificationToken });
            return false;
        }

        const verificationUrl = `http://localhost:8888/api/auth/verify/${verificationToken}`;
        
        const mailOptions = {
            from: '"CRM Demo" <noreply@crmdemo.com>',
            to: userEmail,
            subject: 'Potvrda email adrese - CRM Demo',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; margin-bottom: 30px;">
                        <h1 style="margin: 0; font-size: 28px;">CRM Demo</h1>
                        <p style="margin: 10px 0 0 0; opacity: 0.9;">Potvrda email adrese</p>
                    </div>
                    
                    <div style="padding: 0 30px 30px 30px;">
                        <h2 style="color: #333; margin-top: 0;">Dobrodošli, ${userName}! 👋</h2>
                        
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
                            <p style="margin: 0; color: #155724;">
                                <strong>Hvala vam što ste se registrirali!</strong><br>
                                Kliknite na gumb ispod da potvrdite svoju email adresu i aktivirate račun.
                            </p>
                        </div>
                        
                        <div style="text-align: center; margin: 40px 0;">
                            <a href="${verificationUrl}" 
                               style="background-color: #28a745; color: white; padding: 16px 32px; 
                                      text-decoration: none; border-radius: 8px; display: inline-block;
                                      font-size: 18px; font-weight: bold; box-shadow: 0 4px 6px rgba(50, 50, 93, 0.11);">
                                ✅ Potvrdi Email Adresu
                            </a>
                        </div>
                        
                        <div style="background-color: #e7f3ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
                            <h4 style="color: #004085; margin-top: 0;">ℹ️ Važne informacije:</h4>
                            <ul style="color: #004085; margin: 10px 0; padding-left: 20px;">
                                <li>Nakon potvrde, bit ćete automatski prijavljeni</li>
                                <li>Link za potvrdu istječe za 24 sata</li>
                                <li>Ako niste zatražili registraciju, ignorirajte ovaj email</li>
                            </ul>
                        </div>
                        
                        <p style="color: #666; font-size: 14px;">
                            Ili kopirajte ovaj link u preglednik:
                        </p>
                        <div style="background-color: #f1f3f4; padding: 12px; border-radius: 6px; 
                                  word-break: break-all; font-size: 12px; border: 1px dashed #ddd;">
                            ${verificationUrl}
                        </div>
                        
                        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
                            <p style="font-size: 12px; color: #666;">
                                <strong>Napomena:</strong> Ovo je automatski generirani email. Molimo ne odgovarajte na ovaj email.<br>
                                Ako imate problema s potvrdom, kontaktirajte podršku.
                            </p>
                        </div>
                    </div>
                </div>
            `,
            text: `
POTVRDA EMAIL ADRESE - CRM DEMO

Dobrodošli, ${userName}!

Hvala vam što ste se registrirali za CRM Demo.

Potvrdite svoju email adresu na sljedećoj poveznici:
${verificationUrl}

VAŽNE INFORMACIJE:
• Nakon potvrde, bit ćete automatski prijavljeni
• Link za potvrdu istječe za 24 sata
• Ako niste zatražili registraciju, ignorirajte ovaj email

Ili kopirajte link u preglednik:
${verificationUrl}

Ako imate problema s potvrdom, kontaktirajte podršku.

CRM Demo
© ${new Date().getFullYear()} Sva prava pridržana.
            `
        };

        try {
            console.log('📤 Slanje potvrdnog emaila...');
            const info = await this.transporter.sendMail(mailOptions);
            
            console.log('✅ Potvrdni email uspješno poslan!');
            console.log('   📨 ID poruke:', info.messageId);
            console.log('   ✅ Prihvaćeno:', info.accepted);
            
            return true;
        } catch (error) {
            console.error('❌ Slanje potvrdnog emaila nije uspjelo:');
            console.error('   💥 Greška:', error.message);
            console.error('   🔧 Kod:', error.code);
            
            return false;
        }
    }

    // ============ AKTIVACIJSKI EMAIL ZA KORISNIKE KOJE KREIRA ADMIN ============
    async sendActivationEmail(userEmail, activationToken, userName, adminName = 'Administrator') {
        console.log(`🚀 sendActivationEmail POZVAN za: ${userEmail}`);
        console.log(`   👤 Korisnik: ${userName}`);
        console.log(`   👨‍💼 Admin: ${adminName}`);
        
        if (!this.transporter) {
            console.log('📧 Razvojni mod: Simulacija aktivacijskog emaila');
            console.log(`🔗 Aktivacijski link za ${userEmail}: http://localhost:8888/api/auth/verify/${activationToken}`);
            return true;
        }
        
        if (!userEmail || !activationToken) {
            console.error('❌ Nedostaje email ili token:', { userEmail, activationToken });
            return false;
        }

        const activationUrl = `http://localhost:8888/api/auth/verify/${activationToken}`;
        
        const mailOptions = {
            from: '"CRM Demo Admin" <admin@crmdemo.com>',
            to: userEmail,
            subject: `🚀 Aktivacija računa - CRM Demo`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Aktivacija računa - CRM Demo</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
                        .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 40px; text-align: center; color: white; }
                        .content { padding: 40px; }
                        .logo { font-size: 32px; font-weight: bold; margin-bottom: 10px; }
                        .button { display: inline-block; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; 
                                text-decoration: none; padding: 18px 36px; border-radius: 10px; font-weight: bold; font-size: 20px; 
                                text-align: center; margin: 30px 0; box-shadow: 0 6px 12px rgba(40, 167, 69, 0.2); }
                        .admin-box { background-color: #e8f4f8; padding: 20px; border-radius: 10px; margin: 30px 0; border-left: 5px solid #17a2b8; }
                        .warning-box { background-color: #fff3cd; padding: 20px; border-radius: 10px; margin: 30px 0; border-left: 5px solid #ffc107; }
                        .footer { background-color: #f8f9fa; padding: 30px; text-align: center; color: #666; font-size: 14px; border-top: 1px solid #eee; }
                        .code { background-color: #f1f3f4; padding: 15px; border-radius: 8px; font-family: monospace; word-break: break-all; 
                               font-size: 14px; margin: 20px 0; border: 1px dashed #28a745; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <div class="logo">CRM Demo</div>
                            <p style="font-size: 18px; opacity: 0.9;">Aktivacija korisničkog računa</p>
                        </div>
                        
                        <div class="content">
                            <h2 style="color: #333; margin-top: 0; font-size: 28px;">Dobrodošli u CRM Demo, ${userName}! 👋</h2>
                            
                            <div class="admin-box">
                                <h3 style="color: #0c5460; margin-top: 0;">👨‍💼 Informacija od administratora:</h3>
                                <p style="color: #31708f; margin: 10px 0;">
                                    <strong>Administrator ${adminName}</strong> kreirao vam je račun u CRM sustavu.
                                </p>
                            </div>
                            
                            <p style="font-size: 16px; line-height: 1.8;">
                                Kliknite na gumb ispod da aktivirate svoj račun.<br>
                                <strong>Nakon aktivacije automatski ćete biti prijavljeni i preusmjereni na CRM nadzornu ploču.</strong>
                            </p>
                            
                            <div style="text-align: center;">
                                <a href="${activationUrl}" class="button">🚀 Aktiviraj Moj Račun</a>
                            </div>
                            
                            <div class="warning-box">
                                <h4 style="color: #856404; margin-top: 0;">⚠️ Važna napomena:</h4>
                                <p style="color: #856404; margin-bottom: 0; line-height: 1.6;">
                                    Nakon aktivacije računa, bit ćete upućeni na stranicu za postavljanje lozinke.<br>
                                    <strong>Sigurnosna lozinka vam je već generirana i dostupna je administratoru.</strong>
                                </p>
                            </div>
                            
                            <p style="color: #666; font-size: 14px; margin-top: 30px;">
                                Ili kopirajte ovaj link u preglednik:
                            </p>
                            <div class="code">${activationUrl}</div>
                            
                            <div style="margin-top: 50px; padding-top: 30px; border-top: 1px solid #eee;">
                                <p style="font-size: 14px; color: #666;">
                                    <strong>Napomena:</strong> Link za aktivaciju istječe za 24 sata.<br>
                                    Ako niste očekivali ovaj email, kontaktirajte administratora.
                                </p>
                            </div>
                        </div>
                        
                        <div class="footer">
                            <p style="margin: 0 0 15px 0; font-size: 16px;">
                                <strong>CRM Demo</strong><br>
                                Profesionalni CRM sustav za upravljanje klijentima
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #999;">
                                Ovo je automatski generirani email. Molimo ne odgovarajte na ovaj email.<br>
                                © ${new Date().getFullYear()} CRM Demo. Sva prava pridržana.
                            </p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `
AKTIVACIJA RAČUNA - CRM DEMO

Dobrodošli u CRM Demo, ${userName}!

Administrator ${adminName} kreirao vam je račun u CRM sustavu.

Aktivirajte svoj račun na sljedećoj poveznici:
${activationUrl}

VAŽNA NAPOMENA:
Nakon aktivacije računa, bit ćete upućeni na stranicu za postavljanje lozinke.
Sigurnosna lozinka vam je već generirana i dostupna je administratoru.

Link za aktivaciju istječe za 24 sata.
Ako niste očekivali ovaj email, kontaktirajte administratora.

CRM Demo
© ${new Date().getFullYear()} Sva prava pridržana.
            `
        };

        try {
            console.log('📤 Slanje aktivacijskog emaila...');
            const info = await this.transporter.sendMail(mailOptions);
            
            console.log('✅ Aktivacijski email uspješno poslan!');
            console.log('   📨 ID poruke:', info.messageId);
            console.log('   👤 Za:', userEmail);
            console.log('   ✅ Prihvaćeno:', info.accepted);
            
            return true;
        } catch (error) {
            console.error('❌ Slanje aktivacijskog emaila nije uspjelo:');
            console.error('   💥 Greška:', error.message);
            console.error('   🔧 Kod:', error.code);
            
            return false;
        }
    }

    // ============ NOVI: AKTIVACIJSKI EMAIL SA POSTAVLJANJEM LOZINKE ============
    async sendActivationWithPasswordSetup(userEmail, activationToken, userName, adminName = 'Administrator') {
        console.log(`🚀 sendActivationWithPasswordSetup POZVAN za: ${userEmail}`);
        
        if (!this.transporter) {
            console.log('📧 Razvojni mod: Simulacija emaila s postavljanjem lozinke');
            console.log(`🔗 Link za postavljanje lozinke: http://localhost:5173/set-password/${activationToken}`);
            return true;
        }
        
        if (!userEmail || !activationToken) {
            console.error('❌ Nedostaje email ili token');
            return false;
        }

        const setupPasswordUrl = `http://localhost:5173/set-password/${activationToken}`;
        
        const mailOptions = {
            from: '"CRM Demo Admin" <admin@crmdemo.com>',
            to: userEmail,
            subject: `🔐 Postavite svoju lozinku - CRM Demo`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 1px;">
                    <div style="background-color: white; margin: 20px; border-radius: 10px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
                        
                        <div style="padding: 40px;">
                            <h2 style="color: #333; margin-top: 0; text-align: center; font-size: 28px;">
                                Dobrodošli u CRM Demo, ${userName}! 👋
                            </h2>
                            
                            <div style="background-color: #e8f4f8; padding: 20px; border-radius: 10px; margin: 30px 0; border: 2px solid #17a2b8;">
                                <p style="margin: 0; color: #31708f; font-size: 16px; line-height: 1.6;">
                                    <strong>Administrator ${adminName}</strong> kreirao vam je račun u CRM sustavu.<br>
                                    Sada je vrijeme da postavite svoju sigurnu lozinku.
                                </p>
                            </div>
                            
                            <p style="font-size: 16px; color: #555; line-height: 1.8; text-align: center;">
                                Kliknite na gumb ispod da postavite svoju lozinku i aktivirate račun:
                            </p>
                            
                            <div style="text-align: center; margin: 40px 0;">
                                <a href="${setupPasswordUrl}" 
                                   style="background-color: #17a2b8; color: white; padding: 18px 40px; 
                                          text-decoration: none; border-radius: 10px; display: inline-block;
                                          font-size: 20px; font-weight: bold; box-shadow: 0 6px 12px rgba(23, 162, 184, 0.3);
                                          transition: all 0.3s ease;">
                                    🔐 Postavi Svoju Lozinku
                                </a>
                            </div>
                            
                            <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 30px 0;">
                                <h4 style="color: #155724; margin-top: 0;">📝 Upute za aktivaciju:</h4>
                                <ol style="color: #155724; font-size: 15px; line-height: 1.8;">
                                    <li><strong>Kliknite na gumb "Postavi Svoju Lozinku"</strong></li>
                                    <li>Unesite sigurnu lozinku (najmanje 8 znakova)</li>
                                    <li>Potvrdite lozinku u drugom polju</li>
                                    <li>Vaš račun će se automatski aktivirati</li>
                                    <li>Bit ćete preusmjereni na CRM nadzornu ploču</li>
                                </ol>
                            </div>
                            
                            <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 30px 0;">
                                <h4 style="color: #721c24; margin-top: 0;">⚠️ Sigurnosna napomena:</h4>
                                <p style="color: #721c24; margin: 0; line-height: 1.6;">
                                    Administratoru je dostupna privremena lozinka, ali <strong>preporučujemo da postavite vlastitu, jedinstvenu lozinku</strong> za bolju sigurnost vašeg računa.
                                </p>
                            </div>
                            
                            <p style="color: #666; font-size: 14px; text-align: center; margin-top: 40px;">
                                Ili kopirajte ovaj link u preglednik:
                            </p>
                            <div style="background-color: #f1f3f4; padding: 15px; border-radius: 8px; 
                                      word-break: break-all; font-size: 13px; border: 2px dashed #17a2b8;
                                      text-align: center;">
                                ${setupPasswordUrl}
                            </div>
                        </div>
                        
                        <div style="background-color: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #eee;">
                            <p style="margin: 0; font-size: 14px; color: #666;">
                                <strong>CRM Demo - Profesionalni CRM sustav</strong><br>
                                © ${new Date().getFullYear()} Sva prava pridržana.
                            </p>
                        </div>
                    </div>
                </div>
            `,
            text: `
POSTAVITE SVOJU LOZINKU - CRM DEMO

Dobrodošli u CRM Demo, ${userName}!

Administrator ${adminName} kreirao vam je račun u CRM sustavu.

Postavite svoju lozinku na sljedećoj poveznici:
${setupPasswordUrl}

Upute za aktivaciju:
1. Kliknite na link iznad
2. Postavite svoju sigurnu lozinku (najmanje 8 znakova)
3. Potvrdite lozinku
4. Vaš račun će se automatski aktivirati
5. Bit ćete preusmjereni na CRM nadzornu ploču

SIGURNOSNA NAPOMENA:
Administratoru je dostupna privremena lozinka, ali preporučujemo da postavite vlastitu lozinku za bolju sigurnost.

CRM Demo
© ${new Date().getFullYear()} Sva prava pridržana.
            `
        };

        try {
            console.log('📤 Slanje aktivacijskog emaila s postavljanjem lozinke...');
            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Aktivacijski email s postavljanjem lozinke poslan:', info.messageId);
            return true;
        } catch (error) {
            console.error('❌ Slanje aktivacijskog emaila s postavljanjem lozinke nije uspjelo:', error.message);
            return false;
        }
    }

    // ============ NOVI: EMAIL ZA OBAVIJEŠTAVANJE ADMINA O NOVOM KORISNIKU ============
    async sendAdminNotification(adminEmail, newUserEmail, newUserName, temporaryPassword) {
        console.log(`🚀 sendAdminNotification POZVAN za admina: ${adminEmail}`);
        
        if (!this.transporter) {
            console.log('📧 Razvojni mod: Simulacija admin obavijesti');
            console.log(`📋 Novi korisnik: ${newUserName} (${newUserEmail})`);
            console.log(`🔐 Privremena lozinka: ${temporaryPassword}`);
            return true;
        }

        const mailOptions = {
            from: '"CRM Demo Sustav" <system@crmdemo.com>',
            to: adminEmail,
            subject: `📋 Novi korisnik kreiran - ${newUserName}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
                    <div style="background-color: white; border-radius: 10px; padding: 30px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
                        
                        <div style="text-align: center; margin-bottom: 30px;">
                            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px;">
                                <h1 style="margin: 0; font-size: 24px;">📋 Novi korisnik kreiran</h1>
                                <p style="margin: 10px 0 0 0; opacity: 0.9;">CRM Demo - Administratorska obavijest</p>
                            </div>
                        </div>
                        
                        <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 30px; border: 1px solid #dee2e6;">
                            <h2 style="color: #495057; margin-top: 0; border-bottom: 2px solid #6c757d; padding-bottom: 10px;">
                                📊 Podaci o korisniku
                            </h2>
                            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                                <tr>
                                    <td style="padding: 12px; border-bottom: 1px solid #dee2e6; font-weight: bold; width: 30%;">👤 Ime:</td>
                                    <td style="padding: 12px; border-bottom: 1px solid #dee2e6;">${newUserName}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px; border-bottom: 1px solid #dee2e6; font-weight: bold;">📧 Email:</td>
                                    <td style="padding: 12px; border-bottom: 1px solid #dee2e6;">
                                        <a href="mailto:${newUserEmail}" style="color: #007bff; text-decoration: none;">
                                            ${newUserEmail}
                                        </a>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px; font-weight: bold;">📅 Datum kreiranja:</td>
                                    <td style="padding: 12px;">${new Date().toLocaleString('hr-HR')}</td>
                                </tr>
                            </table>
                        </div>
                        
                        <div style="background-color: #fff3cd; padding: 25px; border-radius: 8px; margin-bottom: 30px; border: 2px dashed #ffc107;">
                            <h3 style="color: #856404; margin-top: 0; border-bottom: 2px solid #ffc107; padding-bottom: 10px;">
                                🔐 Privremena lozinka
                            </h3>
                            <p style="color: #856404; font-size: 15px; margin-bottom: 15px;">
                                Ova lozinka je generirana za novog korisnika. <strong>Prikazuje se samo jednom.</strong>
                            </p>
                            <div style="background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center; border: 1px solid #ffc107;">
                                <code style="font-size: 24px; font-weight: bold; color: #dc3545; letter-spacing: 2px; font-family: 'Courier New', monospace;">
                                    ${temporaryPassword}
                                </code>
                            </div>
                            <div style="display: flex; align-items: center; margin-top: 15px;">
                                <span style="background-color: #856404; color: white; padding: 5px 10px; border-radius: 4px; margin-right: 10px;">⚠️</span>
                                <span style="color: #856404; font-size: 14px;">
                                    <strong>Napomena:</strong> Ovu lozinku možete kopirati i spremiti na sigurno mjesto.
                                </span>
                            </div>
                        </div>
                        
                        <div style="background-color: #d1ecf1; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                            <h4 style="color: #0c5460; margin-top: 0;">ℹ️ Sigurnosne napomene:</h4>
                            <ul style="color: #0c5460; font-size: 14px; padding-left: 20px;">
                                <li style="margin-bottom: 8px;">Ova lozinka se prikazuje samo jednom u ovom emailu</li>
                                <li style="margin-bottom: 8px;">Korisnik će morati promijeniti lozinku pri prvoj prijavi</li>
                                <li style="margin-bottom: 8px;"><strong>Nikada ne šaljite lozinku putem emaila korisniku</strong></li>
                                <li style="margin-bottom: 8px;">Preporučite korisniku da koristi upravitelja lozinki</li>
                                <li>Privremenu lozinku možete resetirati u admin panelu ako je potrebno</li>
                            </ul>
                        </div>
                        
                        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
                            <p style="font-size: 13px; color: #666; margin: 0;">
                                <strong>Napomena:</strong> Ovaj email je automatski generiran.<br>
                                Za dodatne informacije pogledajte administratorsku nadzornu ploču.
                            </p>
                            <p style="font-size: 12px; color: #999; margin-top: 15px;">
                                CRM Demo Administratorski sustav<br>
                                © ${new Date().getFullYear()} Sva prava pridržana.
                            </p>
                        </div>
                    </div>
                </div>
            `,
            text: `
NOVI KORISNIK KREIRAN - CRM DEMO

Podaci o korisniku:
-------------------
👤 Ime: ${newUserName}
📧 Email: ${newUserEmail}
📅 Datum: ${new Date().toLocaleString('hr-HR')}

PRIVREMENA LOZINKA:
-------------------
${temporaryPassword}

SIGURNOSNE NAPOMENE:
• Ova lozinka se prikazuje samo jednom
• Korisnik će morati promijeniti lozinku pri prvoj prijavi
• Nikada ne šaljite lozinku putem emaila korisniku
• Preporučite korisniku upravitelja lozinki
• Privremenu lozinku možete resetirati u admin panelu

Ovaj email je automatski generiran.

CRM Demo Administratorski sustav
© ${new Date().getFullYear()} Sva prava pridržana.
            `
        };

        try {
            console.log('📤 Slanje obavijesti adminu...');
            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Obavijest adminu poslana:', info.messageId);
            return true;
        } catch (error) {
            console.error('❌ Slanje obavijesti adminu nije uspjelo:', error.message);
            return false;
        }
    }

    // ============ TEST EMAIL ZA RAZVOJ ============
    async sendTestEmail(toEmail = 'test@example.com') {
        console.log('🧪 sendTestEmail POZVAN');
        
        if (!this.transporter) {
            console.error('❌ Transporter nije dostupan za test');
            return false;
        }

        const mailOptions = {
            from: '"CRM Test" <test@crm.com>',
            to: toEmail,
            subject: '🧪 TEST Email - ' + new Date().toLocaleTimeString('hr-HR'),
            text: 'Ovo je testni email iz CRM backend-a.',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; color: white;">
                    <div style="background-color: white; padding: 30px; border-radius: 8px; color: #333;">
                        <h1 style="color: #333; text-align: center; margin-bottom: 20px;">🧪 TEST Email</h1>
                        <p style="font-size: 16px; line-height: 1.6;">Ovo je testni email iz CRM backend-a za provjeru email konfiguracije.</p>
                        
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
                            <h3 style="color: #495057; margin-top: 0;">📋 Informacije o testu:</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;"><strong>Servis:</strong></td>
                                    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">EmailService</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;"><strong>Verzija:</strong></td>
                                    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">Poboljšana Sigurnost v2.0</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px;"><strong>Vremenska oznaka:</strong></td>
                                    <td style="padding: 8px;">${new Date().toLocaleString('hr-HR')}</td>
                                </tr>
                            </table>
                        </div>
                        
                        <div style="text-align: center; margin-top: 30px;">
                            <div style="display: inline-block; background-color: #28a745; color: white; padding: 10px 20px; border-radius: 5px; font-weight: bold;">
                                ✅ Test uspješan ako vidite ovaj email
                            </div>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 20px; color: rgba(255,255,255,0.8); font-size: 12px;">
                        <p style="margin: 0;">CRM Sustav - Razvojno okruženje</p>
                    </div>
                </div>
            `
        };

        try {
            console.log('📤 Slanje testnog emaila...');
            const info = await this.transporter.sendMail(mailOptions);
            console.log('🎉 Testni email poslan!');
            console.log('   📨 ID poruke:', info.messageId);
            console.log('   ✅ Prihvaćeno:', info.accepted);
            console.log('   👤 Primatelj:', toEmail);
            return true;
        } catch (error) {
            console.error('💥 Slanje testnog emaila nije uspjelo:', error.message);
            return false;
        }
    }

    // ============ TEST PASSWORD RESET TOKEN ============
    async sendTestResetToken(toEmail, testToken) {
        console.log('🧪 sendTestResetToken POZVAN');
        console.log(`🔐 Test token: ${testToken}`);
        
        if (!this.transporter) {
            console.log('📧 Razvojni mod: Simulacija test reset tokena');
            const resetLink = `http://localhost:5173/change-password?token=${testToken}`;
            console.log(`🔗 Test reset link: ${resetLink}`);
            console.log(`📊 Token dužina: ${testToken.length} znakova`);
            console.log(`🔍 Token početak: ${testToken.substring(0, 20)}`);
            console.log(`🔍 Token kraj: ${testToken.substring(testToken.length - 20)}`);
            return true;
        }

        const resetLink = `http://localhost:5173/change-password?token=${testToken}`;
        
        const mailOptions = {
            from: '"CRM Test" <test@crm.com>',
            to: toEmail,
            subject: '🧪 TEST Reset Token - CRM',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">🧪 TEST Reset Token</h2>
                    <p>Ovo je testni email za provjeru reset tokena.</p>
                    
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
                        <p><strong>Token:</strong></p>
                        <code style="background-color: #eee; padding: 10px; display: block; word-break: break-all;">
                            ${testToken}
                        </code>
                    </div>
                    
                    <p><strong>Test link:</strong></p>
                    <a href="${resetLink}" style="color: #007bff;">${resetLink}</a>
                    
                    <div style="margin-top: 20px; padding: 15px; background-color: #fff3cd;">
                        <p><strong>Debug info:</strong></p>
                        <p>Token length: ${testToken.length}</p>
                        <p>Token start: ${testToken.substring(0, 20)}...</p>
                        <p>Token end: ...${testToken.substring(testToken.length - 20)}</p>
                    </div>
                </div>
            `,
            text: `
TEST RESET TOKEN

Token: ${testToken}
Link: ${resetLink}

Debug info:
Token length: ${testToken.length}
Token start: ${testToken.substring(0, 20)}...
Token end: ...${testToken.substring(testToken.length - 20)}
            `
        };

        try {
            console.log('📤 Slanje testnog reset tokena...');
            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Testni reset token poslan!');
            console.log('   🔗 Link:', resetLink);
            console.log('   🔐 Token:', testToken);
            return true;
        } catch (error) {
            console.error('❌ Slanje testnog reset tokena nije uspjelo:', error.message);
            return false;
        }
    }
}

console.log('✅ Kreiranje instance EmailService...');
const emailServiceInstance = new EmailService();
console.log('✅ EmailService instanca kreirana');

// Dodatni debug info
console.log('\n📧 EmailService konfiguriran sa sljedećim metodama:');
console.log('   ✅ sendPasswordResetEmailSimple() - GLASNAČKA METODA (koristi pravi token)');
console.log('   ❌ sendPasswordResetEmail() - ZASTARJELA (generira lažni token)');
console.log('   ✅ sendVerificationEmail() - Verifikacija za registraciju');
console.log('   ✅ sendActivationEmail() - Aktivacija za admin-kreirane korisnike');
console.log('   ✅ sendActivationWithPasswordSetup() - Aktivacija s postavljanjem lozinke');
console.log('   ✅ sendAdminNotification() - Obavijest adminu o novom korisniku');
console.log('   ✅ sendTestEmail() - Test email za razvoj');
console.log('   ✅ sendTestResetToken() - Test reset token za debug');
console.log('\n🔗 VAŽNO: Reset linkovi koriste /change-password?token=xxx');
console.log('   Sada:  http://localhost:5173/change-password?token=xxx');
console.log('\n📊 KLJUČNA PROMJENA:');
console.log('   • Backend šalje PRAVI token u sendPasswordResetEmailSimple()');
console.log('   • Token u emailu = Token u bazi');
console.log('   • Stara metoda sendPasswordResetEmail() je zastarjela');
console.log('\n🌐 Backend treba koristiti:');
console.log('   emailService.sendPasswordResetEmailSimple(email, token, name)');
console.log('\n⚠️ PROBLEMI SA STAROM METODOM:');
console.log('   • Generirala je lažni token (generated-token-...)');
console.log('   • Taj token NIJE bio u bazi');
console.log('   • Sada je FIXED!');

export default emailServiceInstance;