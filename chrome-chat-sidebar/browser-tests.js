// Comprehensive browser-based test runner for Chrome Chat Sidebar extension
// This file can be loaded in the browser console to run all tests

console.log('Chrome Chat Sidebar Browser Test Runner loaded');

// Basic test functions
function testExtensionLoaded() {
  console.log('Testing if extension is loaded...');
  
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
    console.log('✅ Extension loaded successfully');
    return true;
  } else {
    console.log('❌ Extension not loaded');
    return false;
  }
}

function testContentScriptInjection() {
  console.log('Testing content script injection...');
  
  // Check if content script functions are available
  if (typeof showSidebar === 'function' && typeof hideSidebar === 'function') {
    console.log('✅ Content script functions available');
    return true;
  } else {
    console.log('❌ Content script functions not available');
    return false;
  }
}

function testSidebarInjection() {
  console.log('Testing sidebar injection...');
  
  try {
    // Try to show sidebar
    if (typeof showSidebar === 'function') {
      showSidebar();
      
      // Check if sidebar element exists
      setTimeout(() => {
        const sidebar = document.getElementById('chrome-chat-sidebar');
        if (sidebar) {
          console.log('✅ Sidebar injected successfully');
          
          // Test hiding
          setTimeout(() => {
            if (typeof hideSidebar === 'function') {
              hideSidebar();
              console.log('✅ Sidebar hidden successfully');
            }
          }, 1000);
        } else {
          console.log('❌ Sidebar not found after injection');
        }
      }, 500);
      
      return true;
    } else {
      console.log('❌ showSidebar function not available');
      return false;
    }
  } catch (error) {
    console.log('❌ Error during sidebar injection:', error);
    return false;
  }
}

function testBackgroundScriptCommunication() {
  console.log('Testing background script communication...');
  
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('❌ Background script communication failed:', chrome.runtime.lastError.message);
      } else if (response && response.success) {
        console.log('✅ Background script communication successful');
      } else {
        console.log('❌ Invalid response from background script');
      }
    });
    return true;
  } else {
    console.log('❌ Chrome runtime not available');
    return false;
  }
}

function testMessageFlow() {
  console.log('Testing message flow...');
  
  // Ensure sidebar is visible
  if (typeof showSidebar === 'function') {
    showSidebar();
  }
  
  setTimeout(() => {
    const sidebar = document.getElementById('chrome-chat-sidebar');
    if (!sidebar) {
      console.log('❌ Sidebar not found for message flow test');
      return;
    }
    
    const messageInput = sidebar.querySelector('#message-input');
    const sendButton = sidebar.querySelector('#send-button');
    
    if (!messageInput || !sendButton) {
      console.log('❌ Message input or send button not found');
      return;
    }
    
    // Test message sending
    const testMessage = 'Test message from test runner';
    messageInput.value = testMessage;
    messageInput.dispatchEvent(new Event('input'));
    
    setTimeout(() => {
      if (!sendButton.disabled) {
        sendButton.click();
        console.log('✅ Message flow test completed');
      } else {
        console.log('❌ Send button not enabled');
      }
    }, 100);
  }, 1000);
}

function testStorageOperations() {
  console.log('Testing storage operations...');
  
  chrome.runtime.sendMessage({
    action: 'saveMessage',
    data: {
      content: 'Test storage message',
      type: 'user',
      url: window.location.href
    }
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.log('❌ Storage save failed:', chrome.runtime.lastError.message);
      return;
    }
    
    if (response && response.success) {
      console.log('✅ Message saved to storage');
      
      // Test retrieval
      chrome.runtime.sendMessage({
        action: 'getMessages',
        sessionId: null
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('❌ Storage retrieval failed:', chrome.runtime.lastError.message);
          return;
        }
        
        if (response && response.success) {
          console.log('✅ Messages retrieved from storage:', response.data.messages.length, 'messages');
        } else {
          console.log('❌ Storage retrieval failed');
        }
      });
    } else {
      console.log('❌ Storage save failed');
    }
  });
}

function runBasicTests() {
  console.log('🚀 Running basic tests...\n');
  
  const tests = [
    testExtensionLoaded,
    testContentScriptInjection,
    testBackgroundScriptCommunication,
    testSidebarInjection
  ];
  
  let passed = 0;
  let total = tests.length;
  
  tests.forEach((test, index) => {
    setTimeout(() => {
      console.log(`\n--- Test ${index + 1}/${total} ---`);
      if (test()) {
        passed++;
      }
      
      if (index === total - 1) {
        setTimeout(() => {
          console.log(`\n🎉 Basic tests completed: ${passed}/${total} passed`);
        }, 2000);
      }
    }, index * 100);
  });
}

function runIntegrationTests() {
  console.log('🚀 Running integration tests...\n');
  
  // Load and run integration tests if available
  if (typeof IntegrationTester !== 'undefined') {
    const tester = new IntegrationTester();
    tester.runAllTests().then(results => {
      console.log('🎉 Integration tests completed!');
    }).catch(error => {
      console.error('❌ Integration tests failed:', error);
    });
  } else {
    console.log('⚠️  Integration tester not loaded. Loading...');
    
    // Try to load integration tester
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('test-integration.js');
    script.onload = () => {
      console.log('✅ Integration tester loaded');
      runIntegrationTests();
    };
    script.onerror = () => {
      console.log('❌ Failed to load integration tester');
    };
    document.head.appendChild(script);
  }
}

function runAllTests() {
  console.log('🚀 Running all tests (basic + integration)...\n');
  
  // Run basic tests first
  runBasicTests();
  
  // Run integration tests after basic tests
  setTimeout(() => {
    console.log('\n--- Starting Integration Tests ---');
    runIntegrationTests();
  }, 5000);
  
  // Run additional functional tests
  setTimeout(() => {
    console.log('\n--- Additional Functional Tests ---');
    testMessageFlow();
    testStorageOperations();
  }, 7000);
}

// Manual test functions
window.testSidebarToggle = function() {
  console.log('🔄 Testing sidebar toggle...');
  
  const sidebar = document.getElementById('chrome-chat-sidebar');
  if (sidebar && sidebar.classList.contains('visible')) {
    hideSidebar();
    console.log('✅ Sidebar hidden');
  } else {
    showSidebar();
    console.log('✅ Sidebar shown');
  }
};

window.testMessageSend = function(message = 'Test message from console') {
  console.log('💬 Testing message send...');
  
  const sidebar = document.getElementById('chrome-chat-sidebar');
  if (!sidebar) {
    console.error('❌ Sidebar not found. Please open the sidebar first.');
    return;
  }
  
  const messageInput = sidebar.querySelector('#message-input');
  const sendButton = sidebar.querySelector('#send-button');
  
  if (!messageInput || !sendButton) {
    console.error('❌ Message input or send button not found.');
    return;
  }
  
  messageInput.value = message;
  messageInput.dispatchEvent(new Event('input'));
  
  setTimeout(() => {
    sendButton.click();
    console.log('✅ Message sent:', message);
  }, 100);
};

// Export functions to global scope
window.testExtensionLoaded = testExtensionLoaded;
window.testContentScriptInjection = testContentScriptInjection;
window.testSidebarInjection = testSidebarInjection;
window.testBackgroundScriptCommunication = testBackgroundScriptCommunication;
window.testMessageFlow = testMessageFlow;
window.testStorageOperations = testStorageOperations;
window.runBasicTests = runBasicTests;
window.runIntegrationTests = runIntegrationTests;
window.runAllTests = runAllTests;

console.log('Available test functions:');
console.log('Basic Tests:');
console.log('- testExtensionLoaded()');
console.log('- testContentScriptInjection()');
console.log('- testSidebarInjection()');
console.log('- testBackgroundScriptCommunication()');
console.log('- testMessageFlow()');
console.log('- testStorageOperations()');
console.log('\nTest Suites:');
console.log('- runBasicTests() - Run basic functionality tests');
console.log('- runIntegrationTests() - Run comprehensive integration tests');
console.log('- runAllTests() - Run all tests');
console.log('\nManual Tests:');
console.log('- testSidebarToggle() - Toggle sidebar visibility');
console.log('- testMessageSend("message") - Send a test message');
console.log('\n🎯 Run runAllTests() to execute the complete test suite');