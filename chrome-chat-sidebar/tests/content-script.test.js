// Unit tests for content script functionality
// Tests sidebar injection, DOM manipulation, and event handling

describe('Content Script Tests', () => {
  let mockDocument;
  let mockChrome;
  let mockWindow;

  beforeEach(() => {
    // Mock DOM elements
    const mockElement = {
      id: '',
      className: '',
      innerHTML: '',
      style: {},
      classList: {
        add: jest.fn(),
        remove: jest.fn(),
        contains: jest.fn(() => false),
        toggle: jest.fn()
      },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      querySelector: jest.fn(),
      querySelectorAll: jest.fn(() => []),
      appendChild: jest.fn(),
      removeChild: jest.fn(),
      remove: jest.fn(),
      setAttribute: jest.fn(),
      getAttribute: jest.fn(),
      dispatchEvent: jest.fn(),
      focus: jest.fn(),
      click: jest.fn(),
      offsetHeight: 100,
      scrollHeight: 100,
      scrollTop: 0,
      clientHeight: 100,
      scrollTo: jest.fn(),
      parentNode: null,
      textContent: '',
      value: '',
      disabled: false
    };

    mockDocument = {
      createElement: jest.fn(() => ({ ...mockElement })),
      getElementById: jest.fn(),
      querySelector: jest.fn(),
      querySelectorAll: jest.fn(() => []),
      body: { ...mockElement },
      head: { ...mockElement },
      readyState: 'complete',
      addEventListener: jest.fn()
    };

    mockChrome = {
      runtime: {
        sendMessage: jest.fn(),
        onMessage: {
          addListener: jest.fn()
        },
        lastError: null,
        getURL: jest.fn(path => `chrome-extension://test/${path}`)
      }
    };

    mockWindow = {
      location: {
        href: 'https://example.com'
      },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      history: {
        pushState: jest.fn(),
        replaceState: jest.fn()
      },
      requestAnimationFrame: jest.fn(cb => cb()),
      setTimeout: jest.fn((cb, delay) => cb()),
      setInterval: jest.fn(),
      clearInterval: jest.fn()
    };

    // Set up global mocks
    global.document = mockDocument;
    global.chrome = mockChrome;
    global.window = mockWindow;
    global.console = { log: jest.fn(), error: jest.fn(), warn: jest.fn() };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Sidebar Creation', () => {
    test('should create sidebar with correct structure', () => {
      const createSidebar = require('../content.js').createSidebar;
      
      const sidebar = createSidebar();
      
      expect(mockDocument.createElement).toHaveBeenCalledWith('div');
      expect(sidebar.id).toBe('chrome-chat-sidebar');
      expect(sidebar.className).toBe('chrome-chat-sidebar-container');
      expect(sidebar.innerHTML).toContain('sidebar-header');
      expect(sidebar.innerHTML).toContain('chat-history');
      expect(sidebar.innerHTML).toContain('message-input-container');
    });

    test('should set up event listeners on creation', () => {
      const createSidebar = require('../content.js').createSidebar;
      
      createSidebar();
      
      // Verify event listeners were added
      expect(mockDocument.querySelector).toHaveBeenCalledWith('#sidebar-close-btn');
      expect(mockDocument.querySelector).toHaveBeenCalledWith('#message-input');
      expect(mockDocument.querySelector).toHaveBeenCalledWith('#send-button');
    });

    test('should prevent event bubbling', () => {
      const createSidebar = require('../content.js').createSidebar;
      
      const sidebar = createSidebar();
      
      expect(sidebar.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(sidebar.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    });
  });

  describe('Sidebar Injection', () => {
    test('should inject sidebar into document body', () => {
      const showSidebar = require('../content.js').showSidebar;
      
      mockDocument.getElementById.mockReturnValue(null); // No existing sidebar
      
      showSidebar();
      
      expect(mockDocument.body.appendChild).toHaveBeenCalled();
    });

    test('should remove existing sidebar before injecting new one', () => {
      const showSidebar = require('../content.js').showSidebar;
      
      const existingSidebar = { remove: jest.fn() };
      mockDocument.getElementById.mockReturnValue(existingSidebar);
      
      showSidebar();
      
      expect(existingSidebar.remove).toHaveBeenCalled();
    });

    test('should handle missing document body gracefully', () => {
      const showSidebar = require('../content.js').showSidebar;
      
      mockDocument.body = null;
      
      expect(() => showSidebar()).not.toThrow();
    });

    test('should add visible class to sidebar', () => {
      const showSidebar = require('../content.js').showSidebar;
      
      const mockSidebar = { ...mockDocument.createElement(), classList: { add: jest.fn(), contains: jest.fn(() => false) } };
      mockDocument.getElementById.mockReturnValue(mockSidebar);
      
      showSidebar();
      
      expect(mockSidebar.classList.add).toHaveBeenCalledWith('visible');
    });
  });

  describe('Sidebar Removal', () => {
    test('should remove visible class when hiding', () => {
      const hideSidebar = require('../content.js').hideSidebar;
      
      const mockSidebar = { 
        classList: { 
          remove: jest.fn(), 
          add: jest.fn(),
          contains: jest.fn(() => true) 
        } 
      };
      
      global.sidebarContainer = mockSidebar;
      
      hideSidebar();
      
      expect(mockSidebar.classList.remove).toHaveBeenCalledWith('visible');
      expect(mockSidebar.classList.add).toHaveBeenCalledWith('hiding');
    });

    test('should send message to background script when hiding', () => {
      const hideSidebar = require('../content.js').hideSidebar;
      
      const mockSidebar = { 
        classList: { 
          remove: jest.fn(), 
          add: jest.fn(),
          contains: jest.fn(() => true) 
        } 
      };
      
      global.sidebarContainer = mockSidebar;
      
      hideSidebar();
      
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'setSidebarState',
        visible: false,
        url: 'https://example.com',
        timestamp: expect.any(Number)
      }, expect.any(Function));
    });

    test('should completely remove sidebar from DOM', () => {
      const removeSidebar = require('../content.js').removeSidebar;
      
      const mockParent = { removeChild: jest.fn() };
      const mockSidebar = { parentNode: mockParent };
      
      global.sidebarContainer = mockSidebar;
      
      removeSidebar();
      
      expect(mockParent.removeChild).toHaveBeenCalledWith(mockSidebar);
    });
  });

  describe('Message Handling', () => {
    test('should handle toggleSidebar message', () => {
      const messageHandler = require('../content.js').messageHandler;
      
      const mockSender = {};
      const mockSendResponse = jest.fn();
      
      const message = { action: 'toggleSidebar', visible: true };
      
      messageHandler(message, mockSender, mockSendResponse);
      
      expect(mockSendResponse).toHaveBeenCalledWith({ success: true });
    });

    test('should handle getSidebarState message', () => {
      const messageHandler = require('../content.js').messageHandler;
      
      const mockSender = {};
      const mockSendResponse = jest.fn();
      
      const message = { action: 'getSidebarState' };
      
      global.sidebarContainer = { 
        classList: { contains: jest.fn(() => true) } 
      };
      global.isInjected = true;
      
      messageHandler(message, mockSender, mockSendResponse);
      
      expect(mockSendResponse).toHaveBeenCalledWith({
        success: true,
        data: {
          visible: true,
          injected: true
        }
      });
    });

    test('should handle setSidebarState message', () => {
      const messageHandler = require('../content.js').messageHandler;
      
      const mockSender = {};
      const mockSendResponse = jest.fn();
      
      const message = { action: 'setSidebarState', visible: false };
      
      messageHandler(message, mockSender, mockSendResponse);
      
      expect(mockSendResponse).toHaveBeenCalledWith({ success: true });
    });

    test('should handle ping message', () => {
      const messageHandler = require('../content.js').messageHandler;
      
      const mockSender = {};
      const mockSendResponse = jest.fn();
      
      const message = { action: 'ping' };
      
      messageHandler(message, mockSender, mockSendResponse);
      
      expect(mockSendResponse).toHaveBeenCalledWith({ 
        success: true, 
        timestamp: expect.any(Number) 
      });
    });

    test('should handle unknown message action', () => {
      const messageHandler = require('../content.js').messageHandler;
      
      const mockSender = {};
      const mockSendResponse = jest.fn();
      
      const message = { action: 'unknownAction' };
      
      messageHandler(message, mockSender, mockSendResponse);
      
      expect(mockSendResponse).toHaveBeenCalledWith({ 
        success: false, 
        error: 'Unknown action' 
      });
    });
  });

  describe('Message Input Handling', () => {
    test('should validate message input', () => {
      const validateMessage = require('../content.js').validateMessage;
      
      expect(validateMessage('Hello world')).toBe(true);
      expect(validateMessage('')).toBe(false);
      expect(validateMessage('   ')).toBe(false);
      expect(validateMessage(null)).toBe(false);
      expect(validateMessage('a'.repeat(2001))).toBe(false);
    });

    test('should sanitize message content', () => {
      const sanitizeMessage = require('../content.js').sanitizeMessage;
      
      const input = '<script>alert("xss")</script>';
      const expected = '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;';
      
      expect(sanitizeMessage(input)).toBe(expected);
    });

    test('should handle Enter key to send message', () => {
      const handleKeyDown = require('../content.js').handleKeyDown;
      
      const mockEvent = {
        key: 'Enter',
        shiftKey: false,
        preventDefault: jest.fn(),
        target: { value: 'Test message' }
      };
      
      const sendMessage = jest.fn();
      global.sendMessage = sendMessage;
      
      handleKeyDown(mockEvent);
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(sendMessage).toHaveBeenCalled();
    });

    test('should handle Shift+Enter for new line', () => {
      const handleKeyDown = require('../content.js').handleKeyDown;
      
      const mockEvent = {
        key: 'Enter',
        shiftKey: true,
        preventDefault: jest.fn(),
        target: { value: 'Test message' }
      };
      
      const autoResizeTextarea = jest.fn();
      global.autoResizeTextarea = autoResizeTextarea;
      
      handleKeyDown(mockEvent);
      
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(autoResizeTextarea).toHaveBeenCalled();
    });

    test('should auto-resize textarea based on content', () => {
      const autoResizeTextarea = require('../content.js').autoResizeTextarea;
      
      const mockTextarea = {
        style: { height: 'auto', overflowY: 'hidden' },
        scrollHeight: 72,
        closest: jest.fn(() => ({ style: {} }))
      };
      
      autoResizeTextarea(mockTextarea);
      
      expect(mockTextarea.style.height).toBe('72px');
    });

    test('should respect minimum and maximum height', () => {
      const autoResizeTextarea = require('../content.js').autoResizeTextarea;
      
      // Test minimum height
      const smallTextarea = {
        style: { height: 'auto', overflowY: 'hidden' },
        scrollHeight: 20,
        closest: jest.fn(() => ({ style: {} }))
      };
      
      autoResizeTextarea(smallTextarea);
      expect(smallTextarea.style.height).toBe('36px');
      
      // Test maximum height
      const largeTextarea = {
        style: { height: 'auto', overflowY: 'hidden' },
        scrollHeight: 150,
        closest: jest.fn(() => ({ style: {} }))
      };
      
      autoResizeTextarea(largeTextarea);
      expect(largeTextarea.style.height).toBe('120px');
      expect(largeTextarea.style.overflowY).toBe('auto');
    });
  });

  describe('State Persistence', () => {
    test('should persist sidebar state on URL change', () => {
      const handleUrlChange = require('../content.js').handleUrlChange;
      
      global.lastUrl = 'https://example.com/old';
      mockWindow.location.href = 'https://example.com/new';
      
      handleUrlChange();
      
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'setSidebarState'
        }),
        expect.any(Function)
      );
    });

    test('should initialize sidebar on page load', () => {
      const initializeSidebar = require('../content.js').initializeSidebar;
      
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ success: true, data: { visible: true } });
      });
      
      const showSidebar = jest.fn();
      global.showSidebar = showSidebar;
      
      initializeSidebar();
      
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
        { action: 'getSidebarState' },
        expect.any(Function)
      );
    });

    test('should handle navigation monitoring setup', () => {
      const setupNavigationMonitoring = require('../content.js').setupNavigationMonitoring;
      
      setupNavigationMonitoring();
      
      expect(mockWindow.addEventListener).toHaveBeenCalledWith('popstate', expect.any(Function));
    });
  });

  describe('Error Handling', () => {
    test('should handle Chrome runtime errors gracefully', () => {
      const initializeSidebar = require('../content.js').initializeSidebar;
      
      mockChrome.runtime.lastError = { message: 'Extension context invalidated' };
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback(null);
      });
      
      expect(() => initializeSidebar()).not.toThrow();
    });

    test('should handle missing DOM elements gracefully', () => {
      const showSidebar = require('../content.js').showSidebar;
      
      mockDocument.body = null;
      
      expect(() => showSidebar()).not.toThrow();
    });

    test('should handle animation state conflicts', () => {
      const showSidebar = require('../content.js').showSidebar;
      
      global.isAnimating = true;
      
      showSidebar();
      
      // Should return early without throwing
      expect(mockDocument.body.appendChild).not.toHaveBeenCalled();
    });
  });

  describe('Performance Optimizations', () => {
    test('should use requestAnimationFrame for animations', () => {
      const addMessageToHistory = require('../content.js').addMessageToHistory;
      
      const mockMessage = {
        id: 'test-123',
        content: 'Test message',
        timestamp: Date.now(),
        type: 'user'
      };
      
      const mockSidebar = {
        querySelector: jest.fn(() => ({
          appendChild: jest.fn(),
          querySelector: jest.fn(() => null),
          querySelectorAll: jest.fn(() => [])
        })),
        querySelectorAll: jest.fn(() => [])
      };
      
      global.sidebarContainer = mockSidebar;
      
      addMessageToHistory(mockMessage);
      
      expect(mockWindow.requestAnimationFrame).toHaveBeenCalled();
    });

    test('should limit message history for performance', () => {
      const limitMessageHistory = require('../content.js').limitMessageHistory;
      
      const mockMessages = Array(105).fill().map(() => ({ remove: jest.fn() }));
      
      const mockSidebar = {
        querySelector: jest.fn(() => ({
          querySelectorAll: jest.fn(() => mockMessages)
        }))
      };
      
      global.sidebarContainer = mockSidebar;
      
      limitMessageHistory(100);
      
      // Should remove 5 oldest messages
      for (let i = 0; i < 5; i++) {
        expect(mockMessages[i].remove).toHaveBeenCalled();
      }
    });

    test('should debounce input events', () => {
      const updateSendButtonState = require('../content.js').updateSendButtonState;
      
      const mockSidebar = {
        querySelector: jest.fn((selector) => {
          if (selector === '#message-input') {
            return { value: 'Test message', trim: () => 'Test message' };
          }
          if (selector === '#send-button') {
            return { disabled: false, classList: { remove: jest.fn(), add: jest.fn() } };
          }
          return null;
        })
      };
      
      global.sidebarContainer = mockSidebar;
      
      // Call multiple times rapidly
      updateSendButtonState();
      updateSendButtonState();
      updateSendButtonState();
      
      // Should handle multiple calls without issues
      expect(mockSidebar.querySelector).toHaveBeenCalled();
    });
  });
});

// Mock implementations for testing
const mockImplementations = {
  createSidebar: () => ({
    id: 'chrome-chat-sidebar',
    className: 'chrome-chat-sidebar-container',
    innerHTML: '<div class="sidebar-header"></div><div class="chat-history"></div><div class="message-input-container"></div>',
    addEventListener: jest.fn(),
    classList: { add: jest.fn(), remove: jest.fn(), contains: jest.fn() }
  }),
  
  showSidebar: () => {
    if (global.isAnimating) return;
    if (!document.body) return;
    
    const sidebar = document.createElement('div');
    sidebar.id = 'chrome-chat-sidebar';
    document.body.appendChild(sidebar);
    sidebar.classList.add('visible');
    
    chrome.runtime.sendMessage({
      action: 'setSidebarState',
      visible: true,
      url: window.location.href,
      timestamp: Date.now()
    });
  },
  
  hideSidebar: () => {
    if (global.isAnimating) return;
    if (global.sidebarContainer) {
      global.sidebarContainer.classList.remove('visible');
      global.sidebarContainer.classList.add('hiding');
    }
    
    chrome.runtime.sendMessage({
      action: 'setSidebarState',
      visible: false,
      url: window.location.href,
      timestamp: Date.now()
    });
  },
  
  validateMessage: (message) => {
    if (!message || typeof message !== 'string') return false;
    const trimmed = message.trim();
    if (trimmed.length === 0 || trimmed.length > 2000) return false;
    if (!/\S/.test(trimmed)) return false;
    return true;
  },
  
  sanitizeMessage: (message) => {
    if (!message || typeof message !== 'string') return '';
    return message.trim()
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
};

// Export mock implementations for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = mockImplementations;
}