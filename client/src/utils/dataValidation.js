/**
 * Data Validation and Cleanup Utility
 * Handles localStorage/sessionStorage validation and cleanup to prevent app loading issues
 */

class DataValidationService {
  constructor() {
    this.validKeys = new Set([
      'token',
      'user',
      'advanced-espresso-ai-model',
      'advanced-espresso-ai-features',
      'advanced-espresso-ai-config',
      'advanced-espresso-ai-performance',
      'advanced-espresso-ai-user-data',
      'advanced-espresso-ai-last-response',
      'espresso-ai-model',
      'espresso-ai-features',
      'espresso-ai-last-response',
      'ai-pending-data',
      'ai-collection-stats',
      'ai-session-id'
    ]);
    
    this.sessionValidKeys = new Set([
      'ai-session-id'
    ]);
  }

  /**
   * Validate and clean localStorage data
   */
  validateAndCleanLocalStorage() {
    console.log('🧹 Starting localStorage validation and cleanup...');
    
    try {
      const keysToRemove = [];
      const allKeys = Object.keys(localStorage);
      
      // Check for invalid keys
      for (const key of allKeys) {
        if (!this.validKeys.has(key)) {
          console.warn(`🗑️ Removing invalid localStorage key: ${key}`);
          keysToRemove.push(key);
        }
      }
      
      // Remove invalid keys
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.error(`Error removing key ${key}:`, error);
        }
      });
      
      // Validate critical data
      this.validateCriticalData();
      
      console.log(`✅ localStorage cleanup complete. Removed ${keysToRemove.length} invalid keys.`);
      
    } catch (error) {
      console.error('❌ Error during localStorage validation:', error);
      this.emergencyCleanup();
    }
  }

  /**
   * Validate and clean sessionStorage data
   */
  validateAndCleanSessionStorage() {
    console.log('🧹 Starting sessionStorage validation and cleanup...');
    
    try {
      const keysToRemove = [];
      const allKeys = Object.keys(sessionStorage);
      
      // Check for invalid keys
      for (const key of allKeys) {
        if (!this.sessionValidKeys.has(key)) {
          console.warn(`🗑️ Removing invalid sessionStorage key: ${key}`);
          keysToRemove.push(key);
        }
      }
      
      // Remove invalid keys
      keysToRemove.forEach(key => {
        try {
          sessionStorage.removeItem(key);
        } catch (error) {
          console.error(`Error removing sessionStorage key ${key}:`, error);
        }
      });
      
      console.log(`✅ sessionStorage cleanup complete. Removed ${keysToRemove.length} invalid keys.`);
      
    } catch (error) {
      console.error('❌ Error during sessionStorage validation:', error);
    }
  }

  /**
   * Validate critical data like JWT tokens
   */
  validateCriticalData() {
    // Validate JWT token
    const token = localStorage.getItem('token');
    if (token) {
      try {
        // Basic JWT structure validation
        const parts = token.split('.');
        if (parts.length !== 3) {
          throw new Error('Invalid JWT structure');
        }
        
        // Try to decode the payload
        const payload = JSON.parse(atob(parts[1]));
        
        // Check if token is expired
        if (payload.exp && payload.exp < Date.now() / 1000) {
          console.warn('🗑️ Removing expired token');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
        
        console.log('✅ Token validation passed');
        
      } catch (error) {
        console.warn('🗑️ Removing invalid token:', error.message);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }

    // Validate AI model data
    this.validateAIModelData();
  }

  /**
   * Validate AI model data
   */
  validateAIModelData() {
    const aiKeys = [
      'advanced-espresso-ai-features',
      'advanced-espresso-ai-config',
      'advanced-espresso-ai-performance',
      'advanced-espresso-ai-user-data',
      'advanced-espresso-ai-last-response',
      'espresso-ai-features',
      'espresso-ai-last-response'
    ];

    aiKeys.forEach(key => {
      const data = localStorage.getItem(key);
      if (data) {
        try {
          JSON.parse(data);
          console.log(`✅ ${key} validation passed`);
        } catch (error) {
          console.warn(`🗑️ Removing corrupted ${key}:`, error.message);
          localStorage.removeItem(key);
        }
      }
    });
  }

  /**
   * Emergency cleanup - removes all localStorage data
   */
  emergencyCleanup() {
    console.warn('🚨 Performing emergency localStorage cleanup...');
    
    try {
      // Keep only essential keys
      const essentialKeys = ['token'];
      const allKeys = Object.keys(localStorage);
      
      allKeys.forEach(key => {
        if (!essentialKeys.includes(key)) {
          localStorage.removeItem(key);
        }
      });
      
      console.log('✅ Emergency cleanup complete');
      
    } catch (error) {
      console.error('❌ Emergency cleanup failed:', error);
      // Last resort - clear everything
      localStorage.clear();
    }
  }

  /**
   * Check if app can start normally
   */
  canAppStart() {
    try {
      // Check if localStorage is accessible
      const testKey = 'app-startup-test';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      
      // Check if critical data is valid
      const token = localStorage.getItem('token');
      if (token) {
        const parts = token.split('.');
        if (parts.length !== 3) {
          return false;
        }
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ App cannot start:', error);
      return false;
    }
  }

  /**
   * Initialize data validation on app startup
   */
  initialize() {
    console.log('🚀 Initializing data validation service...');
    
    // Force cache busting for critical resources
    this.forceCacheRefresh();
    
    // Check if app can start
    if (!this.canAppStart()) {
      console.warn('⚠️ App startup issues detected, performing cleanup...');
      this.emergencyCleanup();
    }
    
    // Run validation and cleanup
    this.validateAndCleanLocalStorage();
    this.validateAndCleanSessionStorage();
    
    console.log('✅ Data validation service initialized');
  }

  /**
   * Force cache refresh for critical resources
   */
  forceCacheRefresh() {
    try {
      // Clear any cached API responses
      if ('caches' in window) {
        caches.keys().then(cacheNames => {
          cacheNames.forEach(cacheName => {
            caches.delete(cacheName);
          });
        });
      }
      
      // Force reload of critical scripts if they're cached
      const criticalScripts = [
        '/static/js/main.',
        '/static/css/main.'
      ];
      
      criticalScripts.forEach(scriptPattern => {
        const scripts = document.querySelectorAll(`script[src*="${scriptPattern}"], link[href*="${scriptPattern}"]`);
        scripts.forEach(script => {
          if (script.src || script.href) {
            const url = new URL(script.src || script.href);
            url.searchParams.set('v', Date.now());
            if (script.src) script.src = url.toString();
            if (script.href) script.href = url.toString();
          }
        });
      });
      
    } catch (error) {
      console.warn('Cache refresh failed:', error);
    }
  }

  /**
   * Get storage usage information
   */
  getStorageInfo() {
    const info = {
      localStorage: {
        keys: Object.keys(localStorage).length,
        size: this.getStorageSize(localStorage)
      },
      sessionStorage: {
        keys: Object.keys(sessionStorage).length,
        size: this.getStorageSize(sessionStorage)
      }
    };
    
    return info;
  }

  /**
   * Calculate storage size
   */
  getStorageSize(storage) {
    let totalSize = 0;
    for (const key in storage) {
      if (storage.hasOwnProperty(key)) {
        totalSize += storage[key].length + key.length;
      }
    }
    return totalSize;
  }
}

// Create singleton instance
const dataValidationService = new DataValidationService();

export default dataValidationService;
