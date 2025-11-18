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
          <button 
            @click="resendVerificationEmail"
            :disabled="resendingVerification"
            class="text-yellow-800 hover:text-yellow-900 text-sm font-medium mt-2 flex items-center gap-1"
          >
            <span v-if="resendingVerification" class="animate-spin">⏳</span>
            {{ resendingVerification ? 'Slanje...' : 'Pošalji ponovno' }}
          </button>
        </div>
      </div>
    </div>

    <form @submit.prevent="handleLogin" class="space-y-4">
      <!-- Email Field -->
      <div>
        <label for="loginEmail" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input 
          id="loginEmail"
          name="email"
          v-model="loginData.email" 
          type="email" 
          placeholder="Unesite svoj email"
          autocomplete="email"
          class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          :class="{'border-red-300 ring-1 ring-red-300': errors.email}"
          required
          @input="clearError('email')"
        >
        <p v-if="errors.email" class="text-red-500 text-xs mt-1 flex items-center">
          <span class="mr-1">⚠️</span>{{ errors.email }}
        </p>
      </div>
      
      <!-- Password Field -->
      <div>
        <label for="loginPassword" class="block text-sm font-medium text-gray-700 mb-1">Lozinka</label>
        <div class="relative">
          <input 
            id="loginPassword"
            name="password"
            v-model="loginData.password" 
            :type="showPassword ? 'text' : 'password'" 
            placeholder="Unesite lozinku"
            autocomplete="current-password"
            class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            :class="{'border-red-300 ring-1 ring-red-300': errors.password}"
            required
            @input="clearError('password')"
          >
          <!-- Show/Hide Password Button -->
          <button
            type="button"
            @click="showPassword = !showPassword"
            class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
            :class="{'mt-1': true}"
          >
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
            <div 
              class="h-1.5 rounded-full transition-all duration-300"
              :class="{
                'bg-red-500': passwordStrength <= 1,
                'bg-yellow-500': passwordStrength === 2,
                'bg-green-500': passwordStrength >= 3
              }"
              :style="{ width: `${(passwordStrength / 4) * 100}%` }"
            ></div>
          </div>
        </div>
      </div>
      
      <!-- Submit Button -->
      <button 
        type="submit"
        class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
        :disabled="isLoggingIn || !isFormValid"
      >
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
        <div 
          v-for="demoUser in demoUsers" 
          :key="demoUser.email"
          class="flex justify-between items-center p-2 bg-white rounded border border-blue-100 hover:border-blue-300 transition-colors duration-200"
        >
          <div>
            <span class="font-medium text-gray-800">{{ demoUser.name }}</span>
            <div class="text-xs text-gray-600">{{ demoUser.email }}</div>
            <div class="text-xs text-gray-500">Lozinka: {{ demoUser.password }}</div>
          </div>
          <button 
            @click="fillCredentials(demoUser.email, demoUser.password)"
            class="text-blue-600 hover:text-blue-800 text-xs font-medium px-2 py-1 border border-blue-200 rounded hover:bg-blue-50 transition-all duration-200"
            type="button"
          >
            Koristi
          </button>
        </div>
      </div>
    </div>

    <!-- Linkovi -->
    <div class="mt-6 text-center space-y-3">
      <p class="text-sm text-gray-600">
        Nemate račun?
        <a 
          href="#" 
          @click.prevent="$emit('show-register')" 
          class="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
          role="button"
        >
          Registrirajte se ovdje
        </a>
      </p>
      
      <div class="pt-2 border-t border-gray-200">
        <a 
          href="#" 
          @click.prevent="$emit('go-home')" 
          class="text-gray-600 hover:text-gray-800 text-sm transition-colors duration-200 inline-flex items-center"
          role="button"
        >
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
const emit = defineEmits(['login', 'show-register', 'go-home'])

// State
const isLoggingIn = ref(false)
const message = ref('')
const messageType = ref('')
const emailNotVerified = ref(false)
const resendingVerification = ref(false)
const showPassword = ref(false) // 👈 NOVO: kontrolira prikaz lozinke
const errors = reactive({
  email: '',
  password: ''
})

const loginData = reactive({
  email: 'admin@crm.com',
  password: 'password123'
})

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

// 👈 NOVO: Password strength calculator
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
  
  return Math.min(strength, 4) // Max 4 for the progress bar
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

// 👈 NOVO: Password strength text
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
    await api.post('/auth/resend-verification', { email: loginData.email })
    showMessage('Verifikacijski email je ponovno poslan! Provjerite svoj inbox.', 'success')
    emailNotVerified.value = false
  } catch (error) {
    console.error('Greška pri slanju verifikacijskog emaila:', error)
    showMessage('Greška pri slanju verifikacijskog emaila: ' + (error.response?.data?.error || error.message), 'error')
  } finally {
    resendingVerification.value = false
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

const handleLogin = async () => {
  if (!validateForm()) {
    return
  }

  // Provjeri je li token već istekao
  if (authHelper.isTokenExpired()) {
    authHelper.clearAuth()
  }

  isLoggingIn.value = true
  message.value = ''
  emailNotVerified.value = false

  try {
    console.log('🔐 LoginForm: Pokrećem prijavu za:', loginData.email)
    
    const response = await api.post('/auth/login', loginData)
    
    const { token, user } = response.data
    
    // Provjeri je li email verifikovan
    if (!user.email_verified) {
      emailNotVerified.value = true
      showMessage('Molimo verifikujte svoj email prije prijave.', 'error')
      return
    }
    
    // DEBUG: Provjera prije spremanja
    console.log('📦 LoginForm: Podaci za spremanje:', { token, user })
    
    // Spremi token i korisnika koristeći helper
    authHelper.setAuth(token, user)
    
    // DEBUG: Provjera nakon spremanja
    console.log('✅ LoginForm: Auth podaci spremljeni:')
    console.log('   - Token:', !!authHelper.getToken())
    console.log('   - User:', !!authHelper.getUser())
    console.log('   - isAuthenticated:', authHelper.isAuthenticated())
    
    showMessage(`Uspješno ste prijavljeni! Dobrodošli, ${user.firstName} ${user.lastName}`, 'success')
    
    console.log('✅ LoginForm: Prijava uspješna, emitiram podatke...')
    
    // Emit podatke AuthManager-u
    emit('login', { token, user })
    
  } catch (error) {
    console.error('❌ LoginForm: Greška pri prijavi:', error)
    
    let errorMessage = 'Došlo je do greške pri prijavi. Pokušajte ponovno.'
    
    if (error.response?.data?.error) {
      errorMessage = error.response.data.error
    } else if (error.code === 'NETWORK_ERROR' || !error.response) {
      errorMessage = 'Problem s mrežnom vezom. Provjerite internetsku vezu.'
    } else if (error.response?.status >= 500) {
      errorMessage = 'Server trenutno nije dostupan. Pokušajte ponovno kasnije.'
    } else if (error.response?.status === 401) {
      errorMessage = 'Pogrešan email ili lozinka.'
      errors.password = 'Pogrešna lozinka'
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
    showPassword.value = false // 👈 Reset show password
    Object.keys(errors).forEach(key => errors[key] = '')
  },
  
  setCredentials: (email, password) => {
    loginData.email = email
    loginData.password = password
    showMessage(`Podaci za ${email} su postavljeni!`, 'success')
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
</style>