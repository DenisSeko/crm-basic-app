// api.js - KOMPLETNO AŽURIRANO SA FIXANIM PASSWORD CHANGE REDIRECTOM
import axios from "axios";

// API konfiguracija
const getApiConfig = () => {
  if (typeof window === "undefined") {
    return {
      baseURL: "http://localhost:8888",
      timeout: 10000,
    };
  }

  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    return {
      baseURL: "http://localhost:8888",
      timeout: 10000,
    };
  }

  return {
    baseURL: "",
    timeout: 10000,
  };
};

const api = axios.create(getApiConfig());

// Helper funkcija za generiranje display imena
const generateDisplayName = (userData) => {
  if (!userData) return 'Korisnik';
  
  // 1. Pokušaj koristiti display_name ako postoji i nije prazan
  if (userData.display_name && userData.display_name.trim()) {
    return userData.display_name.trim();
  }
  
  // 2. Pokušaj koristiti first_name
  if (userData.first_name && userData.first_name.trim()) {
    return userData.first_name.trim();
  }
  
  // 3. Pokušaj koristiti username
  if (userData.username && userData.username.trim()) {
    return userData.username.trim();
  }
  
  // 4. Ako ima full_name, uzmi prvu riječ
  if (userData.full_name && userData.full_name.trim()) {
    const firstName = userData.full_name.split(' ')[0];
    if (firstName && firstName.trim()) {
      return firstName.trim();
    }
  }
  
  // 5. Ako ima ID i email, generiraj ime iz emaila + ID
  if (userData.id && userData.email) {
    const nameFromEmail = userData.email.split('@')[0];
    
    // Ukloni brojeve i specijalne znakove
    const cleanName = nameFromEmail
      .replace(/[0-9._-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Uzmi prvu riječ ili cijelo ime ako nema razmaka
    const displayName = cleanName.split(' ')[0] || nameFromEmail;
    
    // Capitalize prvo slovo
    const capitalized = displayName.charAt(0).toUpperCase() + displayName.slice(1);
    
    return `${capitalized} #${userData.id}`;
  }
  
  // 6. Ako ima email (bez ID-a), generiraj samo iz emaila
  if (userData.email) {
    const nameFromEmail = userData.email.split('@')[0];
    const cleanName = nameFromEmail
      .replace(/[0-9._-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const displayName = cleanName.split(' ')[0] || nameFromEmail;
    return displayName.charAt(0).toUpperCase() + displayName.slice(1);
  }
  
  // 7. Ako ima samo ID (vrlo rijetko)
  if (userData.id) {
    return `Korisnik #${userData.id}`;
  }
  
  return 'Korisnik';
};

// Helper funkcija za normalizaciju user objekta
const normalizeUserObject = (user) => {
  if (!user) return null;
  
  // Osnovni podaci - osiguraj da id nije null
  const normalizedUser = {
    id: user.id || null,
    email: user.email || '',
    role: user.role || 'user',
    email_verified: user.email_verified || false,
    first_name: (user.first_name || user.firstName || '').trim(),
    last_name: (user.last_name || user.lastName || '').trim(),
    username: (user.username || '').trim(),
    full_name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
    display_name: (user.display_name || '').trim(),
    requires_password_change: Boolean(user.requires_password_change) || false,
    password_changed_at: user.password_changed_at || null,
    // Dodaj ostala svojstva ako postoje
    ...user
  };
  
  // Ako display_name nije postavljen ili je prazan, generiraj ga
  if (!normalizedUser.display_name) {
    normalizedUser.display_name = generateDisplayName(normalizedUser);
  }
  
  return normalizedUser;
};

// Auth helper
const authHelper = {
  // Privatni cache za brži pristup
  _token: null,
  _user: null,
  _initialized: false,
  
  setAuth(token, user) {
    try {
      console.log("🔐 setAuth called with:", { token, user });
      
      // DEKODIRAJ TOKEN da dobijemo pravi role
      let userRole = user?.role;

      // Pokušaj izvući role iz tokena
      if (token && !userRole) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          userRole = payload.role || user?.role || "user";
          console.log("🔍 Role extracted from token:", userRole);
        } catch (e) {
          console.log("⚠️ Could not extract role from token, using user.role");
        }
      }

      // NORMALIZIRAJ i GENERIRAJ podatke korisnika
      const userWithRole = {
        ...user,
        role: userRole || user?.role || "user",
      };
      
      const userData = normalizeUserObject(userWithRole);
      
      console.log("✅ Normalizirani user podaci:", {
        id: userData.id,
        email: userData.email,
        display_name: userData.display_name,
        role: userData.role,
        requires_password_change: userData.requires_password_change,
      });

      // Spremi u localStorage
      localStorage.setItem("authToken", token);
      localStorage.setItem("userData", JSON.stringify(userData));
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("authTimestamp", Date.now().toString());

      // Update cache
      this._token = token;
      this._user = userData;
      
      // Postavi axios header
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      
      // EMITUJ DOGADJAJ za re-render komponenti
      this._emitAuthChange();
      
      return true;
    } catch (error) {
      console.error("❌ Greška pri spremanju auth podataka:", error);
      return false;
    }
  },

  clearAuth() {
    try {
      localStorage.removeItem("authToken");
      localStorage.removeItem("userData");
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("authTimestamp");
      localStorage.removeItem("password_change_in_progress");
      localStorage.removeItem("pendingRedirect");
      localStorage.removeItem("loginRedirect");
      localStorage.removeItem("redirecting_for_password_change");
      delete api.defaults.headers.common["Authorization"];
      
      // Clear cache
      this._token = null;
      this._user = null;
      
      console.log("🔐 Auth podaci očišćeni");
      
      // EMITUJ DOGADJAJ za re-render komponenti
      this._emitAuthChange();
    } catch (error) {
      console.error("❌ Greška pri čišćenju auth podataka:", error);
    }
  },

  getToken() {
    try {
      if (this._token) return this._token;
      const token = localStorage.getItem("authToken");
      this._token = token;
      return token;
    } catch (error) {
      console.error("❌ Greška pri dobivanju tokena:", error);
      return null;
    }
  },

  getUser() {
    try {
      if (this._user) return this._user;
      const userStr = localStorage.getItem("userData");
      if (userStr) {
        const parsedUser = JSON.parse(userStr);
        // Normaliziraj usera iz localStorage-a
        this._user = normalizeUserObject(parsedUser);
        return this._user;
      }
      return null;
    } catch (error) {
      console.error("❌ Greška pri dobivanju korisnika:", error);
      return null;
    }
  },

  isAuthenticated() {
    try {
      const token = this.getToken();
      if (!token) {
        return false;
      }
      
      // Provjeri je li token istekao
      if (this.isTokenExpired()) {
        console.log("🔐 Token expired, clearing auth");
        this.clearAuth();
        return false;
      }
      
      const user = this.getUser();
      return !!token && !!user;
    } catch (error) {
      console.error("❌ Greška pri provjeri autentikacije:", error);
      return false;
    }
  },

  isTokenExpired() {
    const token = this.getToken();
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const isExpired = payload.exp * 1000 < Date.now();

      if (isExpired) {
        console.log("⚠️ Token expired at:", new Date(payload.exp * 1000));
        this.clearAuth();
      }

      return isExpired;
    } catch (error) {
      console.error("❌ Greška pri provjeri tokena:", error);
      this.clearAuth();
      return true;
    }
  },

  initializeAuth() {
    try {
      if (this._initialized) {
        return this.isAuthenticated();
      }
      
      const token = this.getToken();
      if (token && !this.isTokenExpired()) {
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        this._initialized = true;
        return true;
      } else {
        console.log("🔐 No valid token found, clearing auth");
        this.clearAuth();
        this._initialized = true;
        return false;
      }
    } catch (error) {
      console.error("❌ Greška pri inicijalizaciji auth:", error);
      this.clearAuth();
      this._initialized = true;
      return false;
    }
  },

  // Privatna metoda za emitiranje događaja
  _emitAuthChange() {
    // Custom event za obavijest Vue komponenti
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('authStateChanged', {
        detail: {
          isAuthenticated: this.isAuthenticated(),
          user: this.getUser(),
          requiresPasswordChange: this.getUser()?.requires_password_change || false
        }
      }));
    }
  },

  // Nova metoda za role-based redirect
  getRedirectPath() {
    const user = this.getUser();
    if (!user) return "/login";

    // Provjeri da li korisnik treba promijeniti lozinku
    if (user.requires_password_change) {
      return "/change-password?required=true";
    }

    if (user.role === "admin") {
      return "/admin";
    }
    return "/dashboard";
  },

  // Metoda za verificiranje role sa backendom
  async verifyUserRole() {
    try {
      const token = this.getToken();
      if (!token) return null;

      const response = await api.get("/api/auth/verify");

      if (response.data.success) {
        this.setAuth(token, response.data.user);
        return response.data.user.role;
      }
      return null;
    } catch (error) {
      console.error("❌ Role verification error:", error);
      return null;
    }
  },

  // Helper za admin provjeru
  isAdmin() {
    const user = this.getUser();
    return user?.role === "admin";
  },

  // Helper za provjeru da li korisnik treba promijeniti lozinku
  requiresPasswordChange() {
    const user = this.getUser();
    return user?.requires_password_change === true;
  },

  // Metoda za ažuriranje user podataka
  updateUserData(updates) {
    try {
      const currentUser = this.getUser();
      if (!currentUser) return false;
      
      const updatedUser = {
        ...currentUser,
        ...updates
      };
      
      // Normaliziraj ponovno
      const normalizedUser = normalizeUserObject(updatedUser);
      
      // Spremi u localStorage
      localStorage.setItem("userData", JSON.stringify(normalizedUser));
      this._user = normalizedUser;
      
      // Emituj promjenu
      this._emitAuthChange();
      
      console.log("✅ User data updated:", normalizedUser);
      return true;
    } catch (error) {
      console.error("❌ Error updating user data:", error);
      return false;
    }
  },

  // Dodatna helper metoda za debug
  getAuthInfo() {
    const user = this.getUser();
    return {
      hasToken: !!this.getToken(),
      hasUser: !!user,
      isAuthenticated: this.isAuthenticated(),
      isTokenExpired: this.isTokenExpired(),
      user: user,
      displayName: user?.display_name,
      userId: user?.id,
      requiresPasswordChange: user?.requires_password_change,
      initialized: this._initialized
    };
  },

  // Nova metoda za provjeru da li je korisnik upravo promijenio lozinku
  markPasswordChanged() {
    const result = this.updateUserData({
      requires_password_change: false,
      password_changed_at: new Date().toISOString()
    });
    
    if (result) {
      console.log("✅ Password marked as changed in authHelper");
      this._emitAuthChange(); // Dodatno emit event
    }
    
    return result;
  },

  // Poboljšana metoda za provjeru da li korisnik treba promijeniti lozinku
  checkPasswordChangeRedirect() {
    const user = this.getUser();
    const currentPath = window.location.pathname;
    
    // Ako korisnik treba promijeniti lozinku i nije na change-password stranici
    if (user?.requires_password_change === true && 
        !currentPath.includes('/change-password') &&
        !currentPath.includes('/login') &&
        !currentPath.includes('/auth')) {
      
      console.log('🔐 Password change required, redirecting from checkPasswordChangeRedirect()');
      
      // Spremi trenutni path za redirect nakon promjene lozinke
      if (currentPath !== '/') {
        localStorage.setItem('pendingRedirect', currentPath);
      }
      
      // Postavi flag da je redirect u tijeku
      localStorage.setItem('redirecting_for_password_change', 'true');
      
      return true;
    }
    
    // Očisti flag ako smo na change-password stranici
    if (currentPath.includes('/change-password')) {
      localStorage.removeItem('redirecting_for_password_change');
    }
    
    return false;
  },
  
  // Metoda za dohvaćanje pending redirect-a
  getPendingRedirect() {
    const redirect = localStorage.getItem('pendingRedirect');
    localStorage.removeItem('pendingRedirect');
    return redirect || (this.isAdmin() ? '/admin' : '/dashboard');
  },

  // Postavljanje requires_password_change flag-a
  setRequiresPasswordChange(value) {
    const user = this.getUser();
    if (user) {
      return this.updateUserData({
        requires_password_change: Boolean(value)
      });
    }
    return false;
  },

  // Nova metoda: Dobavi auth podatke kao string za debug
  getDebugInfo() {
    return JSON.stringify(this.getAuthInfo(), null, 2);
  },

  // 🔴 NOVO: Metoda za provjeru initial setup scenarija
  isInitialSetup() {
    const user = this.getUser();
    return user?.requires_password_change === true && 
           (this.getToken() !== null) &&
           !localStorage.getItem('password_change_completed');
  },

  // 🔴 NOVO: Metoda za označavanje da je password change završen
  markPasswordChangeCompleted() {
    localStorage.setItem('password_change_completed', 'true');
    console.log("✅ Password change marked as completed");
  },

  // 🔴 NOVO: Metoda za provjeru da li je password change u tijeku
  isPasswordChangeInProgress() {
    return localStorage.getItem('password_change_in_progress') === 'true';
  },

  // 🔴 NOVO: Metoda za postavljanje password change in progress flag
  setPasswordChangeInProgress(value) {
    if (value) {
      localStorage.setItem('password_change_in_progress', 'true');
    } else {
      localStorage.removeItem('password_change_in_progress');
    }
  },

  // 🔴 NOVO: Metoda za provjeru da li je redirect za password change u tijeku
  isPasswordChangeRedirectInProgress() {
    return localStorage.getItem('redirecting_for_password_change') === 'true';
  },

  // 🔴 NOVO: Metoda za postavljanje redirect flag-a
  setPasswordChangeRedirectInProgress(value) {
    if (value) {
      localStorage.setItem('redirecting_for_password_change', 'true');
    } else {
      localStorage.removeItem('redirecting_for_password_change');
    }
  }
};

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = authHelper.getToken();

    if (token && !authHelper.isTokenExpired()) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    console.error("❌ Request error:", error);
    return Promise.reject({
      ...error,
      userMessage: "Problem s mrežnom vezom.",
    });
  }
);

// 🔴 **FIXAN Response interceptor - SA ISPRAVNIM PASSWORD CHANGE REDIRECTOM SA LOGIN STRANICE**
api.interceptors.response.use(
  (response) => {
    const currentUser = authHelper.getUser();
    const isCurrentUserAdmin = currentUser?.role === 'admin';
    
    // 🔴 KRITIČNO: Ako je trenutni korisnik admin, NIKAD ne mijenjaj auth podatke automatski
    if (isCurrentUserAdmin) {
      // Log za debug
      if (response.data && (response.data.requires_password_change || response.data.user?.requires_password_change)) {
        console.log('🛡️ Interceptor: Admin detected with password change flag in response - NOT updating auth data');
      }
      return response;
    }
    
    // Originalna logika samo za non-admin korisnike
    // Ako response sadrži podatke o promjeni lozinke, ažuriraj lokalne podatke
    if (response.data && (response.data.requires_password_change || response.data.user?.requires_password_change)) {
      console.log("🔐 Password change flag detected in response for non-admin user");
      
      // Ažuriraj lokalne podatke
      if (response.data.token && response.data.user) {
        authHelper.setAuth(response.data.token, response.data.user);
      } else if (response.data.user) {
        authHelper.updateUserData(response.data.user);
      }
    }
    
    // Ako je password change uspješan, označi da je završen
    if (response.config.url?.includes('/change-password') || response.config.url?.includes('/force-change-password')) {
      if (response.data.success) {
        console.log("✅ Password change successful in interceptor");
        authHelper.markPasswordChanged();
        authHelper.markPasswordChangeCompleted();
        authHelper.setPasswordChangeInProgress(false);
      }
    }
    
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const data = error.response?.data;
    const code = data?.code;
    const requestUrl = error.config?.url || '';

    console.log('🔍 Interceptor error details:', {
      status,
      code,
      url: requestUrl,
      requires_password_change: data?.requires_password_change,
      path: window.location.pathname,
      isLoginPage: window.location.pathname.includes('/login')
    });

    // 🔴 ISPRAVLJENO: Handlanje password change required grešaka - REDIRECT ČAK I SA LOGIN STRANICE
    if (status === 403 && (data?.requires_password_change || code === "PASSWORD_CHANGE_REQUIRED")) {
      console.log("🔐 Password change required detected in interceptor - PROCESSING REDIRECT...");
      
      const currentUser = authHelper.getUser();
      const isCurrentUserAdmin = currentUser?.role === 'admin';
      const currentPath = window.location.pathname;
      
      // 🔴 Ako je admin, NE mijenjaj podatke
      if (isCurrentUserAdmin) {
        console.log('🛡️ Interceptor: Admin password change required - NOT updating auth data');
        return Promise.reject({
          ...error,
          handled: true,
          message: "Morate promijeniti lozinku prije pristupa sustavu"
        });
      }
      
      // Ažuriraj lokalne podatke samo za non-admin korisnike
      if (data.token && data.user) {
        console.log('🔐 Saving token and user data from 403 response');
        authHelper.setAuth(data.token, data.user);
      } else if (data.user) {
        console.log('🔐 Updating user data from 403 response');
        authHelper.updateUserData(data.user);
      }
      
      // Postavi flag za password change
      authHelper.setRequiresPasswordChange(true);
      authHelper.setPasswordChangeInProgress(true);
      
      // 🔴 VAŽNO: Spremanje tokena ako postoji u error response
      if (data.token) {
        console.log('🔐 Token found in 403 response, saving to localStorage');
        localStorage.setItem('authToken', data.token);
        api.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
      }
      
      // 🔴 OVO JE KLJUČNO ISPRAVLJENO: REDIRECT ČAK I SA LOGIN STRANICE NA CHANGE-PASSWORD
      setTimeout(() => {
        // 🔴 VAŽNA PROMJENA: Dozvoli redirect SA login stranice NA change-password
        // Trebamo ići na change-password čak i ako smo na login stranici!
        console.log('🔄 Interceptor: Checking if redirect is needed from', currentPath);
        
        // Ako NISMO na change-password stranici, redirectaj
        if (!currentPath.includes('/change-password')) {
          console.log('🔄 Interceptor: Redirecting from', currentPath, 'to change-password page');
          
          // Spremi trenutni path za povratak (osim ako je login ili root)
          if (currentPath !== '/' && currentPath !== '/login') {
            localStorage.setItem('pendingRedirect', currentPath);
            console.log('📍 Saved pending redirect:', currentPath);
          }
          
          // Postavi flag da je redirect u tijeku
          authHelper.setPasswordChangeRedirectInProgress(true);
          
          // 🔴 OVO JE NOVO: Koristi window.location za siguran redirect
          // Dodaj from_login parametar ako dolazimo sa login stranice
          const fromLogin = currentPath.includes('/login') ? '&from_login=true' : '';
          window.location.href = `/change-password?required=true${fromLogin}&initial_setup=true`;
          
        } else {
          console.log('ℹ️ Already on change-password page, no redirect needed');
        }
      }, 300);
      
      return Promise.reject({
        ...error,
        handled: true,
        message: "Morate promijeniti lozinku prije pristupa sustavu",
        redirectTo: '/change-password?required=true'
      });
    }

    // Ako je greška 401, provjeri token i očisti auth ako je istekao
    if (status === 401) {
      console.log("🔐 401 Unauthorized - clearing auth");
      authHelper.clearAuth();
      
      // Samo ako nismo na login stranici, možemo redirectati
      if (!window.location.pathname.includes('/login') && 
          !window.location.pathname.includes('/change-password')) {
        setTimeout(() => {
          window.location.href = "/login?message=session_expired";
        }, 1000);
      }
    }
    
    // Za 404 greške samo logujemo
    else if (status === 404) {
      console.log(`🔍 404 Not Found: ${requestUrl}`);
    }

    return Promise.reject(error);
  }
);

// CLIENT API
const clientAPI = {
  async getClients(params = {}) {
    try {
      const response = await api.get("/api/clients", { params });
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri dohvaćanju klijenata:", error);
      throw error;
    }
  },

  async createClient(clientData) {
    try {
      const response = await api.post("/api/clients", clientData);
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri kreiranju klijenta:", error);
      throw error;
    }
  },

  async deleteClient(clientId) {
    try {
      const response = await api.delete(`/api/clients/${clientId}`);
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri brisanju klijenata:", error);
      throw error;
    }
  },

  async getClientStats() {
    try {
      const response = await api.get("/api/clients/stats");
      return response.data;
    } catch (error) {
      console.log("ℹ️ Stats endpoint ne postoji, koristim fallback");
      return {
        success: true,
        data: {
          total_clients: 0,
          total_notes: 0,
          last_note: { content: "Nema bilježki" },
        },
      };
    }
  },

  async getNotesCountPerClient() {
    try {
      const response = await api.get("/api/clients/notes-count");
      return response.data;
    } catch (error) {
      console.log("ℹ️ Notes count endpoint ne postoji, koristim fallback");
      return {
        success: true,
        data: [],
      };
    }
  },
};

// NOTES API
const notesAPI = {
  async getNotes(params = {}) {
    try {
      const response = await api.get("/api/notes", { params });
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri dohvaćanju bilješki:", error);
      throw error;
    }
  },

  async createNote(noteData) {
    try {
      const response = await api.post("/api/notes", noteData);
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri kreiranju bilješke:", error);
      throw error;
    }
  },

  async deleteNote(noteId) {
    try {
      const response = await api.delete(`/api/notes/${noteId}`);
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri brisanju bilješke:", error);
      throw error;
    }
  },
};

// 🔴 **POPRAVLJEN ADMIN API - sa zaštitom za admin user management**
const adminAPI = {
  async getUsers(params = {}) {
    try {
      const response = await api.get("/api/admin/users", { params });
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri dohvaćanju korisnika:", error);
      throw error;
    }
  },

  async getUser(userId) {
    try {
      console.log('🔍 ADMIN API: Getting user', userId);
      
      const currentUser = authHelper.getUser();
      const isAdmin = currentUser?.role === 'admin';
      let adminBackup = null;
      
      if (isAdmin) {
        adminBackup = {
          role: currentUser.role,
          requires_password_change: currentUser.requires_password_change,
          email: currentUser.email,
          display_name: currentUser.display_name
        };
        console.log('💾 Admin backup saved for getUser');
      }
      
      const response = await api.get(`/api/admin/users/${userId}`);
      
      // 🔴 VRATI ADMINOVE PODATKE AKO JE BIO ADMIN
      if (isAdmin && adminBackup) {
        setTimeout(() => {
          console.log('🛡️ Restoring admin data after getUser');
          authHelper.updateUserData(adminBackup);
        }, 50);
      }
      
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri dohvaćanju korisnika:", error);
      throw error;
    }
  },

  // 🔴 POPRAVLJENA: createUser sa zaštitom admin podataka
  async createUser(userData) {
    try {
      console.log('🚀 Creating user with data:', userData);
      
      // 🔴 Spremi adminove originalne podatke prije API poziva
      const currentUser = authHelper.getUser();
      const isCurrentUserAdmin = currentUser?.role === 'admin';
      let adminBackup = null;
      
      if (isCurrentUserAdmin) {
        adminBackup = {
          role: currentUser.role,
          requires_password_change: currentUser.requires_password_change,
          email: currentUser.email,
          first_name: currentUser.first_name,
          last_name: currentUser.last_name,
          display_name: currentUser.display_name
        };
        console.log('👑 Admin backup data saved:', adminBackup);
      }
      
      const response = await api.post("/api/admin/users", userData);
      console.log('✅ Create user response:', response.data);
      
      // 🔴 Ako je trenutni korisnik admin, vrati njegove originalne podatke
      if (isCurrentUserAdmin && adminBackup) {
        setTimeout(() => {
          console.log('🛡️ Restoring original admin auth data');
          
          // Osiguraj da admin ostane admin i da nema password change flag
          const restoredData = {
            ...adminBackup,
            requires_password_change: false // Eksplicitno postavi na false
          };
          
          // Ažuriraj adminove podatke
          authHelper.updateUserData(restoredData);
        }, 50);
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Create user error:', error);
      throw error;
    }
  },

  async updateUser(userId, userData) {
    try {
      console.log('🔧 Updating user:', userId);
      
      const currentUser = authHelper.getUser();
      const isCurrentUserAdmin = currentUser?.role === 'admin';
      let adminBackup = null;
      
      if (isCurrentUserAdmin) {
        adminBackup = {
          role: currentUser.role,
          requires_password_change: currentUser.requires_password_change,
          email: currentUser.email,
          display_name: currentUser.display_name
        };
        console.log('💾 Admin backup saved for updateUser');
      }
      
      const response = await api.put(`/api/admin/users/${userId}`, userData);
      
      // 🔴 VRATI ADMINOVE PODATKE AKO JE BIO ADMIN
      if (isCurrentUserAdmin && adminBackup) {
        setTimeout(() => {
          console.log('🛡️ Restoring admin data after updateUser');
          authHelper.updateUserData(adminBackup);
        }, 50);
      }
      
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri ažuriranju korisnika:", error);
      throw error;
    }
  },

  async patchUser(userId, userData) {
    try {
      console.log('🔧 Patching user:', userId);
      
      const currentUser = authHelper.getUser();
      const isCurrentUserAdmin = currentUser?.role === 'admin';
      let adminBackup = null;
      
      if (isCurrentUserAdmin) {
        adminBackup = {
          role: currentUser.role,
          requires_password_change: currentUser.requires_password_change,
          email: currentUser.email,
          display_name: currentUser.display_name
        };
        console.log('💾 Admin backup saved for patchUser');
      }
      
      const response = await api.patch(`/api/admin/users/${userId}`, userData);
      
      // 🔴 VRATI ADMINOVE PODATKE AKO JE BIO ADMIN
      if (isCurrentUserAdmin && adminBackup) {
        setTimeout(() => {
          console.log('🛡️ Restoring admin data after patchUser');
          authHelper.updateUserData(adminBackup);
        }, 50);
      }
      
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri parcijalnom ažuriranju korisnika:", error);
      throw error;
    }
  },

  // 🔴 POPRAVLJENA: deleteUser metoda sa zaštitom admin podataka
  async deleteUser(userId) {
    try {
      console.log(`🗑️ ADMIN API: Deleting user ${userId}`);
      
      const currentUser = authHelper.getUser();
      const isCurrentUserAdmin = currentUser?.role === 'admin';
      let adminBackup = null;
      
      if (isCurrentUserAdmin) {
        adminBackup = {
          role: currentUser.role,
          requires_password_change: currentUser.requires_password_change,
          email: currentUser.email,
          display_name: currentUser.display_name
        };
        console.log('💾 Admin backup saved for deleteUser');
      }
      
      const response = await api.delete(`/api/admin/users/${userId}`);
      console.log('✅ Delete user response:', response.data);
      
      // 🔴 VRATI ADMINOVE PODATKE AKO JE BIO ADMIN
      if (isCurrentUserAdmin && adminBackup) {
        setTimeout(() => {
          console.log('🛡️ Restoring admin data after deleteUser');
          authHelper.updateUserData(adminBackup);
        }, 50);
      }
      
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri brisanju korisnika:", error);
      throw error;
    }
  },

  // DODANO: toggleUserStatus metoda koristi PATCH
  async toggleUserStatus(userId, status) {
    try {
      console.log('📤 ADMIN API: Changing user status ID:', userId, 'to:', status);
      
      const currentUser = authHelper.getUser();
      const isCurrentUserAdmin = currentUser?.role === 'admin';
      let adminBackup = null;
      
      if (isCurrentUserAdmin) {
        adminBackup = {
          role: currentUser.role,
          requires_password_change: currentUser.requires_password_change,
          email: currentUser.email,
          display_name: currentUser.display_name
        };
        console.log('💾 Admin backup saved for toggleUserStatus');
      }
      
      const response = await api.patch(`/api/admin/users/${userId}`, {
        status: status
      });
      
      // 🔴 VRATI ADMINOVE PODATKE AKO JE BIO ADMIN
      if (isCurrentUserAdmin && adminBackup) {
        setTimeout(() => {
          console.log('🛡️ Restoring admin data after toggleUserStatus');
          authHelper.updateUserData(adminBackup);
        }, 50);
      }
      
      console.log('✅ Toggle status response:', response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri promjeni statusa:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  },

  async resendActivationEmail(userId) {
    try {
      console.log('📧 Resending activation email for user:', userId);
      
      const currentUser = authHelper.getUser();
      const isCurrentUserAdmin = currentUser?.role === 'admin';
      let adminBackup = null;
      
      if (isCurrentUserAdmin) {
        adminBackup = {
          role: currentUser.role,
          requires_password_change: currentUser.requires_password_change,
          email: currentUser.email,
          display_name: currentUser.display_name
        };
        console.log('💾 Admin backup saved for resendActivationEmail');
      }
      
      const response = await api.post(`/api/admin/users/${userId}/resend-activation`);
      
      // 🔴 VRATI ADMINOVE PODATKE AKO JE BIO ADMIN
      if (isCurrentUserAdmin && adminBackup) {
        setTimeout(() => {
          console.log('🛡️ Restoring admin data after resendActivationEmail');
          authHelper.updateUserData(adminBackup);
        }, 50);
      }
      
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri ponovnom slanju aktivacijskog emaila:", error);
      throw error;
    }
  },

  // Alias funkcije za backward compatibility
  async resendActivation(userId) {
    console.log('📧 resendActivation (alias) called for user:', userId);
    return await this.resendActivationEmail(userId);
  },

  async resendVerificationEmail(userId) {
    console.log('📧 resendVerificationEmail (alias) called for user:', userId);
    return await this.resendActivationEmail(userId);
  },

  async resetUserPassword(userId, sendEmail = false) {
    try {
      console.log('🔧 Resetting password for user:', userId);
      
      const currentUser = authHelper.getUser();
      const isCurrentUserAdmin = currentUser?.role === 'admin';
      let adminBackup = null;
      
      if (isCurrentUserAdmin) {
        adminBackup = {
          role: currentUser.role,
          requires_password_change: currentUser.requires_password_change,
          email: currentUser.email,
          display_name: currentUser.display_name
        };
        console.log('💾 Admin backup saved for resetUserPassword');
      }
      
      const response = await api.post(`/api/admin/users/${userId}/reset-password`, {
        send_email: sendEmail
      });
      
      // 🔴 VRATI ADMINOVE PODATKE AKO JE BIO ADMIN
      if (isCurrentUserAdmin && adminBackup) {
        setTimeout(() => {
          console.log('🛡️ Restoring admin data after resetUserPassword');
          authHelper.updateUserData(adminBackup);
        }, 50);
      }
      
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri resetovanju lozinke:", error);
      throw error;
    }
  },

  // Zaštićena metoda za kreiranje korisnika koja nikad ne mijenja admin podatke
  async createUserProtected(userData) {
    try {
      console.log('🛡️ Protected user creation for admin');
      
      // Spremi trenutne admin podatke
      const currentUser = authHelper.getUser();
      const adminBackup = {
        role: currentUser?.role,
        requires_password_change: currentUser?.requires_password_change,
        email: currentUser?.email,
        first_name: currentUser?.first_name,
        last_name: currentUser?.last_name
      };
      
      console.log('💾 Admin backup data:', adminBackup);
      
      const response = await api.post('/api/admin/users', userData);
      
      // 🔴 VAŽNO: Vrati admin podatke
      setTimeout(() => {
        console.log('👑 Restoring admin auth data');
        authHelper.updateUserData({
          ...adminBackup,
          requires_password_change: false
        });
      }, 50);
      
      return response.data;
    } catch (error) {
      console.error('❌ Protected user creation error:', error);
      throw error;
    }
  },

  // Ultra-zaštićena metoda koja koristi axios direktno bez interceptora
  async createUserSuperProtected(userData) {
    try {
      console.log('🛡️ SUPER Protected user creation for admin');
      
      // Spremi admin podatke prije svega
      const currentUser = authHelper.getUser();
      const isAdmin = currentUser?.role === 'admin';
      
      if (isAdmin) {
        // Spremi auth token
        const originalToken = authHelper.getToken();
        
        // Napravi API poziv BEZ korištenja interceptora
        const response = await axios({
          method: 'post',
          url: '/api/admin/users',
          baseURL: getApiConfig().baseURL,
          headers: {
            'Authorization': `Bearer ${originalToken}`,
            'Content-Type': 'application/json'
          },
          data: userData,
          timeout: 10000
        });
        
        console.log('✅ API response:', response.data);
        
        console.log('👑 Admin data NOT touched after user creation');
        
        return response.data;
      } else {
        // Ako nije admin, koristi normalnu metodu
        return await this.createUser(userData);
      }
    } catch (error) {
      console.error('❌ Super protected user creation error:', error);
      throw error;
    }
  }
};

// AUTH API - OPTIMIZIRANO ZA NOVI ROUTER GUARD
const authAPI = {
  async login(credentials) {
    try {
      console.log("🔐 AuthAPI: Login for:", credentials.email);
      const response = await api.post("/api/auth/login", credentials);

      if (response.data.success && response.data.token) {
        // Spremi auth podatke
        const authSuccess = authHelper.setAuth(response.data.token, response.data.user || { email: credentials.email });
        
        if (authSuccess) {
          // Ako korisnik treba promijeniti lozinku, vrati poseban flag
          if (response.data.requires_password_change || response.data.user?.requires_password_change) {
            console.log("⚠️ AuthAPI: Korisnik treba promijeniti lozinku");
            response.data.requires_password_change = true;
            authHelper.setPasswordChangeInProgress(true);
          }
        }
      }

      return response.data;
    } catch (error) {
      console.error("❌ AuthAPI: Login error:", error);
      throw error;
    }
  },

  async verifyToken() {
    try {
      const response = await api.get("/api/auth/verify");
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri verifikaciji tokena:", error);
      throw error;
    }
  },

  async changePassword(passwordData) {
    try {
      console.log("🔐 AuthAPI: Changing password...");
      const response = await api.post("/api/auth/change-password", passwordData);
      
      if (response.data.success) {
        console.log("✅ Password changed successfully");
        // Oznaci da je lozinka promijenjena
        authHelper.markPasswordChanged();
        authHelper.setPasswordChangeInProgress(false);
      }
      
      return response.data;
    } catch (error) {
      console.error("❌ AuthAPI: Greška pri promjeni lozinke:", error);
      throw error;
    }
  },

  async forceChangePassword(passwordData) {
    try {
      console.log("🔐 AuthAPI: Force changing password...");
      const response = await api.post("/api/auth/force-change-password", passwordData);
      
      if (response.data.success) {
        console.log("✅ Force password change successful");
        // Oznaci da je lozinka promijenjena
        authHelper.markPasswordChanged();
        authHelper.markPasswordChangeCompleted();
        authHelper.setPasswordChangeInProgress(false);
        
        // Ažuriraj token ako je novi token vraćen
        if (response.data.token) {
          const currentUser = authHelper.getUser();
          authHelper.setAuth(response.data.token, currentUser);
        }
      }
      
      return response.data;
    } catch (error) {
      console.error("❌ AuthAPI: Greška pri forsiranoj promjeni lozinke:", error);
      throw error;
    }
  },

  async verifyActivationLink(token) {
    try {
      const response = await api.get(`/api/auth/verify/${token}`);
      return response.data;
    } catch (error) {
      console.error("❌ AuthAPI: Activation link verification error:", error);
      throw error;
    }
  },

  async activateAccount(token, email) {
    try {
      console.log("🔐 AuthAPI: Activating account with token:", token);
      const response = await api.get(`/api/auth/activate/${token}`, {
        params: { email: email },
      });

      // Ako backend vraća token, spremimo ga
      if (response.data.success && response.data.token) {
        const authSuccess = authHelper.setAuth(response.data.token, response.data.user);
        
        if (authSuccess) {
          // Ako korisnik treba promijeniti lozinku, postavi flag
          if (response.data.user?.requires_password_change === true || response.data.requires_password_change === true) {
            console.log("🔐 User needs password change after activation");
            response.data.requires_password_change = true;
            authHelper.setPasswordChangeInProgress(true);
            
            // Očisti password change completed flag ako postoji
            localStorage.removeItem('password_change_completed');
          }
        }
      }

      return response.data;
    } catch (error) {
      console.error("❌ AuthAPI: Activation error:", error);
      throw error;
    }
  },

  async requestPasswordReset(email) {
    try {
      const response = await api.post("/api/auth/request-password-reset", { email });
      return response.data;
    } catch (error) {
      console.error("❌ AuthAPI: Greška pri zahtjevu za resetom lozinke:", error);
      throw error;
    }
  },

  async resetPasswordWithToken(token, newPassword) {
    try {
      const response = await api.post("/api/auth/reset-password", {
        token,
        new_password: newPassword
      });
      return response.data;
    } catch (error) {
      console.error("❌ AuthAPI: Greška pri resetu lozinke sa tokenom:", error);
      throw error;
    }
  },

  async healthCheck() {
    try {
      const response = await api.get("/api/health");
      return response.data;
    } catch (error) {
      return { success: false, message: "API nije dostupan" };
    }
  },

  async resendVerificationEmail(email) {
    try {
      const response = await api.post("/api/auth/resend-verification", { email });
      return response.data;
    } catch (error) {
      console.error("❌ AuthAPI: Greška pri ponovnom slanju verifikacijskog emaila:", error);
      throw error;
    }
  }
};

// PASSWORD API
const passwordAPI = {
  async changePassword(currentPassword, newPassword) {
    return await authAPI.changePassword({
      currentPassword,
      newPassword
    });
  },

  async forceChangePassword(newPassword) {
    return await authAPI.forceChangePassword({
      newPassword
    });
  },

  async requestReset(email) {
    return await authAPI.requestPasswordReset(email);
  },

  async resetWithToken(token, newPassword) {
    return await authAPI.resetPasswordWithToken(token, newPassword);
  },

  // Helper za provjeru jačine lozinke na frontendu
  checkPasswordStrength(password) {
    if (!password) return { score: 0, strength: 'none', message: 'Unesite lozinku' };
    
    let score = 0;
    const messages = [];
    
    // Provjere
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    
    // Poruke
    if (password.length < 8) {
      messages.push('Lozinka mora imati najmanje 8 karaktera');
    }
    if (!/[A-Z]/.test(password)) {
      messages.push('Dodajte barem jedno veliko slovo');
    }
    if (!/\d/.test(password)) {
      messages.push('Dodajte barem jedan broj');
    }
    
    // Odredivanje jačine
    let strength = 'slaba';
    if (score >= 4) strength = 'srednja';
    if (score >= 6) strength = 'jaka';
    
    return {
      score,
      strength,
      message: messages.length > 0 ? messages.join('. ') : 'Lozinka je dovoljno jaka',
      isValid: score >= 4 && password.length >= 8
    };
  }
};

// Inicijaliziraj auth pri učitavanju
if (typeof window !== "undefined") {
  setTimeout(() => {
    console.log("🚀 Initializing auth on app startup");
    authHelper.initializeAuth();
    
    // Provjeri da li treba redirectati na change-password
    if (authHelper.checkPasswordChangeRedirect() && 
        !authHelper.isPasswordChangeRedirectInProgress()) {
      console.log('🔐 Auth initialization: Password change required, redirecting...');
      setTimeout(() => {
        window.location.href = '/change-password?required=true&from_auth_init=true';
      }, 500);
    }
    
    // Debug funkcije
    window.listAdminMethods = () => {
      console.log('🔧 Available adminAPI methods:');
      Object.keys(adminAPI).forEach(method => {
        console.log(`  - ${method}():`, typeof adminAPI[method]);
      });
    };
    
    window.debugAuth = () => {
      const authInfo = authHelper.getAuthInfo();
      console.log("🔍 DEBUG AUTH STATE:", authInfo);
      console.log("📝 localStorage authToken:", localStorage.getItem("authToken"));
      console.log("👤 localStorage userData:", localStorage.getItem("userData"));
      console.log("🎯 Generated display name:", authInfo.user?.display_name);
      console.log("🔧 adminAPI methods:", Object.keys(adminAPI));
      console.log("🔄 pendingRedirect:", localStorage.getItem("pendingRedirect"));
      console.log("🔐 password_change_in_progress:", localStorage.getItem("password_change_in_progress"));
      console.log("✅ password_change_completed:", localStorage.getItem("password_change_completed"));
      console.log("🔄 redirecting_for_password_change:", localStorage.getItem("redirecting_for_password_change"));
    };
    
    // Test funkcije za password change flow
    window.testPasswordChangeFlow = () => {
      console.log('🧪 Testing password change flow...');
      
      // Simuliraj usera koji treba promijeniti lozinku
      const testToken = 'test-token-' + Date.now();
      const testUser = {
        email: 'test@example.com',
        role: 'user',
        requires_password_change: true
      };
      
      authHelper.setAuth(testToken, testUser);
      console.log('✅ Test user created with password change required');
      console.log('🔐 User state:', authHelper.getUser());
      
      // Redirect na change-password
      setTimeout(() => {
        window.location.href = '/change-password?required=true&initial_setup=true';
      }, 1000);
    };
    
    window.clearPasswordChangeFlags = () => {
      console.log('🧹 Clearing all password change flags...');
      authHelper.setRequiresPasswordChange(false);
      authHelper.setPasswordChangeInProgress(false);
      authHelper.setPasswordChangeRedirectInProgress(false);
      localStorage.removeItem('password_change_completed');
      localStorage.removeItem('pendingRedirect');
      console.log('✅ All password change flags cleared');
    };
    
    console.log("🔧 Debug commands available:");
    console.log("  listAdminMethods() - List all adminAPI methods");
    console.log("  debugAuth() - Show auth state");
    console.log("  testPasswordChangeFlow() - Test password change flow");
    console.log("  clearPasswordChangeFlags() - Clear all password change flags");
    console.log("  adminAPI.resendActivation() - Alias for resendActivationEmail");
    console.log("  adminAPI.resendVerificationEmail() - Alias for resendActivationEmail");
    
  }, 100);
}

// Export
export default api;
export { 
  clientAPI, 
  notesAPI, 
  adminAPI, 
  authAPI, 
  passwordAPI, 
  authHelper, 
  normalizeUserObject 
};