class PWAService {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.isOnline = navigator.onLine;
    this.offlineOrders = [];
    
    this.init();
  }

  init() {
    this.setupInstallPrompt();
    this.setupOnlineOfflineListeners();
    this.setupServiceWorker();
    this.setupNotifications();
    this.setupOfflineStorage();
  }

  // Handle PWA installation prompt
  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('PWA install prompt triggered');
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallBanner();
    });

    window.addEventListener('appinstalled', () => {
      console.log('PWA installed successfully');
      this.isInstalled = true;
      this.hideInstallBanner();
      this.deferredPrompt = null;
    });
  }

  // Show install banner
  showInstallBanner() {
    if (this.isInstalled) return;

    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.className = 'pwa-install-banner';
    banner.innerHTML = `
      <div class="install-content">
        <div class="install-icon">📱</div>
        <div class="install-text">
          <h4>Install Altania Coffee</h4>
          <p>Get quick access and offline ordering</p>
        </div>
        <div class="install-actions">
          <button class="install-btn" onclick="pwaService.installApp()">Install</button>
          <button class="dismiss-btn" onclick="pwaService.hideInstallBanner()">✕</button>
        </div>
      </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .pwa-install-banner {
        position: fixed;
        bottom: 20px;
        left: 20px;
        right: 20px;
        background: linear-gradient(135deg, #4A2C17, #8B4513);
        color: white;
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 8px 32px rgba(76, 44, 23, 0.3);
        z-index: 1000;
        animation: slideUp 0.3s ease-out;
      }
      
      .install-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .install-icon {
        font-size: 2rem;
      }
      
      .install-text h4 {
        margin: 0 0 4px 0;
        font-size: 1rem;
        font-weight: 600;
      }
      
      .install-text p {
        margin: 0;
        font-size: 0.85rem;
        opacity: 0.9;
      }
      
      .install-actions {
        display: flex;
        gap: 8px;
        margin-left: auto;
      }
      
      .install-btn {
        background: rgba(255, 255, 255, 0.2);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 8px;
        padding: 8px 16px;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .install-btn:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: translateY(-1px);
      }
      
      .dismiss-btn {
        background: transparent;
        color: white;
        border: none;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.2rem;
        transition: all 0.2s ease;
      }
      
      .dismiss-btn:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      
      @keyframes slideUp {
        from {
          transform: translateY(100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      
      @media (max-width: 768px) {
        .pwa-install-banner {
          left: 10px;
          right: 10px;
          bottom: 10px;
        }
        
        .install-content {
          flex-direction: column;
          text-align: center;
        }
        
        .install-actions {
          margin-left: 0;
          margin-top: 8px;
        }
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(banner);
  }

  // Hide install banner
  hideInstallBanner() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) {
      banner.style.animation = 'slideDown 0.3s ease-out';
      setTimeout(() => banner.remove(), 300);
    }
  }

  // Install PWA
  async installApp() {
    if (!this.deferredPrompt) {
      console.log('No install prompt available');
      return;
    }

    try {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      
      console.log('Install prompt outcome:', outcome);
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      
      this.deferredPrompt = null;
      this.hideInstallBanner();
    } catch (error) {
      console.error('Error installing PWA:', error);
    }
  }

  // Setup online/offline listeners
  setupOnlineOfflineListeners() {
    window.addEventListener('online', () => {
      console.log('App is online');
      this.isOnline = true;
      this.syncOfflineData();
      this.showOnlineNotification();
    });

    window.addEventListener('offline', () => {
      console.log('App is offline');
      this.isOnline = false;
      this.showOfflineNotification();
    });
  }

  // Setup service worker
  async setupServiceWorker() {
    // Service worker completely disabled to fix fetch errors
    console.log('Service Worker registration completely disabled');
    return;
  }

  // Setup notifications
  async setupNotifications() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      console.log('Notification permission:', permission);
    }
  }

  // Setup offline storage
  setupOfflineStorage() {
    // Initialize IndexedDB for offline storage
    this.initIndexedDB();
  }

  // Initialize IndexedDB
  initIndexedDB() {
    const request = indexedDB.open('AltaniaCoffeeDB', 1);

    request.onerror = () => {
      console.error('IndexedDB failed to open');
    };

    request.onsuccess = () => {
      this.db = request.result;
      console.log('IndexedDB opened successfully');
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create offline orders store
      if (!db.objectStoreNames.contains('offlineOrders')) {
        const store = db.createObjectStore('offlineOrders', { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Create offline cart store
      if (!db.objectStoreNames.contains('offlineCart')) {
        db.createObjectStore('offlineCart', { keyPath: 'id' });
      }
    };
  }

  // Store order offline
  async storeOrderOffline(orderData) {
    if (!this.db) return;

    const transaction = this.db.transaction(['offlineOrders'], 'readwrite');
    const store = transaction.objectStore('offlineOrders');
    
    const offlineOrder = {
      ...orderData,
      timestamp: Date.now(),
      synced: false
    };

    await store.add(offlineOrder);
    console.log('Order stored offline:', offlineOrder);
  }

  // Sync offline data
  async syncOfflineData() {
    if (!this.db || !this.isOnline) return;

    const transaction = this.db.transaction(['offlineOrders'], 'readwrite');
    const store = transaction.objectStore('offlineOrders');
    const index = store.index('timestamp');
    
    const request = index.getAll();
    
    request.onsuccess = async () => {
      const offlineOrders = request.result;
      
      for (const order of offlineOrders) {
        try {
          // Attempt to sync the order
          const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-auth-token': order.token
            },
            body: JSON.stringify(order.data)
          });

          if (response.ok) {
            // Remove from offline storage
            await store.delete(order.id);
            console.log('Offline order synced:', order.id);
          }
        } catch (error) {
          console.error('Failed to sync offline order:', error);
        }
      }
    };
  }

  // Show online notification
  showOnlineNotification() {
    this.showNotification('Back Online!', 'Your orders will sync automatically.');
  }

  // Show offline notification
  showOfflineNotification() {
    this.showNotification('You\'re Offline', 'Orders will be saved locally and synced when online.');
  }

  // Show update notification
  showUpdateNotification() {
    const notification = document.createElement('div');
    notification.className = 'update-notification';
    notification.innerHTML = `
      <div class="update-content">
        <span class="update-icon">🔄</span>
        <span class="update-text">App update available!</span>
        <button class="update-btn" onclick="location.reload()">Update</button>
      </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .update-notification {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #CD853F;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        z-index: 1000;
        animation: slideDown 0.3s ease-out;
      }
      
      .update-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .update-btn {
        background: rgba(255, 255, 255, 0.2);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 6px;
        padding: 6px 12px;
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .update-btn:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      
      @keyframes slideDown {
        from {
          transform: translateX(-50%) translateY(-100%);
          opacity: 0;
        }
        to {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(notification);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      notification.remove();
    }, 10000);
  }

  // Show notification
  showNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/logo192.png',
        badge: '/logo192.png'
      });
    }
  }

  // Check if app is installed
  isAppInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }

  // Get app info
  getAppInfo() {
    return {
      isInstalled: this.isAppInstalled(),
      isOnline: this.isOnline,
      hasServiceWorker: 'serviceWorker' in navigator,
      hasNotifications: 'Notification' in window,
      notificationPermission: Notification.permission
    };
  }
}

// Create global instance
const pwaService = new PWAService();

// Make it globally available
window.pwaService = pwaService;

export default pwaService;
