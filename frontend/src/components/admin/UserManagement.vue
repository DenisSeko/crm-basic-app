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
          <input v-model="searchQuery" type="text" placeholder="Pretraži korisnike..." class="search-input" />
          <span class="search-icon">🔍</span>
        </div>

        <div class="filter-controls">
          <select v-model="statusFilter" class="filter-select">
            <option value="">Svi statusi</option>
            <option value="active">Aktivni</option>
            <option value="pending_verification">Na čekanju</option>
            <option value="inactive">Neaktivni</option>
            <option value="suspended">Suspendirani</option>
          </select>

          <select v-model="roleFilter" class="filter-select">
            <option value="">Sve uloge</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="user">Korisnik</option>
          </select>

          <select v-model="authMethodFilter" class="filter-select">
            <option value="">Svi načini prijave</option>
            <option value="email_only">Samo Email</option>
            <option value="email_password">Email + Lozinka</option>
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

      <div v-else-if="errorMessage" class="error-state">
        <div class="error-icon">❌</div>
        <h3>Greška pri učitavanju</h3>
        <p>{{ errorMessage }}</p>
        <button @click="loadUsers" class="btn-primary">
          🔄 Pokušaj ponovno
        </button>
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
              <th @click="handleSort('first_name')" class="sortable">
                Ime i Prezime
                <span v-if="sortField === 'first_name'" class="sort-indicator">
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
              <th>Način Prijave</th>
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
                <div class="user-name-info">
                  <div class="user-fullname">{{ user.first_name }} {{ user.last_name }}</div>
                  <div v-if="user.company" class="user-company">{{ user.company }}</div>
                </div>
              </td>
              <td class="user-email">
                <div>{{ user.email }}</div>
                <div v-if="!user.email_verified" class="email-not-verified">
                  ❌ Nije verificiran
                </div>
              </td>
              <td class="user-role">
                <span :class="['role-badge', user.role]">
                  {{ formatRole(user.role) }}
                </span>
              </td>
              <td class="user-status">
                <span :class="['status-badge', user.status]">
                  {{ getUserStatusText(user.status) }}
                </span>
              </td>
              <td class="user-auth">
                <span :class="['auth-badge', user.auth_method]">
                  {{ formatAuthMethod(user.auth_method) }}
                </span>
              </td>
              <td class="user-date">
                {{ formatDate(user.created_at) }}
              </td>
              <td class="user-actions">
                <router-link :to="`/admin/users/${user.id}/edit`" class="btn-edit" title="Uredi korisnika">
                  ✏️
                </router-link>
                <button v-if="user.status === 'pending_verification'" @click="resendActivation(user)" class="btn-resend"
                  title="Pošalji aktivacijski email">
                  📧
                </button>
                <button @click="toggleUserStatus(user)" :class="['btn-status', user.status]"
                  :title="getStatusButtonTitle(user.status)">
                  {{ getStatusButtonIcon(user.status) }}
                </button>
                <button @click="confirmDeleteUser(user)" class="btn-delete" title="Obriši korisnika"
                  :disabled="user.role === 'admin'">
                  🗑️
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="filteredUsers.length > 0 && !loading && !errorMessage" class="pagination">
        <button @click="prevPage" :disabled="currentPage === 1" class="pagination-btn">
          ← Prethodna
        </button>

        <span class="pagination-info">
          Stranica {{ currentPage }} od {{ totalPages }}
          ({{ filteredUsers.length }} korisnika)
        </span>

        <button @click="nextPage" :disabled="currentPage === totalPages" class="pagination-btn">
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
      <div class="stat-item">
        <span class="stat-number">{{ emailOnlyUsers }}</span>
        <span class="stat-label">Samo Email</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { adminAPI, authHelper } from '../../services/api'

const router = useRouter()

// State
const users = ref([])
const loading = ref(false)
const errorMessage = ref('')
const searchQuery = ref('')
const statusFilter = ref('')
const roleFilter = ref('')
const authMethodFilter = ref('')
const sortField = ref('id')
const sortDirection = ref('desc')
const currentPage = ref(1)
const itemsPerPage = ref(10)

// Computed properties
const filteredUsers = computed(() => {
  let filtered = users.value

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(user =>
      (user.first_name?.toLowerCase() || '').includes(query) ||
      (user.last_name?.toLowerCase() || '').includes(query) ||
      (user.email?.toLowerCase() || '').includes(query) ||
      (user.company?.toLowerCase() || '').includes(query) ||
      (user.department?.toLowerCase() || '').includes(query)
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

  // Auth method filter
  if (authMethodFilter.value) {
    filtered = filtered.filter(user => user.auth_method === authMethodFilter.value)
  }

  return filtered
})

const sortedUsers = computed(() => {
  const sorted = [...filteredUsers.value]

  return sorted.sort((a, b) => {
    let aValue = a[sortField.value]
    let bValue = b[sortField.value]

    // Handle name sorting
    if (sortField.value === 'first_name') {
      aValue = `${a.first_name} ${a.last_name}`.toLowerCase()
      bValue = `${b.first_name} ${b.last_name}`.toLowerCase()
    }

    // Handle date sorting
    if (sortField.value === 'created_at') {
      aValue = new Date(aValue || 0)
      bValue = new Date(bValue || 0)
    }

    // Handle case-insensitive string sorting
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase()
      bValue = bValue.toLowerCase()
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
const pendingUsers = computed(() => users.value.filter(u => u.status === 'pending_verification').length)
const adminUsers = computed(() => users.value.filter(u => u.role === 'admin').length)
const emailOnlyUsers = computed(() => users.value.filter(u => u.auth_method === 'email_only').length)

// Helper functions
const showError = (message) => {
  console.error('❌ Error:', message)
  errorMessage.value = message
}

const clearError = () => {
  errorMessage.value = ''
}

const showSuccess = (message) => {
  alert(message)
}

// Methods
const loadUsers = async () => {
  loading.value = true
  clearError()

  try {
    console.log('🔄 Učitavam korisnike...')

    // Poziv API-ja - vraća { success: true, data: [...], total: 37 }
    const result = await adminAPI.getUsers()

    console.log('📡 API Result:', result)

    // API vraća format: { success: true, data: array, total: number }
    if (result?.success && Array.isArray(result.data)) {
      users.value = result.data  // ⬅️ OVO JE VAŽNO: pristupamo result.data
      console.log(`✅ Učitano ${users.value.length} korisnika (ukupno: ${result.total})`)
    }
    else if (Array.isArray(result?.data)) {
      // Fallback ako nema success polja
      users.value = result.data
      console.log(`✅ Učitano ${users.value.length} korisnika`)
    }
    else if (Array.isArray(result)) {
      // Ako API direktno vraća array (stari format)
      users.value = result
      console.log(`✅ Učitano ${users.value.length} korisnika (direktan array)`)
    }
    else {
      console.error('❌ Neočekivani format:', result)
      showError('Server je vratio neočekivane podatke')
      users.value = []
    }

  } catch (error) {
    console.error('❌ Greška:', error)

    let errorMsg = 'Došlo je do greške pri učitavanju korisnika'

    if (error.response?.status === 401) {
      errorMsg = 'Niste prijavljeni. Molimo prijavite se ponovno.'
      router.push('/login')
    } else if (error.response?.status === 403) {
      errorMsg = 'Nemate dozvolu za pristup korisnicima.'
    } else if (error.response?.status === 404) {
      errorMsg = 'API endpoint nije pronađen.'
    } else if (error.response?.data?.message) {
      errorMsg = error.response.data.message
    } else if (error.message) {
      errorMsg = error.message
    }

    showError(errorMsg)
    users.value = []
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
    sortDirection.value = 'desc'
  }
}

const resendActivation = async (user) => {
  if (!confirm(`Pošalji aktivacijski email korisniku ${user.email}?`)) {
    return
  }

  try {
    console.log(`📧 Šaljem aktivacijski email korisniku ${user.id}`)

    const response = await adminAPI.resendActivation(user.id)
    console.log('📡 Activation response:', response)

    // Server vraća { success: true, message: "..." }
    if (response?.success) {
      showSuccess(response.message || 'Aktivacijski email je uspješno poslan!')
    } else {
      throw new Error(response?.error || 'Neuspješno slanje emaila')
    }

  } catch (error) {
    console.error('❌ Greška:', error)
    showError('Došlo je do greške: ' + (error.message || 'Nepoznata greška'))
  }
}

const toggleUserStatus = async (user) => {
  const currentStatus = user.status
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
  const actionText = newStatus === 'active' ? 'aktiviranje' : 'deaktiviranje'

  if (!confirm(`Jeste li sigurni da želite ${actionText} korisnika ${user.email}?`)) {
    return
  }

  try {
    console.log(`🔄 Mijenjam status korisnika ${user.id} s ${currentStatus} na ${newStatus}`)

    // ⚠️ KORISTITE toggleUserStatus METODU KOJA JE DODANA U api.js
    const response = await adminAPI.toggleUserStatus(user.id, newStatus)
    console.log('📡 Toggle status response:', response)

    // Server vraća { success: true, data: { ...updatedUser } }
    if (response?.success) {
      // Update local state
      const userIndex = users.value.findIndex(u => u.id === user.id)
      if (userIndex !== -1) {
        // Ako response ima data, koristimo ga za update
        if (response.data) {
          users.value[userIndex] = { ...users.value[userIndex], ...response.data }
        } else {
          users.value[userIndex].status = newStatus
        }
      }

      showSuccess(response.message || `Status korisnika je promijenjen na ${getUserStatusText(newStatus)}`)
    } else {
      throw new Error(response?.error || 'Nije moguće ažurirati status')
    }

  } catch (error) {
    console.error('❌ Greška pri promjeni statusa:', error)

    // Detaljan error handling
    let errorMsg = 'Došlo je do greške pri promjeni statusa'

    if (error.response?.data?.error) {
      errorMsg = error.response.data.error
    } else if (error.response?.data?.message) {
      errorMsg = error.response.data.message
    } else if (error.message) {
      errorMsg = error.message
    }

    showError(errorMsg)
  }
}

const confirmDeleteUser = (user) => {
  if (user.role === 'admin') {
    alert('Ne možete obrisati administratora!')
    return
  }

  if (confirm(`Jeste li sigurni da želite trajno obrisati korisnika ${user.first_name} ${user.last_name}?\nOva radnja se ne može poništiti.`)) {
    deleteUser(user)
  }
}

const deleteUser = async (user) => {
  try {
    console.log(`🗑️ Brišem korisnika ${user.id}`)

    const response = await adminAPI.deleteUser(user.id)
    console.log('📡 Delete response:', response)

    // Server vraća { success: true, message: "..." }
    if (response?.success) {
      // Remove from local state
      users.value = users.value.filter(u => u.id !== user.id)

      showSuccess(response.message || 'Korisnik je uspješno obrisan')
    } else {
      throw new Error(response?.error || 'Nije moguće obrisati korisnika')
    }

  } catch (error) {
    console.error('❌ Greška:', error)
    showError('Došlo je do greške: ' + (error.message || 'Nepoznata greška'))
  }
}

const getUserInitials = (user) => {
  const firstName = user?.first_name || ''
  const lastName = user?.last_name || ''

  const firstChar = firstName ? firstName.charAt(0) : ''
  const lastChar = lastName ? lastName.charAt(0) : ''

  if (!firstChar && !lastChar) {
    return user?.email?.charAt(0)?.toUpperCase() || '?'
  }

  return `${firstChar}${lastChar}`.toUpperCase()
}

const getUserStatusText = (status) => {
  const statusMap = {
    'active': 'Aktivan',
    'pending_verification': 'Na čekanju',
    'inactive': 'Neaktivan',
    'suspended': 'Suspendiran'
  }
  return statusMap[status] || status
}

const formatRole = (role) => {
  const roles = {
    'admin': 'Administrator',
    'manager': 'Manager',
    'user': 'Korisnik'
  }
  return roles[role] || role
}

const formatAuthMethod = (method) => {
  const methods = {
    'email_only': 'Samo Email',
    'email_password': 'Email + Lozinka'
  }
  return methods[method] || method
}

const getStatusButtonTitle = (status) => {
  const titles = {
    'active': 'Deaktiviraj korisnika',
    'pending_verification': 'Aktiviraj korisnika',
    'inactive': 'Aktiviraj korisnika',
    'suspended': 'Aktiviraj korisnika'
  }
  return titles[status] || 'Promijeni status'
}

const getStatusButtonIcon = (status) => {
  const icons = {
    'active': '⏸️',
    'pending_verification': '▶️',
    'inactive': '▶️',
    'suspended': '▶️'
  }
  return icons[status] || '⚙️'
}

const formatDate = (date) => {
  if (!date) return 'N/A'
  try {
    return new Date(date).toLocaleDateString('hr-HR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  } catch (error) {
    return 'Nevažeći datum'
  }
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

// Ispravljena funkcija za testiranje DELETE endpointa
const testDeleteEndpoint = async () => {
  console.log('🧪 Test DELETE endpoint-a za korisnika ID 1...')
  try {
    const testResponse = await adminAPI.deleteUser('1')
    console.log('✅ DELETE endpoint radi:', testResponse)
  } catch (error) {
    console.error('❌ DELETE endpoint ne radi:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    })
  }
}

// Lifecycle
onMounted(() => {
  console.log('🚀 UserManagement mounted')

  // Debug: provjeri dostupne metode
  console.log('🔧 adminAPI metode:', Object.keys(adminAPI))
  console.log('🔧 adminAPI.toggleUserStatus postoji?', !!adminAPI.toggleUserStatus)
  console.log('🔧 adminAPI.deleteUser postoji?', !!adminAPI.deleteUser)

  // Opcionalno: testirajte DELETE endpoint (koristite samo za debug)
  // testDeleteEndpoint()

  loadUsers()
})
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
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
.empty-state,
.error-state {
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

.error-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  color: #dc2626;
}

.empty-state h3,
.error-state h3 {
  color: #374151;
  margin: 0 0 0.5rem 0;
}

.error-state p {
  color: #dc2626;
  margin-bottom: 1.5rem;
}

.table-wrapper {
  overflow-x: auto;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1000px;
}

.users-table th {
  background: #f8fafc;
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
}

.users-table td {
  padding: 1rem;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: middle;
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
  flex-shrink: 0;
}

.user-name-info {
  display: flex;
  flex-direction: column;
}

.user-fullname {
  font-weight: 500;
  color: #1e293b;
}

.user-company {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.user-email {
  color: #6b7280;
}

.email-not-verified {
  font-size: 0.75rem;
  color: #dc2626;
  margin-top: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.role-badge,
.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  display: inline-block;
  white-space: nowrap;
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
  background: #e0f2fe;
  color: #0369a1;
}

.status-badge.active {
  background: #dcfce7;
  color: #166534;
}

.status-badge.pending_verification {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.inactive {
  background: #f3f4f6;
  color: #6b7280;
}

.status-badge.suspended {
  background: #fecaca;
  color: #dc2626;
}

.auth-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: inline-block;
  white-space: nowrap;
}

.auth-badge.email_only {
  background: #dbeafe;
  color: #1e40af;
}

.auth-badge.email_password {
  background: #dcfce7;
  color: #166534;
}

.user-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: nowrap;
}

.btn-edit,
.btn-resend,
.btn-status,
.btn-delete {
  padding: 0.5rem;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  height: 2rem;
}

.btn-edit {
  background: #dbeafe;
  color: #1e40af;
}

.btn-edit:hover {
  background: #bfdbfe;
}

.btn-resend {
  background: #f0f9ff;
  color: #0369a1;
}

.btn-resend:hover {
  background: #e0f2fe;
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

.btn-delete:hover:not(:disabled) {
  background: #fecaca;
}

.btn-delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #f3f4f6;
  background: #f8fafc;
}

.pagination-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.pagination-btn:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  color: #6b7280;
  font-weight: 500;
  font-size: 0.875rem;
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
  transition: transform 0.2s;
}

.stat-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
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
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
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

  .filter-controls {
    flex-direction: column;
  }

  .filter-select {
    width: 100%;
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

  .btn-edit,
  .btn-resend,
  .btn-status,
  .btn-delete {
    width: 100%;
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

  .user-name {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .user-avatar {
    align-self: flex-start;
  }
}
</style>