<!-- src/components/admin/EditUserForm.vue -->
<template>
  <div class="edit-user-form">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="breadcrumb-nav">
          <router-link to="/admin/users" class="breadcrumb-link">
            👥 Korisnici
          </router-link>
          <span class="breadcrumb-separator">/</span>
          <span class="breadcrumb-current">Uredi Korisnika</span>
        </div>
        <h1>Uredi Korisnika</h1>
        <p>Ažuriraj podatke za {{ user?.full_name || 'korisnika' }}</p>
      </div>
      <div class="header-actions">
        <router-link to="/admin/users" class="btn-outline">
          ← Natrag na Korisnike
        </router-link>
        <button @click="refreshUser" class="btn-secondary" :disabled="loading">
          🔄 Osvježi
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div class="content-container">
      <!-- Loading State -->
      <div v-if="loading && !user" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Učitavanje podataka korisnika...</p>
      </div>

      <!-- User Not Found -->
      <div v-else-if="!user && !loading" class="error-state">
        <div class="error-icon">❌</div>
        <h3>Korisnik nije pronađen</h3>
        <p>Korisnik kojeg pokušavate urediti ne postoji ili nemate pristup.</p>
        <router-link to="/admin/users" class="btn-primary">
          👥 Vrati se na Korisnike
        </router-link>
      </div>

      <!-- Edit Form -->
      <div v-else class="edit-container">
        <!-- User Summary Card -->
        <div class="user-summary-card">
          <div class="user-avatar-large">
            {{ getUserInitials(user.full_name) }}
          </div>
          <div class="user-summary-info">
            <h2>{{ user.full_name }}</h2>
            <p class="user-email">{{ user.email }}</p>
            <div class="user-meta">
              <span class="user-role" :class="user.role">
                {{ formatRole(user.role) }}
              </span>
              <span class="user-status" :class="user.status">
                {{ formatStatus(user.status) }}
              </span>
              <span class="user-date">
                Član od {{ formatDate(user.created_at) }}
              </span>
            </div>
          </div>
          <div class="user-actions">
            <button v-if="user.status === 'pending' || user.status === 'pending_verification'" @click="resendActivation"
              class="btn-action" :disabled="actionLoading">
              📧 Pošalji Aktivaciju
            </button>
            <button v-if="user.id !== currentUser?.id" @click="toggleUserStatus" class="btn-action"
              :disabled="actionLoading">
              {{ user.status === 'active' ? '⏸️ Deaktiviraj' : '✅ Aktiviraj' }}
            </button>
          </div>
        </div>

        <!-- Form Sections -->
        <div class="form-sections">
          <!-- Personal Information -->
          <div class="form-section">
            <div class="section-header">
              <h3>📋 Osnovne Informacije</h3>
              <span class="section-badge">Obavezno</span>
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label for="first_name" class="form-label">
                  Ime *
                </label>
                <input id="first_name" v-model="form.first_name" type="text" class="form-input"
                  :class="{ error: errors.first_name }" placeholder="Unesite ime" />
                <span v-if="errors.first_name" class="error-message">{{ errors.first_name }}</span>
              </div>

              <div class="form-group">
                <label for="last_name" class="form-label">
                  Prezime *
                </label>
                <input id="last_name" v-model="form.last_name" type="text" class="form-input"
                  :class="{ error: errors.last_name }" placeholder="Unesite prezime" />
                <span v-if="errors.last_name" class="error-message">{{ errors.last_name }}</span>
              </div>

              <div class="form-group">
                <label for="email" class="form-label">
                  Email Adresa *
                </label>
                <input id="email" v-model="form.email" type="email" class="form-input" :class="{ error: errors.email }"
                  placeholder="unesite@email.com" />
                <span v-if="errors.email" class="error-message">{{ errors.email }}</span>
              </div>

              <div class="form-group">
                <label for="phone_mobile" class="form-label">
                  Mobitel
                </label>
                <input id="phone_mobile" v-model="form.phone_mobile" type="tel" class="form-input"
                  placeholder="+385 9X XXX XXX" />
              </div>

              <div class="form-group">
                <label for="phone_office" class="form-label">
                  Poslovni telefon
                </label>
                <input id="phone_office" v-model="form.phone_office" type="tel" class="form-input"
                  placeholder="+385 1 XXXX XXX" />
              </div>
            </div>
          </div>

          <!-- Work Information -->
          <div class="form-section">
            <div class="section-header">
              <h3>🏢 Radne Informacije</h3>
              <span class="section-badge">Opcijsko</span>
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label for="company" class="form-label">
                  Tvrtka
                </label>
                <input id="company" v-model="form.company" type="text" class="form-input" placeholder="Naziv tvrtke" />
              </div>

              <div class="form-group">
                <label for="department" class="form-label">
                  Odjel
                </label>
                <input id="department" v-model="form.department" type="text" class="form-input"
                  placeholder="npr. IT, Prodaja, Marketing..." />
              </div>

              <div class="form-group">
                <label for="address" class="form-label">
                  Adresa
                </label>
                <textarea id="address" v-model="form.address" class="form-input" rows="3"
                  placeholder="Unesite adresu..."></textarea>
              </div>

              <div class="form-group">
                <label for="status" class="form-label">Status Korisnika *</label>
                <select id="status" v-model="form.status" class="form-select" :class="{ error: errors.status }">
                  <option value="active">Aktivan</option>
                  <option value="inactive">Neaktivan</option>
                  <option value="pending">Na čekanju</option>
                  <option value="pending_verification">Čeka verifikaciju</option>
                </select>
                <span v-if="errors.status" class="error-message">{{ errors.status }}</span>
              </div>

              <div class="form-group">
                <label for="role" class="form-label">
                  Uloga u Sustavu *
                </label>
                <select id="role" v-model="form.role" class="form-select" :class="{ error: errors.role }">
                  <option value="">Odaberite ulogu</option>
                  <option value="user">Korisnik</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Administrator</option>
                </select>
                <span v-if="errors.role" class="error-message">{{ errors.role }}</span>

                <div class="role-warning" v-if="form.role === 'admin' && user.id !== currentUser?.id">
                  ⚠️ <strong>Upozorenje:</strong> Dodjeljujete administratorske privilegije.
                  Korisnik će imati potpuni pristup sustavu.
                </div>
              </div>
            </div>
          </div>

          <!-- Permissions -->
          <div class="form-section">
            <div class="section-header">
              <h3>🔐 Dozvole</h3>
              <span class="section-badge">Opcijsko</span>
            </div>
            <div class="permissions-grid">
              <div class="permission-item">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="form.can_manage_clients" class="checkbox" />
                  <span class="checkmark"></span>
                  Upravljanje klijentima
                </label>
                <p class="permission-hint">Može dodavati, uređivati i brisati klijente</p>
              </div>

              <div class="permission-item">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="form.can_view_reports" class="checkbox" />
                  <span class="checkmark"></span>
                  Pregled izvješća
                </label>
                <p class="permission-hint">Može pregledavati statistiku i izvješća</p>
              </div>

              <div class="permission-item">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="form.can_export" class="checkbox" />
                  <span class="checkmark"></span>
                  Izvoz podataka
                </label>
                <p class="permission-hint">Može izvesti podatke u CSV/Excel formatu</p>
              </div>
            </div>
          </div>

          <!-- Password Reset -->
          <div class="form-section">
            <div class="section-header">
              <h3>🔐 Resetiranje Lozinke</h3>
              <span class="section-badge">Opcijsko</span>
            </div>

            <div class="password-reset-options">
              <label class="option-label">
                <input type="radio" v-model="passwordOption" value="keep" class="option-radio" />
                <span class="option-content">
                  <strong>Zadrži trenutnu lozinku</strong>
                  <span>Korisnik će nastaviti koristiti postojeću lozinku</span>
                </span>
              </label>

              <label class="option-label">
                <input type="radio" v-model="passwordOption" value="auto" class="option-radio" />
                <span class="option-content">
                  <strong>Generiraj novu lozinku</strong>
                  <span>Sustav će automatski generirati sigurnu lozinku i poslati je korisniku putem emaila</span>
                </span>
              </label>

              <label class="option-label">
                <input type="radio" v-model="passwordOption" value="manual" class="option-radio" />
                <span class="option-content">
                  <strong>Postavi novu lozinku</strong>
                  <span>Ručno unesite novu lozinku za korisnika</span>
                </span>
              </label>
            </div>

            <!-- Manual Password Input -->
            <div v-if="passwordOption === 'manual'" class="manual-password">
              <div class="form-grid">
                <div class="form-group">
                  <label for="password" class="form-label">
                    Nova Lozinka *
                    <span class="label-hint">Minimalno 8 znakova</span>
                  </label>
                  <div class="password-input-wrapper">
                    <input id="password" v-model="form.password" :type="showPassword ? 'text' : 'password'"
                      class="form-input" :class="{ error: errors.password }" placeholder="Unesite novu lozinku" />
                    <button type="button" @click="showPassword = !showPassword" class="password-toggle">
                      {{ showPassword ? '🙈' : '👁️' }}
                    </button>
                  </div>
                  <span v-if="errors.password" class="error-message">{{ errors.password }}</span>
                </div>

                <div class="form-group">
                  <label for="password_confirmation" class="form-label">
                    Potvrdi Lozinku *
                  </label>
                  <div class="password-input-wrapper">
                    <input id="password_confirmation" v-model="form.password_confirmation"
                      :type="showPassword ? 'text' : 'password'" class="form-input"
                      :class="{ error: errors.password_confirmation }" placeholder="Ponovite lozinku" />
                    <button type="button" @click="showPassword = !showPassword" class="password-toggle">
                      {{ showPassword ? '🙈' : '👁️' }}
                    </button>
                  </div>
                  <span v-if="errors.password_confirmation" class="error-message">
                    {{ errors.password_confirmation }}
                  </span>
                </div>
              </div>

              <!-- Password Strength Indicator -->
              <div v-if="form.password" class="password-strength">
                <div class="strength-bar" :class="passwordStrength.class"></div>
                <span class="strength-text">{{ passwordStrength.text }}</span>
              </div>
            </div>

            <div v-if="passwordOption !== 'keep'" class="password-notification">
              <label class="checkbox-label">
                <input type="checkbox" v-model="form.send_password_email" class="checkbox" />
                <span class="checkmark"></span>
                Pošalji email obavijest korisniku
              </label>
              <p class="notification-hint">
                Korisnik će dobiti email s novim podacima za prijavu.
              </p>
            </div>
          </div>

          <!-- Danger Zone -->
          <div v-if="user.id !== currentUser?.id" class="form-section danger-zone">
            <div class="section-header">
              <h3>⚡ Opasna Zona</h3>
              <span class="section-badge danger">Oprez</span>
            </div>

            <div class="danger-actions">
              <div class="danger-action">
                <div class="danger-info">
                  <h4>Trajno obriši korisnički račun</h4>
                  <p>Ovom akcijom ćete trajno obrisati korisnički račun i sve povezane podatke. Ova akcija se ne može
                    poništiti.</p>
                </div>
                <button @click="confirmDelete" class="btn-danger" :disabled="actionLoading">
                  🗑️ Obriši Korisnika
                </button>
              </div>
            </div>
          </div>

          <!-- Form Actions -->
          <div class="form-actions">
            <div class="action-info">
              <span v-if="hasChanges" class="changes-indicator">
                ● Imaš nespremljene promjene
              </span>
              <span v-else class="no-changes">
                ✓ Sve promjene su spremljene
              </span>
            </div>
            <div class="action-buttons">
              <button type="button" @click="resetForm" class="btn-outline" :disabled="!hasChanges || loading">
                ❌ Odbaci Promjene
              </button>
              <button type="button" @click="saveForm" class="btn-secondary" :disabled="!hasChanges || loading">
                💾 Spremi Promjene
              </button>
              <button type="button" @click="saveAndContinue" class="btn-primary" :disabled="loading">
                {{ loading ? 'Spremanje...' : '🚀 Spremi i Nastavi' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Activity Log -->
      <div class="activity-section">
        <h3>📊 Povijest Aktivnosti</h3>
        <div class="activity-log">
          <div v-if="userActivity.length === 0" class="empty-activity">
            <p>Nema zapisa o aktivnostima za ovog korisnika</p>
          </div>
          <div v-else class="activity-items">
            <div v-for="activity in userActivity" :key="activity.id" class="activity-item">
              <div class="activity-icon">{{ activity.icon }}</div>
              <div class="activity-content">
                <p class="activity-text">{{ activity.description }}</p>
                <span class="activity-time">{{ formatTime(activity.timestamp) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal-overlay">
      <div class="modal danger-modal">
        <div class="modal-header">
          <h3>Potvrdi Brisanje Korisnika</h3>
          <button @click="closeModal" class="modal-close">×</button>
        </div>
        <div class="modal-body">
          <div class="warning-icon">⚠️</div>
          <h4>Jeste li sigurni da želite obrisati korisnika?</h4>
          <p>Korisnik <strong>{{ user?.full_name }}</strong> (<strong>{{ user?.email }}</strong>) će biti trajno obrisan
            iz
            sustava.</p>
          <div class="delete-consequences">
            <p><strong>Ova akcija će:</strong></p>
            <ul>
              <li>Trajno obrisati korisnički račun</li>
              <li>Obrisati sve povezane podatke</li>
              <li>Onemogućiti pristup sustavu</li>
            </ul>
            <p class="final-warning">Ova akcija se ne može poništiti!</p>
          </div>
        </div>
        <div class="modal-actions">
          <button @click="closeModal" class="btn-outline">Odustani</button>
          <button @click="deleteUser" class="btn-danger">
            🗑️ Da, Obriši Korisnika
          </button>
        </div>
      </div>
    </div>

    <!-- Success Toast -->
    <div v-if="showSuccessToast" class="success-toast">
      <div class="toast-icon">✅</div>
      <div class="toast-content">
        <strong>Uspjeh!</strong>
        <p>Podaci korisnika su uspješno ažurirani.</p>
      </div>
      <button @click="showSuccessToast = false" class="toast-close">×</button>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { adminAPI, authHelper } from '@/services/api'

export default {
  name: 'EditUserForm',
  setup() {
    const router = useRouter()
    const route = useRoute()
    const loading = ref(false)
    const actionLoading = ref(false)
    const showPassword = ref(false)
    const passwordOption = ref('keep')
    const showDeleteModal = ref(false)
    const showSuccessToast = ref(false)
    const user = ref(null)
    const userActivity = ref([])

    const form = reactive({
      first_name: '',
      last_name: '',
      email: '',
      company: '',
      department: '',
      address: '',
      phone_mobile: '',
      phone_office: '',
      role: '',
      status: 'active',
      can_export: false,
      can_manage_clients: true,
      can_view_reports: true,
      // Password polja za manual reset
      password: '',
      password_confirmation: '',
      send_password_email: true
    })

    const originalForm = reactive({})
    const errors = reactive({})

    const currentUser = ref(authHelper.getUser())
    const userId = computed(() => route.params.id)

    // Computed properties
    const hasChanges = computed(() => {
      return Object.keys(form).some(key => {
        if (key === 'password' || key === 'password_confirmation') {
          return passwordOption.value === 'manual' && form[key] !== originalForm[key]
        }
        return form[key] !== originalForm[key]
      })
    })

    const passwordStrength = computed(() => {
      if (!form.password) return { class: 'none', text: '' }

      const strength = {
        length: form.password.length >= 8,
        uppercase: /[A-Z]/.test(form.password),
        lowercase: /[a-z]/.test(form.password),
        numbers: /\d/.test(form.password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(form.password)
      }

      const score = Object.values(strength).filter(Boolean).length

      if (score <= 2) return { class: 'weak', text: 'Slaba lozinka' }
      if (score <= 4) return { class: 'medium', text: 'Srednja lozinka' }
      return { class: 'strong', text: 'Jaka lozinka' }
    })

    // Methods
    const loadUser = async () => {
      try {
        loading.value = true
        console.log('🔄 Učitavam korisnika s ID:', userId.value)

        // POKUŠAJ DIREKTNU RUTU PRVO
        try {
          console.log('📍 Pokušavam direktnu rutu /api/admin/users/' + userId.value)

          // Koristi novu getUserById metodu
          const directResponse = await adminAPI.getUserById(userId.value)

          if (directResponse.success && directResponse.data) {
            user.value = directResponse.data
            console.log('✅ Korisnik pronađen preko direktne rute:', user.value)
          } else {
            throw new Error('Direktna ruta vratila prazne podatke')
          }

        } catch (directError) {
          console.log('📍 Direktna ruta ne radi:', directError.message)
          console.log('🔄 Pokrećem fallback metodu...')

          // FALLBACK: Dohvati sve usere i filtriraj
          try {
            const allUsersResponse = await adminAPI.getUsers()
            const allUsers = allUsersResponse.data || allUsersResponse

            const foundUser = allUsers.find(u => u.id == userId.value)

            if (!foundUser) {
              console.error('❌ Korisnik nije pronađen ni preko fallbacka:', userId.value)
              user.value = null
              return
            }

            console.log('✅ Korisnik pronađen preko fallback metode:', foundUser)
            user.value = foundUser
          } catch (fallbackError) {
            console.error('❌ Fallback metoda također ne radi:', fallbackError)
            throw new Error('Nije moguće učitati podatke korisnika')
          }
        }

        // INIT FORM SA PODACIMA KORISNIKA
        if (user.value) {
          console.log('📝 Inicijaliziram formu s podacima:', user.value)

          // Koristit first_name i last_name direktno iz user objekta
          form.first_name = user.value.first_name || ''
          form.last_name = user.value.last_name || ''

          // Osnovni podaci
          form.email = user.value.email || ''
          form.company = user.value.company || ''
          form.role = user.value.role || 'user'
          form.phone_mobile = user.value.phone_mobile || ''
          form.department = user.value.department || ''
          form.status = user.value.status || 'pending_verification'

          // Dodatna polja ako postoje
          if (user.value.phone_office !== undefined) {
            form.phone_office = user.value.phone_office
          }
          if (user.value.address !== undefined) {
            form.address = user.value.address
          }
          if (user.value.can_export !== undefined) {
            form.can_export = user.value.can_export
          }
          if (user.value.can_manage_clients !== undefined) {
            form.can_manage_clients = user.value.can_manage_clients
          }
          if (user.value.can_view_reports !== undefined) {
            form.can_view_reports = user.value.can_view_reports
          }

          // Spremi originalne vrijednosti za detekciju promjena
          Object.keys(form).forEach(key => {
            originalForm[key] = form[key]
          })

          console.log('✅ Forma uspješno inicijalizirana:', form)
          console.log('📋 Originalne vrijednosti spremljene:', originalForm)
        } else {
          console.error('❌ user.value je null/undefined')
        }

        // Load activity
        await loadUserActivity()

      } catch (error) {
        console.error('❌ Kritična greška pri učitavanju korisnika:', error)
        alert('Došlo je do greške pri učitavanju korisnika: ' + (error.userMessage || error.message))
      } finally {
        loading.value = false
      }
    }

    const loadUserActivity = async () => {
      try {
        userActivity.value = [
          {
            id: 1,
            icon: '👤',
            description: 'Korisnički račun kreiran',
            timestamp: new Date(user.value?.created_at || Date.now())
          },
          {
            id: 2,
            icon: user.value?.email_verified ? '✅' : '⏳',
            description: user.value?.email_verified ? 'Email adresa verificirana' : 'Email adresa čeka verifikaciju',
            timestamp: new Date((user.value?.created_at || Date.now()) + 4 * 60 * 60 * 1000)
          },
          {
            id: 3,
            icon: '🔐',
            description: `Zadnja prijava: ${user.value?.last_login_at ? formatTime(user.value.last_login_at) : 'Nikada'}`,
            timestamp: user.value?.last_login_at ? new Date(user.value.last_login_at) : new Date((user.value?.created_at || Date.now()) + 24 * 60 * 60 * 1000)
          }
        ]
      } catch (error) {
        console.error('❌ Greška pri učitavanju aktivnosti:', error)
        userActivity.value = []
      }
    }

    const validateForm = () => {
      let isValid = true
      Object.keys(errors).forEach(key => errors[key] = '')

      // Validacija first_name i last_name
      if (!form.first_name.trim()) {
        errors.first_name = 'Ime je obavezno polje'
        isValid = false
      }

      if (!form.last_name.trim()) {
        errors.last_name = 'Prezime je obavezno polje'
        isValid = false
      }

      if (!form.email.trim()) {
        errors.email = 'Email je obavezno polje'
        isValid = false
      } else if (!/\S+@\S+\.\S+/.test(form.email)) {
        errors.email = 'Unesite ispravnu email adresu'
        isValid = false
      }

      if (!form.role) {
        errors.role = 'Odabir uloge je obavezan'
        isValid = false
      }

      // Password validacija samo za manual reset
      if (passwordOption.value === 'manual') {
        if (!form.password) {
          errors.password = 'Lozinka je obavezna'
          isValid = false
        } else if (form.password.length < 8) {
          errors.password = 'Lozinka mora imati najmanje 8 znakova'
          isValid = false
        }

        if (form.password !== form.password_confirmation) {
          errors.password_confirmation = 'Lozinke se ne podudaraju'
          isValid = false
        }
      }

      return isValid
    }

    // NOVA FUNKCIJA: Password reset
    const handlePasswordReset = async () => {
      try {
        console.log('🔐 Handling password reset for user:', userId.value)
        
        const passwordData = {
          user_id: userId.value,
          reset_type: passwordOption.value,
          send_email: form.send_password_email
        }

        // Dodaj password polja za manual reset
        if (passwordOption.value === 'manual') {
          passwordData.password = form.password
          passwordData.password_confirmation = form.password_confirmation
        }

        console.log('📡 [FRONTEND] Sending password reset request:', passwordData)
        
        const response = await adminAPI.resetUserPassword(passwordData)
        
        console.log('✅ [FRONTEND] Password reset successful:', response)
        
        return response

      } catch (error) {
        console.error('❌ Password reset failed:', error)
        throw new Error('Greška pri resetiranju lozinke: ' + (error.response?.data?.error || error.message))
      }
    }

    const saveForm = async () => {
      if (!validateForm()) return

      try {
        loading.value = true

        const updateData = {
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          company: form.company,
          department: form.department,
          address: form.address,
          phone_mobile: form.phone_mobile,
          phone_office: form.phone_office,
          status: form.status,
          role: form.role,
          can_export: form.can_export,
          can_manage_clients: form.can_manage_clients,
          can_view_reports: form.can_view_reports
        }

        console.log('💾 [FRONTEND] Sending UPDATE data:', updateData)
        console.log('👤 [FRONTEND] User ID:', userId.value)

        // 1. Ažuriraj osnovne podatke korisnika
        const response = await adminAPI.updateUser(userId.value, updateData)

        console.log('✅ [FRONTEND] Update response:', response)

        if (response && response.success) {
          // 2. Ako je odabran password reset, obradi ga
          if (passwordOption.value !== 'keep') {
            console.log('🔐 [FRONTEND] Processing password reset...')
            await handlePasswordReset()
          }

          // Ažuriraj lokalne podatke
          user.value = {
            ...user.value,
            ...updateData,
            full_name: `${form.first_name} ${form.last_name}`.trim()
          }

          // Update original form
          Object.keys(updateData).forEach(key => {
            if (key in originalForm) {
              originalForm[key] = form[key]
            }
          })

          // Reset password polja nakon uspješnog spremanja
          if (passwordOption.value === 'manual') {
            form.password = ''
            form.password_confirmation = ''
            originalForm.password = ''
            originalForm.password_confirmation = ''
          }

          // Reset password option nakon uspješnog spremanja
          passwordOption.value = 'keep'

          showSuccessToast.value = true
          setTimeout(() => {
            showSuccessToast.value = false
          }, 5000)

          console.log('🎉 [FRONTEND] User updated successfully in frontend')
        } else {
          console.error('❌ [FRONTEND] Update response indicates failure:', response)
          throw new Error(response?.error || 'Update failed')
        }

      } catch (error) {
        console.error('💥 [FRONTEND] Update error details:')
        console.error('💥 Error object:', error)
        console.error('💥 Error response:', error.response?.data)
        console.error('💥 Error message:', error.message)

        let userMessage = 'Došlo je do greške pri ažuriranju korisnika'

        if (error.response?.data?.userMessage) {
          userMessage = error.response.data.userMessage
        } else if (error.response?.data?.error) {
          userMessage = error.response.data.error
        }

        alert(userMessage)
      } finally {
        loading.value = false
      }
    }

    const saveAndContinue = async () => {
      await saveForm()
      router.push('/admin/users')
    }

    const resetForm = () => {
      Object.keys(form).forEach(key => {
        if (key in originalForm) {
          form[key] = originalForm[key]
        } else {
          form[key] = ''
        }
      })
      passwordOption.value = 'keep'
      Object.keys(errors).forEach(key => errors[key] = '')
    }

    const refreshUser = () => {
      loadUser()
    }

    const resendActivation = async () => {
      try {
        actionLoading.value = true
        const response = await adminAPI.resendActivation(userId.value)
        alert('Aktivacijski email je poslan korisniku')
      } catch (error) {
        alert('Greška pri slanju aktivacijskog emaila: ' + (error.userMessage || error.message))
      } finally {
        actionLoading.value = false
      }
    }

    const toggleUserStatus = async () => {
      try {
        actionLoading.value = true
        const newStatus = user.value.status === 'active' ? 'inactive' : 'active'
        const response = await adminAPI.updateUser(userId.value, { status: newStatus })

        user.value.status = newStatus
        form.status = newStatus
        alert(`Korisnik je ${newStatus === 'active' ? 'aktiviran' : 'deaktiviran'}`)
      } catch (error) {
        alert('Greška pri promjeni statusa: ' + (error.userMessage || error.message))
      } finally {
        actionLoading.value = false
      }
    }

    const confirmDelete = () => {
      showDeleteModal.value = true
    }

    const closeModal = () => {
      showDeleteModal.value = false
    }

    const deleteUser = async () => {
      try {
        actionLoading.value = true
        const response = await adminAPI.deleteUser(userId.value)
        closeModal()
        alert('Korisnik je uspješno obrisan')
        router.push('/admin/users')
      } catch (error) {
        alert('Greška pri brisanju korisnika: ' + (error.userMessage || error.message))
      } finally {
        actionLoading.value = false
      }
    }

    // Helper methods
    const getUserInitials = (name) => {
      if (!name) return '??'
      return name.split(' ').map(part => part[0]).join('').toUpperCase().substring(0, 2)
    }

    const formatRole = (role) => {
      const roles = { admin: 'Administrator', manager: 'Manager', user: 'Korisnik' }
      return roles[role] || role
    }

    const formatStatus = (status) => {
      const statuses = {
        active: 'Aktivan',
        pending: 'Na čekanju',
        inactive: 'Neaktivan',
        pending_verification: 'Čeka verifikaciju'
      }
      return statuses[status] || status
    }

    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('hr-HR')
    }

    const formatTime = (timestamp) => {
      return new Date(timestamp).toLocaleString('hr-HR')
    }

    // Watch for route changes
    watch(() => route.params.id, (newId, oldId) => {
      console.log('🔄 Route ID promijenjen:', { from: oldId, to: newId })
      if (newId && newId !== oldId) {
        loadUser()
      }
    })

    // Lifecycle
    onMounted(() => {
      console.log('🚀 EditUserForm mounted, user ID:', userId.value)

      if (userId.value) {
        loadUser()
      }
    })

    return {
      loading,
      actionLoading,
      showPassword,
      passwordOption,
      showDeleteModal,
      showSuccessToast,
      user,
      userActivity,
      form,
      errors,
      currentUser,
      hasChanges,
      passwordStrength,
      saveForm,
      saveAndContinue,
      resetForm,
      refreshUser,
      resendActivation,
      toggleUserStatus,
      confirmDelete,
      closeModal,
      deleteUser,
      getUserInitials,
      formatRole,
      formatStatus,
      formatDate,
      formatTime
    }
  }
}
</script>

<style scoped>
.edit-user-form {
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

.breadcrumb-nav {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: #64748b;
}

.breadcrumb-link {
  color: #3b82f6;
  text-decoration: none;
}

.breadcrumb-link:hover {
  text-decoration: underline;
}

.breadcrumb-separator {
  color: #9ca3af;
}

.breadcrumb-current {
  color: #374151;
  font-weight: 500;
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

.header-actions {
  display: flex;
  gap: 1rem;
}

.content-container {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.loading-state,
.error-state {
  padding: 4rem 2rem;
  text-align: center;
  color: #64748b;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e2e8f0;
  border-left: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.error-state h3 {
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.edit-container {
  padding: 2rem;
}

.user-summary-card {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 2rem;
  background: #f8fafc;
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
  margin-bottom: 2rem;
}

.user-avatar-large {
  width: 4rem;
  height: 4rem;
  border-radius: 50%;
  background: #3b82f6;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.user-summary-info {
  flex: 1;
}

.user-summary-info h2 {
  margin: 0 0 0.25rem 0;
  color: #1e293b;
  font-size: 1.5rem;
}

.user-email {
  margin: 0 0 1rem 0;
  color: #3b82f6;
  font-size: 1rem;
}

.user-meta {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.user-role,
.user-status {
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.user-role.admin {
  background: #fef3c7;
  color: #92400e;
}

.user-role.manager {
  background: #dbeafe;
  color: #1e40af;
}

.user-role.user {
  background: #dcfce7;
  color: #166534;
}

.user-status.active {
  background: #dcfce7;
  color: #166534;
}

.user-status.pending,
.user-status.pending_verification {
  background: #fef3c7;
  color: #92400e;
}

.user-status.inactive {
  background: #f3f4f6;
  color: #374151;
}

.user-date {
  color: #64748b;
  font-size: 0.875rem;
}

.user-actions {
  display: flex;
  gap: 0.75rem;
}

.btn-action {
  background: white;
  color: #374151;
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-action:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #9ca3af;
}

.btn-action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-sections {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  margin-bottom: 2rem;
}

.form-section {
  padding: 2rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
}

.form-section.danger-zone {
  border-color: #fecaca;
  background: #fef2f2;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.section-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 500;
  background: #dbeafe;
  color: #1e40af;
}

.section-badge.danger {
  background: #fecaca;
  color: #dc2626;
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
.form-select,
textarea.form-input {
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: all 0.2s;
  font-family: inherit;
}

.form-input:focus,
.form-select:focus,
textarea.form-input:focus {
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

.role-warning {
  margin-top: 1rem;
  padding: 1rem;
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: #92400e;
}

.permissions-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

.permission-item {
  padding: 1.5rem;
  background: #f8fafc;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
}

.permission-hint {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0.5rem 0 0 1.75rem;
}

.password-reset-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.option-label {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.option-label:hover {
  border-color: #3b82f6;
  background: #f8fafc;
}

.option-radio {
  margin-top: 0.25rem;
}

.option-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.option-content strong {
  color: #1e293b;
}

.option-content span {
  color: #6b7280;
  font-size: 0.875rem;
}

.manual-password {
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: #f8fafc;
  border-radius: 0.5rem;
}

.password-input-wrapper {
  position: relative;
}

.password-toggle {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem;
}

.password-strength {
  margin-top: 1rem;
}

.strength-bar {
  height: 4px;
  border-radius: 2px;
  margin-bottom: 0.5rem;
  transition: all 0.3s;
}

.strength-bar.none {
  background: #e5e7eb;
  width: 0%;
}

.strength-bar.weak {
  background: #dc2626;
  width: 33%;
}

.strength-bar.medium {
  background: #f59e0b;
  width: 66%;
}

.strength-bar.strong {
  background: #10b981;
  width: 100%;
}

.strength-text {
  font-size: 0.75rem;
  color: #6b7280;
}

.password-notification {
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: #f0f9ff;
  border-radius: 0.5rem;
  border-left: 4px solid #0ea5e9;
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
  color: #64748b;
  margin: 0.5rem 0 0 1.75rem;
}

.danger-actions {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.danger-action {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
  padding: 1.5rem;
  background: white;
  border: 1px solid #fecaca;
  border-radius: 0.5rem;
}

.danger-info h4 {
  margin: 0 0 0.5rem 0;
  color: #dc2626;
  font-size: 1rem;
}

.danger-info p {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.btn-danger {
  background: #dc2626;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
  white-space: nowrap;
}

.btn-danger:hover:not(:disabled) {
  background: #b91c1c;
}

.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2rem;
  background: #f8fafc;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
}

.action-info {
  font-size: 0.875rem;
}

.changes-indicator {
  color: #f59e0b;
  font-weight: 500;
}

.no-changes {
  color: #10b981;
  font-weight: 500;
}

.action-buttons {
  display: flex;
  gap: 1rem;
}

.activity-section {
  padding: 2rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
}

.activity-section h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 1.5rem;
}

.activity-log {
  background: #f8fafc;
  border-radius: 0.5rem;
  overflow: hidden;
}

.empty-activity {
  padding: 3rem;
  text-align: center;
  color: #64748b;
}

.activity-items {
  max-height: 400px;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
}

.activity-text {
  color: #1e293b;
  margin: 0 0 0.25rem 0;
  font-size: 0.875rem;
}

.activity-time {
  color: #64748b;
  font-size: 0.75rem;
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

.danger-modal {
  background: white;
  border-radius: 1rem;
  padding: 0;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
  margin: 0;
  color: #1e293b;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #64748b;
}

.modal-body {
  padding: 1.5rem;
  text-align: center;
}

.warning-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.modal-body h4 {
  color: #dc2626;
  margin-bottom: 1rem;
}

.modal-body p {
  color: #374151;
  margin-bottom: 1.5rem;
}

.delete-consequences {
  text-align: left;
  background: #fef2f2;
  padding: 1rem;
  border-radius: 0.5rem;
  border-left: 4px solid #dc2626;
}

.delete-consequences p {
  margin-bottom: 0.5rem;
}

.delete-consequences ul {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
  color: #374151;
}

.delete-consequences li {
  margin-bottom: 0.25rem;
}

.final-warning {
  color: #dc2626 !important;
  font-weight: 600;
  margin-top: 1rem !important;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding: 1.5rem;
  border-top: 1px solid #e2e8f0;
}

/* Success Toast */
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

.toast-icon {
  font-size: 1.25rem;
}

.toast-content {
  flex: 1;
}

.toast-content strong {
  display: block;
  margin-bottom: 0.25rem;
}

.toast-content p {
  margin: 0;
  font-size: 0.875rem;
  opacity: 0.9;
}

.toast-close {
  background: none;
  border: none;
  color: white;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
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

.btn-secondary {
  background: #f1f5f9;
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

.btn-secondary:hover:not(:disabled) {
  background: #e2e8f0;
  border-color: #9ca3af;
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

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }

  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Responsive */
@media (max-width: 1024px) {
  .user-summary-card {
    flex-direction: column;
    text-align: center;
  }

  .user-actions {
    justify-content: center;
  }

  .form-actions {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .action-buttons {
    justify-content: center;
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

  .danger-action {
    flex-direction: column;
    text-align: center;
  }

  .modal-actions {
    flex-direction: column;
  }

  .success-toast {
    left: 1rem;
    right: 1rem;
    top: 1rem;
  }
}
</style>