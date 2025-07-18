/**
 * Popup UI logic for Chrome extension
 * Handles the modal popup interface for text editing and sending to ChatGPT
 */

import { storageManager, ExtensionSettings } from '../utils/storage';
import { i18n } from '../utils/i18n';
import { getAllPlatforms, getPlatform } from '../utils/ai-platforms';

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
  private availablePlatforms: any[] = [];

  /**
   * Initialize popup with data
   */
  async init(data: PopupData) {
    this.data = data;
    this.settings = await storageManager.getSettings();
    
    // Debug: Check if custom platforms exist in storage
    const customPlatforms = await storageManager.getCustomPlatforms();
    console.log('Custom platforms from storage:', customPlatforms);
    
    this.availablePlatforms = await getAllPlatforms();
    
    console.log('Popup initialized with platforms:', this.availablePlatforms);
    
    await this.createShadowDOM();
    await this.setupEventListeners();
    await this.populateForm();
    this.showPopup();
    
    // Focus on instructions input with smooth animation
    setTimeout(() => {
      const instructionsInput = this.shadowRoot?.getElementById('instructions') as HTMLTextAreaElement;
      if (instructionsInput) {
        instructionsInput.focus();
        // Add subtle highlight animation
        instructionsInput.style.transform = 'scale(1.02)';
        setTimeout(() => {
          instructionsInput.style.transform = 'scale(1)';
        }, 150);
      }
    }, 300);
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
          background: rgba(0, 0, 0, 0.48);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2147483647;
          opacity: 0;
          transition: opacity 250ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .popup-overlay.show {
          opacity: 1;
        }
        
        .popup-modal {
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
          width: 90%;
          max-width: 600px;
          max-height: 90vh;
          overflow: hidden;
          transform: scale(0.9);
          transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          flex-direction: column;
          position: relative;
          border: 1px solid rgba(0, 0, 0, 0.06);
        }
        
        .popup-overlay.show .popup-modal {
          transform: scale(1);
        }
        
        .popup-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e5e7eb;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          flex-shrink: 0;
          position: relative;
        }
        
        .popup-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: #111827;
          letter-spacing: -0.02em;
        }
        
        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #6b7280;
          padding: 0;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        
        .close-btn:hover {
          background: #e5e7eb;
          transform: scale(1.05);
        }
        
        .close-btn:active {
          transform: scale(0.95);
        }
        
        .popup-content {
          padding: 24px;
          flex: 1;
          overflow-y: auto;
          min-height: 0;
          background: white;
        }
        
        .form-section {
          margin-bottom: 20px;
        }
        
        .form-section label {
          display: block;
          margin-bottom: 6px;
          font-weight: 500;
          color: #374151;
          font-size: 14px;
          letter-spacing: -0.01em;
        }
        
        .form-section textarea {
          width: 100%;
          min-height: 80px;
          max-height: 200px;
          padding: 12px 16px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          line-height: 1.5;
          resize: vertical;
          font-family: inherit;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-sizing: border-box;
          background: #fafafa;
        }
        
        .form-section textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          background: white;
        }
        
        .form-section textarea[readonly] {
          background: #f8fafc;
          color: #6b7280;
          border-color: #e2e8f0;
        }
        

        
        .form-options {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 20px;
          padding: 16px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        
        .form-options label {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          color: #374151;
          cursor: pointer;
          font-weight: 500;
        }
        
        .form-options input[type="checkbox"] {
          margin: 0;
        }
        
        .mode-explanation {
          margin-top: 12px;
          padding: 16px;
          background: #eff6ff;
          border-radius: 8px;
          border-left: 3px solid #3b82f6;
          border: 1px solid #bfdbfe;
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
          padding: 20px 24px;
          border-top: 1px solid #e5e7eb;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          flex-shrink: 0;
        }
        
        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          min-width: 80px;
          position: relative;
          overflow: hidden;
        }
        
        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #e5e7eb;
        }
        
        .btn-secondary:hover {
          background: #e5e7eb;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
        }
        
        .btn-primary:hover {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(59, 130, 246, 0.4);
        }
        
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
          box-shadow: none !important;
        }
        
        .btn:active {
          transform: translateY(0) !important;
        }
        
        /* Ripple effect for buttons */
        .btn::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          transition: width 0.3s ease, height 0.3s ease;
        }
        
        .btn:active::before {
          width: 100%;
          height: 100%;
        }
        
        /* Checkbox styling */
        .form-options input[type="checkbox"] {
          appearance: none;
          width: 18px;
          height: 18px;
          border: 2px solid #d1d5db;
          border-radius: 4px;
          position: relative;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          background: white;
        }
        
        .form-options input[type="checkbox"]:checked {
          background: #3b82f6;
          border-color: #3b82f6;
        }
        
        .form-options input[type="checkbox"]:checked::after {
          content: '';
          position: absolute;
          width: 5px;
          height: 8px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
          top: 2px;
          left: 5px;
        }
        
        .form-options input[type="checkbox"]:hover {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }
        
        /* Select styling */
        .form-options select {
          appearance: none;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 6px 12px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6,9 12,15 18,9"></polyline></svg>');
          background-repeat: no-repeat;
          background-position: right 8px center;
          background-size: 16px;
          padding-right: 32px;
        }
        
        .form-options select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }
        
        /* Loading state for buttons */
        .btn.loading {
          color: transparent;
          pointer-events: none;
        }
        
        .btn.loading::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 16px;
          height: 16px;
          margin: -8px 0 0 -8px;
          border: 2px solid;
          border-color: transparent currentColor currentColor transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Enhanced focus states */
        .form-section textarea:focus,
        .form-options select:focus,
        .form-options input[type="checkbox"]:focus {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }
        
        /* Enhanced form section interactions */
        .form-section {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 8px;
          padding: 16px;
          margin: -16px;
          margin-bottom: 4px;
        }
        
        .form-section:hover {
          background: rgba(59, 130, 246, 0.02);
          transform: translateY(-1px);
        }
        
        .form-section.focused {
          background: rgba(59, 130, 246, 0.04);
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
        }
        
        .dark .form-section:hover {
          background: rgba(59, 130, 246, 0.05);
        }
        
        .dark .form-section.focused {
          background: rgba(59, 130, 246, 0.08);
        }
        
        /* Smooth modal entrance animation */
        .popup-modal {
          animation: modalEnter 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        @keyframes modalEnter {
          0% {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
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
        
        /* Dark mode enhancements */
        .dark .form-options input[type="checkbox"] {
          background: #374151;
          border-color: #4b5563;
        }
        
        .dark .form-options input[type="checkbox"]:checked {
          background: #3b82f6;
          border-color: #3b82f6;
        }
        
        .dark .form-options input[type="checkbox"]:hover {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }
        
        .dark .form-options select {
          background: #374151;
          border-color: #4b5563;
          color: #f9fafb;
        }
        
        .dark .form-options select:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }
        
        /* Dark mode support */
        .dark .popup-modal {
          background: #1f2937;
          color: #f9fafb;
          border-color: rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2);
        }
        
        .dark .popup-header {
          background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
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
          background: #2d3748;
          border-color: #4b5563;
          color: #f9fafb;
        }
        
        .dark .form-section textarea:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
          background: #374151;
        }
        
        .dark .form-section textarea[readonly] {
          background: #1a202c;
          color: #9ca3af;
          border-color: #2d3748;
        }
        

        
        .dark .form-options label {
          color: #d1d5db;
        }
        
        .dark .form-options {
          background: #1a202c;
          border-color: #2d3748;
        }
        
        .dark .mode-explanation {
          background: #1a202c;
          border-left-color: #3b82f6;
          border-color: #2d3748;
        }
        
        .dark .mode-explanation p {
          color: #9ca3af;
        }
        
        .dark .popup-footer {
          background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
          border-top-color: #374151;
        }
        
        .dark .btn-secondary {
          background: #374151;
          color: #d1d5db;
          border-color: #4b5563;
        }
        
        .dark .btn-secondary:hover {
          background: #4b5563;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        
        /* Responsive design */
        @media (max-width: 640px) {
          .popup-modal {
            width: 95%;
            max-height: 95vh;
          }
          
          .popup-content {
            padding: 16px;
          }
          
          .popup-header, .popup-footer {
            padding: 12px 16px;
          }
        }
        
        /* Mode Toggle Styles */
        .mode-toggle {
          display: flex;
          background: #f1f5f9;
          border-radius: 8px;
          padding: 4px;
          margin-bottom: 20px;
          border: 1px solid #e2e8f0;
        }
        
        .mode-toggle button {
          flex: 1;
          padding: 8px 16px;
          border: none;
          background: transparent;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .mode-toggle button.active {
          background: white;
          color: #3b82f6;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .mode-toggle button:hover:not(.active) {
          color: #475569;
        }
        
        /* URL Info Section */
        .url-info {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
        }
        
        .url-info h3 {
          margin: 0 0 8px 0;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }
        
        .url-info p {
          margin: 0;
          font-size: 13px;
          color: #6b7280;
          line-height: 1.4;
        }
        
        .url-display {
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 12px;
          color: #4b5563;
          word-break: break-all;
          margin-top: 8px;
        }
        
        /* Dark mode for new elements */
        .dark .mode-toggle {
          background: #1f2937;
          border-color: #374151;
        }
        
        .dark .mode-toggle button {
          color: #9ca3af;
        }
        
        .dark .mode-toggle button.active {
          background: #374151;
          color: #3b82f6;
        }
        
        .dark .url-info {
          background: #1f2937;
          border-color: #374151;
        }
        
        .dark .url-info h3 {
          color: #f3f4f6;
        }
        
        .dark .url-info p {
          color: #9ca3af;
        }
        
        .dark .url-display {
          background: #374151;
          border-color: #4b5563;
          color: #d1d5db;
        }
        
        /* Small laptop screens */
        @media (max-height: 600px) {
          .popup-modal {
            max-height: 95vh;
          }
          
          .popup-content {
            padding: 16px;
          }
          
          .popup-header, .popup-footer {
            padding: 12px 16px;
          }
          
          .form-section {
            margin-bottom: 12px;
          }
        }
      </style>
      
      <div class="popup-overlay" id="popup-overlay">
        <div class="popup-modal">
          <div class="popup-header">
            <h2 id="popup-title">Send to AI Platform</h2>
            <button class="close-btn" id="close-btn">×</button>
          </div>
          <div class="popup-content">
            <!-- Mode Toggle -->
            <div class="mode-toggle">
              <button id="text-mode-btn" class="active">Share Text</button>
              <button id="url-mode-btn">Share URL</button>
            </div>
            
            <!-- Text Mode Content -->
            <div id="text-mode-content">
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
            </div>
            
            <!-- URL Mode Content -->
            <div id="url-mode-content" style="display: none;">
              <div class="url-info">
                <h3>Current Page</h3>
                <p id="page-title">Loading...</p>
                <div class="url-display" id="page-url">Loading...</div>
              </div>
              <div class="form-section">
                <p style="color: #6b7280; font-size: 14px; margin: 0; padding: 12px 0;">🔗 This will send <strong>only the clean URL</strong> to your selected AI platform. You can then add your own instructions there.</p>
              </div>
            </div>

            <div class="form-options">
              <label id="save-instructions-container">
                <input type="checkbox" id="save-instructions">
                <span id="save-instructions-label">${i18n.saveInstructions()}</span>
              </label>
              <label>
                <span>AI Platform:</span>
                <select id="ai-platform" style="margin-left: 8px; padding: 4px 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                  <!-- Platform options will be populated dynamically -->
                </select>
              </label>
              <label>
                <input type="checkbox" id="auto-send">
                <span id="auto-send-label">Auto-send (works with all platforms)</span>
              </label>
              <div class="mode-explanation">
                <p><strong>Auto-send ON:</strong> Sends directly to the selected platform with default model</p>
                <p><strong>Auto-send OFF:</strong> Pastes text into the platform's chat box for manual model selection</p>
              </div>
            </div>
          </div>
          <div class="popup-footer">
            <button class="btn btn-secondary" id="cancel-btn">${i18n.cancel()}</button>
            <button class="btn btn-primary" id="send-btn">
              <span id="send-btn-text">${i18n.send()}</span>
            </button>
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
    
    // Mode toggle buttons
    const textModeBtn = this.shadowRoot.getElementById('text-mode-btn');
    const urlModeBtn = this.shadowRoot.getElementById('url-mode-btn');
    
    textModeBtn?.addEventListener('click', () => this.switchToTextMode());
    urlModeBtn?.addEventListener('click', () => this.switchToUrlMode());

    // Overlay click (close on outside click)
    const overlay = this.shadowRoot.getElementById('popup-overlay');
    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.closePopup();
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', this.handleKeydown.bind(this));

    // Auto-resize textareas and add interaction feedback
    const textareas = this.shadowRoot.querySelectorAll('textarea');
    textareas.forEach(textarea => {
      textarea.addEventListener('input', this.autoResizeTextarea);
      
      // Add focus/blur effects
      textarea.addEventListener('focus', () => {
        const parent = textarea.closest('.form-section');
        if (parent) {
          parent.classList.add('focused');
        }
      });
      
      textarea.addEventListener('blur', () => {
        const parent = textarea.closest('.form-section');
        if (parent) {
          parent.classList.remove('focused');
        }
      });
    });
    
    // Add button hover effects
    const buttons = this.shadowRoot.querySelectorAll('.btn');
    buttons.forEach(button => {
      button.addEventListener('mouseenter', () => {
        (button as HTMLElement).style.transform = 'translateY(-2px)';
      });
      
      button.addEventListener('mouseleave', () => {
        if (!button.classList.contains('loading')) {
          (button as HTMLElement).style.transform = 'translateY(0)';
        }
      });
    });
  }

  /**
   * Switch to text sharing mode
   */
  private switchToTextMode() {
    if (!this.shadowRoot) return;
    
    const textModeBtn = this.shadowRoot.getElementById('text-mode-btn');
    const urlModeBtn = this.shadowRoot.getElementById('url-mode-btn');
    const textModeContent = this.shadowRoot.getElementById('text-mode-content');
    const urlModeContent = this.shadowRoot.getElementById('url-mode-content');
    const saveInstructionsContainer = this.shadowRoot.getElementById('save-instructions-container');
    const sendBtnText = this.shadowRoot.getElementById('send-btn-text');
    
    // Update button states
    textModeBtn?.classList.add('active');
    urlModeBtn?.classList.remove('active');
    
    // Show/hide content
    if (textModeContent) textModeContent.style.display = 'block';
    if (urlModeContent) urlModeContent.style.display = 'none';
    if (saveInstructionsContainer) saveInstructionsContainer.style.display = 'block';
    
    // Update send button text
    if (sendBtnText) sendBtnText.textContent = 'Send';
  }
  
  /**
   * Switch to URL sharing mode
   */
  private switchToUrlMode() {
    if (!this.shadowRoot) return;
    
    const textModeBtn = this.shadowRoot.getElementById('text-mode-btn');
    const urlModeBtn = this.shadowRoot.getElementById('url-mode-btn');
    const textModeContent = this.shadowRoot.getElementById('text-mode-content');
    const urlModeContent = this.shadowRoot.getElementById('url-mode-content');
    const saveInstructionsContainer = this.shadowRoot.getElementById('save-instructions-container');
    const sendBtnText = this.shadowRoot.getElementById('send-btn-text');
    
    // Update button states
    textModeBtn?.classList.remove('active');
    urlModeBtn?.classList.add('active');
    
    // Show/hide content
    if (textModeContent) textModeContent.style.display = 'none';
    if (urlModeContent) urlModeContent.style.display = 'block';
    if (saveInstructionsContainer) saveInstructionsContainer.style.display = 'none';
    
    // Update send button text
    if (sendBtnText) sendBtnText.textContent = 'Send URL';
  }
  
  /**
   * Load current page information
   */
  private async loadCurrentPageInfo() {
    if (!this.shadowRoot) return;
    
    try {
      // Request current tab info from background script
      const response = await chrome.runtime.sendMessage({
        type: 'GET_CURRENT_TAB_INFO'
      });
      
      if (response && response.success) {
        const pageTitleElement = this.shadowRoot.getElementById('page-title');
        const pageUrlElement = this.shadowRoot.getElementById('page-url');
        
        if (pageTitleElement) {
          pageTitleElement.textContent = response.data?.title || 'Untitled Page';
        }
        
        if (pageUrlElement) {
          pageUrlElement.textContent = response.data?.url || 'No URL';
        }
      } else {
        throw new Error('Failed to get tab info from background script');
      }
    } catch (error) {
      console.error('Failed to load page info:', error);
      const pageTitleElement = this.shadowRoot.getElementById('page-title');
      const pageUrlElement = this.shadowRoot.getElementById('page-url');
      
      if (pageTitleElement) {
        pageTitleElement.textContent = 'Unable to load page info';
      }
      
      if (pageUrlElement) {
        pageUrlElement.textContent = 'Unable to load URL';
      }
    }
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
    
    // Load current page info for URL mode
    await this.loadCurrentPageInfo();

    // Populate platform options
    const platformSelect = this.shadowRoot.getElementById('ai-platform') as HTMLSelectElement;
    if (platformSelect) {
      // Clear existing options
      platformSelect.innerHTML = '';
      
      console.log('Populating platform dropdown with:', this.availablePlatforms);
      
      // Add all available platforms
      this.availablePlatforms.forEach(platform => {
        const option = document.createElement('option');
        option.value = platform.id;
        option.textContent = platform.name;
        platformSelect.appendChild(option);
        console.log('Added platform option:', platform.name, platform.id);
      });
      
      // Set default platform (fallback to chatgpt if custom platform no longer exists)
      const defaultPlatformExists = this.availablePlatforms.some(p => p.id === this.settings.defaultPlatform);
      platformSelect.value = defaultPlatformExists ? this.settings.defaultPlatform : 'chatgpt';
      console.log('Set default platform to:', platformSelect.value);
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
   * Show popup with enhanced animation
   */
  private showPopup() {
    if (!this.shadowRoot) return;

    const overlay = this.shadowRoot.getElementById('popup-overlay');
    const modal = this.shadowRoot.querySelector('.popup-modal') as HTMLElement;
    
    if (overlay && modal) {
      // Start with modal slightly below and smaller
      modal.style.transform = 'scale(0.9) translateY(30px)';
      modal.style.opacity = '0';
      
      // Animate entrance
      setTimeout(() => {
        overlay.classList.add('show');
        modal.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        modal.style.transform = 'scale(1) translateY(0)';
        modal.style.opacity = '1';
      }, 10);
    }
  }

  /**
   * Close popup with enhanced animation
   */
  private closePopup() {
    if (!this.shadowRoot) return;

    const overlay = this.shadowRoot.getElementById('popup-overlay');
    const modal = this.shadowRoot.querySelector('.popup-modal') as HTMLElement;
    
    if (overlay && modal) {
      // Animate exit
      modal.style.transition = 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
      modal.style.transform = 'scale(0.9) translateY(-20px)';
      modal.style.opacity = '0';
      
      overlay.classList.remove('show');
      
      setTimeout(() => {
        this.removePopup();
      }, 250);
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
   * Auto-resize textarea with smooth animation
   */
  private autoResizeTextarea(e: Event) {
    const textarea = e.target as HTMLTextAreaElement;
    if (textarea) {
      const currentHeight = textarea.offsetHeight;
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 200);
      
      // Smooth resize animation
      if (Math.abs(newHeight - currentHeight) > 2) {
        textarea.style.transition = 'height 0.15s ease';
        textarea.style.height = newHeight + 'px';
        
        setTimeout(() => {
          textarea.style.transition = '';
        }, 150);
      } else {
        textarea.style.height = newHeight + 'px';
      }
    }
  }

  /**
   * Send message to AI Platform
   */
  private async sendToChatGPT() {
    if (!this.shadowRoot) return;

    // Check current mode
    const isUrlMode = this.shadowRoot.getElementById('url-mode-btn')?.classList.contains('active');
    
    if (isUrlMode) {
      await this.sendUrlToAI();
    } else {
      await this.sendTextToAI();
    }
  }
  
  /**
   * Send text to AI Platform
   */
  private async sendTextToAI() {
    if (!this.shadowRoot) return;

    const selectedTextArea = this.shadowRoot.getElementById('selected-text') as HTMLTextAreaElement;
    const instructionsArea = this.shadowRoot.getElementById('instructions') as HTMLTextAreaElement;
    const saveInstructionsCheckbox = this.shadowRoot.getElementById('save-instructions') as HTMLInputElement;
    const autoSendCheckbox = this.shadowRoot.getElementById('auto-send') as HTMLInputElement;
    const platformSelect = this.shadowRoot.getElementById('ai-platform') as HTMLSelectElement;
    const sendBtn = this.shadowRoot.getElementById('send-btn') as HTMLButtonElement;

    // Check if all elements exist
    if (!selectedTextArea || !instructionsArea || !saveInstructionsCheckbox || !autoSendCheckbox || !platformSelect || !sendBtn) {
      console.error('Could not find required popup elements');
      this.showNotification('Error: Could not find form elements', 'error');
      return;
    }
    
    // Add loading state to button
    sendBtn.classList.add('loading');
    sendBtn.disabled = true;

    const selectedText = selectedTextArea.value || '';
    const instructions = instructionsArea.value || '';
    const saveInstructions = saveInstructionsCheckbox.checked;
    const autoSend = autoSendCheckbox.checked;
    const selectedPlatform = platformSelect.value;

    console.log('Form values:', { selectedText, instructions, saveInstructions, autoSend, selectedPlatform });
    
    // Validate inputs
    if (!selectedText && !instructions) {
      this.showNotification('Please select text or enter instructions', 'error');
      // Remove loading state
      sendBtn.classList.remove('loading');
      sendBtn.disabled = false;
      return;
    }

    // Save settings if requested
    if (saveInstructions || this.settings?.autoSend !== autoSend || this.settings?.defaultPlatform !== selectedPlatform) {
      await storageManager.saveSettings({
        defaultInstructions: saveInstructions ? instructions : '',
        saveInstructions: saveInstructions,
        autoSend: autoSend,
        defaultPlatform: selectedPlatform as any // Allow any platform ID including custom ones
      });
    }

    // Send message to background script
    const messageData = {
      type: 'SEND_TO_AI',
      data: {
        message: {
          text: selectedText,
          instructions: instructions,
          model: this.settings?.defaultModel || 'gpt-4o',
          platform: selectedPlatform
        },
        autoSend: autoSend,
        platform: selectedPlatform
      }
    };
    
    console.log('Sending message to background:', messageData);
    
    try {
      const response = await chrome.runtime.sendMessage(messageData);
      console.log('Received response from background:', response);

      if (response.success) {
        const notificationText = response.method === 'deeplink' 
          ? i18n.openingChatGPT()
          : i18n.messageCopied();
        this.showNotification(notificationText, 'success');
        
        // Add success animation before closing
        sendBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        sendBtn.textContent = '✓ Sent!';
        
        setTimeout(() => {
          this.closePopup();
        }, 800);
      } else {
        this.showNotification(response.error || i18n.error(), 'error');
      }
    } catch (error) {
      console.error('Failed to send message to background script:', error);
      this.showNotification(`Communication error: ${(error as Error).message}`, 'error');
    } finally {
      // Remove loading state
      sendBtn.classList.remove('loading');
      sendBtn.disabled = false;
    }
  }
  
  /**
   * Send URL to AI Platform
   */
  private async sendUrlToAI() {
    if (!this.shadowRoot) return;

    const autoSendCheckbox = this.shadowRoot.getElementById('auto-send') as HTMLInputElement;
    const platformSelect = this.shadowRoot.getElementById('ai-platform') as HTMLSelectElement;
    const sendBtn = this.shadowRoot.getElementById('send-btn') as HTMLButtonElement;
    const pageUrlElement = this.shadowRoot.getElementById('page-url') as HTMLElement;
    const pageTitleElement = this.shadowRoot.getElementById('page-title') as HTMLElement;

    // Check if all elements exist
    if (!autoSendCheckbox || !platformSelect || !sendBtn || !pageUrlElement || !pageTitleElement) {
      console.error('Could not find required popup elements for URL mode');
      this.showNotification('Error: Could not find form elements', 'error');
      return;
    }
    
    // Add loading state to button
    sendBtn.classList.add('loading');
    sendBtn.disabled = true;

    // Get form values
    const autoSend = autoSendCheckbox.checked;
    const selectedPlatform = platformSelect.value;
    const pageUrl = pageUrlElement.textContent || '';
    const pageTitle = pageTitleElement.textContent || '';

    // Validate URL
    if (!pageUrl || pageUrl === 'No URL' || pageUrl === 'Unable to load URL') {
      this.showNotification('Unable to get current page URL', 'error');
      // Remove loading state
      sendBtn.classList.remove('loading');
      sendBtn.disabled = false;
      return;
    }

    // Save platform preference
    if (this.settings?.defaultPlatform !== selectedPlatform) {
      await storageManager.saveSettings({
        defaultInstructions: this.settings?.defaultInstructions || '',
        saveInstructions: this.settings?.saveInstructions || false,
        autoSend: autoSend,
        defaultPlatform: selectedPlatform as any
      });
    }

    // Send clean URL to AI platform
    const messageData = {
      type: 'SEND_TO_AI',
      data: {
        message: {
          text: pageUrl,  // Clean URL only
          instructions: '',
          model: this.settings?.defaultModel || 'gpt-4o',
          platform: selectedPlatform
        },
        autoSend: autoSend,
        platform: selectedPlatform
      }
    };

    console.log('Sending URL to background:', messageData);

    try {
      const response = await chrome.runtime.sendMessage(messageData);
      console.log('Received response from background:', response);

      if (response.success) {
        const notificationText = response.method === 'deeplink' 
          ? `Opening ${selectedPlatform}...`
          : `URL sent to ${selectedPlatform}! Go paste it (Ctrl+V)`;
        this.showNotification(notificationText, 'success');
        
        // Add success animation before closing
        sendBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        sendBtn.textContent = '✓ Sent!';
        
        setTimeout(() => {
          this.closePopup();
        }, 800);
      } else {
        this.showNotification(response.error || 'Failed to send URL', 'error');
      }
    } catch (error) {
      console.error('Failed to send message to background script:', error);
      this.showNotification(`Communication error: ${(error as Error).message}`, 'error');
    } finally {
      // Remove loading state
      sendBtn.classList.remove('loading');
      sendBtn.disabled = false;
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