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

const emit = defineEmits(['success', 'go-home'])

// State
const currentView = ref(props.initialView)
const isLoading = ref(false)
const loginRef = ref(null)
const registerRef = ref(null)

console.log('🚀 AuthManager mounted sa initialView:', props.initialView)
console.log('📍 Trenutna ruta:', route.path)

// Methods
const switchToLogin = () => {
  console.log('🔄 Prebacujem na login...')
  currentView.value = 'login'
  router.push('/login')
}

const switchToRegister = () => {
  console.log('🔄 Prebacujem na register...')
  currentView.value = 'register'
  router.push('/register')
}

const goToHome = () => {
  router.push('/')
}

const handleLogin = async (loginData) => {
  isLoading.value = true
  
  try {
    console.log('🔄 AuthManager: Primljeni login podaci:', loginData)
    
    // Dodaj loading delay za bolji UX
    await new Promise(resolve => setTimeout(resolve, 800))
    
    console.log('✅ AuthManager: Prosljeđujem podatke parent komponenti')
    
    // PROMJENA: Koristimo event umjesto emit za App.vue
    window.dispatchEvent(new CustomEvent('auth-success', { 
      detail: loginData 
    }))
    
    // Također možemo emitati i na parent ako je potrebno
    emit('success', loginData)
    
  } catch (error) {
    console.error('❌ AuthManager: Greška pri prijavi:', error)
    
    // Proslijedi grešku LoginForm komponenti
    if (loginRef.value && loginRef.value.showError) {
      loginRef.value.showError(
        error.message || 'Došlo je do greške pri prijavi. Pokušajte ponovno.'
      )
    } else {
      console.error('❌ LoginRef nije dostupan za prikaz greške')
    }
    
  } finally {
    isLoading.value = false
  }
}

const handleRegistered = async (userData) => {
  console.log('✅ AuthManager: User registered:', userData)
  
  // PROMJENA: Također koristimo event za registraciju ako je potrebno
  if (userData.token && userData.user) {
    console.log('🔄 AuthManager: Emitting auth-success za registraciju')
    window.dispatchEvent(new CustomEvent('auth-success', { 
      detail: userData 
    }))
  }
  
  // NE prebacuj na login! Ostani na registraciji dok se ne preusmjeri na verify-email
  // Registration komponenta će se sama preusmjeriti na verify-email
  console.log('🔄 AuthManager: Ostajem na register viewu dok se ne preusmjeri na verify-email')
  
  // Možemo dodati loading state ako je potrebno
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
    console.log('   - View matches route:', 
      (route.path === '/register' && currentView.value === 'register') ||
      (route.path === '/login' && currentView.value === 'login')
    )
  }, 100)
})

// Cleanup event listener
import { onUnmounted } from 'vue'
onUnmounted(() => {
  // Očistimo event listener ako je potrebno
  window.removeEventListener('auth-success', () => {})
})

// Expose methods ako su potrebne
defineExpose({
  switchToLogin,
  switchToRegister,
  setView: (view) => {
    if (['login', 'register'].includes(view)) {
      currentView.value = view
    }
  }
})
</script>

<style scoped>
/* Smooth transitions za cijelu komponentu */
* {
  transition: all 0.3s ease-in-out;
}
</style>