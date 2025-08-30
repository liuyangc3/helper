// Test file for message input functionality
// This file tests the message input component and its event handling

// Simple test framework functions
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, but got ${actual}`);
  }
}

function runTest(testName, testFunction) {
  try {
    testFunction();
    console.log(`✓ ${testName}`);
    return true;
  } catch (error) {
    console.log(`✗ ${testName}: ${error.message}`);
    return false;
  }
}

// Test suite
let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  if (runTest(name, fn)) {
    passedTests++;
  }
}

// Mock functions that would be available in the content script context
function validateMessage(message) {
  if (!message || typeof message !== 'string') {
    return false;
  }
  
  const trimmed = message.trim();
  
  if (trimmed.length === 0) {
    return false;
  }
  
  if (trimmed.length > 2000) {
    return false;
  }
  
  if (!/\S/.test(trimmed)) {
    return false;
  }
  
  return true;
}

function sanitizeMessage(message) {
  if (!message || typeof message !== 'string') {
    return '';
  }
  
  let sanitized = message.trim();
  
  sanitized = sanitized
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
  
  sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');
  
  return sanitized;
}

function autoResizeTextarea(textarea) {
  if (!textarea) return;
  
  textarea.style.height = 'auto';
  
  const minHeight = 36;
  const maxHeight = 120;
  const scrollHeight = textarea.scrollHeight;
  
  const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
  textarea.style.height = newHeight + 'px';
  
  if (scrollHeight > maxHeight) {
    textarea.style.overflowY = 'auto';
  } else {
    textarea.style.overflowY = 'hidden';
  }
}

// Test cases
console.log('Running Message Input Tests...\n');

// Message Validation Tests
test('should validate non-empty messages', () => {
  assert(validateMessage('Hello world') === true);
  assert(validateMessage('Test message with numbers 123') === true);
  assert(validateMessage('Multi\nline\nmessage') === true);
});

test('should reject empty or invalid messages', () => {
  assert(validateMessage('') === false);
  assert(validateMessage('   ') === false);
  assert(validateMessage(null) === false);
  assert(validateMessage(undefined) === false);
  assert(validateMessage('   \n\n   ') === false);
});

test('should reject messages that are too long', () => {
  const longMessage = 'a'.repeat(2001);
  assert(validateMessage(longMessage) === false);
  
  const maxLengthMessage = 'a'.repeat(2000);
  assert(validateMessage(maxLengthMessage) === true);
});

// Message Sanitization Tests
test('should sanitize HTML characters', () => {
  assertEqual(sanitizeMessage('<script>alert("xss")</script>'), '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
  assertEqual(sanitizeMessage('Hello <b>world</b>'), 'Hello &lt;b&gt;world&lt;&#x2F;b&gt;');
  assertEqual(sanitizeMessage('Test "quotes" and \'apostrophes\''), 'Test &quot;quotes&quot; and &#x27;apostrophes&#x27;');
});

test('should normalize line breaks', () => {
  assertEqual(sanitizeMessage('Line1\r\nLine2\rLine3\nLine4'), 'Line1\nLine2\nLine3\nLine4');
  assertEqual(sanitizeMessage('Too\n\n\n\n\nmany\nbreaks'), 'Too\n\nmany\nbreaks');
});

test('should handle edge cases', () => {
  assertEqual(sanitizeMessage(''), '');
  assertEqual(sanitizeMessage(null), '');
  assertEqual(sanitizeMessage(undefined), '');
  assertEqual(sanitizeMessage('   trimmed   '), 'trimmed');
});

// Auto-resize Functionality Tests
test('should resize textarea based on content', () => {
  const mockTextarea = {
    style: { height: 'auto', overflowY: 'hidden' },
    scrollHeight: 72
  };

  autoResizeTextarea(mockTextarea);

  assertEqual(mockTextarea.style.height, '72px');
  assertEqual(mockTextarea.style.overflowY, 'hidden');
});

test('should respect minimum height', () => {
  const mockTextarea = {
    style: { height: 'auto', overflowY: 'hidden' },
    scrollHeight: 20 // Less than minimum
  };

  autoResizeTextarea(mockTextarea);

  assertEqual(mockTextarea.style.height, '36px'); // Minimum height
});

test('should respect maximum height and enable scrolling', () => {
  const mockTextarea = {
    style: { height: 'auto', overflowY: 'hidden' },
    scrollHeight: 150 // More than maximum
  };

  autoResizeTextarea(mockTextarea);

  assertEqual(mockTextarea.style.height, '120px'); // Maximum height
  assertEqual(mockTextarea.style.overflowY, 'auto');
});

// Summary
console.log(`\nMessage Input Tests Summary:`);
console.log(`✓ ${passedTests}/${totalTests} tests passed`);

if (passedTests === totalTests) {
  console.log('🎉 All message input tests passed!');
} else {
  console.log('⚠ Some message input tests failed');
}