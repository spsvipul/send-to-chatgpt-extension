/**
 * Unit tests for storage utility functions
 */

import { storageManager, DEFAULT_SETTINGS } from '../../src/utils/storage';
import { mockStorageGet, mockStorageSet } from '../setup';

describe('Storage Manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSettings', () => {
    it('should return default settings when no settings are stored', async () => {
      mockStorageGet({});
      
      const settings = await storageManager.getSettings();
      
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it('should merge stored settings with defaults', async () => {
      const storedSettings = {
        autoSend: false,
        defaultInstructions: 'Test instructions'
      };
      
      mockStorageGet(storedSettings);
      
      const settings = await storageManager.getSettings();
      
      expect(settings).toEqual({
        ...DEFAULT_SETTINGS,
        ...storedSettings
      });
    });

    it('should fallback to local storage when sync storage fails', async () => {
      const storedSettings = {
        autoSend: false,
        defaultInstructions: 'Test instructions'
      };
      
      // Mock sync storage failure
      chrome.storage.sync.get.mockRejectedValue(new Error('Sync storage failed'));
      chrome.storage.local.get.mockResolvedValue(storedSettings);
      
      const settings = await storageManager.getSettings();
      
      expect(settings).toEqual({
        ...DEFAULT_SETTINGS,
        ...storedSettings
      });
      expect(chrome.storage.local.get).toHaveBeenCalledWith(DEFAULT_SETTINGS);
    });

    it('should return defaults when both storage methods fail', async () => {
      chrome.storage.sync.get.mockRejectedValue(new Error('Sync storage failed'));
      chrome.storage.local.get.mockRejectedValue(new Error('Local storage failed'));
      
      const settings = await storageManager.getSettings();
      
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe('saveSettings', () => {
    it('should save settings to sync storage', async () => {
      mockStorageSet();
      
      const settingsToSave = {
        autoSend: false,
        defaultInstructions: 'Test instructions'
      };
      
      await storageManager.saveSettings(settingsToSave);
      
      expect(chrome.storage.sync.set).toHaveBeenCalledWith(settingsToSave);
    });

    it('should fallback to local storage when sync storage fails', async () => {
      const settingsToSave = {
        autoSend: false,
        defaultInstructions: 'Test instructions'
      };
      
      chrome.storage.sync.set.mockRejectedValue(new Error('Sync storage failed'));
      chrome.storage.local.set.mockResolvedValue(undefined);
      
      await storageManager.saveSettings(settingsToSave);
      
      expect(chrome.storage.local.set).toHaveBeenCalledWith(settingsToSave);
    });

    it('should debounce multiple save calls', async () => {
      mockStorageSet();
      
      const settingsToSave1 = { autoSend: false };
      const settingsToSave2 = { autoSend: true };
      
      // Call saveSettings multiple times quickly
      storageManager.saveSettings(settingsToSave1);
      storageManager.saveSettings(settingsToSave2);
      
      // Wait for debounce to complete
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Only the last call should be executed
      expect(chrome.storage.sync.set).toHaveBeenCalledTimes(1);
      expect(chrome.storage.sync.set).toHaveBeenCalledWith(settingsToSave2);
    });
  });

  describe('resetSettings', () => {
    it('should clear both sync and local storage', async () => {
      chrome.storage.sync.clear.mockResolvedValue(undefined);
      chrome.storage.local.clear.mockResolvedValue(undefined);
      
      await storageManager.resetSettings();
      
      expect(chrome.storage.sync.clear).toHaveBeenCalled();
      expect(chrome.storage.local.clear).toHaveBeenCalled();
    });

    it('should handle clear errors gracefully', async () => {
      chrome.storage.sync.clear.mockRejectedValue(new Error('Clear failed'));
      chrome.storage.local.clear.mockRejectedValue(new Error('Clear failed'));
      
      // Should not throw
      await expect(storageManager.resetSettings()).resolves.toBeUndefined();
    });
  });

  describe('onSettingsChanged', () => {
    it('should call callback when settings change', () => {
      const mockCallback = jest.fn();
      
      storageManager.onSettingsChanged(mockCallback);
      
      // Simulate storage change
      const mockChanges = {
        autoSend: { newValue: false, oldValue: true }
      };
      
      // Get the listener function that was registered
      const listener = chrome.storage.onChanged.addListener.mock.calls[0][0];
      
      // Call the listener with mock changes
      listener(mockChanges, 'sync');
      
      expect(mockCallback).toHaveBeenCalledWith({ autoSend: false });
    });

    it('should filter out non-settings changes', () => {
      const mockCallback = jest.fn();
      
      storageManager.onSettingsChanged(mockCallback);
      
      // Simulate storage change for non-settings keys
      const mockChanges = {
        someOtherKey: { newValue: 'test', oldValue: 'old' }
      };
      
      // Get the listener function that was registered
      const listener = chrome.storage.onChanged.addListener.mock.calls[0][0];
      
      // Call the listener with mock changes
      listener(mockChanges, 'sync');
      
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });
}); 