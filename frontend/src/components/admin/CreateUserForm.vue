<template>
  <div class="create-user-form">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <h1>Dodaj Novog Korisnika</h1>
        <p>Kreiraj novi korisnički račun u CRM sustavu</p>
      </div>
      <div class="header-actions">
        <router-link to="/admin/users" class="btn-outline">
          ← Natrag na Korisnike
        </router-link>
      </div>
    </div>

    <!-- Main Form -->
    <div class="form-container">
      <form @submit.prevent="submitForm" class="user-form">
        <!-- Personal Information Section -->
        <div class="form-section">
          <h2 class="section-title">📋 Osnovne Informacije</h2>
          <div class="form-grid">
            <div class="form-group">
              <label for="first_name" class="form-label">
                Ime *
                <span class="label-hint">Korisničko ime</span>
              </label>
              <input
                id="first_name"
                v-model="form.first_name"
                type="text"
                class="form-input"
                :class="{ error: errors.first_name }"
                placeholder="Unesite ime"
                required
              />
              <span v-if="errors.first_name" class="error-message">{{ errors.first_name }}</span>
            </div>

            <div class="form-group">
              <label for="last_name" class="form-label">
                Prezime *
                <span class="label-hint">Korisničko prezime</span>
              </label>
              <input
                id="last_name"
                v-model="form.last_name"
                type="text"
                class="form-input"
                :class="{ error: errors.last_name }"
                placeholder="Unesite prezime"
                required
              />
              <span v-if="errors.last_name" class="error-message">{{ errors.last_name }}</span>
            </div>

            <div class="form-group">
              <label for="email" class="form-label">
                Email Adresa *
                <span class="label-hint">Jedinstvena email adresa za prijavu</span>
              </label>
              <input
                id="email"
                v-model="form.email"
                type="email"
                class="form-input"
                :class="{ error: errors.email }"
                placeholder="unesite@email.com"
                required
                @blur="checkEmailAvailability"
              />
              <div v-if="emailChecking" class="email-checking">
                🔍 Provjeravam dostupnost emaila...
              </div>
              <div v-if="emailAvailable && form.email" class="email-available">
                ✅ Email je dostupan
              </div>
              <div v-if="emailDuplicate && form.email" class="email-duplicate">
                ❌ Email već postoji (ID: {{ duplicateUserId }})
              </div>
              <span v-if="errors.email" class="error-message">{{ errors.email }}</span>
            </div>

            <div class="form-group">
              <label for="username" class="form-label">
                Korisničko ime
                <span class="label-hint">Automatski generirano ako ostane prazno</span>
              </label>
              <input
                id="username"
                v-model="form.username"
                type="text"
                class="form-input"
                placeholder="Automatski generirano"
              />
              <button 
                type="button" 
                @click="generateUsername"
                class="btn-generate"
              >
                🔄 Generiraj
              </button>
            </div>
          </div>
        </div>

        <!-- Contact Information Section -->
        <div class="form-section">
          <h2 class="section-title">📞 Kontakt Informacije</h2>
          <div class="form-grid">
            <div class="form-group">
              <label for="phone_mobile" class="form-label">
                Mobitel
                <span class="label-hint">Mobitel broj korisnika</span>
              </label>
              <input
                id="phone_mobile"
                v-model="form.phone_mobile"
                type="tel"
                class="form-input"
                placeholder="+385 99 123 4567"
              />
            </div>

            <div class="form-group">
              <label for="phone_office" class="form-label">
                Službeni telefon
                <span class="label-hint">Službeni broj telefona</span>
              </label>
              <input
                id="phone_office"
                v-model="form.phone_office"
                type="tel"
                class="form-input"
                placeholder="+385 1 234 567"
              />
            </div>

            <div class="form-group">
              <label for="company" class="form-label">
                Tvrtka
                <span class="label-hint">Naziv tvrtke/organizacije</span>
              </label>
              <input
                id="company"
                v-model="form.company"
                type="text"
                class="form-input"
                placeholder="npr. IT Solutions d.o.o."
              />
            </div>

            <div class="form-group">
              <label for="department" class="form-label">
                Odjel
                <span class="label-hint">Odjel u kojem korisnik radi</span>
              </label>
              <input
                id="department"
                v-model="form.department"
                type="text"
                class="form-input"
                placeholder="npr. IT, Prodaja, Marketing..."
              />
            </div>
          </div>

          <div class="form-group full-width">
            <label for="address" class="form-label">
              Adresa
              <span class="label-hint">Puna adresa korisnika</span>
            </label>
            <textarea
              id="address"
              v-model="form.address"
              class="form-textarea"
              rows="3"
              placeholder="Unesite punu adresu..."
            ></textarea>
          </div>
        </div>

        <!-- Role and Permissions Section -->
        <div class="form-section">
          <h2 class="section-title">🏢 Radne Informacije</h2>
          <div class="form-grid">
            <div class="form-group">
              <label for="role" class="form-label">
                Uloga u Sustavu *
                <span class="label-hint">Odredite privilegije korisnika</span>
              </label>
              <select
                id="role"
                v-model="form.role"
                class="form-select"
                :class="{ error: errors.role }"
                required
              >
                <option value="">Odaberite ulogu</option>
                <option value="user">Korisnik</option>
                <option value="manager">Manager</option>
                <option value="admin">Administrator</option>
              </select>
              <span v-if="errors.role" class="error-message">{{ errors.role }}</span>
            </div>

            <!-- Auth Method Removed - Automatically uses email_password with generated password -->
            <div class="form-group">
              <label class="form-label">
                Način Autentifikacije
                <span class="label-hint">Kako će korisnik pristupati sustavu</span>
              </label>
              <div class="auth-method-info">
                <div class="auth-info-card">
                  <div class="auth-icon">🔐</div>
                  <div class="auth-info">
                    <strong>Email + Sigurna lozinka</strong>
                    <span>Sustav će automatski generirati sigurnu lozinku</span>
                  </div>
                </div>
                <p class="auth-note">
                  <strong>Napomena:</strong> Lozinka će biti generisana i prikazana vam nakon kreiranja korisnika.
                  Korisnik će morati promijeniti lozinku pri prvoj prijavi.
                </p>
              </div>
            </div>
          </div>

          <!-- Role Descriptions -->
          <div class="role-descriptions">
            <div v-for="role in roleDescriptions" :key="role.value" class="role-info">
              <strong>{{ role.label }}:</strong> {{ role.description }}
            </div>
          </div>

          <!-- Permissions -->
          <div class="permissions-section">
            <h4>Dozvole</h4>
            <div class="permissions-grid">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  v-model="form.can_export"
                  class="checkbox"
                />
                <span class="checkmark"></span>
                Može izvesti podatke
              </label>
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  v-model="form.can_manage_clients"
                  class="checkbox"
                  checked
                />
                <span class="checkmark"></span>
                Može upravljati klijentima
              </label>
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  v-model="form.can_view_reports"
                  class="checkbox"
                  checked
                />
                <span class="checkmark"></span>
                Može pregledavati izvještaje
              </label>
            </div>
          </div>
        </div>

        <!-- Email Notification Section -->
        <div class="form-section">
          <h2 class="section-title">📧 Email Obavijest</h2>
          <div class="notification-options">
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="form.send_activation_email"
                class="checkbox"
                checked
              />
              <span class="checkmark"></span>
              Pošalji aktivacijski email korisniku
            </label>
            <p class="notification-hint">
              Korisnik će dobiti email s uputama za aktivaciju računa.
              <strong>Lozinka nije uključena u email.</strong> Bit će prikazana vam nakon kreiranja korisnika.
            </p>
            
            <div v-if="form.send_activation_email" class="email-preview">
              <h4>Što će korisnik dobiti u emailu:</h4>
              <ul class="email-preview-list">
                <li>✅ Dobrodošlicu u CRM sistem</li>
                <li>✅ Link za aktivaciju računa</li>
                <li>✅ Upute za prvu prijavu</li>
                <li>✅ Obavijest da će morati promijeniti lozinku pri prvoj prijavi</li>
                <li>❌ <strong>Lozinka nije uključena</strong> (sigurnosna mjera)</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Additional Information -->
        <div class="form-section">
          <h2 class="section-title">📝 Dodatne Informacije</h2>
          <div class="form-group full-width">
            <label for="notes" class="form-label">
              Bilješke
              <span class="label-hint">Dodatne napomene o korisniku</span>
            </label>
            <textarea
              id="notes"
              v-model="form.notes"
              class="form-textarea"
              rows="3"
              placeholder="Dodatne napomene o korisniku..."
            ></textarea>
          </div>
        </div>

        <!-- Form Actions -->
        <div class="form-actions">
          <button
            type="button"
            @click="cancel"
            class="btn-outline"
            :disabled="loading"
          >
            Odustani
          </button>
          <button
            type="submit"
            class="btn-primary"
            :disabled="loading || emailDuplicate || !form.email"
          >
            <span v-if="loading" class="button-loading"></span>
            {{ loading ? 'Kreiram korisnika...' : 'Kreiraj Korisnika' }}
          </button>
        </div>
      </form>

      <!-- Preview Card -->
      <div class="preview-section">
        <h3 class="preview-title">Pregled Korisnika</h3>
        <div class="preview-card">
          <div class="preview-avatar">
            {{ getUserInitials(form.first_name, form.last_name) }}
          </div>
          <div class="preview-info">
            <h4>{{ form.first_name || 'Ime' }} {{ form.last_name || 'Prezime' }}</h4>
            <p class="preview-email">{{ form.email || 'email@primjer.com' }}</p>
            <div class="preview-details">
              <span class="preview-role" :class="form.role">
                {{ formatRole(form.role) || 'Uloga' }}
              </span>
              <span class="preview-auth">
                🔐 Email + Lozinka
              </span>
              <span class="preview-company">{{ form.company || 'Tvrtka' }}</span>
              <span class="preview-department">{{ form.department || 'Odjel' }}</span>
            </div>
          </div>
          <div class="preview-status">
            <div v-if="emailDuplicate" class="status-indicator duplicate">⚠️</div>
            <div v-else-if="form.email && emailAvailable" class="status-indicator available">✅</div>
            <div v-else class="status-indicator pending"></div>
            <span v-if="emailDuplicate">Email postoji</span>
            <span v-else-if="form.email && emailAvailable">Dostupan</span>
            <span v-else>Na čekanju</span>
          </div>
        </div>

        <!-- Security Info -->
        <div class="security-info">
          <h4>🔒 Sigurnosne informacije</h4>
          <ul class="security-list">
            <li>
              <span class="security-icon">🔐</span>
              <span><strong>Automatska lozinka:</strong> Generira se sigurna 24-karakterna lozinka</span>
            </li>
            <li>
              <span class="security-icon">⚠️</span>
              <span><strong>Prva prijava:</strong> Korisnik mora promijeniti lozinku pri prvoj prijavi</span>
            </li>
            <li>
              <span class="security-icon">📧</span>
              <span><strong>Email bez lozinke:</strong> Lozinka se nikad ne šalje putem emaila</span>
            </li>
            <li>
              <span class="security-icon">👁️</span>
              <span><strong>Prikaz adminu:</strong> Lozinka se prikazuje samo vam nakon kreiranja</span>
            </li>
          </ul>
        </div>

        <!-- Creation Tips -->
        <div class="tips-section">
          <h4>💡 Savjeti za kreiranje korisnika</h4>
          <ul class="tips-list">
            <li>Provjerite točnost email adrese prije slanja</li>
            <li>Odaberite odgovarajuću ulogu za svakog korisnika</li>
            <li>Automatska generirana lozinka je najsigurnija opcija</li>
            <li>Kopirajte lozinku odmah nakon prikaza i spremite na sigurno mjesto</li>
            <li>Obavijestite korisnika da će dobiti aktivacijski email</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Success Modal with Password Display -->
    <div v-if="showSuccessModal" class="modal-overlay">
      <div class="modal success-modal">
        <div class="modal-icon">✅</div>
        <div class="modal-content">
          <h3>Korisnik Uspješno Kreiran!</h3>
          <p>Korisnički račun za <strong>{{ createdUser?.first_name }} {{ createdUser?.last_name }}</strong> je uspješno kreiran.</p>
          
          <!-- Generated Password Section -->
          <div class="generated-password-section">
            <h4>🔐 generirana lozinka</h4>
            <div class="password-display">
              <div class="password-field">
                <input
                  type="text"
                  :value="generatedPassword"
                  readonly
                  ref="passwordInput"
                  class="password-input"
                />
                <div class="password-actions">
                  <button @click="copyPassword" class="btn-copy">
                    {{ copySuccess ? '✓ Kopirano!' : '📋 Kopiraj' }}
                  </button>
                  <button @click="togglePasswordVisibility" class="btn-visibility">
                    {{ showPassword ? '🙈 Sakrij' : '👁️ Pokaži' }}
                  </button>
                </div>
              </div>
              <div class="password-strength-display">
                <div class="strength-indicator strong"></div>
                <span class="strength-text">Jaka lozinka (24 karaktera)</span>
              </div>
            </div>
            
            <div class="password-warning">
              <div class="warning-icon">⚠️</div>
              <div class="warning-content">
                <p><strong>Ova lozinka se prikazuje samo jednom!</strong></p>
                <p>Kopirajte je odmah i spremite na sigurno mjesto. Korisnik će dobiti aktivacijski email bez lozinke.</p>
              </div>
            </div>
          </div>

          <!-- Email Status -->
          <div v-if="form.send_activation_email" class="email-status">
            <div class="status-card">
              <div class="status-icon">📧</div>
              <div class="status-info">
                <strong>Aktivacijski email poslan</strong>
                <span>Na adresu: {{ createdUser?.email }}</span>
              </div>
            </div>
            <p class="email-note">
              Korisnik će dobiti upute za aktivaciju računa. Nakon aktivacije, bit će upućen da promijeni lozinku pri prvoj prijavi.
            </p>
          </div>

          <div class="modal-actions">
            <button @click="createAnother" class="btn-outline">
              ➕ Dodaj Još Korisnika
            </button>
            <button @click="goToUsers" class="btn-primary">
              👥 Pregled Korisnika
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { adminAPI } from '@/services/api'

export default {
  name: 'CreateUserForm',
  setup() {
    const router = useRouter()
    const loading = ref(false)
    const showSuccessModal = ref(false)
    const createdUser = ref(null)
    const generatedPassword = ref('')
    const emailChecking = ref(false)
    const emailAvailable = ref(false)
    const emailDuplicate = ref(false)
    const duplicateUserId = ref(null)
    const existingUsers = ref([])
    const copySuccess = ref(false)
    const showPassword = ref(false)
    const passwordInput = ref(null)

    const form = reactive({
      first_name: '',
      last_name: '',
      email: '',
      username: '',
      phone_mobile: '',
      phone_office: '',
      company: '',
      address: '',
      department: '',
      role: 'user',
      send_activation_email: true,
      can_export: false,
      can_manage_clients: true,
      can_view_reports: true,
      notes: ''
    })

    const errors = reactive({
      first_name: '',
      last_name: '',
      email: '',
      role: ''
    })

    const roleDescriptions = [
      {
        value: 'user',
        label: 'Korisnik',
        description: 'Osnovni pristup, može pregledavati i upravljati vlastitim podacima'
      },
      {
        value: 'manager',
        label: 'Manager',
        description: 'Proširene privilegije, može upravljati timom i izvještajima'
      },
      {
        value: 'admin',
        label: 'Administrator',
        description: 'Puni pristup sustavu, upravljanje svim korisnicima i postavkama'
      }
    ]

    // Load existing users on mount
    onMounted(async () => {
      try {
        const response = await adminAPI.getUsers()
        if (response.success) {
          existingUsers.value = response.data.users || response.data || []
          console.log('📋 Učitano postojećih korisnika:', existingUsers.value.length)
        }
      } catch (error) {
        console.error('❌ Greška pri učitavanju korisnika:', error)
      }
    })

    // Methods
    const checkEmailAvailability = async () => {
      if (!form.email || !isValidEmail(form.email)) {
        emailAvailable.value = false
        emailDuplicate.value = false
        return
      }

      emailChecking.value = true
      emailAvailable.value = false
      emailDuplicate.value = false
      duplicateUserId.value = null

      try {
        // Check if email already exists in loaded users
        const existingUser = existingUsers.value.find(user => 
          user.email && user.email.toLowerCase() === form.email.toLowerCase()
        )

        if (existingUser) {
          emailDuplicate.value = true
          duplicateUserId.value = existingUser.id
          console.log('❌ Email već postoji:', form.email, 'Korisnik ID:', existingUser.id)
        } else {
          emailAvailable.value = true
          console.log('✅ Email je dostupan:', form.email)
        }
      } catch (error) {
        console.error('Greška pri provjeri emaila:', error)
      } finally {
        emailChecking.value = false
      }
    }

    const isValidEmail = (email) => {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    }

    const generateUsername = () => {
      if (form.email) {
        // Extract username from email (before @)
        const usernameFromEmail = form.email.split('@')[0]
        // Remove special characters and numbers
        const cleanUsername = usernameFromEmail.replace(/[^a-zA-Z]/g, '')
        
        if (cleanUsername && cleanUsername.length >= 3) {
          form.username = cleanUsername.toLowerCase()
        } else {
          // If no valid username from email, generate from name
          const firstName = form.first_name ? form.first_name.toLowerCase().replace(/[^a-z]/g, '') : ''
          const lastName = form.last_name ? form.last_name.toLowerCase().replace(/[^a-z]/g, '').substring(0, 1) : ''
          
          if (firstName) {
            form.username = firstName + (lastName || '')
          } else {
            // Fallback to random string
            const random = Math.random().toString(36).substring(2, 6)
            form.username = 'user' + random
          }
        }
      } else {
        alert('Molimo unesite email prije generiranja korisničkog imena')
      }
    }

    const validateForm = () => {
      let isValid = true

      // Reset errors
      Object.keys(errors).forEach(key => errors[key] = '')

      // First name validation
      if (!form.first_name.trim()) {
        errors.first_name = 'Ime je obavezno polje'
        isValid = false
      } else if (form.first_name.trim().length < 2) {
        errors.first_name = 'Ime mora imati najmanje 2 znaka'
        isValid = false
      }

      // Last name validation
      if (!form.last_name.trim()) {
        errors.last_name = 'Prezime je obavezno polje'
        isValid = false
      } else if (form.last_name.trim().length < 2) {
        errors.last_name = 'Prezime mora imati najmanje 2 znaka'
        isValid = false
      }

      // Email validation
      if (!form.email.trim()) {
        errors.email = 'Email je obavezno polje'
        isValid = false
      } else if (!isValidEmail(form.email)) {
        errors.email = 'Unesite ispravnu email adresu'
        isValid = false
      } else if (emailDuplicate.value) {
        errors.email = `Email već postoji (Korisnik ID: ${duplicateUserId.value})`
        isValid = false
      }

      // Role validation
      if (!form.role) {
        errors.role = 'Odabir uloge je obavezan'
        isValid = false
      }

      return isValid
    }

    const submitForm = async () => {
      if (!validateForm()) {
        return
      }

      try {
        loading.value = true
        console.log('🚀 Početak kreiranja korisnika...')

        // Prepare data for API - NOVI FORMAT
        const userData = {
          email: form.email.trim(),
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          phone_mobile: form.phone_mobile.trim(),
          phone_office: form.phone_office.trim(),
          company: form.company.trim(),
          address: form.address.trim(),
          department: form.department.trim(),
          role: form.role,
          send_activation_email: form.send_activation_email,
          can_export: form.can_export,
          can_manage_clients: form.can_manage_clients,
          can_view_reports: form.can_view_reports,
          notes: form.notes.trim(),
          generate_password: true // DODAJEMO OVO ZA GENERIRANJE LOZINKE
        }

        // Add username if provided
        if (form.username.trim()) {
          userData.username = form.username.trim()
        }

        console.log('📤 Šaljem podatke na backend:', userData)
        
        // API call - koristimo novi API koji vraća generisanu lozinku
        const response = await adminAPI.createUser(userData)

        console.log('✅ Odgovor servera:', response)

        if (response.success) {
          createdUser.value = response.user || {
            first_name: form.first_name,
            last_name: form.last_name,
            email: form.email
          }
          
          // Save generated password
          generatedPassword.value = response.temporary_password || ''
          
          showSuccessModal.value = true
          console.log('✅ Korisnik uspješno kreiran sa lozinkom:', generatedPassword.value ? 'DA' : 'NE')
          
          // Add to existing users list
          if (response.user) {
            existingUsers.value.push(response.user)
          }
          
          // Automatski selektiraj lozinku za kopiranje
          await nextTick()
          if (passwordInput.value) {
            passwordInput.value.select()
          }
        } else {
          // Handle backend validation errors
          if (response.message?.includes('email') || response.message?.includes('Email')) {
            emailDuplicate.value = true
            errors.email = response.message || 'Email već postoji u sustavu'
          } else {
            throw new Error(response.message || 'Došlo je do greške pri kreiranju korisnika')
          }
        }

      } catch (error) {
        console.error('❌ Greška pri kreiranju korisnika:', error)
        
        // Handle specific error cases
        if (error.response?.status === 400) {
          const errorData = error.response.data
          console.error('❌ Detalji greške 400:', errorData)
          
          if (errorData?.error) {
            if (errorData.error.includes('email') || errorData.error.includes('Email')) {
              emailDuplicate.value = true
              errors.email = errorData.error
            } else {
              alert(`Greška: ${errorData.error}`)
            }
          } else if (errorData?.message) {
            alert(`Greška: ${errorData.message}`)
          } else {
            alert('Došlo je do greške pri kreiranju korisnika. Provjerite konzolu za detalje.')
          }
        } else if (error.response?.status === 409) {
          emailDuplicate.value = true
          errors.email = 'Email već postoji u sustavu'
        } else if (error.message) {
          alert(`Greška: ${error.message}`)
        } else {
          alert('Došlo je do greške pri kreiranju korisnika. Provjerite konzolu za detalje.')
        }
      } finally {
        loading.value = false
      }
    }

    const copyPassword = () => {
      if (generatedPassword.value) {
        navigator.clipboard.writeText(generatedPassword.value).then(() => {
          copySuccess.value = true
          setTimeout(() => {
            copySuccess.value = false
          }, 2000)
        }).catch(err => {
          console.error('Greška pri kopiranju:', err)
          // Fallback za starije browsere
          const textArea = document.createElement('textarea')
          textArea.value = generatedPassword.value
          document.body.appendChild(textArea)
          textArea.select()
          document.execCommand('copy')
          document.body.removeChild(textArea)
          copySuccess.value = true
          setTimeout(() => {
            copySuccess.value = false
          }, 2000)
        })
      }
    }

    const togglePasswordVisibility = () => {
      showPassword.value = !showPassword.value
      if (passwordInput.value) {
        passwordInput.value.type = showPassword.value ? 'text' : 'password'
      }
    }

    const cancel = () => {
      router.push('/admin/users')
    }

    const createAnother = () => {
      // Reset form
      Object.keys(form).forEach(key => {
        form[key] = ''
      })
      
      // Set defaults
      form.role = 'user'
      form.send_activation_email = true
      form.can_export = false
      form.can_manage_clients = true
      form.can_view_reports = true
      
      // Reset other state
      showSuccessModal.value = false
      createdUser.value = null
      generatedPassword.value = ''
      emailAvailable.value = false
      emailDuplicate.value = false
      duplicateUserId.value = null
      copySuccess.value = false
      showPassword.value = false
    }

    const goToUsers = () => {
      router.push('/admin/users')
    }

    const getUserInitials = (firstName, lastName) => {
      if (!firstName && !lastName) return '??'
      return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
    }

    const formatRole = (role) => {
      const roles = {
        admin: 'Administrator',
        manager: 'Manager',
        user: 'Korisnik'
      }
      return roles[role] || role
    }

    // Watch for email changes
    watch(() => form.email, (newEmail) => {
      if (newEmail && isValidEmail(newEmail)) {
        // Debounce the email check
        const timeout = setTimeout(() => {
          checkEmailAvailability()
        }, 500)
        
        return () => clearTimeout(timeout)
      } else {
        emailAvailable.value = false
        emailDuplicate.value = false
      }
    })

    return {
      loading,
      showSuccessModal,
      createdUser,
      generatedPassword,
      form,
      errors,
      roleDescriptions,
      emailChecking,
      emailAvailable,
      emailDuplicate,
      duplicateUserId,
      copySuccess,
      showPassword,
      passwordInput,
      checkEmailAvailability,
      generateUsername,
      submitForm,
      copyPassword,
      togglePasswordVisibility,
      cancel,
      createAnother,
      goToUsers,
      getUserInitials,
      formatRole
    }
  }
}
</script>

<style scoped>
.full-width {
  grid-column: 1 / -1;
}

.form-textarea {
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: all 0.2s;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
}

.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.auth-method-info {
  margin-top: 0.5rem;
}

.auth-info-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #f0f9ff;
  border-radius: 0.5rem;
  border: 1px solid #bae6fd;
}

.auth-icon {
  font-size: 1.5rem;
}

.auth-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.auth-info strong {
  color: #0369a1;
}

.auth-info span {
  font-size: 0.875rem;
  color: #64748b;
}

.auth-note {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #fef3c7;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: #92400e;
}

.permissions-section {
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: #f8fafc;
  border-radius: 0.5rem;
  border-left: 4px solid #3b82f6;
}

.permissions-section h4 {
  margin: 0 0 1rem 0;
  color: #1e293b;
  font-size: 1rem;
}

.permissions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.preview-auth {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  width: fit-content;
  background: #dcfce7;
  color: #166534;
}

.preview-department {
  font-size: 0.75rem;
  color: #6b7280;
  background: #f3f4f6;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}

.email-preview {
  margin-top: 1rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
}

.email-preview h4 {
  margin: 0 0 0.75rem 0;
  color: #1e293b;
  font-size: 0.875rem;
}

.email-preview-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.email-preview-list li {
  padding: 0.25rem 0;
  font-size: 0.875rem;
  color: #4b5563;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Email status styles */
.email-checking {
  font-size: 0.75rem;
  color: #f59e0b;
  margin-top: 0.25rem;
}

.email-available {
  font-size: 0.75rem;
  color: #10b981;
  margin-top: 0.25rem;
}

.email-duplicate {
  font-size: 0.75rem;
  color: #dc2626;
  margin-top: 0.25rem;
}

/* Generate username button */
.btn-generate {
  margin-top: 0.5rem;
  padding: 0.25rem 0.75rem;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-generate:hover {
  background: #e5e7eb;
}

/* Status indicator */
.status-indicator {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
}

.status-indicator.duplicate {
  background: #fef3c7;
  color: #92400e;
}

.status-indicator.available {
  background: #d1fae5;
  color: #065f46;
}

.status-indicator.pending {
  background: #fef3c7;
  animation: pulse 2s infinite;
}

/* Security Info */
.security-info {
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: #f8fafc;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
}

.security-info h4 {
  margin: 0 0 1rem 0;
  color: #1e293b;
  font-size: 1rem;
}

.security-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.security-list li {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f1f5f9;
}

.security-list li:last-child {
  border-bottom: none;
}

.security-icon {
  font-size: 1rem;
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.security-list li span:last-child {
  font-size: 0.875rem;
  color: #4b5563;
}

.security-list li strong {
  color: #1e293b;
}

.create-user-form {
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

.form-container {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
}

.user-form {
  background: white;
  padding: 2rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.form-section {
  margin-bottom: 2.5rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid #f1f5f9;
}

.form-section:last-of-type {
  border-bottom: none;
  margin-bottom: 0;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 1.5rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-label {
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.label-hint {
  display: block;
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: normal;
  margin-top: 0.25rem;
}

.form-input,
.form-select {
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-input.error,
.form-select.error {
  border-color: #dc2626;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
}

.error-message {
  color: #dc2626;
  font-size: 0.75rem;
  margin-top: 0.5rem;
}

.role-descriptions {
  margin-top: 1rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 0.375rem;
  border-left: 4px solid #3b82f6;
}

.role-info {
  font-size: 0.875rem;
  color: #4b5563;
  margin-bottom: 0.75rem;
}

.role-info:last-child {
  margin-bottom: 0;
}

.role-info strong {
  color: #1e293b;
}

.notification-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  cursor: pointer;
  font-weight: 500;
  color: #374151;
}

.checkbox {
  margin-top: 0.25rem;
}

.notification-hint {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
  padding-left: 1.75rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #f1f5f9;
}

.preview-section {
  background: white;
  padding: 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  height: fit-content;
  position: sticky;
  top: 2rem;
}

.preview-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 1.5rem;
}

.preview-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: #f8fafc;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
  margin-bottom: 2rem;
}

.preview-avatar {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background: #3b82f6;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.875rem;
  flex-shrink: 0;
}

.preview-info {
  flex: 1;
}

.preview-info h4 {
  margin: 0 0 0.25rem 0;
  color: #1e293b;
  font-size: 1rem;
}

.preview-email {
  margin: 0 0 0.75rem 0;
  color: #3b82f6;
  font-size: 0.875rem;
}

.preview-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.preview-role {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  width: fit-content;
}

.preview-role.admin {
  background: #fef3c7;
  color: #92400e;
}

.preview-role.manager {
  background: #dbeafe;
  color: #1e40af;
}

.preview-role.user {
  background: #dcfce7;
  color: #166534;
}

.preview-company {
  font-size: 0.75rem;
  color: #6b7280;
}

.preview-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.tips-section h4 {
  font-size: 1rem;
  color: #1e293b;
  margin-bottom: 1rem;
}

.tips-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tips-list li {
  padding: 0.5rem 0;
  color: #4b5563;
  font-size: 0.875rem;
  border-bottom: 1px solid #f1f5f9;
}

.tips-list li:last-child {
  border-bottom: none;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.success-modal {
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
  text-align: center;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.modal-content h3 {
  font-size: 1.5rem;
  color: #1e293b;
  margin-bottom: 1rem;
}

.modal-content p {
  color: #4b5563;
  margin-bottom: 1.5rem;
}

/* Generated Password Section */
.generated-password-section {
  background: #f8fafc;
  padding: 1.5rem;
  border-radius: 0.75rem;
  margin: 1.5rem 0;
  border: 1px solid #e2e8f0;
}

.generated-password-section h4 {
  margin: 0 0 1rem 0;
  color: #1e293b;
  font-size: 1rem;
  text-align: left;
}

.password-display {
  text-align: left;
}

.password-field {
  position: relative;
  margin-bottom: 1rem;
}

.password-input {
  width: 100%;
  padding: 0.75rem;
  font-family: 'Courier New', monospace;
  font-size: 1rem;
  letter-spacing: 1px;
  background: white;
  border: 2px solid #3b82f6;
  border-radius: 0.5rem;
  color: #1e293b;
  font-weight: bold;
}

.password-input:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

.password-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.btn-copy, .btn-visibility {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-copy {
  background: #3b82f6;
  color: white;
}

.btn-copy:hover {
  background: #2563eb;
}

.btn-visibility {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-visibility:hover {
  background: #e5e7eb;
}

.password-strength-display {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.strength-indicator {
  width: 100%;
  height: 6px;
  border-radius: 3px;
}

.strength-indicator.strong {
  background: linear-gradient(90deg, #10b981, #34d399);
}

.strength-text {
  font-size: 0.75rem;
  color: #10b981;
  white-space: nowrap;
}

.password-warning {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: #fef3c7;
  border-radius: 0.5rem;
  border: 1px solid #fbbf24;
  margin-top: 1rem;
}

.warning-icon {
  font-size: 1.25rem;
  color: #92400e;
}

.warning-content {
  text-align: left;
}

.warning-content p {
  margin: 0.25rem 0;
  font-size: 0.875rem;
  color: #92400e;
}

/* Email Status */
.email-status {
  text-align: left;
  margin: 1.5rem 0;
}

.status-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #f0f9ff;
  border-radius: 0.5rem;
  border: 1px solid #bae6fd;
  margin-bottom: 1rem;
}

.status-icon {
  font-size: 1.5rem;
}

.status-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.status-info strong {
  color: #0369a1;
}

.status-info span {
  font-size: 0.875rem;
  color: #64748b;
}

.email-note {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0;
  text-align: left;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

/* Button Styles */
.btn-primary {
  background: #3b82f6;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.375rem;
  text-decoration: none;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 120px;
  justify-content: center;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-outline {
  background: white;
  color: #374151;
  padding: 0.75rem 1.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 120px;
  justify-content: center;
}

.btn-outline:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #9ca3af;
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

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Responsive */
@media (max-width: 1024px) {
  .form-container {
    grid-template-columns: 1fr;
  }
  
  .preview-section {
    position: static;
    order: -1;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .modal-actions {
    flex-direction: column;
  }
  
  .preview-card {
    flex-direction: column;
    text-align: center;
  }
  
  .password-actions {
    flex-direction: column;
  }
}
</style>