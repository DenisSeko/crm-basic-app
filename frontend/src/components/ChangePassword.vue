<!-- src/components/ChangePassword.vue -->
<template>
  <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <!-- Header based on scenario -->
      <div class="text-center">
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {{ isInitialSetup ? '👋 Dobrodošli!' : '🔐 Promjena lozinke' }}
        </h2>
        
        <div v-if="isInitialSetup" class="mt-2">
          <p class="text-sm text-blue-600 font-medium">
            Postavite lozinku za svoj račun
          </p>
          <p v-if="fromActivation" class="text-xs text-gray-500 mt-1">
            Nakon aktivacije računa
          </p>
        </div>
        
        <div v-else-if="isRequiredChange" class="mt-2">
          <p class="text-sm text-red-600 font-medium">
            Promjena lozinke je obavezna
          </p>
          <p class="text-xs text-gray-500 mt-1">
            Za vašu sigurnost, potrebno je promijeniti lozinku
          </p>
        </div>
        
        <p v-if="userEmail" class="mt-1 text-sm text-gray-600">
          Za korisnika: <span class="font-medium">{{ userEmail }}</span>
        </p>
      </div>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <!-- Initial setup notice -->
        <div v-if="isInitialSetup" class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-blue-700">
                <strong>Važno:</strong> Ovo je vaša prva prijava. Postavite sigurnu lozinku za zaštitu računa.
              </p>
            </div>
          </div>
        </div>

        <form @submit.prevent="handlePasswordChange" class="space-y-6">
          
          <!-- Trenutna lozinka (samo ako nije required change ili initial setup) -->
          <div v-if="!isRequiredChange && !isInitialSetup">
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
                  {{ successMessage }}
                </p>
                <div v-if="redirectCountdown > 0" class="mt-1 text-xs text-green-700">
                  Preusmjeravam za {{ redirectCountdown }}s...
                </div>
              </div>
            </div>
          </div>

          <!-- Submit button -->
          <div>
            <button
              type="submit"
              :disabled="isLoading || !passwordsMatch || (!passwordStrength.isValid && (isRequiredChange || isInitialSetup))"
              :class="{
                'opacity-50 cursor-not-allowed': isLoading || !passwordsMatch || (!passwordStrength.isValid && (isRequiredChange || isInitialSetup)),
                'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500': !isLoading && passwordsMatch,
                'bg-gray-400': isLoading || !passwordsMatch || (!passwordStrength.isValid && (isRequiredChange || isInitialSetup))
              }"
              class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-150 ease-in-out"
            >
              <span v-if="isLoading">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isInitialSetup ? 'Postavljam lozinku...' : 'Promjena lozinke...' }}
              </span>
              <span v-else>
                {{ isInitialSetup ? 'Postavi lozinku' : isRequiredChange ? 'Promijeni lozinku' : 'Promijeni lozinku' }}
              </span>
            </button>
          </div>
        </form>

        <!-- Additional options -->
        <div v-if="!isInitialSetup && !isRequiredChange" class="mt-6 pt-6 border-t border-gray-200">
          <p class="text-xs text-gray-500 text-center">
            Nakon uspješne promjene lozinke bit ćete automatski preusmjereni.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { authHelper, passwordAPI } from '@/services/api'

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
      successMessage: '',
      isRequiredChange: false,
      isInitialSetup: false,
      fromActivation: false,
      userEmail: '',
      redirectPath: '/dashboard',
      redirectCountdown: 3,
      redirectInterval: null,
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
    // Provjeri scenarij iz route query
    const routeQuery = this.$route.query;
    
    this.isRequiredChange = routeQuery.required === 'true';
    this.isInitialSetup = routeQuery.initial_setup === 'true';
    this.fromActivation = routeQuery.from_activation === 'true';
    
    // Dobavi user email iz authHelper-a
    const user = authHelper.getUser();
    this.userEmail = user?.email || routeQuery.email || '';
    
    // Odredi redirect path
    this.redirectPath = routeQuery.redirect || 
                       localStorage.getItem('pendingRedirect') || 
                       (user?.role === 'admin' ? '/admin' : '/dashboard');
    
    console.log('🔐 ChangePassword mounted:', {
      isRequiredChange: this.isRequiredChange,
      isInitialSetup: this.isInitialSetup,
      fromActivation: this.fromActivation,
      userEmail: this.userEmail,
      redirectPath: this.redirectPath,
      query: routeQuery,
      user: user
    });

    // Ako korisnik nije autenticiran i nije required change/initial setup, redirect na login
    if (!authHelper.isAuthenticated() && !this.isRequiredChange && !this.isInitialSetup) {
      console.log('🔐 Not authenticated, redirecting to login');
      this.$router.push('/login');
      return;
    }

    // Ako je required change ili initial setup, provjeri da li imamo token
    if ((this.isRequiredChange || this.isInitialSetup) && !authHelper.getToken()) {
      console.log('🔐 No auth token for required password change');
      this.error = 'Niste autenticirani za promjenu lozinke. Pokušajte se ponovno prijaviti.';
      setTimeout(() => {
        this.$router.push('/login');
      }, 3000);
    }
  },
  beforeUnmount() {
    // Očisti interval
    if (this.redirectInterval) {
      clearInterval(this.redirectInterval);
    }
  },
  methods: {
    checkPasswordStrength() {
      this.passwordStrength = passwordAPI.checkPasswordStrength(this.newPassword);
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
      
      // Provjeri jačinu lozinke za required change i initial setup
      if ((this.isRequiredChange || this.isInitialSetup) && !this.passwordStrength.isValid) {
        this.error = 'Lozinka nije dovoljno jaka. ' + this.passwordStrength.message;
        return;
      }
      
      this.isLoading = true;
      this.error = null;
      this.success = false;
      
      try {
        console.log('🔐 Starting password change process:', {
          isRequiredChange: this.isRequiredChange,
          isInitialSetup: this.isInitialSetup,
          userEmail: this.userEmail
        });
        
        if (this.isRequiredChange || this.isInitialSetup) {
          // Forsirana promjena lozinke (prva prijava, activation, ili admin reset)
          console.log('🔐 Using force password change API');
          
          const result = await passwordAPI.forceChangePassword(this.newPassword);
          
          if (result.success) {
            this.handleSuccess('Lozinka je uspješno postavljena!', 'Sada ste prijavljeni u sustav.');
          } else {
            throw new Error(result.message || 'Došlo je do greške pri postavljanju lozinke');
          }
          
        } else {
          // Normalna promjena lozinke
          console.log('🔐 Using regular password change API');
          
          const result = await passwordAPI.changePassword(this.currentPassword, this.newPassword);
          
          if (result.success) {
            this.handleSuccess('Lozinka je uspješno promijenjena!', 'Vaša lozinka je ažurirana.');
          } else {
            throw new Error(result.message || 'Došlo je do greške pri promjeni lozinke');
          }
        }
        
      } catch (error) {
        console.error('❌ Password change error:', error);
        
        // Rukovanje specifičnim greškama
        if (error.response?.status === 401) {
          this.error = 'Vaša sesija je istekla. Prijavite se ponovno.';
          setTimeout(() => {
            this.$router.push('/login');
          }, 3000);
        } else if (error.response?.status === 403 && error.response?.data?.requires_password_change) {
          this.error = 'Morate promijeniti lozinku prije pristupa sustavu.';
        } else {
          this.error = error.message || 'Došlo je do greške pri promjeni lozinke';
        }
        
      } finally {
        this.isLoading = false;
      }
    },
    
    handleSuccess(primaryMessage, secondaryMessage) {
      this.success = true;
      this.successMessage = primaryMessage;
      
      // Očisti pending redirect
      localStorage.removeItem('pendingRedirect');
      
      // Start redirect countdown
      this.startRedirectCountdown();
      
      console.log('✅ Password change successful:', {
        message: primaryMessage,
        redirectPath: this.redirectPath
      });
    },
    
    startRedirectCountdown() {
      this.redirectCountdown = 3;
      
      this.redirectInterval = setInterval(() => {
        if (this.redirectCountdown > 1) {
          this.redirectCountdown--;
        } else {
          clearInterval(this.redirectInterval);
          this.performRedirect();
        }
      }, 1000);
    },
    
    performRedirect() {
      console.log('🔄 Performing redirect to:', this.redirectPath);
      
      // Force reload to update auth state across the app
      setTimeout(() => {
        // Koristimo replace umjesto push da se ne može vratiti na password change stranicu
        this.$router.replace(this.redirectPath).then(() => {
          // Force refresh ako je potrebno
          window.location.reload();
        }).catch(err => {
          console.error('Redirect error:', err);
          // Fallback
          window.location.href = this.redirectPath;
        });
      }, 500);
    }
  }
};
</script>

<style scoped>
/* Custom styles if needed */
</style>