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
  defaultPlatform: string; // Allow any platform ID (built-in or custom)
}

export interface CustomPlatform {
  id: string;
  name: string;
  icon: string;
  url: string;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  autoSend: false,
  defaultInstructions: '',
  maxTextLength: 8192,
  defaultModel: 'gpt-4o',
  darkMode: false,
  saveInstructions: false,
  defaultPlatform: 'chatgpt',
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

  /**
   * Get custom platforms from storage
   */
  async getCustomPlatforms(): Promise<CustomPlatform[]> {
    try {
      const result = await chrome.storage.sync.get(['customPlatforms']);
      return result.customPlatforms || [];
    } catch (error) {
      console.warn('Sync storage unavailable, using local storage:', error);
      try {
        const result = await chrome.storage.local.get(['customPlatforms']);
        return result.customPlatforms || [];
      } catch (localError) {
        console.error('Storage unavailable:', localError);
        return [];
      }
    }
  }

  /**
   * Save custom platforms to storage
   */
  async saveCustomPlatforms(platforms: CustomPlatform[]): Promise<void> {
    try {
      await chrome.storage.sync.set({ customPlatforms: platforms });
    } catch (error) {
      console.warn('Sync storage unavailable, using local storage:', error);
      try {
        await chrome.storage.local.set({ customPlatforms: platforms });
      } catch (localError) {
        console.error('Storage unavailable:', localError);
        throw localError;
      }
    }
  }

  /**
   * Add a custom platform
   */
  async addCustomPlatform(platform: Omit<CustomPlatform, 'id'>): Promise<void> {
    const platforms = await this.getCustomPlatforms();
    const newPlatform: CustomPlatform = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...platform
    };
    platforms.push(newPlatform);
    await this.saveCustomPlatforms(platforms);
  }

  /**
   * Remove a custom platform
   */
  async removeCustomPlatform(id: string): Promise<void> {
    const platforms = await this.getCustomPlatforms();
    const filtered = platforms.filter(p => p.id !== id);
    await this.saveCustomPlatforms(filtered);
  }

  /**
   * Update a custom platform
   */
  async updateCustomPlatform(id: string, updates: Partial<Omit<CustomPlatform, 'id'>>): Promise<void> {
    const platforms = await this.getCustomPlatforms();
    const index = platforms.findIndex(p => p.id === id);
    if (index >= 0) {
      platforms[index] = { ...platforms[index], ...updates };
      await this.saveCustomPlatforms(platforms);
    }
  }
}

export const storageManager = new StorageManager(); 