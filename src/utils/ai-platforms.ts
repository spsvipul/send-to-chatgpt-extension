/**
 * AI Platform configurations and utilities
 */

import { storageManager, CustomPlatform } from './storage';

export interface AIPlatform {
  id: string;
  name: string;
  url: string;
  selectors?: string[];
  color?: string;
  icon: string;
}

export const AI_PLATFORMS: Record<string, AIPlatform> = {
  chatgpt: {
    id: 'chatgpt',
    name: 'ChatGPT',
    url: 'https://chatgpt.com',
    selectors: [
      'textarea[data-id="root"]',
      'textarea[placeholder*="Message"]',
      'textarea[placeholder*="message"]',
      'textarea[placeholder*="Send"]',
      'textarea[placeholder*="send"]',
      'div[contenteditable="true"]',
      'textarea'
    ],
    color: '#10a37f',
    icon: '🤖'
  },
  claude: {
    id: 'claude',
    name: 'Claude',
    url: 'https://claude.ai/new',
    selectors: [
      'div[contenteditable="true"]',
      'textarea[placeholder*="Talk to Claude"]',
      'textarea[placeholder*="Message"]',
      'textarea[placeholder*="message"]',
      '.ProseMirror',
      'textarea'
    ],
    color: '#cc785c',
    icon: '🔶'
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini',
    url: 'https://gemini.google.com/app',
    selectors: [
      'textarea[placeholder*="Enter a prompt here"]',
      'textarea[placeholder*="Message Gemini"]',
      'div[contenteditable="true"]',
      'textarea[placeholder*="Ask Gemini"]',
      'textarea'
    ],
    color: '#4285f4',
    icon: '✨'
  }
};

export async function getPlatform(platformId: string): Promise<AIPlatform> {
  // Check built-in platforms first
  if (AI_PLATFORMS[platformId]) {
    return AI_PLATFORMS[platformId];
  }
  
  // Check custom platforms
  const customPlatforms = await storageManager.getCustomPlatforms();
  const customPlatform = customPlatforms.find(p => p.id === platformId);
  
  if (customPlatform) {
    return {
      id: customPlatform.id,
      name: customPlatform.name,
      url: customPlatform.url,
      icon: customPlatform.icon,
      selectors: [], // Custom platforms don't have selectors (screenshot mode only)
      color: '#6b7280' // Default gray color for custom platforms
    };
  }
  
  // Fallback to ChatGPT
  return AI_PLATFORMS.chatgpt;
}

export async function getAllPlatforms(): Promise<AIPlatform[]> {
  const builtInPlatforms = Object.values(AI_PLATFORMS);
  console.log('Built-in platforms:', builtInPlatforms);
  
  const customPlatforms = await storageManager.getCustomPlatforms();
  console.log('Custom platforms from storage in getAllPlatforms:', customPlatforms);
  
  // Convert custom platforms to AIPlatform format
  const customAIPlatforms: AIPlatform[] = customPlatforms.map(custom => ({
    id: custom.id,
    name: custom.name,
    url: custom.url,
    icon: custom.icon,
    selectors: [], // Custom platforms don't have selectors (screenshot mode only)
    color: '#6b7280' // Default gray color for custom platforms
  }));
  
  console.log('Custom AI platforms converted:', customAIPlatforms);
  
  const allPlatforms = [...builtInPlatforms, ...customAIPlatforms];
  console.log('All platforms combined:', allPlatforms);
  
  return allPlatforms;
}

// Synchronous version for cases where we need immediate access to built-in platforms
export function getBuiltInPlatforms(): AIPlatform[] {
  return Object.values(AI_PLATFORMS);
}

// Synchronous version for built-in platforms only
export function getBuiltInPlatform(platformId: string): AIPlatform {
  return AI_PLATFORMS[platformId] || AI_PLATFORMS.chatgpt;
}

/**
 * Inject text into the specified AI platform
 */
export async function injectTextIntoPlatform(
  tabId: number,
  platform: AIPlatform,
  text: string
): Promise<boolean> {
  try {
    // For custom platforms without selectors, use generic fallback selectors
    const selectorsToTry = platform.selectors && platform.selectors.length > 0 
      ? platform.selectors 
      : [
          // Generic AI chat interface selectors
          'textarea[placeholder*="message"]',
          'textarea[placeholder*="Message"]',
          'textarea[placeholder*="chat"]',
          'textarea[placeholder*="Chat"]',
          'textarea[placeholder*="prompt"]',
          'textarea[placeholder*="Prompt"]',
          'textarea[placeholder*="ask"]',
          'textarea[placeholder*="Ask"]',
          'textarea[placeholder*="type"]',
          'textarea[placeholder*="Type"]',
          'div[contenteditable="true"]',
          'textarea[data-testid*="input"]',
          'textarea[data-testid*="message"]',
          'textarea[role="textbox"]',
          'div[role="textbox"]',
          'textarea', // Last resort
          'input[type="text"]' // Very last resort
        ];
    
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: (messageText: string, selectors: string[]) => {
        // Enhanced injection approach with platform-specific selectors
        const injectContent = () => {
          for (const selector of selectors) {
            const element = document.querySelector(selector);
            
            if (element) {
              try {
                if (element instanceof HTMLTextAreaElement) {
                  // For textarea elements
                  element.value = messageText;
                  
                  // Trigger comprehensive events
                  element.dispatchEvent(new Event('input', { bubbles: true }));
                  element.dispatchEvent(new Event('change', { bubbles: true }));
                  element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
                  element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
                  
                  // Focus and select
                  element.focus();
                  element.select();
                  
                  console.log('✅ Content successfully injected into textarea:', selector);
                  return true;
                } else if (element instanceof HTMLDivElement && element.contentEditable === 'true') {
                  // For contenteditable div elements
                  element.textContent = messageText;
                  
                  // Trigger events
                  element.dispatchEvent(new Event('input', { bubbles: true }));
                  element.dispatchEvent(new Event('change', { bubbles: true }));
                  element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
                  element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
                  
                  // Focus and select all
                  element.focus();
                  const selection = window.getSelection();
                  const range = document.createRange();
                  range.selectNodeContents(element);
                  selection?.removeAllRanges();
                  selection?.addRange(range);
                  
                  console.log('✅ Content injected into contenteditable div:', selector);
                  return true;
                }
              } catch (error) {
                console.warn('Failed to inject into element:', selector, error);
                continue;
              }
            }
          }
          
          console.warn('❌ Could not find input field for platform');
          return false;
        };
        
        // Multiple retry attempts with increasing delays
        const retryAttempts = [0, 1000, 2000, 5000];
        let attemptIndex = 0;
        
        const tryInject = () => {
          if (injectContent()) {
            return; // Success!
          }
          
          attemptIndex++;
          if (attemptIndex < retryAttempts.length) {
            console.log(`Retrying injection attempt ${attemptIndex + 1}/${retryAttempts.length} in ${retryAttempts[attemptIndex]}ms`);
            setTimeout(tryInject, retryAttempts[attemptIndex]);
          } else {
            console.warn('❌ All injection attempts failed - text is copied to clipboard, please paste manually');
          }
        };
        
        tryInject();
      },
      args: [text, selectorsToTry]
    });
    
    return true;
  } catch (error) {
    console.error('Failed to inject text into platform:', error);
    return false;
  }
}