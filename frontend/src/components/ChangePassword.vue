<!-- src/components/ChangePassword.vue -->
<template>
  <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <!-- Header ovisno o scenariju -->
      <div class="text-center">
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {{ 
            isResetMode ? '🔐 Resetiranje lozinke' :
            isInitialSetup ? '👋 Dobrodošli!' : 
            '🔐 Promjena lozinke' 
          }}
        </h2>
        
        <!-- Prikaz emaila nakon verifikacije tokena -->
        <div v-if="isResetMode && userEmail && !tokenVerifying" class="mt-2 p-3 bg-green-50 rounded-lg">
          <p class="text-sm text-green-700">
            ✅ Token verifikovan za: <strong>{{ userEmail }}</strong>
          </p>
        </div>
        
        <div v-if="isResetMode" class="mt-2">
          <p class="text-sm text-orange-600 font-medium">
            Postavite novu lozinku za svoj račun
          </p>
          <p class="text-xs text-gray-500 mt-1">
            Zahtjev za resetiranjem lozinke
          </p>
        </div>
        
        <div v-else-if="isInitialSetup" class="mt-2">
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
        
        <p v-if="userEmail && !isResetMode" class="mt-1 text-sm text-gray-600">
          Za korisnika: <span class="font-medium">{{ userEmail }}</span>
        </p>
        
        <!-- Token verifikacija u tijeku -->
        <div v-if="tokenVerifying" class="mt-4">
          <div class="flex items-center justify-center">
            <svg class="animate-spin h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="text-sm text-blue-600">Provjeravam token...</span>
          </div>
        </div>
        
        <!-- Token nevažeći -->
        <div v-if="tokenInvalid && !tokenVerifying" class="mt-4 p-3 bg-red-50 rounded-lg">
          <p class="text-sm text-red-700">
            ❌ Token je nevažeći ili je istekao.
          </p>
          <button @click="$router.push('/login')" class="mt-2 text-sm text-blue-600 hover:text-blue-800">
            Vrati se na prijavu
          </button>
        </div>
      </div>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <!-- Prikaz forme SAMO ako je token valjan ili nije reset mode -->
        <div v-if="(!isResetMode || (isResetMode && tokenVerified && !tokenInvalid))">
          
          <!-- Obavijest o resetiranju lozinke -->
          <div v-if="isResetMode" class="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-sm text-orange-700">
                  <strong>Sigurnosni reset:</strong> Zatražili ste resetiranje lozinke. Postavite novu sigurnu lozinku.
                </p>
              </div>
            </div>
          </div>

          <!-- Obavijest o početnom postavljanju -->
          <div v-if="isInitialSetup && !isResetMode" class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
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

          <!-- Upute za resetiranje lozinke -->
          <div v-if="isResetMode" class="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 class="text-sm font-medium text-gray-800 mb-2">📝 Upute:</h3>
            <ol class="text-xs text-gray-600 space-y-1 ml-4 list-decimal">
              <li>Unesite novu lozinku (najmanje 8 znakova)</li>
              <li>Potvrdite lozinku u drugom polju</li>
              <li>Kliknite "Resetiraj lozinku"</li>
              <li>Bit ćete preusmjereni na stranicu za prijavu</li>
            </ol>
          </div>

          <form @submit.prevent="handlePasswordChange" class="space-y-6">
            
            <!-- Trenutna lozinka (samo za regularnu promjenu) -->
            <div v-if="!isRequiredChange && !isInitialSetup && !isResetMode">
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
                  :placeholder="isResetMode ? 'Unesite novu lozinku' : 'Unesite novu lozinku'"
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
              
              <!-- Pokazatelj jačine lozinke -->
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

            <!-- Poruka o grešci -->
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

            <!-- Poruka o uspjehu -->
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
                    {{ isResetMode ? 'Preusmjeravam na prijavu' : 'Preusmjeravam' }} za {{ redirectCountdown }}s...
                  </div>
                </div>
              </div>
            </div>

            <!-- Gumb za slanje -->
            <div>
              <button
                type="submit"
                :disabled="isLoading || !passwordsMatch || (!passwordStrength.isValid && (isRequiredChange || isInitialSetup || isResetMode)) || (isResetMode && !tokenVerified)"
                :class="{
                  'opacity-50 cursor-not-allowed': isLoading || !passwordsMatch || (!passwordStrength.isValid && (isRequiredChange || isInitialSetup || isResetMode)) || (isResetMode && !tokenVerified),
                  'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500': !isLoading && passwordsMatch && !isResetMode,
                  'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500': !isLoading && passwordsMatch && isResetMode,
                  'bg-gray-400': isLoading || !passwordsMatch || (!passwordStrength.isValid && (isRequiredChange || isInitialSetup || isResetMode)) || (isResetMode && !tokenVerified)
                }"
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-150 ease-in-out"
              >
                <span v-if="isLoading">
                  <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {{ 
                    isResetMode ? 'Resetiranje lozinke...' :
                    isInitialSetup ? 'Postavljanje lozinke...' : 
                    'Promjena lozinke...' 
                  }}
                </span>
                <span v-else>
                  {{ 
                    isResetMode ? 'Resetiraj lozinku' :
                    isInitialSetup ? 'Postavi lozinku' : 
                    isRequiredChange ? 'Promijeni lozinku' : 
                    'Promijeni lozinku' 
                  }}
                </span>
              </button>
            </div>
          </form>

          <!-- Dodatne opcije -->
          <div v-if="!isInitialSetup && !isRequiredChange && !isResetMode" class="mt-6 pt-6 border-t border-gray-200">
            <p class="text-xs text-gray-500 text-center">
              Nakon uspješne promjene lozinke bit ćete automatski preusmjereni.
            </p>
          </div>

          <!-- Povratak na prijavu za reset mode -->
          <div v-if="isResetMode" class="mt-6 pt-6 border-t border-gray-200">
            <p class="text-xs text-gray-500 text-center">
              Sjećate se lozinke? 
              <router-link to="/login" class="text-blue-600 hover:text-blue-500 font-medium">
                Prijavite se ovdje
              </router-link>
            </p>
          </div>
          
        </div>
        
        <!-- Ako je token nevažeći, prikaži ovu poruku -->
        <div v-else-if="isResetMode && tokenInvalid" class="text-center py-8">
          <div class="text-red-500 text-4xl mb-4">❌</div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Token je nevažeći</h3>
          <p class="text-gray-600 mb-6">
            Reset link je istekao ili je nevažeći. Zatražite novi link za resetiranje lozinke.
          </p>
          <button @click="$router.push('/login')" 
                  class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
            Vrati se na prijavu
          </button>
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
      
      // Scenariji
      isRequiredChange: false,
      isInitialSetup: false,
      isResetMode: false,
      fromActivation: false,
      
      // Informacije o korisniku
      userEmail: '',
      userName: '',
      
      // Reset token stanje
      resetToken: '',
      tokenVerifying: false,
      tokenVerified: false,
      tokenInvalid: false,
      
      // Preusmjeravanje
      redirectPath: '/dashboard',
      redirectCountdown: 3,
      redirectInterval: null,
      
      // Jačina lozinke
      passwordStrength: {
        score: 0,
        strength: 'nema',
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
  watch: {
    // 🔴 FIX: Dodaj watch za promjene URL parametara
    '$route.query': {
      immediate: true,
      handler(newQuery) {
        console.log('🔄 Route query promjena:', newQuery);
        
        if (newQuery.token) {
          this.resetToken = newQuery.token;
          this.isResetMode = true;
          this.tokenVerified = false;
          this.tokenInvalid = false;
          
          // Ako je komponenta već mountana, verifikuj token
          if (this.$options._isMounted) {
            console.log('🔄 Auto-verifikacija zbog promjene query parametra');
            this.verifyResetToken();
          }
        }
      }
    }
  },
  mounted() {
    // Provjeri scenarij iz route query
    const routeQuery = this.$route.query;
    
    // Detektiraj scenarije
    this.isRequiredChange = routeQuery.required === 'true';
    this.isInitialSetup = routeQuery.initial_setup === 'true';
    this.fromActivation = routeQuery.from_activation === 'true';
    this.isResetMode = !!routeQuery.token;
    this.resetToken = routeQuery.token || '';
    
    // Dohvati email korisnika
    const user = authHelper.getUser();
    this.userEmail = user?.email || routeQuery.email || '';
    this.userName = user?.first_name || user?.display_name || '';
    
    // Odredi putanju za preusmjeravanje
    if (this.isResetMode) {
      this.redirectPath = '/login?message=password_reset_success';
    } else {
      this.redirectPath = routeQuery.redirect || 
                         localStorage.getItem('pendingRedirect') || 
                         (user?.role === 'admin' ? '/admin' : '/dashboard');
    }
    
    console.log('🔐 ChangePassword mounted:', {
      isResetMode: this.isResetMode,
      resetToken: this.resetToken ? 'PRISUTAN' : 'NEDOSTAJE',
      tokenShort: this.resetToken ? this.resetToken.substring(0, 10) + '...' : 'nema',
      isRequiredChange: this.isRequiredChange,
      isInitialSetup: this.isInitialSetup,
      fromActivation: this.fromActivation,
      userEmail: this.userEmail,
      redirectPath: this.redirectPath,
      query: routeQuery,
      user: user
    });

    // Označi komponentu kao mountanu
    this.$options._isMounted = true;

    // Ako korisnik nije autenticiran i nije required change/initial setup/reset mode, preusmjeri na prijavu
    if (!authHelper.isAuthenticated() && !this.isRequiredChange && !this.isInitialSetup && !this.isResetMode) {
      console.log('🔐 Nije autenticiran, preusmjeravam na prijavu');
      this.$router.push('/login');
      return;
    }

    // Ako je required change ili initial setup, provjeri imamo li token
    if ((this.isRequiredChange || this.isInitialSetup) && !authHelper.getToken()) {
      console.log('🔐 Nema auth tokena za obaveznu promjenu lozinke');
      this.error = 'Niste autenticirani za promjenu lozinke. Pokušajte se ponovno prijaviti.';
      setTimeout(() => {
        this.$router.push('/login');
      }, 3000);
    }
    
    // Ako je reset mode, verifikuj token i dohvati informacije o korisniku
    if (this.isResetMode && this.resetToken) {
      console.log('🔄 Mounted: Auto-pokretanje verifikacije tokena');
      this.verifyResetToken();
    }
  },
  beforeUnmount() {
    // Očisti interval
    if (this.redirectInterval) {
      clearInterval(this.redirectInterval);
    }
  },
  methods: {
    // Provjera reset tokena
    async verifyResetToken() {
      if (!this.resetToken) {
        this.error = 'Nedostaje token za resetiranje lozinke.';
        setTimeout(() => {
          this.$router.push('/login');
        }, 3000);
        return;
      }
      
      try {
        this.tokenVerifying = true;
        this.error = null;
        console.log('🔐 Provjera reset tokena...', this.resetToken.substring(0, 15) + '...');
        
        // Pozovi backend za provjeru tokena - 🔴 KORISTI ISPRAVAN ENDPOINT!
        const response = await fetch(`http://localhost:8888/api/auth/verify-reset-token/${this.resetToken}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        console.log('🔐 Token verifikacija odgovor:', data);
        
        if (data.success && data.valid) {
          this.userEmail = data.user?.email || '';
          this.userName = data.user?.first_name || data.user?.full_name || '';
          this.tokenVerified = true;
          this.tokenInvalid = false;
          console.log('✅ Reset token valjan za korisnika:', this.userEmail);
        } else {
          this.tokenVerified = false;
          this.tokenInvalid = true;
          this.error = data.message || 'Reset token je nevažeći ili je istekao.';
          console.log('❌ Token nevažeći:', data.message);
        }
      } catch (error) {
        console.error('❌ Greška pri provjeri reset tokena:', error);
        this.tokenVerified = false;
        this.tokenInvalid = true;
        this.error = 'Greška pri provjeri reset tokena. Pokušajte ponovo.';
      } finally {
        this.tokenVerifying = false;
      }
    },
    
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
      
      // Provjeri jačinu lozinke za sve "posebne" scenarije
      if ((this.isRequiredChange || this.isInitialSetup || this.isResetMode) && !this.passwordStrength.isValid) {
        this.error = 'Lozinka nije dovoljno jaka. ' + this.passwordStrength.message;
        return;
      }
      
      this.isLoading = true;
      this.error = null;
      this.success = false;
      
      try {
        console.log('🔐 Početak procesa promjene lozinke:', {
          isResetMode: this.isResetMode,
          isRequiredChange: this.isRequiredChange,
          isInitialSetup: this.isInitialSetup,
          hasResetToken: !!this.resetToken,
          tokenVerified: this.tokenVerified
        });
        
        if (this.isResetMode) {
          // ✅ SCENARIJ RESETIRANJA LOZINKE
          console.log('🔐 Korištenje reset password API-a s tokenom');
          
          const result = await passwordAPI.resetWithToken(this.resetToken, this.newPassword);
          
          if (result.success) {
            this.handleSuccess(
              'Lozinka je uspješno resetirana!', 
              'Sada se možete prijaviti s novom lozinkom.',
              '/login?message=password_reset_success'
            );
          } else {
            throw new Error(result.message || 'Došlo je do greške pri resetiranju lozinke');
          }
          
        } else if (this.isRequiredChange || this.isInitialSetup) {
          // Forsirana promjena lozinke (prva prijava, aktivacija ili admin reset)
          console.log('🔐 Korištenje force password change API-a');
          
          const result = await passwordAPI.forceChangePassword(this.newPassword);
          
          if (result.success) {
            this.handleSuccess(
              'Lozinka je uspješno postavljena!', 
              'Sada ste prijavljeni u sustav.'
            );
          } else {
            throw new Error(result.message || 'Došlo je do greške pri postavljanju lozinke');
          }
          
        } else {
          // Normalna promjena lozinke
          console.log('🔐 Korištenje regular password change API-a');
          
          const result = await passwordAPI.changePassword(this.currentPassword, this.newPassword);
          
          if (result.success) {
            this.handleSuccess(
              'Lozinka je uspješno promijenjena!', 
              'Vaša lozinka je ažurirana.'
            );
          } else {
            throw new Error(result.message || 'Došlo je do greške pri promjeni lozinke');
          }
        }
        
      } catch (error) {
        console.error('❌ Greška pri promjeni lozinke:', error);
        
        // Rukovanje specifičnim greškama
        if (error.response?.status === 400 && (error.message?.includes('token') || error.message?.includes('nevažeći'))) {
          this.error = 'Reset link je istekao ili je nevažeći. Zatražite novi reset link.';
          setTimeout(() => {
            this.$router.push('/login?error=expired_reset_token');
          }, 3000);
        } else if (error.response?.status === 401) {
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
    
    handleSuccess(primaryMessage, secondaryMessage, customRedirect = null) {
      this.success = true;
      this.successMessage = primaryMessage;
      
      // Očisti pending redirect
      localStorage.removeItem('pendingRedirect');
      
      // Odredi putanju za preusmjeravanje
      if (customRedirect) {
        this.redirectPath = customRedirect;
      }
      
      // Ako je reset mode, očisti token iz URL-a
      if (this.isResetMode) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      
      console.log('✅ Promjena lozinke uspješna:', {
        message: primaryMessage,
        redirectPath: this.redirectPath,
        isResetMode: this.isResetMode
      });
      
      // Pokreni odbrojavanje za preusmjeravanje
      this.startRedirectCountdown();
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
      console.log('🔄 Izvršavanje preusmjeravanja na:', this.redirectPath);
      
      // Ako je reset mode, obavezno očisti auth podatke
      if (this.isResetMode) {
        authHelper.clearAuth();
      }
      
      // Force reload da se ažurira auth stanje u cijeloj aplikaciji
      setTimeout(() => {
        // Koristimo replace umjesto push da se ne može vratiti na stranicu za promjenu lozinke
        this.$router.replace(this.redirectPath).then(() => {
          // Force refresh ako je potrebno (osim za reset mode)
          if (!this.isResetMode) {
            window.location.reload();
          }
        }).catch(err => {
          console.error('Greška pri preusmjeravanju:', err);
          // Rezervni način
          window.location.href = this.redirectPath;
        });
      }, 500);
    }
  }
};
</script>

<style scoped>
/* INSERT SOME STYLE LAZY ASS */
</style>