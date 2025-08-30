// Integration test script for Chrome Chat Sidebar extension
// This script tests the complete message flow from input to display

class IntegrationTester {
  constructor() {
    this.testResults = [];
    this.currentTest = null;
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

    this.log(`Starting test: ${testName}`);

    try {
      await testFunction();
      this.currentTest.status = 'passed';
      this.currentTest.endTime = Date.now();
      this.currentTest.duration = this.currentTest.endTime - this.currentTest.startTime;
      this.log(`Test passed: ${testName} (${this.currentTest.duration}ms)`);
    } catch (error) {
      this.currentTest.status = 'failed';
      this.currentTest.error = error.message;
      this.currentTest.endTime = Date.now();
      this.currentTest.duration = this.currentTest.endTime - this.currentTest.startTime;
      this.log(`Test failed: ${testName} - ${error.message}`, 'error');
    }

    this.testResults.push({ ...this.currentTest });
    this.currentTest = null;
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

  // Test background script communication
  async testBackgroundScriptCommunication() {
    this.log('Testing background script communication...');
    
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(`Background script communication failed: ${chrome.runtime.lastError.message}`));
          return;
        }
        
        if (!response || !response.success) {
          reject(new Error('Invalid response from background script'));
          return;
        }
        
        this.log('Background script communication successful');
        resolve();
      });
    });
  }

  // Test sidebar injection and removal
  async testSidebarInjection() {
    this.log('Testing sidebar injection...');
    
    // Ensure sidebar is not already injected
    let existingSidebar = document.getElementById('chrome-chat-sidebar');
    if (existingSidebar) {
      existingSidebar.remove();
      await this.delay(100);
    }
    
    // Simulate extension icon click by calling showSidebar directly
    if (typeof showSidebar === 'function') {
      showSidebar();
    } else {
      throw new Error('showSidebar function not available');
    }
    
    // Wait for sidebar to be injected
    const sidebar = await this.waitForElement('#chrome-chat-sidebar');
    
    if (!sidebar.classList.contains('visible')) {
      await this.waitForCondition(() => sidebar.classList.contains('visible'), 2000);
    }
    
    this.log('Sidebar injection successful');
    
    // Test sidebar removal
    this.log('Testing sidebar removal...');
    
    if (typeof hideSidebar === 'function') {
      hideSidebar();
    } else {
      throw new Error('hideSidebar function not available');
    }
    
    await this.waitForCondition(() => !sidebar.classList.contains('visible'), 2000);
    this.log('Sidebar removal successful');
  }

  // Test message input and sending
  async testMessageFlow() {
    this.log('Testing complete message flow...');
    
    // Ensure sidebar is visible
    if (typeof showSidebar === 'function') {
      showSidebar();
    }
    
    const sidebar = await this.waitForElement('#chrome-chat-sidebar.visible');
    const messageInput = await this.waitForElement('#message-input');
    const sendButton = await this.waitForElement('#send-button');
    
    // Test input validation
    this.log('Testing input validation...');
    
    // Empty message should not enable send button
    messageInput.value = '';
    messageInput.dispatchEvent(new Event('input'));
    await this.delay(100);
    
    if (!sendButton.disabled) {
      throw new Error('Send button should be disabled for empty input');
    }
    
    // Valid message should enable send button
    const testMessage = 'Test message ' + Date.now();
    messageInput.value = testMessage;
    messageInput.dispatchEvent(new Event('input'));
    await this.delay(100);
    
    if (sendButton.disabled) {
      throw new Error('Send button should be enabled for valid input');
    }
    
    this.log('Input validation working correctly');
    
    // Test message sending
    this.log('Testing message sending...');
    
    const messageCountBefore = sidebar.querySelectorAll('.message-item').length;
    
    // Send message
    sendButton.click();
    
    // Wait for message to appear
    await this.waitForCondition(() => {
      const messageCount = sidebar.querySelectorAll('.message-item').length;
      return messageCount > messageCountBefore;
    }, 3000);
    
    // Verify message content
    const messages = sidebar.querySelectorAll('.message-item');
    const lastMessage = messages[messages.length - 1];
    const messageContent = lastMessage.querySelector('.message-content');
    
    if (!messageContent || !messageContent.textContent.includes(testMessage)) {
      throw new Error('Message content not found or incorrect');
    }
    
    // Verify input was cleared
    if (messageInput.value !== '') {
      throw new Error('Message input should be cleared after sending');
    }
    
    this.log('Message flow test successful');
  }

  // Test storage operations
  async testStorageOperations() {
    this.log('Testing storage operations...');
    
    // Test saving a message
    const testMessage = {
      id: 'test_' + Date.now(),
      content: 'Test storage message',
      timestamp: Date.now(),
      type: 'user',
      metadata: {
        url: window.location.href,
        tabId: null
      }
    };
    
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'saveMessage',
        data: {
          content: testMessage.content,
          type: testMessage.type,
          url: window.location.href
        }
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(`Storage save failed: ${chrome.runtime.lastError.message}`));
          return;
        }
        
        if (!response || !response.success) {
          reject(new Error('Storage save response invalid'));
          return;
        }
        
        this.log('Message saved to storage successfully');
        
        // Test retrieving messages
        chrome.runtime.sendMessage({
          action: 'getMessages',
          sessionId: null
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(`Storage retrieval failed: ${chrome.runtime.lastError.message}`));
            return;
          }
          
          if (!response || !response.success || !response.data.messages) {
            reject(new Error('Storage retrieval response invalid'));
            return;
          }
          
          const messages = response.data.messages;
          const foundMessage = messages.find(msg => msg.content === testMessage.content);
          
          if (!foundMessage) {
            reject(new Error('Saved message not found in retrieved messages'));
            return;
          }
          
          this.log('Message retrieved from storage successfully');
          resolve();
        });
      });
    });
  }

  // Test sidebar state persistence
  async testStatePersistence() {
    this.log('Testing sidebar state persistence...');
    
    // Show sidebar
    if (typeof showSidebar === 'function') {
      showSidebar();
    }
    
    await this.waitForElement('#chrome-chat-sidebar.visible');
    
    // Test state retrieval
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'getSidebarState' }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(`State retrieval failed: ${chrome.runtime.lastError.message}`));
          return;
        }
        
        if (!response || !response.success) {
          reject(new Error('State retrieval response invalid'));
          return;
        }
        
        if (!response.data.visible) {
          reject(new Error('Sidebar state should be visible'));
          return;
        }
        
        this.log('Sidebar state persistence working correctly');
        resolve();
      });
    });
  }

  // Test cross-page navigation (simulated)
  async testNavigationPersistence() {
    this.log('Testing navigation persistence...');
    
    // Show sidebar
    if (typeof showSidebar === 'function') {
      showSidebar();
    }
    
    await this.waitForElement('#chrome-chat-sidebar.visible');
    
    // Simulate URL change
    const originalUrl = window.location.href;
    const testUrl = originalUrl + '#test-navigation';
    
    // Update URL without actually navigating
    window.history.pushState({}, '', testUrl);
    
    // Trigger URL change handler if it exists
    if (typeof handleUrlChange === 'function') {
      handleUrlChange();
    }
    
    await this.delay(500);
    
    // Verify sidebar state is maintained
    const sidebar = document.getElementById('chrome-chat-sidebar');
    if (!sidebar || !sidebar.classList.contains('visible')) {
      throw new Error('Sidebar state not maintained after navigation');
    }
    
    // Restore original URL
    window.history.pushState({}, '', originalUrl);
    
    this.log('Navigation persistence test successful');
  }

  // Test error handling
  async testErrorHandling() {
    this.log('Testing error handling...');
    
    // Test invalid message action
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'invalidAction' }, (response) => {
        if (chrome.runtime.lastError) {
          // This is expected for invalid actions
          this.log('Invalid action properly rejected');
          resolve();
          return;
        }
        
        if (response && !response.success) {
          this.log('Invalid action properly handled with error response');
          resolve();
          return;
        }
        
        reject(new Error('Invalid action should have been rejected'));
      });
    });
  }

  // Run all tests
  async runAllTests() {
    this.log('Starting integration test suite...');
    
    const tests = [
      ['Background Script Communication', () => this.testBackgroundScriptCommunication()],
      ['Sidebar Injection', () => this.testSidebarInjection()],
      ['Message Flow', () => this.testMessageFlow()],
      ['Storage Operations', () => this.testStorageOperations()],
      ['State Persistence', () => this.testStatePersistence()],
      ['Navigation Persistence', () => this.testNavigationPersistence()],
      ['Error Handling', () => this.testErrorHandling()]
    ];
    
    for (const [testName, testFunction] of tests) {
      await this.runTest(testName, testFunction);
      await this.delay(500); // Brief pause between tests
    }
    
    this.generateReport();
  }

  generateReport() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(test => test.status === 'passed').length;
    const failedTests = this.testResults.filter(test => test.status === 'failed').length;
    
    console.log('\n=== INTEGRATION TEST REPORT ===');
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
    
    return {
      totalTests,
      passedTests,
      failedTests,
      successRate: (passedTests / totalTests) * 100,
      results: this.testResults
    };
  }
}

// Export for use in browser console or other scripts
window.IntegrationTester = IntegrationTester;

// Auto-run tests if this script is loaded directly
if (typeof window !== 'undefined' && window.location) {
  console.log('Integration tester loaded. Run tests with: new IntegrationTester().runAllTests()');
}