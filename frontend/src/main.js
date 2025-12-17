import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './style.css'
import { authHelper } from './services/api'

// Komponente
import HomePage from './components/HomePage.vue'
import AuthManager from './components/AuthManager.vue'
import Dashboard from './components/Dashboard.vue'
import Activation from './components/Activation.vue'
import ChangePassword from './components/ChangePassword.vue'

// Router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: HomePage,
      meta: { 
        title: 'Početna - CRM Sustav', 
        public: true 
      }
    },
    {
      path: '/login',
      name: 'Login', 
      component: AuthManager,
      props: { initialView: 'login' },
      meta: { 
        requiresGuest: true,
        title: 'Prijava - CRM Sustav',
        public: true
      }
    },
    {
      path: '/register',
      name: 'Register',
      component: AuthManager,
      props: { initialView: 'register' },
      meta: { 
        requiresGuest: true,
        title: 'Registracija - CRM Sustav',
        public: true
      }
    },
    {
      path: '/activate',
      name: 'Activation',
      component: Activation,
      meta: { 
        requiresGuest: true,
        title: 'Aktivacija Računa',
        public: true
      }
    },
    {
      path: '/change-password',
      name: 'ChangePassword',
      component: ChangePassword,
      meta: { 
        title: 'Promjena Lozinke - CRM Sustav',
        public: true
      }
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: Dashboard,
      meta: { 
        requiresAuth: true,
        title: 'Dashboard - CRM Sustav'
      }
    },
    {
      path: '/admin',
      name: 'Admin',
      component: () => import('./components/admin/AdminLayout.vue'),
      meta: { 
        requiresAuth: true,
        requiresAdmin: true,
        title: 'Admin Panel - CRM Sustav'
      },
      children: [
        {
          path: '',
          name: 'AdminDashboard',
          component: () => import('./components/admin/AdminDashboard.vue'),
          meta: { title: 'Admin Dashboard' }
        },
        {
          path: 'users',
          name: 'UserManagement',
          component: () => import('./components/admin/UserManagement.vue'),
          meta: { title: 'Upravljanje Korisnicima' }
        },
        {
          path: 'users/create',
          name: 'CreateUser',
          component: () => import('./components/admin/CreateUserForm.vue'),
          meta: { title: 'Dodaj Novog Korisnika' }
        },
        {
          path: 'users/:id/edit',
          name: 'EditUser',
          component: () => import('./components/admin/EditUserForm.vue'),
          meta: { title: 'Uredi Korisnika' }
        },
        {
          path: 'settings',
          name: 'AdminSettings',
          component: () => import('./components/admin/AdminSettings.vue'),
          meta: { title: 'Admin Postavke' }
        }
      ]
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
})

// 🔴 POBOLJŠANI Navigation guard - FIXED ACTIVATION FLOW
router.beforeEach(async (to, from, next) => {
  console.log('🛡️ Route guard activated:', {
    route: to.name,
    path: to.path,
    query: to.query,
    meta: to.meta
  })
  
  // 📌 1. HANDLE ACTIVATION LINKS - FIXED!
  // Kada korisnik klikne na aktivacijski link iz emaila
  if (to.query.token && to.query.email && to.path !== '/activate') {
    console.log('🔗 Activation link detected, redirecting to /activate');
    
    // Redirect na /activate stranicu koja će rukovati aktivacijom
    return next({
      path: '/activate',
      query: to.query
    });
  }
  
  // 📌 2. AUTO-LOGIN HANDLING (iz druge skripte - poboljšano)
  const hasAutoLogin = to.query.autoLogin === 'true';
  const hasToken = to.query.token;
  const hasEmail = to.query.email;
  
  if (hasAutoLogin && hasToken && hasEmail) {
    console.log('🔐 Auto-login detected:', {
      email: to.query.email,
      requires_password_change: to.query.requires_password_change,
      initial_setup: to.query.initial_setup
    });
    
    try {
      // Spremi token i osnovne podatke
      authHelper.setAuth(to.query.token, {
        email: to.query.email,
        email_verified: to.query.verified === 'true',
        requires_password_change: to.query.requires_password_change === 'true' || to.query.initial_setup === 'true',
        role: 'user'
      });
      
      // Očisti URL parametre
      window.history.replaceState({}, document.title, window.location.pathname);
      
      const user = authHelper.getUser();
      
      // Ako korisnik treba promijeniti lozinku
      if (user?.requires_password_change === true) {
        console.log('🔐 Auto-login: Password change required');
        return next({
          path: '/change-password',
          query: {
            required: 'true',
            initial_setup: to.query.initial_setup || 'true'
          }
        });
      }
      
      // Ako je lozinka već promijenjena, redirect po role
      const redirectPath = user?.role === 'admin' ? '/admin' : '/dashboard';
      console.log(`🔄 Auto-login redirect to: ${redirectPath}`);
      return next(redirectPath);
      
    } catch (error) {
      console.error('❌ Auto-login processing error:', error);
      authHelper.clearAuth();
      return next('/login?error=auto_login_failed');
    }
  }
  
  // 📌 3. STANDARD AUTH CHECKS
  const isAuthenticated = authHelper.isAuthenticated();
  const user = authHelper.getUser();
  const isAdmin = user?.role === 'admin';
  const requiresPasswordChange = user?.requires_password_change === true;
  
  console.log('🔐 Current auth status:', {
    isAuthenticated,
    userRole: user?.role,
    isAdmin,
    requiresPasswordChange,
    userEmail: user?.email
  });
  
  // Postavi naslov stranice
  if (to.meta.title) {
    document.title = to.meta.title;
  }
  
  // 📌 4. PUBLIC ROUTES - pristup svima
  if (to.meta.public === true) {
    console.log('🔓 Public route access granted:', to.path);
    
    // Poseban slučaj za change-password
    if (to.path === '/change-password') {
      const queryRequired = to.query.required === 'true';
      const queryFromActivation = to.query.from_activation === 'true';
      
      // Ako je required password change i korisnik je autenticiran
      if ((queryRequired || queryFromActivation) && isAuthenticated) {
        console.log('✅ Required password change - allowing access');
        return next();
      }
      
      // Ako je from_activation, dozvoli pristup čak i ako korisnik nije autenticiran
      // (korisnik može biti tek aktiviran i još nema session)
      if (queryFromActivation) {
        console.log('✅ From activation flow - allowing access');
        return next();
      }
      
      // Ako je public access ali korisnik je već autenticiran i ne treba mijenjati lozinku
      if (isAuthenticated && !requiresPasswordChange) {
        console.log('🔄 User authenticated and no password change needed, redirecting...');
        return next(isAdmin ? '/admin' : '/dashboard');
      }
    }
    
    // Poseban slučaj za /activate stranicu
    if (to.path === '/activate') {
      console.log('✅ Activation page - allowing access');
      return next();
    }
    
    return next();
  }
  
  // 📌 5. AUTHENTICATION REQUIRED
  if (!isAuthenticated && to.meta.requiresAuth) {
    console.log('🔐 Authentication required, redirecting to login');
    
    // Spremi trenutnu destinaciju za redirect nakon prijave
    localStorage.setItem('loginRedirect', to.fullPath || to.path);
    
    return next({
      path: '/login',
      query: {
        redirect: to.fullPath || to.path,
        message: 'login_required'
      }
    });
  }
  
  // Sada smo sigurni da je korisnik autenticiran
  
  // 📌 6. PASSWORD CHANGE ENFORCEMENT
  if (requiresPasswordChange && to.path !== '/change-password') {
    console.log('🔐 PASSWORD CHANGE REQUIRED: User needs to change password, redirecting...');
    
    // Spremi trenutnu destinaciju za redirect nakon promjene
    if (to.path !== '/' && to.path !== '/login' && to.path !== '/activate') {
      localStorage.setItem('pendingRedirect', to.fullPath || to.path);
      console.log('📍 Saved redirect path:', to.fullPath || to.path);
    }
    
    return next({
      path: '/change-password',
      query: {
        required: 'true',
        redirect: to.fullPath || to.path,
        from_activation: to.path === '/activate' ? 'true' : undefined
      }
    });
  }
  
  // 📌 7. Ako je na change-password stranici ali NE treba promijeniti lozinku
  if (to.path === '/change-password' && !requiresPasswordChange) {
    console.log('🔐 No password change required, checking for redirect...');
    
    // Provjeri redirect iz query parametra
    const redirectQuery = to.query.redirect;
    if (redirectQuery && redirectQuery !== '/change-password') {
      console.log('🔄 Redirecting based on query parameter:', redirectQuery);
      localStorage.removeItem('pendingRedirect');
      return next(redirectQuery);
    }
    
    // Inače redirect na dashboard/admin
    const pendingRedirect = localStorage.getItem('pendingRedirect');
    let redirectPath;
    
    if (pendingRedirect) {
      redirectPath = pendingRedirect;
      localStorage.removeItem('pendingRedirect');
    } else {
      redirectPath = isAdmin ? '/admin' : '/dashboard';
    }
    
    console.log('🔄 Redirecting to:', redirectPath);
    return next(redirectPath);
  }
  
  // 📌 8. Ako je autenticiran i pokušava pristupiti guest stranicama
  if (isAuthenticated && (to.path === '/login' || to.path === '/register')) {
    console.log('🔐 Already authenticated, redirecting...');
    
    if (requiresPasswordChange) {
      return next({
        path: '/change-password',
        query: { required: 'true' }
      });
    }
    
    return next(isAdmin ? '/admin' : '/dashboard');
  }
  
  // 📌 9. Poseban slučaj: Ako je autenticiran i na /activate stranici
  // To je OK - možda je već aktiviran ali još nije postavio lozinku
  if (isAuthenticated && to.path === '/activate') {
    console.log('🔐 User authenticated on activation page');
    
    // Ako treba promijeniti lozinku, redirect
    if (requiresPasswordChange) {
      return next({
        path: '/change-password',
        query: { required: 'true', from_activation: 'true' }
      });
    }
    
    // Inače nastavi na activation stranicu
    return next();
  }
  
  // 📌 10. ADMIN AUTHORIZATION
  if (to.meta.requiresAdmin && !isAdmin) {
    console.log('🚫 Admin access denied - redirecting to dashboard');
    return next('/dashboard');
  }
  
  // 📌 11. REDIRECT LOGIC BASED ON ROLE
  if (isAuthenticated && isAdmin && to.path === '/dashboard') {
    console.log('⏩ Admin accessing dashboard, redirecting to admin');
    return next('/admin');
  }
  
  if (isAuthenticated && !isAdmin && to.path.startsWith('/admin')) {
    console.log('⛔ Non-admin accessing admin area, redirecting to dashboard');
    return next('/dashboard');
  }
  
  // 📌 12. ADMIN AREA PROTECTION (dodatna provjera)
  if (to.path.startsWith('/admin') && to.meta.requiresAdmin) {
    if (!isAdmin) {
      console.log('🚫 Not an admin, redirecting to dashboard');
      return next('/dashboard');
    }
    
    console.log('✅ Admin access granted for:', to.path);
    return next();
  }
  
  // 📌 13. AKTIVACIJA S BEKENDA (kada backend redirecta sa tokenom)
  // Ovo je slučaj kada backend redirecta na /activate?token=...&email=...
  // To je OK, ne treba ništa mijenjati
  if (to.path === '/activate' && to.query.token && to.query.email) {
    console.log('🎯 Backend activation redirect detected');
    console.log('   Token present:', !!to.query.token);
    console.log('   Email:', to.query.email);
    console.log('   Success:', to.query.success);
    
    // Pusti da Activation.vue komponenta rukuje ovim
    return next();
  }
  
  // Sve OK, nastavi
  console.log('✅ Route guard passed for:', to.path);
  next();
});

// Kreiraj aplikaciju
const app = createApp(App)
app.use(createPinia())
app.use(router)

// 🔧 DEV DEBUG - kombinacija najboljih alata
if (import.meta.env.DEV) {
  window.router = router;
  window.authHelper = authHelper;
  
  // Debug funkcije
  window.debugAuthState = () => {
    const user = authHelper.getUser();
    const authToken = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    console.log('🔍 DEBUG AUTH STATE:');
    console.log('📦 LocalStorage authToken:', authToken ? 'PRESENT' : 'MISSING');
    console.log('📦 LocalStorage userData:', userData);
    console.log('👤 authHelper.getUser():', user);
    console.log('🔐 requires_password_change:', user?.requires_password_change);
    console.log('📍 Current URL:', window.location.href);
    console.log('📋 Current route:', router.currentRoute.value);
    console.log('---');
  };
  
  window.showRoutes = () => {
    const routes = router.getRoutes();
    console.log('🛣️ Total routes:', routes.length);
    routes.forEach(route => {
      console.log(`📌 ${route.name}: ${route.path} (public: ${route.meta?.public || false})`);
      if (route.children && route.children.length > 0) {
        console.log('   Children:');
        route.children.forEach(child => {
          console.log(`   - ${child.name}: ${child.path}`);
        });
      }
    });
  };
  
  window.simulatePasswordChangeRequired = () => {
    console.log('🧪 Simulating password change required...');
    const user = authHelper.getUser();
    if (user) {
      authHelper.updateUserData({
        requires_password_change: true
      });
      console.log('✅ Password change flag set to true');
      window.location.reload();
    } else {
      console.log('❌ No user found, please login first');
    }
  };
  
  window.clearPasswordChangeFlag = () => {
    console.log('🧹 Clearing password change flag...');
    authHelper.updateUserData({
      requires_password_change: false
    });
    localStorage.removeItem('pendingRedirect');
    console.log('✅ Password change flag cleared');
    window.location.reload();
  };
  
  window.testActivationFlow = async () => {
    console.log('🧪 Testing activation flow...');
    
    // Simuliraj activation success sa mock podacima
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NjU5MjUwMDAsImV4cCI6MTc2NjAxMTQwMH0.mock-signature';
    const mockEmail = 'test@example.com';
    
    console.log('🔗 Simulating activation link click...');
    
    // Redirect na /activate sa mock podacima
    router.push({
      path: '/activate',
      query: {
        token: mockToken,
        email: mockEmail,
        success: 'true',
        requires_password_change: 'true'
      }
    });
  };
  
  window.testPasswordResetFlow = async () => {
    console.log('🧪 Testing password reset flow...');
    
    const mockToken = 'abc123def456ghi789jkl012mno345pqr678stu901';
    const mockEmail = 'reset@example.com';
    
    console.log('🔗 Simulating password reset link click...');
    
    // Redirect na /change-password sa reset tokenom
    router.push({
      path: '/change-password',
      query: {
        token: mockToken,
        email: mockEmail
      }
    });
  };
  
  window.simulateFreshUserActivation = () => {
    console.log('🧪 Simulating fresh user activation (no auth data)...');
    
    // Očisti sve auth podatke
    authHelper.clearAuth();
    localStorage.clear();
    
    console.log('✅ All auth data cleared');
    console.log('🔗 Now try clicking an activation link or use testActivationFlow()');
  };
  
  // EMERGENCY FIX FUNKCIJA
  window.fixRedirectLoopNow = () => {
    console.log('🔧 EMERGENCY FIX: Fixing redirect loop...');
    
    // 1. Očisti sve redirect flagove
    localStorage.removeItem('pendingRedirect');
    localStorage.removeItem('loginRedirect');
    
    // 2. Provjeri i ispravi user data
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        console.log('👤 Current user data:', user);
        
        // Ako je requires_password_change true, postavi na false
        if (user.requires_password_change === true) {
          user.requires_password_change = false;
          localStorage.setItem('userData', JSON.stringify(user));
          console.log('✅ Fixed: requires_password_change set to false');
        }
      } catch (e) {
        console.error('Error parsing userData:', e);
      }
    }
    
    // 3. Očisti URL parametre
    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
    
    console.log('✅ URL cleaned:', cleanUrl);
    console.log('🔄 Force refreshing page...');
    window.location.reload();
  };
  
  window.debugActivationQuery = () => {
    const query = router.currentRoute.value.query;
    console.log('🔍 Current activation query params:');
    console.log('   Token:', query.token ? query.token.substring(0, 20) + '...' : 'Missing');
    console.log('   Email:', query.email || 'Missing');
    console.log('   Success:', query.success || 'Missing');
    console.log('   requires_password_change:', query.requires_password_change || 'Missing');
    console.log('   Full query:', query);
  };
  
  console.log('🔧 Development mode - debug commands available:');
  console.log('  debugAuthState() - Show current auth state');
  console.log('  debugActivationQuery() - Show activation query params');
  console.log('  showRoutes() - List all routes');
  console.log('  simulatePasswordChangeRequired() - Test password change flow');
  console.log('  clearPasswordChangeFlag() - Clear password change flag');
  console.log('  testActivationFlow() - Test activation → password change flow');
  console.log('  testPasswordResetFlow() - Test password reset flow');
  console.log('  simulateFreshUserActivation() - Clear all data and simulate new user');
  console.log('  fixRedirectLoopNow() - EMERGENCY fix for redirect loop');
}

// 🔐 Startup initialization
setTimeout(() => {
  console.log('🚀 App startup initialization...');
  
  // Provjeri da li korisnik treba promijeniti lozinku
  const user = authHelper.getUser();
  const currentPath = window.location.pathname;
  const searchParams = new URLSearchParams(window.location.search);
  
  console.log('🔍 Startup check:', {
    currentPath,
    hasUser: !!user,
    requiresPasswordChange: user?.requires_password_change,
    query: Object.fromEntries(searchParams.entries())
  });
  
  // Očisti stare redirect flagove
  localStorage.removeItem('loginRedirect');
  
  // Ako postoji pendingRedirect ali smo već na toj stranici, očisti ga
  const pendingRedirect = localStorage.getItem('pendingRedirect');
  if (pendingRedirect === currentPath) {
    localStorage.removeItem('pendingRedirect');
    console.log('🧹 Cleared pendingRedirect matching current path');
  }
  
  // Ako korisnik treba promijeniti lozinku, ali nije na change-password stranici
  // OVO SADA RUKUJE ROUTER GUARD, NE TREBA OVDJE
  
  // Poseban slučaj: Ako smo na /activate stranici, logujemo to
  if (currentPath === '/activate') {
    console.log('🎯 On activation page - letting Activation.vue handle the flow');
  }
  
}, 100);

// Globalna error handling
router.onError((error) => {
  console.error('💥 Router error:', error);
  
  // Ako je ChunkLoadError (obično kad se komponenta ne može učitati)
  if (error.name === 'ChunkLoadError') {
    console.error('❌ Chunk load error - možda komponenta ne postoji');
    console.error('   Route:', router.currentRoute.value);
    console.error('   Trying to load:', error.request);
    
    // Redirect na početnu stranicu
    router.push('/').then(() => {
      window.location.reload();
    });
  }
});

app.mount('#app')

console.log('🚀 CRM App started successfully!');
console.log('🔐 Initial auth status:', authHelper.getAuthInfo());