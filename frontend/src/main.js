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
import Activation from './components/Activation.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: HomePage
    },
    {
      path: '/login',
      name: 'Login', 
      component: AuthManager,
      props: { initialView: 'login' }
    },
    {
      path: '/register',
      name: 'Register',
      component: AuthManager,
      props: { initialView: 'register' }
    },
    // Activation ruta
    {
      path: '/activate',
      name: 'Activation',
      component: Activation,
      meta: { requiresGuest: true }
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: Dashboard,
      meta: { requiresAuth: true }
    },
    
    // Admin rute
    {
      path: '/admin',
      name: 'Admin',
      component: () => import('./components/admin/AdminLayout.vue'),
      meta: { 
        requiresAuth: true,
        requiresAdmin: true
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
        },
        {
          path: 'settings',
          name: 'AdminSettings',
          component: () => import('./components/admin/AdminSettings.vue'),
          meta: { title: 'Admin Postavke' }
        }
      ]
    },
    
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
})

// Navigation guard
router.beforeEach((to, from, next) => {
  console.log('🛡️ Route guard:', to.name, 'Query:', JSON.stringify(to.query))
  
  // Auto-login handling
  if (to.query.autoLogin === 'true' && to.query.token && to.query.email) {
    console.log('🔐 AUTO-LOGIN DETEKTIRAN', {
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
      
      console.log('✅ Auto-login uspješan')
      
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
  const isAdmin = user?.role === 'admin'
  
  console.log('🔐 Auth status:', { 
    isAuthenticated, 
    isAdmin, 
    user: user ? { email: user.email, verified: user.email_verified } : null 
  })
  
  // Auth provjera
  if (to.meta.requiresAuth && !isAuthenticated) {
    console.log('🚫 Access denied, redirecting to login')
    next('/login')
    return
  }
  
  // Admin provjera
  if (to.meta.requiresAdmin && !isAdmin) {
    console.log('🚫 Admin access denied, redirecting to dashboard')
    next('/dashboard')
    return
  }

  // Guest provjera
  if ((to.name === 'Login' || to.name === 'Register' || to.name === 'Activation') && isAuthenticated) {
    console.log('🔐 Već prijavljen, preusmjeravam na dashboard')
    next('/dashboard')
    return
  }
  
  next()
})

const app = createApp(App)
app.use(createPinia())
app.use(router)

// Jednostavne debug funkcije za development
if (import.meta.env.DEV) {
  window.clearAuth = () => {
    authHelper.clearAuth()
    console.log('🧹 Auth očišćen')
    window.location.reload()
  }

  console.log('🔧 Development mode - debug dostupan:')
  console.log('   - clearAuth() - očisti auth podatke')
}

app.mount('#app')

console.log('🚀 Vue app mounted')