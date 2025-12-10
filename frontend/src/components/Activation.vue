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
        
        <button 
          @click="goToPasswordChange"
          class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 mb-4"
        >
          Postavi novu lozinku
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
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

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

// Get activation parameters from URL
const activationToken = route.params.token || route.query.token
const emailParam = route.query.email

// Computed properties
const emailForResend = computed(() => {
  return userEmail.value || emailParam
})

const verifyActivation = async () => {
  try {
    loading.value = true
    error.value = false
    success.value = false
    showResendButton.value = false
    
    console.log('🔐 Starting account activation verification:', { 
      token: activationToken ? activationToken.substring(0, 20) + '...' : 'Missing',
      email: emailParam || 'Missing'
    })
    
    // Provjeri da li je token prisutan
    if (!activationToken) {
      throw new Error('Nedostaje aktivacijski token. Molimo kliknite na link u emailu ponovno.')
    }
    
    // OPTIONAL: Provjeri da li je email prisutan (nije obavezan u backendu)
    // if (!emailParam) {
    //   throw new Error('Nedostaje email. Molimo kliknite na link u emailu ponovno.')
    // }
    
    // Koristimo /api/auth/verify/:token endpoint (nova verzija)
    const backendUrl = `http://localhost:8888/api/auth/verify/${activationToken}`
    console.log('🌐 Calling backend verification:', backendUrl)
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    console.log('📡 Backend response status:', response.status)
    
    const responseData = await response.json().catch(() => ({}))
    console.log('📡 Backend response data:', responseData)
    
    if (response.ok && responseData.success) {
      // Uspešna aktivacija
      success.value = true
      
      // Sačuvaj user podatke
      userData.value = responseData.user
      userEmail.value = responseData.user?.email || emailParam
      requiresPasswordChange.value = responseData.user?.requires_password_change || false
      
      console.log('✅ Account activated successfully:', {
        email: userEmail.value,
        requiresPasswordChange: requiresPasswordChange.value,
        user: responseData.user
      })
      
      // Ako backend vraća token, spremamo ga
      if (responseData.token && responseData.user) {
        localStorage.setItem('authToken', responseData.token)
        localStorage.setItem('user', JSON.stringify(responseData.user))
        localStorage.setItem('isAuthenticated', 'true')
        
        console.log('🔐 Auth token saved to localStorage')
      }
      
      // Ako je potrebna promjena lozinke, ne preusmjeravamo automatski
      if (requiresPasswordChange.value) {
        console.log('⚠️ Password change required, showing password setup form')
        // Korisnik će kliknuti na "Postavi novu lozinku" button
        return
      }
      
      // Inače, preusmjeri na odgovarajuću stranicu
      console.log('🔄 Auto-redirecting based on user role')
      setTimeout(() => {
        redirectBasedOnRole()
      }, 2000)
      
    } else {
      // Greška pri aktivaciji
      error.value = true
      canRetry.value = true
      showResendButton.value = true
      
      // Postavi poruku o grešci
      if (responseData.message) {
        errorMessage.value = responseData.message
      } else if (responseData.error) {
        errorMessage.value = responseData.error
      } else {
        errorMessage.value = 'Došlo je do greške pri aktivaciji računa.'
      }
      
      // Ako token nije pronađen ili je istekao, pokaži gumb za ponovno slanje
      if (response.status === 404 || 
          errorMessage.value.includes('nije pronađen') ||
          errorMessage.value.includes('isteakao')) {
        showResendButton.value = true
      }
    }
    
  } catch (err) {
    console.error('💥 Activation error:', err)
    error.value = true
    canRetry.value = true
    showResendButton.value = true
    
    if (err.code === 'NETWORK_ERROR' || err.name === 'TypeError') {
      errorMessage.value = 'Problem s mrežnom vezom. Provjerite internetsku vezu i pokušajte ponovno.'
    } else {
      errorMessage.value = err.message || 'Došlo je do neočekivane greške pri aktivaciji računa.'
    }
  } finally {
    loading.value = false
  }
}

const redirectBasedOnRole = () => {
  const userRole = userData.value?.role || 'user'
  const targetPath = userRole === 'admin' ? '/admin' : '/dashboard'
  console.log(`🔄 Redirecting to ${targetPath} for role: ${userRole}`)
  router.push(targetPath)
}

const goToPasswordChange = () => {
  console.log('🔐 Redirecting to password change page')
  
  // Sačuvaj token u localStorage za password change page
  if (userData.value) {
    localStorage.setItem('tempUserData', JSON.stringify({
      email: userEmail.value,
      userId: userData.value.id,
      token: localStorage.getItem('authToken'),
      requires_password_change: true
    }))
  }
  
  router.push({
    name: 'ForcePasswordChange',
    query: {
      email: userEmail.value,
      token: localStorage.getItem('authToken')
    }
  })
}

const goToLogin = () => {
  console.log('🔄 Redirecting to login page')
  router.push({
    name: 'Login',
    query: {
      message: 'Vaš račun je aktiviran. Sada se možete prijaviti.',
      email: userEmail.value || emailParam
    }
  })
}

const retryActivation = () => {
  verifyActivation()
}

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

onMounted(() => {
  console.log('🚀 Activation component mounted')
  verifyActivation()
})
</script>