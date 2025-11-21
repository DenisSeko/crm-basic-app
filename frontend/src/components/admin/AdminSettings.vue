<!-- src/components/admin/AdminSettings.vue -->
<template>
  <div class="admin-settings">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <h1>Admin Postavke</h1>
        <p>Upravljajte globalnim postavkama CRM sustava</p>
      </div>
      <div class="header-actions">
        <button 
          @click="saveAllSettings" 
          class="btn-primary"
          :disabled="saving"
        >
          <span v-if="saving" class="button-loading"></span>
          {{ saving ? 'Spremanje...' : '💾 Spremi Sve Postavke' }}
        </button>
      </div>
    </div>

    <!-- Settings Navigation -->
    <div class="settings-nav">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="activeTab = tab.id"
        :class="['nav-tab', { active: activeTab === tab.id }]"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <!-- Settings Content -->
    <div class="settings-content">
      <!-- System Settings -->
      <div v-if="activeTab === 'system'" class="settings-section">
        <div class="section-header">
          <h2>⚙️ Sustavne Postavke</h2>
          <p>Globalne postavke CRM sustava</p>
        </div>

        <div class="settings-grid">
          <!-- Application Settings -->
          <div class="setting-group">
            <h3>🌐 Postavke Aplikacije</h3>
            
            <div class="setting-item">
              <label class="setting-label">
                <span class="label-text">Naziv Aplikacije</span>
                <span class="label-description">Ime koje će se prikazivati u sustavu</span>
              </label>
              <input
                v-model="settings.system.appName"
                type="text"
                class="setting-input"
                placeholder="CRM Sustav"
              />
            </div>

            <div class="setting-item">
              <label class="setting-label">
                <span class="label-text">Email Sustava</span>
                <span class="label-description">Email adresa s koje se šalju obavijesti</span>
              </label>
              <input
                v-model="settings.system.systemEmail"
                type="email"
                class="setting-input"
                placeholder="sustav@tvrtka.com"
              />
            </div>

            <div class="setting-item">
              <label class="setting-label">
                <span class="label-text">Vremenska Zona</span>
                <span class="label-description">Vremenska zona za prikaz vremena</span>
              </label>
              <select v-model="settings.system.timezone" class="setting-select">
                <option value="Europe/Zagreb">Central European Time (Zagreb)</option>
                <option value="Europe/Belgrade">Central European Time (Beograd)</option>
                <option value="Europe/Sarajevo">Central European Time (Sarajevo)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>

          <!-- Security Settings -->
          <div class="setting-group">
            <h3>🔐 Sigurnosne Postavke</h3>
            
            <div class="setting-item">
              <label class="setting-label">
                <span class="label-text">Trajanje Sesije</span>
                <span class="label-description">Koliko dugo korisnik ostaje prijavljen (u satima)</span>
              </label>
              <input
                v-model="settings.system.sessionTimeout"
                type="number"
                min="1"
                max="24"
                class="setting-input"
              />
              <span class="setting-suffix">sati</span>
            </div>

            <div class="setting-item">
              <label class="setting-label">
                <span class="label-text">Zahtijevaj Verifikaciju Emaila</span>
                <span class="label-description">Korisnici moraju verificirati email prije korištenja</span>
              </label>
              <label class="toggle-switch">
                <input
                  v-model="settings.system.requireEmailVerification"
                  type="checkbox"
                  class="toggle-input"
                />
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="setting-item">
              <label class="setting-label">
                <span class="label-text">Omogući 2-Faktor Autentifikaciju</span>
                <span class="label-description">Dodatna sigurnosna mjera za prijavu</span>
              </label>
              <label class="toggle-switch">
                <input
                  v-model="settings.system.enable2FA"
                  type="checkbox"
                  class="toggle-input"
                />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- User Management Settings -->
      <div v-if="activeTab === 'users'" class="settings-section">
        <div class="section-header">
          <h2>👥 Postavke Korisnika</h2>
          <p>Upravljanje korisničkim računima i dozvolama</p>
        </div>

        <div class="settings-grid">
          <!-- Registration Settings -->
          <div class="setting-group">
            <h3>📝 Registracija i Aktivacija</h3>
            
            <div class="setting-item">
              <label class="setting-label">
                <span class="label-text">Dopusti Registraciju</span>
                <span class="label-description">Korisnici se mogu samostalno registrirati</span>
              </label>
              <label class="toggle-switch">
                <input
                  v-model="settings.users.allowRegistration"
                  type="checkbox"
                  class="toggle-input"
                />
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="setting-item">
              <label class="setting-label">
                <span class="label-text">Automatska Aktivacija</span>
                <span class="label-description">Automatski aktiviraj nove korisnike</span>
              </label>
              <label class="toggle-switch">
                <input
                  v-model="settings.users.autoActivate"
                  type="checkbox"
                  class="toggle-input"
                />
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="setting-item">
              <label class="setting-label">
                <span class="label-text">Default Uloga</span>
                <span class="label-description">Zadana uloga za nove korisnike</span>
              </label>
              <select v-model="settings.users.defaultRole" class="setting-select">
                <option value="user">Korisnik</option>
                <option value="manager">Manager</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          </div>

          <!-- Password Policies -->
          <div class="setting-group">
            <h3>🔑 Politika Lozinki</h3>
            
            <div class="setting-item">
              <label class="setting-label">
                <span class="label-text">Minimalna Duljina Lozinke</span>
                <span class="label-description">Najmanji broj znakova za lozinku</span>
              </label>
              <input
                v-model="settings.users.minPasswordLength"
                type="number"
                min="6"
                max="20"
                class="setting-input"
              />
              <span class="setting-suffix">znakova</span>
            </div>

            <div class="setting-item">
              <label class="setting-label">
                <span class="label-text">Zahtijevaj Specijalne Znakove</span>
                <span class="label-description">Lozinka mora sadržavati specijalne znakove</span>
              </label>
              <label class="toggle-switch">
                <input
                  v-model="settings.users.requireSpecialChars"
                  type="checkbox"
                  class="toggle-input"
                />
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="setting-item">
              <label class="setting-label">
                <span class="label-text">Istek Lozinke</span>
                <span class="label-description">Koliko često korisnici moraju mijenjati lozinku (u danima)</span>
              </label>
              <input
                v-model="settings.users.passwordExpiry"
                type="number"
                min="0"
                class="setting-input"
              />
              <span class="setting-suffix">dana (0 = nikad)</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Email Settings -->
      <div v-if="activeTab === 'email'" class="settings-section">
        <div class="section-header">
          <h2>📧 Email Postavke</h2>
          <p>Konfiguracija email servisa i templatea</p>
        </div>

        <div class="settings-grid">
          <!-- SMTP Settings -->
          <div class="setting-group">
            <h3>📤 SMTP Konfiguracija</h3>
            
            <div class="setting-item">
              <label class="setting-label">
                <span class="label-text">SMTP Server</span>
                <span class="label-description">Adresa SMTP servera</span>
              </label>
              <input
                v-model="settings.email.smtpHost"
                type="text"
                class="setting-input"
                placeholder="smtp.gmail.com"
              />
            </div>

            <div class="setting-item">
              <label class="setting-label">
                <span class="label-text">SMTP Port</span>
                <span class="label-description">Port za SMTP konekciju</span>
              </label>
              <input
                v-model="settings.email.smtpPort"
                type="number"
                class="setting-input"
                placeholder="587"
              />
            </div>

            <div class="setting-item">
              <label class="setting-label">
                <span class="label-text">Korisničko Ime</span>
                <span class="label-description">Email adresa za autentifikaciju</span>
              </label>
              <input
                v-model="settings.email.smtpUsername"
                type="text"
                class="setting-input"
                placeholder="vas.email@gmail.com"
              />
            </div>

            <div class="setting-item">
              <label class="setting-label">
                <span class="label-text">Lozinka</span>
                <span class="label-description">Lozinka za SMTP autentifikaciju</span>
              </label>
              <div class="password-input-wrapper">
                <input
                  v-model="settings.email.smtpPassword"
                  :type="showSmtpPassword ? 'text' : 'password'"
                  class="setting-input"
                  placeholder="Unesite SMTP lozinku"
                />
                <button
                  type="button"
                  @click="showSmtpPassword = !showSmtpPassword"
                  class="password-toggle"
                >
                  {{ showSmtpPassword ? '🙈' : '👁️' }}
                </button>
              </div>
            </div>

            <div class="setting-item">
              <label class="setting-label">
                <span class="label-text">Koristi SSL/TLS</span>
                <span class="label-description">Enkriptiraj email komunikaciju</span>
              </label>
              <label class="toggle-switch">
                <input
                  v-model="settings.email.useSSL"
                  type="checkbox"
                  class="toggle-input"
                />
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="test-connection">
              <button @click="testEmailConnection" class="btn-secondary" :disabled="testingEmail">
                {{ testingEmail ? 'Testiranje...' : '🧪 Testiraj SMTP Konekciju' }}
              </button>
            </div>
          </div>

          <!-- Email Templates -->
          <div class="setting-group">
            <h3>📝 Email Templatei</h3>
            
            <div class="setting-item">
              <label class="setting-label">
                <span class="label-text">Welcome Email Subject</span>
                <span class="label-description">Naslov welcome emaila</span>
              </label>
              <input
                v-model="settings.email.welcomeSubject"
                type="text"
                class="setting-input"
                placeholder="Dobrodošli u CRM Sustav!"
              />
            </div>

            <div class="setting-item full-width">
              <label class="setting-label">
                <span class="label-text">Welcome Email Body</span>
                <span class="label-description">Sadržaj welcome emaila</span>
              </label>
              <textarea
                v-model="settings.email.welcomeBody"
                class="setting-textarea"
                rows="6"
                placeholder="Poštovani {{name}},&#10;&#10;Dobrodošli u naš CRM sustav!..."
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- Notification Settings -->
      <div v-if="activeTab === 'notifications'" class="settings-section">
        <div class="section-header">
          <h2>🔔 Postavke Obavijesti</h2>
          <p>Upravljanje sustavnim obavijestima i notifikacijama</p>
        </div>

        <div class="settings-grid">
          <!-- System Notifications -->
          <div class="setting-group">
            <h3>📢 Sustavne Obavijesti</h3>
            
            <div class="setting-item">
              <label class="setting-label">
                <span class="label-text">Obavijesti o Novim Korisnicima</span>
                <span class="label-description">Šalji obavijest adminima o novim registracijama</span>
              </label>
              <label class="toggle-switch">
                <input
                  v-model="settings.notifications.newUserAlerts"
                  type="checkbox"
                  class="toggle-input"
                />
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="setting-item">
              <label class="setting-label">
                <span class="label-text">Dnevni Izvještaji</span>
                <span class="label-description">Automatski dnevni izvještaji za admine</span>
              </label>
              <label class="toggle-switch">
                <input
                  v-model="settings.notifications.dailyReports"
                  type="checkbox"
                  class="toggle-input"
                />
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="setting-item">
              <label class="setting-label">
                <span class="label-text">System Error Alerts</span>
                <span class="label-description">Obavijesti o greškama u sustavu</span>
              </label>
              <label class="toggle-switch">
                <input
                  v-model="settings.notifications.systemErrors"
                  type="checkbox"
                  class="toggle-input"
                />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>

          <!-- User Notifications -->
          <div class="setting-group">
            <h3>👤 Korisničke Obavijesti</h3>
            
            <div class="setting-item">
              <label class="setting-label">
                <span class="label-text">Welcome Notifications</span>
                <span class="label-description">Pošalji welcome poruku novim korisnicima</span>
              </label>
              <label class="toggle-switch">
                <input
                  v-model="settings.notifications.welcomeMessages"
                  type="checkbox"
                  class="toggle-input"
                />
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="setting-item">
              <label class="setting-label">
                <span class="label-text">Password Reset Notifications</span>
                <span class="label-description">Obavijesti o resetiranju lozinke</span>
              </label>
              <label class="toggle-switch">
                <input
                  v-model="settings.notifications.passwordResets"
                  type="checkbox"
                  class="toggle-input"
                />
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="setting-item">
              <label class="setting-label">
                <span class="label-text">Account Activity Alerts</span>
                <span class="label-description">Obavijesti o važnim aktivnostima računa</span>
              </label>
              <label class="toggle-switch">
                <input
                  v-model="settings.notifications.accountAlerts"
                  type="checkbox"
                  class="toggle-input"
                />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Backup & Maintenance -->
      <div v-if="activeTab === 'backup'" class="settings-section">
        <div class="section-header">
          <h2>💾 Backup i Održavanje</h2>
          <p>Upravljanje sigurnosnim kopijama i održavanjem sustava</p>
        </div>

        <div class="settings-grid">
          <!-- Backup Settings -->
          <div class="setting-group">
            <h3>📦 Postavke Backup-a</h3>
            
            <div class="setting-item">
              <label class="setting-label">
                <span class="label-text">Automatski Backup</span>
                <span class="label-description">Automatski stvaraj sigurnosne kopije</span>
              </label>
              <label class="toggle-switch">
                <input
                  v-model="settings.backup.autoBackup"
                  type="checkbox"
                  class="toggle-input"
                />
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="setting-item">
              <label class="setting-label">
                <span class="label-text">Backup Frequency</span>
                <span class="label-description">Koliko često stvarati backup</span>
              </label>
              <select v-model="settings.backup.frequency" class="setting-select">
                <option value="daily">Dnevno</option>
                <option value="weekly">Tjedno</option>
                <option value="monthly">Mjesečno</option>
              </select>
            </div>

            <div class="setting-item">
              <label class="setting-label">
                <span class="label-text">Zadrži Backup Kopije</span>
                <span class="label-description">Broj backup kopija za zadržavanje</span>
              </label>
              <input
                v-model="settings.backup.keepBackups"
                type="number"
                min="1"
                max="30"
                class="setting-input"
              />
              <span class="setting-suffix">kopija</span>
            </div>

            <div class="backup-actions">
              <button @click="createBackup" class="btn-secondary" :disabled="creatingBackup">
                {{ creatingBackup ? 'Stvaranje...' : '🔄 Stvori Backup' }}
              </button>
              <button @click="showBackupHistory" class="btn-outline">
                📜 Povijest Backup-a
              </button>
            </div>
          </div>

          <!-- Maintenance Settings -->
          <div class="setting-group">
            <h3>🛠️ Postavke Održavanja</h3>
            
            <div class="setting-item">
              <label class="setting-label">
                <span class="label-text">Maintenance Mode</span>
                <span class="label-description">Privremeno onemogući pristup sustavu</span>
              </label>
              <label class="toggle-switch">
                <input
                  v-model="settings.backup.maintenanceMode"
                  type="checkbox"
                  class="toggle-input"
                />
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="setting-item full-width">
              <label class="setting-label">
                <span class="label-text">Maintenance Message</span>
                <span class="label-description">Poruka koja se prikazuje korisnicima</span>
              </label>
              <textarea
                v-model="settings.backup.maintenanceMessage"
                class="setting-textarea"
                rows="4"
                placeholder="Sustav je trenutno u održavanju. Molimo pokušajte kasnije."
              ></textarea>
            </div>

            <div class="maintenance-actions">
              <button @click="clearCache" class="btn-outline" :disabled="clearingCache">
                {{ clearingCache ? 'Čišćenje...' : '🗑️ Očisti Cache' }}
              </button>
              <button @click="optimizeDatabase" class="btn-outline" :disabled="optimizingDB">
                {{ optimizingDB ? 'Optimiziranje...' : '⚡ Optimiziraj Bazu' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Success Toast -->
    <div v-if="showSuccessToast" class="success-toast">
      <div class="toast-icon">✅</div>
      <div class="toast-content">
        <strong>Uspjeh!</strong>
        <p>Postavke su uspješno spremljene.</p>
      </div>
      <button @click="showSuccessToast = false" class="toast-close">×</button>
    </div>

    <!-- Test Connection Result -->
    <div v-if="testConnectionResult" class="connection-result" :class="testConnectionResult.type">
      <div class="result-icon">{{ testConnectionResult.icon }}</div>
      <div class="result-content">
        <strong>{{ testConnectionResult.title }}</strong>
        <p>{{ testConnectionResult.message }}</p>
      </div>
      <button @click="testConnectionResult = null" class="result-close">×</button>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue'
//import { authHelper, authAPI } from '../../services/api'

export default {
  name: 'AdminSettings',
  setup() {
    const activeTab = ref('system')
    const saving = ref(false)
    const testingEmail = ref(false)
    const creatingBackup = ref(false)
    const clearingCache = ref(false)
    const optimizingDB = ref(false)
    const showSmtpPassword = ref(false)
    const showSuccessToast = ref(false)
    const testConnectionResult = ref(null)

    const tabs = [
      { id: 'system', label: 'Sustav', icon: '⚙️' },
      { id: 'users', label: 'Korisnici', icon: '👥' },
      { id: 'email', label: 'Email', icon: '📧' },
      { id: 'notifications', label: 'Obavijesti', icon: '🔔' },
      { id: 'backup', label: 'Backup', icon: '💾' }
    ]

    // Default settings structure
    const settings = reactive({
      system: {
        appName: 'CRM Sustav',
        systemEmail: 'sustav@tvrtka.com',
        timezone: 'Europe/Zagreb',
        sessionTimeout: 8,
        requireEmailVerification: true,
        enable2FA: false
      },
      users: {
        allowRegistration: true,
        autoActivate: false,
        defaultRole: 'user',
        minPasswordLength: 8,
        requireSpecialChars: true,
        passwordExpiry: 90
      },
      email: {
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpUsername: '',
        smtpPassword: '',
        useSSL: true,
        welcomeSubject: 'Dobrodošli u CRM Sustav!',
        welcomeBody: 'Poštovani {{name}},\n\nDobrodošli u naš CRM sustav! Vaš račun je uspješno kreiran.\n\nLijep pozdrav,\nCRM Tim'
      },
      notifications: {
        newUserAlerts: true,
        dailyReports: true,
        systemErrors: true,
        welcomeMessages: true,
        passwordResets: true,
        accountAlerts: true
      },
      backup: {
        autoBackup: true,
        frequency: 'daily',
        keepBackups: 7,
        maintenanceMode: false,
        maintenanceMessage: 'Sustav je trenutno u održavanju. Molimo pokušajte kasnije.'
      }
    })

    // Load settings from API/localStorage
    const loadSettings = async () => {
      try {
        // TODO: Load from API
        const savedSettings = localStorage.getItem('adminSettings')
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings)
          Object.keys(parsed).forEach(key => {
            if (settings[key]) {
              Object.assign(settings[key], parsed[key])
            }
          })
        }
      } catch (error) {
        console.error('Greška pri učitavanju postavki:', error)
      }
    }

    // Save settings to API/localStorage
    const saveAllSettings = async () => {
      try {
        saving.value = true
        
        // TODO: Save to API
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        localStorage.setItem('adminSettings', JSON.stringify(settings))
        
        showSuccessToast.value = true
        setTimeout(() => {
          showSuccessToast.value = false
        }, 5000)
        
      } catch (error) {
        console.error('Greška pri spremanju postavki:', error)
        alert('Došlo je do greške pri spremanju postavki.')
      } finally {
        saving.value = false
      }
    }

    // Test email connection
    const testEmailConnection = async () => {
      try {
        testingEmail.value = true
        
        // TODO: Implement actual SMTP test
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Mock result
        const success = Math.random() > 0.3 // 70% success rate for demo
        
        testConnectionResult.value = success ? {
          type: 'success',
          icon: '✅',
          title: 'SMTP Konekcija Uspješna',
          message: 'Email server je uspješno kontaktiran i autentificiran.'
        } : {
          type: 'error',
          icon: '❌',
          title: 'SMTP Konekcija Neuspješna',
          message: 'Nije moguće spojiti se na email server. Provjerite postavke.'
        }
        
      } catch (error) {
        testConnectionResult.value = {
          type: 'error',
          icon: '❌',
          title: 'Greška pri Testiranju',
          message: 'Došlo je do neočekivane greške: ' + error.message
        }
      } finally {
        testingEmail.value = false
      }
    }

    // Backup actions
    const createBackup = async () => {
      try {
        creatingBackup.value = true
        // TODO: Implement backup creation
        await new Promise(resolve => setTimeout(resolve, 3000))
        alert('Backup je uspješno stvoren!')
      } catch (error) {
        alert('Greška pri stvaranju backup-a: ' + error.message)
      } finally {
        creatingBackup.value = false
      }
    }

    const showBackupHistory = () => {
      // TODO: Implement backup history modal
      alert('Povijest backup-a će biti prikazana u modalnom prozoru.')
    }

    // Maintenance actions
    const clearCache = async () => {
      try {
        clearingCache.value = true
        // TODO: Implement cache clearing
        await new Promise(resolve => setTimeout(resolve, 2000))
        alert('Cache je uspješno očišćen!')
      } catch (error) {
        alert('Greška pri čišćenju cache-a: ' + error.message)
      } finally {
        clearingCache.value = false
      }
    }

    const optimizeDatabase = async () => {
      try {
        optimizingDB.value = true
        // TODO: Implement database optimization
        await new Promise(resolve => setTimeout(resolve, 2500))
        alert('Baza podataka je uspješno optimizirana!')
      } catch (error) {
        alert('Greška pri optimizaciji baze: ' + error.message)
      } finally {
        optimizingDB.value = false
      }
    }

    onMounted(() => {
      loadSettings()
    })

    return {
      activeTab,
      tabs,
      settings,
      saving,
      testingEmail,
      creatingBackup,
      clearingCache,
      optimizingDB,
      showSmtpPassword,
      showSuccessToast,
      testConnectionResult,
      saveAllSettings,
      testEmailConnection,
      createBackup,
      showBackupHistory,
      clearCache,
      optimizeDatabase
    }
  }
}
</script>

<style scoped>
.admin-settings {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.header-content h1 {
  font-size: 1.875rem;
  font-weight: bold;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
}

.header-content p {
  color: #64748b;
  margin: 0;
}

/* Settings Navigation */
.settings-nav {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  padding: 1rem;
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow-x: auto;
}

.nav-tab {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border: none;
  background: transparent;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  font-size: 0.875rem;
  font-weight: 500;
  color: #64748b;
}

.nav-tab:hover {
  background: #f8fafc;
  color: #374151;
}

.nav-tab.active {
  background: #3b82f6;
  color: white;
}

.tab-icon {
  font-size: 1.125rem;
}

/* Settings Content */
.settings-content {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.settings-section {
  padding: 2rem;
}

.section-header {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.section-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
}

.section-header p {
  color: #64748b;
  margin: 0;
}

.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.setting-group h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #f1f5f9;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
}

.setting-item.full-width {
  grid-column: 1 / -1;
}

.setting-label {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.label-text {
  font-weight: 500;
  color: #374151;
}

.label-description {
  font-size: 0.75rem;
  color: #6b7280;
  line-height: 1.4;
}

.setting-input,
.setting-select,
.setting-textarea {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  background: white;
  transition: all 0.2s;
  min-width: 200px;
}

.setting-input:focus,
.setting-select:focus,
.setting-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.setting-textarea {
  resize: vertical;
  min-height: 100px;
  font-family: inherit;
}

.setting-suffix {
  font-size: 0.875rem;
  color: #64748b;
  margin-left: 0.5rem;
  white-space: nowrap;
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.toggle-input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #d1d5db;
  transition: .4s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

.toggle-input:checked + .toggle-slider {
  background-color: #3b82f6;
}

.toggle-input:checked + .toggle-slider:before {
  transform: translateX(26px);
}

/* Password Input */
.password-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.password-toggle {
  position: absolute;
  right: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem;
  color: #6b7280;
}

/* Action Buttons */
.test-connection,
.backup-actions,
.maintenance-actions {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

.backup-actions,
.maintenance-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

/* Button Styles */
.btn-primary {
  background: #3b82f6;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f1f5f9;
  color: #374151;
  padding: 0.75rem 1.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-secondary:hover:not(:disabled) {
  background: #e2e8f0;
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-outline {
  background: white;
  color: #374151;
  padding: 0.75rem 1.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-outline:hover:not(:disabled) {
  background: #f8fafc;
}

.btn-outline:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.button-loading {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* Toast and Result Messages */
.success-toast {
  position: fixed;
  top: 2rem;
  right: 2rem;
  background: #10b981;
  color: white;
  padding: 1rem 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
  z-index: 1001;
  animation: slideIn 0.3s ease-out;
}

.connection-result {
  position: fixed;
  top: 2rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 1rem 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
  z-index: 1001;
  animation: slideIn 0.3s ease-out;
  max-width: 500px;
  width: 90%;
}

.connection-result.success {
  background: #dcfce7;
  border: 1px solid #bbf7d0;
  color: #166534;
}

.connection-result.error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
}

.result-icon,
.toast-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.result-content,
.toast-content {
  flex: 1;
}

.result-content strong,
.toast-content strong {
  display: block;
  margin-bottom: 0.25rem;
}

.result-content p,
.toast-content p {
  margin: 0;
  font-size: 0.875rem;
  opacity: 0.9;
}

.result-close,
.toast-close {
  background: none;
  border: none;
  color: inherit;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
}

.result-close:hover,
.toast-close:hover {
  opacity: 1;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes slideIn {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Responsive */
@media (max-width: 1024px) {
  .settings-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .settings-nav {
    flex-wrap: wrap;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .setting-item {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
  
  .setting-input,
  .setting-select,
  .setting-textarea {
    min-width: auto;
    width: 100%;
  }
  
  .backup-actions,
  .maintenance-actions {
    flex-direction: column;
  }
  
  .success-toast {
    left: 1rem;
    right: 1rem;
    top: 1rem;
  }
  
  .connection-result {
    left: 1rem;
    right: 1rem;
    transform: none;
    width: auto;
  }
}

@media (max-width: 640px) {
  .settings-section {
    padding: 1rem;
  }
  
  .nav-tab {
    padding: 0.75rem 1rem;
    font-size: 0.8rem;
  }
  
  .tab-icon {
    font-size: 1rem;
  }
}
</style>