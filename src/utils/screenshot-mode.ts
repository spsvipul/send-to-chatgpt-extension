/**
 * Isolated Screenshot Mode - completely separate from text functionality
 * Simple workflow: capture screenshot → copy to clipboard → open AI platform
 */

import { getAllPlatforms } from './ai-platforms';

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
    const clipboardSuccess = await copyImageToClipboardViaContentScript(screenshotData);
    console.log('📋 Clipboard operation result:', clipboardSuccess);
    
    // Step 3: Open AI platform (always do this even if clipboard fails)
    const platform = getAllPlatforms().find(p => p.id === platformId);
    if (!platform) {
      return { success: false, error: 'Invalid platform selected' };
    }
    
    await chrome.tabs.create({ url: platform.url });
    console.log('🌐 Platform opened:', platform.name);
    
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
 * Get list of supported platforms for screenshot mode
 */
export function getScreenshotPlatforms() {
  return getAllPlatforms().map(platform => ({
    id: platform.id,
    name: platform.name,
    icon: platform.icon
  }));
}