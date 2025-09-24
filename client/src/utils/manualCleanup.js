/**
 * Manual Cleanup Utility
 * Provides functions for users to manually clean up corrupted data
 */

import dataValidationService from './dataValidation';

class ManualCleanupService {
  /**
   * Clear all app data (localStorage + sessionStorage)
   */
  clearAllData() {
    console.log('🧹 Clearing all app data...');
    
    try {
      // Clear localStorage
      localStorage.clear();
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Clear IndexedDB if it exists
      if ('indexedDB' in window) {
        indexedDB.deleteDatabase('AltaniaCoffeeDB');
      }
      
      console.log('✅ All app data cleared successfully');
      
      // Reload the page
      window.location.reload();
      
    } catch (error) {
      console.error('❌ Error clearing data:', error);
      alert('Error clearing data. Please try refreshing the page manually.');
    }
  }

  /**
   * Clear only corrupted data (keeps valid data)
   */
  clearCorruptedData() {
    console.log('🧹 Clearing only corrupted data...');
    
    try {
      dataValidationService.validateAndCleanLocalStorage();
      dataValidationService.validateAndCleanSessionStorage();
      
      console.log('✅ Corrupted data cleared successfully');
      
      // Reload the page
      window.location.reload();
      
    } catch (error) {
      console.error('❌ Error clearing corrupted data:', error);
      alert('Error clearing corrupted data. Please try refreshing the page manually.');
    }
  }

  /**
   * Get storage information
   */
  getStorageInfo() {
    return dataValidationService.getStorageInfo();
  }

  /**
   * Export storage data for debugging
   */
  exportStorageData() {
    const data = {
      localStorage: {},
      sessionStorage: {},
      timestamp: new Date().toISOString()
    };

    // Export localStorage
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        try {
          data.localStorage[key] = JSON.parse(localStorage.getItem(key));
        } catch {
          data.localStorage[key] = localStorage.getItem(key);
        }
      }
    }

    // Export sessionStorage
    for (const key in sessionStorage) {
      if (sessionStorage.hasOwnProperty(key)) {
        try {
          data.sessionStorage[key] = JSON.parse(sessionStorage.getItem(key));
        } catch {
          data.sessionStorage[key] = sessionStorage.getItem(key);
        }
      }
    }

    return data;
  }

  /**
   * Download storage data as JSON file
   */
  downloadStorageData() {
    const data = this.exportStorageData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `altanian-coffee-storage-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Create singleton instance
const manualCleanupService = new ManualCleanupService();

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  window.manualCleanup = manualCleanupService;
}

export default manualCleanupService;
