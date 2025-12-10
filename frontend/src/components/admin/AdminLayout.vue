<!-- src/components/admin/AdminLayout.vue -->
<template>
  <div class="admin-layout">
    <!-- Debug Banner (Development Only) -->
    <div v-if="showDebug && isDevelopment" style="background: #dc2626; color: white; padding: 12px 20px; position: fixed; top: 0; left: 0; right: 0; z-index: 10000; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <strong>🔧 ADMIN LAYOUT JE AKTIVAN - DEBUG MODE</strong>
        <div style="font-size: 12px; margin-top: 4px;">
          User: {{ user?.email }} | Role: {{ user?.role }} | Auth: {{ isAuthenticated }} | Admin: {{ isAdmin }}
        </div>
      </div>
      <button @click="showDebug = false" style="background: white; color: #dc2626; border: none; padding: 5px 10px; border-radius: 4px; font-size: 12px; cursor: pointer;">
        Sakrij debug
      </button>
    </div>

    <!-- Auto-Login Success Banner -->
    <div v-if="showAutoLoginSuccess" class="auto-login-banner">
      <div class="banner-content">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
            <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <span class="font-medium">Dobrodošli Admin! 👑</span>
        </div>
        <p class="text-sm">Vaš admin račun <strong>{{ autoLoginEmail }}</strong> je uspješno aktiviran.</p>
        <button @click="showAutoLoginSuccess = false" class="close-btn">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Admin Header -->
    <header class="admin-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="logo">CRM Admin</h1>
          <nav class="main-nav">
            <router-link to="/admin" class="nav-link">Dashboard</router-link>
            <router-link to="/admin/users" class="nav-link">Korisnici</router-link>
            <router-link to="/admin/settings" class="nav-link">Postavke</router-link>
          </nav>
        </div>
        <div class="header-right">
          <div class="user-menu">
            <span class="user-info">{{ user?.email || 'Admin' }}</span>
            <button @click="logout" class="logout-btn" :disabled="loading">
              {{ loading ? 'Odjavljivanje...' : 'Odjava' }}
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="admin-main">
      <aside class="admin-sidebar">
        <nav class="sidebar-nav">
          <router-link 
            to="/admin" 
            class="sidebar-link"
            :class="{ active: $route.name === 'AdminDashboard' }"
          >
            📊 Dashboard
          </router-link>
          <router-link 
            to="/admin/users" 
            class="sidebar-link"
            :class="{ active: $route.name === 'UserManagement' }"
          >
            👥 Upravljanje Korisnicima
          </router-link>
          <router-link 
            to="/admin/users/create" 
            class="sidebar-link"
            :class="{ active: $route.name === 'CreateUser' }"
          >
            ➕ Dodaj Korisnika
          </router-link>
          <router-link 
            to="/admin/settings" 
            class="sidebar-link"
            :class="{ active: $route.name === 'AdminSettings' }"
          >
            ⚙️ Postavke
          </router-link>
        </nav>
      </aside>

      <section class="admin-content">
        <div class="content-header">
          <h2>{{ pageTitle }}</h2>
          <div class="breadcrumb">
            <span>Admin</span>
            <span class="separator">/</span>
            <span class="current">{{ pageTitle }}</span>
          </div>
        </div>

        <div class="content-body">
          <router-view />
        </div>
      </section>
    </main>

    <!-- Loading Overlay -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p>Učitavanje...</p>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { authHelper } from '@/services/api'  // Promijenjeno na @/

export default {
  name: 'AdminLayout',
  setup() {
    const router = useRouter()
    const route = useRoute()
    const loading = ref(false)
    const user = ref(authHelper.getUser())
    const showDebug = ref(true)
    const showAutoLoginSuccess = ref(false)
    const autoLoginEmail = ref('')

    const isDevelopment = import.meta.env.DEV
    const isAuthenticated = computed(() => authHelper.isAuthenticated())
    const isAdmin = computed(() => authHelper.isAdmin())

    const pageTitle = computed(() => {
      const titleMap = {
        'AdminDashboard': 'Admin Dashboard',
        'UserManagement': 'Upravljanje Korisnicima',
        'CreateUser': 'Dodaj Novog Korisnika',
        'EditUser': 'Uredi Korisnika',
        'AdminSettings': 'Admin Postavke'
      }
      return titleMap[route.name] || 'Admin Panel'
    })

    // Handle auto-login success message
    const handleAutoLogin = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search)
        const autoLogin = urlParams.get('autoLogin')
        const token = urlParams.get('token')
        const email = urlParams.get('email')
        const verified = urlParams.get('verified')
        const alreadyVerified = urlParams.get('alreadyVerified')

        console.log('👑 AdminLayout checking auto-login parameters:', { 
          autoLogin, token, email, verified, alreadyVerified
        })

        if (autoLogin === 'true' && token && email) {
          console.log('🔐 Admin auto-login detected for:', email)
          
          // Spremi token i korisničke podatke
          authHelper.setAuth(token, {
            email: email,
            email_verified: verified === 'true' || alreadyVerified === 'true',
            role: 'admin'
          })
          
          autoLoginEmail.value = email
          
          // Očisti URL parametre
          const cleanUrl = window.location.origin + window.location.pathname
          window.history.replaceState({}, document.title, cleanUrl)
          
          // Prikaži success poruku
          showAutoLoginSuccess.value = true
          
          console.log('✅ Admin auto-login successful!')
          
          // Automatski sakrij poruku nakon 5 sekundi
          setTimeout(() => {
            showAutoLoginSuccess.value = false
          }, 5000)
        }
      } catch (error) {
        console.error('❌ Admin auto-login error:', error)
      }
    }

    const logout = async () => {
      try {
        loading.value = true
        authHelper.clearAuth()
        router.push('/login')
      } catch (error) {
        console.error('Greška pri odjavi:', error)
        // Fallback: clear auth and redirect
        authHelper.clearAuth()
        router.push('/login')
      } finally {
        loading.value = false
      }
    }

    // Provjera admin privilegija
    onMounted(() => {
      console.log('🔐 AdminLayout mounted - Auth status:', {
        authenticated: isAuthenticated.value,
        admin: isAdmin.value,
        user: user.value
      })

      // Prvo obradi auto-login
      handleAutoLogin()

      if (!isAuthenticated.value) {
        console.log('🚫 Nije prijavljen, redirect na login')
        router.push('/login')
        return
      }

      if (!isAdmin.value) {
        console.log('🚫 Nije admin, redirect na dashboard')
        router.push('/dashboard')
        return
      }

      console.log('✅ Admin pristup odobren')
    })

    return {
      loading,
      user,
      showDebug,
      showAutoLoginSuccess,
      autoLoginEmail,
      isDevelopment,
      isAuthenticated,
      isAdmin,
      pageTitle,
      logout
    }
  }
}
</script>

<style scoped>
.admin-layout {
  min-height: 100vh;
  background: #f8fafc;
}

.auto-login-banner {
  background: #10b981;
  color: white;
  padding: 12px 20px;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10000;
  display: flex;
  justify-content: space-between;
  align-items: center;
  animation: slideDown 0.5s ease-out;
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
  }
  to {
    transform: translateY(0);
  }
}

.banner-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 16px;
}

.banner-content p {
  margin: 0;
  flex: 1;
}

.close-btn {
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.admin-header {
  background: white;
  border-bottom: 1px solid #e2e8f0;
  padding: 0 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 64px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.logo {
  font-size: 1.5rem;
  font-weight: bold;
  color: #3b82f6;
  margin: 0;
}

.main-nav {
  display: flex;
  gap: 1.5rem;
}

.nav-link {
  text-decoration: none;
  color: #64748b;
  font-weight: 500;
  padding: 0.5rem 0;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.nav-link:hover,
.nav-link.router-link-active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-info {
  color: #64748b;
  font-size: 0.875rem;
}

.logout-btn {
  background: #ef4444;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background 0.2s;
}

.logout-btn:hover:not(:disabled) {
  background: #dc2626;
}

.logout-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.admin-main {
  display: flex;
  min-height: calc(100vh - 64px);
}

.admin-sidebar {
  width: 250px;
  background: white;
  border-right: 1px solid #e2e8f0;
  padding: 1.5rem 0;
  position: sticky;
  top: 64px;
  height: calc(100vh - 64px);
  overflow-y: auto;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0 1rem;
}

.sidebar-link {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  text-decoration: none;
  color: #64748b;
  border-radius: 0.375rem;
  transition: all 0.2s;
  font-weight: 500;
}

.sidebar-link:hover {
  background: #f1f5f9;
  color: #3b82f6;
}

.sidebar-link.active {
  background: #3b82f6;
  color: white;
}

.admin-content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
}

.content-header {
  margin-bottom: 2rem;
}

.content-header h2 {
  font-size: 1.875rem;
  font-weight: bold;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
}

.breadcrumb {
  color: #64748b;
  font-size: 0.875rem;
}

.breadcrumb .separator {
  margin: 0 0.5rem;
}

.breadcrumb .current {
  color: #3b82f6;
  font-weight: 500;
}

.content-body {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  min-height: 400px;
  padding: 2rem;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e2e8f0;
  border-left: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

.loading-overlay p {
  color: #64748b;
  margin: 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .admin-main {
    flex-direction: column;
  }
  
  .admin-sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
    height: auto;
    position: static;
  }
  
  .sidebar-nav {
    flex-direction: row;
    overflow-x: auto;
  }
  
  .admin-content {
    padding: 1rem;
  }
  
  .content-body {
    padding: 1rem;
  }
  
  .header-content {
    flex-direction: column;
    height: auto;
    padding: 1rem 0;
    gap: 1rem;
  }
  
  .main-nav {
    order: -1;
  }
}
</style>