<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Global Loader - za login → dashboard prijelaz -->
    <Loader 
      v-if="showGlobalLoader" 
      :message="loaderMessage"
      :sub-message="loaderSubMessage"
    />
    
    <!-- Header -->
    <AppHeader 
      :user="user" 
      @go-home="goToHome" 
      @logout="handleLogout" 
    />

    <!-- Main Content -->
    <main class="container mx-auto px-4 py-8">
      <!-- PROMJENA: Koristimo router-view umjesto ručnog upravljanja komponentama -->
      <router-view></router-view>
    </main>

    <!-- Globalna notifikacija -->
    <div v-if="globalMessage" class="fixed top-4 right-4 z-50 max-w-sm">
      <div :class="[
        'p-4 rounded-lg shadow-lg border transform transition-all duration-300',
        globalMessageType === 'error' 
          ? 'bg-red-50 border-red-200 text-red-800' 
          : 'bg-green-50 border-green-200 text-green-800'
      ]">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <span class="text-lg mr-2">
              {{ globalMessageType === 'error' ? '❌' : '✅' }}
            </span>
            <span class="font-medium">{{ globalMessage }}</span>
          </div>
          <button 
            @click="clearGlobalMessage" 
            class="ml-4 text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { authHelper } from './services/api'

// Components
import AppHeader from './components/AppHeader.vue'
import Loader from './components/Loader.vue'

const router = useRouter()

// State
const user = ref(null)
const showGlobalLoader = ref(false)
const globalMessage = ref('')
const globalMessageType = ref('success')

// Loader messages
const loaderMessage = ref('Učitavanje...')
const loaderSubMessage = ref('Prijavljujemo vas u sustav')

// Methods
const showGlobalMessage = (message, type = 'success') => {
  globalMessage.value = message
  globalMessageType.value = type
  setTimeout(() => {
    clearGlobalMessage()
  }, 5000)
}

const clearGlobalMessage = () => {
  globalMessage.value = ''
  globalMessageType.value = 'success'
}

const goToHome = () => {
  router.push('/').catch(() => {})
}

const handleLogout = () => {
  authHelper.clearAuth()
  user.value = null
  showGlobalMessage('Uspješno ste se odjavili', 'success')
  console.log('✅ User logged out')
  
  goToHome()
}

const handleAuthSuccess = async (authData) => {
  console.log('🔄 Auth success handler pokrenut:', authData)
  
  // Postavi loader poruke
  loaderMessage.value = 'Provjeravam podatke...'
  loaderSubMessage.value = 'Autenticiram vaš račun'
  showGlobalLoader.value = true
  
  try {
    // Simuliraj provjeru podataka
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // Koristimo authHelper za spremanje podataka
    authHelper.setAuth(authData.token, authData.user)
    
    // Postavi user stanje
    user.value = authData.user
    console.log('✅ User postavljen u App.vue:', user.value)
    
    // Ažuriraj loader poruke
    loaderMessage.value = 'Uspješno prijavljeni!'
    loaderSubMessage.value = `Dobrodošli, ${authData.user.first_name}!`
    
    // Prikaži poruku uspjeha
    showGlobalMessage(`Dobrodošli, ${authData.user.first_name}!`, 'success')
    
    // Simuliraj loading prije preusmjeravanja
    await new Promise(resolve => setTimeout(resolve, 1200))
    
    console.log('🔍 Provjeram ulogu korisnika:', authData.user.role)
    
    // KLJUČNA PROMJENA: Preusmjeri na osnovu uloge korisnika
    if (authData.user.role === 'admin') {
      console.log('👑 Admin korisnik - preusmjeravam na /admin')
      router.push('/admin')
    } else {
      console.log('👤 Obični korisnik - preusmjeravam na /dashboard')
      router.push('/dashboard')
    }
    
  } catch (error) {
    console.error('Auth success handling error:', error)
    showGlobalMessage('Greška pri prijavi', 'error')
  } finally {
    // Sakrij loader
    showGlobalLoader.value = false
    // Reset poruke
    loaderMessage.value = 'Učitavanje...'
    loaderSubMessage.value = 'Prijavljujemo vas u sustav'
  }
}

// Check authentication status on app start
const checkAuthStatus = () => {
  console.log('🔍 Provjeram auth status...')
  
  if (authHelper.isAuthenticated()) {
    const storedUser = authHelper.getUser()
    user.value = storedUser
    console.log('✅ User restored from localStorage:', user.value)
    showGlobalMessage(`Dobrodošli natrag, ${storedUser.first_name}!`, 'success')
    
    // KLJUČNA PROMJENA: Preusmjeri admin korisnike na admin panel pri pokretanju app
    if (storedUser.role === 'admin' && window.location.pathname === '/dashboard') {
      console.log('👑 Admin korisnik na dashboardu - preusmjeravam na /admin')
      router.push('/admin')
    }
  } else {
    user.value = null
    console.log('ℹ️ Nema validnog auth tokena')
  }
}

// Listen for auth success events from child components
const setupAuthListener = () => {
  // Ovo će biti pozvano iz AuthManager komponente
  window.addEventListener('auth-success', (event) => {
    handleAuthSuccess(event.detail)
  })
}

// Lifecycle
onMounted(() => {
  console.log('🚀 App.vue mounted')
  checkAuthStatus()
  setupAuthListener()
  
  // Listen for storage changes (logout from other tabs)
  window.addEventListener('storage', (event) => {
    if (event.key === 'authToken' && !event.newValue) {
      console.log('🔐 Storage changed - logging out')
      handleLogout()
    }
  })
})

// Cleanup
import { onUnmounted } from 'vue'
onUnmounted(() => {
  window.removeEventListener('storage', handleLogout)
  window.removeEventListener('auth-success', handleAuthSuccess)
})
</script>

<style scoped>
.container {
  max-width: 1200px;
}
</style>