/**
 * Test setup file for Jest
 * Mocks Chrome extension APIs and sets up test environment
 */

// Mock Chrome extension APIs
const mockChrome = {
  runtime: {
    onInstalled: {
      addListener: jest.fn(),
    },
    onMessage: {
      addListener: jest.fn(),
    },
    sendMessage: jest.fn(),
    getURL: jest.fn((path: string) => `chrome-extension://test/${path}`),
    getManifest: jest.fn(() => ({ version: '1.0.0' })),
  },
  action: {
    onClicked: {
      addListener: jest.fn(),
    },
    setTitle: jest.fn(),
    setBadgeText: jest.fn(),
    setBadgeBackgroundColor: jest.fn(),
  },
  tabs: {
    query: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
  },
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
    },
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
    },
    onChanged: {
      addListener: jest.fn(),
    },
  },
  contextMenus: {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    removeAll: jest.fn(),
    onClicked: {
      addListener: jest.fn(),
    },
  },
  commands: {
    onCommand: {
      addListener: jest.fn(),
    },
  },
  scripting: {
    executeScript: jest.fn(),
    insertCSS: jest.fn(),
    removeCSS: jest.fn(),
  },
  notifications: {
    create: jest.fn(),
    clear: jest.fn(),
    onClicked: {
      addListener: jest.fn(),
    },
  },
  i18n: {
    getMessage: jest.fn((key: string) => key),
    getUILanguage: jest.fn(() => 'en'),
  },
};

// Mock global chrome object
(global as any).chrome = mockChrome;

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn(),
    readText: jest.fn(),
  },
  writable: true,
});

// Mock window.getSelection
Object.defineProperty(window, 'getSelection', {
  value: jest.fn(() => ({
    toString: () => 'selected text',
    rangeCount: 1,
    getRangeAt: () => ({
      cloneContents: () => {
        const div = document.createElement('div');
        div.textContent = 'selected text';
        return div;
      },
    }),
  })),
  writable: true,
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock URL constructor
global.URL = class URL {
  constructor(public href: string, base?: string) {
    this.href = href;
    this.searchParams = new URLSearchParams();
  }
  
  searchParams: URLSearchParams;
  
  toString() {
    return this.href;
  }
};

// Mock URLSearchParams
global.URLSearchParams = class URLSearchParams {
  private params: Map<string, string> = new Map();
  
  set(key: string, value: string) {
    this.params.set(key, value);
  }
  
  get(key: string) {
    return this.params.get(key);
  }
  
  has(key: string) {
    return this.params.has(key);
  }
  
  toString() {
    const pairs: string[] = [];
    this.params.forEach((value, key) => {
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    });
    return pairs.join('&');
  }
};

// Mock console methods for cleaner test output
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Setup DOM environment
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
  resources: 'usable',
});

global.document = dom.window.document;
global.window = dom.window as any;
global.HTMLElement = dom.window.HTMLElement;
global.DocumentFragment = dom.window.DocumentFragment;

// Helper function to reset all mocks
export const resetMocks = () => {
  jest.clearAllMocks();
  
  // Reset chrome API mocks
  Object.values(mockChrome).forEach(api => {
    if (typeof api === 'object' && api !== null) {
      Object.values(api).forEach(method => {
        if (typeof method === 'function') {
          method.mockClear();
        }
      });
    }
  });
  
  // Reset localStorage mock
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  
  // Reset navigator.clipboard mock
  navigator.clipboard.writeText.mockClear();
  navigator.clipboard.readText.mockClear();
};

// Helper function to mock chrome.storage responses
export const mockStorageGet = (data: any) => {
  mockChrome.storage.sync.get.mockResolvedValue(data);
  mockChrome.storage.local.get.mockResolvedValue(data);
};

// Helper function to mock chrome.storage.set
export const mockStorageSet = () => {
  mockChrome.storage.sync.set.mockResolvedValue(undefined);
  mockChrome.storage.local.set.mockResolvedValue(undefined);
};

// Helper function to mock chrome.tabs.query
export const mockTabsQuery = (tabs: any[]) => {
  mockChrome.tabs.query.mockResolvedValue(tabs);
};

// Helper function to mock chrome.tabs.create
export const mockTabsCreate = (tab: any) => {
  mockChrome.tabs.create.mockResolvedValue(tab);
};

// Helper function to mock navigator.clipboard.writeText
export const mockClipboardWrite = (success: boolean = true) => {
  if (success) {
    navigator.clipboard.writeText.mockResolvedValue(undefined);
  } else {
    navigator.clipboard.writeText.mockRejectedValue(new Error('Clipboard write failed'));
  }
};

// Auto-reset mocks before each test
beforeEach(() => {
  resetMocks();
}); 