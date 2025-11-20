<!-- src/components/admin/AdminDashboard.vue -->
<template>
  <div class="admin-dashboard">
    <div class="welcome-section">
      <h1>Dobrodošli u Admin Panel</h1>
      <p>Upravljajte korisnicima i postavkama CRM sustava</p>
    </div>

    <!-- Statistics Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-content">
          <h3>{{ stats.totalUsers }}</h3>
          <p>Ukupno Korisnika</p>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-content">
          <h3>{{ stats.activeUsers }}</h3>
          <p>Aktivnih Korisnika</p>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">⏳</div>
        <div class="stat-content">
          <h3>{{ stats.pendingUsers }}</h3>
          <p>Na Čekanju</p>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">📧</div>
        <div class="stat-content">
          <h3>{{ stats.pendingActivations }}</h3>
          <p>Za Aktivaciju</p>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions">
      <h2>Brze Akcije</h2>
      <div class="actions-grid">
        <router-link to="/admin/users/create" class="action-card">
          <div class="action-icon">➕</div>
          <h3>Dodaj Korisnika</h3>
          <p>Kreiraj novog korisnika u sustavu</p>
        </router-link>
        
        <router-link to="/admin/users" class="action-card">
          <div class="action-icon">👥</div>
          <h3>Pregled Korisnika</h3>
          <p>Upravljaj postojećim korisnicima</p>
        </router-link>
        
        <div class="action-card" @click="refreshData">
          <div class="action-icon">🔄</div>
          <h3>Osvježi Podatke</h3>
          <p>Učitaj najnovije podatke</p>
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="recent-activity">
      <h2>Nedavne Aktivnosti</h2>
      <div class="activity-list">
        <div v-if="recentActivity.length === 0" class="empty-state">
          <p>Nema nedavnih aktivnosti</p>
        </div>
        <div v-else class="activity-item" v-for="activity in recentActivity" :key="activity.id">
          <div class="activity-icon">📋</div>
          <div class="activity-content">
            <p class="activity-text">{{ activity.description }}</p>
            <span class="activity-time">{{ formatTime(activity.timestamp) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { adminAPI } from '@/services/api'

export default {
  name: 'AdminDashboard',
  setup() {
    const stats = ref({
      totalUsers: 0,
      activeUsers: 0,
      pendingUsers: 0,
      pendingActivations: 0
    })

    const recentActivity = ref([])
    const loading = ref(false)

    const loadDashboardData = async () => {
      try {
        loading.value = true
        // Ovdje ćemo kasnije dodati prave API pozive
        // Za sada koristimo mock podatke
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        stats.value = {
          totalUsers: 24,
          activeUsers: 18,
          pendingUsers: 6,
          pendingActivations: 3
        }

        recentActivity.value = [
          {
            id: 1,
            description: 'Korisnik Marko Marković je kreiran',
            timestamp: new Date(Date.now() - 1000 * 60 * 5) // 5 minuta prije
          },
          {
            id: 2,
            description: 'Korisnik Ana Anić je aktivirao račun',
            timestamp: new Date(Date.now() - 1000 * 60 * 30) // 30 minuta prije
          },
          {
            id: 3,
            description: 'Novi korisnik je dodan - petra@tvrtka.com',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) // 2 sata prije
          }
        ]
      } catch (error) {
        console.error('Greška pri učitavanju dashboard podataka:', error)
      } finally {
        loading.value = false
      }
    }

    const refreshData = () => {
      loadDashboardData()
    }

    const formatTime = (timestamp) => {
      const now = new Date()
      const diff = now - timestamp
      const minutes = Math.floor(diff / (1000 * 60))
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))

      if (minutes < 60) return `prije ${minutes} min`
      if (hours < 24) return `prije ${hours} h`
      return `prije ${days} dana`
    }

    onMounted(() => {
      loadDashboardData()
    })

    return {
      stats,
      recentActivity,
      loading,
      refreshData,
      formatTime
    }
  }
}
</script>

<style scoped>
.admin-dashboard {
  padding: 2rem;
}

.welcome-section {
  text-align: center;
  margin-bottom: 3rem;
}

.welcome-section h1 {
  font-size: 2.25rem;
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.welcome-section p {
  font-size: 1.125rem;
  color: #64748b;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.stat-card {
  background: white;
  padding: 1.5rem;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
  border-left: 4px solid #3b82f6;
}

.stat-icon {
  font-size: 2rem;
}

.stat-content h3 {
  font-size: 2rem;
  font-weight: bold;
  color: #1e293b;
  margin: 0;
}

.stat-content p {
  color: #64748b;
  margin: 0;
}

.quick-actions {
  margin-bottom: 3rem;
}

.quick-actions h2 {
  font-size: 1.5rem;
  color: #1e293b;
  margin-bottom: 1.5rem;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.action-card {
  background: white;
  padding: 2rem;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  text-decoration: none;
  color: inherit;
  transition: all 0.2s;
  cursor: pointer;
  border: 2px solid transparent;
}

.action-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-color: #3b82f6;
}

.action-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.action-card h3 {
  font-size: 1.25rem;
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.action-card p {
  color: #64748b;
  margin: 0;
}

.recent-activity h2 {
  font-size: 1.5rem;
  color: #1e293b;
  margin-bottom: 1.5rem;
}

.activity-list {
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #f1f5f9;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-icon {
  font-size: 1.25rem;
}

.activity-content {
  flex: 1;
}

.activity-text {
  color: #1e293b;
  margin: 0 0 0.25rem 0;
}

.activity-time {
  color: #64748b;
  font-size: 0.875rem;
}

.empty-state {
  padding: 3rem;
  text-align: center;
  color: #64748b;
}

/* Responsive */
@media (max-width: 768px) {
  .admin-dashboard {
    padding: 1rem;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .actions-grid {
    grid-template-columns: 1fr;
  }
}
</style>