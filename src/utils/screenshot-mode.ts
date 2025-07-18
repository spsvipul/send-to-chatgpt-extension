/**
 * Isolated Screenshot Mode - completely separate from text functionality
 * Simple workflow: capture screenshot → copy to clipboard → open AI platform
 */

import { getAllPlatforms, getPlatform } from './ai-platforms';

export interface ScreenshotResult {
  success: boolean;
  error?: string;
  platform?: string;
}

/**
 * Capture screenshot and copy to clipboard, then open AI platform
 */
export async function handleScreenshotMode(platformId: string = 'chatgpt'): Promise<ScreenshotResult> {
  try {
    console.log('🖼️ Starting isolated screenshot mode for platform:', platformId);
    
    // Step 1: Capture screenshot
    const screenshotData = await captureVisibleTab();
    if (!screenshotData) {
      return { success: false, error: 'Failed to capture screenshot' };
    }
    console.log('📸 Screenshot captured, size:', screenshotData.length);
    
    // Step 2: Copy to clipboard via content script
    let clipboardSuccess = await copyImageToClipboardViaContentScript(screenshotData);
    console.log('📋 Clipboard operation result:', clipboardSuccess);
    
    // Step 3: Open AI platform and do clipboard operation there
    const platform = await getPlatform(platformId);
    if (!platform) {
      return { success: false, error: 'Invalid platform selected' };
    }
    
    const newTab = await chrome.tabs.create({ url: platform.url });
    console.log('🌐 Platform opened:', platform.name);
    
    // Step 4: If clipboard failed in original context, try in the new platform tab
    if (!clipboardSuccess && newTab.id) {
      console.log('🔄 Clipboard failed in original context, trying in platform tab...');
      
      // Wait for the platform tab to load properly
      await waitForTabToLoad(newTab.id);
      
      const platformClipboardSuccess = await copyImageToClipboardInPlatformTab(newTab.id, screenshotData);
      console.log('📋 Platform tab clipboard result:', platformClipboardSuccess);
      
      if (platformClipboardSuccess) {
        clipboardSuccess = true;
      }
    }
    
    // Return success with clipboard status
    return { 
      success: true, 
      platform: platform.name,
      error: clipboardSuccess ? undefined : 'Platform opened but clipboard copy may have failed - try manual upload'
    };
    
  } catch (error) {
    console.error('❌ Screenshot mode failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Capture visible tab as screenshot
 */
async function captureVisibleTab(): Promise<string | null> {
  try {
    console.log('📸 Capturing visible tab...');
    
    const dataUrl = await chrome.tabs.captureVisibleTab(undefined, {
      format: 'png',
      quality: 90
    });
    
    console.log('✅ Screenshot captured');
    return dataUrl;
  } catch (error) {
    console.error('❌ Failed to capture screenshot:', error);
    return null;
  }
}

/**
 * Copy image to clipboard via content script (works in page context)
 */
async function copyImageToClipboardViaContentScript(dataUrl: string): Promise<boolean> {
  try {
    console.log('📋 Copying image to clipboard via content script...');
    
    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      console.log('❌ No active tab found');
      return false;
    }
    
    // Execute clipboard operation in content script context
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async (imageDataUrl: string) => {
        try {
          console.log('🔄 Content script: Starting clipboard operation...');
          
          // Check if clipboard operations are supported
          if (!('clipboard' in navigator) || 
              !('write' in navigator.clipboard) || 
              typeof ClipboardItem === 'undefined') {
            console.log('❌ Content script: Clipboard image not supported');
            return false;
          }
          
          // Convert data URL to blob
          const response = await fetch(imageDataUrl);
          const blob = await response.blob();
          
          // Create ClipboardItem
          const clipboardItem = new ClipboardItem({
            [blob.type]: blob
          });
          
          // Write to clipboard
          await navigator.clipboard.write([clipboardItem]);
          
          console.log('✅ Content script: Image copied to clipboard successfully');
          return true;
        } catch (error) {
          console.error('❌ Content script: Clipboard operation failed:', error);
          return false;
        }
      },
      args: [dataUrl]
    });
    
    const success = results?.[0]?.result || false;
    console.log('📋 Clipboard operation completed:', success);
    return success;
    
  } catch (error) {
    console.error('❌ Failed to execute clipboard operation:', error);
    return false;
  }
}

/**
 * Wait for a tab to finish loading
 */
async function waitForTabToLoad(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    const checkTab = async () => {
      try {
        const tab = await chrome.tabs.get(tabId);
        if (tab.status === 'complete') {
          console.log('✅ Tab loaded successfully');
          resolve();
        } else {
          console.log('⏳ Tab still loading, waiting...');
          setTimeout(checkTab, 500);
        }
      } catch (error) {
        console.error('❌ Error checking tab status:', error);
        resolve(); // Resolve anyway to prevent hanging
      }
    };
    
    checkTab();
    
    // Fallback timeout after 10 seconds
    setTimeout(() => {
      console.log('⏰ Tab load timeout, proceeding anyway');
      resolve();
    }, 10000);
  });
}

/**
 * Copy image to clipboard via the AI platform tab (bypasses PDF restrictions)
 */
async function copyImageToClipboardInPlatformTab(tabId: number, dataUrl: string): Promise<boolean> {
  try {
    console.log('📋 Copying image to clipboard via platform tab...', tabId);
    
    // Execute clipboard operation in the platform tab context
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: async (imageDataUrl: string) => {
        try {
          console.log('🔄 Platform tab: Starting clipboard operation...');
          
          // Ensure document is focused (platform tab should be focused)
          window.focus();
          document.body.focus();
          
          // Wait a bit for focus to take effect
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Check if clipboard operations are supported
          if (!('clipboard' in navigator) || 
              !('write' in navigator.clipboard) || 
              typeof ClipboardItem === 'undefined') {
            console.log('❌ Platform tab: Clipboard image not supported');
            return false;
          }
          
          // Convert data URL to blob
          const response = await fetch(imageDataUrl);
          const blob = await response.blob();
          
          // Create ClipboardItem
          const clipboardItem = new ClipboardItem({
            [blob.type]: blob
          });
          
          // Write to clipboard
          await navigator.clipboard.write([clipboardItem]);
          
          console.log('✅ Platform tab: Image copied to clipboard successfully');
          return true;
        } catch (error) {
          console.error('❌ Platform tab: Clipboard operation failed:', error);
          return false;
        }
      },
      args: [dataUrl]
    });
    
    const success = results?.[0]?.result || false;
    console.log('📋 Platform tab clipboard operation completed:', success);
    return success;
    
  } catch (error) {
    console.error('❌ Failed to execute platform tab clipboard operation:', error);
    return false;
  }
}

/**
 * Get list of supported platforms for screenshot mode
 */
export async function getScreenshotPlatforms() {
  const allPlatforms = await getAllPlatforms();
  return allPlatforms.map(platform => ({
    id: platform.id,
    name: platform.name,
    icon: platform.icon
  }));
}