// Test runner for Chrome Chat Sidebar integration tests
// This script can be run in the browser console to test the extension

(async function runIntegrationTests() {
    console.log('🚀 Starting Chrome Chat Sidebar Integration Tests...');

    // Check if we're in a browser environment
    if (typeof chrome === 'undefined' || !chrome.runtime) {
        console.error('❌ Chrome extension APIs not available. Please run this in a browser with the extension loaded.');
        return;
    }

    // Load the integration tester if not already loaded
    if (typeof IntegrationTester === 'undefined') {
        try {
            // Try to load the integration tester script
            const script = document.createElement('script');
            script.src = chrome.runtime.getURL('test-integration.js');
            document.head.appendChild(script);

            // Wait for script to load
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
                setTimeout(reject, 5000); // 5 second timeout
            });
        } catch (error) {
            console.error('❌ Failed to load integration tester:', error);
            return;
        }
    }

    // Run the tests
    try {
        const tester = new IntegrationTester();
        const results = await tester.runAllTests();

        console.log('\n🎉 Integration tests completed!');

        if (results.failedTests === 0) {
            console.log('✅ All tests passed!');
        } else {
            console.log(`⚠️  ${results.failedTests} test(s) failed. Check the detailed report above.`);
        }

        return results;
    } catch (error) {
        console.error('❌ Failed to run integration tests:', error);
        return null;
    }
})();

// Manual test functions for individual components
window.testSidebarToggle = function () {
    console.log('🔄 Testing sidebar toggle...');

    // Simulate extension icon click
    chrome.runtime.sendMessage({ action: 'toggleSidebar', visible: true }, (response) => {
        if (chrome.runtime.lastError) {
            console.error('❌ Toggle failed:', chrome.runtime.lastError.message);
        } else {
            console.log('✅ Toggle successful:', response);
        }
    });
};

window.testMessageSend = function (message = 'Test message from console') {
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

window.testStorageOperations = function () {
    console.log('💾 Testing storage operations...');

    // Test save
    chrome.runtime.sendMessage({
        action: 'saveMessage',
        data: {
            content: 'Test storage message from console',
            type: 'user',
            url: window.location.href
        }
    }, (response) => {
        if (chrome.runtime.lastError) {
            console.error('❌ Save failed:', chrome.runtime.lastError.message);
            return;
        }

        console.log('✅ Message saved:', response);

        // Test retrieve
        chrome.runtime.sendMessage({
            action: 'getMessages',
            sessionId: null
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('❌ Retrieve failed:', chrome.runtime.lastError.message);
                return;
            }

            console.log('✅ Messages retrieved:', response.data.messages.length, 'messages');
        });
    });
};

console.log('🛠️  Manual test functions available:');
console.log('  - testSidebarToggle()');
console.log('  - testMessageSend("your message")');
console.log('  - testStorageOperations()');