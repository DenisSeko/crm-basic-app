<!-- src/components/admin/UserManagement.vue -->
<template>
  <div class="user-management">
    <!-- Header with Actions -->
    <div class="page-header">
      <div class="header-content">
        <h1>Upravljanje Korisnicima</h1>
        <p>Pregledajte i upravljajte korisnicima CRM sustava</p>
      </div>
      <div class="header-actions">
        <router-link to="/admin/users/create" class="btn-primary">
          ➕ Dodaj Korisnika
        </router-link>
        <button @click="refreshUsers" class="btn-secondary" :disabled="loading">
          🔄 Osvježi
        </button>
      </div>
    </div>

    <!-- Filters and Search -->
    <div class="filters-section">
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Pretraži korisnike po imenu, emailu..."
          class="search-input"
          @input="handleSearch"
        />
        <div class="search-icon">🔍</div>
      </div>

      <div class="filter-controls">
        <select v-model="statusFilter" @change="applyFilters" class="filter-select">
          <option value="">Svi statusi</option>
          <option value="active">Aktivni</option>
          <option value="pending">Na čekanju</option>
          <option value="inactive">Neaktivni</option>
        </select>

        <select v-model="roleFilter" @change="applyFilters" class="filter-select">
          <option value="">Sve uloge</option>
          <option value="admin">Administrator</option>
          <option value="manager">Manager</option>
          <option value="user">Korisnik</option>
        </select>
      </div>
    </div>

    <!-- Users Table -->
    <div class="users-table-container">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Učitavanje korisnika...</p>
      </div>

      <div v-else-if="filteredUsers.length === 0" class="empty-state">
        <div class="empty-icon">👥</div>
        <h3>Nema pronađenih korisnika</h3>
        <p>Promijenite filtere ili dodajte novog korisnika</p>
        <router-link to="/admin/users/create" class="btn-primary">
          Dodaj Prvog Korisnika
        </router-link>
      </div>

      <table v-else class="users-table">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                :checked="allSelected"
                @change="toggleSelectAll"
                class="checkbox"
              />
            </th>
            <th @click="sortUsers('name')" class="sortable">
              Korisnik
              <span class="sort-indicator">{{ sortIndicator('name') }}</span>
            </th>
            <th @click="sortUsers('email')" class="sortable">
              Email
              <span class="sort-indicator">{{ sortIndicator('email') }}</span>
            </th>
            <th @click="sortUsers('role')" class="sortable">
              Uloga
              <span class="sort-indicator">{{ sortIndicator('role') }}</span>
            </th>
            <th @click="sortUsers('status')" class="sortable">
              Status
              <span class="sort-indicator">{{ sortIndicator('status') }}</span>
            </th>
            <th @click="sortUsers('created_at')" class="sortable">
              Datum
              <span class="sort-indicator">{{ sortIndicator('created_at') }}</span>
            </th>
            <th>Akcije</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in paginatedUsers" :key="user.id" :class="{ selected: selectedUsers.includes(user.id) }">
            <td>
              <input
                type="checkbox"
                :checked="selectedUsers.includes(user.id)"
                @change="toggleUserSelection(user.id)"
                class="checkbox"
              />
            </td>
            <td>
              <div class="user-info">
                <div class="user-avatar">
                  {{ getUserInitials(user.name) }}
                </div>
                <div class="user-details">
                  <strong class="user-name">{{ user.name }}</strong>
                  <span class="user-company" v-if="user.company">{{ user.company }}</span>
                </div>
              </div>
            </td>
            <td class="user-email">
              {{ user.email }}
            </td>
            <td>
              <span class="role-badge" :class="user.role">
                {{ formatRole(user.role) }}
              </span>
            </td>
            <td>
              <span class="status-badge" :class="user.status">
                {{ formatStatus(user.status) }}
              </span>
            </td>
            <td class="user-date">
              {{ formatDate(user.created_at) }}
            </td>
            <td>
              <div class="action-buttons">
                <button
                  @click="editUser(user)"
                  class="btn-action edit"
                  title="Uredi korisnika"
                >
                  ✏️
                </button>
                <button
                  v-if="user.status === 'pending'"
                  @click="resendActivation(user)"
                  class="btn-action resend"
                  title="Pošalji aktivacijski email"
                >
                  📧
                </button>
                <button
                  @click="viewUser(user)"
                  class="btn-action view"
                  title="Pregledaj detalje"
                >
                  👁️
                </button>
                <button
                  v-if="user.id !== currentUser?.id"
                  @click="confirmDelete(user)"
                  class="btn-action delete"
                  title="Obriši korisnika"
                >
                  🗑️
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="filteredUsers.length > 0" class="pagination">
      <div class="pagination-info">
        Prikazano {{ showingStart }}-{{ showingEnd }} od {{ filteredUsers.length }} korisnika
      </div>
      <div class="pagination-controls">
        <button
          @click="prevPage"
          :disabled="currentPage === 1"
          class="pagination-btn"
        >
          ← Prethodna
        </button>
        <span class="pagination-numbers">
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

    <!-- Bulk Actions -->
    <div v-if="selectedUsers.length > 0" class="bulk-actions">
      <div class="bulk-info">
        Odabrano {{ selectedUsers.length }} korisnika
      </div>
      <div class="bulk-buttons">
        <button @click="bulkResendActivation" class="btn-secondary">
          📧 Pošalji aktivaciju
        </button>
        <button @click="bulkDeactivate" class="btn-secondary">
          ⏸️ Deaktiviraj
        </button>
        <button @click="bulkDelete" class="btn-danger">
          🗑️ Obriši odabrane
        </button>
        <button @click="clearSelection" class="btn-outline">
          ❌ Očisti odabir
        </button>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h3>Potvrdi brisanje</h3>
          <button @click="closeModal" class="modal-close">×</button>
        </div>
        <div class="modal-body">
          <p>Jeste li sigurni da želite obrisati korisnika <strong>{{ userToDelete?.name }}</strong>?</p>
          <p class="warning-text">Ova akcija se ne može poništiti!</p>
        </div>
        <div class="modal-actions">
          <button @click="closeModal" class="btn-outline">Odustani</button>
          <button @click="deleteUser" class="btn-danger">Obriši korisnika</button>
        </div>
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
    const users = ref([])
    const loading = ref(false)
    const searchQuery = ref('')
    const statusFilter = ref('')
    const roleFilter = ref('')
    const sortBy = ref('created_at')
    const sortOrder = ref('desc')
    const selectedUsers = ref([])
    const currentPage = ref(1)
    const itemsPerPage = ref(10)
    const showDeleteModal = ref(false)
    const userToDelete = ref(null)

    const currentUser = ref(authHelper.getUser())

    // Load users from API
    const loadUsers = async () => {
      try {
        loading.value = true
        // TODO: Zamijeniti sa pravim API pozivom
        // const response = await adminAPI.getUsers()
        // users.value = response.data
        
        // Mock podaci za sada
        await new Promise(resolve => setTimeout(resolve, 1000))
        users.value = [
          {
            id: 1,
            name: 'Marko Marković',
            email: 'marko@tvrtka.com',
            role: 'admin',
            status: 'active',
            company: 'IT Odjel',
            created_at: new Date('2024-01-15'),
            email_verified: true
          },
          {
            id: 2,
            name: 'Ana Anić',
            email: 'ana@tvrtka.com',
            role: 'manager',
            status: 'active',
            company: 'Prodaja',
            created_at: new Date('2024-01-20'),
            email_verified: true
          },
          {
            id: 3,
            name: 'Ivan Ivić',
            email: 'ivan@tvrtka.com',
            role: 'user',
            status: 'pending',
            company: 'Marketing',
            created_at: new Date('2024-02-01'),
            email_verified: false
          },
          {
            id: 4,
            name: 'Petra Petrić',
            email: 'petra@tvrtka.com',
            role: 'user',
            status: 'pending',
            company: 'Podrška',
            created_at: new Date('2024-02-05'),
            email_verified: false
          },
          {
            id: 5,
            name: 'Josip Jović',
            email: 'josip@tvrtka.com',
            role: 'user',
            status: 'inactive',
            company: 'Prodaja',
            created_at: new Date('2024-01-10'),
            email_verified: true
          }
        ]
      } catch (error) {
        console.error('Greška pri učitavanju korisnika:', error)
        alert('Došlo je do greške pri učitavanju korisnika: ' + error.userMessage)
      } finally {
        loading.value = false
      }
    }

    // Computed properties
    const filteredUsers = computed(() => {
      let filtered = users.value

      // Apply search filter
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        filtered = filtered.filter(user => 
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          user.company?.toLowerCase().includes(query)
        )
      }

      // Apply status filter
      if (statusFilter.value) {
        filtered = filtered.filter(user => user.status === statusFilter.value)
      }

      // Apply role filter
      if (roleFilter.value) {
        filtered = filtered.filter(user => user.role === roleFilter.value)
      }

      // Apply sorting
      filtered.sort((a, b) => {
        let aValue = a[sortBy.value]
        let bValue = b[sortBy.value]

        if (sortBy.value === 'created_at') {
          aValue = new Date(aValue)
          bValue = new Date(bValue)
        }

        if (aValue < bValue) return sortOrder.value === 'asc' ? -1 : 1
        if (aValue > bValue) return sortOrder.value === 'asc' ? 1 : -1
        return 0
      })

      return filtered
    })

    const paginatedUsers = computed(() => {
      const start = (currentPage.value - 1) * itemsPerPage.value
      const end = start + itemsPerPage.value
      return filteredUsers.value.slice(start, end)
    })

    const totalPages = computed(() => 
      Math.ceil(filteredUsers.value.length / itemsPerPage.value)
    )

    const showingStart = computed(() => 
      (currentPage.value - 1) * itemsPerPage.value + 1
    )

    const showingEnd = computed(() => 
      Math.min(currentPage.value * itemsPerPage.value, filteredUsers.value.length)
    )

    const allSelected = computed(() => 
      paginatedUsers.value.length > 0 && 
      paginatedUsers.value.every(user => selectedUsers.value.includes(user.id))
    )

    // Methods
    const sortUsers = (column) => {
      if (sortBy.value === column) {
        sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
      } else {
        sortBy.value = column
        sortOrder.value = 'asc'
      }
    }

    const sortIndicator = (column) => {
      if (sortBy.value !== column) return ''
      return sortOrder.value === 'asc' ? '↑' : '↓'
    }

    const toggleSelectAll = () => {
      if (allSelected.value) {
        selectedUsers.value = selectedUsers.value.filter(
          id => !paginatedUsers.value.some(user => user.id === id)
        )
      } else {
        const newSelection = paginatedUsers.value
          .filter(user => !selectedUsers.value.includes(user.id))
          .map(user => user.id)
        selectedUsers.value = [...selectedUsers.value, ...newSelection]
      }
    }

    const toggleUserSelection = (userId) => {
      const index = selectedUsers.value.indexOf(userId)
      if (index > -1) {
        selectedUsers.value.splice(index, 1)
      } else {
        selectedUsers.value.push(userId)
      }
    }

    const clearSelection = () => {
      selectedUsers.value = []
    }

    const handleSearch = () => {
      currentPage.value = 1
    }

    const applyFilters = () => {
      currentPage.value = 1
    }

    const prevPage = () => {
      if (currentPage.value > 1) currentPage.value--
    }

    const nextPage = () => {
      if (currentPage.value < totalPages.value) currentPage.value++
    }

    const refreshUsers = () => {
      loadUsers()
      clearSelection()
    }

    const editUser = (user) => {
      router.push(`/admin/users/${user.id}/edit`)
    }

    const viewUser = (user) => {
      // TODO: Implement view user details
      console.log('View user:', user)
      alert(`Pregled korisnika: ${user.name}\nEmail: ${user.email}\nUloga: ${user.role}`)
    }

    const resendActivation = async (user) => {
      try {
        // TODO: Implement API call
        // await adminAPI.resendActivationEmail(user.id)
        alert(`Aktivacijski email je poslan na: ${user.email}`)
      } catch (error) {
        alert('Greška pri slanju aktivacijskog emaila: ' + error.userMessage)
      }
    }

    const confirmDelete = (user) => {
      userToDelete.value = user
      showDeleteModal.value = true
    }

    const closeModal = () => {
      showDeleteModal.value = false
      userToDelete.value = null
    }

    const deleteUser = async () => {
      try {
        // TODO: Implement API call
        // await adminAPI.deleteUser(userToDelete.value.id)
        users.value = users.value.filter(u => u.id !== userToDelete.value.id)
        closeModal()
        alert('Korisnik je uspješno obrisan')
      } catch (error) {
        alert('Greška pri brisanju korisnika: ' + error.userMessage)
      }
    }

    const bulkResendActivation = async () => {
      try {
        // TODO: Implement bulk API call
        alert(`Aktivacijski email poslan na ${selectedUsers.value.length} korisnika`)
        clearSelection()
      } catch (error) {
        alert('Greška pri slanju aktivacijskih emailova: ' + error.userMessage)
      }
    }

    const bulkDeactivate = async () => {
      try {
        // TODO: Implement bulk API call
        alert(`${selectedUsers.value.length} korisnika deaktivirano`)
        clearSelection()
      } catch (error) {
        alert('Greška pri deaktivaciji korisnika: ' + error.userMessage)
      }
    }

    const bulkDelete = async () => {
      if (confirm(`Jeste li sigurni da želite obrisati ${selectedUsers.value.length} korisnika?`)) {
        try {
          // TODO: Implement bulk API call
          users.value = users.value.filter(u => !selectedUsers.value.includes(u.id))
          alert(`${selectedUsers.value.length} korisnika obrisano`)
          clearSelection()
        } catch (error) {
          alert('Greška pri brisanju korisnika: ' + error.userMessage)
        }
      }
    }

    // Helper methods
    const getUserInitials = (name) => {
      return name
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .substring(0, 2)
    }

    const formatRole = (role) => {
      const roles = {
        admin: 'Administrator',
        manager: 'Manager',
        user: 'Korisnik'
      }
      return roles[role] || role
    }

    const formatStatus = (status) => {
      const statuses = {
        active: 'Aktivan',
        pending: 'Na čekanju',
        inactive: 'Neaktivan'
      }
      return statuses[status] || status
    }

    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('hr-HR')
    }

    // Lifecycle
    onMounted(() => {
      loadUsers()
    })

    return {
      users: filteredUsers,
      paginatedUsers,
      loading,
      searchQuery,
      statusFilter,
      roleFilter,
      selectedUsers,
      currentPage,
      totalPages,
      showingStart,
      showingEnd,
      allSelected,
      showDeleteModal,
      userToDelete,
      currentUser,
      sortUsers,
      sortIndicator,
      toggleSelectAll,
      toggleUserSelection,
      clearSelection,
      handleSearch,
      applyFilters,
      prevPage,
      nextPage,
      refreshUsers,
      editUser,
      viewUser,
      resendActivation,
      confirmDelete,
      closeModal,
      deleteUser,
      bulkResendActivation,
      bulkDeactivate,
      bulkDelete,
      getUserInitials,
      formatRole,
      formatStatus,
      formatDate
    }
  }
}
</script>

<style scoped>
.user-management {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.header-content h1 {
  font-size: 1.875rem;
  font-weight: bold;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
}

.header-content p {
  color: #64748b;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.filters-section {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  padding: 1.5rem;
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.search-box {
  position: relative;
  flex: 1;
  max-width: 400px;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
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
  gap: 1rem;
}

.filter-select {
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background: white;
  font-size: 0.875rem;
  min-width: 150px;
}

.users-table-container {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.loading-state,
.empty-state {
  padding: 3rem;
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
  margin: 0 auto 1rem;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
}

.users-table th,
.users-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #f1f5f9;
}

.users-table th {
  background: #f8fafc;
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.users-table tbody tr:hover {
  background: #f8fafc;
}

.users-table tbody tr.selected {
  background: #eff6ff;
}

.sortable {
  cursor: pointer;
  user-select: none;
}

.sortable:hover {
  background: #f1f5f9;
}

.sort-indicator {
  margin-left: 0.5rem;
  font-weight: bold;
}

.checkbox {
  width: 1rem;
  height: 1rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-avatar {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: #3b82f6;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.75rem;
}

.user-details {
  display: flex;
  flex-direction: column;
}

.user-name {
  color: #1e293b;
  font-weight: 500;
}

.user-company {
  font-size: 0.75rem;
  color: #64748b;
}

.user-email {
  color: #3b82f6;
  font-weight: 500;
}

.user-date {
  color: #64748b;
  font-size: 0.875rem;
}

.role-badge,
.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.role-badge.admin {
  background: #fef3c7;
  color: #92400e;
}

.role-badge.manager {
  background: #dbeafe;
  color: #1e40af;
}

.role-badge.user {
  background: #dcfce7;
  color: #166534;
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
  color: #374151;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.btn-action {
  padding: 0.5rem;
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1rem;
}

.btn-action:hover {
  background: #f1f5f9;
  transform: scale(1.1);
}

.btn-action.delete:hover {
  background: #fef2f2;
  color: #dc2626;
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: white;
  border-top: 1px solid #e2e8f0;
}

.pagination-info {
  color: #64748b;
  font-size: 0.875rem;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.pagination-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #9ca3af;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-numbers {
  color: #64748b;
  font-size: 0.875rem;
}

.bulk-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 0.5rem;
  margin-top: 1rem;
}

.bulk-info {
  color: #1e40af;
  font-weight: 500;
}

.bulk-buttons {
  display: flex;
  gap: 0.75rem;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 0.75rem;
  padding: 0;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
  margin: 0;
  color: #1e293b;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #64748b;
}

.modal-body {
  padding: 1.5rem;
}

.modal-body p {
  margin: 0 0 1rem 0;
  color: #374151;
}

.warning-text {
  color: #dc2626 !important;
  font-weight: 500;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding: 1.5rem;
  border-top: 1px solid #e2e8f0;
}

/* Button Styles */
.btn-primary {
  background: #3b82f6;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.375rem;
  text-decoration: none;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  background: #f1f5f9;
  color: #374151;
  padding: 0.75rem 1.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-secondary:hover {
  background: #e2e8f0;
}

.btn-outline {
  background: white;
  color: #374151;
  padding: 0.75rem 1.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-outline:hover {
  background: #f8fafc;
}

.btn-danger {
  background: #dc2626;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-danger:hover {
  background: #b91c1c;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Responsive */
@media (max-width: 1024px) {
  .page-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .filters-section {
    flex-direction: column;
  }
  
  .search-box {
    max-width: none;
  }
  
  .users-table {
    display: block;
    overflow-x: auto;
  }
}

@media (max-width: 768px) {
  .action-buttons {
    flex-direction: column;
  }
  
  .bulk-actions {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .bulk-buttons {
    flex-wrap: wrap;
  }
  
  .modal-actions {
    flex-direction: column;
  }
}
</style>