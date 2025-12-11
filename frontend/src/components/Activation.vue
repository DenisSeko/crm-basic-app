<!-- src/components/Activation.vue -->
<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
    <div class="max-w-md w-full">
      <!-- Loading State -->
      <div v-if="loading" class="bg-white rounded-2xl shadow-lg p-8 text-center">
        <div class="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-10 h-10 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 mb-4">Aktivacija računa</h1>
        <p class="text-gray-600">Aktiviram vaš račun, molimo pričekajte...</p>
      </div>

      <!-- Success State - Password Change Required -->
      <div v-else-if="success && requiresPasswordChange" class="bg-white rounded-2xl shadow-lg p-8 text-center">
        <div class="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 mb-4">Račun aktiviran! 🔐</h1>
        <p class="text-gray-600 mb-4">
          Vaš račun <strong>{{ userEmail }}</strong> je uspješno aktiviran.
        </p>
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p class="text-yellow-700 text-sm">
            <strong>Važno:</strong> Morate postaviti novu lozinku prije pristupa sustavu.
          </p>
        </div>
        
        <div v-if="autoRedirectCountdown > 0" class="mb-4 text-sm text-gray-500">
          <div class="flex items-center justify-center gap-2">
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span>Automatsko preusmjeravanje za {{ autoRedirectCountdown }}s...</span>
          </div>
        </div>
        
        <button 
          @click="goToPasswordChange"
          class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 mb-4"
        >
          {{ autoRedirectCountdown > 0 ? `Postavi lozinku (${autoRedirectCountdown})` : 'Postavi novu lozinku' }}
        </button>
        
        <button 
          @click="goToLogin"
          class="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors duration-200"
        >
          Prijava s postojećom lozinkom
        </button>
      </div>

      <!-- Success State - Standard Activation -->
      <div v-else-if="success && !requiresPasswordChange" class="bg-white rounded-2xl shadow-lg p-8 text-center">
        <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 mb-4">Račun aktiviran! 🎉</h1>
        <p class="text-gray-600 mb-6">
          Vaš račun <strong>{{ userEmail }}</strong> je uspješno aktiviran.
          Sada možete pristupiti sustavu.
        </p>
        
        <div class="flex items-center justify-center gap-2 text-gray-500 text-sm mb-6">
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          <span>Preusmjeravam na prijavu...</span>
        </div>
        
        <button 
          @click="goToLogin"
          class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200"
        >
          Prijava u sustav
        </button>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-white rounded-2xl shadow-lg p-8 text-center">
        <div class="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 mb-4">Greška pri aktivaciji</h1>
        <p class="text-gray-600 mb-4">{{ errorMessage }}</p>
        
        <div class="space-y-3">
          <button 
            v-if="canRetry"
            @click="retryActivation"
            class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200"
          >
            Pokušaj ponovno
          </button>
          
          <button 
            @click="goToLogin"
            class="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors duration-200"
          >
            Idi na prijavu
          </button>
          
          <button 
            v-if="showResendButton"
            @click="resendActivationEmail"
            class="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors duration-200"
          >
            Pošalji novi aktivacijski email
          </button>
        </div>
      </div>

      <!-- Token Not Found State -->
      <div v-else class="bg-white rounded-2xl shadow-lg p-8 text-center">
        <div class="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 mb-4">Aktivacijski link nije pronađen</h1>
        <p class="text-gray-600 mb-6">
          Ovaj aktivacijski link nije validan, istekao je ili je već iskorišten.
        </p>
        
        <div class="space-y-3">
          <button 
            @click="goToLogin"
            class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200"
          >
            Idi na prijavu
          </button>
          
          <button 
            v-if="emailForResend"
            @click="resendActivationEmail"
            class="w-full border border-green-600 text-green-700 py-3 px-4 rounded-lg font-medium hover:bg-green-50 transition-colors duration-200"
          >
            Zatraži novi aktivacijski email
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { authHelper } from '@/services/api'

const router = useRouter()
const route = useRoute()

const loading = ref(true)
const success = ref(false)
const error = ref(false)
const errorMessage = ref('')
const canRetry = ref(false)
const showResendButton = ref(false)

// User data
const userEmail = ref('')
const userData = ref(null)
const requiresPasswordChange = ref(false)

// Auto redirect countdown
const autoRedirectCountdown = ref(5)
let countdownInterval = null

// Get activation parameters from URL
const activationToken = route.params.token || route.query.token
const emailParam = route.query.email
const successParam = route.query.success === 'true'
const requiresPasswordChangeParam = route.query.requires_password_change === 'true'

// Computed properties
const emailForResend = computed(() => {
  return userEmail.value || emailParam
})

// Prikaz poruka o greškama
const getErrorMessage = (errorCode) => {
  const messages = {
    'token_not_found': 'Aktivacijski link nije pronađen ili je istekao.',
    'token_already_used': 'Ovaj aktivacijski link je već iskorišten.',
    'token_expired': 'Aktivacijski link je istekao.',
    'verification_failed': 'Došlo je do greške pri verifikaciji.',
    'network_error': 'Problem s mrežnom vezom. Provjerite internetsku vezu.',
    'invalid_response': 'Neočekivani odgovor od servera.'
  }
  return messages[errorCode] || 'Došlo je do greške pri aktivaciji računa.'
}

// **KLJUČNA PROMJENA**: Glavna funkcija za verifikaciju
const verifyActivation = async () => {
  try {
    loading.value = true
    error.value = false
    success.value = false
    showResendButton.value = false
    
    console.log('🔐 Activation component started:', { 
      token: activationToken ? activationToken.substring(0, 20) + '...' : 'Missing',
      email: emailParam || 'Missing',
      successParam,
      requiresPasswordChangeParam,
      fullQuery: route.query
    })
    
    // **SCENARIO 1: Već smo na frontendu sa tokenom iz redirecta (najčešći slučaj)**
    if (route.query.token && route.query.email && route.query.success === 'true') {
      console.log('🔄 Scenario 1: Direct from backend redirect')
      
      userEmail.value = route.query.email
      requiresPasswordChange.value = route.query.requires_password_change === 'true'
      
      // Spremi token i user podatke
      if (route.query.token) {
        const userObj = {
          email: route.query.email,
          requires_password_change: requiresPasswordChange.value,
          email_verified: true,
          status: 'active',
          role: 'user' // Default role, može se kasnije ažurirati
        }
        
        const authSuccess = authHelper.setAuth(route.query.token, userObj)
        
        if (authSuccess) {
          console.log('✅ Token saved from redirect:', {
            email: userEmail.value,
            requiresPasswordChange: requiresPasswordChange.value
          })
          
          success.value = true
          userData.value = userObj
          
          if (requiresPasswordChange.value) {
            console.log('⚠️ Password change required, starting countdown')
            startAutoRedirectCountdown()
          } else {
            console.log('🔄 No password change required, redirecting to dashboard')
            setTimeout(() => {
              redirectBasedOnRole()
            }, 2000)
          }
        } else {
          throw new Error('Greška pri spremanju tokena')
        }
      }
      return
    }
    
    // **SCENARIO 2: Imamo aktivacijski token (direktno iz emaila)**
    if (activationToken && !successParam) {
      console.log('🔗 Scenario 2: Activation link from email')
      console.log('🌐 Calling backend endpoint...')
      
      const verifyEndpoint = `http://localhost:8888/api/auth/verify/${activationToken}`
      
      // Koristimo fetch sa redirect: 'manual' da možemo ručno upravljati redirectom
      const response = await fetch(verifyEndpoint, {
        method: 'GET',
        redirect: 'manual' // Ovo sprječava automatsko slijedenje redirecta
      })
      
      console.log('📡 Response status:', response.status)
      console.log('📡 Response headers:', {
        location: response.headers.get('location'),
        contentType: response.headers.get('content-type')
      })
      
      // Ako je redirect (3xx status)
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location')
        if (location) {
          console.log('🔄 Backend redirecting to:', location)
          
          // Parsiraj redirect URL
          const redirectUrl = new URL(location, window.location.origin)
          const token = redirectUrl.searchParams.get('token')
          const email = redirectUrl.searchParams.get('email')
          const successFlag = redirectUrl.searchParams.get('success')
          
          if (token && email && successFlag === 'true') {
            console.log('✅ Redirect URL contains activation data')
            
            // Sada imamo podatke, spremi ih i nastavi
            userEmail.value = email
            requiresPasswordChange.value = redirectUrl.searchParams.get('requires_password_change') === 'true'
            
            const userObj = {
              email: email,
              requires_password_change: requiresPasswordChange.value,
              email_verified: true,
              status: 'active',
              role: 'user'
            }
            
            const authSuccess = authHelper.setAuth(token, userObj)
            
            if (authSuccess) {
              console.log('✅ Token saved from redirect URL')
              
              success.value = true
              userData.value = userObj
              
              if (requiresPasswordChange.value) {
                console.log('⚠️ Password change required')
                startAutoRedirectCountdown()
              } else {
                console.log('🔄 No password change required')
                setTimeout(() => {
                  redirectBasedOnRole()
                }, 2000)
              }
            } else {
              throw new Error('Greška pri spremanju tokena iz redirecta')
            }
          } else {
            // Ako redirect URL nema očekivane parametre
            console.error('❌ Invalid redirect URL:', location)
            error.value = true
            errorMessage.value = 'Neočekivani format redirect linka'
            canRetry.value = true
          }
        } else {
          // Nema location header - čudno
          console.error('❌ Redirect without location header')
          error.value = true
          errorMessage.value = 'Greška u preusmjeravanju'
          canRetry.value = true
        }
        return
      }
      
      // Ako nije redirect, provjeri content-type
      const contentType = response.headers.get('content-type')
      
      if (contentType && contentType.includes('application/json')) {
        // Dobili smo JSON odgovor (fallback scenario)
        console.log('📄 Got JSON response (fallback)')
        const responseData = await response.json()
        
        if (response.ok && responseData.success) {
          handleSuccessfulActivation(responseData)
        } else {
          handleActivationError(responseData, response.status)
        }
      } else {
        // Nije JSON - možda je HTML ili nešto drugo
        console.warn('⚠️ Unexpected response type:', contentType)
        error.value = true
        errorMessage.value = getErrorMessage('invalid_response')
        canRetry.value = true
        showResendButton.value = true
      }
      return
    }
    
    // **SCENARIO 3: Već imamo grešku u query parametrima**
    if (route.query.error) {
      console.log('❌ Scenario 3: Error from query params')
      error.value = true
      errorMessage.value = getErrorMessage(route.query.error)
      canRetry.value = true
      showResendButton.value = route.query.email ? true : false
      userEmail.value = route.query.email || ''
      return
    }
    
    // **SCENARIO 4: Nema tokena ili emaila**
    console.log('❌ Scenario 4: No valid activation data')
    error.value = true
    errorMessage.value = 'Nedostaje aktivacijski token ili email adresa.'
    canRetry.value = false
    showResendButton.value = false
    
  } catch (err) {
    console.error('💥 Activation error:', err)
    error.value = true
    canRetry.value = true
    showResendButton.value = true
    
    if (err.code === 'NETWORK_ERROR' || err.name === 'TypeError') {
      errorMessage.value = getErrorMessage('network_error')
    } else {
      errorMessage.value = err.message || 'Došlo je do neočekivane greške pri aktivaciji računa.'
    }
  } finally {
    loading.value = false
  }
}

// Funkcija za rukovanje uspješnom aktivacijom iz JSON odgovora
const handleSuccessfulActivation = (responseData) => {
  success.value = true
  
  // Sačuvaj user podatke
  userData.value = responseData.user
  userEmail.value = responseData.user?.email || emailParam
  requiresPasswordChange.value = responseData.user?.requires_password_change || false
  
  console.log('✅ Account activated successfully via JSON:', {
    email: userEmail.value,
    requiresPasswordChange: requiresPasswordChange.value,
    user: responseData.user
  })
  
  // Spremi auth podatke
  if (responseData.token && responseData.user) {
    const authSuccess = authHelper.setAuth(responseData.token, responseData.user)
    
    if (authSuccess) {
      console.log('🔐 Auth token saved via authHelper')
      
      if (requiresPasswordChange.value) {
        console.log('⚠️ Password change required')
        startAutoRedirectCountdown()
      } else {
        console.log('🔄 No password change required')
        setTimeout(() => {
          redirectBasedOnRole()
        }, 2000)
      }
    } else {
      console.error('❌ Failed to save auth data')
      error.value = true
      errorMessage.value = 'Greška pri spremanju autentifikacijskih podataka.'
    }
  }
}

// Funkcija za rukovanje greškama
const handleActivationError = (responseData, status) => {
  error.value = true
  canRetry.value = true
  showResendButton.value = true
  
  if (responseData.message) {
    errorMessage.value = responseData.message
  } else if (responseData.error) {
    errorMessage.value = responseData.error
  } else {
    errorMessage.value = 'Došlo je do greške pri aktivaciji računa.'
  }
  
  if (status === 404 || 
      errorMessage.value.includes('nije pronađen') ||
      errorMessage.value.includes('isteakao') ||
      errorMessage.value.includes('iskorišten')) {
    showResendButton.value = true
  }
  
  console.log('❌ Activation failed:', errorMessage.value)
}

// Start auto redirect countdown
const startAutoRedirectCountdown = () => {
  autoRedirectCountdown.value = 5
  
  countdownInterval = setInterval(() => {
    if (autoRedirectCountdown.value > 1) {
      autoRedirectCountdown.value--
    } else {
      clearInterval(countdownInterval)
      goToPasswordChange()
    }
  }, 1000)
}

// Redirect based on user role
const redirectBasedOnRole = () => {
  const userRole = userData.value?.role || 'user'
  const targetPath = userRole === 'admin' ? '/admin' : '/dashboard'
  console.log(`🔄 Redirecting to ${targetPath} for role: ${userRole}`)
  router.push(targetPath)
}

// Go to password change page
const goToPasswordChange = () => {
  console.log('🔐 Redirecting to password change page')
  
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }
  
  router.push({
    name: 'ChangePassword',
    query: {
      required: 'true',
      initial_setup: 'true',
      from_activation: 'true',
      email: userEmail.value
    }
  })
}

// Go to login page
const goToLogin = () => {
  console.log('🔄 Redirecting to login page')
  
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }
  
  router.push({
    name: 'Login',
    query: {
      message: 'Vaš račun je aktiviran. Sada se možete prijaviti.',
      email: userEmail.value || emailParam
    }
  })
}

// Retry activation
const retryActivation = () => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
  verifyActivation()
}

// Resend activation email
const resendActivationEmail = async () => {
  if (!emailForResend.value) {
    alert('Email adresa nije dostupna za ponovno slanje.')
    return
  }
  
  try {
    console.log('📧 Resending activation email to:', emailForResend.value)
    
    const response = await fetch('http://localhost:8888/api/auth/resend-verification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: emailForResend.value
      })
    })
    
    const data = await response.json()
    
    if (response.ok && data.success) {
      alert('Novi aktivacijski email je poslan. Provjerite svoj inbox.')
      console.log('✅ Activation email resent')
    } else {
      alert(data.message || 'Greška pri slanju aktivacijskog emaila.')
    }
    
  } catch (err) {
    console.error('❌ Error resending activation email:', err)
    alert('Došlo je do greške pri slanju emaila.')
  }
}

// Cleanup on component unmount
onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }
})

// Watch for route changes
watch(
  () => route.query,
  (newQuery) => {
    console.log('🔍 Route query changed:', newQuery)
    if (newQuery.token && newQuery.email && newQuery.success === 'true') {
      // Ako smo dobili nove query parametre, ponovno procesuiraj
      verifyActivation()
    }
  }
)

// On component mount
onMounted(() => {
  console.log('🚀 Activation component mounted')
  console.log('🔍 Full route:', {
    path: route.path,
    params: route.params,
    query: route.query
  })
  
  verifyActivation()
})
</script>