# Chrome Chat Sidebar - Testing Guide

This document explains how to test the Chrome Chat Sidebar extension integration and functionality.

## Quick Start Testing

### 1. Load the Extension
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the `chrome-chat-sidebar` folder
4. The extension icon should appear in the toolbar

### 2. Basic Functionality Test
1. Navigate to any website (e.g., https://www.google.com)
2. Click the extension icon in the toolbar
3. The sidebar should slide in from the right
4. Type a message and press Enter or click Send
5. The message should appear in the chat history
6. Click the X button to close the sidebar

## Comprehensive Testing

### Quick Start - Complete Test Suite

Open the browser console (F12) and run:

```javascript
// Load and run the complete test suite
const script = document.createElement('script');
script.src = chrome.runtime.getURL('test-runner.js');
script.onload = () => runAllTests();
document.head.appendChild(script);
```

### Test Suite Options

```javascript
// Run all tests (comprehensive)
runFullTests();

// Run quick tests (unit + integration only)
runQuickTests();

// Run specific test suites
runAllTests({
  unit: true,
  integration: true,
  e2e: true,
  performance: false,  // Skip performance tests
  website: true
});
```

### Individual Test Suites

#### Load Test Runner
```javascript
// Load the browser test runner
const script = document.createElement('script');
script.src = chrome.runtime.getURL('browser-tests.js');
document.head.appendChild(script);
```

#### Run All Tests
```javascript
// Run complete test suite
runAllTests();
```

#### Run Individual Tests
```javascript
// Test basic functionality
runBasicTests();

// Test integration
runIntegrationTests();

// Manual tests
testSidebarToggle();
testMessageSend('Hello from console!');
testStorageOperations();
```

### Integration Test Suite

The extension includes a comprehensive integration test suite that verifies:

1. **Background Script Communication** - Tests message passing between content and background scripts
2. **Sidebar Injection** - Verifies sidebar can be injected and removed from web pages
3. **Message Flow** - Tests complete message input, validation, sending, and display
4. **Storage Operations** - Verifies message persistence using Chrome Storage API
5. **State Persistence** - Tests sidebar state across page navigation
6. **Error Handling** - Verifies graceful handling of error conditions

#### Running Integration Tests
```javascript
// Load integration tester
const script = document.createElement('script');
script.src = chrome.runtime.getURL('test-integration.js');
document.head.appendChild(script);

// Run tests after loading
script.onload = () => {
  const tester = new IntegrationTester();
  tester.runAllTests();
};
```

### Website Compatibility Testing

Test the extension on different types of websites:

#### Load Website Compatibility Tester
```javascript
const script = document.createElement('script');
script.src = chrome.runtime.getURL('test-websites.js');
document.head.appendChild(script);
```

#### Test Current Website
```javascript
testCurrentWebsite();
```

## Manual Testing Checklist

### Core Functionality
- [ ] Extension loads without errors
- [ ] Extension icon appears in toolbar
- [ ] Clicking icon toggles sidebar visibility
- [ ] Sidebar slides in/out smoothly
- [ ] Sidebar appears above page content
- [ ] Sidebar styling is isolated from page styles

### Message Functionality
- [ ] Message input accepts text
- [ ] Send button enables/disables based on input
- [ ] Enter key sends message
- [ ] Shift+Enter creates new line
- [ ] Messages appear in chat history
- [ ] Message timestamps are displayed
- [ ] Input clears after sending
- [ ] Character count updates correctly

### Storage & Persistence
- [ ] Messages persist after closing/reopening sidebar
- [ ] Messages persist across page navigation
- [ ] Messages persist after browser restart
- [ ] Storage handles large message histories
- [ ] Old messages are cleaned up appropriately

### Cross-Page Navigation
- [ ] Sidebar state persists when navigating to new pages
- [ ] Messages are maintained across navigation
- [ ] Extension works on different website types
- [ ] No conflicts with page JavaScript/CSS

### Error Handling
- [ ] Extension handles restricted pages gracefully
- [ ] Storage errors are handled properly
- [ ] Network errors don't break functionality
- [ ] Invalid input is rejected appropriately

## Testing Different Website Types

### Static Websites
- Wikipedia, news sites, documentation
- Should work without issues

### Single Page Applications (SPAs)
- Gmail, GitHub, Twitter
- Test navigation within the app
- Verify state persistence

### Complex Media Sites
- YouTube, Netflix, streaming sites
- Check for CSS conflicts
- Verify sidebar positioning

### Development Sites
- GitHub, Stack Overflow, CodePen
- Test with developer tools open
- Check console for errors

## Performance Testing

### Memory Usage
1. Open Chrome Task Manager (Shift+Esc)
2. Monitor extension memory usage
3. Send many messages and check for memory leaks
4. Navigate between pages and monitor cleanup

### Storage Usage
```javascript
// Check storage usage
chrome.storage.local.getBytesInUse(null, (bytes) => {
  console.log('Storage usage:', bytes, 'bytes');
});
```

### Animation Performance
- Test sidebar animations on slower devices
- Check for smooth transitions
- Verify no frame drops during animations

## Debugging

### Enable Debug Logging
The extension includes comprehensive logging. Check the console for:
- Background script logs
- Content script logs
- Storage operation logs
- Error messages

### Common Issues

#### Extension Not Loading
- Check manifest.json syntax
- Verify all files are present
- Check Chrome extensions page for errors

#### Sidebar Not Appearing
- Check if content script is injected
- Verify page allows content scripts
- Check for JavaScript errors

#### Messages Not Saving
- Check background script communication
- Verify storage permissions
- Check for storage quota issues

#### CSS Conflicts
- Check for style inheritance issues
- Verify CSS isolation is working
- Test on different websites

## Automated Testing

### Running Node.js Tests
```bash
# Run unit tests
node run-tests.js

# Run specific test suite
node run-tests.js background
node run-tests.js message-input
```

### Continuous Integration
The extension can be tested in CI environments using:
- Puppeteer for browser automation
- Chrome headless mode
- Extension testing frameworks

## Test Results Interpretation

### Success Criteria
- All basic tests pass
- Integration tests show 100% success rate
- No console errors during normal operation
- Smooth animations and interactions
- Proper cleanup on page navigation

### Performance Benchmarks
- Sidebar injection: < 100ms
- Message sending: < 200ms
- Storage operations: < 50ms
- Memory usage: < 10MB for normal usage

## Reporting Issues

When reporting issues, include:
1. Chrome version
2. Operating system
3. Website where issue occurred
4. Console error messages
5. Steps to reproduce
6. Expected vs actual behavior

## Contributing Tests

When adding new features, include:
1. Unit tests for core logic
2. Integration tests for user workflows
3. Browser compatibility tests
4. Performance benchmarks
5. Documentation updates

---

For more detailed testing information, see the individual test files:
- `browser-tests.js` - Basic functionality tests
- `test-integration.js` - Comprehensive integration tests
- `test-websites.js` - Website compatibility tests
- `run-tests.js` - Node.js unit tests