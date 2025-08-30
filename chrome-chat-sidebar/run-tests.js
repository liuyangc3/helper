// Simple test runner for Chrome extension tests
// Run with: node run-tests.js [test-name]
// Examples:
//   node run-tests.js background
//   node run-tests.js message-input
//   node run-tests.js (runs all tests)

const path = require('path');
const fs = require('fs');

// Get test name from command line argument
const testName = process.argv[2];

// Available test files
const testFiles = {
  'background': './tests/background.test.js',
  'message-input': './tests/message-input.test.js',
  'message-display': './tests/message-display.test.js'
};

function runTest(testFile, testDisplayName) {
  console.log(`\n=== ${testDisplayName} Tests ===`);
  
  try {
    if (fs.existsSync(testFile)) {
      require(testFile);
      console.log(`✓ ${testDisplayName} tests completed successfully`);
      return true;
    } else {
      console.log(`⚠ ${testDisplayName} test file not found: ${testFile}`);
      return false;
    }
  } catch (error) {
    console.error(`✗ ${testDisplayName} tests failed:`, error.message);
    return false;
  }
}

function runAllTests() {
  console.log('Running all available tests...');
  let passedTests = 0;
  let totalTests = 0;
  
  for (const [name, file] of Object.entries(testFiles)) {
    totalTests++;
    const displayName = name.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    if (runTest(file, displayName)) {
      passedTests++;
    }
  }
  
  console.log(`\n=== Test Summary ===`);
  console.log(`✓ ${passedTests}/${totalTests} test suites passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠ Some tests failed or were not found');
  }
}

function runSpecificTest(testName) {
  if (testFiles[testName]) {
    const displayName = testName.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    const success = runTest(testFiles[testName], displayName);
    
    console.log(`\n=== Test Summary ===`);
    if (success) {
      console.log(`✓ ${displayName} tests completed successfully`);
    } else {
      console.log(`✗ ${displayName} tests failed`);
    }
  } else {
    console.log(`Unknown test: ${testName}`);
    console.log('Available tests:', Object.keys(testFiles).join(', '));
  }
}

// Main execution
if (testName) {
  runSpecificTest(testName);
} else {
  runAllTests();
}

console.log('\nNote: For complete testing, use a proper test framework like Jest or Mocha');
console.log('These tests verify the core extension logic works correctly.');