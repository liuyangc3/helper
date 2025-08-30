// Unit tests for background.js storage operations
// These tests use a mock Chrome API for testing

// Mock Chrome APIs
const mockChrome = {
  storage: {
    local: {
      data: {},
      get: function(keys) {
        return new Promise((resolve) => {
          if (Array.isArray(keys)) {
            const result = {};
            keys.forEach(key => {
              if (this.data.hasOwnProperty(key)) {
                result[key] = this.data[key];
              }
            });
            resolve(result);
          } else if (typeof keys === 'string') {
            const result = {};
            if (this.data.hasOwnProperty(keys)) {
              result[keys] = this.data[keys];
            }
            resolve(result);
          } else {
            resolve(this.data);
          }
        });
      },
      set: function(items) {
        return new Promise((resolve) => {
          Object.assign(this.data, items);
          resolve();
        });
      },
      remove: function(keys) {
        return new Promise((resolve) => {
          if (Array.isArray(keys)) {
            keys.forEach(key => delete this.data[key]);
          } else {
            delete this.data[keys];
          }
          resolve();
        });
      },
      getBytesInUse: function() {
        return new Promise((resolve) => {
          const dataStr = JSON.stringify(this.data);
          resolve(dataStr.length);
        });
      },
      clear: function() {
        return new Promise((resolve) => {
          this.data = {};
          resolve();
        });
      }
    }
  }
};

// Set up global chrome object for tests
global.chrome = mockChrome;

// Import the functions we want to test (in a real environment, these would be imported)
// For this test, we'll redefine the key functions

function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generateMessageId() {
  return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

async function saveMessageToSession(sessionId, message) {
  try {
    const sessionKey = `session_${sessionId}`;
    const result = await chrome.storage.local.get([sessionKey]);
    
    let sessionData = result[sessionKey] || {
      id: sessionId,
      messages: [],
      createdAt: Date.now(),
      lastActivity: Date.now()
    };
    
    sessionData.messages.push(message);
    sessionData.lastActivity = Date.now();
    
    await chrome.storage.local.set({
      [sessionKey]: sessionData,
      currentSession: sessionId
    });
    
    return sessionData;
  } catch (error) {
    throw error;
  }
}

async function getMessagesFromSession(sessionId) {
  try {
    const sessionKey = `session_${sessionId}`;
    const result = await chrome.storage.local.get([sessionKey]);
    
    const sessionData = result[sessionKey];
    if (!sessionData) {
      return [];
    }
    
    return sessionData.messages || [];
  } catch (error) {
    throw error;
  }
}

// Test suite
describe('Background Script Storage Tests', () => {
  beforeEach(async () => {
    // Clear storage before each test
    await chrome.storage.local.clear();
  });

  test('generateSessionId creates unique IDs', () => {
    const id1 = generateSessionId();
    const id2 = generateSessionId();
    
    expect(id1).toMatch(/^session_\d+_[a-z0-9]+$/);
    expect(id2).toMatch(/^session_\d+_[a-z0-9]+$/);
    expect(id1).not.toBe(id2);
  });

  test('generateMessageId creates unique IDs', () => {
    const id1 = generateMessageId();
    const id2 = generateMessageId();
    
    expect(id1).toMatch(/^msg_\d+_[a-z0-9]+$/);
    expect(id2).toMatch(/^msg_\d+_[a-z0-9]+$/);
    expect(id1).not.toBe(id2);
  });

  test('saveMessageToSession creates new session and saves message', async () => {
    const sessionId = 'test_session_1';
    const message = {
      id: 'msg_1',
      content: 'Hello, world!',
      timestamp: Date.now(),
      type: 'user',
      metadata: { url: 'https://example.com' }
    };

    const sessionData = await saveMessageToSession(sessionId, message);
    
    expect(sessionData.id).toBe(sessionId);
    expect(sessionData.messages).toHaveLength(1);
    expect(sessionData.messages[0]).toEqual(message);
    expect(sessionData.createdAt).toBeDefined();
    expect(sessionData.lastActivity).toBeDefined();
  });

  test('saveMessageToSession adds message to existing session', async () => {
    const sessionId = 'test_session_2';
    
    // Save first message
    const message1 = {
      id: 'msg_1',
      content: 'First message',
      timestamp: Date.now(),
      type: 'user'
    };
    await saveMessageToSession(sessionId, message1);
    
    // Save second message
    const message2 = {
      id: 'msg_2',
      content: 'Second message',
      timestamp: Date.now(),
      type: 'user'
    };
    const sessionData = await saveMessageToSession(sessionId, message2);
    
    expect(sessionData.messages).toHaveLength(2);
    expect(sessionData.messages[0]).toEqual(message1);
    expect(sessionData.messages[1]).toEqual(message2);
  });

  test('getMessagesFromSession returns messages for existing session', async () => {
    const sessionId = 'test_session_3';
    const message = {
      id: 'msg_1',
      content: 'Test message',
      timestamp: Date.now(),
      type: 'user'
    };
    
    await saveMessageToSession(sessionId, message);
    const messages = await getMessagesFromSession(sessionId);
    
    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual(message);
  });

  test('getMessagesFromSession returns empty array for non-existent session', async () => {
    const messages = await getMessagesFromSession('non_existent_session');
    expect(messages).toEqual([]);
  });

  test('storage operations handle multiple sessions', async () => {
    const session1Id = 'session_1';
    const session2Id = 'session_2';
    
    const message1 = {
      id: 'msg_1',
      content: 'Message in session 1',
      timestamp: Date.now(),
      type: 'user'
    };
    
    const message2 = {
      id: 'msg_2',
      content: 'Message in session 2',
      timestamp: Date.now(),
      type: 'user'
    };
    
    await saveMessageToSession(session1Id, message1);
    await saveMessageToSession(session2Id, message2);
    
    const messages1 = await getMessagesFromSession(session1Id);
    const messages2 = await getMessagesFromSession(session2Id);
    
    expect(messages1).toHaveLength(1);
    expect(messages2).toHaveLength(1);
    expect(messages1[0].content).toBe('Message in session 1');
    expect(messages2[0].content).toBe('Message in session 2');
  });

  test('storage sets currentSession when saving messages', async () => {
    const sessionId = 'test_current_session';
    const message = {
      id: 'msg_1',
      content: 'Test message',
      timestamp: Date.now(),
      type: 'user'
    };
    
    await saveMessageToSession(sessionId, message);
    
    const result = await chrome.storage.local.get(['currentSession']);
    expect(result.currentSession).toBe(sessionId);
  });
});

// Simple test runner for Node.js environment
if (typeof module !== 'undefined' && module.exports) {
  // Export for Node.js testing
  module.exports = {
    generateSessionId,
    generateMessageId,
    saveMessageToSession,
    getMessagesFromSession
  };
}

// Basic test framework implementation
function describe(name, fn) {
  console.log(`\n=== ${name} ===`);
  fn();
}

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.log(`✗ ${name}`);
    console.error(`  Error: ${error.message}`);
  }
}

function beforeEach(fn) {
  // In a real test framework, this would run before each test
  // For this simple implementation, we'll call it manually in tests
}

function expect(actual) {
  return {
    toBe: (expected) => {
      if (actual !== expected) {
        throw new Error(`Expected ${actual} to be ${expected}`);
      }
    },
    toEqual: (expected) => {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
      }
    },
    toMatch: (pattern) => {
      if (!pattern.test(actual)) {
        throw new Error(`Expected ${actual} to match ${pattern}`);
      }
    },
    toHaveLength: (length) => {
      if (actual.length !== length) {
        throw new Error(`Expected array to have length ${length}, but got ${actual.length}`);
      }
    },
    toBeDefined: () => {
      if (actual === undefined) {
        throw new Error('Expected value to be defined');
      }
    },
    not: {
      toBe: (expected) => {
        if (actual === expected) {
          throw new Error(`Expected ${actual} not to be ${expected}`);
        }
      }
    }
  };
}

// Run tests if this file is executed directly
if (typeof window === 'undefined' && typeof process !== 'undefined') {
  console.log('Running Background Script Storage Tests...');
  
  // Run the test suite
  describe('Background Script Storage Tests', () => {
    // We'll run a few key tests here
    test('generateSessionId creates unique IDs', () => {
      const id1 = generateSessionId();
      const id2 = generateSessionId();
      
      expect(id1).toMatch(/^session_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^session_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    test('generateMessageId creates unique IDs', () => {
      const id1 = generateMessageId();
      const id2 = generateMessageId();
      
      expect(id1).toMatch(/^msg_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^msg_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });
  
  console.log('\nBasic tests completed. For full test suite, run in a proper test environment.');
}