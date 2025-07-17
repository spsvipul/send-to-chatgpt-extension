/**
 * ChatGPT integration utility
 * Handles deep linking and fallback to clipboard
 */

import { copyToClipboard } from './clipboard';

export interface ChatGPTMessage {
  text: string;
  instructions: string;
  model?: string;
}

export interface ChatGPTResult {
  success: boolean;
  method: 'deeplink' | 'clipboard';
  error?: string;
}

const CHATGPT_BASE_URL = 'https://chatgpt.com';
const URL_SIZE_LIMIT = 1800; // Safe limit for URLs

/**
 * Build ChatGPT URL with query parameters
 */
export function buildChatGPTUrl(message: ChatGPTMessage): string {
  const { text, instructions, model = 'gpt-4o' } = message;
  
  // Add null checks and default to empty string
  const safeInstructions = instructions || '';
  const safeText = text || '';
  
  // Format the complete message
  let fullMessage = '';
  if (safeInstructions.trim()) {
    fullMessage = safeInstructions.trim() + '\n\n';
  }
  if (safeText.trim()) {
    fullMessage += '"""\n' + safeText.trim() + '\n"""';
  }
  
  // Build URL with query parameters
  const url = new URL(CHATGPT_BASE_URL);
  url.searchParams.set('q', fullMessage);
  
  // Only add model if it's not the default
  if (model !== 'gpt-4o') {
    url.searchParams.set('model', model);
  }
  
  return url.toString();
}

/**
 * Format message for clipboard
 */
export function formatMessageForClipboard(message: ChatGPTMessage): string {
  const { text, instructions } = message;
  
  // Add null checks and default to empty string
  const safeInstructions = instructions || '';
  const safeText = text || '';
  
  let fullMessage = '';
  if (safeInstructions.trim()) {
    fullMessage = safeInstructions.trim() + '\n\n';
  }
  if (safeText.trim()) {
    fullMessage += '"""\n' + safeText.trim() + '\n"""';
  }
  
  return fullMessage;
}

/**
 * Send message to ChatGPT using deep link or clipboard fallback
 */
export async function sendToChatGPT(
  message: ChatGPTMessage,
  autoSend: boolean = true
): Promise<ChatGPTResult> {
  const formattedMessage = formatMessageForClipboard(message);
  
  if (!formattedMessage.trim()) {
    return {
      success: false,
      method: 'clipboard',
      error: 'No message to send'
    };
  }
  
  // Always copy to clipboard as backup
  await copyToClipboard(formattedMessage);
  
  if (autoSend) {
    // Try deep link first
    const deepLinkUrl = buildChatGPTUrl(message);
    
    if (deepLinkUrl.length <= URL_SIZE_LIMIT) {
      try {
        await chrome.tabs.create({ url: deepLinkUrl });
        return {
          success: true,
          method: 'deeplink'
        };
      } catch (error) {
        console.warn('Deep link failed:', error);
      }
    }
  }
  
  // Manual mode: open ChatGPT and inject content into input field
  try {
    const tab = await chrome.tabs.create({ url: CHATGPT_BASE_URL });
    
    if (tab.id) {
      // Wait for page to load, then inject the content
      setTimeout(async () => {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id! },
            func: (messageText: string) => {
              // Enhanced injection approach with better selectors and retry logic
              const injectContent = () => {
                // Try multiple selectors in order of preference
                const selectors = [
                  'textarea[data-id="root"]',
                  'textarea[placeholder*="Message"]',
                  'textarea[placeholder*="message"]',
                  'textarea[placeholder*="Send"]',
                  'textarea[placeholder*="send"]',
                  'div[contenteditable="true"]',
                  'textarea'
                ];
                
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
                
                console.warn('❌ Could not find ChatGPT input field');
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
            args: [formattedMessage]
          });
        } catch (error) {
          console.warn('Failed to inject content into ChatGPT:', error);
        }
      }, 3000); // Wait 3 seconds for page to load
    }
    
    return {
      success: true,
      method: 'clipboard'
    };
  } catch (error) {
    return {
      success: false,
      method: 'clipboard',
      error: 'Failed to open ChatGPT tab'
    };
  }
}

/**
 * Test if ChatGPT deep link works
 */
export async function testDeepLink(): Promise<boolean> {
  try {
    const testMessage: ChatGPTMessage = {
      text: 'test',
      instructions: 'test'
    };
    
    const url = buildChatGPTUrl(testMessage);
    
    // Test by creating a tab and immediately closing it
    const tab = await chrome.tabs.create({ url, active: false });
    if (tab.id) {
      setTimeout(() => {
        chrome.tabs.remove(tab.id!);
      }, 1000);
    }
    
    return true;
  } catch (error) {
    console.error('Deep link test failed:', error);
    return false;
  }
}

/**
 * Validate ChatGPT message
 */
export function validateMessage(message: ChatGPTMessage): {
  valid: boolean;
  error?: string;
} {
  const { text, instructions } = message;
  
  // Add null checks and default to empty string
  const safeText = text || '';
  const safeInstructions = instructions || '';
  
  if (!safeText.trim() && !safeInstructions.trim()) {
    return {
      valid: false,
      error: 'Please enter some text or instructions'
    };
  }
  
  const fullMessage = formatMessageForClipboard(message);
  if (fullMessage.length > 16384) { // 16KB limit
    return {
      valid: false,
      error: 'Message too long. Please shorten your text or instructions.'
    };
  }
  
  return { valid: true };
} 