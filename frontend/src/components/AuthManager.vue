<template>
  <div>
    <Login 
      v-if="currentView === 'login'"
      :is-logging-in="isLoading"
      @login="handleLogin"
      @show-register="switchToRegister"
      @go-home="goToHome"
      ref="loginRef"
    />
    
    <Registration 
      v-else
      :is-registering="isLoading"
      @show-login="switchToLogin"
      @go-home="goToHome"
      @registered="handleRegistered"
      ref="registerRef"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Login from './LoginForm.vue'
import Registration from './Registration.vue'

const router = useRouter()
const route = useRoute()

// Props
const props = defineProps({
  initialView: {
    type: String,
    default: 'login',
    validator: (value) => ['login', 'register'].includes(value)
  }
})

// 🎯 EMITS
const emit = defineEmits(['auth-success', 'password-change-required'])

// State
const currentView = ref(props.initialView)
const isLoading = ref(false)
const loginRef = ref(null)
const registerRef = ref(null)

console.log('🚀 AuthManager mounted sa initialView:', props.initialView)

// Methods
const switchToLogin = () => {
  currentView.value = 'login'
  router.push('/login')
}

const switchToRegister = () => {
  currentView.value = 'register'
  router.push('/register')
}

const goToHome = () => {
  router.push('/')
}

// 🎯 KLJUČNA METODA: HANDLE LOGIN - SAMO PROSLJEĐIVANJE
const handleLogin = async (loginData) => {
  console.log('🔄 AuthManager: Primljeni login podaci:', {
    success: loginData.success,
    hasToken: !!loginData.token,
    hasUser: !!loginData.user,
    requires_password_change: loginData.requires_password_change,
    from_error: loginData.from_error
  })
  
  // SAMO proslijedi podatke dalje - NE pozivaj API ponovno!
  
  // 🎯 PROVIERA 1: Da li je password change required?
  if (loginData.requires_password_change === true) {
    console.log('🔄 AuthManager: Password change required detected')
    
    // Emit-uj poseban event za password change
    emit('password-change-required', {
      token: loginData.token,
      user: loginData.user,
      message: 'Morate promijeniti lozinku pri prvoj prijavi'
    })
    
    return
  }
  
  // 🎯 PROVIERA 2: Normalan login
  if (loginData.success && loginData.token && loginData.user) {
    console.log('✅ AuthManager: Normal login, emitting auth-success')
    
    // Dodaj mali delay za bolji UX
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // Emit-uj auth-success parent komponenti (App.vue)
    emit('auth-success', {
      token: loginData.token,
      user: loginData.user,
      requires_password_change: false,
      requires_redirect: true
    })
    
    return
  }
  
  // 🎯 PROVIERA 3: Greška ili nepotpuni podaci
  console.error('❌ AuthManager: Neispravni login podaci:', loginData)
  
  // Ako imamo loginRef, pokaži grešku
  if (loginRef.value && loginRef.value.showError) {
    loginRef.value.showError('Došlo je do greške pri prijavi. Pokušajte ponovno.')
  }
}

const handleRegistered = async (userData) => {
  console.log('✅ AuthManager: User registered:', userData)
  
  // Ako imamo token i user iz registracije
  if (userData.token && userData.user) {
    console.log('🔄 AuthManager: Emitting auth-success za registraciju')
    emit('auth-success', userData)
  }
  
  // NE prebacuj na login! Ostani na registraciji
  console.log('🔄 AuthManager: Ostajem na register viewu')
  
  isLoading.value = true
  setTimeout(() => {
    isLoading.value = false
  }, 1000)
}

// Force view based on route
const forceViewBasedOnRoute = () => {
  console.log('🔧 Force view check:')
  console.log('   - Route path:', route.path)
  console.log('   - Current view:', currentView.value)
  
  if (route.path === '/register' || route.name === 'Register') {
    if (currentView.value !== 'register') {
      console.log('💥 FORCE: Setting to register view')
      currentView.value = 'register'
    }
  } else if (route.path === '/login' || route.name === 'Login') {
    if (currentView.value !== 'login') {
      console.log('💥 FORCE: Setting to login view')
      currentView.value = 'login'
    }
  } else {
    console.log('ℹ️  Unknown route, using prop value:', props.initialView)
    currentView.value = props.initialView
  }
}

// 🎯 METODA ZA SIMULACIJU PASSWORD CHANGE REQUIREMENT (za debugging)
const simulatePasswordChange = () => {
  const mockUser = {
    email: 'demo@crm.demo',
    first_name: 'Demo',
    role: 'user',
    requires_password_change: true
  }
  
  const mockToken = 'mock-token-for-password-change'
  
  console.log('🔄 AuthManager: Simulating password change requirement')
  
  emit('password-change-required', {
    token: mockToken,
    user: mockUser,
    message: 'Simulirana potreba za promjenom lozinke'
  })
}

// Watchers
watch(
  () => props.initialView,
  (newView) => {
    console.log('🔄 Props initialView promijenjen:', newView)
    currentView.value = newView
  }
)

watch(
  () => route.path,
  (newPath, oldPath) => {
    console.log('🔄 Ruta promijenjena:', oldPath, '→', newPath)
    forceViewBasedOnRoute()
  }
)

// Lifecycle
onMounted(() => {
  console.log('🎯 AuthManager mounted - inicijalni setup')
  forceViewBasedOnRoute()
  
  // Dodatna provjera nakon mounta
  setTimeout(() => {
    console.log('🔍 Post-mount check:')
    console.log('   - Final route:', route.path)
    console.log('   - Final view:', currentView.value)
  }, 100)
  
  // 🎯 DODAJ GLOBALNU DEBUG FUNKCIJU
  if (import.meta.env.DEV) {
    window.simulatePasswordChangeFromAuthManager = simulatePasswordChange
    console.log('🔧 Dev mode: simulatePasswordChangeFromAuthManager() available')
  }
})

// Expose methods ako su potrebne
defineExpose({
  switchToLogin,
  switchToRegister,
  setView: (view) => {
    if (['login', 'register'].includes(view)) {
      currentView.value = view
    }
  },
  // 🎯 EKSPONIRAJ METODU ZA TESTIRANJE
  simulatePasswordChange
})
</script>

<style scoped>
/* Smooth transitions za cijelu komponentu */
* {
  transition: all 0.3s ease-in-out;
}
</style>