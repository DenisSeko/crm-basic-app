<template>
  <nav class="bg-white shadow-sm border-b">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <!-- Logo i naslov -->
        <div class="flex items-center">
          <a href="#" @click.prevent="$emit('go-home')" 
             class="flex items-center space-x-3 text-gray-800 hover:text-blue-600 transition-colors duration-200">
            <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-sm">CRM</span>
            </div>
            <h1 class="text-xl font-semibold hidden sm:block">
              CRM Sustav
            </h1>
          </a>
        </div>

        <!-- User info ili status -->
        <div class="flex items-center space-x-4">
          <template v-if="displayUser">
            <!-- User info -->
            <div class="flex items-center space-x-3 bg-gray-50 rounded-lg px-3 py-2">
              <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {{ getUserInitial(displayUser) }}
              </div>
              <div class="hidden md:block">
                <!-- Prikaz imena korisnika -->
                <div class="text-sm font-medium text-gray-700">
                  {{ getUserDisplayName(displayUser) }}
                </div>
                <div class="text-xs text-gray-500 capitalize">
                  {{ formatUserRole(displayUser.role) }}
                </div>
              </div>
            </div>
            
            <!-- Logout button -->
            <button @click="$emit('logout')"
                    class="text-gray-600 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors duration-200 hover:bg-red-50 border border-transparent hover:border-red-200">
              <span class="text-lg">🚪</span>
              <span class="hidden sm:inline">Odjava</span>
            </button>
          </template>
          
          <template v-else>
            <!-- Status indicator kada nema prijavljenog korisnika -->
            <div class="flex items-center space-x-2 text-sm text-gray-500">
              <div class="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
              <span class="hidden sm:inline">Niste prijavljeni</span>
            </div>
            
            <!-- Home button -->
            <button @click="$emit('go-home')"
                    class="text-blue-600 hover:text-blue-800 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors duration-200 hover:bg-blue-50">
              <span class="text-lg">🏠</span>
              <span class="hidden sm:inline">Početna</span>
            </button>
          </template>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { authHelper } from '../services/api'

const props = defineProps({
  user: {
    type: Object,
    default: null
  }
})

defineEmits(['go-home', 'logout'])

// KLJUČNO: Computed property koja koristi i props i direktno authHelper
const displayUser = computed(() => {
  // Prvo koristi props.user (od App.vue)
  if (props.user) {
    console.log('👤 AppHeader: Using user from props:', {
      display_name: props.user.display_name,
      first_name: props.user.first_name,
      email: props.user.email
    })
    return props.user
  }
  
  // Ako props.user nije dostupan, probaj iz authHelper
  const authUser = authHelper.getUser()
  if (authUser) {
    console.log('👤 AppHeader: Using user from authHelper:', {
      display_name: authUser.display_name,
      first_name: authUser.first_name,
      email: authUser.email
    })
    return authUser
  }
  
  console.log('👤 AppHeader: No user available')
  return null
})

// PAMETNA METODA: Dobivanje prikaznog imena korisnika s logikom prioriteta
const getUserDisplayName = (user) => {
  if (!user) {
    console.log('👤 getUserDisplayName: No user object')
    return 'Korisnik'
  }
  
  // Debug info
  const debugInfo = {
    display_name: user.display_name,
    first_name: user.first_name,
    last_name: user.last_name,
    username: user.username,
    email: user.email,
    id: user.id
  }
  
  // 1. POKUŠAJ: display_name (ako postoji i nije prazan)
  if (user.display_name && user.display_name.trim()) {
    console.log('✅ Using display_name:', user.display_name, 'Debug:', debugInfo)
    return user.display_name.trim()
  }
  
  // 2. POKUŠAJ: first_name (ako postoji i nije prazan)
  if (user.first_name && user.first_name.trim()) {
    console.log('✅ Using first_name:', user.first_name, 'Debug:', debugInfo)
    return user.first_name.trim()
  }
  
  // 3. POKUŠAJ: username (ako postoji i nije prazan)
  if (user.username && user.username.trim()) {
    console.log('✅ Using username:', user.username, 'Debug:', debugInfo)
    return user.username.trim()
  }
  
  // 4. POKUŠAJ: full_name (ako postoji i nije prazan)
  if (user.full_name && user.full_name.trim()) {
    const firstName = user.full_name.split(' ')[0]
    if (firstName && firstName.trim()) {
      console.log('✅ Using first part of full_name:', firstName, 'Debug:', debugInfo)
      return firstName.trim()
    }
  }
  
  // 5. FALLBACK: email (uvijek generira nešto iz emaila)
  if (user.email) {
    const nameFromEmail = user.email.split('@')[0]
    const cleanName = nameFromEmail
      .replace(/[0-9._-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    const displayName = cleanName.split(' ')[0] || nameFromEmail
    const capitalized = displayName.charAt(0).toUpperCase() + displayName.slice(1)
    
    console.log('✅ Generated from email:', capitalized, 'Debug:', debugInfo)
    return capitalized
  }
  
  // 6. ULTIMATIVNI FALLBACK
  console.log('⚠️ No valid name found, using default. Debug:', debugInfo)
  return 'Korisnik'
}

// Helper funkcija za dobivanje inicijala (samo prvo slovo imena)
const getUserInitial = (user) => {
  if (!user) return '?'
  
  const displayName = getUserDisplayName(user)
  
  // Uzmi prvo slovo prikaznog imena
  const initial = displayName.charAt(0).toUpperCase()
  console.log('🔤 User initial for', displayName + ':', initial)
  
  return initial
}

// Helper funkcija za formatiranje role
const formatUserRole = (role) => {
  if (!role) {
    console.log('👑 No role provided')
    return 'korisnik'
  }
  
  const roleMap = {
    'admin': 'administrator',
    'user': 'korisnik',
    'manager': 'menadžer'
  }
  
  const formattedRole = roleMap[role] || role
  console.log('👑 Role formatted:', role, '→', formattedRole)
  
  return formattedRole
}

// Debug info za development
if (import.meta.env.DEV) {
  console.log('🔧 AppHeader.vue loaded in development mode')
  
  // Prikaži trenutnog korisnika pri učitavanju
  setTimeout(() => {
    const user = displayUser.value
    if (user) {
      console.log('👤 AppHeader initial user state:', {
        display_name: user.display_name,
        first_name: user.first_name,
        email: user.email,
        role: user.role,
        displayName: getUserDisplayName(user),
        initial: getUserInitial(user)
      })
    } else {
      console.log('👤 AppHeader: No user on initial load')
    }
  }, 100)
}
</script>

<style scoped>
/* Smooth transitions */
nav {
  transition: all 0.3s ease;
}

/* Hover effects */
button:hover {
  transform: translateY(-1px);
  transition: transform 0.2s ease;
}

/* Animacija za status indikator */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse {
  animation: pulse 2s infinite;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .hidden-sm-inline {
    display: none;
  }
}
</style>