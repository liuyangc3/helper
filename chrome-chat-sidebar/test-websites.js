// Website compatibility test script for Chrome Chat Sidebar
// Tests the extension on various types of websites

const testWebsites = [
  {
    name: 'Google',
    url: 'https://www.google.com',
    type: 'search_engine',
    expectedIssues: []
  },
  {
    name: 'GitHub',
    url: 'https://github.com',
    type: 'development',
    expectedIssues: []
  },
  {
    name: 'YouTube',
    url: 'https://www.youtube.com',
    type: 'media',
    expectedIssues: ['complex_layout']
  },
  {
    name: 'Wikipedia',
    url: 'https://en.wikipedia.org',
    type: 'content',
    expectedIssues: []
  },
  {
    name: 'Reddit',
    url: 'https://www.reddit.com',
    type: 'social',
    expectedIssues: ['dynamic_content']
  },
  {
    name: 'Stack Overflow',
    url: 'https://stackoverflow.com',
    type: 'qa',
    expectedIssues: []
  },
  {
    name: 'MDN Web Docs',
    url: 'https://developer.mozilla.org',
    type: 'documentation',
    expectedIssues: []
  },
  {
    name: 'Gmail',
    url: 'https://mail.google.com',
    type: 'webapp',
    expectedIssues: ['complex_spa', 'security_restrictions']
  }
];

class WebsiteCompatibilityTester {
  constructor() {
    this.results = [];
    this.currentTest = null;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    console.log(logEntry);
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async testWebsite(website) {
    this.log(`Testing ${website.name} (${website.url})`);
    
    const testResult = {
      website: website.name,
      url: website.url,
      type: website.type,
      startTime: Date.now(),
      tests: {},
      issues: [],
      status: 'running'
    };

    try {
      // Test 1: Content script injection
      testResult.tests.contentScriptInjection = await this.testContentScriptInjection();
      
      // Test 2: Sidebar injection
      testResult.tests.sidebarInjection = await this.testSidebarInjection();
      
      // Test 3: CSS isolation
      testResult.tests.cssIsolation = await this.testCSSIsolation();
      
      // Test 4: Message functionality
      testResult.tests.messageFunctionality = await this.testMessageFunctionality();
      
      // Test 5: Storage operations
      testResult.tests.storageOperations = await this.testStorageOperations();
      
      // Test 6: State persistence
      testResult.tests.statePersistence = await this.testStatePersistence();
      
      // Calculate overall status
      const allTestsPassed = Object.values(testResult.tests).every(test => test.passed);
      testResult.status = allTestsPassed ? 'passed' : 'failed';
      
    } catch (error) {
      testResult.status = 'error';
      testResult.error = error.message;
      this.log(`Error testing ${website.name}: ${error.message}`, 'error');
    }

    testResult.endTime = Date.now();
    testResult.duration = testResult.endTime - testResult.startTime;
    
    this.results.push(testResult);
    return testResult;
  }

  async testContentScriptInjection() {
    this.log('Testing content script injection...');
    
    try {
      // Check if content script functions are available
      const hasShowSidebar = typeof showSidebar === 'function';
      const hasHideSidebar = typeof hideSidebar === 'function';
      const hasInitializeSidebar = typeof initializeSidebar === 'function';
      
      if (!hasShowSidebar || !hasHideSidebar || !hasInitializeSidebar) {
        return {
          passed: false,
          error: 'Content script functions not available',
          details: {
            showSidebar: hasShowSidebar,
            hideSidebar: hasHideSidebar,
            initializeSidebar: hasInitializeSidebar
          }
        };
      }
      
      return {
        passed: true,
        details: 'All content script functions available'
      };
    } catch (error) {
      return {
        passed: false,
        error: error.message
      };
    }
  }

  async testSidebarInjection() {
    this.log('Testing sidebar injection...');
    
    try {
      // Remove any existing sidebar
      const existingSidebar = document.getElementById('chrome-chat-sidebar');
      if (existingSidebar) {
        existingSidebar.remove();
        await this.delay(100);
      }
      
      // Inject sidebar
      if (typeof showSidebar === 'function') {
        showSidebar();
      } else {
        throw new Error('showSidebar function not available');
      }
      
      // Wait for sidebar to appear
      let attempts = 0;
      let sidebar = null;
      while (attempts < 50 && !sidebar) {
        sidebar = document.getElementById('chrome-chat-sidebar');
        if (!sidebar) {
          await this.delay(100);
          attempts++;
        }
      }
      
      if (!sidebar) {
        return {
          passed: false,
          error: 'Sidebar not injected after 5 seconds'
        };
      }
      
      // Check if sidebar is visible
      const isVisible = sidebar.classList.contains('visible');
      
      return {
        passed: true,
        details: {
          injected: true,
          visible: isVisible,
          element: sidebar.tagName
        }
      };
    } catch (error) {
      return {
        passed: false,
        error: error.message
      };
    }
  }

  async testCSSIsolation() {
    this.log('Testing CSS isolation...');
    
    try {
      const sidebar = document.getElementById('chrome-chat-sidebar');
      if (!sidebar) {
        return {
          passed: false,
          error: 'Sidebar not found for CSS isolation test'
        };
      }
      
      // Check computed styles
      const computedStyle = window.getComputedStyle(sidebar);
      const position = computedStyle.position;
      const zIndex = computedStyle.zIndex;
      const fontFamily = computedStyle.fontFamily;
      
      // Verify key isolation properties
      const hasCorrectPosition = position === 'fixed';
      const hasHighZIndex = parseInt(zIndex) > 1000000;
      const hasIsolatedFont = fontFamily.includes('system') || fontFamily.includes('Segoe UI');
      
      return {
        passed: hasCorrectPosition && hasHighZIndex,
        details: {
          position: position,
          zIndex: zIndex,
          fontFamily: fontFamily,
          isolated: hasCorrectPosition && hasHighZIndex
        }
      };
    } catch (error) {
      return {
        passed: false,
        error: error.message
      };
    }
  }

  async testMessageFunctionality() {
    this.log('Testing message functionality...');
    
    try {
      const sidebar = document.getElementById('chrome-chat-sidebar');
      if (!sidebar) {
        return {
          passed: false,
          error: 'Sidebar not found for message functionality test'
        };
      }
      
      const messageInput = sidebar.querySelector('#message-input');
      const sendButton = sidebar.querySelector('#send-button');
      
      if (!messageInput || !sendButton) {
        return {
          passed: false,
          error: 'Message input or send button not found'
        };
      }
      
      // Test input functionality
      const testMessage = 'Test message ' + Date.now();
      messageInput.value = testMessage;
      messageInput.dispatchEvent(new Event('input'));
      
      await this.delay(100);
      
      // Check if send button is enabled
      const sendButtonEnabled = !sendButton.disabled;
      
      if (!sendButtonEnabled) {
        return {
          passed: false,
          error: 'Send button not enabled for valid input'
        };
      }
      
      // Count messages before sending
      const messagesBefore = sidebar.querySelectorAll('.message-item').length;
      
      // Send message
      sendButton.click();
      
      // Wait for message to appear
      let attempts = 0;
      let messageAppeared = false;
      while (attempts < 30 && !messageAppeared) {
        const messagesAfter = sidebar.querySelectorAll('.message-item').length;
        messageAppeared = messagesAfter > messagesBefore;
        if (!messageAppeared) {
          await this.delay(100);
          attempts++;
        }
      }
      
      return {
        passed: messageAppeared,
        details: {
          inputWorking: true,
          sendButtonEnabled: sendButtonEnabled,
          messageAppeared: messageAppeared,
          messagesBefore: messagesBefore,
          messagesAfter: sidebar.querySelectorAll('.message-item').length
        }
      };
    } catch (error) {
      return {
        passed: false,
        error: error.message
      };
    }
  }

  async testStorageOperations() {
    this.log('Testing storage operations...');
    
    return new Promise((resolve) => {
      try {
        const testMessage = {
          content: 'Website compatibility test message',
          type: 'user',
          url: window.location.href
        };
        
        chrome.runtime.sendMessage({
          action: 'saveMessage',
          data: testMessage
        }, (response) => {
          if (chrome.runtime.lastError) {
            resolve({
              passed: false,
              error: chrome.runtime.lastError.message
            });
            return;
          }
          
          if (!response || !response.success) {
            resolve({
              passed: false,
              error: 'Invalid save response'
            });
            return;
          }
          
          // Test retrieval
          chrome.runtime.sendMessage({
            action: 'getMessages',
            sessionId: null
          }, (response) => {
            if (chrome.runtime.lastError) {
              resolve({
                passed: false,
                error: chrome.runtime.lastError.message
              });
              return;
            }
            
            if (!response || !response.success) {
              resolve({
                passed: false,
                error: 'Invalid retrieve response'
              });
              return;
            }
            
            const messages = response.data.messages || [];
            const foundMessage = messages.find(msg => msg.content === testMessage.content);
            
            resolve({
              passed: !!foundMessage,
              details: {
                messagesSaved: messages.length,
                testMessageFound: !!foundMessage
              }
            });
          });
        });
      } catch (error) {
        resolve({
          passed: false,
          error: error.message
        });
      }
    });
  }

  async testStatePersistence() {
    this.log('Testing state persistence...');
    
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ action: 'getSidebarState' }, (response) => {
          if (chrome.runtime.lastError) {
            resolve({
              passed: false,
              error: chrome.runtime.lastError.message
            });
            return;
          }
          
          if (!response || !response.success) {
            resolve({
              passed: false,
              error: 'Invalid state response'
            });
            return;
          }
          
          resolve({
            passed: true,
            details: {
              visible: response.data.visible,
              sessionId: response.data.sessionId,
              settings: response.data.settings
            }
          });
        });
      } catch (error) {
        resolve({
          passed: false,
          error: error.message
        });
      }
    });
  }

  generateReport() {
    const totalWebsites = this.results.length;
    const passedWebsites = this.results.filter(result => result.status === 'passed').length;
    const failedWebsites = this.results.filter(result => result.status === 'failed').length;
    const errorWebsites = this.results.filter(result => result.status === 'error').length;
    
    console.log('\n=== WEBSITE COMPATIBILITY REPORT ===');
    console.log(`Total Websites Tested: ${totalWebsites}`);
    console.log(`Passed: ${passedWebsites}`);
    console.log(`Failed: ${failedWebsites}`);
    console.log(`Errors: ${errorWebsites}`);
    console.log(`Success Rate: ${((passedWebsites / totalWebsites) * 100).toFixed(1)}%`);
    
    console.log('\n=== DETAILED RESULTS ===');
    this.results.forEach(result => {
      const status = result.status === 'passed' ? '✅' : 
                    result.status === 'failed' ? '❌' : '⚠️';
      console.log(`${status} ${result.website} (${result.type}) - ${result.duration}ms`);
      
      if (result.status !== 'passed') {
        Object.entries(result.tests || {}).forEach(([testName, testResult]) => {
          if (!testResult.passed) {
            console.log(`  ❌ ${testName}: ${testResult.error}`);
          }
        });
      }
    });
    
    return {
      totalWebsites,
      passedWebsites,
      failedWebsites,
      errorWebsites,
      successRate: (passedWebsites / totalWebsites) * 100,
      results: this.results
    };
  }
}

// Export for use
window.WebsiteCompatibilityTester = WebsiteCompatibilityTester;
window.testWebsites = testWebsites;

// Function to test current website
window.testCurrentWebsite = async function() {
  const tester = new WebsiteCompatibilityTester();
  const currentWebsite = {
    name: document.title || 'Current Website',
    url: window.location.href,
    type: 'current',
    expectedIssues: []
  };
  
  const result = await tester.testWebsite(currentWebsite);
  tester.generateReport();
  return result;
};

console.log('🌐 Website compatibility tester loaded.');
console.log('Run testCurrentWebsite() to test the current page.');