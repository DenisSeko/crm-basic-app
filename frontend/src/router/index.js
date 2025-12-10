import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './style.css'
import { authHelper } from './services/api'

// Komponente
import HomePage from './components/HomePage.vue'
import AuthManager from './components/AuthManager.vue'
import Dashboard from './components/Dashboard.vue'
import Activation from './components/Activation.vue'
import ChangePassword from './components/ChangePassword.vue' // 🔴 NOVO: Import ChangePassword

// Router
const router = createRouter({
  history: createWebHistory(),
  routes: [
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
      path: '/activate',
      name: 'Activation',
      component: Activation,
      meta: { 
        requiresGuest: true,
        title: 'Aktivacija Računa'
      }
    },
    // 🔴 NOVO: Change password route
    {
      path: '/change-password',
      name: 'ChangePassword',
      component: ChangePassword,
      meta: { 
        requiresAuth: true, // Zahtjeva autentifikaciju
        requiresPasswordChange: false, // Nije flag, rutu treba pristupiti
        title: 'Promjena Lozinke - CRM Sustav'
      }
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: Dashboard,
      meta: { 
        requiresAuth: true,
        requiresPasswordChanged: true, // 🔴 NOVO: Treba da je lozinka promijenjena
        title: 'Dashboard - CRM Sustav'
      }
    },
    {
      path: '/admin',
      name: 'Admin',
      component: () => import('./components/admin/AdminLayout.vue'),
      meta: { 
        requiresAuth: true,
        requiresAdmin: true,
        requiresPasswordChanged: true, // 🔴 NOVO: Admin također treba promijeniti lozinku
        title: 'Admin Panel - CRM Sustav'
      },
      children: [
        {
          path: '',
          name: 'AdminDashboard',
          component: () => import('./components/admin/AdminDashboard.vue'),
          meta: { 
            requiresPasswordChanged: true,
            title: 'Admin Dashboard' 
          }
        },
        {
          path: 'users',
          name: 'UserManagement',
          component: () => import('./components/admin/UserManagement.vue'),
          meta: { 
            requiresPasswordChanged: true,
            title: 'Upravljanje Korisnicima' 
          }
        },
        {
          path: 'users/create',
          name: 'CreateUser',
          component: () => import('./components/admin/CreateUserForm.vue'),
          meta: { 
            requiresPasswordChanged: true,
            title: 'Dodaj Novog Korisnika' 
          }
        },
        {
          path: 'users/:id/edit',
          name: 'EditUser',
          component: () => import('./components/admin/EditUserForm.vue'),
          meta: { 
            requiresPasswordChanged: true,
            title: 'Uredi Korisnika' 
          }
        },
        {
          path: 'settings',
          name: 'AdminSettings',
          component: () => import('./components/admin/AdminSettings.vue'),
          meta: { 
            requiresPasswordChanged: true,
            title: 'Admin Postavke' 
          }
        }
      ]
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
})

// 🔴 NOVO: Enhanced navigation guard sa PASSWORD CHANGE FLOW
router.beforeEach(async (to, from, next) => {
  console.log('🛡️ Route guard:', {
    to: to.name,
    path: to.path,
    query: to.query,
    meta: to.meta
  })
  
  // 🎯 HANDLE PASSWORD CHANGE REDIRECT FROM VERIFY ENDPOINT
  const hasPasswordChangeRedirect = to.query.requires_password_change === 'true' || 
                                   to.query.initial_setup === 'true'
  const hasToken = to.query.token
  const hasEmail = to.query.email
  
  // 📌 SCENARIO 1: Password change redirect from verification email
  if (hasPasswordChangeRedirect && hasToken && hasEmail) {
    console.log('🔐 PASSWORD CHANGE REDIRECT DETEKTIRAN:', {
      email: to.query.email,
      requires_password_change: to.query.requires_password_change,
      initial_setup: to.query.initial_setup,
      verified: to.query.verified,
      alreadyVerified: to.query.alreadyVerified
    })
    
    try {
      // Spremi token i osnovne podatke
      authHelper.setAuth(to.query.token, {
        email: to.query.email,
        email_verified: to.query.verified === 'true' || to.query.alreadyVerified === 'true',
        requires_password_change: true, // 🔴 Oznaka da treba promijeniti lozinku
        role: 'user' // privremeno
      })
      
      console.log('✅ Auth podaci spremljeni, redirect na change-password...')
      
      // Redirect na change-password sa potrebnim parametrima
      next({
        path: '/change-password',
        query: {
          requires_password_change: 'true',
          initial_setup: to.query.initial_setup || 'true',
          email: to.query.email,
          token: to.query.token
        }
      })
      return
      
    } catch (error) {
      console.error('❌ Password change redirect error:', error)
      authHelper.clearAuth()
      next('/login?error=password_change_failed')
      return
    }
  }
  
  // 🎯 SCENARIO 2: Auto-login without password change required
  const hasAutoLogin = to.query.autoLogin === 'true'
  if (hasAutoLogin && hasToken && hasEmail && !hasPasswordChangeRedirect) {
    console.log('🔐 AUTO-LOGIN DETEKTIRAN (bez password change):', {
      email: to.query.email,
      verified: to.query.verified,
      tokenPreview: to.query.token ? `${to.query.token.substring(0, 20)}...` : 'no token'
    })
    
    try {
      // 1. Spremi token i osnovne podatke
      authHelper.setAuth(to.query.token, {
        email: to.query.email,
        email_verified: to.query.verified === 'true' || to.query.alreadyVerified === 'true',
        role: 'user'
      })
      
      console.log('✅ Token spremljen, verificiram...')
      
      // 2. Pokušaj verificirati sa backendom
      try {
        const verifyResponse = await fetch('http://localhost:8888/api/auth/verify', {
          headers: {
            'Authorization': `Bearer ${to.query.token}`
          }
        })
        
        if (verifyResponse.ok) {
          const data = await verifyResponse.json()
          console.log('✅ Backend verification:', {
            role: data.user.role,
            email: data.user.email,
            verified: data.user.email_verified,
            requires_password_change: data.user.requires_password_change
          })
          
          // Ažuriraj user podatke
          authHelper.setAuth(to.query.token, data.user)
          
          // 🔴 PROVIERI DA LI KORISNIK TREBA PROMIJENITI LOZINKU
          if (data.user.requires_password_change === true) {
            console.log('🔴 User requires password change, redirecting to change-password')
            
            // Očisti URL parametre
            const cleanUrl = window.location.origin + window.location.pathname
            window.history.replaceState({}, document.title, cleanUrl)
            
            // Redirect na change-password
            next('/change-password')
            return
          }
          
          // Očisti URL parametre
          const cleanUrl = window.location.origin + window.location.pathname
          window.history.replaceState({}, document.title, cleanUrl)
          
          // 🎯 REDIRECT OVISNO O ROLE (ako je lozinka već promijenjena)
          if (data.user.role === 'admin') {
            console.log('👑 ADMIN → redirect na /admin')
            next('/admin')
          } else {
            console.log('👤 USER/MANAGER → redirect na /dashboard')
            next('/dashboard')
          }
        } else {
          console.warn('⚠️ Backend verification failed, using default route')
          const cleanUrl = window.location.origin + '/dashboard'
          window.history.replaceState({}, document.title, cleanUrl)
          next('/dashboard')
        }
      } catch (verifyError) {
        console.error('❌ Backend verification error:', verifyError)
        const cleanUrl = window.location.origin + '/dashboard'
        window.history.replaceState({}, document.title, cleanUrl)
        next('/dashboard')
      }
      
      return
      
    } catch (error) {
      console.error('❌ Auto-login processing error:', error)
      authHelper.clearAuth()
      next('/login?error=auto_login_failed')
      return
    }
  }

  // Standardne provjere
  const isAuthenticated = authHelper.isAuthenticated()
  const user = authHelper.getUser()
  const isAdmin = user?.role === 'admin'
  const requiresPasswordChange = user?.requires_password_change === true
  
  console.log('🔐 Auth status:', { 
    isAuthenticated, 
    role: user?.role,
    isAdmin,
    requiresPasswordChange,
    userEmail: user?.email
  })

  // Postavi naslov
  if (to.meta.title) {
    document.title = to.meta.title
  }

  // Handle activation links (bez autoLogin flag-a)
  if (to.query.token && to.query.email && !to.query.autoLogin && to.path !== '/activate') {
    console.log('🔗 Activation link, redirecting to /activate')
    next({
      path: '/activate',
      query: to.query
    })
    return
  }
  
  // 🔴 NOVO: PASSWORD CHANGE ENFORCEMENT
  // Ako korisnik treba promijeniti lozinku, blokiraj pristup svim rutama osim /change-password
  if (isAuthenticated && requiresPasswordChange && to.path !== '/change-password') {
    console.log('🔴 User needs password change, redirecting to /change-password')
    next('/change-password')
    return
  }
  
  // 🔴 NOVO: Blokiraj pristup rutama koje zahtijevaju promijenjenu lozinku
  if (isAuthenticated && to.meta.requiresPasswordChanged && requiresPasswordChange) {
    console.log('🚫 Access denied: Password not changed yet')
    next('/change-password')
    return
  }
  
  // Admin provjera (samo ako je lozinka promijenjena)
  if (to.meta.requiresAdmin && !isAdmin) {
    console.log('🚫 Admin access denied - redirecting to dashboard')
    next('/dashboard')
    return
  }

  // Auth provjera
  if (to.meta.requiresAuth && !isAuthenticated) {
    console.log('🚫 Auth required - redirecting to login')
    next('/login')
    return
  }
  
  // Guest provjera
  if (to.meta.requiresGuest && isAuthenticated) {
    console.log('🔐 Already authenticated - redirecting based on role')
    // Ako treba promijeniti lozinku, pošalji na change-password
    if (requiresPasswordChange) {
      next('/change-password')
    } else {
      next(isAdmin ? '/admin' : '/dashboard')
    }
    return
  }
  
  // Already logged in check za login/register/activate
  if ((to.name === 'Login' || to.name === 'Register' || to.name === 'Activation') && isAuthenticated) {
    console.log('🔐 Already logged in - checking password change')
    // Ako treba promijeniti lozinku, pošalji na change-password
    if (requiresPasswordChange) {
      next('/change-password')
    } else {
      next(isAdmin ? '/admin' : '/dashboard')
    }
    return
  }
  
  // 🔴 NOVO: Allow access to change-password even if requires_password_change = false
  // (za regular password change)
  if (to.path === '/change-password' && isAuthenticated && !requiresPasswordChange && !to.query.requires_password_change) {
    console.log('🔧 Regular password change access allowed')
    next()
    return
  }
  
  next()
})

// 🔴 NOVO: Globalna funkcija za provjeru password change statusa
const checkPasswordChangeStatus = () => {
  const user = authHelper.getUser()
  if (user?.requires_password_change === true) {
    console.log('🔴 Password change required for user:', user.email)
    return true
  }
  return false
}

// Kreiraj aplikaciju
const app = createApp(App)
app.use(createPinia())
app.use(router)

// Dev debug
if (import.meta.env.DEV) {
  // Globalne debug funkcije
  window.clearAuth = () => {
    authHelper.clearAuth()
    console.log('🔐 Auth cleared')
    window.location.reload()
  }
  
  window.debugRoutes = () => {
    const routes = router.getRoutes()
    console.log('🛣️ Available routes:', routes.map(r => ({
      name: r.name,
      path: r.path,
      meta: r.meta
    })))
  }
  
  window.goToRoute = (routeName) => {
    router.push({ name: routeName })
    console.log(`🛣️ Navigating to route: ${routeName}`)
  }
  
  window.simulatePasswordChangeRequired = () => {
    const user = authHelper.getUser()
    if (user) {
      user.requires_password_change = true
      authHelper.setUser(user)
      console.log('🔴 Simulated password change required for:', user.email)
      window.location.reload()
    }
  }
  
  window.clearPasswordChangeFlag = () => {
    const user = authHelper.getUser()
    if (user) {
      user.requires_password_change = false
      authHelper.setUser(user)
      console.log('🟢 Cleared password change flag for:', user.email)
      window.location.reload()
    }
  }
  
  window.checkPasswordChange = checkPasswordChangeStatus
  
  console.log('🔧 Development mode - debug available')
  console.log('   - clearAuth() - očisti auth podatke')
  console.log('   - debugRoutes() - prikaži dostupne rute')
  console.log('   - goToRoute("AdminSettings") - idi na AdminSettings')
  console.log('   - simulatePasswordChangeRequired() - simuliraj password change required')
  console.log('   - clearPasswordChangeFlag() - očisti password change flag')
  console.log('   - checkPasswordChange() - provjeri password change status')
}

app.mount('#app')

console.log('🚀 Vue CRM aplikacija pokrenuta!')
console.log('🔐 Initial auth status:', authHelper.getAuthInfo())

// 🔴 NOVO: Periodic check for password change requirement
setInterval(() => {
  const requiresChange = checkPasswordChangeStatus()
  if (requiresChange && window.location.pathname !== '/change-password') {
    console.log('🔄 Periodic check: Password change required, redirecting...')
    router.push('/change-password')
  }
}, 30000) // Provjeri svakih 30 sekundi