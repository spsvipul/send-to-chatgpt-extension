/**
 * Storage utility for managing extension settings
 * Uses Chrome sync storage with local fallback
 */

export interface ExtensionSettings {
  autoSend: boolean;
  defaultInstructions: string;
  maxTextLength: number;
  defaultModel: string;
  darkMode: boolean;
  saveInstructions: boolean;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  autoSend: false,
  defaultInstructions: '',
  maxTextLength: 8192,
  defaultModel: 'gpt-4o',
  darkMode: false,
  saveInstructions: false,
};

class StorageManager {
  private debounceTimer: number | null = null;
  private readonly DEBOUNCE_DELAY = 300; // ms

  /**
   * Get settings from storage
   */
  async getSettings(): Promise<ExtensionSettings> {
    try {
      const result = await chrome.storage.sync.get(DEFAULT_SETTINGS);
      return { ...DEFAULT_SETTINGS, ...result };
    } catch (error) {
      console.warn('Sync storage unavailable, using local storage:', error);
      try {
        const result = await chrome.storage.local.get(DEFAULT_SETTINGS);
        return { ...DEFAULT_SETTINGS, ...result };
      } catch (localError) {
        console.error('Storage unavailable:', localError);
        return DEFAULT_SETTINGS;
      }
    }
  }

  /**
   * Save settings to storage (debounced)
   */
  async saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
    return new Promise((resolve) => {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      this.debounceTimer = setTimeout(async () => {
        try {
          await chrome.storage.sync.set(settings);
          resolve();
        } catch (error) {
          console.warn('Sync storage unavailable, using local storage:', error);
          try {
            await chrome.storage.local.set(settings);
            resolve();
          } catch (localError) {
            console.error('Storage unavailable:', localError);
            resolve();
          }
        }
      }, this.DEBOUNCE_DELAY);
    });
  }

  /**
   * Reset settings to defaults
   */
  async resetSettings(): Promise<void> {
    try {
      await chrome.storage.sync.clear();
      await chrome.storage.local.clear();
    } catch (error) {
      console.error('Failed to reset settings:', error);
    }
  }

  /**
   * Listen for storage changes
   */
  onSettingsChanged(callback: (changes: Partial<ExtensionSettings>) => void): void {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' || areaName === 'local') {
        const settingsChanges: Partial<ExtensionSettings> = {};
        
        Object.keys(changes).forEach((key) => {
          if (key in DEFAULT_SETTINGS) {
            settingsChanges[key as keyof ExtensionSettings] = changes[key].newValue;
          }
        });

        if (Object.keys(settingsChanges).length > 0) {
          callback(settingsChanges);
        }
      }
    });
  }
}

export const storageManager = new StorageManager(); 