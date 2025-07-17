/**
 * Internationalization utility for Chrome extension
 */

/**
 * Get localized message
 */
export function getMessage(key: string, substitutions?: string | string[]): string {
  try {
    return chrome.i18n.getMessage(key, substitutions) || key;
  } catch (error) {
    console.warn('i18n getMessage failed:', error);
    return key;
  }
}

/**
 * Get current locale
 */
export function getLocale(): string {
  try {
    return chrome.i18n.getUILanguage() || 'en';
  } catch (error) {
    console.warn('i18n getUILanguage failed:', error);
    return 'en';
  }
}

/**
 * Check if current locale is RTL
 */
export function isRTL(): boolean {
  const locale = getLocale();
  const rtlLocales = ['ar', 'he', 'fa', 'ur'];
  return rtlLocales.some(rtl => locale.startsWith(rtl));
}

/**
 * Format message with substitutions
 */
export function formatMessage(key: string, ...substitutions: string[]): string {
  return getMessage(key, substitutions);
}

/**
 * Common message getters
 */
export const i18n = {
  extensionName: () => getMessage('extensionName'),
  extensionDescription: () => getMessage('extensionDescription'),
  sendToChatGPT: () => getMessage('sendToChatGPT'),
  selectedText: () => getMessage('selectedText'),
  instructions: () => getMessage('instructions'),
  instructionsPlaceholder: () => getMessage('instructionsPlaceholder'),
  noTextSelected: () => getMessage('noTextSelected'),
  cancel: () => getMessage('cancel'),
  send: () => getMessage('send'),
  autoSend: () => getMessage('autoSend'),
  saveInstructions: () => getMessage('saveInstructions'),
  messageCopied: () => getMessage('messageCopied'),
  openingChatGPT: () => getMessage('openingChatGPT'),
  error: () => getMessage('error'),
  clipboardError: () => getMessage('clipboardError'),
  textTruncated: (limit: string) => getMessage('textTruncated', limit),
  askChatGPT: () => getMessage('askChatGPT'),
}; 