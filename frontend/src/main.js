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
      meta: { title: 'Početna - CRM Sustav', public: true }
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
        public: true // DODANO: Change-password je public jer ga možda treba guest
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

// Debug funkcija
const debugAuthState = () => {
  const user = authHelper.getUser();
  const authToken = localStorage.getItem('authToken');
  const userData = localStorage.getItem('userData');
  
  console.log('🔍 DEBUG AUTH STATE:');
  console.log('📦 LocalStorage authToken:', authToken ? 'PRESENT' : 'MISSING');
  console.log('📦 LocalStorage userData:', userData);
  console.log('👤 authHelper.getUser():', user);
  console.log('🔐 requires_password_change:', user?.requires_password_change);
  console.log('📍 Current URL:', window.location.href);
  console.log('---');
};

// ISPRAVLJENI Navigation guard
router.beforeEach((to, from, next) => {
  console.log('🛡️ Route guard:', to.name, 'Path:', to.path, 'FullPath:', to.fullPath)
  
  // Provjeri auth status
  const isAuthenticated = authHelper.isAuthenticated();
  const user = authHelper.getUser();
  const isAdmin = user?.role === 'admin';
  const requiresPasswordChange = user?.requires_password_change === true;
  
  console.log('🔍 Route guard auth check:', {
    isAuthenticated,
    userRole: user?.role,
    isAdmin,
    requiresPasswordChange,
    user: user ? { 
      id: user.id, 
      email: user.email, 
      display_name: user.display_name,
      requires_password_change: user.requires_password_change 
    } : null
  });
  
  // PRIORITET 1: Public rute - pristup svima
  if (to.meta.public === true) {
    console.log('🔓 Public route access granted:', to.path);
    
    // Ako je na change-password stranici, provjeri je li required
    if (to.path === '/change-password') {
      const queryRequired = to.query.required === 'true';
      console.log('🔐 Change-password page, query required:', queryRequired);
      
      // Ako je required change, dopusti pristup
      if (queryRequired) {
        console.log('✅ Required password change - allowing access');
        return next();
      }
      
      // Ako nije required change, provjeri auth
      if (isAuthenticated && !requiresPasswordChange) {
        console.log('🔄 User authenticated and no password change needed, redirecting...');
        const redirectPath = isAdmin ? '/admin' : '/dashboard';
        return next(redirectPath);
      }
    }
    
    if (to.meta.title) {
      document.title = to.meta.title;
    }
    return next();
  }
  
  // PRIORITET 2: Ako NIJE autenticiran i pokušava pristupiti zaštićenoj ruti
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
  
  // PRIORITET 3: Ako korisnik treba promijeniti lozinku
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
        redirect: to.fullPath || to.path 
      }
    });
  }
  
  // PRIORITET 4: Ako je na change-password stranici ali NE treba promijeniti lozinku
  if (to.path === '/change-password' && !requiresPasswordChange) {
    console.log('🔐 No password change required, redirecting...');
    
    // Očisti flag ako postoji u query-u
    if (to.query.required === 'true') {
      console.log('🔄 Clearing password change flag from query');
    }
    
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
  
  // PRIORITET 5: Ako je autenticiran i pokušava pristupiti login/register stranici
  if (isAuthenticated && (to.path === '/login' || to.path === '/register' || to.path === '/activate')) {
    console.log('🔐 Already authenticated, redirecting...');
    
    if (requiresPasswordChange) {
      return next({
        path: '/change-password',
        query: { required: 'true' }
      });
    }
    
    return next(isAdmin ? '/admin' : '/dashboard');
  }
  
  // PRIORITET 6: Ako je admin i pokušava pristupiti dashboardu
  if (isAuthenticated && isAdmin && to.path === '/dashboard') {
    console.log('⏩ Admin accessing dashboard, redirecting to admin');
    return next('/admin');
  }
  
  // PRIORITET 7: Ako nije admin i pokušava pristupiti admin panelu
  if (isAuthenticated && !isAdmin && to.path.startsWith('/admin')) {
    console.log('⛔ Non-admin accessing admin area, redirecting to dashboard');
    return next('/dashboard');
  }
  
  // Auto-login handling
  if (to.query.autoLogin === 'true' && to.query.token && to.query.email) {
    try {
      console.log('🔐 Auto-login detected');
      
      authHelper.setAuth(to.query.token, {
        email: to.query.email,
        email_verified: to.query.verified === 'true',
        role: 'user'
      });
      
      // Očisti URL od query parametara
      window.history.replaceState({}, '', window.location.pathname);
      
      const updatedUser = authHelper.getUser();
      if (updatedUser?.requires_password_change === true) {
        console.log('🔐 Auto-login: Password change required');
        return next({
          path: '/change-password',
          query: { required: 'true' }
        });
      }
      
      const updatedIsAdmin = updatedUser?.role === 'admin';
      return next(updatedIsAdmin ? '/admin' : '/dashboard');
    } catch (error) {
      console.error('❌ Auto-login error:', error);
      return next('/login');
    }
  }
  
  // Admin area protection (dodatna provjera)
  if (to.path.startsWith('/admin') && to.meta.requiresAdmin) {
    if (!isAuthenticated) {
      return next('/login');
    }
    
    if (!isAdmin) {
      console.log('🚫 Not an admin, redirecting to dashboard');
      return next('/dashboard');
    }
    
    console.log('✅ Admin access granted for:', to.path);
    next();
    return;
  }
  
  // Postavi naslov
  if (to.meta.title) {
    document.title = to.meta.title;
  }
  
  // Sve OK, nastavi
  console.log('✅ Route guard passed for:', to.path);
  next();
});

// Kreiraj aplikaciju
const app = createApp(App)
app.use(createPinia())
app.use(router)

// Dev debug
if (import.meta.env.DEV) {
  window.router = router
  window.authHelper = authHelper
  
  // Debug funkcije
  window.debugAuthState = debugAuthState;
  
  window.showRoutes = () => {
    const routes = router.getRoutes()
    console.log('🛣️ Total routes:', routes.length)
    routes.forEach(route => {
      console.log(`📌 ${route.name}: ${route.path} (public: ${route.meta?.public || false})`)
      if (route.children && route.children.length > 0) {
        console.log('   Children:')
        route.children.forEach(child => {
          console.log(`   - ${child.name}: ${child.path}`)
        })
      }
    })
  }
  
  window.goToAdminSettings = () => {
    console.log('🎯 Going to AdminSettings...')
    router.push({ name: 'AdminSettings' })
  }
  
  window.debugAuthFlow = () => {
    const user = authHelper.getUser();
    console.log('🔍 DEBUG AUTH FLOW:', {
      user: user ? {
        id: user.id,
        email: user.email,
        role: user.role,
        display_name: user.display_name,
        requires_password_change: user.requires_password_change
      } : null,
      isAuthenticated: authHelper.isAuthenticated(),
      requiresPasswordChange: user?.requires_password_change,
      pendingRedirect: localStorage.getItem('pendingRedirect'),
      loginRedirect: localStorage.getItem('loginRedirect'),
      currentPath: window.location.pathname,
      query: Object.fromEntries(new URLSearchParams(window.location.search))
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
      
      setTimeout(() => {
        router.push({
          path: '/change-password',
          query: { required: 'true', debug: 'true' }
        });
      }, 500);
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
    
    // 3. Force refresh
    console.log('🔄 Force refreshing page...');
    window.location.href = '/';
  };
  
  console.log('🔧 Debug commands available:');
  console.log('  debugAuthState() - Show current auth state');
  console.log('  showRoutes() - List all routes');
  console.log('  debugAuthFlow() - Debug auth flow');
  console.log('  simulatePasswordChangeRequired() - Test password change');
  console.log('  clearPasswordChangeFlag() - Clear password change flag');
  console.log('  fixRedirectLoopNow() - EMERGENCY fix for redirect loop');
}

// Dodatna inicijalizacija nakon mount
setTimeout(() => {
  console.log('🔐 App startup initialization...');
  
  // Provjeri da li korisnik treba promijeniti lozinku
  const user = authHelper.getUser();
  const currentPath = window.location.pathname;
  const searchParams = new URLSearchParams(window.location.search);
  const queryRequired = searchParams.get('required');
  const queryRedirect = searchParams.get('redirect');
  
  console.log('🔍 Startup check:', {
    currentPath,
    hasUser: !!user,
    requiresPasswordChange: user?.requires_password_change,
    queryRequired,
    queryRedirect
  });
  
  // Ako je korisnik na change-password sa required=true, ne radi ništa
  if (currentPath.includes('/change-password') && queryRequired === 'true') {
    console.log('✅ Already on change-password with required flag');
    return;
  }
  
  // Očisti stare redirect flagove
  localStorage.removeItem('loginRedirect');
  
  // Ako postoji pendingRedirect ali smo već na toj stranici, očisti ga
  const pendingRedirect = localStorage.getItem('pendingRedirect');
  if (pendingRedirect === currentPath) {
    localStorage.removeItem('pendingRedirect');
    console.log('🧹 Cleared pendingRedirect matching current path');
  }
}, 100);

app.mount('#app')

console.log('🚀 CRM App started')
console.log('🔐 Auth:', authHelper.getAuthInfo())