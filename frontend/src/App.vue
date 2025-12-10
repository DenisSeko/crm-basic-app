<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Global Loader - za login → dashboard prijelaz -->
    <Loader 
      v-if="showGlobalLoader" 
      :message="loaderMessage"
      :sub-message="loaderSubMessage"
    />
    
    <!-- Header (sakrij ako je na change-password stranici) -->
    <AppHeader 
      v-if="!isChangePasswordPage"
      :user="user" 
      @go-home="goToHome" 
      @logout="handleLogout" 
    />

    <!-- Main Content -->
    <main :class="[
      'container mx-auto px-4 py-8',
      isChangePasswordPage ? 'min-h-screen flex items-center justify-center' : ''
    ]">
      <router-view v-slot="{ Component }">
        <component 
          :is="Component" 
          @auth-success="handleAuthSuccess"
          @password-changed="handlePasswordChanged"
          @password-change-required="handlePasswordChangeRequired"
        />
      </router-view>
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

    <!-- Password Change Required Modal (SAMO za slučajeve gdje route guard ne radi) -->
    <div v-if="showPasswordChangeModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div class="text-center mb-6">
          <div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
          </div>
          <h3 class="text-xl font-bold text-gray-900 mb-2">Potrebna promjena lozinke</h3>
          <p class="text-gray-600">
            Morate promijeniti lozinku prije nego što možete pristupiti sustavu.
          </p>
        </div>
        
        <div class="flex space-x-3">
          <button
            @click="goToChangePassword"
            class="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200"
          >
            Promijeni lozinku
          </button>
          <button
            @click="logoutInstead"
            class="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors duration-200"
          >
            Odjavi se
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { authHelper } from './services/api'

// Components
import AppHeader from './components/AppHeader.vue'
import Loader from './components/Loader.vue'

const router = useRouter()
const route = useRoute()

// Computed properties
const isChangePasswordPage = computed(() => {
  return route.name === 'ChangePassword'
})

// State
const user = ref(null)
const showGlobalLoader = ref(false)
const globalMessage = ref('')
const globalMessageType = ref('success')
const showPasswordChangeModal = ref(false)
const pendingPasswordChangeRedirect = ref(false)

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
  showPasswordChangeModal.value = false
  pendingPasswordChangeRedirect.value = false
  
  // Očisti sve redirect flagove
  localStorage.removeItem('pendingRedirect')
  localStorage.removeItem('loginRedirect')
  
  showGlobalMessage('Uspješno ste se odjavili', 'success')
  console.log('✅ User logged out - all flags cleared')
  
  router.push('/').catch(() => {})
}

const logoutInstead = () => {
  showPasswordChangeModal.value = false
  handleLogout()
}

const goToChangePassword = () => {
  showPasswordChangeModal.value = false
  const currentUser = authHelper.getUser()
  const token = authHelper.getToken()
  
  if (currentUser && token) {
    // Očisti sve redirect flagove prije redirect-a
    localStorage.removeItem('pendingRedirect')
    
    router.push({
      name: 'ChangePassword',
      query: {
        required: 'true',
        redirect: getDefaultRedirectPath(currentUser)
      }
    }).catch(() => {
      // Fallback na osnovni path
      router.push('/change-password?required=true')
    })
  } else {
    showGlobalMessage('Nema dostupnih podataka za promjenu lozinke', 'error')
    handleLogout()
  }
}

const getDefaultRedirectPath = (user) => {
  if (user?.role === 'admin') return '/admin'
  return '/dashboard'
}

// KLJUČNA METODA: Osvježi user stanje
const refreshUserState = () => {
  console.log('🔄 App.vue: Refreshing user state...')
  
  if (authHelper.isAuthenticated()) {
    const currentUser = authHelper.getUser()
    user.value = currentUser
    console.log('👤 App.vue: User state updated:', {
      email: currentUser.email,
      role: currentUser.role,
      requires_password_change: currentUser.requires_password_change
    })
  } else {
    user.value = null
    console.log('👤 App.vue: No user, setting to null')
  }
}

// KLJUČNA METODA: Provjeri password change status (SADA PASIVNA PROVJERA)
const checkPasswordChangeRequirement = () => {
  const currentUser = authHelper.getUser()
  const isAuthenticated = authHelper.isAuthenticated()
  const currentPath = route.path
  
  console.log('🔐 App.vue: Password change check:', {
    isAuthenticated,
    currentPath,
    userRequiresChange: currentUser?.requires_password_change,
    currentRoute: route.name,
    query: route.query
  })
  
  // PASIVNA PROVJERA: Route guard će rukovati redirect-om
  // Ovdje samo log-ujemo i prikazujemo modal ako je potrebno
  
  // Ako korisnik treba promijeniti lozinku i nije na change-password stranici
  if (isAuthenticated && currentUser?.requires_password_change === true && 
      route.name !== 'ChangePassword' && 
      !route.query.required) {
    
    console.log('⚠️ App.vue: Detected password change requirement outside route guard')
    
    // Ovo je backup provjera - samo za debug
    // Uglavnom nećemo pokazivati modal jer route guard treba rukovati redirect-om
    
    // Ako route guard nije preusmjerio nakon 2 sekunde, pokaži modal
    setTimeout(() => {
      if (route.name !== 'ChangePassword' && currentUser?.requires_password_change === true) {
        console.log('🔄 App.vue: Route guard didn\'t redirect - showing modal')
        showPasswordChangeModal.value = true
      }
    }, 2000)
  }
}

// KLJUČNA METODA: Direktno rukovanje auth success
const handleAuthSuccess = async (authData) => {
  console.log('🔄 App.vue: Auth success handler pokrenut:', {
    email: authData.user?.email,
    requiresPasswordChange: authData.user?.requires_password_change
  })
  
  // Odmah pokreni loader
  loaderMessage.value = 'Provjeravam podatke...'
  loaderSubMessage.value = 'Autenticiram vaš račun'
  showGlobalLoader.value = true
  
  try {
    await nextTick()
    
    // KLJUČNO: Provjeri je li authData ispravan
    if (!authData.token || !authData.user) {
      throw new Error('Nedostaju auth podaci')
    }
    
    console.log('🔍 App.vue: Auth data check:', {
      hasToken: !!authData.token,
      hasUser: !!authData.user,
      userRole: authData.user?.role,
      requiresPasswordChange: authData.user?.requires_password_change
    })
    
    // Spremanje auth podataka
    authHelper.setAuth(authData.token, authData.user)
    
    // Osvježi user stanje
    refreshUserState()
    
    console.log('✅ App.vue: User state refreshed:', user.value)
    console.log('👑 App.vue: User role:', authData.user.role)
    console.log('🔐 App.vue: Requires password change:', authData.user.requires_password_change)
    
    // Ako treba promijeniti lozinku, redirect na change-password
    if (authData.user.requires_password_change === true) {
      console.log('🔄 App.vue: Password change required, clearing loader and letting route guard handle redirect')
      
      // Samo očisti loader, route guard će rukovati redirect-om
      showGlobalLoader.value = false
      
      // Ovdje NE radimo redirect - prepuštamo route guard-u
      return
    }
    
    // Ako ne treba promijeniti lozinku, normalan redirect
    console.log('✅ App.vue: No password change required, letting route guard handle redirect')
    
    // Samo očisti loader
    showGlobalLoader.value = false
    
    // Prikaži welcome poruku (nakon kratke pauze da se user vidí)
    setTimeout(() => {
      showGlobalMessage(`Dobrodošli, ${authData.user.display_name || authData.user.email}!`, 'success')
    }, 1000)
    
  } catch (error) {
    console.error('App.vue: Auth success handling error:', error)
    showGlobalMessage('Greška pri prijavi', 'error')
    showGlobalLoader.value = false
  }
}

// Rukovanje password change required događajem
const handlePasswordChangeRequired = (data) => {
  console.log('🔄 App.vue: Password change required event received:', data)
  
  if (data.token && data.user) {
    // Spremi podatke
    authHelper.setAuth(data.token, data.user)
    
    // Route guard će rukovati redirect-om
    console.log('✅ App.vue: Auth set, route guard will handle redirect')
  }
}

// Rukovanje password changed događajem
const handlePasswordChanged = (data) => {
  console.log('✅ App.vue: Password changed event received:', data)
  
  // Ažuriraj user data ako je dostupno
  if (data.token && data.user) {
    authHelper.setAuth(data.token, data.user)
    refreshUserState()
  }
  
  // Prikaži poruku
  showGlobalMessage('Lozinka je uspješno promijenjena', 'success')
  
  // Route guard će rukovati redirect-om na odgovarajuću stranicu
  console.log('✅ App.vue: Password changed, user state updated')
}

// Check authentication status on app start
const checkAuthStatus = () => {
  console.log('🔍 App.vue: Checking auth status on startup...')
  refreshUserState()
  
  // Očisti sve stare redirect flagove na startup-u
  localStorage.removeItem('pendingRedirect')
  localStorage.removeItem('loginRedirect')
}

// Lifecycle
onMounted(() => {
  console.log('🚀 App.vue mounted')
  checkAuthStatus()
  
  // KLJUČNO: Osluškuj custom event za promjene auth stanja
  window.addEventListener('authStateChanged', refreshUserState)
  
  // Listen for storage changes (logout from other tabs)
  window.addEventListener('storage', (event) => {
    if (event.key === 'authToken' && !event.newValue) {
      console.log('🔐 Storage changed - logging out')
      handleLogout()
    }
  })
})

// Watch route changes - PASIVNO pratimo
watch(
  () => route.path,
  (newPath, oldPath) => {
    console.log('🛣️ App.vue: Route changed:', { from: oldPath, to: newPath })
    
    // Osvježi user stanje na promjenu rute
    refreshUserState()
    
    // Ako smo došli na change-password stranicu, očisti modal
    if (route.name === 'ChangePassword') {
      showPasswordChangeModal.value = false
      pendingPasswordChangeRedirect.value = false
    }
  }
)

// Watch query changes
watch(
  () => route.query.required,
  (required) => {
    if (required === 'true' && route.name === 'ChangePassword') {
      console.log('🔐 App.vue: Required password change detected via query')
      showPasswordChangeModal.value = false
    }
  }
)

// Cleanup
onUnmounted(() => {
  window.removeEventListener('storage', handleLogout)
  window.removeEventListener('authStateChanged', refreshUserState)
})
</script>

<style scoped>
.container {
  max-width: 1200px;
}
</style>