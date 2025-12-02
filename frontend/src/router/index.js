import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './style.css'
import { authHelper } from './services/api'

// ⭐⭐⭐ SAMO POTREBNE KOMPONENTE ZA ACTIVATION FLOW ⭐⭐⭐
import HomePage from './components/HomePage.vue'
import AuthManager from './components/AuthManager.vue'
import Dashboard from './components/Dashboard.vue'
import Activation from './components/Activation.vue'

// Kreiraj router instance
const router = createRouter({
  history: createWebHistory(),
  routes: [
    // ⭐⭐⭐ ACTIVATION ROUTE - PRIORITET ⭐⭐⭐
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
    
    // ⭐⭐⭐ ADMIN RUTE ⭐⭐⭐
    {
      path: '/admin',
      name: 'Admin',
      component: () => import('./components/admin/AdminLayout.vue'),
      meta: { 
        requiresAuth: true,
        requiresAdmin: true,
        requiresVerified: true,
        title: 'Admin Panel - CRM Sustav'
      },
      children: [
        {
          path: '',
          name: 'AdminDashboard',
          component: () => import('./components/admin/AdminDashboard.vue'),
          meta: { title: 'Admin Dashboard' }
        },
        {
          path: 'users',
          name: 'UserManagement',
          component: () => import('./components/admin/UserManagement.vue'),
          meta: { title: 'Upravljanje Korisnicima' }
        },
        {
          path: 'users/create',
          name: 'CreateUser',
          component: () => import('./components/admin/CreateUserForm.vue'),
          meta: { title: 'Dodaj Novog Korisnika' }
        },
        {
          path: 'users/:id/edit',
          name: 'EditUser',
          component: () => import('./components/admin/EditUserForm.vue'),
          meta: { title: 'Uredi Korisnika' }
        }
      ]
    },
    
    // ⭐⭐⭐ WILDCARD ROUTE ⭐⭐⭐
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
})

// Globalni navigation guard - AUTO-LOGIN JE ABSOLUTNI PRIORITET
router.beforeEach((to, from, next) => {
  console.log('🛡️ Route Guard:', to.name || to.path, 'Query:', to.query)
  
  // 🎯 KRITIČNO: AUTO-LOGIN HANDLING - MORA BITI PRVI!
  if (to.query.autoLogin === 'true' && to.query.token && to.query.email) {
    console.log('🔐 AUTO-LOGIN DETEKTIRAN - OBRADUJEM!', {
      email: to.query.email,
      tokenLength: to.query.token?.length || 0,
      verified: to.query.verified
    })
    
    try {
      // Spremi token i podatke
      authHelper.setAuth(to.query.token, {
        email: to.query.email,
        email_verified: to.query.verified === 'true',
        role: 'user',
        first_name: to.query.email.split('@')[0]
      })
      
      console.log('✅ Auto-login uspješan! Korisnik prijavljen.')
      
      // Očisti URL parametre
      const cleanUrl = window.location.origin + '/dashboard'
      window.history.replaceState({}, document.title, cleanUrl)
      
      // Redirect na dashboard
      next('/dashboard')
      return
      
    } catch (error) {
      console.error('❌ Auto-login greška:', error)
      next('/login')
      return
    }
  }

  const isAuthenticated = authHelper.isAuthenticated()
  const user = authHelper.getUser()
  const isEmailVerified = user?.email_verified
  const isAdmin = user?.role === 'admin'
  
  console.log('🔐 Auth status u guardu:', {
    isAuthenticated,
    user: user ? { email: user.email, verified: user.email_verified } : null,
    isAdmin
  })

  // Postavi naslov stranice
  if (to.meta.title) {
    document.title = to.meta.title
  }

  // 🔗 ACTIVATION LINK HANDLING - SAMO ZA OBIČNE ACTIVATION LINKOVE
  if (to.query.token && to.query.email && !to.query.autoLogin && to.path !== '/activate') {
    console.log('🔗 Običan activation link detektiran, preusmjeravam na /activate')
    next({
      path: '/activate',
      query: to.query
    })
    return
  }
  
  // 🚫 ADMIN RUTE PROVJERA
  if (to.meta.requiresAdmin) {
    if (!isAuthenticated) {
      console.log('🚫 Admin pristup odbijen: Korisnik nije prijavljen')
      localStorage.setItem('intended_url', to.fullPath)
      next({ 
        name: 'Login',
        query: { 
          redirect: to.fullPath,
          message: 'Morate biti prijavljeni za pristup admin panelu'
        }
      })
      return
    }
    
    if (!isAdmin) {
      console.log('🚫 Admin pristup odbijen: Korisnik nije admin')
      next({ 
        name: 'Dashboard',
        query: { 
          message: 'Nemate ovlaštenja za pristup admin panelu'
        }
      })
      return
    }
    
    if (to.meta.requiresVerified && !isEmailVerified) {
      console.log('📧 Admin pristup odbijen: Račun nije aktiviran')
      next({ 
        path: '/activate',
        query: { 
          email: user?.email,
          message: 'Morate aktivirati račun prije pristupa admin panelu'
        }
      })
      return
    }
  }

  // 🔐 AUTH RUTE PROVJERA
  if (to.meta.requiresAuth) {
    if (!isAuthenticated) {
      console.log('🚫 Pristup odbijen: Korisnik nije prijavljen')
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
    
    if (to.meta.requiresVerified && !isEmailVerified) {
      console.log('📧 Pristup odbijen: Račun nije aktiviran')
      const userEmail = user?.email || localStorage.getItem('pending_verification_email')
      next({ 
        path: '/activate',
        query: { 
          email: userEmail,
          message: 'Morate aktivirati račun prije pristupa'
        }
      })
      return
    }
  }
  
  // 👤 GUEST RUTE PROVJERA
  if (to.meta.requiresGuest && isAuthenticated) {
    console.log('🔐 Korisnik je već prijavljen, preusmjeravam...')
    
    if (isEmailVerified) {
      const intendedUrl = localStorage.getItem('intended_url')
      if (intendedUrl && intendedUrl !== '/dashboard') {
        localStorage.removeItem('intended_url')
        next(intendedUrl)
      } else {
        next('/dashboard')
      }
    } else {
      const userEmail = user?.email || localStorage.getItem('pending_verification_email')
      next({ 
        path: '/activate',
        query: { email: userEmail }
      })
    }
    return
  }
  
  // 🎯 SPECIFIČNE RUTE HANDLING
  if ((to.name === 'Login' || to.name === 'Register') && isAuthenticated && isEmailVerified) {
    console.log('🔐 Korisnik je već prijavljen i aktiviran, preusmjeravam na dashboard')
    next('/dashboard')
    return
  }
  
  if (to.name === 'Activation' && isAuthenticated && isEmailVerified) {
    console.log('✅ Račun je već aktiviran, preusmjeravam na dashboard')
    next('/dashboard')
    return
  }
  
  // ✅ SVE JE U REDU - NASTAVI
  console.log('✅ Route guard prošao, nastavljam na:', to.name)
  next()
})

// Kreiraj Vue aplikaciju
const app = createApp(App)
app.use(createPinia())
app.use(router)

// Development debug funkcije
if (import.meta.env.DEV) {
  window.clearAuth = () => {
    authHelper.clearAuth()
    localStorage.removeItem('pending_verification_email')
    localStorage.removeItem('intended_url')
    console.log('🔐 Auth očišćen')
    window.location.reload()
  }
  
  console.log('🔧 Development mode - debug features enabled')
  console.log('🐛 Debug funkcije:')
  console.log('   - clearAuth() - očisti auth podatke')
}

app.mount('#app')

console.log('🚀 Vue CRM aplikacija pokrenuta!')
console.log('📍 Clean router - optimiziran za activation flow')
console.log('🔐 Auth status:', {
  isAuthenticated: authHelper.isAuthenticated(),
  user: authHelper.getUser() ? { 
    email: authHelper.getUser().email,
    role: authHelper.getUser().role,
    verified: authHelper.getUser().email_verified 
  } : 'Nema korisnika'
})

// Dev-only features
// if (import.meta.env.DEV) {
//   console.log('🔧 Development mode - debug features enabled')
  
//   window.__CRM_DEBUG__ = {
//     auth: authHelper,
//     router,
//     routes: router.getRoutes(),
//     clearAuth: () => {
//       authHelper.clearAuth()
//       localStorage.removeItem('pending_verification_email')
//       localStorage.removeItem('intended_url')
//       window.location.reload()
//     },
//     testActivation: (email = 'test@crm.com') => {
//       const token = 'test-token-' + Date.now()
//       const activationUrl = `http://localhost:5173/activate?token=${token}&email=${email}`
//       console.log('🔗 Test activation URL:', activationUrl)
//       return activationUrl
//     },
//     simulateAdmin: () => {
//       const adminUser = {
//         id: 1,
//         email: 'admin@crm.com',
//         name: 'Admin User',
//         role: 'admin',
//         email_verified: true
//       }
//       authHelper.setAuth('fake-admin-token', adminUser)
//       console.log('👑 Simuliran admin user:', adminUser)
//       window.location.reload()
//     },
//     testAutoLogin: (email = 'test@crm.com') => {
//       const token = 'fake-jwt-token-' + Date.now()
//       const autoLoginUrl = `http://localhost:5173/dashboard?autoLogin=true&token=${token}&email=${email}&verified=true`
//       console.log('🔐 Test auto-login URL:', autoLoginUrl)
//       return autoLoginUrl
//     }
//   }
  
  console.log('🐛 Debug dostupan na window.__CRM_DEBUG__')

  