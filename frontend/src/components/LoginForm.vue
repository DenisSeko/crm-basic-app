<template>
  <div class="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md border border-gray-200">
    <h2 class="text-2xl font-bold mb-6 text-center text-gray-800">Prijava</h2>

    <!-- Status poruke -->
    <div v-if="message" :class="[
      'mb-4 p-3 rounded-md text-sm border transition-all duration-300',
      messageType === 'error'
        ? 'bg-red-50 text-red-700 border-red-200'
        : 'bg-green-50 text-green-700 border-green-200'
    ]">
      <div class="flex items-center">
        <span class="mr-2 text-lg">
          {{ messageType === 'error' ? '❌' : '✅' }}
        </span>
        <span class="font-medium">{{ message }}</span>
      </div>
    </div>

    <!-- Email not verified warning -->
    <div v-if="emailNotVerified" class="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
      <div class="flex items-start">
        <span class="text-yellow-600 mr-2 mt-0.5">⚠️</span>
        <div>
          <h3 class="font-semibold text-yellow-800">Email nije verifikovan</h3>
          <p class="text-yellow-700 text-sm mt-1">Provjerite svoj email za verifikacijski link.</p>
          <button @click="resendVerificationEmail" :disabled="resendingVerification"
            class="text-yellow-800 hover:text-yellow-900 text-sm font-medium mt-2 flex items-center gap-1">
            <span v-if="resendingVerification" class="animate-spin">⏳</span>
            {{ resendingVerification ? 'Slanje...' : 'Pošalji ponovno' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Forgot Password Modal -->
    <div v-if="showForgotPassword" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold text-gray-800">Resetiraj lozinku</h3>
          <button @click="closeForgotPassword" 
                  class="text-gray-500 hover:text-gray-700 text-xl">
            &times;
          </button>
        </div>
        
        <div v-if="!resetEmailSent">
          <p class="mb-4 text-gray-600">Unesite email adresu vašeg računa. Poslat ćemo vam link za resetovanje lozinke.</p>
          
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Email adresa</label>
            <input v-model="resetEmail" type="email" placeholder="vas@email.com" 
                   :class="[
                     'w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500',
                     resetEmailError ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'
                   ]"
                   @input="resetEmailError = ''">
            <p v-if="resetEmailError" class="text-red-500 text-xs mt-1 flex items-center">
              <span class="mr-1">⚠️</span>{{ resetEmailError }}
            </p>
          </div>
          
          <div class="flex gap-2">
            <button @click="sendResetEmail" 
                    :disabled="!resetEmail || sendingResetEmail"
                    class="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center">
              <span v-if="sendingResetEmail" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
              {{ sendingResetEmail ? 'Slanje...' : 'Pošalji reset link' }}
            </button>
            <button @click="closeForgotPassword"
                    class="flex-1 border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200">
              Otkaži
            </button>
          </div>
        </div>
        
        <div v-else>
          <div class="text-center">
            <div class="text-green-500 text-4xl mb-3">✅</div>
            <h4 class="text-lg font-semibold text-gray-800 mb-2">Email je poslan!</h4>
            <p class="text-gray-600 mb-4">
              Link za resetovanje lozinke je poslan na <strong class="text-blue-600">{{ resetEmail }}</strong>.
              Provjerite svoj inbox.
            </p>
            <button @click="closeForgotPassword"
                    class="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200">
              U redu
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Login Form -->
    <form @submit.prevent="handleLogin" class="space-y-4">
      <!-- Email Field -->
      <div>
        <label for="loginEmail" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input id="loginEmail" name="email" v-model="loginData.email" type="email" placeholder="Unesite svoj email"
          autocomplete="email"
          class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          :class="{ 'border-red-300 ring-1 ring-red-300': errors.email }" required @input="clearError('email')">
        <p v-if="errors.email" class="text-red-500 text-xs mt-1 flex items-center">
          <span class="mr-1">⚠️</span>{{ errors.email }}
        </p>
      </div>

      <!-- Password Field -->
      <div>
        <div class="flex justify-between items-center mb-1">
          <label for="loginPassword" class="block text-sm font-medium text-gray-700">Lozinka</label>
          <button type="button" @click="showForgotPassword = true"
                  class="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200">
            Zaboravili ste lozinku?
          </button>
        </div>
        <div class="relative">
          <input id="loginPassword" name="password" v-model="loginData.password"
            :type="showPassword ? 'text' : 'password'" placeholder="Unesite lozinku" autocomplete="current-password"
            class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            :class="{ 'border-red-300 ring-1 ring-red-300': errors.password }" required @input="clearError('password')">
          <!-- Show/Hide Password Button -->
          <button type="button" @click="showPassword = !showPassword"
            class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
            :class="{ 'mt-1': true }">
            <span class="text-lg">
              {{ showPassword ? '🙈' : '👁️' }}
            </span>
          </button>
        </div>
        <p v-if="errors.password" class="text-red-500 text-xs mt-1 flex items-center">
          <span class="mr-1">⚠️</span>{{ errors.password }}
        </p>

        <!-- Password strength indicator (opcionalno) -->
        <div v-if="loginData.password" class="mt-2">
          <div class="flex items-center justify-between text-xs text-gray-500">
            <span>Jačina lozinke:</span>
            <span :class="{
              'text-green-600 font-medium': passwordStrength >= 3,
              'text-yellow-600': passwordStrength === 2,
              'text-red-600': passwordStrength <= 1
            }">
              {{ getPasswordStrengthText() }}
            </span>
          </div>
          <div class="mt-1 w-full bg-gray-200 rounded-full h-1.5">
            <div class="h-1.5 rounded-full transition-all duration-300" :class="{
              'bg-red-500': passwordStrength <= 1,
              'bg-yellow-500': passwordStrength === 2,
              'bg-green-500': passwordStrength >= 3
            }" :style="{ width: `${(passwordStrength / 4) * 100}%` }"></div>
          </div>
        </div>
      </div>

      <!-- Submit Button -->
      <button type="submit"
        class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
        :disabled="isLoggingIn || !isFormValid">
        <span v-if="isLoggingIn" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
        <span v-else class="mr-2">🔐</span>
        {{ isLoggingIn ? 'Prijavljujem...' : 'Prijavi se' }}
      </button>
    </form>

    <!-- Demo korisnici -->
    <div class="mt-6 p-4 bg-blue-50 rounded-md border border-blue-200">
      <h3 class="font-semibold text-blue-800 mb-3 flex items-center">
        <span class="mr-2">👥</span>
        Demo korisnici
      </h3>
      <div class="space-y-2 text-sm">
        <div v-for="demoUser in demoUsers" :key="demoUser.email"
          class="flex justify-between items-center p-2 bg-white rounded border border-blue-100 hover:border-blue-300 transition-colors duration-200">
          <div>
            <span class="font-medium text-gray-800">{{ demoUser.name }}</span>
            <div class="text-xs text-gray-600">{{ demoUser.email }}</div>
            <div class="text-xs text-gray-500">Lozinka: {{ demoUser.password }}</div>
          </div>
          <button @click="fillCredentials(demoUser.email, demoUser.password)"
            class="text-blue-600 hover:text-blue-800 text-xs font-medium px-2 py-1 border border-blue-200 rounded hover:bg-blue-50 transition-all duration-200"
            type="button">
            Koristi
          </button>
        </div>
      </div>
    </div>

    <!-- Linkovi -->
    <div class="mt-6 text-center space-y-3">
      <p class="text-sm text-gray-600">
        Nemate račun?
        <a href="#" @click.prevent="$emit('show-register')"
          class="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200" role="button">
          Registrirajte se ovdje
        </a>
      </p>

      <div class="pt-2 border-t border-gray-200">
        <a href="#" @click.prevent="$emit('go-home')"
          class="text-gray-600 hover:text-gray-800 text-sm transition-colors duration-200 inline-flex items-center"
          role="button">
          <span class="mr-1">←</span>
          Povratak na početnu stranicu
        </a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api, { authHelper } from '../services/api'

const router = useRouter()
const route = useRoute()

// Emits
const emit = defineEmits(['login', 'show-register', 'go-home'])

// State
const isLoggingIn = ref(false)
const message = ref('')
const messageType = ref('')
const emailNotVerified = ref(false)
const resendingVerification = ref(false)
const showPassword = ref(false)
const errors = reactive({
  email: '',
  password: ''
})

const loginData = reactive({
  email: 'admin@crm.com',
  password: 'password123'
})

// Forgot Password state
const showForgotPassword = ref(false)
const resetEmail = ref('')
const resetEmailSent = ref(false)
const sendingResetEmail = ref(false)
const resetEmailError = ref('')

// Demo korisnici
const demoUsers = [
  {
    name: 'Admin',
    email: 'admin@crm.com',
    password: 'password123',
    role: 'admin'
  },
  {
    name: 'Ivan Horvat',
    email: 'ivan.horvat@primjer.hr',
    password: 'password123',
    role: 'user'
  },
  {
    name: 'Ana Kovač',
    email: 'ana.kovac@primjer.hr',
    password: 'password123',
    role: 'user'
  },
  {
    name: 'Marko Petrov',
    email: 'marko.petrov@primjer.hr',
    password: 'password123',
    role: 'user'
  }
]

// Computed
const isFormValid = computed(() => {
  return loginData.email.trim() &&
    loginData.password.trim() &&
    loginData.password.length >= 1
})

const passwordStrength = computed(() => {
  const password = loginData.password
  if (!password) return 0

  let strength = 0

  // Length check
  if (password.length >= 8) strength++

  // Contains lowercase
  if (/[a-z]/.test(password)) strength++

  // Contains uppercase
  if (/[A-Z]/.test(password)) strength++

  // Contains numbers
  if (/\d/.test(password)) strength++

  // Contains special characters
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++

  return Math.min(strength, 4)
})

// Methods
const showMessage = (text, type) => {
  message.value = text
  messageType.value = type
  setTimeout(() => {
    message.value = ''
    messageType.value = ''
  }, 5000)
}

const clearError = (field) => {
  if (errors[field]) {
    errors[field] = ''
  }
}

const getPasswordStrengthText = () => {
  const strength = passwordStrength.value
  switch (strength) {
    case 0: return 'Nema lozinku'
    case 1: return 'Slaba'
    case 2: return 'Srednja'
    case 3: return 'Jaka'
    case 4: return 'Vrlo jaka'
    default: return 'Nepoznato'
  }
}

const fillCredentials = (email, password) => {
  loginData.email = email
  loginData.password = password
  showMessage(`Podaci za ${email} su uneseni!`, 'success')
}

const validateForm = () => {
  let isValid = true

  // Reset errors
  Object.keys(errors).forEach(key => errors[key] = '')

  // Email validacija
  if (!loginData.email.trim()) {
    errors.email = 'Email je obavezan'
    isValid = false
  } else if (!/\S+@\S+\.\S+/.test(loginData.email)) {
    errors.email = 'Email nije ispravan'
    isValid = false
  }

  // Lozinka validacija
  if (!loginData.password.trim()) {
    errors.password = 'Lozinka je obavezna'
    isValid = false
  } else if (loginData.password.length < 6) {
    errors.password = 'Lozinka mora imati najmanje 6 znakova'
    isValid = false
  }

  return isValid
}

const resendVerificationEmail = async () => {
  if (resendingVerification.value) return

  try {
    resendingVerification.value = true
    await api.post('/api/auth/forgot-password', { email: loginData.email })
    showMessage('Verifikacijski email je ponovno poslan! Provjerite svoj inbox.', 'success')
    emailNotVerified.value = false
  } catch (error) {
    console.error('Greška pri slanju verifikacijskog emaila:', error)
    showMessage('Greška pri slanju verifikacijskog emaila: ' + (error.response?.data?.message || error.message), 'error')
  } finally {
    resendingVerification.value = false
  }
}

// Forgot Password Methods
const closeForgotPassword = () => {
  showForgotPassword.value = false
  resetEmailSent.value = false
  resetEmail.value = ''
  resetEmailError.value = ''
  sendingResetEmail.value = false
}

const validateResetEmail = () => {
  if (!resetEmail.value.trim()) {
    resetEmailError.value = 'Email je obavezan'
    return false
  }
  
  if (!/\S+@\S+\.\S+/.test(resetEmail.value)) {
    resetEmailError.value = 'Email nije ispravan'
    return false
  }
  
  return true
}

const sendResetEmail = async () => {
  if (!validateResetEmail()) return
  
  try {
    sendingResetEmail.value = true
    
    // Koristite postojeći authAPI (dodajte metodu requestPasswordReset)
    const response = await api.post('/api/auth/request-password-reset', { 
      email: resetEmail.value 
    })
    
    console.log('📧 Reset email response:', response.data)
    
    if (response.data.success) {
      resetEmailSent.value = true
      // Prikaži poruku u glavnom view-u
      showMessage(response.data.message || 'Email za resetovanje lozinke je poslan!', 'success')
    } else {
      resetEmailError.value = response.data.message || 'Greška pri slanju email-a'
    }
  } catch (error) {
    console.error('❌ Error sending reset email:', error)
    
    // Prijateljske poruke za različite greške
    if (error.response?.status === 404 || error.response?.status === 400) {
      resetEmailError.value = 'Korisnik s ovim emailom nije pronađen'
    } else if (error.response?.data?.message) {
      resetEmailError.value = error.response.data.message
    } else if (error.code === 'NETWORK_ERROR' || !error.response) {
      resetEmailError.value = 'Problem s mrežnom vezom'
      showMessage('Problem s mrežnom vezom. Provjerite internetsku vezu.', 'error')
    } else {
      resetEmailError.value = 'Greška pri slanju email-a. Pokušajte ponovno.'
      showMessage('Greška pri slanju email-a za resetovanje lozinke.', 'error')
    }
  } finally {
    sendingResetEmail.value = false
  }
}

// Auto-populate iz URL query parametara
const autoPopulateFromURL = () => {
  if (route.query.email && route.query.password) {
    loginData.email = route.query.email
    loginData.password = route.query.password

    if (route.query.demo === 'true') {
      showMessage(`Demo podaci za ${loginData.email} su automatski uneseni!`, 'success')

      // Automatski pokreni login nakon kratkog delaya
      setTimeout(() => {
        console.log('🔄 Auto-login za demo korisnika...')
        handleLogin()
      }, 1500)
    }
  }
}

// KLJUČNA METODA: Popravljena login metoda
const handleLogin = async () => {
  if (!validateForm()) {
    return
  }

  isLoggingIn.value = true
  message.value = ''
  emailNotVerified.value = false

  try {
    console.log('🔐 LoginForm: Pokrećem prijavu za:', loginData.email)

    // API poziv
    const response = await api.post('/api/auth/login', loginData)

    console.log('✅ LoginForm: API odgovor:', response.data)

    const { token, user } = response.data

    // Provjeri je li email verifikovan
    if (!user.email_verified) {
      emailNotVerified.value = true
      showMessage('Molimo verifikujte svoj email prije prijave.', 'error')
      return
    }

    showMessage(`Uspješno ste prijavljeni! Dobrodošli, ${user.first_name || user.full_name || user.email}`, 'success')

    console.log('✅ LoginForm: Spremam auth podatke...')

    // KLJUČNO: Spremi auth podatke OVDJE
    authHelper.setAuth(token, user)

    console.log('🔍 LoginForm: Provjera nakon spremanja:', {
      hasToken: !!authHelper.getToken(),
      hasUser: !!authHelper.getUser(),
      requiresPasswordChange: user.requires_password_change,
      isAuthenticated: authHelper.isAuthenticated()
    })

    setTimeout(() => {
      // Fallback redirect ako AuthManager ne radi
      if (authHelper.isAuthenticated() && route.path === '/login') {
        console.log('🎯 LoginForm: Fallback redirect (AuthManager might not be working)');
        const user = authHelper.getUser();
        const redirectPath = user.requires_password_change
          ? '/change-password?required=true'
          : (user.role === 'admin' ? '/admin' : '/dashboard');
        console.log('🔄 Fallback redirect to:', redirectPath);
        router.replace(redirectPath);
      }
    }, 1000);

    // Emit-uj parent komponenti SVE potrebne podatke
    emit('login', {
      success: true,
      token: token,
      user: user,
      requires_password_change: user.requires_password_change || false
    })

  } catch (error) {
    console.error('❌ LoginForm: Greška pri prijavi:', error)
    console.error('❌ LoginForm: Error detalji:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    })

    let errorMessage = 'Došlo je do greške pri prijavi. Pokušajte ponovno.'

    if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error
    } else if (error.code === 'NETWORK_ERROR' || !error.response) {
      errorMessage = 'Problem s mrežnom vezom. Provjerite internetsku vezu.'
    } else if (error.response?.status >= 500) {
      errorMessage = 'Server trenutno nije dostupan. Pokušajte ponovno kasnije.'
    } else if (error.response?.status === 401) {
      errorMessage = 'Pogrešan email ili lozinka.'
      errors.password = 'Pogrešna lozinka'
    } else if (error.response?.status === 403) {
      // Posebna obrada za password change required
      if (error.response?.data?.code === 'PASSWORD_CHANGE_REQUIRED') {
        console.log('🔄 LoginForm: Password change required detected from API error')

        const { token, user } = error.response.data

        // Spremi privremene podatke
        if (token && user) {
          authHelper.setAuth(token, user)

          // Emit-uj parent komponenti
          emit('login', {
            success: true,
            token: token,
            user: user,
            requires_password_change: true,
            from_error: true
          })
        }

        return
      }
      errorMessage = 'Nemate pristup ovom resursu.'
    } else if (error.response?.status === 404) {
      errorMessage = 'Login endpoint nije pronađen. Provjerite server konfiguraciju.'
    }

    showMessage(errorMessage, 'error')

  } finally {
    isLoggingIn.value = false
  }
}

// Watcher za promjene query parametara
watch(
  () => route.query,
  (newQuery) => {
    if (newQuery.email && newQuery.password) {
      console.log('🔄 Query parametri promijenjeni, auto-populate...')
      autoPopulateFromURL()
    }
  }
)

// Inicijalno popunjavanje pri mount
onMounted(() => {
  console.log('🚀 LoginForm mounted, provjeram query parametre...')
  autoPopulateFromURL()
})

// Expose methods
defineExpose({
  showError: (errorMessage) => {
    showMessage(errorMessage, 'error')
  },

  clearForm: () => {
    loginData.email = ''
    loginData.password = ''
    message.value = ''
    messageType.value = ''
    emailNotVerified.value = false
    showPassword.value = false
    Object.keys(errors).forEach(key => errors[key] = '')
  },

  setCredentials: (email, password) => {
    loginData.email = email
    loginData.password = password
    showMessage(`Podaci za ${email} su postavljeni!`, 'success')
  },

  showForgotPasswordDialog: () => {
    showForgotPassword.value = true
  }
})
</script>

<style scoped>
input:focus {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.1), 0 2px 4px -1px rgba(59, 130, 246, 0.06);
}

button:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

/* Poboljšanja za accessibility */
a[role="button"]:focus,
button:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* Smooth transitions */
* {
  transition-property: color, background-color, border-color, transform, box-shadow;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
}

/* Custom styles za password toggle button */
.relative button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  margin: 0;
}

.relative button:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
  border-radius: 4px;
}

/* Forgot Password modal animations */
.fixed {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.bg-white.rounded-lg {
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>