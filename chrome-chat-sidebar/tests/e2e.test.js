// End-to-end tests for Chrome Chat Sidebar extension
// These tests simulate complete user workflows

class E2ETestSuite {
  constructor() {
    this.testResults = [];
    this.currentTest = null;
    this.setupComplete = false;
  }

  async setup() {
    if (this.setupComplete) return;
    
    console.log('Setting up E2E test environment...');
    
    // Ensure extension is loaded
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      throw new Error('Chrome extension APIs not available');
    }
    
    // Ensure content script is loaded
    if (typeof showSidebar !== 'function' || typeof hideSidebar !== 'function') {
      throw new Error('Content script functions not available');
    }
    
    // Clean up any existing sidebar
    const existingSidebar = document.getElementById('chrome-chat-sidebar');
    if (existingSidebar) {
      existingSidebar.remove();
    }
    
    this.setupComplete = true;
    console.log('E2E test environment setup complete');
  }

  async teardown() {
    console.log('Tearing down E2E test environment...');
    
    // Clean up sidebar
    const sidebar = document.getElementById('chrome-chat-sidebar');
    if (sidebar) {
      sidebar.remove();
    }
    
    // Clear any test data from storage
    try {
      await this.clearTestData();
    } catch (error) {
      console.warn('Error clearing test data:', error);
    }
    
    console.log('E2E test environment teardown complete');
  }

  async clearTestData() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getMessages' }, (response) => {
        if (response && response.success && response.data.messages) {
          // Remove test messages
          const testMessages = response.data.messages.filter(msg => 
            msg.content && msg.content.includes('E2E Test')
          );
          
          if (testMessages.length > 0) {
            console.log(`Clearing ${testMessages.length} test messages`);
          }
        }
        resolve();
      });
    });
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async waitForElement(selector, timeout = 5000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(selector);
      if (element) {
        return element;
      }
      await this.delay(100);
    }
    throw new Error(`Element not found: ${selector}`);
  }

  async waitForCondition(condition, timeout = 5000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true;
      }
      await this.delay(100);
    }
    throw new Error('Condition not met within timeout');
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    console.log(logEntry);
    
    if (this.currentTest) {
      this.currentTest.logs = this.currentTest.logs || [];
      this.currentTest.logs.push(logEntry);
    }
  }

  async runTest(testName, testFunction) {
    this.currentTest = {
      name: testName,
      startTime: Date.now(),
      status: 'running',
      logs: []
    };

    this.log(`Starting E2E test: ${testName}`);

    try {
      await testFunction();
      this.currentTest.status = 'passed';
      this.currentTest.endTime = Date.now();
      this.currentTest.duration = this.currentTest.endTime - this.currentTest.startTime;
      this.log(`E2E test passed: ${testName} (${this.currentTest.duration}ms)`);
    } catch (error) {
      this.currentTest.status = 'failed';
      this.currentTest.error = error.message;
      this.currentTest.endTime = Date.now();
      this.currentTest.duration = this.currentTest.endTime - this.currentTest.startTime;
      this.log(`E2E test failed: ${testName} - ${error.message}`, 'error');
    }

    this.testResults.push({ ...this.currentTest });
    this.currentTest = null;
  }

  // Test: Complete user workflow from opening sidebar to sending message
  async testCompleteUserWorkflow() {
    this.log('Testing complete user workflow...');
    
    // Step 1: Open sidebar
    showSidebar();
    const sidebar = await this.waitForElement('#chrome-chat-sidebar');
    
    // Wait for sidebar to become visible
    await this.waitForCondition(() => sidebar.classList.contains('visible'));
    this.log('Sidebar opened successfully');
    
    // Step 2: Wait for chat history to initialize
    await this.delay(1000);
    
    // Step 3: Find input elements
    const messageInput = await this.waitForElement('#message-input');
    const sendButton = await this.waitForElement('#send-button');
    
    if (!messageInput || !sendButton) {
      throw new Error('Message input or send button not found');
    }
    
    // Step 4: Type a message
    const testMessage = `E2E Test Message ${Date.now()}`;
    messageInput.value = testMessage;
    messageInput.dispatchEvent(new Event('input'));
    
    await this.delay(200);
    
    // Step 5: Verify send button is enabled
    if (sendButton.disabled) {
      throw new Error('Send button should be enabled for valid input');
    }
    this.log('Message input and validation working correctly');
    
    // Step 6: Count messages before sending
    const messagesBefore = sidebar.querySelectorAll('.message-item').length;
    
    // Step 7: Send message
    sendButton.click();
    this.log('Message sent');
    
    // Step 8: Wait for message to appear
    await this.waitForCondition(() => {
      const messagesAfter = sidebar.querySelectorAll('.message-item').length;
      return messagesAfter > messagesBefore;
    });
    
    // Step 9: Verify message appears in chat history
    const messages = sidebar.querySelectorAll('.message-item');
    const lastMessage = messages[messages.length - 1];
    const messageContent = lastMessage.querySelector('.message-content');
    
    if (!messageContent || !messageContent.textContent.includes(testMessage)) {
      throw new Error('Message not found in chat history');
    }
    this.log('Message appeared in chat history');
    
    // Step 10: Verify input was cleared
    if (messageInput.value !== '') {
      throw new Error('Message input should be cleared after sending');
    }
    this.log('Message input cleared after sending');
    
    // Step 11: Close sidebar
    const closeButton = sidebar.querySelector('.close-btn');
    if (closeButton) {
      closeButton.click();
      await this.waitForCondition(() => !sidebar.classList.contains('visible'));
      this.log('Sidebar closed successfully');
    }
    
    this.log('Complete user workflow test passed');
  }

  // Test: Message persistence across sidebar open/close
  async testMessagePersistence() {
    this.log('Testing message persistence...');
    
    // Step 1: Open sidebar and send a message
    showSidebar();
    const sidebar = await this.waitForElement('#chrome-chat-sidebar.visible');
    
    const messageInput = await this.waitForElement('#message-input');
    const sendButton = await this.waitForElement('#send-button');
    
    const testMessage = `Persistence Test ${Date.now()}`;
    messageInput.value = testMessage;
    messageInput.dispatchEvent(new Event('input'));
    
    await this.delay(100);
    sendButton.click();
    
    // Wait for message to appear
    await this.waitForCondition(() => {
      const messages = sidebar.querySelectorAll('.message-item');
      return Array.from(messages).some(msg => 
        msg.textContent.includes(testMessage)
      );
    });
    
    const messagesBeforeClose = sidebar.querySelectorAll('.message-item').length;
    this.log(`Messages before close: ${messagesBeforeClose}`);
    
    // Step 2: Close sidebar
    const closeButton = sidebar.querySelector('.close-btn');
    closeButton.click();
    await this.waitForCondition(() => !sidebar.classList.contains('visible'));
    
    // Step 3: Reopen sidebar
    await this.delay(500);
    showSidebar();
    await this.waitForCondition(() => sidebar.classList.contains('visible'));
    
    // Step 4: Wait for messages to load
    await this.delay(1000);
    
    // Step 5: Verify message is still there
    const messagesAfterReopen = sidebar.querySelectorAll('.message-item').length;
    this.log(`Messages after reopen: ${messagesAfterReopen}`);
    
    if (messagesAfterReopen < messagesBeforeClose) {
      throw new Error('Messages were not persisted across sidebar close/open');
    }
    
    // Verify our test message is still there
    const messages = sidebar.querySelectorAll('.message-item');
    const foundMessage = Array.from(messages).some(msg => 
      msg.textContent.includes(testMessage)
    );
    
    if (!foundMessage) {
      throw new Error('Test message not found after reopening sidebar');
    }
    
    this.log('Message persistence test passed');
  }

  // Test: Multiple message sending
  async testMultipleMessages() {
    this.log('Testing multiple message sending...');
    
    showSidebar();
    const sidebar = await this.waitForElement('#chrome-chat-sidebar.visible');
    
    const messageInput = await this.waitForElement('#message-input');
    const sendButton = await this.waitForElement('#send-button');
    
    const testMessages = [
      `Multi Test 1 ${Date.now()}`,
      `Multi Test 2 ${Date.now()}`,
      `Multi Test 3 ${Date.now()}`
    ];
    
    const initialMessageCount = sidebar.querySelectorAll('.message-item').length;
    
    // Send multiple messages
    for (let i = 0; i < testMessages.length; i++) {
      messageInput.value = testMessages[i];
      messageInput.dispatchEvent(new Event('input'));
      
      await this.delay(100);
      sendButton.click();
      
      // Wait for message to appear
      await this.waitForCondition(() => {
        const currentCount = sidebar.querySelectorAll('.message-item').length;
        return currentCount > initialMessageCount + i;
      });
      
      await this.delay(200); // Brief pause between messages
    }
    
    // Verify all messages appeared
    const finalMessageCount = sidebar.querySelectorAll('.message-item').length;
    const expectedCount = initialMessageCount + testMessages.length;
    
    if (finalMessageCount < expectedCount) {
      throw new Error(`Expected ${expectedCount} messages, but found ${finalMessageCount}`);
    }
    
    // Verify message content
    const messages = sidebar.querySelectorAll('.message-item');
    for (const testMessage of testMessages) {
      const found = Array.from(messages).some(msg => 
        msg.textContent.includes(testMessage)
      );
      if (!found) {
        throw new Error(`Test message not found: ${testMessage}`);
      }
    }
    
    this.log('Multiple message sending test passed');
  }

  // Test: Input validation edge cases
  async testInputValidation() {
    this.log('Testing input validation edge cases...');
    
    showSidebar();
    const sidebar = await this.waitForElement('#chrome-chat-sidebar.visible');
    
    const messageInput = await this.waitForElement('#message-input');
    const sendButton = await this.waitForElement('#send-button');
    
    // Test empty message
    messageInput.value = '';
    messageInput.dispatchEvent(new Event('input'));
    await this.delay(100);
    
    if (!sendButton.disabled) {
      throw new Error('Send button should be disabled for empty message');
    }
    
    // Test whitespace-only message
    messageInput.value = '   \n\n   ';
    messageInput.dispatchEvent(new Event('input'));
    await this.delay(100);
    
    if (!sendButton.disabled) {
      throw new Error('Send button should be disabled for whitespace-only message');
    }
    
    // Test valid message
    messageInput.value = 'Valid message';
    messageInput.dispatchEvent(new Event('input'));
    await this.delay(100);
    
    if (sendButton.disabled) {
      throw new Error('Send button should be enabled for valid message');
    }
    
    // Test very long message
    const longMessage = 'a'.repeat(2001);
    messageInput.value = longMessage;
    messageInput.dispatchEvent(new Event('input'));
    await this.delay(100);
    
    if (!sendButton.disabled) {
      throw new Error('Send button should be disabled for overly long message');
    }
    
    this.log('Input validation test passed');
  }

  // Test: Keyboard shortcuts
  async testKeyboardShortcuts() {
    this.log('Testing keyboard shortcuts...');
    
    showSidebar();
    const sidebar = await this.waitForElement('#chrome-chat-sidebar.visible');
    
    const messageInput = await this.waitForElement('#message-input');
    
    // Test Enter key to send message
    const testMessage = `Keyboard Test ${Date.now()}`;
    messageInput.value = testMessage;
    
    const messagesBefore = sidebar.querySelectorAll('.message-item').length;
    
    // Simulate Enter key press
    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true
    });
    
    messageInput.dispatchEvent(enterEvent);
    
    // Wait for message to appear
    await this.waitForCondition(() => {
      const messagesAfter = sidebar.querySelectorAll('.message-item').length;
      return messagesAfter > messagesBefore;
    });
    
    // Verify message was sent
    const messages = sidebar.querySelectorAll('.message-item');
    const found = Array.from(messages).some(msg => 
      msg.textContent.includes(testMessage)
    );
    
    if (!found) {
      throw new Error('Message not sent via Enter key');
    }
    
    // Test Shift+Enter for new line
    messageInput.value = 'Line 1';
    
    const shiftEnterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      shiftKey: true,
      bubbles: true
    });
    
    messageInput.dispatchEvent(shiftEnterEvent);
    
    // Should not send message, just add new line
    await this.delay(200);
    
    if (messageInput.value === '') {
      throw new Error('Shift+Enter should not send message');
    }
    
    this.log('Keyboard shortcuts test passed');
  }

  // Test: Storage operations
  async testStorageOperations() {
    this.log('Testing storage operations...');
    
    const testMessage = {
      content: `Storage Test ${Date.now()}`,
      type: 'user',
      url: window.location.href
    };
    
    // Test saving message
    const saveResult = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'saveMessage',
        data: testMessage
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response && response.success) {
          resolve(response);
        } else {
          reject(new Error('Save operation failed'));
        }
      });
    });
    
    this.log('Message saved to storage');
    
    // Test retrieving messages
    const retrieveResult = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'getMessages',
        sessionId: null
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response && response.success) {
          resolve(response);
        } else {
          reject(new Error('Retrieve operation failed'));
        }
      });
    });
    
    const messages = retrieveResult.data.messages || [];
    const foundMessage = messages.find(msg => msg.content === testMessage.content);
    
    if (!foundMessage) {
      throw new Error('Saved message not found in retrieved messages');
    }
    
    this.log('Storage operations test passed');
  }

  async runAllTests() {
    console.log('🚀 Starting E2E Test Suite...');
    
    try {
      await this.setup();
      
      const tests = [
        ['Complete User Workflow', () => this.testCompleteUserWorkflow()],
        ['Message Persistence', () => this.testMessagePersistence()],
        ['Multiple Messages', () => this.testMultipleMessages()],
        ['Input Validation', () => this.testInputValidation()],
        ['Keyboard Shortcuts', () => this.testKeyboardShortcuts()],
        ['Storage Operations', () => this.testStorageOperations()]
      ];
      
      for (const [testName, testFunction] of tests) {
        await this.runTest(testName, testFunction);
        await this.delay(1000); // Pause between tests
      }
      
    } finally {
      await this.teardown();
    }
    
    this.generateReport();
    return this.getResults();
  }

  generateReport() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(test => test.status === 'passed').length;
    const failedTests = this.testResults.filter(test => test.status === 'failed').length;
    
    console.log('\n=== E2E TEST REPORT ===');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (failedTests > 0) {
      console.log('\n=== FAILED TESTS ===');
      this.testResults
        .filter(test => test.status === 'failed')
        .forEach(test => {
          console.log(`❌ ${test.name}: ${test.error}`);
        });
    }
    
    console.log('\n=== DETAILED RESULTS ===');
    this.testResults.forEach(test => {
      const status = test.status === 'passed' ? '✅' : '❌';
      console.log(`${status} ${test.name} (${test.duration}ms)`);
    });
  }

  getResults() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(test => test.status === 'passed').length;
    const failedTests = this.testResults.filter(test => test.status === 'failed').length;
    
    return {
      totalTests,
      passedTests,
      failedTests,
      successRate: (passedTests / totalTests) * 100,
      results: this.testResults
    };
  }
}

// Export for use
window.E2ETestSuite = E2ETestSuite;

// Auto-run function
window.runE2ETests = async function() {
  const testSuite = new E2ETestSuite();
  return await testSuite.runAllTests();
};

console.log('E2E Test Suite loaded. Run with: runE2ETests()');

// Export for Node.js if available
if (typeof module !== 'undefined' && module.exports) {
  module.exports = E2ETestSuite;
}