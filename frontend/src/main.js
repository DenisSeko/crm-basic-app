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
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: Dashboard,
      meta: { requiresAuth: true }
    },
    
    // ⭐⭐⭐ DODAJTE ADMIN RUTE OVDE ⭐⭐⭐
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
  console.log('🛡️ Route guard:', to.name)
  
  const isAuthenticated = authHelper.isAuthenticated()
  const user = authHelper.getUser()
  const isAdmin = user?.role === 'admin'
  
  console.log('🔐 Auth status:', { isAuthenticated, isAdmin, user })
  
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
  
  next()
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')

console.log('🚀 Vue app mounted with admin routes!')