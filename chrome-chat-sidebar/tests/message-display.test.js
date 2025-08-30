// Unit tests for message display functions
// These tests verify the message rendering, loading, and display logic

describe('Message Display Functions', () => {
  let mockSidebarContainer;
  let mockMessageList;
  let mockChatHistory;

  beforeEach(() => {
    // Set up DOM mocks
    mockMessageList = {
      appendChild: jest.fn(),
      querySelector: jest.fn(),
      querySelectorAll: jest.fn(() => [])
    };

    mockChatHistory = {
      scrollTop: 0,
      scrollHeight: 1000,
      clientHeight: 500,
      scrollTo: jest.fn()
    };

    mockSidebarContainer = {
      querySelector: jest.fn((selector) => {
        if (selector === '#message-list') return mockMessageList;
        if (selector === '#chat-history') return mockChatHistory;
        return null;
      })
    };

    // Mock global variables
    global.sidebarContainer = mockSidebarContainer;
    global.document = {
      createElement: jest.fn(() => ({
        className: '',
        innerHTML: '',
        classList: { add: jest.fn(), remove: jest.fn() },
        setAttribute: jest.fn(),
        remove: jest.fn()
      })),
      createDocumentFragment: jest.fn(() => ({
        appendChild: jest.fn()
      }))
    };

    global.requestAnimationFrame = jest.fn(cb => cb());
    global.chrome = {
      runtime: {
        sendMessage: jest.fn(),
        lastError: null
      }
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createMessageElement', () => {
    test('should create message element with correct structure', () => {
      const message = {
        id: 'test-123',
        content: 'Hello world',
        timestamp: Date.now(),
        type: 'user'
      };

      const element = createMessageElement(message);

      expect(element.className).toBe('message-item');
      expect(element.setAttribute).toHaveBeenCalledWith('data-message-id', 'test-123');
      expect(element.setAttribute).toHaveBeenCalledWith('data-message-type', 'user');
      expect(element.innerHTML).toContain('Hello world');
    });

    test('should escape HTML in message content', () => {
      const message = {
        id: 'test-123',
        content: '<script>alert("xss")</script>',
        timestamp: Date.now(),
        type: 'user'
      };

      const element = createMessageElement(message);

      expect(element.innerHTML).not.toContain('<script>');
      expect(element.innerHTML).toContain('&lt;script&gt;');
    });
  });

  describe('formatTimestamp', () => {
    test('should return "Just now" for recent messages', () => {
      const now = Date.now();
      const result = formatTimestamp(now);
      expect(result).toBe('Just now');
    });

    test('should return minutes ago for messages within an hour', () => {
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      const result = formatTimestamp(fiveMinutesAgo);
      expect(result).toBe('5m ago');
    });

    test('should return hours ago for messages within 24 hours', () => {
      const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
      const result = formatTimestamp(twoHoursAgo);
      expect(result).toBe('2h ago');
    });

    test('should return formatted date for older messages', () => {
      const twoDaysAgo = Date.now() - (2 * 24 * 60 * 60 * 1000);
      const result = formatTimestamp(twoDaysAgo);
      expect(result).toMatch(/\w{3} \d{1,2}/); // Format like "Jan 15"
    });
  });

  describe('escapeHtml', () => {
    test('should escape HTML special characters', () => {
      const input = '<div>Hello & "world"</div>';
      const result = escapeHtml(input);
      expect(result).toBe('&lt;div&gt;Hello &amp; "world"&lt;/div&gt;');
    });

    test('should handle empty string', () => {
      const result = escapeHtml('');
      expect(result).toBe('');
    });
  });

  describe('addMessageToHistory', () => {
    test('should add message to message list', () => {
      const message = {
        id: 'test-123',
        content: 'Test message',
        timestamp: Date.now(),
        type: 'user'
      };

      mockMessageList.querySelector.mockReturnValue(null); // No welcome message

      addMessageToHistory(message);

      expect(mockMessageList.appendChild).toHaveBeenCalled();
      expect(mockChatHistory.scrollTo).toHaveBeenCalled();
    });

    test('should remove welcome message when adding first message', () => {
      const welcomeMessage = { remove: jest.fn() };
      mockMessageList.querySelector.mockReturnValue(welcomeMessage);

      const message = {
        id: 'test-123',
        content: 'First message',
        timestamp: Date.now(),
        type: 'user'
      };

      addMessageToHistory(message);

      expect(welcomeMessage.remove).toHaveBeenCalled();
    });

    test('should not scroll if user is not at bottom and message is not from user', () => {
      mockChatHistory.scrollTop = 100; // Not at bottom
      mockChatHistory.scrollHeight = 1000;
      mockChatHistory.clientHeight = 500;

      const message = {
        id: 'test-123',
        content: 'System message',
        timestamp: Date.now(),
        type: 'system'
      };

      addMessageToHistory(message, false);

      expect(mockChatHistory.scrollTo).not.toHaveBeenCalled();
    });
  });

  describe('scrollToLatestMessage', () => {
    test('should scroll to bottom of chat history', () => {
      scrollToLatestMessage();

      expect(mockChatHistory.scrollTo).toHaveBeenCalledWith({
        top: mockChatHistory.scrollHeight,
        behavior: 'smooth'
      });
    });

    test('should use auto behavior when smooth is false', () => {
      scrollToLatestMessage(false);

      expect(mockChatHistory.scrollTo).toHaveBeenCalledWith({
        top: mockChatHistory.scrollHeight,
        behavior: 'auto'
      });
    });
  });

  describe('isScrolledToBottom', () => {
    test('should return true when scrolled to bottom', () => {
      mockChatHistory.scrollTop = 450; // Close to bottom
      mockChatHistory.scrollHeight = 1000;
      mockChatHistory.clientHeight = 500;

      const result = isScrolledToBottom();
      expect(result).toBe(true);
    });

    test('should return false when not scrolled to bottom', () => {
      mockChatHistory.scrollTop = 100; // Far from bottom
      mockChatHistory.scrollHeight = 1000;
      mockChatHistory.clientHeight = 500;

      const result = isScrolledToBottom();
      expect(result).toBe(false);
    });
  });

  describe('renderMessageHistory', () => {
    test('should render multiple messages', () => {
      const messages = [
        {
          id: 'msg-1',
          content: 'First message',
          timestamp: Date.now() - 1000,
          type: 'user'
        },
        {
          id: 'msg-2',
          content: 'Second message',
          timestamp: Date.now(),
          type: 'system'
        }
      ];

      mockMessageList.querySelectorAll.mockReturnValue([]);

      renderMessageHistory(messages);

      expect(mockMessageList.appendChild).toHaveBeenCalled();
      expect(mockChatHistory.scrollTo).toHaveBeenCalled();
    });

    test('should clear existing messages when not appending', () => {
      const existingMessage = { remove: jest.fn() };
      mockMessageList.querySelectorAll.mockReturnValue([existingMessage]);

      const messages = [{
        id: 'new-msg',
        content: 'New message',
        timestamp: Date.now(),
        type: 'user'
      }];

      renderMessageHistory(messages, false);

      expect(existingMessage.remove).toHaveBeenCalled();
    });
  });

  describe('loadMessagesFromStorage', () => {
    test('should resolve with messages on successful load', async () => {
      const mockMessages = [
        { id: '1', content: 'Test', timestamp: Date.now(), type: 'user' }
      ];

      global.chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ success: true, data: mockMessages });
      });

      const result = await loadMessagesFromStorage();
      expect(result).toEqual(mockMessages);
    });

    test('should reject on chrome runtime error', async () => {
      global.chrome.runtime.lastError = { message: 'Extension context invalidated' };
      global.chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback(null);
      });

      await expect(loadMessagesFromStorage()).rejects.toThrow('Extension context invalidated');
    });

    test('should reject on response error', async () => {
      global.chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ success: false, error: 'Storage error' });
      });

      await expect(loadMessagesFromStorage()).rejects.toThrow('Storage error');
    });
  });

  describe('saveMessageToStorage', () => {
    test('should resolve on successful save', async () => {
      const message = {
        id: 'test-123',
        content: 'Test message',
        timestamp: Date.now(),
        type: 'user'
      };

      global.chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
        callback({ success: true, data: message });
      });

      const result = await saveMessageToStorage(message);
      expect(result).toEqual(message);
    });

    test('should reject on save error', async () => {
      const message = {
        id: 'test-123',
        content: 'Test message',
        timestamp: Date.now(),
        type: 'user'
      };

      global.chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
        callback({ success: false, error: 'Storage quota exceeded' });
      });

      await expect(saveMessageToStorage(message)).rejects.toThrow('Storage quota exceeded');
    });
  });

  describe('limitMessageHistory', () => {
    test('should remove old messages when limit exceeded', () => {
      const messages = [];
      for (let i = 0; i < 105; i++) {
        messages.push({ remove: jest.fn() });
      }

      mockMessageList.querySelectorAll.mockReturnValue(messages);

      limitMessageHistory(100);

      // Should remove 5 oldest messages
      for (let i = 0; i < 5; i++) {
        expect(messages[i].remove).toHaveBeenCalled();
      }
      
      // Should not remove newer messages
      for (let i = 5; i < 105; i++) {
        expect(messages[i].remove).not.toHaveBeenCalled();
      }
    });

    test('should not remove messages when under limit', () => {
      const messages = [];
      for (let i = 0; i < 50; i++) {
        messages.push({ remove: jest.fn() });
      }

      mockMessageList.querySelectorAll.mockReturnValue(messages);

      limitMessageHistory(100);

      // Should not remove any messages
      messages.forEach(msg => {
        expect(msg.remove).not.toHaveBeenCalled();
      });
    });
  });
});

// Helper function to make functions available for testing
if (typeof module !== 'undefined' && module.exports) {
  // Export functions for testing in Node.js environment
  module.exports = {
    createMessageElement,
    formatTimestamp,
    escapeHtml,
    addMessageToHistory,
    scrollToLatestMessage,
    isScrolledToBottom,
    renderMessageHistory,
    loadMessagesFromStorage,
    saveMessageToStorage,
    limitMessageHistory
  };
}