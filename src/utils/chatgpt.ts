/**
 * AI Platform integration utility
 * Handles deep linking and fallback to clipboard for multiple AI platforms
 */

import { copyToClipboard } from './clipboard';
import { getPlatform, injectTextIntoPlatform, type AIPlatform } from './ai-platforms';

export interface AIMessage {
  text: string;
  instructions: string;
  model?: string;
  platform?: string;
}

export interface AIResult {
  success: boolean;
  method: 'deeplink' | 'clipboard';
  error?: string;
  platform?: string;
}

const CHATGPT_BASE_URL = 'https://chatgpt.com';
const URL_SIZE_LIMIT = 1800; // Safe limit for URLs

/**
 * Build ChatGPT URL with query parameters (only works for ChatGPT)
 */
export function buildChatGPTUrl(message: AIMessage): string {
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
export function formatMessageForClipboard(message: AIMessage): string {
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
 * Send message to AI platform using deep link or clipboard fallback
 */
export async function sendToAI(
  message: AIMessage,
  autoSend: boolean = true,
  platformId: string = 'chatgpt'
): Promise<AIResult> {
  const platform = await getPlatform(platformId);
  const formattedMessage = formatMessageForClipboard(message);
  
  if (!formattedMessage.trim()) {
    return {
      success: false,
      method: 'clipboard',
      error: 'No message to send',
      platform: platform.name
    };
  }
  
  // Always copy to clipboard as backup
  await copyToClipboard(formattedMessage);
  
  if (autoSend && platformId === 'chatgpt') {
    // Try deep link first (only works for ChatGPT)
    const deepLinkUrl = buildChatGPTUrl(message);
    
    if (deepLinkUrl.length <= URL_SIZE_LIMIT) {
      try {
        await chrome.tabs.create({ url: deepLinkUrl });
        return {
          success: true,
          method: 'deeplink',
          platform: platform.name
        };
      } catch (error) {
        console.warn('Deep link failed:', error);
      }
    }
  }
  
  // For all platforms (including custom), open the platform and inject content
  try {
    const tab = await chrome.tabs.create({ url: platform.url });
    
    if (tab.id) {
      // Wait for page to load, then inject the content
      setTimeout(async () => {
        try {
          await injectTextIntoPlatform(tab.id!, platform, formattedMessage);
        } catch (error) {
          console.warn(`Failed to inject content into ${platform.name}:`, error);
        }
      }, 3000); // Wait 3 seconds for page to load
    }
    
    return {
      success: true,
      method: 'clipboard',
      platform: platform.name
    };
  } catch (error) {
    return {
      success: false,
      method: 'clipboard',
      error: `Failed to open ${platform.name} tab`,
      platform: platform.name
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
 * Validate AI message
 */
export function validateMessage(message: AIMessage): {
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

// Backward compatibility exports
export type ChatGPTMessage = AIMessage;
export type ChatGPTResult = AIResult;
export const sendToChatGPT = sendToAI; 