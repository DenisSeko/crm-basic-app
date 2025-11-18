<template>
  <div class="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md border border-gray-200">
    <h2 class="text-2xl font-bold mb-6 text-center text-gray-800">Registracija</h2>
    
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

    <!-- Server Validation Errors -->
    <div v-if="serverErrors.length > 0" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
      <div class="flex items-start">
        <span class="text-red-600 mr-2 mt-0.5">⚠️</span>
        <div class="flex-1">
          <h3 class="font-semibold text-red-800 mb-2">Popravite sljedeće greške:</h3>
          <ul class="text-red-700 text-sm space-y-1">
            <li v-for="(error, index) in serverErrors" :key="index" class="flex items-start">
              <span class="mr-2 mt-0.5">•</span>
              <span>{{ error }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Rate Limit Warning -->
    <div v-if="rateLimitInfo.show" class="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-md">
      <div class="flex items-start">
        <span class="text-orange-600 mr-2 mt-0.5">⏰</span>
        <div>
          <h3 class="font-semibold text-orange-800">Previše pokušaja</h3>
          <p class="text-orange-700 text-sm mt-1">
            {{ rateLimitInfo.message }}
          </p>
          <div v-if="rateLimitInfo.retryAfter" class="mt-2 text-xs text-orange-600">
            Preostalo vrijeme: {{ rateLimitInfo.retryAfter }}
          </div>
        </div>
      </div>
    </div>

    <form @submit.prevent="handleRegister" class="space-y-4">
      <!-- Ime i Prezime -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="firstName" class="block text-sm font-medium text-gray-700 mb-1">Ime</label>
          <input 
            id="firstName"
            v-model="registerData.firstName" 
            type="text" 
            placeholder="Vaše ime"
            autocomplete="given-name"
            class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            :class="{'border-red-300 ring-1 ring-red-300': errors.firstName}"
            required
            @input="clearError('firstName')"
          >
          <p v-if="errors.firstName" class="text-red-500 text-xs mt-1 flex items-center">
            <span class="mr-1">⚠️</span>{{ errors.firstName }}
          </p>
        </div>
        
        <div>
          <label for="lastName" class="block text-sm font-medium text-gray-700 mb-1">Prezime</label>
          <input 
            id="lastName"
            v-model="registerData.lastName" 
            type="text" 
            placeholder="Vaše prezime"
            autocomplete="family-name"
            class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            :class="{'border-red-300 ring-1 ring-red-300': errors.lastName}"
            required
            @input="clearError('lastName')"
          >
          <p v-if="errors.lastName" class="text-red-500 text-xs mt-1 flex items-center">
            <span class="mr-1">⚠️</span>{{ errors.lastName }}
          </p>
        </div>
      </div>

      <!-- Email Field -->
      <div>
        <label for="registerEmail" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input 
          id="registerEmail"
          v-model="registerData.email" 
          type="email" 
          placeholder="vaš@email.com"
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

      <!-- Username Field -->
      <div>
        <label for="username" class="block text-sm font-medium text-gray-700 mb-1">Korisničko ime</label>
        <input 
          id="username"
          v-model="registerData.username" 
          type="text" 
          placeholder="Odaberite korisničko ime"
          autocomplete="username"
          class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          :class="{'border-red-300 ring-1 ring-red-300': errors.username}"
          required
          @input="clearError('username'); checkUsernameAvailability()"
        >
        <div class="flex justify-between items-center mt-1">
          <p v-if="errors.username" class="text-red-500 text-xs flex items-center">
            <span class="mr-1">⚠️</span>{{ errors.username }}
          </p>
          <div v-if="usernameCheck.show" class="text-xs" :class="usernameCheck.available ? 'text-green-600' : 'text-red-600'">
            <span v-if="usernameCheck.checking" class="flex items-center">
              <span class="animate-spin mr-1">⏳</span> Provjeravam...
            </span>
            <span v-else class="flex items-center">
              <span class="mr-1">{{ usernameCheck.available ? '✅' : '❌' }}</span>
              {{ usernameCheck.message }}
            </span>
          </div>
        </div>
      </div>
      
      <!-- Password Field -->
      <div>
        <label for="registerPassword" class="block text-sm font-medium text-gray-700 mb-1">Lozinka</label>
        <div class="relative">
          <input 
            id="registerPassword"
            v-model="registerData.password" 
            :type="showPassword ? 'text' : 'password'" 
            placeholder="Odaberite sigurnu lozinku"
            autocomplete="new-password"
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
        
        <!-- Password Requirements -->
        <div class="mt-2 space-y-1">
          <div class="flex items-center justify-between text-xs text-gray-500">
            <span>Zahtjevi za lozinkom:</span>
            <span :class="{
              'text-green-600 font-medium': passwordStrength >= 3,
              'text-yellow-600': passwordStrength === 2,
              'text-red-600': passwordStrength <= 1
            }">
              {{ getPasswordStrengthText() }}
            </span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              class="h-1.5 rounded-full transition-all duration-300"
              :class="{
                'bg-red-500': passwordStrength <= 1,
                'bg-yellow-500': passwordStrength === 2,
                'bg-green-500': passwordStrength >= 3
              }"
              :style="{ width: `${(passwordStrength / 5) * 100}%` }"
            ></div>
          </div>
          
          <!-- Password Requirements List -->
          <div class="grid grid-cols-2 gap-1 mt-2 text-xs">
            <div v-for="requirement in passwordRequirements" 
                 :key="requirement.key"
                 class="flex items-center"
                 :class="requirement.met ? 'text-green-600' : 'text-gray-500'">
              <span class="mr-1 text-xs">{{ requirement.met ? '✅' : '○' }}</span>
              <span>{{ requirement.text }}</span>
            </div>
          </div>
        </div>
        
        <p v-if="errors.password" class="text-red-500 text-xs mt-1 flex items-center">
          <span class="mr-1">⚠️</span>{{ errors.password }}
        </p>
      </div>

      <!-- Confirm Password Field -->
      <div>
        <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">Potvrdi lozinku</label>
        <div class="relative">
          <input 
            id="confirmPassword"
            v-model="registerData.confirmPassword" 
            :type="showConfirmPassword ? 'text' : 'password'" 
            placeholder="Ponovite lozinku"
            autocomplete="new-password"
            class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            :class="{'border-red-300 ring-1 ring-red-300': errors.confirmPassword}"
            required
            @input="clearError('confirmPassword')"
          >
          <!-- Show/Hide Confirm Password Button -->
          <button
            type="button"
            @click="showConfirmPassword = !showConfirmPassword"
            class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
            :class="{'mt-1': true}"
          >
            <span class="text-lg">
              {{ showConfirmPassword ? '🙈' : '👁️' }}
            </span>
          </button>
        </div>
        <p v-if="errors.confirmPassword" class="text-red-500 text-xs mt-1 flex items-center">
          <span class="mr-1">⚠️</span>{{ errors.confirmPassword }}
        </p>
        
        <!-- Password Match Indicator -->
        <div v-if="registerData.password && registerData.confirmPassword" class="mt-1">
          <div class="text-xs" :class="passwordsMatch ? 'text-green-600' : 'text-red-600'">
            <span class="flex items-center">
              <span class="mr-1">{{ passwordsMatch ? '✅' : '❌' }}</span>
              {{ passwordsMatch ? 'Lozinke se podudaraju' : 'Lozinke se ne podudaraju' }}
            </span>
          </div>
        </div>
      </div>
      
      <!-- Submit Button -->
      <button 
        type="submit"
        class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
        :disabled="isRegistering || !isFormValid"
      >
        <span v-if="isRegistering" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
        <span v-else class="mr-2">📝</span>
        {{ isRegistering ? 'Registriram...' : 'Registriraj se' }}
      </button>
    </form>

    <!-- Linkovi -->
    <div class="mt-6 text-center space-y-3">
      <p class="text-sm text-gray-600">
        Već imate račun?
        <a 
          href="#" 
          @click.prevent="$emit('show-login')" 
          class="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
          role="button"
        >
          Prijavite se ovdje
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
import api from '../services/api'

const emit = defineEmits(['registration-success', 'registration-error', 'show-login', 'go-home'])

// State
const isRegistering = ref(false)
const message = ref('')
const messageType = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const serverErrors = ref([])
const rateLimitInfo = reactive({
  show: false,
  message: '',
  retryAfter: null
})

const registerData = reactive({
  firstName: '',
  lastName: '',
  email: '',
  username: '',
  password: '',
  confirmPassword: ''
})

const errors = reactive({
  firstName: '',
  lastName: '',
  email: '',
  username: '',
  password: '',
  confirmPassword: ''
})

const usernameCheck = reactive({
  show: false,
  checking: false,
  available: false,
  message: ''
})

// Computed
const isFormValid = computed(() => {
  return registerData.firstName.trim() && 
         registerData.lastName.trim() && 
         registerData.email.trim() && 
         registerData.username.trim() && 
         registerData.password.trim() && 
         registerData.confirmPassword.trim() &&
         passwordsMatch.value &&
         passwordStrength.value >= 2 // Minimalno srednja jačina lozinke
})

const passwordsMatch = computed(() => {
  return registerData.password === registerData.confirmPassword
})

const passwordStrength = computed(() => {
  const password = registerData.password
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
  
  return strength
})

const passwordRequirements = computed(() => [
  {
    key: 'length',
    text: 'Min. 8 znakova',
    met: registerData.password.length >= 8
  },
  {
    key: 'lowercase',
    text: 'Malo slovo',
    met: /[a-z]/.test(registerData.password)
  },
  {
    key: 'uppercase',
    text: 'Veliko slovo',
    met: /[A-Z]/.test(registerData.password)
  },
  {
    key: 'number',
    text: 'Broj',
    met: /\d/.test(registerData.password)
  },
  {
    key: 'special',
    text: 'Specijalni znak',
    met: /[!@#$%^&*(),.?":{}|<>]/.test(registerData.password)
  }
])

// Methods
const showMessage = (text, type) => {
  message.value = text
  messageType.value = type
  serverErrors.value = [] // Clear server errors when showing new message
  
  // Auto-hide success messages, keep error messages until user action
  if (type === 'success') {
    setTimeout(() => {
      message.value = ''
      messageType.value = ''
    }, 5000)
  }
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
    case 1: return 'Vrlo slaba'
    case 2: return 'Slaba'
    case 3: return 'Srednja'
    case 4: return 'Jaka'
    case 5: return 'Vrlo jaka'
    default: return 'Nepoznato'
  }
}

const checkUsernameAvailability = async () => {
  const username = registerData.username.trim()
  
  if (!username || username.length < 3) {
    usernameCheck.show = false
    return
  }
  
  // Debounce check
  clearTimeout(usernameCheck.timeout)
  usernameCheck.timeout = setTimeout(async () => {
    usernameCheck.show = true
    usernameCheck.checking = true
    
    try {
      // Simulate username check - in real app, this would be an API call
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Simple simulation - consider taken if contains 'admin' or 'test'
      const isTaken = username.toLowerCase().includes('admin') || 
                     username.toLowerCase().includes('test')
      
      usernameCheck.available = !isTaken
      usernameCheck.message = isTaken ? 
        'Korisničko ime je zauzeto' : 
        'Korisničko ime je dostupno'
      
    } catch (error) {
      usernameCheck.available = false
      usernameCheck.message = 'Greška pri provjeri'
    } finally {
      usernameCheck.checking = false
    }
  }, 300)
}

const validateForm = () => {
  let isValid = true
  
  // Reset errors
  Object.keys(errors).forEach(key => errors[key] = '')
  serverErrors.value = []
  rateLimitInfo.show = false
  
  // First Name validation
  if (!registerData.firstName.trim()) {
    errors.firstName = 'Ime je obavezno'
    isValid = false
  } else if (registerData.firstName.length < 2) {
    errors.firstName = 'Ime mora imati najmanje 2 znaka'
    isValid = false
  }
  
  // Last Name validation
  if (!registerData.lastName.trim()) {
    errors.lastName = 'Prezime je obavezno'
    isValid = false
  } else if (registerData.lastName.length < 2) {
    errors.lastName = 'Prezime mora imati najmanje 2 znaka'
    isValid = false
  }
  
  // Email validation
  if (!registerData.email.trim()) {
    errors.email = 'Email je obavezan'
    isValid = false
  } else if (!/\S+@\S+\.\S+/.test(registerData.email)) {
    errors.email = 'Email nije ispravan'
    isValid = false
  }
  
  // Username validation
  if (!registerData.username.trim()) {
    errors.username = 'Korisničko ime je obavezno'
    isValid = false
  } else if (registerData.username.length < 3) {
    errors.username = 'Korisničko ime mora imati najmanje 3 znaka'
    isValid = false
  } else if (!/^[a-zA-Z0-9_]+$/.test(registerData.username)) {
    errors.username = 'Korisničko ime može sadržavati samo slova, brojeve i underscore'
    isValid = false
  }
  
  // Password validation
  if (!registerData.password.trim()) {
    errors.password = 'Lozinka je obavezna'
    isValid = false
  } else if (registerData.password.length < 8) {
    errors.password = 'Lozinka mora imati najmanje 8 znakova'
    isValid = false
  } else if (passwordStrength.value < 2) {
    errors.password = 'Lozinka je previše slaba'
    isValid = false
  }
  
  // Confirm Password validation
  if (!registerData.confirmPassword.trim()) {
    errors.confirmPassword = 'Potvrda lozinke je obavezna'
    isValid = false
  } else if (!passwordsMatch.value) {
    errors.confirmPassword = 'Lozinke se ne podudaraju'
    isValid = false
  }
  
  return isValid
}

const handleRegister = async () => {
  if (!validateForm()) {
    showMessage('Popravite greške u formi prije slanja.', 'error')
    return
  }

  isRegistering.value = true
  message.value = ''
  serverErrors.value = []
  rateLimitInfo.show = false

  try {
    console.log('📝 Registration: Šaljem podatke na server...', {
      username: registerData.username,
      email: registerData.email
    })
    
    const response = await api.post('/auth/register', {
      username: registerData.username,
      email: registerData.email,
      password: registerData.password,
      firstName: registerData.firstName,
      lastName: registerData.lastName
    })
    
    console.log('✅ Registration successful:', response.data)
    
    showMessage(
      `Uspješno ste registrirani! Provjerite email (${registerData.email}) za verifikacijski link.`,
      'success'
    )
    
    // Emit success event
    emit('registration-success', response.data)
    
    // Reset form after successful registration
    setTimeout(() => {
      resetForm()
    }, 3000)
    
  } catch (error) {
    console.error('❌ Registration error:', error)
    
    // Handle different types of errors
    if (error.response?.status === 429) {
      // Rate limit error
      handleRateLimitError(error)
    } else if (error.response?.status === 400) {
      // Validation error from server
      handleValidationError(error)
    } else if (error.response?.status === 409) {
      // Conflict - user already exists
      handleConflictError(error)
    } else {
      // Generic error
      handleGenericError(error)
    }
    
    // Emit error event
    emit('registration-error', error)
    
  } finally {
    isRegistering.value = false
  }
}

const handleRateLimitError = (error) => {
  const errorData = error.response?.data
  rateLimitInfo.show = true
  rateLimitInfo.message = errorData?.message || 'Previše pokušaja registracije. Pričekajte prije sljedećeg pokušaja.'
  rateLimitInfo.retryAfter = errorData?.retryAfter || '1 minuta'
  
  showMessage('Previše pokušaja registracije. Molimo pričekajte.', 'error')
  
  // Start countdown if we have retry time
  if (errorData?.retryAfter) {
    startRetryCountdown()
  }
}

const handleValidationError = (error) => {
  const errorData = error.response?.data
  
  if (errorData?.details && Array.isArray(errorData.details)) {
    // Express-validator style errors
    serverErrors.value = errorData.details.map(detail => detail.msg || detail)
  } else if (errorData?.error) {
    // Simple error message
    serverErrors.value = [errorData.error]
    if (errorData.details) {
      serverErrors.value.push(errorData.details)
    }
  } else {
    serverErrors.value = ['Došlo je do greške pri validaciji podataka.']
  }
  
  showMessage('Popravite greške u formi.', 'error')
}

const handleConflictError = (error) => {
  const errorData = error.response?.data
  
  if (errorData?.error?.includes('email')) {
    errors.email = 'Email je već registriran'
    showMessage('Email adresa je već registrirana.', 'error')
  } else if (errorData?.error?.includes('username')) {
    errors.username = 'Korisničko ime je zauzeto'
    showMessage('Korisničko ime je već zauzeto.', 'error')
  } else {
    showMessage('Korisnik s tim podacima već postoji.', 'error')
  }
}

const handleGenericError = (error) => {
  let errorMessage = 'Došlo je do greške pri registraciji. Pokušajte ponovno.'
  
  if (error.code === 'NETWORK_ERROR' || !error.response) {
    errorMessage = 'Problem s mrežnom vezom. Provjerite internetsku vezu.'
  } else if (error.response?.status >= 500) {
    errorMessage = 'Server trenutno nije dostupan. Pokušajte ponovno kasnije.'
  } else if (error.response?.data?.error) {
    errorMessage = error.response.data.error
  }
  
  showMessage(errorMessage, 'error')
}

const startRetryCountdown = () => {
  let seconds = 60 // 1 minute
  
  const countdown = setInterval(() => {
    seconds--
    
    if (seconds <= 0) {
      clearInterval(countdown)
      rateLimitInfo.show = false
      rateLimitInfo.retryAfter = null
    } else {
      rateLimitInfo.retryAfter = `${seconds} sekundi`
    }
  }, 1000)
}

const resetForm = () => {
  registerData.firstName = ''
  registerData.lastName = ''
  registerData.email = ''
  registerData.username = ''
  registerData.password = ''
  registerData.confirmPassword = ''
  
  message.value = ''
  messageType.value = ''
  serverErrors.value = []
  rateLimitInfo.show = false
  showPassword.value = false
  showConfirmPassword.value = false
  usernameCheck.show = false
  
  Object.keys(errors).forEach(key => errors[key] = '')
}

// Watchers
watch(() => registerData.confirmPassword, () => {
  if (registerData.confirmPassword && !passwordsMatch.value) {
    errors.confirmPassword = 'Lozinke se ne podudaraju'
  } else {
    clearError('confirmPassword')
  }
})

// Expose methods
defineExpose({
  showError: (errorMessage) => {
    showMessage(errorMessage, 'error')
  },
  
  clearForm: resetForm,
  
  setFormData: (data) => {
    Object.assign(registerData, data)
    showMessage('Podaci su postavljeni!', 'success')
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

/* Loading animation */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>