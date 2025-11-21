<!-- src/components/admin/UserManagement.vue -->
<template>
  <div class="user-management">
    <!-- Header Section -->
    <div class="page-header">
      <h1>Upravljanje Korisnicima</h1>
      <p>Pregledajte i upravljajte korisnicima CRM sustava</p>
    </div>

    <!-- Controls Section -->
    <div class="controls-section">
      <div class="search-filter">
        <div class="search-box">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Pretraži korisnike..."
            class="search-input"
          />
          <span class="search-icon">🔍</span>
        </div>
        
        <div class="filter-controls">
          <select v-model="statusFilter" class="filter-select">
            <option value="">Svi statusi</option>
            <option value="active">Aktivni</option>
            <option value="pending">Na čekanju</option>
            <option value="inactive">Neaktivni</option>
          </select>
          
          <select v-model="roleFilter" class="filter-select">
            <option value="">Sve uloge</option>
            <option value="admin">Admin</option>
            <option value="user">Korisnik</option>
          </select>
        </div>
      </div>

      <div class="action-buttons">
        <router-link to="/admin/users/create" class="btn-primary">
          ➕ Dodaj Korisnika
        </router-link>
        <button @click="refreshUsers" class="btn-secondary" :disabled="loading">
          🔄 {{ loading ? 'Učitavam...' : 'Osvježi' }}
        </button>
      </div>
    </div>

    <!-- Users Table -->
    <div class="table-container">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Učitavam korisnike...</p>
      </div>

      <div v-else-if="paginatedUsers.length === 0" class="empty-state">
        <div class="empty-icon">👥</div>
        <h3>Nema pronađenih korisnika</h3>
        <p>Pokušajte promijeniti filtere ili dodajte novog korisnika.</p>
        <router-link to="/admin/users/create" class="btn-primary">
          ➕ Dodaj Prvog Korisnika
        </router-link>
      </div>

      <div v-else class="table-wrapper">
        <table class="users-table">
          <thead>
            <tr>
              <th @click="handleSort('id')" class="sortable">
                ID
                <span v-if="sortField === 'id'" class="sort-indicator">
                  {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
              </th>
              <th @click="handleSort('name')" class="sortable">
                Ime i Prezime
                <span v-if="sortField === 'name'" class="sort-indicator">
                  {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
              </th>
              <th @click="handleSort('email')" class="sortable">
                Email
                <span v-if="sortField === 'email'" class="sort-indicator">
                  {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
              </th>
              <th @click="handleSort('role')" class="sortable">
                Uloga
                <span v-if="sortField === 'role'" class="sort-indicator">
                  {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
              </th>
              <th @click="handleSort('status')" class="sortable">
                Status
                <span v-if="sortField === 'status'" class="sort-indicator">
                  {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
              </th>
              <th @click="handleSort('created_at')" class="sortable">
                Datum Registracije
                <span v-if="sortField === 'created_at'" class="sort-indicator">
                  {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
              </th>
              <th>Akcije</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in paginatedUsers" :key="user.id" class="user-row">
              <td class="user-id">{{ user.id }}</td>
              <td class="user-name">
                <div class="user-avatar">
                  {{ getUserInitials(user) }}
                </div>
                {{ user.first_name }} {{ user.last_name }}
              </td>
              <td class="user-email">{{ user.email }}</td>
              <td class="user-role">
                <span :class="['role-badge', user.role]">
                  {{ user.role === 'admin' ? 'Admin' : 'Korisnik' }}
                </span>
              </td>
              <td class="user-status">
                <span :class="['status-badge', user.status]">
                  {{ getUserStatusText(user.status) }}
                </span>
              </td>
              <td class="user-date">
                {{ formatDate(user.created_at) }}
              </td>
              <td class="user-actions">
                <router-link 
                  :to="`/admin/users/${user.id}/edit`" 
                  class="btn-edit"
                  title="Uredi korisnika"
                >
                  ✏️
                </router-link>
                <button 
                  @click="toggleUserStatus(user)" 
                  :class="['btn-status', user.status]"
                  :title="user.status === 'active' ? 'Deaktiviraj' : 'Aktiviraj'"
                >
                  {{ user.status === 'active' ? '⏸️' : '▶️' }}
                </button>
                <button 
                  @click="confirmDeleteUser(user)" 
                  class="btn-delete"
                  title="Obriši korisnika"
                >
                  🗑️
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="filteredUsers.length > 0" class="pagination">
        <button 
          @click="prevPage" 
          :disabled="currentPage === 1" 
          class="pagination-btn"
        >
          ← Prethodna
        </button>
        
        <span class="pagination-info">
          Stranica {{ currentPage }} od {{ totalPages }}
        </span>
        
        <button 
          @click="nextPage" 
          :disabled="currentPage === totalPages" 
          class="pagination-btn"
        >
          Sljedeća →
        </button>
      </div>
    </div>

    <!-- Stats Summary -->
    <div class="stats-summary">
      <div class="stat-item">
        <span class="stat-number">{{ totalUsers }}</span>
        <span class="stat-label">Ukupno Korisnika</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">{{ activeUsers }}</span>
        <span class="stat-label">Aktivnih</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">{{ pendingUsers }}</span>
        <span class="stat-label">Na Čekanju</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">{{ adminUsers }}</span>
        <span class="stat-label">Administratora</span>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { adminAPI, authHelper } from '@/services/api'

export default {
  name: 'UserManagement',
  setup() {
    const router = useRouter()

    // State
    const users = ref([])
    const loading = ref(false)
    const searchQuery = ref('')
    const statusFilter = ref('')
    const roleFilter = ref('')
    const sortField = ref('id')
    const sortDirection = ref('asc')
    const currentPage = ref(1)
    const itemsPerPage = ref(10)

    // Computed properties
    const filteredUsers = computed(() => {
      let filtered = users.value

      // Search filter
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        filtered = filtered.filter(user => 
          user.first_name.toLowerCase().includes(query) ||
          user.last_name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
        )
      }

      // Status filter
      if (statusFilter.value) {
        filtered = filtered.filter(user => user.status === statusFilter.value)
      }

      // Role filter
      if (roleFilter.value) {
        filtered = filtered.filter(user => user.role === roleFilter.value)
      }

      return filtered
    })

    const sortedUsers = computed(() => {
      const sorted = [...filteredUsers.value]
      
      return sorted.sort((a, b) => {
        let aValue = a[sortField.value]
        let bValue = b[sortField.value]

        // Handle special cases
        if (sortField.value === 'name') {
          aValue = `${a.first_name} ${a.last_name}`
          bValue = `${b.first_name} ${b.last_name}`
        }

        if (aValue < bValue) return sortDirection.value === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection.value === 'asc' ? 1 : -1
        return 0
      })
    })

    const paginatedUsers = computed(() => {
      const start = (currentPage.value - 1) * itemsPerPage.value
      const end = start + itemsPerPage.value
      return sortedUsers.value.slice(start, end)
    })

    const totalPages = computed(() => {
      return Math.ceil(filteredUsers.value.length / itemsPerPage.value)
    })

    // Stats
    const totalUsers = computed(() => users.value.length)
    const activeUsers = computed(() => users.value.filter(u => u.status === 'active').length)
    const pendingUsers = computed(() => users.value.filter(u => u.status === 'pending').length)
    const adminUsers = computed(() => users.value.filter(u => u.role === 'admin').length)

    // Methods
    const loadUsers = async () => {
      try {
        loading.value = true
        console.log('🔄 Učitavam korisnike...')

        // Simuliramo API poziv - zamijenite sa stvarnim adminAPI.getUsers()
        await new Promise(resolve => setTimeout(resolve, 1500))

        // Mock podaci - zamijenite sa stvarnim API odgovorom
        users.value = [
          {
            id: 1,
            first_name: 'Admin',
            last_name: 'Korisnik',
            email: 'admin@crm.com',
            role: 'admin',
            status: 'active',
            created_at: new Date('2024-01-15')
          },
          {
            id: 2,
            first_name: 'Marko',
            last_name: 'Marković',
            email: 'marko@tvrtka.com',
            role: 'user',
            status: 'active',
            created_at: new Date('2024-02-20')
          },
          {
            id: 3,
            first_name: 'Ana',
            last_name: 'Anić',
            email: 'ana.anic@mail.com',
            role: 'user',
            status: 'pending',
            created_at: new Date('2024-03-10')
          },
          {
            id: 4,
            first_name: 'Ivan',
            last_name: 'Ivić',
            email: 'ivan.ivic@firma.hr',
            role: 'user',
            status: 'active',
            created_at: new Date('2024-03-15')
          },
          {
            id: 5,
            first_name: 'Petra',
            last_name: 'Petrić',
            email: 'petra@novafirma.com',
            role: 'user',
            status: 'inactive',
            created_at: new Date('2024-03-18')
          }
        ]

        console.log('✅ Korisnici učitani:', users.value.length)
      } catch (error) {
        console.error('❌ Greška pri učitavanju korisnika:', error)
        showError('Došlo je do greške pri učitavanju korisnika')
      } finally {
        loading.value = false
      }
    }

    const refreshUsers = () => {
      currentPage.value = 1
      loadUsers()
    }

    const handleSort = (field) => {
      if (sortField.value === field) {
        sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
      } else {
        sortField.value = field
        sortDirection.value = 'asc'
      }
    }

    const toggleUserStatus = async (user) => {
      try {
        console.log(`🔄 Mijenjam status korisnika ${user.id}`)
        
        // Simuliramo API poziv
        await new Promise(resolve => setTimeout(resolve, 500))
        
        user.status = user.status === 'active' ? 'inactive' : 'active'
        console.log(`✅ Status korisnika ${user.id} promijenjen na: ${user.status}`)
        
      } catch (error) {
        console.error('❌ Greška pri promjeni statusa:', error)
        showError('Došlo je do greške pri promjeni statusa korisnika')
      }
    }

    const confirmDeleteUser = (user) => {
      if (confirm(`Jeste li sigurni da želite obrisati korisnika ${user.first_name} ${user.last_name}?`)) {
        deleteUser(user)
      }
    }

    const deleteUser = async (user) => {
      try {
        console.log(`🗑️ Brišem korisnika ${user.id}`)
        
        // Simuliramo API poziv
        await new Promise(resolve => setTimeout(resolve, 500))
        
        users.value = users.value.filter(u => u.id !== user.id)
        console.log(`✅ Korisnik ${user.id} obrisan`)
        
      } catch (error) {
        console.error('❌ Greška pri brisanju korisnika:', error)
        showError('Došlo je do greške pri brisanju korisnika')
      }
    }

    const getUserInitials = (user) => {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    }

    const getUserStatusText = (status) => {
      const statusMap = {
        'active': 'Aktivan',
        'pending': 'Na čekanju',
        'inactive': 'Neaktivan'
      }
      return statusMap[status] || status
    }

    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('hr-HR')
    }

    const nextPage = () => {
      if (currentPage.value < totalPages.value) {
        currentPage.value++
      }
    }

    const prevPage = () => {
      if (currentPage.value > 1) {
        currentPage.value--
      }
    }

    const showError = (message) => {
      console.error('❌ Error:', message)
      // Možete dodati toast notifikaciju ovdje
      alert(message)
    }

    // Lifecycle
    onMounted(() => {
      console.log('🚀 UserManagement mounted')
      loadUsers()
    })

    return {
      // State
      users,
      loading,
      searchQuery,
      statusFilter,
      roleFilter,
      sortField,
      sortDirection,
      currentPage,
      itemsPerPage,
      
      // Computed
      filteredUsers,
      paginatedUsers,
      totalPages,
      totalUsers,
      activeUsers,
      pendingUsers,
      adminUsers,
      
      // Methods
      loadUsers,
      refreshUsers,
      handleSort,
      toggleUserStatus,
      confirmDeleteUser,
      deleteUser,
      getUserInitials,
      getUserStatusText,
      formatDate,
      nextPage,
      prevPage
    }
  }
}
</script>

<style scoped>
/* CSS ostaje isti kao u prethodnoj verziji */
.user-management {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 2rem;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
}

.page-header p {
  color: #64748b;
  margin: 0;
}

.controls-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 2rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.search-filter {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  min-width: 300px;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 1rem;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
}

.filter-controls {
  display: flex;
  gap: 0.5rem;
}

.filter-select {
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  background: white;
  min-width: 120px;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.btn-primary {
  background: #3b82f6;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  text-decoration: none;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  background: #f8fafc;
  color: #475569;
  padding: 0.75rem 1.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover:not(:disabled) {
  background: #f1f5f9;
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.table-container {
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-bottom: 2rem;
}

.loading-state,
.empty-state {
  padding: 3rem 2rem;
  text-align: center;
  color: #64748b;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e2e8f0;
  border-left: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem auto;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state h3 {
  color: #374151;
  margin: 0 0 0.5rem 0;
}

.table-wrapper {
  overflow-x: auto;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
}

.users-table th {
  background: #f8fafc;
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
}

.users-table td {
  padding: 1rem;
  border-bottom: 1px solid #f3f4f6;
}

.sortable {
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}

.sortable:hover {
  background: #f1f5f9;
}

.sort-indicator {
  margin-left: 0.25rem;
  font-weight: bold;
}

.user-row:hover {
  background: #f8fafc;
}

.user-id {
  font-family: 'Courier New', monospace;
  color: #6b7280;
  font-size: 0.875rem;
}

.user-name {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 500;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #3b82f6;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
}

.user-email {
  color: #6b7280;
}

.role-badge,
.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.role-badge.admin {
  background: #fef3c7;
  color: #92400e;
}

.role-badge.user {
  background: #dbeafe;
  color: #1e40af;
}

.status-badge.active {
  background: #dcfce7;
  color: #166534;
}

.status-badge.pending {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.inactive {
  background: #f3f4f6;
  color: #6b7280;
}

.user-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-edit,
.btn-status,
.btn-delete {
  padding: 0.5rem;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1rem;
}

.btn-edit {
  background: #dbeafe;
  color: #1e40af;
}

.btn-edit:hover {
  background: #bfdbfe;
}

.btn-status {
  background: #f0f9ff;
  color: #0369a1;
}

.btn-status:hover {
  background: #e0f2fe;
}

.btn-delete {
  background: #fef2f2;
  color: #dc2626;
}

.btn-delete:hover {
  background: #fecaca;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #f3f4f6;
}

.pagination-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  background: #f3f4f6;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  color: #6b7280;
  font-weight: 500;
}

.stats-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 2rem;
}

.stat-item {
  background: white;
  padding: 1.5rem;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 2rem;
  font-weight: bold;
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.stat-label {
  color: #64748b;
  font-size: 0.875rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .user-management {
    padding: 1rem;
  }
  
  .controls-section {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-filter {
    flex-direction: column;
  }
  
  .search-box {
    min-width: auto;
  }
  
  .action-buttons {
    justify-content: stretch;
  }
  
  .btn-primary,
  .btn-secondary {
    flex: 1;
    text-align: center;
  }
  
  .stats-summary {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .user-actions {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .stats-summary {
    grid-template-columns: 1fr;
  }
  
  .users-table {
    font-size: 0.875rem;
  }
  
  .users-table th,
  .users-table td {
    padding: 0.75rem 0.5rem;
  }
}
</style>