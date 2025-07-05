// Utility to completely clear authentication state
export const clearAllAuthData = () => {
  console.log('🧹 Clearing ALL authentication data...');

  // Clear localStorage
  localStorage.removeItem('authToken');
  localStorage.removeItem('userRole');
  localStorage.removeItem('user');

  // Clear sessionStorage
  sessionStorage.removeItem('authToken');
  sessionStorage.removeItem('userRole');
  sessionStorage.removeItem('user');

  // Clear any other auth-related keys that might exist
  const keysToRemove = Object.keys(localStorage).filter(
    key =>
      key.toLowerCase().includes('auth') ||
      key.toLowerCase().includes('token') ||
      key.toLowerCase().includes('user')
  );

  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });

  // Clear browser-specific caches
  try {
    // Clear any cached form data
    if (document.forms) {
      Array.from(document.forms).forEach(form => form.reset());
    }

    // Clear any cookies (if we were using them)
    document.cookie.split(';').forEach(c => {
      document.cookie = c
        .replace(/^ +/, '')
        .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
    });

    // Clear navigation entries that might cache auth state
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  } catch (error) {
    console.warn('Error clearing browser-specific cache:', error);
  }

  console.log('✅ All authentication data cleared');
};

// Force reload the page to clear any cached state
export const forceAuthReset = () => {
  clearAllAuthData();
  window.location.reload();
};

// Validate if current auth state is consistent
export const validateAuthState = (): boolean => {
  const hasToken = !!localStorage.getItem('authToken');
  const hasUserRole = !!localStorage.getItem('userRole');
  const tokenLength = localStorage.getItem('authToken')?.length || 0;

  // Token should be at least 20 characters for JWT
  const isValid = hasToken && tokenLength > 20;

  console.log('🔍 Auth state validation:', { hasToken, hasUserRole, tokenLength, isValid });

  if (!isValid) {
    console.log('❌ Invalid auth state detected, clearing...');
    clearAllAuthData();
    return false;
  }

  return true;
};
