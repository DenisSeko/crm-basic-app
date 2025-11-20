<!-- src/components/admin/AdminLayout.vue -->
<template>
  <div class="admin-layout">
    <!-- Admin Header -->
    <header class="admin-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="logo">CRM Admin</h1>
          <nav class="main-nav">
            <router-link to="/admin" class="nav-link">Dashboard</router-link>
            <router-link to="/admin/users" class="nav-link">Korisnici</router-link>
          </nav>
        </div>
        <div class="header-right">
          <div class="user-menu">
            <span class="user-info">{{ user?.name }} ({{ user?.email }})</span>
            <button @click="logout" class="logout-btn">Odjava</button>
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
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { authHelper, authAPI } from '@/services/api'

export default {
  name: 'AdminLayout',
  setup() {
    const router = useRouter()
    const route = useRoute()
    const loading = ref(false)
    const user = ref(authHelper.getUser())

    const pageTitle = computed(() => {
      const titleMap = {
        'AdminDashboard': 'Admin Dashboard',
        'UserManagement': 'Upravljanje Korisnicima',
        'CreateUser': 'Dodaj Novog Korisnika',
        'EditUser': 'Uredi Korisnika'
      }
      return titleMap[route.name] || 'Admin Panel'
    })

    const logout = async () => {
      try {
        loading.value = true
        await authAPI.logout()
        router.push('/login')
      } catch (error) {
        console.error('Greška pri odjavi:', error)
        authHelper.clearAuth()
        router.push('/login')
      } finally {
        loading.value = false
      }
    }

    // Provjera admin privilegija
    onMounted(() => {
      if (!authHelper.isAuthenticated() || !authHelper.isAdmin()) {
        router.push('/dashboard')
      }
    })

    return {
      loading,
      user,
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

.admin-header {
  background: white;
  border-bottom: 1px solid #e2e8f0;
  padding: 0 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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

.logout-btn:hover {
  background: #dc2626;
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
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
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
  }
  
  .sidebar-nav {
    flex-direction: row;
    overflow-x: auto;
  }
  
  .admin-content {
    padding: 1rem;
  }
}
</style>