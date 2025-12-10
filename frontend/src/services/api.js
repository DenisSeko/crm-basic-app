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
    return this.updateUserData({
      requires_password_change: false,
      password_changed_at: new Date().toISOString()
    });
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
      
      return true;
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
      this.updateUserData({
        requires_password_change: Boolean(value)
      });
    }
  },

  // Nova metoda: Dobavi auth podatke kao string za debug
  getDebugInfo() {
    return JSON.stringify(this.getAuthInfo(), null, 2);
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

// Glavni Response interceptor
api.interceptors.response.use(
  (response) => {
    // Ako response sadrži podatke o promjeni lozinke, ažuriraj lokalne podatke
    if (response.data && (response.data.requires_password_change || response.data.user?.requires_password_change)) {
      console.log("🔐 Password change flag detected in response");
      
      // Ažuriraj lokalne podatke
      if (response.data.token && response.data.user) {
        authHelper.setAuth(response.data.token, response.data.user);
      } else if (response.data.user) {
        authHelper.updateUserData(response.data.user);
      }
    }
    
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const data = error.response?.data;
    const code = data?.code;

    // Handlanje password change required grešaka
    if (status === 403 && (data?.requires_password_change || code === "PASSWORD_CHANGE_REQUIRED")) {
      console.log("🔐 Password change required detected in interceptor");
      
      // Ažuriraj lokalne podatke
      if (data.token && data.user) {
        authHelper.setAuth(data.token, data.user);
      } else if (data.user) {
        authHelper.updateUserData(data.user);
      }
      
      // Postavi flag za password change
      authHelper.setRequiresPasswordChange(true);
      
      // Ne redirectuj ovdje, router guard će to obaviti
      return Promise.reject({
        ...error,
        handled: true,
        message: "Morate promijeniti lozinku prije pristupa sustavu"
      });
    }

    // Ako je greška 401, provjeri token i očisti auth ako je istekao
    if (status === 401) {
      console.log("🔐 401 Unauthorized - clearing auth");
      authHelper.clearAuth();
      
      // Samo ako nismo na login stranici, možemo redirectati
      if (window.location.pathname !== "/login" && !window.location.pathname.includes('/change-password')) {
        setTimeout(() => {
          window.location.href = "/login?message=session_expired";
        }, 1000);
      }
    }
    
    // Za 404 greške samo logujemo
    else if (status === 404) {
      console.log(`🔍 404 Not Found: ${error.config?.url}`);
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

// ADMIN API - PROŠIREN SA ALIAS FUNKCIJAMA
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
      const response = await api.get(`/api/admin/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri dohvaćanju korisnika:", error);
      throw error;
    }
  },

  async createUser(userData) {
    try {
      const response = await api.post("/api/admin/users", userData);
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri kreiranju korisnika:", error);
      throw error;
    }
  },

  async updateUser(userId, userData) {
    try {
      const response = await api.put(`/api/admin/users/${userId}`, userData);
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri ažuriranju korisnika:", error);
      throw error;
    }
  },

  async patchUser(userId, userData) {
    try {
      const response = await api.patch(`/api/admin/users/${userId}`, userData);
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri parcijalnom ažuriranju korisnika:", error);
      throw error;
    }
  },

  async deleteUser(userId) {
    try {
      const response = await api.delete(`/api/admin/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri brisanju korisnika:", error);
      throw error;
    }
  },

  async resendActivationEmail(userId) {
    try {
      const response = await api.post(`/api/admin/users/${userId}/resend-activation`);
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri ponovnom slanju aktivacijskog emaila:", error);
      throw error;
    }
  },

  // 🔴 NOVO: Alias funkcije za backward compatibility
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
      const response = await api.post(`/api/admin/users/${userId}/reset-password`, {
        send_email: sendEmail
      });
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri resetovanju lozinke:", error);
      throw error;
    }
  },

  async toggleUserStatus(userId, status) {
    try {
      console.log('📤 ADMIN API: Promjena statusa korisnika ID:', userId, 'na status:', status);
      
      const response = await api.patch(`/api/admin/users/${userId}`, {
        status: status
      });
      
      console.log('✅ ADMIN API: Odgovor servera:', response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri promjeni statusa korisnika:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      const apiError = new Error(
        error.response?.data?.error || 
        error.response?.data?.message || 
        error.message || 
        'Došlo je do greške pri promjeni statusa korisnika'
      );
      
      apiError.response = error.response;
      throw apiError;
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
        authHelper.setAuth(response.data.token, response.data.user || { email: credentials.email });
        
        // Ako korisnik treba promijeniti lozinku, vrati poseban flag
        if (response.data.requires_password_change || response.data.user?.requires_password_change) {
          console.log("⚠️ AuthAPI: Korisnik treba promijeniti lozinku");
          return {
            ...response.data,
            requires_password_change: true
          };
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
      const response = await api.post("/api/auth/change-password", passwordData);
      
      if (response.data.success) {
        // Oznaci da je lozinka promijenjena
        authHelper.markPasswordChanged();
      }
      
      return response.data;
    } catch (error) {
      console.error("❌ AuthAPI: Greška pri promjeni lozinke:", error);
      throw error;
    }
  },

  async forceChangePassword(passwordData) {
    try {
      const response = await api.post("/api/auth/force-change-password", passwordData);
      
      if (response.data.success) {
        // Oznaci da je lozinka promijenjena
        authHelper.markPasswordChanged();
        
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
      const response = await api.get(`/api/auth/activate/${token}`, {
        params: { email: email },
      });

      // Ako backend vraća token, spremimo ga
      if (response.data.success && response.data.token) {
        authHelper.setAuth(response.data.token, response.data.user);
        
        // Ako korisnik treba promijeniti lozinku, vrati poseban flag
        if (response.data.user?.requires_password_change === true || response.data.requires_password_change === true) {
          response.data.requires_password_change = true;
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
    };
    
    console.log("🔧 Debug commands available:");
    console.log("  listAdminMethods() - List all adminAPI methods");
    console.log("  debugAuth() - Show auth state");
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