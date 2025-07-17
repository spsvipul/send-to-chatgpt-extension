/**
 * Popup UI logic for Chrome extension
 * Handles the modal popup interface for text editing and sending to ChatGPT
 */

import { storageManager, ExtensionSettings } from '../utils/storage';
import { i18n } from '../utils/i18n';

interface PopupData {
  text: string;
  html: string;
  isEmpty: boolean;
  truncated: boolean;
}

class PopupManager {
  private shadowRoot: ShadowRoot | null = null;
  private data: PopupData | null = null;
  private settings: ExtensionSettings | null = null;

  /**
   * Initialize popup with data
   */
  async init(data: PopupData) {
    this.data = data;
    this.settings = await storageManager.getSettings();
    
    await this.createShadowDOM();
    await this.setupEventListeners();
    await this.populateForm();
    this.showPopup();
    
    // Focus on instructions input
    setTimeout(() => {
      const instructionsInput = this.shadowRoot?.getElementById('instructions') as HTMLTextAreaElement;
      if (instructionsInput) {
        instructionsInput.focus();
      }
    }, 100);
  }

  /**
   * Create shadow DOM for CSS isolation
   */
  private async createShadowDOM() {
    // Remove existing popup
    this.removePopup();
    
    // Create shadow host
    const shadowHost = document.createElement('div');
    shadowHost.id = 'chatgpt-popup-shadow-host';
    shadowHost.style.cssText = 'position: fixed; top: 0; left: 0; z-index: 2147483647;';
    
    // Create shadow DOM
    this.shadowRoot = shadowHost.attachShadow({ mode: 'closed' });
    
    // Load HTML content
    const htmlContent = await this.getHTMLContent();
    this.shadowRoot.innerHTML = htmlContent;
    
    // Apply dark mode if enabled
    if (this.settings?.darkMode) {
      const overlay = this.shadowRoot.querySelector('.popup-overlay');
      overlay?.classList.add('dark');
    }
    
    // Append to document
    document.body.appendChild(shadowHost);
  }

  /**
   * Get HTML content for shadow DOM
   */
  private async getHTMLContent(): Promise<string> {
    // In a real implementation, this would load from popup.html
    // For this example, we'll include the HTML inline
    return `
      <style>
        :host {
          all: initial;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2147483647;
          opacity: 0;
          transition: opacity 300ms ease;
        }
        
        .popup-overlay.show {
          opacity: 1;
        }
        
        .popup-modal {
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
          width: 90%;
          max-width: 600px;
          max-height: 80vh;
          overflow: hidden;
          transform: scale(0.9);
          transition: transform 300ms ease;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .popup-overlay.show .popup-modal {
          transform: scale(1);
        }
        
        .popup-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
        }
        
        .popup-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #111827;
        }
        
        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #6b7280;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: background-color 0.2s;
        }
        
        .close-btn:hover {
          background: #e5e7eb;
        }
        
        .popup-content {
          padding: 20px;
          max-height: 60vh;
          overflow-y: auto;
        }
        
        .form-section {
          margin-bottom: 16px;
        }
        
        .form-section label {
          display: block;
          margin-bottom: 4px;
          font-weight: 500;
          color: #374151;
          font-size: 14px;
        }
        
        .form-section textarea {
          width: 100%;
          min-height: 80px;
          max-height: 200px;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 14px;
          line-height: 1.5;
          resize: vertical;
          font-family: inherit;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        
        .form-section textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 1px #3b82f6;
        }
        
        .form-section textarea[readonly] {
          background: #f9fafb;
          color: #6b7280;
        }
        

        
        .form-options {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 16px;
        }
        
        .form-options label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #374151;
          cursor: pointer;
        }
        
        .form-options input[type="checkbox"] {
          margin: 0;
        }
        
        .mode-explanation {
          margin-top: 12px;
          padding: 12px;
          background: #f8fafc;
          border-radius: 4px;
          border-left: 3px solid #3b82f6;
        }
        
        .mode-explanation p {
          margin: 4px 0;
          font-size: 13px;
          color: #64748b;
        }
        
        .popup-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 20px;
          border-top: 1px solid #e5e7eb;
          background: #f9fafb;
        }
        
        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          min-width: 80px;
        }
        
        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
        }
        
        .btn-secondary:hover {
          background: #e5e7eb;
        }
        
        .btn-primary {
          background: #3b82f6;
          color: white;
        }
        
        .btn-primary:hover {
          background: #2563eb;
        }
        
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .notification {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 12px 16px;
          border-radius: 6px;
          z-index: 2147483648;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          max-width: 300px;
          word-wrap: break-word;
        }
        
        .notification.success {
          background: #10b981;
          color: white;
        }
        
        .notification.error {
          background: #ef4444;
          color: white;
        }
        
        .notification.info {
          background: #3b82f6;
          color: white;
        }
        
        /* Dark mode support */
        .dark .popup-modal {
          background: #1f2937;
          color: #f9fafb;
        }
        
        .dark .popup-header {
          background: #111827;
          border-bottom-color: #374151;
        }
        
        .dark .popup-header h2 {
          color: #f9fafb;
        }
        
        .dark .close-btn {
          color: #9ca3af;
        }
        
        .dark .close-btn:hover {
          background: #374151;
        }
        
        .dark .form-section label {
          color: #d1d5db;
        }
        
        .dark .form-section textarea {
          background: #374151;
          border-color: #4b5563;
          color: #f9fafb;
        }
        
        .dark .form-section textarea:focus {
          border-color: #3b82f6;
        }
        
        .dark .form-section textarea[readonly] {
          background: #111827;
          color: #9ca3af;
        }
        

        
        .dark .form-options label {
          color: #d1d5db;
        }
        
        .dark .mode-explanation {
          background: #1f2937;
          border-left-color: #3b82f6;
        }
        
        .dark .mode-explanation p {
          color: #9ca3af;
        }
        
        .dark .popup-footer {
          background: #111827;
          border-top-color: #374151;
        }
        
        .dark .btn-secondary {
          background: #374151;
          color: #d1d5db;
        }
        
        .dark .btn-secondary:hover {
          background: #4b5563;
        }
        
        /* Mobile responsive */
        @media (max-width: 640px) {
          .popup-modal {
            width: 95%;
            max-height: 90vh;
          }
          
          .popup-content {
            padding: 16px;
          }
          
          .popup-header, .popup-footer {
            padding: 12px 16px;
          }
        }
      </style>
      
      <div class="popup-overlay" id="popup-overlay">
        <div class="popup-modal">
          <div class="popup-header">
            <h2 id="popup-title">${i18n.sendToChatGPT()}</h2>
            <button class="close-btn" id="close-btn">×</button>
          </div>
          <div class="popup-content">
            <div class="form-section">
              <label for="selected-text" id="selected-text-label">${i18n.selectedText()}</label>
              <textarea 
                id="selected-text" 
                readonly
                placeholder="${i18n.noTextSelected()}"
              ></textarea>
            </div>
            <div class="form-section">
              <label for="instructions" id="instructions-label">${i18n.instructions()}</label>
              <textarea 
                id="instructions" 
                placeholder="${i18n.instructionsPlaceholder()}"
              ></textarea>
            </div>

            <div class="form-options">
              <label>
                <input type="checkbox" id="save-instructions">
                <span id="save-instructions-label">${i18n.saveInstructions()}</span>
              </label>
              <label>
                <input type="checkbox" id="auto-send">
                <span id="auto-send-label">Auto-send to ChatGPT (uses default GPT-4o)</span>
              </label>
              <div class="mode-explanation">
                <p><strong>Auto-send ON:</strong> Sends directly to ChatGPT with default model</p>
                <p><strong>Auto-send OFF:</strong> Pastes text into ChatGPT chat box for manual model selection</p>
              </div>
            </div>
          </div>
          <div class="popup-footer">
            <button class="btn btn-secondary" id="cancel-btn">${i18n.cancel()}</button>
            <button class="btn btn-primary" id="send-btn">${i18n.send()}</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Setup event listeners
   */
  private async setupEventListeners() {
    if (!this.shadowRoot) return;

    // Close button
    const closeBtn = this.shadowRoot.getElementById('close-btn');
    closeBtn?.addEventListener('click', () => this.closePopup());

    // Cancel button
    const cancelBtn = this.shadowRoot.getElementById('cancel-btn');
    cancelBtn?.addEventListener('click', () => this.closePopup());

    // Send button
    const sendBtn = this.shadowRoot.getElementById('send-btn');
    sendBtn?.addEventListener('click', () => this.sendToChatGPT());

    // Overlay click (close on outside click)
    const overlay = this.shadowRoot.getElementById('popup-overlay');
    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.closePopup();
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', this.handleKeydown.bind(this));

    // Auto-resize textareas
    const textareas = this.shadowRoot.querySelectorAll('textarea');
    textareas.forEach(textarea => {
      textarea.addEventListener('input', this.autoResizeTextarea);
    });
  }

  /**
   * Populate form with data and settings
   */
  private async populateForm() {
    if (!this.shadowRoot || !this.data || !this.settings) return;

    // Populate selected text
    const selectedTextArea = this.shadowRoot.getElementById('selected-text') as HTMLTextAreaElement;
    if (selectedTextArea) {
      selectedTextArea.value = this.data.text;
      this.autoResizeTextarea({ target: selectedTextArea } as any);
    }

    // Populate instructions
    const instructionsArea = this.shadowRoot.getElementById('instructions') as HTMLTextAreaElement;
    if (instructionsArea) {
      instructionsArea.value = this.settings.defaultInstructions;
      this.autoResizeTextarea({ target: instructionsArea } as any);
    }

    // Set checkboxes
    const saveInstructionsCheckbox = this.shadowRoot.getElementById('save-instructions') as HTMLInputElement;
    if (saveInstructionsCheckbox) {
      saveInstructionsCheckbox.checked = this.settings.saveInstructions;
    }

    const autoSendCheckbox = this.shadowRoot.getElementById('auto-send') as HTMLInputElement;
    if (autoSendCheckbox) {
      autoSendCheckbox.checked = this.settings.autoSend;
    }

    // Show truncation warning if needed
    if (this.data.truncated) {
      this.showNotification(
        i18n.textTruncated(this.settings.maxTextLength.toString()),
        'info'
      );
    }
  }

  /**
   * Show popup with animation
   */
  private showPopup() {
    if (!this.shadowRoot) return;

    const overlay = this.shadowRoot.getElementById('popup-overlay');
    if (overlay) {
      setTimeout(() => {
        overlay.classList.add('show');
      }, 10);
    }
  }

  /**
   * Close popup
   */
  private closePopup() {
    if (!this.shadowRoot) return;

    const overlay = this.shadowRoot.getElementById('popup-overlay');
    if (overlay) {
      overlay.classList.remove('show');
      setTimeout(() => {
        this.removePopup();
      }, 300);
    }

    // Remove keydown listener
    document.removeEventListener('keydown', this.handleKeydown.bind(this));
  }

  /**
   * Remove popup from DOM
   */
  private removePopup() {
    const existingPopup = document.getElementById('chatgpt-popup-shadow-host');
    if (existingPopup) {
      existingPopup.remove();
    }
  }

  /**
   * Handle keyboard shortcuts
   */
  private handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      this.closePopup();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.sendToChatGPT();
    }
  }

  /**
   * Auto-resize textarea
   */
  private autoResizeTextarea(e: Event) {
    const textarea = e.target as HTMLTextAreaElement;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }

  /**
   * Send message to ChatGPT
   */
  private async sendToChatGPT() {
    if (!this.shadowRoot) return;

    const selectedTextArea = this.shadowRoot.getElementById('selected-text') as HTMLTextAreaElement;
    const instructionsArea = this.shadowRoot.getElementById('instructions') as HTMLTextAreaElement;
    const saveInstructionsCheckbox = this.shadowRoot.getElementById('save-instructions') as HTMLInputElement;
    const autoSendCheckbox = this.shadowRoot.getElementById('auto-send') as HTMLInputElement;

    // Check if all elements exist
    if (!selectedTextArea || !instructionsArea || !saveInstructionsCheckbox || !autoSendCheckbox) {
      console.error('Could not find required popup elements');
      this.showNotification('Error: Could not find form elements', 'error');
      return;
    }

    const selectedText = selectedTextArea.value || '';
    const instructions = instructionsArea.value || '';
    const saveInstructions = saveInstructionsCheckbox.checked;
    const autoSend = autoSendCheckbox.checked;

    console.log('Form values:', { selectedText, instructions, saveInstructions, autoSend });

    // Save settings if requested
    if (saveInstructions || this.settings?.autoSend !== autoSend) {
      await storageManager.saveSettings({
        defaultInstructions: saveInstructions ? instructions : '',
        saveInstructions: saveInstructions,
        autoSend: autoSend
      });
    }

    // Send message to background script
    const messageData = {
      type: 'SEND_TO_CHATGPT',
      data: {
        message: {
          text: selectedText,
          instructions: instructions,
          model: this.settings?.defaultModel || 'gpt-4o'
        },
        autoSend: autoSend
      }
    };
    
    console.log('Sending message to background:', messageData);
    const response = await chrome.runtime.sendMessage(messageData);

    if (response.success) {
      const notificationText = response.method === 'deeplink' 
        ? i18n.openingChatGPT()
        : i18n.messageCopied();
      this.showNotification(notificationText, 'success');
      this.closePopup();
    } else {
      this.showNotification(response.error || i18n.error(), 'error');
    }
  }

  /**
   * Show notification
   */
  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
    if (!this.shadowRoot) return;

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    this.shadowRoot.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 5000);
  }
}

// Global function to show popup (called from background script)
(window as any).showChatGPTPopup = async (data: PopupData) => {
  const popup = new PopupManager();
  await popup.init(data);
};

// Export for testing
export { PopupManager }; 