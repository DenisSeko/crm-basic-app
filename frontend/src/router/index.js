import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './style.css'
import { authHelper } from './services/api'

// Import komponenti
import HomePage from './components/HomePage.vue'
import AuthManager from './components/AuthManager.vue'
import Dashboard from './components/Dashboard.vue'
import VerifyEmail from './components/VerifyEmail.vue'
import EmailVerified from './components/EmailVerified.vue'
import Activation from './components/Activation.vue'

// Kreiraj router instance
const router = createRouter({
  history: createWebHistory(),
  routes: [
    // ⭐⭐⭐ ACTIVATION ROUTE FIRST - PRIORITET ⭐⭐⭐
    {
      path: '/activate',
      name: 'Activation',
      component: Activation,
      meta: { 
        requiresGuest: true,
        title: 'Aktivacija Računa - CRM Sustav'
      }
    },
    {
      path: '/',
      name: 'Home',
      component: HomePage,
      meta: { title: 'Početna - CRM Sustav' }
    },
    {
      path: '/login',
      name: 'Login', 
      component: AuthManager,
      props: { initialView: 'login' },
      meta: { 
        requiresGuest: true,
        title: 'Prijava - CRM Sustav'
      }
    },
    {
      path: '/register',
      name: 'Register',
      component: AuthManager,
      props: { initialView: 'register' },
      meta: { 
        requiresGuest: true,
        title: 'Registracija - CRM Sustav'
      }
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: Dashboard,
      meta: { 
        requiresAuth: true,
        requiresVerified: true,
        title: 'Dashboard - CRM Sustav'
      }
    },
    {
      path: '/verify-email',
      name: 'VerifyEmail',
      component: VerifyEmail,
      meta: { 
        requiresGuest: true,
        title: 'Verifikacija Emaila - CRM Sustav'
      }
    },
    {
      path: '/email-verified',
      name: 'EmailVerified',
      component: EmailVerified,
      meta: { 
        requiresGuest: true,
        title: 'Email Verificiran - CRM Sustav'
      }
    },
    // ⭐⭐⭐ WILDCARD ROUTE MORA BITI AKTIVNA ⭐⭐⭐
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
})

// Globalni navigation guard
router.beforeEach((to, from, next) => {
  console.log('🛡️ Route Guard aktiviran:')
  console.log('   - Od:', from.name || from.path)
  console.log('   - Prema:', to.name || to.path)
  console.log('   - Query:', to.query)
  
  // ⭐⭐⭐ FIX 1: AUTO-REDIRECT TO ACTIVATION IF TOKEN AND EMAIL ARE PRESENT ⭐⭐⭐
  if (to.path === '/' && to.query.token && to.query.email) {
    console.log('🔗 Aktivacijski link detektiran na HomePage, preusmjeravam na /activate')
    console.log('   - Token:', to.query.token)
    console.log('   - Email:', to.query.email)
    
    next({
      path: '/activate',
      query: to.query
    })
    return
  }

  // ⭐⭐⭐ FIX 2: HANDLE ANY ROUTE WITH ACTIVATION PARAMS ⭐⭐⭐
  if (to.query.token && to.query.email && to.path !== '/activate') {
    console.log('🔗 Activation parametri detektirani na rutu:', to.path)
    console.log('   - Preusmjeravam na /activate')
    console.log('   - Token:', to.query.token)
    console.log('   - Email:', to.query.email)
    
    next({
      path: '/activate',
      query: to.query
    })
    return
  }
  
  const isAuthenticated = authHelper.isAuthenticated()
  const user = authHelper.getUser()
  const isEmailVerified = user?.email_verified
  
  console.log('🔐 Auth Status:', { 
    isAuthenticated, 
    isEmailVerified,
    user: user ? { id: user.id, email: user.email } : 'Nema korisnika'
  })
  
  // Postavi naslov stranice
  if (to.meta.title) {
    document.title = to.meta.title
  }

  // RUTE KOJE ZAHTIJEVAJU AUTENTIKACIJU
  if (to.meta.requiresAuth) {
    if (!isAuthenticated) {
      console.log('🚫 Pristup odbijen: Korisnik nije prijavljen')
      console.log('📍 Preusmjeravam na login s redirect parametrom:', to.fullPath)
      
      // Spremi intended URL za nakon prijave
      localStorage.setItem('intended_url', to.fullPath)
      
      next({ 
        name: 'Login',
        query: { 
          redirect: to.fullPath,
          message: 'Morate biti prijavljeni za pristup ovoj stranici'
        }
      })
      return
    }
    
    // Provjeri je li email verifikovan ako ruta to zahtijeva
    if (to.meta.requiresVerified && !isEmailVerified) {
      console.log('📧 Pristup odbijen: Email nije verifikovan')
      console.log('📍 Preusmjeravam na verify-email')
      
      const userEmail = user?.email || localStorage.getItem('pending_verification_email')
      next({ 
        name: 'VerifyEmail', 
        query: { 
          email: userEmail,
          message: 'Morate verifikovati email prije pristupa dashboardu'
        }
      })
      return
    }
  }
  
  // RUTE KOJE ZAHTIJEVAJU DA KORISNIK NIJE PRIJAVLJEN (GUEST)
  if (to.meta.requiresGuest && isAuthenticated) {
    console.log('🔐 Korisnik je već prijavljen, preusmjeravam...')
    
    if (isEmailVerified) {
      // Ako je email verifikovan, idi na dashboard
      const intendedUrl = localStorage.getItem('intended_url')
      if (intendedUrl && intendedUrl !== '/dashboard') {
        console.log('📍 Preusmjeravam na intended URL:', intendedUrl)
        localStorage.removeItem('intended_url')
        next(intendedUrl)
      } else {
        console.log('📍 Preusmjeravam na dashboard')
        next('/dashboard')
      }
    } else {
      // Ako email nije verifikovan, idi na verify-email
      const userEmail = user?.email || localStorage.getItem('pending_verification_email')
      console.log('📧 Preusmjeravam na verify-email jer email nije verifikovan')
      next({ 
        name: 'VerifyEmail', 
        query: { email: userEmail }
      })
    }
    return
  }
  
  // SPECIFIČNE RUTE HANDLING
  
  // Ako je korisnik na verify-email ali je već verifikovan
  if (to.name === 'VerifyEmail' && isAuthenticated && isEmailVerified) {
    console.log('✅ Email je već verifikovan, preusmjeravam na dashboard')
    next('/dashboard')
    return
  }
  
  // Ako je korisnik na login/register ali je već prijavljen i verifikovan
  if ((to.name === 'Login' || to.name === 'Register') && isAuthenticated && isEmailVerified) {
    console.log('🔐 Korisnik je već prijavljen i verifikovan, preusmjeravam na dashboard')
    next('/dashboard')
    return
  }
  
  // Ako je korisnik na email-verified stranici ali nije prijavljen
  if (to.name === 'EmailVerified' && !isAuthenticated) {
    console.log('🔐 Korisnik nije prijavljen, preusmjeravam na login')
    next('/login')
    return
  }
  
  // Ako je korisnik na activation stranici ali je već prijavljen
  if (to.name === 'Activation' && isAuthenticated) {
    console.log('🔐 Korisnik je već prijavljen, preusmjeravam na dashboard')
    next('/dashboard')
    return
  }
  
  // SVE JE U REDU - NASTAVI
  console.log('✅ Route guard prošao, nastavljam na:', to.name)
  next()
})

// Router error handler
router.onError((error) => {
  console.error('💥 Router Error:', error)
})

// Kreiraj Vue aplikaciju
const app = createApp(App)

// Registriraj globalne komponente ako su potrebne
// app.component('ComponentName', Component)

// Koristi plugin-e
app.use(createPinia())
app.use(router)

// Globalne konfiguracije
app.config.globalProperties.$filters = {
  formatDate(date) {
    return new Date(date).toLocaleDateString('hr-HR')
  },
  formatDateTime(date) {
    return new Date(date).toLocaleString('hr-HR')
  }
}

// Mount aplikaciju
app.mount('#app')

// Console log za debugging
console.log('🚀 Vue CRM aplikacija pokrenuta!')
console.log('📍 Router konfiguriran sa sljedećim rutama:')
router.getRoutes().forEach(route => {
  console.log(`   - ${route.path} (${route.name})`)
})
console.log('🔐 Auth system:', {
  hasToken: !!authHelper.getToken(),
  hasUser: !!authHelper.getUser(),
  isAuthenticated: authHelper.isAuthenticated()
})
console.log('🌐 Environment:', import.meta.env.MODE)
console.log('📧 Email verifikacija: AKTIVNA')
console.log('🔗 Activation link handler: AKTIVAN')

// Dev-only features
if (import.meta.env.DEV) {
  console.log('🔧 Development mode - debug features enabled')
  
  // Globalni debug objekat
  window.__CRM_DEBUG__ = {
    auth: authHelper,
    router,
    routes: router.getRoutes(),
    reloadApp: () => window.location.reload(),
    clearAuth: () => {
      authHelper.clearAuth()
      localStorage.removeItem('pending_verification_email')
      localStorage.removeItem('intended_url')
      window.location.reload()
    },
    testActivation: (email = 'test@crm.com') => {
      const token = 'test-token-' + Date.now()
      // Testiraj oba formata linkova
      const activationUrl1 = `http://localhost:5173/?token=${token}&email=${email}`
      const activationUrl2 = `http://localhost:5173/activate?token=${token}&email=${email}`
      console.log('🔗 Test activation URL 1 (legacy):', activationUrl1)
      console.log('🔗 Test activation URL 2 (new):', activationUrl2)
      return { legacy: activationUrl1, new: activationUrl2 }
    },
    forceActivation: (email = 'test@crm.com') => {
      const token = 'force-token-' + Date.now()
      router.push({
        path: '/activate',
        query: { token, email }
      })
    }
  }
  
  console.log('🐛 Debug objekat dostupan na window.__CRM_DEBUG__')
}