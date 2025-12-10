<!-- components/PasswordDisplayModal.vue -->
<template>
  <div v-if="show" class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <h3>🔐 Privremena lozinka</h3>
        <button @click="close" class="close-btn">×</button>
      </div>
      
      <div class="modal-body">
        <div class="password-section">
          <p>Korisnik: <strong>{{ userEmail }}</strong></p>
          <div class="password-display">
            <code>{{ temporaryPassword }}</code>
            <button @click="copyPassword" class="copy-btn">
              {{ copied ? '✓ Kopirano!' : '📋 Kopiraj' }}
            </button>
          </div>
          <p class="warning">
            ⚠️ Ova lozinka se prikazuje samo jednom! Spremite je na sigurno mjesto.
          </p>
        </div>
        
        <div class="instructions">
          <h4>Uputstva za korisnika:</h4>
          <ol>
            <li>Korisnik će dobiti aktivacijski email</li>
            <li>Nakon aktivacije, prijavit će se sa ovom lozinkom</li>
            <li>Sistem će tražiti promjenu lozinke pri prvoj prijavi</li>
          </ol>
        </div>
      </div>
      
      <div class="modal-footer">
        <button @click="close" class="btn-primary">Zatvori</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  show: Boolean,
  userEmail: String,
  temporaryPassword: String
})

const emit = defineEmits(['close'])
const copied = ref(false)

const copyPassword = () => {
  navigator.clipboard.writeText(props.temporaryPassword)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

const close = () => {
  emit('close')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 500px;
  max-width: 90%;
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.modal-body {
  padding: 20px;
}

.password-section {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 6px;
  margin-bottom: 20px;
}

.password-display {
  display: flex;
  gap: 10px;
  align-items: center;
  margin: 15px 0;
}

.password-display code {
  flex: 1;
  background: white;
  padding: 12px;
  border: 2px solid #007bff;
  border-radius: 4px;
  font-size: 18px;
  letter-spacing: 1px;
  font-weight: bold;
  color: #333;
}

.copy-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.copy-btn:hover {
  background: #0056b3;
}

.warning {
  color: #dc3545;
  font-size: 14px;
  margin-top: 15px;
}

.instructions {
  background: #e8f4ff;
  padding: 15px;
  border-radius: 6px;
  font-size: 14px;
}

.modal-footer {
  padding: 15px 20px;
  border-top: 1px solid #eee;
  text-align: right;
}

.btn-primary {
  background: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}
</style>