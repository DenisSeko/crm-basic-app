<!-- src/components/admin/UserTable.vue -->
<template>
  <div class="user-table-container">
    <!-- Users Table -->
    <table class="users-table">
      <thead>
        <tr>
          <th v-if="selectable" class="selection-column">
            <input
              type="checkbox"
              :checked="allSelected"
              @change="$emit('select-all')"
              class="checkbox"
            />
          </th>
          <th 
            v-for="column in columns" 
            :key="column.key"
            @click="$emit('sort', column.key)"
            :class="{
              'sortable': column.sortable,
              'sorted': sortBy === column.key
            }"
            class="table-header"
          >
            <div class="header-content">
              <span>{{ column.label }}</span>
              <span v-if="sortBy === column.key" class="sort-indicator">
                {{ sortOrder === 'asc' ? '↑' : '↓' }}
              </span>
            </div>
          </th>
          <th class="actions-column">Akcije</th>
        </tr>
      </thead>
      <tbody>
        <tr 
          v-for="user in users" 
          :key="user.id"
          :class="{ 
            'selected': selectedUsers.includes(user.id),
            'current-user': user.id === currentUserId
          }"
          class="table-row"
        >
          <td v-if="selectable" class="selection-cell">
            <input
              type="checkbox"
              :checked="selectedUsers.includes(user.id)"
              @change="$emit('select-user', user.id)"
              class="checkbox"
            />
          </td>
          
          <!-- User Column -->
          <td class="user-cell">
            <div class="user-info">
              <div class="user-avatar" :style="{ backgroundColor: getAvatarColor(user.name) }">
                {{ getUserInitials(user.name) }}
              </div>
              <div class="user-details">
                <div class="user-name">{{ user.name }}</div>
                <div v-if="user.company" class="user-company">{{ user.company }}</div>
              </div>
            </div>
          </td>

          <!-- Email Column -->
          <td class="email-cell">
            <div class="email-content">
              <span class="email-address">{{ user.email }}</span>
              <span v-if="!user.email_verified" class="verification-badge" title="Email nije verificiran">
                ⚠️
              </span>
            </div>
          </td>

          <!-- Role Column -->
          <td class="role-cell">
            <span class="role-badge" :class="user.role">
              {{ formatRole(user.role) }}
            </span>
          </td>

          <!-- Status Column -->
          <td class="status-cell">
            <div class="status-content">
              <span class="status-badge" :class="user.status">
                <span class="status-dot" :class="user.status"></span>
                {{ formatStatus(user.status) }}
              </span>
              <span v-if="user.status === 'pending'" class="pending-time">
                {{ getPendingTime(user.created_at) }}
              </span>
            </div>
          </td>

          <!-- Date Column -->
          <td class="date-cell">
            <div class="date-content">
              <div class="date">{{ formatDate(user.created_at) }}</div>
              <div class="time">{{ formatTime(user.created_at) }}</div>
            </div>
          </td>

          <!-- Actions Column -->
          <td class="actions-cell">
            <div class="action-buttons">
              <!-- Edit Button -->
              <button
                @click="$emit('edit', user)"
                class="btn-action edit"
                :title="`Uredi ${user.name}`"
                :disabled="loading"
              >
                <span class="action-icon">✏️</span>
                <span class="action-text">Uredi</span>
              </button>

              <!-- View Button -->
              <button
                @click="$emit('view', user)"
                class="btn-action view"
                :title="`Pregledaj ${user.name}`"
                :disabled="loading"
              >
                <span class="action-icon">👁️</span>
                <span class="action-text">Pregled</span>
              </button>

              <!-- Resend Activation Button -->
              <button
                v-if="user.status === 'pending'"
                @click="$emit('resend-activation', user)"
                class="btn-action resend"
                :title="`Pošalji aktivacijski email na ${user.email}`"
                :disabled="loading"
              >
                <span class="action-icon">📧</span>
                <span class="action-text">Pošalji aktivaciju</span>
              </button>

              <!-- Status Toggle Button -->
              <button
                v-if="user.id !== currentUserId"
                @click="$emit('toggle-status', user)"
                class="btn-action status"
                :title="user.status === 'active' ? 'Deaktiviraj korisnika' : 'Aktiviraj korisnika'"
                :disabled="loading"
              >
                <span class="action-icon">
                  {{ user.status === 'active' ? '⏸️' : '✅' }}
                </span>
                <span class="action-text">
                  {{ user.status === 'active' ? 'Deaktiviraj' : 'Aktiviraj' }}
                </span>
              </button>

              <!-- Delete Button -->
              <button
                v-if="user.id !== currentUserId"
                @click="$emit('delete', user)"
                class="btn-action delete"
                :title="`Obriši ${user.name}`"
                :disabled="loading"
              >
                <span class="action-icon">🗑️</span>
                <span class="action-text">Obriši</span>
              </button>

              <!-- More Actions Dropdown -->
              <div class="more-actions">
                <button
                  @click="toggleMoreActions(user.id)"
                  class="btn-action more"
                  :title="`Više akcija za ${user.name}`"
                  :disabled="loading"
                >
                  <span class="action-icon">⋯</span>
                </button>
                <div v-if="moreActionsOpen === user.id" class="more-actions-menu">
                  <button
                    @click="$emit('impersonate', user)"
                    class="more-action-item"
                    :disabled="loading"
                  >
                    🎭 Impersonate
                  </button>
                  <button
                    @click="$emit('send-message', user)"
                    class="more-action-item"
                    :disabled="loading"
                  >
                    💬 Pošalji poruku
                  </button>
                  <button
                    @click="$emit('export-data', user)"
                    class="more-action-item"
                    :disabled="loading"
                  >
                    📊 Export podataka
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Empty State -->
    <div v-if="users.length === 0 && !loading" class="empty-state">
      <div class="empty-icon">👥</div>
      <h3>Nema pronađenih korisnika</h3>
      <p>Promijenite kriterije pretrage ili dodajte novog korisnika</p>
      <slot name="empty-actions">
        <button class="btn-primary" @click="$emit('add-user')">
          ➕ Dodaj Korisnika
        </button>
      </slot>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Učitavanje korisnika...</p>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'

export default {
  name: 'UserTable',
  emits: [
    'sort', 
    'select-all', 
    'select-user', 
    'edit', 
    'view', 
    'resend-activation',
    'toggle-status',
    'delete',
    'impersonate',
    'send-message',
    'export-data',
    'add-user'
  ],
  props: {
    users: {
      type: Array,
      required: true,
      default: () => []
    },
    selectable: {
      type: Boolean,
      default: true
    },
    selectedUsers: {
      type: Array,
      default: () => []
    },
    sortBy: {
      type: String,
      default: 'created_at'
    },
    sortOrder: {
      type: String,
      default: 'desc'
    },
    loading: {
      type: Boolean,
      default: false
    },
    currentUserId: {
      type: [String, Number],
      default: null
    },
    columns: {
      type: Array,
      default: () => [
        { key: 'name', label: 'Korisnik', sortable: true },
        { key: 'email', label: 'Email', sortable: true },
        { key: 'role', label: 'Uloga', sortable: true },
        { key: 'status', label: 'Status', sortable: true },
        { key: 'created_at', label: 'Datum', sortable: true }
      ]
    }
  },
  setup(props) {
    const moreActionsOpen = ref(null)

    const allSelected = computed(() => {
      return props.users.length > 0 && 
        props.users.every(user => props.selectedUsers.includes(user.id))
    })

    const toggleMoreActions = (userId) => {
      moreActionsOpen.value = moreActionsOpen.value === userId ? null : userId
    }

    // Close more actions when clicking outside
    const closeMoreActions = (event) => {
      if (!event.target.closest('.more-actions')) {
        moreActionsOpen.value = null
      }
    }

    // Helper methods
    const getUserInitials = (name) => {
      if (!name) return '??'
      return name
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .substring(0, 2)
    }

    const getAvatarColor = (name) => {
      const colors = [
        '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
        '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
      ]
      const index = name ? name.charCodeAt(0) % colors.length : 0
      return colors[index]
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

    const formatTime = (date) => {
      return new Date(date).toLocaleTimeString('hr-HR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }

    const getPendingTime = (createdAt) => {
      const created = new Date(createdAt)
      const now = new Date()
      const diffHours = Math.floor((now - created) / (1000 * 60 * 60))
      
      if (diffHours < 24) {
        return `prije ${diffHours}h`
      } else {
        const diffDays = Math.floor(diffHours / 24)
        return `prije ${diffDays}d`
      }
    }

    return {
      moreActionsOpen,
      allSelected,
      toggleMoreActions,
      closeMoreActions,
      getUserInitials,
      getAvatarColor,
      formatRole,
      formatStatus,
      formatDate,
      formatTime,
      getPendingTime
    }
  },
  mounted() {
    document.addEventListener('click', this.closeMoreActions)
  },
  beforeUnmount() {
    document.removeEventListener('click', this.closeMoreActions)
  }
}
</script>

<style scoped>
.user-table-container {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.table-header {
  background: #f8fafc;
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.75rem;
  border-bottom: 1px solid #e2e8f0;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
}

.table-header.sortable:hover {
  background: #f1f5f9;
}

.table-header.sorted {
  color: #3b82f6;
  background: #eff6ff;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.sort-indicator {
  color: #3b82f6;
  font-weight: bold;
}

.selection-column {
  width: 40px;
  text-align: center;
}

.actions-column {
  width: 200px;
  text-align: center;
}

.table-row {
  border-bottom: 1px solid #f1f5f9;
  transition: background-color 0.2s;
}

.table-row:hover {
  background: #f8fafc;
}

.table-row.selected {
  background: #eff6ff;
}

.table-row.current-user {
  background: #f0f9ff;
  border-left: 3px solid #0ea5e9;
}

.table-row:last-child {
  border-bottom: none;
}

.selection-cell,
.user-cell,
.email-cell,
.role-cell,
.status-cell,
.date-cell,
.actions-cell {
  padding: 1rem;
  vertical-align: middle;
}

.selection-cell {
  text-align: center;
}

.checkbox {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
}

/* User Cell */
.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-avatar {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.75rem;
  flex-shrink: 0;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.user-name {
  font-weight: 500;
  color: #1e293b;
}

.user-company {
  font-size: 0.75rem;
  color: #64748b;
}

/* Email Cell */
.email-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.email-address {
  color: #3b82f6;
  font-weight: 500;
}

.verification-badge {
  font-size: 0.75rem;
  opacity: 0.7;
}

/* Role Cell */
.role-badge {
  padding: 0.375rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: inline-block;
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

/* Status Cell */
.status-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 500;
  width: fit-content;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}

.status-dot.active {
  background: #10b981;
}

.status-dot.pending {
  background: #f59e0b;
}

.status-dot.inactive {
  background: #6b7280;
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

.pending-time {
  font-size: 0.7rem;
  color: #9ca3af;
}

/* Date Cell */
.date-content {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.date {
  color: #1e293b;
  font-weight: 500;
}

.time {
  font-size: 0.75rem;
  color: #64748b;
}

/* Actions Cell */
.action-buttons {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.btn-action {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  background: white;
  color: #374151;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 500;
  transition: all 0.2s;
  text-decoration: none;
  white-space: nowrap;
}

.btn-action:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #d1d5db;
  transform: translateY(-1px);
}

.btn-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn-action.edit:hover:not(:disabled) {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #3b82f6;
}

.btn-action.view:hover:not(:disabled) {
  background: #f0f9ff;
  border-color: #0ea5e9;
  color: #0ea5e9;
}

.btn-action.resend:hover:not(:disabled) {
  background: #fef3c7;
  border-color: #f59e0b;
  color: #92400e;
}

.btn-action.status:hover:not(:disabled) {
  background: #dcfce7;
  border-color: #10b981;
  color: #166534;
}

.btn-action.delete:hover:not(:disabled) {
  background: #fef2f2;
  border-color: #ef4444;
  color: #dc2626;
}

.btn-action.more {
  padding: 0.5rem;
}

.action-icon {
  font-size: 0.875rem;
}

.action-text {
  font-size: 0.7rem;
}

/* More Actions */
.more-actions {
  position: relative;
}

.more-actions-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  z-index: 10;
  min-width: 160px;
  margin-top: 0.25rem;
}

.more-action-item {
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  font-size: 0.75rem;
  color: #374151;
  transition: background-color 0.2s;
  border-bottom: 1px solid #f1f5f9;
}

.more-action-item:hover:not(:disabled) {
  background: #f8fafc;
}

.more-action-item:last-child {
  border-bottom: none;
}

.more-action-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Empty State */
.empty-state {
  padding: 4rem 2rem;
  text-align: center;
  color: #64748b;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state h3 {
  color: #1e293b;
  margin-bottom: 0.5rem;
  font-size: 1.25rem;
}

.empty-state p {
  margin-bottom: 2rem;
  font-size: 0.875rem;
}

/* Loading State */
.loading-state {
  padding: 4rem 2rem;
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

.loading-state p {
  margin: 0;
  font-size: 0.875rem;
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
  font-size: 0.875rem;
}

.btn-primary:hover {
  background: #2563eb;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Responsive */
@media (max-width: 1024px) {
  .users-table {
    display: block;
    overflow-x: auto;
  }
  
  .action-buttons {
    flex-direction: column;
    align-items: stretch;
  }
  
  .btn-action {
    justify-content: center;
  }
}

@media (max-width: 768px) {
  .table-header {
    padding: 0.75rem 0.5rem;
    font-size: 0.7rem;
  }
  
  .selection-cell,
  .user-cell,
  .email-cell,
  .role-cell,
  .status-cell,
  .date-cell,
  .actions-cell {
    padding: 0.75rem 0.5rem;
  }
  
  .user-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .action-text {
    display: none;
  }
  
  .btn-action {
    padding: 0.5rem;
  }
  
  .more-actions-menu {
    right: auto;
    left: 0;
  }
}

@media (max-width: 640px) {
  .users-table {
    font-size: 0.8rem;
  }
  
  .role-badge,
  .status-badge {
    font-size: 0.7rem;
    padding: 0.25rem 0.5rem;
  }
  
  .date-content .time {
    display: none;
  }
}
</style>