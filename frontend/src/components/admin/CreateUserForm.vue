<!-- src/components/admin/CreateUserForm.vue -->
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
              <label for="name" class="form-label">
                Ime i Prezime *
                <span class="label-hint">Puno ime korisnika</span>
              </label>
              <input
                id="name"
                v-model="form.name"
                type="text"
                class="form-input"
                :class="{ error: errors.name }"
                placeholder="Unesite ime i prezime"
                required
              />
              <span v-if="errors.name" class="error-message">{{ errors.name }}</span>
            </div>

            <div class="form-group">
              <label for="email" class="form-label">
                Email Adresa *
                <span class="label-hint">Korisnički email za prijavu</span>
              </label>
              <input
                id="email"
                v-model="form.email"
                type="email"
                class="form-input"
                :class="{ error: errors.email }"
                placeholder="unesite@email.com"
                required
              />
              <span v-if="errors.email" class="error-message">{{ errors.email }}</span>
            </div>
          </div>
        </div>

        <!-- Role and Company Section -->
        <div class="form-section">
          <h2 class="section-title">🏢 Radne Informacije</h2>
          <div class="form-grid">
            <div class="form-group">
              <label for="company" class="form-label">
                Odjel/Tvrtka
                <span class="label-hint">Odjel u kojem korisnik radi</span>
              </label>
              <input
                id="company"
                v-model="form.company"
                type="text"
                class="form-input"
                placeholder="npr. IT Odjel, Prodaja, Marketing..."
              />
            </div>

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
              
              <!-- Role Descriptions -->
              <div class="role-descriptions">
                <div v-for="role in roleDescriptions" :key="role.value" class="role-info">
                  <strong>{{ role.label }}:</strong> {{ role.description }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Password Options Section -->
        <div class="form-section">
          <h2 class="section-title">🔐 Postavke Lozinke</h2>
          
          <div class="password-options">
            <label class="option-label">
              <input
                type="radio"
                v-model="passwordOption"
                value="auto"
                class="option-radio"
              />
              <span class="option-content">
                <strong>Automatska lozinka</strong>
                <span>Sustav će generirati sigurnu lozinku i poslati je korisniku putem emaila</span>
              </span>
            </label>

            <label class="option-label">
              <input
                type="radio"
                v-model="passwordOption"
                value="manual"
                class="option-radio"
              />
              <span class="option-content">
                <strong>Ručno postavi lozinku</strong>
                <span>Unesite željeru lozinku za korisnika</span>
              </span>
            </label>
          </div>

          <!-- Manual Password Input -->
          <div v-if="passwordOption === 'manual'" class="manual-password">
            <div class="form-grid">
              <div class="form-group">
                <label for="password" class="form-label">
                  Lozinka *
                  <span class="label-hint">Minimalno 8 znakova</span>
                </label>
                <div class="password-input-wrapper">
                  <input
                    id="password"
                    v-model="form.password"
                    :type="showPassword ? 'text' : 'password'"
                    class="form-input"
                    :class="{ error: errors.password }"
                    placeholder="Unesite lozinku"
                    required
                  />
                  <button
                    type="button"
                    @click="showPassword = !showPassword"
                    class="password-toggle"
                  >
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
                  <input
                    id="password_confirmation"
                    v-model="form.password_confirmation"
                    :type="showPassword ? 'text' : 'password'"
                    class="form-input"
                    :class="{ error: errors.password_confirmation }"
                    placeholder="Ponovite lozinku"
                    required
                  />
                  <button
                    type="button"
                    @click="showPassword = !showPassword"
                    class="password-toggle"
                  >
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
        </div>

        <!-- Email Notification Section -->
        <div class="form-section">
          <h2 class="section-title">📧 Email Obavijest</h2>
          <div class="notification-options">
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="form.send_welcome_email"
                class="checkbox"
              />
              <span class="checkmark"></span>
              Pošalji welcome email korisniku
            </label>
            <p class="notification-hint">
              Korisnik će dobiti email s uputama za prijavu i aktivaciju računa.
              {{ passwordOption === 'auto' ? 'Automatski generirana lozinka će biti uključena.' : 'Korisnik će koristiti ručno postavljenu lozinku.' }}
            </p>
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
            :disabled="loading"
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
            {{ getUserInitials(form.name) }}
          </div>
          <div class="preview-info">
            <h4>{{ form.name || 'Ime Korisnika' }}</h4>
            <p class="preview-email">{{ form.email || 'email@primjer.com' }}</p>
            <div class="preview-details">
              <span class="preview-role" :class="form.role">
                {{ formatRole(form.role) || 'Uloga' }}
              </span>
              <span class="preview-company">{{ form.company || 'Tvrtka' }}</span>
            </div>
          </div>
          <div class="preview-status">
            <div class="status-indicator pending"></div>
            <span>Na čekanju</span>
          </div>
        </div>

        <!-- Creation Tips -->
        <div class="tips-section">
          <h4>💡 Savjeti za kreiranje korisnika</h4>
          <ul class="tips-list">
            <li>Provjerite točnost email adrese prije slanja</li>
            <li>Odaberite odgovarajuću ulogu za svakog korisnika</li>
            <li>Automatska lozinka je sigurnija opcija</li>
            <li>Welcome email pomaže korisnicima da brzo započnu</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Success Modal -->
    <div v-if="showSuccessModal" class="modal-overlay">
      <div class="modal success-modal">
        <div class="modal-icon">✅</div>
        <div class="modal-content">
          <h3>Korisnik Uspješno Kreiran!</h3>
          <p>Korisnički račun za <strong>{{ createdUser?.name }}</strong> je uspješno kreiran.</p>
          
          <div v-if="passwordOption === 'auto'" class="auto-password-info">
            <p>📧 <strong>Aktivacijski email je poslan na:</strong> {{ createdUser?.email }}</p>
            <p class="info-text">Korisnik će dobiti upute za aktivaciju računa i postavljanje lozinke.</p>
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
import { ref, reactive, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { adminAPI } from '@/services/api'  // Promijenjeno na @/

export default {
  name: 'CreateUserForm',
  setup() {
    const router = useRouter()
    const loading = ref(false)
    const showPassword = ref(false)
    const passwordOption = ref('auto')
    const showSuccessModal = ref(false)
    const createdUser = ref(null)

    const form = reactive({
      name: '',
      email: '',
      company: '',
      role: '',
      password: '',
      password_confirmation: '',
      send_welcome_email: true
    })

    const errors = reactive({
      name: '',
      email: '',
      role: '',
      password: '',
      password_confirmation: ''
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

    // Computed properties
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
    const validateForm = () => {
      let isValid = true

      // Reset errors
      Object.keys(errors).forEach(key => errors[key] = '')

      // Name validation
      if (!form.name.trim()) {
        errors.name = 'Ime je obavezno polje'
        isValid = false
      }

      // Email validation
      if (!form.email.trim()) {
        errors.email = 'Email je obavezno polje'
        isValid = false
      } else if (!/\S+@\S+\.\S+/.test(form.email)) {
        errors.email = 'Unesite ispravnu email adresu'
        isValid = false
      }

      // Role validation
      if (!form.role) {
        errors.role = 'Odabir uloge je obavezan'
        isValid = false
      }

      // Password validation for manual option
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

    const submitForm = async () => {
      if (!validateForm()) return

      try {
        loading.value = true

        // Prepare data for API
        const userData = {
          name: form.name,
          email: form.email,
          company: form.company,
          role: form.role,
          send_welcome_email: form.send_welcome_email,
          generate_password: passwordOption.value === 'auto'
        }

        // Add password only for manual option
        if (passwordOption.value === 'manual') {
          userData.password = form.password
          userData.password_confirmation = form.password_confirmation
        }

        // TODO: Replace with real API call
        // const response = await adminAPI.createUser(userData)
        
        // Mock API call for now
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Mock response
        const response = {
          success: true,
          user: {
            id: Date.now(),
            name: form.name,
            email: form.email,
            company: form.company,
            role: form.role,
            status: 'pending',
            created_at: new Date()
          },
          message: 'Korisnik uspješno kreiran. Aktivacijski email je poslan.'
        }

        createdUser.value = response.user
        showSuccessModal.value = true

      } catch (error) {
        console.error('Greška pri kreiranju korisnika:', error)
        alert('Došlo je do greške pri kreiranju korisnika: ' + (error.userMessage || error.message))
      } finally {
        loading.value = false
      }
    }

    const cancel = () => {
      router.push('/admin/users')
    }

    const createAnother = () => {
      // Reset form
      Object.keys(form).forEach(key => {
        if (key !== 'send_welcome_email') {
          form[key] = ''
        }
      })
      passwordOption.value = 'auto'
      showSuccessModal.value = false
      createdUser.value = null
    }

    const goToUsers = () => {
      router.push('/admin/users')
    }

    const getUserInitials = (name) => {
      if (!name) return '??'
      return name
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .substring(0, 2)
    }

    const formatRole = (role) => {
      const roles = {
        admin: 'Administrator',
        manager: 'Manager',
        user: 'Korisnik'
      }
      return roles[role] || role
    }

    // Watch for password option change
    watch(passwordOption, (newValue) => {
      if (newValue === 'auto') {
        form.password = ''
        form.password_confirmation = ''
        errors.password = ''
        errors.password_confirmation = ''
      }
    })

    return {
      loading,
      showPassword,
      passwordOption,
      showSuccessModal,
      createdUser,
      form,
      errors,
      roleDescriptions,
      passwordStrength,
      submitForm,
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

.password-options {
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

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-indicator.pending {
  background: #f59e0b;
  animation: pulse 2s infinite;
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

.auto-password-info {
  background: #f0f9ff;
  padding: 1rem;
  border-radius: 0.5rem;
  border-left: 4px solid #0ea5e9;
  margin-bottom: 1.5rem;
  text-align: left;
}

.auto-password-info p {
  margin-bottom: 0.5rem;
}

.auto-password-info .info-text {
  font-size: 0.875rem;
  color: #64748b;
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
}
</style>