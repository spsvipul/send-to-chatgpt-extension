/**
 * Clipboard utility with fallback mechanisms
 */

export interface ClipboardResult {
  success: boolean;
  error?: string;
}

/**
 * Copy text to clipboard using modern API with fallback
 */
export async function copyToClipboard(text: string): Promise<ClipboardResult> {
  // Try modern clipboard API first (only works in secure contexts and certain environments)
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return { success: true };
    }
  } catch (error) {
    console.warn('Clipboard API failed:', error);
  }

  // Fallback to content script injection
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) {
      await chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: fallbackCopyToClipboard,
        args: [text]
      });
      return { success: true };
    }
  } catch (error) {
    console.warn('Content script clipboard fallback failed:', error);
  }

  return { 
    success: false, 
    error: 'Clipboard access denied. Please copy manually.' 
  };
}

/**
 * Fallback clipboard function to be injected into content script
 */
function fallbackCopyToClipboard(text: string): void {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.top = '-999999px';
  textarea.style.left = '-999999px';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  
  try {
    document.execCommand('copy');
    console.log('Fallback clipboard copy successful');
  } catch (error) {
    console.error('Fallback clipboard copy failed:', error);
  } finally {
    document.body.removeChild(textarea);
  }
}

/**
 * Test clipboard permissions
 */
export async function testClipboardPermissions(): Promise<boolean> {
  try {
    const testText = 'test';
    await navigator.clipboard.writeText(testText);
    return true;
  } catch (error) {
    return false;
  }
} 