<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
    <div class="max-w-md w-full">
      <!-- Header -->
      <div class="text-center mb-8">
        <div class="flex justify-center mb-4">
          <div class="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
          </div>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 mb-2">Provjerite svoj email</h1>
        <p class="text-gray-600">Poslali smo verifikacijski link na vašu email adresu</p>
      </div>

      <!-- Main Content -->
      <div class="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
        <!-- Email Icon -->
        <div class="text-center mb-6">
          <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h2 class="text-xl font-semibold text-gray-900 mb-2">Verifikacijski email je poslan!</h2>
          <p class="text-gray-600 text-sm">
            Poslali smo link za verifikaciju na:<br>
            <span class="font-medium text-blue-600">{{ email }}</span>
          </p>
        </div>

        <!-- Instructions -->
        <div class="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 class="font-medium text-blue-900 mb-2 flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Što dalje?
          </h3>
          <ul class="text-sm text-blue-800 space-y-2">
            <li class="flex items-start gap-2">
              <span class="mt-0.5">•</span>
              <span>Provjerite svoj inbox za verifikacijski email</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-0.5">•</span>
              <span>Pogledajte i spam folder ako ne vidite email</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="mt-0.5">•</span>
              <span>Kliknite na link u emailu za aktivaciju računa</span>
            </li>
          </ul>
        </div>

        <!-- Action Buttons -->
        <div class="space-y-3">
          <button 
            @click="resendVerificationEmail"
            :disabled="resending"
            class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg v-if="resending" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            {{ resending ? 'Slanje...' : 'Pošalji ponovno' }}
          </button>

          <button 
            @click="goToLogin"
            class="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors duration-200"
          >
            Povratak na prijavu
          </button>
        </div>

        <!-- Resend Info -->
        <div class="text-center mt-4">
          <p class="text-xs text-gray-500">
            Niste primili email? 
            <button 
              @click="resendVerificationEmail"
              :disabled="resending"
              class="text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
            >
              Pošalji ponovno
            </button>
          </p>
          <p v-if="lastSent" class="text-xs text-gray-400 mt-1">
            Zadnji email poslan: {{ lastSent }}
          </p>
        </div>
      </div>

      <!-- Support Info -->
      <div class="text-center mt-6">
        <p class="text-sm text-gray-500">
          Problemi s verifikacijom? 
          <a href="mailto:support@primjer.hr" class="text-blue-600 hover:text-blue-700 font-medium">
            Kontaktirajte podršku
          </a>
        </p>
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
const email = ref('')
const resending = ref(false)
const lastSent = ref('')

// Get email from route query or localStorage
onMounted(() => {
  const routeEmail = route.query.email
  const storedEmail = localStorage.getItem('pending_verification_email')
  
  email.value = routeEmail || storedEmail || 'vaš email'
  console.log('📧 VerifyEmail mounted with email:', email.value)
})

const resendVerificationEmail = async () => {
  if (resending.value) return
  
  try {
    resending.value = true
    const userEmail = email.value
    
    await api.post('/auth/resend-verification', { email: userEmail })
    
    // Update last sent time
    lastSent.value = new Date().toLocaleTimeString('hr-HR')
    
    // Show success message
    alert('Verifikacijski email je ponovno poslan! Provjerite svoj inbox.')
  } catch (error) {
    console.error('Greška pri slanju verifikacijskog emaila:', error)
    alert('Greška pri slanju verifikacijskog emaila: ' + (error.response?.data?.error || error.message))
  } finally {
    resending.value = false
  }
}

const goToLogin = () => {
  router.push('/login')
}
</script>