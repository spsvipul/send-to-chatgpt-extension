/**
 * End-to-end tests for Chrome extension
 */

import { test, expect, chromium } from '@playwright/test';
import path from 'path';

const EXTENSION_PATH = path.resolve(__dirname, '../../dist');

test.describe('Chrome Extension E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // This test will run after the extension is built
    // It loads the extension in a real Chrome browser
  });

  test('should load extension without errors', async () => {
    const browser = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--load-extension=${EXTENSION_PATH}`,
        '--disable-extensions-except=' + EXTENSION_PATH,
      ],
    });

    const page = await browser.newPage();
    await page.goto('chrome://extensions/');
    
    // Check that the extension is loaded
    const extensionCards = await page.locator('.extension-card');
    await expect(extensionCards).toHaveCount(1);
    
    // Check extension title
    const extensionTitle = await page.locator('.extension-title');
    await expect(extensionTitle).toContainText('Send to ChatGPT');
    
    await browser.close();
  });

  test('should capture selected text and show popup', async () => {
    const browser = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--load-extension=${EXTENSION_PATH}`,
        '--disable-extensions-except=' + EXTENSION_PATH,
      ],
    });

    const page = await browser.newPage();
    
    // Navigate to a test page with text
    await page.setContent(`
      <html>
        <body>
          <h1>Test Page</h1>
          <p>This is some test text that we can select and send to ChatGPT.</p>
          <p>Here's another paragraph with different content.</p>
        </body>
      </html>
    `);
    
    // Select some text
    await page.locator('p').first().selectText();
    
    // Trigger extension with keyboard shortcut
    await page.keyboard.press('Control+Shift+G');
    
    // Wait for popup to appear
    await page.waitForSelector('[id*="chatgpt-popup"]', { timeout: 5000 });
    
    // Check that popup contains the selected text
    const selectedTextArea = await page.locator('textarea[readonly]');
    await expect(selectedTextArea).toContainText('This is some test text');
    
    await browser.close();
  });

  test('should open options page', async () => {
    const browser = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--load-extension=${EXTENSION_PATH}`,
        '--disable-extensions-except=' + EXTENSION_PATH,
      ],
    });

    const page = await browser.newPage();
    await page.goto('chrome://extensions/');
    
    // Find and click the options button
    const optionsButton = await page.locator('button:has-text("Options")');
    await optionsButton.click();
    
    // Wait for options page to load
    await page.waitForSelector('#options-title', { timeout: 5000 });
    
    // Check that options page is loaded
    await expect(page.locator('#options-title')).toContainText('Send to ChatGPT - Options');
    
    // Check that settings form is present
    await expect(page.locator('#auto-send')).toBeVisible();
    await expect(page.locator('#default-instructions')).toBeVisible();
    await expect(page.locator('#default-model')).toBeVisible();
    
    await browser.close();
  });

  test('should handle clipboard functionality', async () => {
    const browser = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--load-extension=${EXTENSION_PATH}`,
        '--disable-extensions-except=' + EXTENSION_PATH,
        '--disable-features=VizDisplayCompositor',
      ],
    });

    const page = await browser.newPage();
    
    // Grant clipboard permissions
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    
    // Navigate to a test page
    await page.setContent(`
      <html>
        <body>
          <p>Test text for clipboard functionality</p>
        </body>
      </html>
    `);
    
    // Select text and use extension
    await page.locator('p').selectText();
    await page.keyboard.press('Control+Shift+G');
    
    // Wait for popup
    await page.waitForSelector('[id*="chatgpt-popup"]', { timeout: 5000 });
    
    // Add instructions and send
    const instructionsField = await page.locator('textarea[placeholder*="instructions"]');
    await instructionsField.fill('Summarize this text');
    
    const sendButton = await page.locator('button:has-text("Send")');
    await sendButton.click();
    
    // Check that clipboard contains the message
    const clipboardContent = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardContent).toContain('Summarize this text');
    expect(clipboardContent).toContain('Test text for clipboard functionality');
    
    await browser.close();
  });

  test('should open ChatGPT in new tab', async () => {
    const browser = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--load-extension=${EXTENSION_PATH}`,
        '--disable-extensions-except=' + EXTENSION_PATH,
      ],
    });

    const page = await browser.newPage();
    
    // Navigate to test page
    await page.setContent(`
      <html>
        <body>
          <p>Test content for ChatGPT</p>
        </body>
      </html>
    `);
    
    // Select text and trigger extension
    await page.locator('p').selectText();
    await page.keyboard.press('Control+Shift+G');
    
    // Wait for popup and interact with it
    await page.waitForSelector('[id*="chatgpt-popup"]', { timeout: 5000 });
    
    // Enable auto-send and send
    const autoSendCheckbox = await page.locator('input[type="checkbox"]').first();
    await autoSendCheckbox.check();
    
    const sendButton = await page.locator('button:has-text("Send")');
    
    // Listen for new tab
    const newTabPromise = page.context().waitForEvent('page');
    await sendButton.click();
    
    const newTab = await newTabPromise;
    
    // Check that ChatGPT tab was opened
    await expect(newTab.url()).toContain('chatgpt.com');
    
    await browser.close();
  });
});

test.describe('Extension Settings', () => {
  test('should save and load settings correctly', async () => {
    const browser = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--load-extension=${EXTENSION_PATH}`,
        '--disable-extensions-except=' + EXTENSION_PATH,
      ],
    });

    const page = await browser.newPage();
    
    // Navigate to options page
    await page.goto(`chrome-extension://${await getExtensionId(page)}/options.html`);
    
    // Wait for page to load
    await page.waitForSelector('#options-title', { timeout: 5000 });
    
    // Change settings
    await page.locator('#auto-send').uncheck();
    await page.locator('#default-instructions').fill('Test default instructions');
    await page.locator('#default-model').selectOption('gpt-4');
    await page.locator('#max-text-length').fill('4096');
    
    // Save settings
    await page.locator('#save-settings').click();
    
    // Wait for save confirmation
    await page.waitForSelector('.notification.success', { timeout: 5000 });
    
    // Refresh page and check that settings were saved
    await page.reload();
    await page.waitForSelector('#options-title', { timeout: 5000 });
    
    // Verify settings were persisted
    await expect(page.locator('#auto-send')).not.toBeChecked();
    await expect(page.locator('#default-instructions')).toHaveValue('Test default instructions');
    await expect(page.locator('#default-model')).toHaveValue('gpt-4');
    await expect(page.locator('#max-text-length')).toHaveValue('4096');
    
    await browser.close();
  });
});

// Helper function to get extension ID
async function getExtensionId(page: any): Promise<string> {
  await page.goto('chrome://extensions/');
  const extensionId = await page.locator('.extension-card').getAttribute('id');
  return extensionId?.replace('extension-', '') || '';
} 