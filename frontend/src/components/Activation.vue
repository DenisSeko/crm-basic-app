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

      <!-- Success State -->
      <div v-else-if="success" class="bg-white rounded-2xl shadow-lg p-8 text-center">
        <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 mb-4">Račun aktiviran! 🎉</h1>
        <p class="text-gray-600 mb-6">
          Vaš račun <strong>{{ activationData?.email }}</strong> je uspješno aktiviran.
        </p>
        
        <div class="space-y-3">
          <button 
            @click="goToLogin"
            class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200"
          >
            Prijavi se
          </button>
          
          <button 
            @click="goToEmailVerified"
            class="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors duration-200"
          >
            Detalji aktivacije
          </button>
        </div>
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
            @click="retryActivation"
            class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200"
          >
            Pokušaj ponovno
          </button>
          
          <button 
            @click="goToVerifyEmail"
            class="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors duration-200"
          >
            Zatraži novi link
          </button>
          
          <button 
            @click="goToLogin"
            class="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors duration-200"
          >
            Nazad na prijavu
          </button>
        </div>
      </div>

      <!-- Debug Info (Development Only) -->
      <div v-if="debugInfo && isDevelopment" class="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 class="font-medium text-yellow-800 mb-2">Debug Info:</h3>
        <pre class="text-xs text-yellow-800 overflow-auto">{{ debugInfo }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '../services/api'

const router = useRouter()
const route = useRoute()

const loading = ref(true)
const success = ref(false)
const error = ref(false)
const errorMessage = ref('')
const activationData = ref(null)
const debugInfo = ref(null)

const isDevelopment = import.meta.env.DEV

// Get activation parameters from URL
const activationParams = {
  token: route.query.token,
  email: route.query.email
}

const activateAccount = async () => {
  try {
    loading.value = true
    error.value = false
    
    console.log('🔐 Starting account activation with:', activationParams)
    
    if (!activationParams.token || !activationParams.email) {
      throw new Error('Nedostaju parametri za aktivaciju. Molimo kliknite na link u emailu ponovno.')
    }
    
    // ⭐⭐⭐ PROMJENA: Koristimo POST umjesto GET ⭐⭐⭐
    const response = await api.post('/auth/activate', {
      token: activationParams.token,
      email: activationParams.email
    })
    
    console.log('✅ Activation successful:', response.data)
    
    activationData.value = response.data
    success.value = true
    
    // Auto-redirect to email-verified after 3 seconds
    setTimeout(() => {
      goToEmailVerified()
    }, 3000)
    
  } catch (err) {
    console.error('💥 Activation error:', err)
    error.value = true
    
    // Detaljnija poruka o grešci
    if (err.response?.data?.error === 'Nedostaju parametri za aktivaciju') {
      errorMessage.value = 'Aktivacijski link nije ispravan. Parametri nedostaju.'
    } else if (err.response?.data?.message) {
      errorMessage.value = err.response.data.message
    } else if (err.code === 'NETWORK_ERROR') {
      errorMessage.value = 'Problem s mrežom. Provjerite internetsku vezu.'
    } else {
      errorMessage.value = err.message || 'Došlo je do greške pri aktivaciji računa.'
    }
    
    debugInfo.value = {
      error: err.response?.data || err.message,
      params: activationParams,
      timestamp: new Date().toISOString()
    }
  } finally {
    loading.value = false
  }
}

const retryActivation = () => {
  activateAccount()
}

const goToEmailVerified = () => {
  router.push({
    name: 'EmailVerified',
    query: {
      email: activationParams.email,
      success: 'true',
      activated: 'true'
    }
  })
}

const goToLogin = () => {
  router.push({
    name: 'Login',
    query: {
      message: 'Račun je uspješno aktiviran! Sada se možete prijaviti.',
      email: activationParams.email
    }
  })
}

const goToVerifyEmail = () => {
  router.push({
    name: 'VerifyEmail',
    query: {
      email: activationParams.email,
      error: 'activation_failed'
    }
  })
}

onMounted(() => {
  console.log('🚀 Activation component mounted with params:', activationParams)
  activateAccount()
})
</script>