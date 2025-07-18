/**
 * Professional Notification System
 * Clean, Material Design-inspired notifications with proper icons
 */

import { createIcon } from './icons';
import { i18n } from './i18n';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface NotificationConfig {
  message: string;
  type: NotificationType;
  duration?: number;
  action?: {
    text: string;
    callback: () => void;
  };
}

/**
 * Professional notification system using Chrome's native notifications
 * with improved messaging and icons
 */
export class NotificationManager {
  private static instance: NotificationManager;
  private activeNotifications: Set<string> = new Set();

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  /**
   * Show a professional notification
   */
  async show(config: NotificationConfig): Promise<string> {
    const notificationId = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Get appropriate icon based on type
    const iconPath = this.getIconPath(config.type);
    
    // Create professional title based on type
    const title = this.getTitle(config.type);
    
    // Enhanced message with better formatting
    const message = this.formatMessage(config.message, config.type);
    
    try {
      await chrome.notifications.create(notificationId, {
        type: 'basic',
        iconUrl: iconPath,
        title: title,
        message: message,
        priority: config.type === 'error' ? 2 : 1,
        requireInteraction: config.type === 'error',
        buttons: config.action ? [{ title: config.action.text }] : undefined
      });

      this.activeNotifications.add(notificationId);
      
      // Auto-dismiss after duration (default 5 seconds)
      const duration = config.duration || 5000;
      setTimeout(() => {
        this.dismiss(notificationId);
      }, duration);

      return notificationId;
    } catch (error) {
      console.error('Failed to show notification:', error);
      return '';
    }
  }

  /**
   * Dismiss a notification
   */
  async dismiss(notificationId: string): Promise<void> {
    if (this.activeNotifications.has(notificationId)) {
      try {
        await chrome.notifications.clear(notificationId);
        this.activeNotifications.delete(notificationId);
      } catch (error) {
        console.error('Failed to dismiss notification:', error);
      }
    }
  }

  /**
   * Get appropriate icon path for notification type
   */
  private getIconPath(type: NotificationType): string {
    // Use different icon variations based on type
    const iconMap: Record<NotificationType, string> = {
      success: 'icons/icon16.png',
      error: 'icons/icon16.png',
      info: 'icons/icon16.png',
      warning: 'icons/icon16.png'
    };
    
    return iconMap[type];
  }

  /**
   * Get professional title based on type
   */
  private getTitle(type: NotificationType): string {
    const titleMap: Record<NotificationType, string> = {
      success: i18n.extensionName(),
      error: i18n.extensionName(),
      info: i18n.extensionName(),
      warning: i18n.extensionName()
    };
    
    return titleMap[type];
  }

  /**
   * Format message with professional styling
   */
  private formatMessage(message: string, type: NotificationType): string {
    // Add professional prefixes based on type
    const prefixes: Record<NotificationType, string> = {
      success: '✓ ',
      error: '⚠ ',
      info: 'ℹ ',
      warning: '⚠ '
    };
    
    // Don't add prefix if message already has one
    if (message.match(/^[✓⚠ℹ]/)) {
      return message;
    }
    
    return prefixes[type] + message;
  }
}

/**
 * Convenience functions for different notification types
 */
export const notifications = {
  success: (message: string, duration?: number) => 
    NotificationManager.getInstance().show({ message, type: 'success', duration }),
  
  error: (message: string, duration?: number) => 
    NotificationManager.getInstance().show({ message, type: 'error', duration }),
  
  info: (message: string, duration?: number) => 
    NotificationManager.getInstance().show({ message, type: 'info', duration }),
  
  warning: (message: string, duration?: number) => 
    NotificationManager.getInstance().show({ message, type: 'warning', duration })
};

/**
 * Legacy compatibility function - maintains existing API
 */
export function showNotification(
  message: string, 
  type: NotificationType = 'info',
  duration?: number
): Promise<string> {
  return NotificationManager.getInstance().show({ message, type, duration });
}