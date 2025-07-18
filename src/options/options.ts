/**
 * Options page logic for Chrome extension
 * Handles user settings and preferences
 */

import { storageManager, ExtensionSettings, DEFAULT_SETTINGS, CustomPlatform } from '../utils/storage';
import { testClipboardPermissions } from '../utils/clipboard';
import { testDeepLink } from '../utils/chatgpt';
import { i18n } from '../utils/i18n';
import { createIcon } from '../utils/icons';

class OptionsManager {
  private settings: ExtensionSettings = DEFAULT_SETTINGS;
  private unsavedChanges = false;
  private customPlatforms: CustomPlatform[] = [];

  /**
   * Initialize the options page
   */
  async init() {
    await this.loadSettings();
    await this.loadCustomPlatforms();
    await this.setupProfessionalIcons();
    await this.setupEventListeners();
    await this.populateForm();
    await this.updateDarkMode();
    await this.checkSystemStatus();
    await this.setupCustomPlatformManagement();
    
    // Auto-save on changes
    this.setupAutoSave();
    
    // Listen for messages from background script
    this.setupMessageListener();
  }

  /**
   * Load settings from storage
   */
  private async loadSettings() {
    this.settings = await storageManager.getSettings();
  }

  /**
   * Load custom platforms from storage
   */
  private async loadCustomPlatforms() {
    this.customPlatforms = await storageManager.getCustomPlatforms();
  }

  /**
   * Setup professional icons for section headers
   */
  private async setupProfessionalIcons() {
    const iconMappings = [
      { selector: '.section-icon', iconName: 'settings', title: 'General Settings' },
      { selector: '.section-icon', iconName: 'settings', title: 'Appearance' },
      { selector: '.section-icon', iconName: 'settings', title: 'Custom AI Platforms' },
      { selector: '.section-icon', iconName: 'settings', title: 'Clipboard & Integration' },
      { selector: '.section-icon', iconName: 'settings', title: 'Keyboard Shortcuts' },
      { selector: '.section-icon', iconName: 'settings', title: 'Advanced' }
    ];

    // Map specific icons to sections
    const sectionIcons: Record<string, string> = {
      'General Settings': 'settings',
      'Appearance': 'settings',
      'Custom AI Platforms': 'settings',
      'Clipboard & Integration': 'settings',
      'Keyboard Shortcuts': 'settings',
      'Advanced': 'settings'
    };

    // Update each section icon
    document.querySelectorAll('.section h2').forEach((header) => {
      const iconSpan = header.querySelector('.section-icon');
      const titleSpan = header.querySelector('span[id$="-title"]');
      
      if (iconSpan && titleSpan) {
        const sectionTitle = titleSpan.textContent || '';
        const iconName = sectionIcons[sectionTitle] || 'settings';
        
        // Replace empty icon span with professional SVG
        iconSpan.innerHTML = createIcon(iconName, 20, 'section-icon-svg');
      }
    });
  }

  /**
   * Setup event listeners
   */
  private async setupEventListeners() {
    // Form elements
    const autoSendCheckbox = document.getElementById('auto-send') as HTMLInputElement;
    const defaultInstructionsTextarea = document.getElementById('default-instructions') as HTMLTextAreaElement;
    const defaultModelSelect = document.getElementById('default-model') as HTMLSelectElement;
    const maxTextLengthInput = document.getElementById('max-text-length') as HTMLInputElement;
    const darkModeCheckbox = document.getElementById('dark-mode') as HTMLInputElement;
    const saveInstructionsCheckbox = document.getElementById('save-instructions') as HTMLInputElement;

    // Buttons
    const saveSettingsBtn = document.getElementById('save-settings') as HTMLButtonElement;
    const resetSettingsBtn = document.getElementById('reset-settings') as HTMLButtonElement;
    const exportSettingsBtn = document.getElementById('export-settings') as HTMLButtonElement;
    const importSettingsBtn = document.getElementById('import-settings') as HTMLButtonElement;
    const testExtensionBtn = document.getElementById('test-extension') as HTMLButtonElement;
    const importFileInput = document.getElementById('import-file') as HTMLInputElement;

    // Form change handlers
    autoSendCheckbox?.addEventListener('change', () => {
      this.settings.autoSend = autoSendCheckbox.checked;
      this.markUnsavedChanges();
    });

    defaultInstructionsTextarea?.addEventListener('input', () => {
      this.settings.defaultInstructions = defaultInstructionsTextarea.value;
      this.markUnsavedChanges();
    });

    defaultModelSelect?.addEventListener('change', () => {
      this.settings.defaultModel = defaultModelSelect.value;
      this.markUnsavedChanges();
    });

    maxTextLengthInput?.addEventListener('input', () => {
      const value = parseInt(maxTextLengthInput.value);
      if (!isNaN(value) && value >= 1000 && value <= 16384) {
        this.settings.maxTextLength = value;
        this.markUnsavedChanges();
      }
    });

    darkModeCheckbox?.addEventListener('change', () => {
      this.settings.darkMode = darkModeCheckbox.checked;
      this.markUnsavedChanges();
      this.updateDarkMode();
    });

    saveInstructionsCheckbox?.addEventListener('change', () => {
      this.settings.saveInstructions = saveInstructionsCheckbox.checked;
      this.markUnsavedChanges();
    });

    // Button handlers
    saveSettingsBtn?.addEventListener('click', () => this.saveSettings());
    resetSettingsBtn?.addEventListener('click', () => this.resetSettings());
    exportSettingsBtn?.addEventListener('click', () => this.exportSettings());
    importSettingsBtn?.addEventListener('click', () => importFileInput?.click());
    testExtensionBtn?.addEventListener('click', () => this.testExtension());
    importFileInput?.addEventListener('change', (e) => this.importSettings(e));

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        this.saveSettings();
      }
    });

    // Warning on page unload if there are unsaved changes
    window.addEventListener('beforeunload', (e) => {
      if (this.unsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  /**
   * Populate form with current settings
   */
  private async populateForm() {
    const autoSendCheckbox = document.getElementById('auto-send') as HTMLInputElement;
    const defaultInstructionsTextarea = document.getElementById('default-instructions') as HTMLTextAreaElement;
    const defaultModelSelect = document.getElementById('default-model') as HTMLSelectElement;
    const maxTextLengthInput = document.getElementById('max-text-length') as HTMLInputElement;
    const darkModeCheckbox = document.getElementById('dark-mode') as HTMLInputElement;
    const saveInstructionsCheckbox = document.getElementById('save-instructions') as HTMLInputElement;

    if (autoSendCheckbox) autoSendCheckbox.checked = this.settings.autoSend;
    if (defaultInstructionsTextarea) defaultInstructionsTextarea.value = this.settings.defaultInstructions;
    if (defaultModelSelect) defaultModelSelect.value = this.settings.defaultModel;
    if (maxTextLengthInput) maxTextLengthInput.value = this.settings.maxTextLength.toString();
    if (darkModeCheckbox) darkModeCheckbox.checked = this.settings.darkMode;
    if (saveInstructionsCheckbox) saveInstructionsCheckbox.checked = this.settings.saveInstructions;

    this.unsavedChanges = false;
    this.updateSaveButton();
  }

  /**
   * Update dark mode
   */
  private async updateDarkMode() {
    if (this.settings.darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }

  /**
   * Check system status (clipboard, deep link)
   */
  private async checkSystemStatus() {
    // Check clipboard permissions
    const clipboardStatus = document.getElementById('clipboard-status') as HTMLElement;
    const clipboardStatusText = document.getElementById('clipboard-status-text') as HTMLElement;
    
    try {
      const hasClipboardAccess = await testClipboardPermissions();
      if (hasClipboardAccess) {
        clipboardStatus.className = 'status-indicator success';
        clipboardStatusText.textContent = 'Available';
      } else {
        clipboardStatus.className = 'status-indicator warning';
        clipboardStatusText.textContent = 'Limited';
      }
    } catch (error) {
      clipboardStatus.className = 'status-indicator error';
      clipboardStatusText.textContent = 'Error';
    }

    // Check deep link functionality
    const deepLinkStatus = document.getElementById('deep-link-status') as HTMLElement;
    const deepLinkStatusText = document.getElementById('deep-link-status-text') as HTMLElement;
    
    try {
      const deepLinkWorks = await testDeepLink();
      if (deepLinkWorks) {
        deepLinkStatus.className = 'status-indicator success';
        deepLinkStatusText.textContent = 'Available';
      } else {
        deepLinkStatus.className = 'status-indicator warning';
        deepLinkStatusText.textContent = 'Limited';
      }
    } catch (error) {
      deepLinkStatus.className = 'status-indicator error';
      deepLinkStatusText.textContent = 'Error';
    }
  }

  /**
   * Setup auto-save functionality
   */
  private setupAutoSave() {
    let saveTimeout: number | null = null;

    const debouncedSave = () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
      saveTimeout = setTimeout(() => {
        if (this.unsavedChanges) {
          this.saveSettings(true); // Silent save
        }
      }, 2000); // Auto-save after 2 seconds of inactivity
    };

    // Monitor all form inputs for changes
    const formInputs = document.querySelectorAll('input, textarea, select');
    formInputs.forEach(input => {
      input.addEventListener('input', debouncedSave);
      input.addEventListener('change', debouncedSave);
    });
  }

  /**
   * Mark unsaved changes
   */
  private markUnsavedChanges() {
    this.unsavedChanges = true;
    this.updateSaveButton();
  }

  /**
   * Update save button state
   */
  private updateSaveButton() {
    const saveButton = document.getElementById('save-settings') as HTMLButtonElement;
    const saveButtonText = document.getElementById('save-settings-text') as HTMLSpanElement;
    
    if (this.unsavedChanges) {
      saveButton.style.background = '#f59e0b';
      saveButtonText.textContent = 'Save Changes';
    } else {
      saveButton.style.background = '#3b82f6';
      saveButtonText.textContent = 'Settings Saved';
    }
  }

  /**
   * Save settings
   */
  private async saveSettings(silent = false) {
    try {
      await storageManager.saveSettings(this.settings);
      this.unsavedChanges = false;
      this.updateSaveButton();
      
      if (!silent) {
        this.showNotification('Settings saved successfully!', 'success');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showNotification('Failed to save settings. Please try again.', 'error');
    }
  }

  /**
   * Reset settings to defaults
   */
  private async resetSettings() {
    if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      try {
        await storageManager.resetSettings();
        this.settings = { ...DEFAULT_SETTINGS };
        await this.populateForm();
        await this.updateDarkMode();
        this.showNotification('Settings reset to defaults.', 'success');
      } catch (error) {
        console.error('Failed to reset settings:', error);
        this.showNotification('Failed to reset settings. Please try again.', 'error');
      }
    }
  }

  /**
   * Export settings
   */
  private async exportSettings() {
    try {
      const exportData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        settings: this.settings
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `chatgpt-extension-settings-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      
      this.showNotification('Settings exported successfully!', 'success');
    } catch (error) {
      console.error('Failed to export settings:', error);
      this.showNotification('Failed to export settings. Please try again.', 'error');
    }
  }

  /**
   * Import settings
   */
  private async importSettings(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (!file) return;

    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      
      // Validate import data
      if (!importData.settings || typeof importData.settings !== 'object') {
        throw new Error('Invalid settings file format');
      }

      // Merge with defaults to ensure all required fields are present
      const importedSettings = { ...DEFAULT_SETTINGS, ...importData.settings };
      
      // Validate individual settings
      if (typeof importedSettings.autoSend !== 'boolean') importedSettings.autoSend = DEFAULT_SETTINGS.autoSend;
      if (typeof importedSettings.defaultInstructions !== 'string') importedSettings.defaultInstructions = DEFAULT_SETTINGS.defaultInstructions;
      if (typeof importedSettings.maxTextLength !== 'number' || importedSettings.maxTextLength < 1000 || importedSettings.maxTextLength > 16384) {
        importedSettings.maxTextLength = DEFAULT_SETTINGS.maxTextLength;
      }
      if (typeof importedSettings.defaultModel !== 'string') importedSettings.defaultModel = DEFAULT_SETTINGS.defaultModel;
      if (typeof importedSettings.darkMode !== 'boolean') importedSettings.darkMode = DEFAULT_SETTINGS.darkMode;
      if (typeof importedSettings.saveInstructions !== 'boolean') importedSettings.saveInstructions = DEFAULT_SETTINGS.saveInstructions;

      this.settings = importedSettings;
      await this.populateForm();
      await this.updateDarkMode();
      this.markUnsavedChanges();
      
      this.showNotification('Settings imported successfully!', 'success');
    } catch (error) {
      console.error('Failed to import settings:', error);
      this.showNotification('Failed to import settings. Please check the file format.', 'error');
    }
    
    // Clear the file input
    target.value = '';
  }

  /**
   * Test extension functionality
   */
  private async testExtension() {
    try {
      this.showNotification('Testing extension...', 'info');
      
      // Test clipboard
      await testClipboardPermissions();
      
      // Test deep link
      await testDeepLink();
      
      // Test storage
      await storageManager.getSettings();
      
      this.showNotification('Extension test completed successfully!', 'success');
    } catch (error) {
      console.error('Extension test failed:', error);
      this.showNotification('Extension test failed. Please check the console for details.', 'error');
    }
  }

  /**
   * Setup custom platform management
   */
  private async setupCustomPlatformManagement() {
    // Add custom platform button handler
    const addPlatformBtn = document.getElementById('add-custom-platform') as HTMLButtonElement;
    console.log('Add platform button found:', addPlatformBtn);
    
    if (addPlatformBtn) {
      addPlatformBtn.addEventListener('click', () => {
        console.log('Add platform button clicked!');
        this.addCustomPlatform();
      });
    } else {
      console.error('Add platform button not found!');
    }
    
    // Initial render
    await this.renderCustomPlatforms();
  }

  /**
   * Setup message listener for background script communication
   */
  private setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'FOCUS_CUSTOM_PLATFORMS') {
        this.focusCustomPlatformsSection();
      }
    });
  }

  /**
   * Focus on custom platforms section
   */
  private focusCustomPlatformsSection() {
    const section = document.getElementById('custom-platforms-title');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
      section.style.background = '#eff6ff';
      section.style.padding = '8px';
      section.style.borderRadius = '6px';
      
      // Remove highlight after 3 seconds
      setTimeout(() => {
        section.style.background = '';
        section.style.padding = '';
        section.style.borderRadius = '';
      }, 3000);
    }
  }

  /**
   * Render custom platforms list
   */
  private async renderCustomPlatforms() {
    const container = document.getElementById('custom-platforms-list');
    if (!container) return;
    
    // Clear existing content
    container.innerHTML = '';
    
    if (this.customPlatforms.length === 0) {
      // Show empty state
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-state';
      emptyState.textContent = 'No custom platforms added yet. Add your first custom platform below.';
      container.appendChild(emptyState);
      return;
    }
    
    // Render each custom platform
    this.customPlatforms.forEach(platform => {
      const platformItem = document.createElement('div');
      platformItem.className = 'custom-platform-item';
      
      platformItem.innerHTML = `
        <div class="custom-platform-info">
          <div class="custom-platform-icon">${platform.icon}</div>
          <div class="custom-platform-details">
            <div class="custom-platform-name">${platform.name}</div>
            <div class="custom-platform-url">${platform.url}</div>
          </div>
        </div>
        <div class="custom-platform-actions">
          <button class="btn btn-small btn-remove" data-platform-id="${platform.id}">
            Remove
          </button>
        </div>
      `;
      
      // Add remove button handler
      const removeBtn = platformItem.querySelector('.btn-remove') as HTMLButtonElement;
      removeBtn.addEventListener('click', () => this.removeCustomPlatform(platform.id));
      
      container.appendChild(platformItem);
    });
  }

  /**
   * Add custom platform
   */
  private async addCustomPlatform() {
    console.log('addCustomPlatform method called');
    
    const nameInput = document.getElementById('platform-name') as HTMLInputElement;
    const iconInput = document.getElementById('platform-icon') as HTMLInputElement;
    const urlInput = document.getElementById('platform-url') as HTMLInputElement;
    
    console.log('Form inputs found:', { nameInput, iconInput, urlInput });
    
    const name = nameInput?.value.trim() || '';
    const icon = iconInput?.value.trim() || '';
    const url = urlInput?.value.trim() || '';
    
    console.log('Form values:', { name, icon, url });
    
    // Validate inputs
    if (!name || !icon || !url) {
      console.log('Validation failed: missing fields');
      this.showNotification('Please fill in all fields', 'error');
      return;
    }
    
    // Basic URL validation
    try {
      new URL(url);
      console.log('URL validation passed');
    } catch (error) {
      console.log('URL validation failed:', error);
      this.showNotification('Please enter a valid URL', 'error');
      return;
    }
    
    // Check for duplicate names
    if (this.customPlatforms.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      console.log('Duplicate name validation failed');
      this.showNotification('A platform with this name already exists', 'error');
      return;
    }
    
    try {
      console.log('Adding platform to storage...');
      
      // Add platform to storage
      await storageManager.addCustomPlatform({
        name,
        icon,
        url
      });
      
      console.log('Platform added to storage successfully');
      
      // Reload custom platforms
      await this.loadCustomPlatforms();
      console.log('Custom platforms reloaded');
      
      // Re-render the list
      await this.renderCustomPlatforms();
      console.log('Platform list re-rendered');
      
      // Clear form
      if (nameInput) nameInput.value = '';
      if (iconInput) iconInput.value = '';
      if (urlInput) urlInput.value = '';
      
      this.showNotification('Custom platform added successfully!', 'success');
      
      // Recreate context menu to include new platform
      chrome.runtime.sendMessage({
        type: 'RECREATE_CONTEXT_MENU',
        data: {}
      });
      
    } catch (error) {
      console.error('Failed to add custom platform:', error);
      this.showNotification('Failed to add custom platform', 'error');
    }
  }

  /**
   * Remove custom platform
   */
  private async removeCustomPlatform(platformId: string) {
    const platform = this.customPlatforms.find(p => p.id === platformId);
    if (!platform) return;
    
    if (confirm(`Are you sure you want to remove "${platform.name}"?`)) {
      try {
        await storageManager.removeCustomPlatform(platformId);
        
        // Reload custom platforms
        await this.loadCustomPlatforms();
        
        // Re-render the list
        await this.renderCustomPlatforms();
        
        this.showNotification('Custom platform removed successfully!', 'success');
        
        // Recreate context menu to remove the platform
        chrome.runtime.sendMessage({
          type: 'RECREATE_CONTEXT_MENU',
          data: {}
        });
        
      } catch (error) {
        console.error('Failed to remove custom platform:', error);
        this.showNotification('Failed to remove custom platform', 'error');
      }
    }
  }

  /**
   * Show notification
   */
  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    // Hide notification
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 4000);
  }
}

// Initialize options page when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  const optionsManager = new OptionsManager();
  await optionsManager.init();
});

// Export for testing
export { OptionsManager }; 