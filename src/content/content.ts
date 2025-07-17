/**
 * Content script for capturing text selection from web pages
 * Injected on-demand via chrome.scripting.executeScript
 */

interface SelectionResult {
  text: string;
  html: string;
  isEmpty: boolean;
}

/**
 * Captures the currently selected text from the page
 */
function captureSelection(): SelectionResult {
  const selection = window.getSelection();
  
  if (!selection || selection.rangeCount === 0) {
    return {
      text: '',
      html: '',
      isEmpty: true
    };
  }
  
  const range = selection.getRangeAt(0);
  const text = selection.toString().trim();
  
  // Get HTML content for rich text (future feature)
  const container = document.createElement('div');
  container.appendChild(range.cloneContents());
  const html = container.innerHTML;
  
  return {
    text,
    html,
    isEmpty: text.length === 0
  };
}

/**
 * Sanitizes text by removing control characters and normalizing whitespace
 */
function sanitizeText(text: string): string {
  return text
    // Remove control characters except tabs and newlines
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Trim
    .trim();
}

/**
 * Truncates text to specified limit while preserving word boundaries
 */
function truncateText(text: string, limit: number): { text: string; truncated: boolean } {
  if (text.length <= limit) {
    return { text, truncated: false };
  }
  
  // Find the last space before the limit
  const truncated = text.substring(0, limit);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > limit * 0.8) {
    // If we can break at a word boundary without losing too much
    return {
      text: truncated.substring(0, lastSpace) + '...',
      truncated: true
    };
  } else {
    // Hard truncation if no good break point
    return {
      text: truncated + '...',
      truncated: true
    };
  }
}

/**
 * Main function to get and process selected text
 */
function getProcessedSelection(maxLength: number = 8192): {
  text: string;
  html: string;
  isEmpty: boolean;
  truncated: boolean;
} {
  const selection = captureSelection();
  
  if (selection.isEmpty) {
    return {
      text: '',
      html: '',
      isEmpty: true,
      truncated: false
    };
  }
  
  const sanitized = sanitizeText(selection.text);
  const { text, truncated } = truncateText(sanitized, maxLength);
  
  return {
    text,
    html: selection.html,
    isEmpty: false,
    truncated
  };
}

// Export for background script to call
(window as any).getProcessedSelection = getProcessedSelection;

// Return the result if called directly (for chrome.scripting.executeScript)
if (typeof getProcessedSelection === 'function') {
  getProcessedSelection();
} 