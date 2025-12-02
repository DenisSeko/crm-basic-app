import axios from "axios";

// Dinamičko određivanje baseURL-a za različite environmente
const getApiConfig = () => {
  // Provjeri jesmo li u browseru
  if (typeof window === "undefined") {
    return {
      baseURL: "http://localhost:8888",
      timeout: 10000,
    };
  }

  // Za development na localhostu
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    return {
      baseURL: "http://localhost:8888",
      timeout: 10000,
    };
  }

  // Za production - koristi relative path
  return {
    baseURL: "",
    timeout: 10000,
  };
};

// Kreiraj axios instancu sa dinamičkim base URL-om
const api = axios.create(getApiConfig());

// Auth helper sa kompletnom funkcionalnošću
const authHelper = {
  setAuth(token, user) {
    try {
      localStorage.setItem("authToken", token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("authTimestamp", Date.now().toString());
      console.log("🔐 Auth podaci spremljeni:", {
        token: token ? `${token.substring(0, 20)}...` : "empty",
        user: { id: user?.id, email: user?.email, role: user?.role },
      });

      // Postavi default Authorization header
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } catch (error) {
      console.error("❌ Greška pri spremanju auth podataka:", error);
    }
  },

  clearAuth() {
    try {
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("authTimestamp");
      localStorage.removeItem("pending_verification_email");
      localStorage.removeItem("intended_url");
      delete api.defaults.headers.common["Authorization"];
      console.log("🔐 Auth podaci očišćeni");
    } catch (error) {
      console.error("❌ Greška pri čišćenju auth podataka:", error);
    }
  },

  getToken() {
    try {
      return localStorage.getItem("authToken");
    } catch (error) {
      console.error("❌ Greška pri dobivanju tokena:", error);
      return null;
    }
  },

  getUser() {
    try {
      const user = localStorage.getItem("user");
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error("❌ Greška pri dobivanju korisnika:", error);
      return null;
    }
  },

  isAuthenticated() {
    try {
      const token = this.getToken();
      const user = this.getUser();
      const isAuthenticated =
        localStorage.getItem("isAuthenticated") === "true";

      // 🆕 DEVELOPMENT MODE: Poseban tretman za fake tokene
      if (import.meta.env.DEV && token && token.startsWith('fake-jwt-token-')) {
        console.log('🔧 DEV MODE: Fake token detected - auth valid');
        return !!(token && user && isAuthenticated);
      }

      const authenticated = !!(
        token &&
        user &&
        isAuthenticated &&
        !this.isTokenExpired()
      );
      console.log("🔐 Auth status:", {
        authenticated,
        hasToken: !!token,
        hasUser: !!user,
        isExpired: this.isTokenExpired(),
      });

      return authenticated;
    } catch (error) {
      console.error("❌ Greška pri provjeri autentikacije:", error);
      return false;
    }
  },

  isTokenExpired() {
    const token = this.getToken();
    if (!token) {
      console.log("⚠️ Nema tokena za provjeru");
      return true;
    }

    // 🆕 DEVELOPMENT MODE: Fake tokeni su uvijek validni
    if (import.meta.env.DEV && token.startsWith('fake-jwt-token-')) {
      console.log('🔧 DEV MODE: Fake token - treating as valid');
      return false;
    }

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const isExpired = payload.exp * 1000 < Date.now();

      if (isExpired) {
        console.log(
          "⚠️ Token je istekao:",
          new Date(payload.exp * 1000).toLocaleString("hr-HR")
        );
        this.clearAuth();
      } else {
        console.log(
          "✅ Token je validan do:",
          new Date(payload.exp * 1000).toLocaleString("hr-HR")
        );
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
      const token = this.getToken();
      if (token && !this.isTokenExpired()) {
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        console.log("🔐 Auth inicijaliziran iz localStorage");
        return true;
      } else {
        console.log("🔐 Nema validnog tokena za inicijalizaciju");
        this.clearAuth();
        return false;
      }
    } catch (error) {
      console.error("❌ Greška pri inicijalizaciji auth:", error);
      this.clearAuth();
      return false;
    }
  },

  // Provjera admin role
  isAdmin() {
    const user = this.getUser();
    return user?.role === "admin";
  },

  // Provjera email verifikacije
  isEmailVerified() {
    const user = this.getUser();
    return user?.email_verified === true;
  },

  // Dodatna helper metoda za debug
  getAuthInfo() {
    return {
      hasToken: !!this.getToken(),
      hasUser: !!this.getUser(),
      isAuthenticated: this.isAuthenticated(),
      isTokenExpired: this.isTokenExpired(),
      isAdmin: this.isAdmin(),
      isEmailVerified: this.isEmailVerified(),
      user: this.getUser(),
      tokenPreview: this.getToken()
        ? `${this.getToken().substring(0, 20)}...`
        : null,
    };
  },
};

// Request interceptor za automatsko dodavanje tokena
api.interceptors.request.use(
  (config) => {
    const token = authHelper.getToken();

    // 🆕 DEVELOPMENT MODE: Poseban tretman za fake tokene
    const isDevFakeToken = import.meta.env.DEV && token && token.startsWith('fake-jwt-token-');
    
    if (token && (!authHelper.isTokenExpired() || isDevFakeToken)) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(`🚀 ${config.method?.toUpperCase()} ${config.url} [AUTH]`);
    } else {
      console.log(`🚀 ${config.method?.toUpperCase()} ${config.url} [NO AUTH]`);

      // Ako je token istekao, očistimo ga (osim ako nije dev fake token)
      if (token && authHelper.isTokenExpired() && !isDevFakeToken) {
        authHelper.clearAuth();
      }
    }

    // Log samo osnovne informacije za sigurnost
    console.log(`📤 Request: ${config.method?.toUpperCase()} ${config.url}`, {
      hasData: !!config.data,
      hasParams: !!config.params,
    });

    return config;
  },
  (error) => {
    console.error("❌ Request error:", error);
    return Promise.reject({
      ...error,
      userMessage: "Problem s mrežnom vezom. Provjerite internetsku vezu.",
    });
  }
);

// Response interceptor za handling grešaka
api.interceptors.response.use(
  (response) => {
    console.log(
      `✅ ${response.config.method?.toUpperCase()} ${response.config.url}: ${
        response.status
      }`
    );
    return response;
  },
  (error) => {
    const url = error.config?.url;
    const method = error.config?.method;
    const status = error.response?.status;
    const message = error.response?.data?.error || error.message;
    const errorCode = error.response?.data?.code;

    console.error(`❌ API Error ${status} [${method?.toUpperCase()} ${url}]:`, {
      message,
      code: errorCode,
      userMessage: error.response?.data?.error || "Došlo je do greške",
    });

    // Automatski logout ako je token invalid (osim za dev fake tokene)
    if (status === 401) {
      const token = authHelper.getToken();
      const isDevFakeToken = import.meta.env.DEV && token && token.startsWith('fake-jwt-token-');
      
      if (!isDevFakeToken) {
        console.log("🔐 401 Unauthorized - clearing auth");
        authHelper.clearAuth();

        // Redirect na login samo ako nismo već na login stranici
        const currentPath = window.location.pathname + window.location.search;
        if (
          !currentPath.includes("login") &&
          !currentPath.includes("auth=login")
        ) {
          console.log("🔄 Redirecting to login...");
          setTimeout(() => {
            window.location.href = "/?auth=login&message=session_expired";
          }, 1500);
        }
      }
    }

    // Kreiraj user-friendly poruku
    let userMessage = "Došlo je do greške. Pokušajte ponovno.";

    if (!error.response) {
      userMessage = "Problem s mrežnom vezom. Provjerite internetsku vezu.";
    } else if (status >= 500) {
      userMessage = "Server trenutno nije dostupan. Pokušajte ponovno kasnije.";
    } else if (status === 404) {
      userMessage = "Traženi resurs nije pronađen.";
    } else if (status === 403) {
      userMessage = "Nemate dovoljne privilegije za ovu akciju.";
    } else if (message) {
      userMessage = message;
    }

    // Proslijedi poboljšani error
    return Promise.reject({
      ...error,
      userMessage,
      errorCode,
      originalMessage: message,
    });
  }
);

// CLIENT API FUNKCIONALNOSTI
const clientAPI = {
  // Get all clients
  async getClients(params = {}) {
    try {
      const response = await api.get("/api/clients", { params });
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri dohvaćanju klijenata:", error);
      throw error;
    }
  },

  // Get client by ID
  async getClient(clientId) {
    try {
      const response = await api.get(`/api/clients/${clientId}`);
      return response.data;
    } catch (error) {
      console.error(`❌ Greška pri dohvaćanju klijenta ${clientId}:`, error);
      throw error;
    }
  },

  // Create client
  async createClient(clientData) {
    try {
      const response = await api.post("/api/clients", clientData);
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri kreiranju klijenta:", error);
      throw error;
    }
  },

  // Update client
  async updateClient(clientId, clientData) {
    try {
      const response = await api.put(`/api/clients/${clientId}`, clientData);
      return response.data;
    } catch (error) {
      console.error(`❌ Greška pri ažuriranju klijenta ${clientId}:`, error);
      throw error;
    }
  },

  // Delete client
  async deleteClient(clientId) {
    try {
      const response = await api.delete(`/api/clients/${clientId}`);
      return response.data;
    } catch (error) {
      console.error(`❌ Greška pri brisanju klijenta ${clientId}:`, error);
      throw error;
    }
  },

  // Get client stats
  async getClientStats() {
    try {
      const response = await api.get("/api/clients/stats");
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri dohvaćanju statistike klijenata:", error);
      throw error;
    }
  },

  // Get notes count per client
  async getNotesCountPerClient() {
    try {
      const response = await api.get("/api/clients/notes-count");
      return response.data;
    } catch (error) {
      console.error(
        "❌ Greška pri dohvaćanju broja bilješki po klijentu:",
        error
      );
      throw error;
    }
  },
};

// NOTES API FUNKCIONALNOSTI
const notesAPI = {
  // Get all notes
  async getNotes(params = {}) {
    try {
      const response = await api.get("/api/notes", { params });
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri dohvaćanju bilješki:", error);
      throw error;
    }
  },

  // Get note by ID
  async getNote(noteId) {
    try {
      const response = await api.get(`/api/notes/${noteId}`);
      return response.data;
    } catch (error) {
      console.error(`❌ Greška pri dohvaćanju bilješke ${noteId}:`, error);
      throw error;
    }
  },

  // Create note
  async createNote(noteData) {
    try {
      const response = await api.post("/api/notes", noteData);
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri kreiranju bilješke:", error);
      throw error;
    }
  },

  // Update note
  async updateNote(noteId, noteData) {
    try {
      const response = await api.put(`/api/notes/${noteId}`, noteData);
      return response.data;
    } catch (error) {
      console.error(`❌ Greška pri ažuriranju bilješke ${noteId}:`, error);
      throw error;
    }
  },

  // DELETE NOTE
  async deleteNote(noteId) {
    try {
      console.log(`🗑️ API: Deleting note ${noteId}`);
      console.log(`🔍 Full URL: ${api.defaults.baseURL}/api/notes/${noteId}`);

      const response = await api.delete(`/api/notes/${noteId}`);
      console.log(`✅ API: Note ${noteId} deleted successfully`);
      return response.data;
    } catch (error) {
      console.error(`❌ API Error deleting note ${noteId}:`, error);
      throw error;
    }
  },
};

// ADMIN API FUNKCIONALNOSTI
const adminAPI = {
  // User Management - OSNOVNE OPERACIJE
  async getUsers(params = {}) {
    try {
      console.log("🔧 [adminAPI] Getting users...");
      console.log("🔐 [adminAPI] Auth info:", authHelper.getAuthInfo());

      const response = await api.get("/api/admin/users", { params });
      console.log("✅ [adminAPI] Users fetched successfully");
      return response.data;
    } catch (error) {
      console.error("❌ [adminAPI] Error fetching users:", error);
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

  async deleteUser(userId) {
    try {
      const response = await api.delete(`/api/admin/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri brisanju korisnika:", error);
      throw error;
    }
  },

  async getUserById(userId) {
    try {
      console.log("🔧 [adminAPI] Getting user by ID:", userId);
      console.log("🔐 [adminAPI] Auth info:", authHelper.getAuthInfo());

      const response = await api.get(`/api/admin/users/${userId}`);
      console.log("✅ [adminAPI] User fetched successfully:", response.data);
      return response.data;
    } catch (error) {
      console.error(`❌ [adminAPI] Error fetching user ${userId}:`, error);
      throw error;
    }
  },

  async getUserDetails(userId) {
    try {
      const response = await api.get(`/api/admin/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri dohvaćanju detalja korisnika:", error);
      throw error;
    }
  },

  // RESET USER PASSWORD - ADMIN FUNKCIJA
  resetUserPassword: async (passwordData) => {
    try {
      console.log("📡 [API] Sending password reset request:", passwordData);
      const response = await api.post(
        "/api/admin/users/reset-password",
        passwordData
      );
      console.log("✅ [API] Password reset response:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ [API] Password reset failed:", error);
      throw error;
    }
  },

  // User Activation Management
  async resendActivation(userId) {
    try {
      console.log("🔧 [adminAPI] Resending activation for user:", userId);
      const response = await api.post(
        `/api/admin/users/${userId}/resend-activation`
      );
      return response.data;
    } catch (error) {
      console.error(
        "❌ Greška pri ponovnom slanju aktivacijskog emaila:",
        error
      );
      throw error;
    }
  },

  // Status Management
  async deactivateUser(userId) {
    try {
      const response = await api.put(`/api/admin/users/${userId}`, {
        status: "inactive",
      });
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri deaktivaciji korisnika:", error);
      throw error;
    }
  },

  async activateUser(userId) {
    try {
      const response = await api.put(`/api/admin/users/${userId}`, {
        status: "active",
      });
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri aktivaciji korisnika:", error);
      throw error;
    }
  },

  // Admin Statistics
  async getStats() {
    try {
      const response = await api.get("/api/admin/stats");
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri dohvaćanju statistike:", error);
      throw error;
    }
  },

  // Test Email Service
  async testEmailService() {
    try {
      const response = await api.get("/api/admin/test-email");
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri testiranju email servisa:", error);
      throw error;
    }
  },

  // Health Check
  async healthCheck() {
    try {
      const response = await api.get("/api/admin/health");
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri health checku:", error);
      throw error;
    }
  },

  // Debug Routes
  async debugRoutes() {
    try {
      const response = await api.get("/api/admin/debug-routes");
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri dohvaćanju debug ruta:", error);
      throw error;
    }
  },
};

// AUTH API FUNKCIONALNOSTI
const authAPI = {
  // Login
  async login(credentials) {
    try {
      const response = await api.post("/api/auth/login", credentials);

      if (response.data.success && response.data.token) {
        authHelper.setAuth(response.data.token, response.data.user);
      }

      return response.data;
    } catch (error) {
      console.error("❌ Greška pri prijavi:", error);
      throw error;
    }
  },

  // Register (ako je potrebno)
  async register(userData) {
    try {
      const response = await api.post("/api/auth/register", userData);
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri registraciji:", error);
      throw error;
    }
  },

  // Account Activation
  async verifyAccount(activationData) {
    try {
      const response = await api.post(
        "/api/auth/verify-account",
        activationData
      );

      if (response.data.success && response.data.token) {
        authHelper.setAuth(response.data.token, response.data.user);
      }

      return response.data;
    } catch (error) {
      console.error("❌ Greška pri aktivaciji računa:", error);
      throw error;
    }
  },

  // Password Reset (opcionalno)
  async requestPasswordReset(email) {
    try {
      const response = await api.post("/api/auth/forgot-password", { email });
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri zahtjevu za reset lozinke:", error);
      throw error;
    }
  },

  async resetPassword(resetData) {
    try {
      const response = await api.post("/api/auth/reset-password", resetData);
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri resetiranju lozinke:", error);
      throw error;
    }
  },

  // Logout
  async logout() {
    try {
      const response = await api.post("/api/auth/logout");
      authHelper.clearAuth();
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri odjavi:", error);
      authHelper.clearAuth(); // Uvijek očistimo lokalno
      throw error;
    }
  },

  // Verify Token
  async verifyToken() {
    try {
      const response = await api.get("/api/auth/verify");
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri verifikaciji tokena:", error);
      throw error;
    }
  },

  // Magic Link Login (za email_only korisnike)
  async requestMagicLink(email) {
    try {
      const response = await api.post("/api/auth/magic-link", { email });
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri slanju magic linka:", error);
      throw error;
    }
  },

  // Verify Magic Link
  async verifyMagicLink(token) {
    try {
      const response = await api.post("/api/auth/verify-magic-link", { token });

      if (response.data.success && response.data.token) {
        authHelper.setAuth(response.data.token, response.data.user);
      }

      return response.data;
    } catch (error) {
      console.error("❌ Greška pri verifikaciji magic linka:", error);
      throw error;
    }
  },
};

// USER PROFILE API
const userAPI = {
  async getProfile() {
    try {
      const response = await api.get("/api/user/profile");
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri dohvaćanju profila:", error);
      throw error;
    }
  },

  async updateProfile(profileData) {
    try {
      const response = await api.put("/api/user/profile", profileData);

      // Ažuriraj lokalne podatke ako je uspješno
      if (response.data.success) {
        const currentUser = authHelper.getUser();
        const updatedUser = { ...currentUser, ...response.data.user };
        authHelper.setAuth(authHelper.getToken(), updatedUser);
      }

      return response.data;
    } catch (error) {
      console.error("❌ Greška pri ažuriranju profila:", error);
      throw error;
    }
  },

  async changePassword(passwordData) {
    try {
      const response = await api.put("/api/user/change-password", passwordData);
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri promjeni lozinke:", error);
      throw error;
    }
  },

  // User Activity Log
  async getActivityLog(params = {}) {
    try {
      const response = await api.get("/api/user/activity-log", { params });
      return response.data;
    } catch (error) {
      console.error("❌ Greška pri dohvaćanju aktivnosti:", error);
      throw error;
    }
  },
};

// Utility funkcije za često korištene operacije
const apiUtils = {
  // Brzi GET zahtjev sa error handlingom
  async safeGet(url, config = {}) {
    try {
      const response = await api.get(url, config);
      return response.data;
    } catch (error) {
      console.error(
        `❌ Safe GET error for ${url}:`,
        error.userMessage || error.message
      );
      throw error;
    }
  },

  // Brzi POST zahtjev sa error handlingom
  async safePost(url, data = {}, config = {}) {
    try {
      const response = await api.post(url, data, config);
      return response.data;
    } catch (error) {
      console.error(
        `❌ Safe POST error for ${url}:`,
        error.userMessage || error.message
      );
      throw error;
    }
  },

  // Brzi PUT zahtjev sa error handlingom
  async safePut(url, data = {}, config = {}) {
    try {
      const response = await api.put(url, data, config);
      return response.data;
    } catch (error) {
      console.error(
        `❌ Safe PUT error for ${url}:`,
        error.userMessage || error.message
      );
      throw error;
    }
  },

  // Brzi DELETE zahtjev sa error handlingom
  async safeDelete(url, config = {}) {
    try {
      const response = await api.delete(url, config);
      return response.data;
    } catch (error) {
      console.error(
        `❌ Safe DELETE error for ${url}:`,
        error.userMessage || error.message
      );
      throw error;
    }
  },

  // Provjera da li je backend dostupan
  async healthCheck() {
    try {
      const response = await api.get("/api/health");
      return response.status === 200;
    } catch (error) {
      console.error("❌ Health check failed:", error.message);
      return false;
    }
  },

  // Batch operations helper
  async batchOperation(operations) {
    try {
      const results = [];
      for (const operation of operations) {
        try {
          const result = await api(operation);
          results.push({ success: true, data: result.data });
        } catch (error) {
          results.push({
            success: false,
            error: error.userMessage || error.message,
          });
        }
      }
      return results;
    } catch (error) {
      console.error("❌ Batch operation error:", error);
      throw error;
    }
  },
};

// Globalna funkcija za debug auth stanja
const debugAuth = () => {
  const authInfo = authHelper.getAuthInfo();
  console.group("🔐 Auth Debug Info");
  console.log("Authenticated:", authInfo.isAuthenticated);
  console.log("Has Token:", authInfo.hasToken);
  console.log("Has User:", authInfo.hasUser);
  console.log("Token Expired:", authInfo.isTokenExpired);
  console.log("Is Admin:", authInfo.isAdmin);
  console.log("Email Verified:", authInfo.isEmailVerified);
  console.log("User:", authInfo.user);
  console.log("Token Preview:", authInfo.tokenPreview);
  console.groupEnd();
  return authInfo;
};

// Inicijaliziraj auth pri učitavanju
if (typeof window !== "undefined") {
  // Dodaj malu odgodu da se osiguramo da je localStorage dostupan
  setTimeout(() => {
    authHelper.initializeAuth();
  }, 100);
}

// JEDINSTVENI EXPORT
export default api;
export {
  clientAPI,
  notesAPI,
  adminAPI,
  authAPI,
  userAPI,
  apiUtils,
  debugAuth,
  authHelper,
};

// Koji k ova skripta radi? Shit moram prestati pisati kod i piti xD
//
// Ova skripta je centralni hub za sve API komunikacije u CRM sustavu.
// Radi sljedeće:
// 1. Konfigurira axios instancu sa base URL-om (localhost:8888 za development)
// 2. Upravlja autentikacijom (tokeni, localStorage, auto-logout)
// 3. Implementira sve API endpointove organizirane po modulima:
//    - adminAPI: Upravljanje korisnicima, statistike, email testovi
//    - authAPI: Login, registracija, password reset, magic link
//    - clientAPI: Upravljanje klijentima
//    - notesAPI: Upravljanje bilješkama
//    - userAPI: User profil i aktivnosti
// 4. Dodaje interceptore za automatsko dodavanje tokena i error handling
// 5. Pruža utility funkcije za česte operacije
//
// TL;DR: Ovo je mozak koji spaja frontend s backendom i pazi da se ne polomi kad netko zaboravi token.
// I da, trebao bih prestati pisati kod nakon pive... ali eto, radi! 🍻
