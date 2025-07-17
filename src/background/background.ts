/**
 * Background service worker for Chrome extension
 * Handles extension activation, text capture, and ChatGPT integration
 */

import { storageManager } from '../utils/storage';
import { sendToAI, validateMessage } from '../utils/chatgpt';
import { i18n } from '../utils/i18n';
import { handleScreenshotMode } from '../utils/screenshot-mode';

interface CaptureResult {
  text: string;
  html: string;
  isEmpty: boolean;
  truncated: boolean;
}

/**
 * Initialize extension
 */
chrome.runtime.onInstalled.addListener(() => {
  console.log('Send to ChatGPT extension installed');
  
  // Create context menu
  createContextMenu();
});

/**
 * Handle extension activation (toolbar button click or keyboard shortcut)
 */
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    await handleExtensionActivation(tab.id);
  }
});

/**
 * Handle keyboard shortcut
 */
chrome.commands.onCommand.addListener(async (command) => {
  if (command === '_execute_action') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.id) {
      await handleExtensionActivation(tab.id);
    }
  }
});

/**
 * Handle context menu clicks
 */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log('Context menu clicked:', info.menuItemId, 'on tab:', tab?.id);
  
  if (info.menuItemId === 'ask-chatgpt' && tab?.id) {
    console.log('🔤 Text mode activated');
    await handleExtensionActivation(tab.id);
  } else if (info.menuItemId === 'screenshot-mode' && tab?.id) {
    console.log('📸 Screenshot mode context menu clicked (default platform)');
    await handleScreenshotModeActivation();
  } else if (info.menuItemId === 'screenshot-chatgpt' && tab?.id) {
    console.log('📸 Screenshot mode -> ChatGPT');
    await handleScreenshotModeActivation('chatgpt');
  } else if (info.menuItemId === 'screenshot-claude' && tab?.id) {
    console.log('📸 Screenshot mode -> Claude');
    await handleScreenshotModeActivation('claude');
  } else if (info.menuItemId === 'screenshot-gemini' && tab?.id) {
    console.log('📸 Screenshot mode -> Gemini');
    await handleScreenshotModeActivation('gemini');
  } else {
    console.log('❌ Unknown menu item or invalid tab:', info.menuItemId, tab?.id);
  }
});

/**
 * Create context menu
 */
async function createContextMenu() {
  try {
    await chrome.contextMenus.removeAll();
    
    // Text mode context menu (existing functionality)
    chrome.contextMenus.create({
      id: 'ask-chatgpt',
      title: i18n.askChatGPT(),
      contexts: ['selection']
    });
    
    // Screenshot mode context menu (completely separate)
    chrome.contextMenus.create({
      id: 'screenshot-mode',
      title: '📸 Send Screenshot to AI',
      contexts: ['page', 'frame', 'selection']
    });
    
    // Add sub-menu items for different platforms
    chrome.contextMenus.create({
      id: 'screenshot-chatgpt',
      parentId: 'screenshot-mode',
      title: '🤖 ChatGPT',
      contexts: ['page', 'frame', 'selection']
    });
    
    chrome.contextMenus.create({
      id: 'screenshot-claude',
      parentId: 'screenshot-mode',
      title: '🔶 Claude',
      contexts: ['page', 'frame', 'selection']
    });
    
    chrome.contextMenus.create({
      id: 'screenshot-gemini',
      parentId: 'screenshot-mode',
      title: '✨ Gemini',
      contexts: ['page', 'frame', 'selection']
    });
  } catch (error) {
    console.error('Failed to create context menu:', error);
  }
}

/**
 * Main extension activation handler
 */
async function handleExtensionActivation(tabId: number) {
  try {
    // Get current settings
    const settings = await storageManager.getSettings();
    
    // Capture selected text
    const captureResult = await captureSelectedText(tabId, settings.maxTextLength);
    
    // Always show popup first - let user decide what to do
    await showPopup(tabId, captureResult);
  } catch (error) {
    console.error('Extension activation failed:', error);
    showNotification(i18n.error(), 'error');
  }
}

/**
 * Capture selected text from the active tab
 */
async function captureSelectedText(tabId: number, maxLength: number): Promise<CaptureResult> {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        // This function runs in the content script context
        function captureSelection() {
          const selection = window.getSelection();
          
          if (!selection || selection.rangeCount === 0) {
            return { text: '', html: '', isEmpty: true, truncated: false };
          }
          
          const range = selection.getRangeAt(0);
          const text = selection.toString().trim();
          
          if (text.length === 0) {
            return { text: '', html: '', isEmpty: true, truncated: false };
          }
          
          // Get HTML content
          const container = document.createElement('div');
          container.appendChild(range.cloneContents());
          const html = container.innerHTML;
          
          return { text, html, isEmpty: false, truncated: false };
        }
        
        return captureSelection();
      }
    });
    
    if (results && results[0] && results[0].result) {
      const result = results[0].result as CaptureResult;
      
      // Process and truncate if needed
      if (result.text.length > maxLength) {
        const truncated = result.text.substring(0, maxLength);
        const lastSpace = truncated.lastIndexOf(' ');
        
        if (lastSpace > maxLength * 0.8) {
          result.text = truncated.substring(0, lastSpace) + '...';
        } else {
          result.text = truncated + '...';
        }
        
        result.truncated = true;
      }
      
      return result;
    }
  } catch (error) {
    console.error('Failed to capture selection:', error);
  }
  
  return { text: '', html: '', isEmpty: true, truncated: false };
}

/**
 * Show popup modal
 */
async function showPopup(tabId: number, captureResult: CaptureResult) {
  try {
    // First inject the popup script
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['popup.js']
    });
    
    // Then call the popup function
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (result) => {
        // This function runs in the content script context
        // It will create and show the popup modal
        (window as any).showChatGPTPopup?.(result);
      },
      args: [captureResult]
    });
  } catch (error) {
    console.error('Failed to show popup:', error);
    showNotification(i18n.error(), 'error');
  }
}

/**
 * Handle screenshot mode activation (completely separate from text mode)
 */
async function handleScreenshotModeActivation(platformId?: string) {
  try {
    console.log('🖼️ Screenshot mode activated');
    
    // Check if current tab is accessible for screenshot
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!currentTab || !currentTab.url) {
      showNotification('Cannot capture screenshot: Invalid tab', 'error');
      return;
    }
    
    // Check for restricted URLs
    const restrictedProtocols = ['chrome:', 'chrome-extension:', 'moz-extension:', 'edge:', 'about:'];
    const isRestricted = restrictedProtocols.some(protocol => currentTab.url!.startsWith(protocol));
    
    if (isRestricted) {
      showNotification('Cannot capture screenshot on this page. Try on a regular website.', 'error');
      return;
    }
    
    // Use provided platform or get from settings
    let platform = platformId;
    if (!platform) {
      const settings = await storageManager.getSettings();
      platform = settings.defaultPlatform || 'chatgpt';
    }
    
    console.log('🖼️ Using platform:', platform);
    
    // Execute isolated screenshot workflow
    const result = await handleScreenshotMode(platform);
    
    if (result.success) {
      showNotification(
        `📸 Screenshot copied! Go to ${result.platform} and paste (Ctrl+V)`,
        'success'
      );
    } else {
      showNotification(`Screenshot failed: ${result.error}`, 'error');
    }
  } catch (error) {
    console.error('Screenshot mode activation failed:', error);
    showNotification('Screenshot mode failed', 'error');
  }
}

/**
 * Show notification
 */
function showNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const iconPath = type === 'error' ? 'icons/icon16.png' : 'icons/icon16.png';
  
  chrome.notifications.create({
    type: 'basic',
    iconUrl: iconPath,
    title: i18n.extensionName(),
    message: message
  });
}

/**
 * Handle messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'SEND_TO_CHATGPT':
      handleSendToChatGPT(message.data)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep message channel open for async response
      
    case 'SEND_TO_AI':
      handleSendToAI(message.data)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep message channel open for async response
      
    case 'SCREENSHOT_MODE':
      handleScreenshotModeMessage(message.data)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep message channel open for async response
      
    case 'GET_SETTINGS':
      storageManager.getSettings()
        .then(settings => sendResponse(settings))
        .catch(error => sendResponse(null));
      return true;
      
    case 'SAVE_SETTINGS':
      storageManager.saveSettings(message.data)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }
});

/**
 * Handle screenshot mode message (programmatic call)
 */
async function handleScreenshotModeMessage(data: any) {
  try {
    console.log('Received screenshot mode message:', data);
    
    const platformId = data.platform || 'chatgpt';
    const result = await handleScreenshotMode(platformId);
    
    return result;
  } catch (error) {
    console.error('Error in handleScreenshotModeMessage:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Handle send to ChatGPT message (backward compatibility)
 */
async function handleSendToChatGPT(data: any) {
  try {
    console.log('Received data:', data);
    console.log('Message to validate:', data.message);
    
    // Validate the message object, not the entire data
    const validation = validateMessage(data.message);
    console.log('Validation result:', validation);
    
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    const result = await sendToAI(data.message, data.autoSend, 'chatgpt');
    return result;
  } catch (error) {
    console.error('Error in handleSendToChatGPT:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Handle send to AI platform message
 */
async function handleSendToAI(data: any) {
  try {
    console.log('Received data:', data);
    console.log('Message to validate:', data.message);
    
    // Validate the message object, not the entire data
    const validation = validateMessage(data.message);
    console.log('Validation result:', validation);
    
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    const platformId = data.platform || 'chatgpt';
    const result = await sendToAI(data.message, data.autoSend, platformId);
    return result;
  } catch (error) {
    console.error('Error in handleSendToAI:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
} 