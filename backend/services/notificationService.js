// Simple notification service for web push notifications
class NotificationService {
  constructor() {
    this.enabled = false;
    
    // Check if we're in a browser environment with Push API support
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      this.enabled = true;
    }
  }

  // Request permission for push notifications
  async requestPermission() {
    if (!this.enabled) {
      console.warn('Push notifications not supported in this environment');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  // Show a notification
  async showNotification(title, options = {}) {
    if (!this.enabled) {
      // Fallback to console log
      console.log('Notification:', title, options);
      return;
    }

    try {
      // Try to use the Web Notifications API
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body: options.body || '',
          icon: options.icon || '/logo.jpg',
          ...options
        });
      } else if (Notification.permission !== 'denied') {
        // Request permission if not denied
        const granted = await this.requestPermission();
        if (granted) {
          new Notification(title, {
            body: options.body || '',
            icon: options.icon || '/logo.jpg',
            ...options
          });
        }
      }
    } catch (error) {
      console.error('Error showing notification:', error);
      // Fallback to console log
      console.log('Notification:', title, options);
    }
  }

  // Send push notification (for PWA)
  async sendPushNotification(subscription, payload) {
    // This would typically be implemented with a push service
    // For now, we'll just log it
    console.log('Push notification would be sent:', subscription, payload);
    
    // In a real implementation, you would:
    // 1. Use a push service like Firebase Cloud Messaging
    // 2. Encrypt the payload
    // 3. Send to the subscription endpoint
    // 4. Handle delivery receipts
    
    return { success: true };
  }

  // Register for push notifications (PWA)
  async registerForPush() {
    if (!this.enabled) {
      return { success: false, error: 'Push notifications not supported' };
    }

    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(process.env.VAPID_PUBLIC_KEY)
      });

      return { success: true, subscription };
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return { success: false, error: error.message };
    }
  }

  // Utility function to convert base64 to Uint8Array
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

module.exports = NotificationService;