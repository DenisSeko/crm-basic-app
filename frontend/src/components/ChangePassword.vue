<!-- src/components/ChangePassword.vue -->
<template>
  <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
        {{ isRequiredChange ? 'Promjena lozinke je obavezna' : 'Promjena lozinke' }}
      </h2>
      <p v-if="isRequiredChange" class="mt-2 text-center text-sm text-red-600">
        Za vašu sigurnost, potrebno je promijeniti lozinku pri prvom prijavljivanju
      </p>
      <p v-if="userEmail" class="mt-1 text-center text-sm text-gray-600">
        Za korisnika: <span class="font-medium">{{ userEmail }}</span>
      </p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <form @submit.prevent="handlePasswordChange" class="space-y-6">
          
          <!-- Trenutna lozinka (samo ako nije required change) -->
          <div v-if="!isRequiredChange">
            <label for="currentPassword" class="block text-sm font-medium text-gray-700">
              Trenutna lozinka
            </label>
            <div class="mt-1 relative">
              <input 
                id="currentPassword"
                v-model="currentPassword"
                :type="showCurrentPassword ? 'text' : 'password'"
                required
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Unesite trenutnu lozinku"
              />
              <button 
                type="button"
                class="absolute inset-y-0 right-0 pr-3 flex items-center"
                @click="showCurrentPassword = !showCurrentPassword"
              >
                <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path v-if="showCurrentPassword" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                  <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Nova lozinka -->
          <div>
            <label for="newPassword" class="block text-sm font-medium text-gray-700">
              Nova lozinka
            </label>
            <div class="mt-1 relative">
              <input 
                id="newPassword"
                v-model="newPassword"
                :type="showNewPassword ? 'text' : 'password'"
                required
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Unesite novu lozinku"
                @input="checkPasswordStrength"
              />
              <button 
                type="button"
                class="absolute inset-y-0 right-0 pr-3 flex items-center"
                @click="showNewPassword = !showNewPassword"
              >
                <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path v-if="showNewPassword" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                  <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
              </button>
            </div>
            
            <!-- Password strength indicator -->
            <div v-if="passwordStrength.score > 0" class="mt-2">
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs text-gray-600">Jačina lozinke:</span>
                <span :class="{
                  'text-red-600': passwordStrength.strength === 'slaba',
                  'text-yellow-600': passwordStrength.strength === 'srednja',
                  'text-green-600': passwordStrength.strength === 'jaka'
                }" class="text-xs font-medium">
                  {{ passwordStrength.strength }}
                </span>
              </div>
              <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  :class="{
                    'bg-red-500': passwordStrength.score <= 2,
                    'bg-yellow-500': passwordStrength.score >= 3 && passwordStrength.score <= 4,
                    'bg-green-500': passwordStrength.score >= 5
                  }"
                  class="h-full transition-all duration-300"
                  :style="{ width: `${(passwordStrength.score / 6) * 100}%` }"
                ></div>
              </div>
              <p class="mt-1 text-xs" :class="{
                'text-red-600': !passwordStrength.isValid,
                'text-green-600': passwordStrength.isValid
              }">
                {{ passwordStrength.message }}
              </p>
            </div>
          </div>

          <!-- Potvrda nove lozinke -->
          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-gray-700">
              Potvrdi novu lozinku
            </label>
            <div class="mt-1 relative">
              <input 
                id="confirmPassword"
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                required
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Ponovite novu lozinku"
              />
              <button 
                type="button"
                class="absolute inset-y-0 right-0 pr-3 flex items-center"
                @click="showConfirmPassword = !showConfirmPassword"
              >
                <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path v-if="showConfirmPassword" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                  <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Error message -->
          <div v-if="error" class="rounded-md bg-red-50 p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-sm font-medium text-red-800">
                  {{ error }}
                </p>
              </div>
            </div>
          </div>

          <!-- Success message -->
          <div v-if="success" class="rounded-md bg-green-50 p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-sm font-medium text-green-800">
                  Lozinka je uspješno promijenjena! Preusmjeravam...
                </p>
              </div>
            </div>
          </div>

          <!-- Submit button -->
          <div>
            <button
              type="submit"
              :disabled="isLoading || (!passwordStrength.isValid && isRequiredChange) || !passwordsMatch"
              :class="{
                'opacity-50 cursor-not-allowed': isLoading || (!passwordStrength.isValid && isRequiredChange) || !passwordsMatch,
                'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500': !isLoading && passwordsMatch,
                'bg-gray-400': isLoading || (!passwordStrength.isValid && isRequiredChange) || !passwordsMatch
              }"
              class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-150 ease-in-out"
            >
              <span v-if="isLoading">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Promjena lozinke...
              </span>
              <span v-else>
                {{ isRequiredChange ? 'Postavi novu lozinku' : 'Promijeni lozinku' }}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ChangePassword',
  data() {
    return {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      showCurrentPassword: false,
      showNewPassword: false,
      showConfirmPassword: false,
      isLoading: false,
      error: null,
      success: false,
      isRequiredChange: false,
      userEmail: '',
      redirectPath: '/dashboard',
      passwordStrength: {
        score: 0,
        strength: 'none',
        message: '',
        isValid: false
      }
    };
  },
  computed: {
    passwordsMatch() {
      return this.newPassword === this.confirmPassword && this.newPassword.length >= 8;
    }
  },
  mounted() {
    // Provjeri da li je ovo required password change
    const routeQuery = this.$route.query;
    this.isRequiredChange = routeQuery.required === 'true' || routeQuery.force === 'true';
    
    // Dobavi user email iz localStorage ili route query
    try {
      const userData = JSON.parse(localStorage.getItem('user') || localStorage.getItem('tempUserData') || '{}');
      this.userEmail = userData.email || routeQuery.email || '';
    } catch (e) {
      this.userEmail = routeQuery.email || '';
    }
    
    this.redirectPath = routeQuery.redirect || 
                       localStorage.getItem('pendingRedirect') || 
                       (this.checkIfAdmin() ? '/admin' : '/dashboard');
    
    console.log('🔐 ChangePassword mounted:', {
      isRequiredChange: this.isRequiredChange,
      userEmail: this.userEmail,
      redirectPath: this.redirectPath,
      query: routeQuery
    });

    // Ako korisnik nije autenticiran i nije required change, redirect na login
    if (!this.isAuthenticated() && !this.isRequiredChange) {
      console.log('🔐 Not authenticated, redirecting to login');
      this.$router.push('/login');
      return;
    }

    // Ako je required change, provjeri da li imamo token
    if (this.isRequiredChange && !this.getAuthToken()) {
      console.log('🔐 No auth token for required password change');
      this.error = 'Niste autenticirani za promjenu lozinke. Pokušajte se ponovno prijaviti.';
      setTimeout(() => {
        this.$router.push('/login');
      }, 3000);
    }
  },
  methods: {
    isAuthenticated() {
      return localStorage.getItem('authToken') || localStorage.getItem('isAuthenticated') === 'true';
    },
    
    getAuthToken() {
      return localStorage.getItem('authToken');
    },
    
    checkIfAdmin() {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return user.role === 'admin';
      } catch (e) {
        return false;
      }
    },
    
    checkPasswordStrength() {
      const password = this.newPassword;
      let score = 0;
      let message = '';
      let strength = 'slaba';
      let isValid = false;
      
      // Minimalna dužina
      if (password.length >= 8) score += 1;
      
      // Sadrži brojeve
      if (/\d/.test(password)) score += 1;
      
      // Sadrži mala slova
      if (/[a-z]/.test(password)) score += 1;
      
      // Sadrži velika slova
      if (/[A-Z]/.test(password)) score += 1;
      
      // Sadrži specijalne znakove
      if (/[^A-Za-z0-9]/.test(password)) score += 1;
      
      // Minimalna jačina
      if (password.length >= 12) score += 1;
      
      // Odredi jaku lozinku
      isValid = score >= 4 && password.length >= 8;
      
      if (score <= 2) {
        strength = 'slaba';
        message = 'Lozinka je preslaba. Dodajte brojeve, velika i mala slova.';
      } else if (score >= 3 && score <= 4) {
        strength = 'srednja';
        message = 'Lozinka je dobra, ali može biti jača.';
      } else {
        strength = 'jaka';
        message = 'Lozinka je izvrsna!';
      }
      
      this.passwordStrength = {
        score,
        strength,
        message,
        isValid
      };
    },
    
    async handlePasswordChange() {
      // Validacija
      if (this.newPassword !== this.confirmPassword) {
        this.error = 'Lozinke se ne podudaraju';
        return;
      }
      
      if (this.newPassword.length < 8) {
        this.error = 'Lozinka mora imati najmanje 8 znakova';
        return;
      }
      
      // Provjeri jačinu lozinke
      if (!this.passwordStrength.isValid) {
        this.error = 'Lozinka nije dovoljno jaka. ' + this.passwordStrength.message;
        return;
      }
      
      this.isLoading = true;
      this.error = null;
      
      try {
        let endpoint;
        let body = {};
        const token = this.getAuthToken();
        
        if (!token) {
          throw new Error('Niste autenticirani. Pokušajte se ponovno prijaviti.');
        }
        
        if (this.isRequiredChange) {
          // Forsirana promjena lozinke (prva prijava ili admin reset)
          console.log('🔐 Forcing password change...');
          endpoint = 'http://localhost:8888/api/auth/force-change-password';
          body = {
            newPassword: this.newPassword
          };
        } else {
          // Normalna promjena lozinke
          console.log('🔐 Changing password normally...');
          endpoint = 'http://localhost:8888/api/auth/change-password';
          body = {
            currentPassword: this.currentPassword,
            newPassword: this.newPassword
          };
        }
        
        console.log('🌐 Calling endpoint:', endpoint);
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(body)
        });
        
        const data = await response.json();
        console.log('📡 Password change response:', data);
        
        if (response.ok && data.success) {
          this.success = true;
          
          // Ažuriraj token i user podatke ako su vraćeni
          if (data.token) {
            localStorage.setItem('authToken', data.token);
          }
          if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
            // Označi da je lozinka promijenjena
            data.user.requires_password_change = false;
          }
          
          // Očisti temp podatke
          localStorage.removeItem('tempUserData');
          localStorage.removeItem('pendingRedirect');
          
          // Preusmjeri nakon uspjeha
          setTimeout(() => {
            console.log('🔄 Redirecting to:', this.redirectPath);
            this.$router.push(this.redirectPath);
          }, 2000);
          
        } else {
          this.error = data.message || data.error || 'Došlo je do greške pri promjeni lozinke';
        }
      } catch (error) {
        console.error('❌ Password change error:', error);
        this.error = error.message || 'Došlo je do greške pri promjeni lozinke';
        
        // Ako je greška vezana za autentikaciju, redirect na login
        if (error.message.includes('autenticirani') || error.message.includes('token')) {
          setTimeout(() => {
            this.$router.push('/login');
          }, 3000);
        }
      } finally {
        this.isLoading = false;
      }
    }
  }
};
</script>

<style scoped>
/* Custom styles if needed */
</style>