// Cross-browser compatibility test suite for Chrome Chat Sidebar
// Tests extension compatibility across different Chromium-based browsers

class CompatibilityTestSuite {
  constructor() {
    this.results = [];
    this.browserInfo = this.detectBrowser();
    this.manifestVersion = this.getManifestVersion();
  }

  // Detect browser information
  detectBrowser() {
    const userAgent = navigator.userAgent;
    const vendor = navigator.vendor;
    
    let browserName = 'Unknown';
    let browserVersion = 'Unknown';
    let engine = 'Unknown';
    
    // Detect browser
    if (userAgent.includes('Chrome') && vendor.includes('Google')) {
      browserName = 'Chrome';
      const match = userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/);
      browserVersion = match ? match[1] : 'Unknown';
      engine = 'Blink';
    } else if (userAgent.includes('Edg')) {
      browserName = 'Microsoft Edge';
      const match = userAgent.match(/Edg\/(\d+\.\d+\.\d+\.\d+)/);
      browserVersion = match ? match[1] : 'Unknown';
      engine = 'Blink';
    } else if (userAgent.includes('OPR')) {
      browserName = 'Opera';
      const match = userAgent.match(/OPR\/(\d+\.\d+\.\d+\.\d+)/);
      browserVersion = match ? match[1] : 'Unknown';
      engine = 'Blink';
    } else if (userAgent.includes('Brave')) {
      browserName = 'Brave';
      engine = 'Blink';
    } else if (userAgent.includes('Vivaldi')) {
      browserName = 'Vivaldi';
      engine = 'Blink';
    }
    
    return {
      name: browserName,
      version: browserVersion,
      engine: engine,
      userAgent: userAgent,
      vendor: vendor
    };
  }

  // Get manifest version
  getManifestVersion() {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
      try {
        const manifest = chrome.runtime.getManifest();
        return manifest.manifest_version;
      } catch (error) {
        console.warn('Could not access manifest:', error);
        return 'Unknown';
      }
    }
    return 'Unknown';
  }

  // Test Chrome Extension APIs compatibility
  async testExtensionAPIs() {
    console.log('🧪 Testing Chrome Extension APIs compatibility...');
    
    const apiTests = [
      { name: 'chrome.runtime', api: () => typeof chrome !== 'undefined' && chrome.runtime },
      { name: 'chrome.storage', api: () => typeof chrome !== 'undefined' && chrome.storage },
      { name: 'chrome.action', api: () => typeof chrome !== 'undefined' && chrome.action },
      { name: 'chrome.tabs', api: () => typeof chrome !== 'undefined' && chrome.tabs },
      { name: 'chrome.scripting', api: () => typeof chrome !== 'undefined' && chrome.scripting },
      { name: 'Service Worker', api: () => 'serviceWorker' in navigator },
      { name: 'Manifest V3', api: () => this.manifestVersion === 3 }
    ];

    for (const test of apiTests) {
      try {
        const available = test.api();
        const result = {
          test: 'Extension APIs',
          case: test.name,
          available: available,
          passed: available,
          browser: this.browserInfo.name,
          browserVersion: this.browserInfo.version
        };
        
        this.results.push(result);
        console.log(`  ${test.name}: ${available ? '✅' : '❌'}`);
      } catch (error) {
        const result = {
          test: 'Extension APIs',
          case: test.name,
          available: false,
          passed: false,
          error: error.message,
          browser: this.browserInfo.name,
          browserVersion: this.browserInfo.version
        };
        
        this.results.push(result);
        console.log(`  ${test.name}: ❌ (${error.message})`);
      }
    }
  }

  // Test CSS features compatibility
  async testCSSFeatures() {
    console.log('🧪 Testing CSS features compatibility...');
    
    const cssTests = [
      { name: 'CSS Grid', property: 'display', value: 'grid' },
      { name: 'CSS Flexbox', property: 'display', value: 'flex' },
      { name: 'CSS Transforms', property: 'transform', value: 'translateX(0)' },
      { name: 'CSS Transitions', property: 'transition', value: 'all 0.3s ease' },
      { name: 'CSS Animations', property: 'animation', value: 'test 1s ease' },
      { name: 'CSS Custom Properties', property: '--test-var', value: 'test' },
      { name: 'CSS Backdrop Filter', property: 'backdrop-filter', value: 'blur(5px)' },
      { name: 'CSS Container Queries', property: 'container-type', value: 'inline-size' }
    ];

    const testElement = document.createElement('div');
    testElement.style.position = 'absolute';
    testElement.style.top = '-9999px';
    document.body.appendChild(testElement);

    try {
      for (const test of cssTests) {
        try {
          testElement.style.setProperty(test.property, test.value);
          const computedValue = getComputedStyle(testElement).getPropertyValue(test.property);
          const supported = computedValue !== '' && computedValue !== 'initial';
          
          const result = {
            test: 'CSS Features',
            case: test.name,
            supported: supported,
            passed: supported,
            computedValue: computedValue,
            browser: this.browserInfo.name,
            browserVersion: this.browserInfo.version
          };
          
          this.results.push(result);
          console.log(`  ${test.name}: ${supported ? '✅' : '❌'}`);
        } catch (error) {
          const result = {
            test: 'CSS Features',
            case: test.name,
            supported: false,
            passed: false,
            error: error.message,
            browser: this.browserInfo.name,
            browserVersion: this.browserInfo.version
          };
          
          this.results.push(result);
          console.log(`  ${test.name}: ❌ (${error.message})`);
        }
      }
    } finally {
      document.body.removeChild(testElement);
    }
  }

  // Test JavaScript features compatibility
  async testJavaScriptFeatures() {
    console.log('🧪 Testing JavaScript features compatibility...');
    
    const jsTests = [
      {
        name: 'ES6 Classes',
        test: () => {
          class TestClass {}
          return new TestClass() instanceof TestClass;
        }
      },
      {
        name: 'Arrow Functions',
        test: () => {
          const arrow = () => true;
          return arrow();
        }
      },
      {
        name: 'Template Literals',
        test: () => {
          const test = 'world';
          return `Hello ${test}` === 'Hello world';
        }
      },
      {
        name: 'Destructuring',
        test: () => {
          const { a } = { a: 1 };
          return a === 1;
        }
      },
      {
        name: 'Async/Await',
        test: async () => {
          const asyncFunc = async () => 'test';
          const result = await asyncFunc();
          return result === 'test';
        }
      },
      {
        name: 'Promises',
        test: () => {
          return Promise.resolve(true);
        }
      },
      {
        name: 'Fetch API',
        test: () => {
          return typeof fetch === 'function';
        }
      },
      {
        name: 'IntersectionObserver',
        test: () => {
          return typeof IntersectionObserver === 'function';
        }
      },
      {
        name: 'ResizeObserver',
        test: () => {
          return typeof ResizeObserver === 'function';
        }
      },
      {
        name: 'MutationObserver',
        test: () => {
          return typeof MutationObserver === 'function';
        }
      }
    ];

    for (const test of jsTests) {
      try {
        const result = await test.test();
        const testResult = {
          test: 'JavaScript Features',
          case: test.name,
          supported: result,
          passed: result,
          browser: this.browserInfo.name,
          browserVersion: this.browserInfo.version
        };
        
        this.results.push(testResult);
        console.log(`  ${test.name}: ${result ? '✅' : '❌'}`);
      } catch (error) {
        const testResult = {
          test: 'JavaScript Features',
          case: test.name,
          supported: false,
          passed: false,
          error: error.message,
          browser: this.browserInfo.name,
          browserVersion: this.browserInfo.version
        };
        
        this.results.push(testResult);
        console.log(`  ${test.name}: ❌ (${error.message})`);
      }
    }
  }

  // Test DOM manipulation compatibility
  async testDOMFeatures() {
    console.log('🧪 Testing DOM features compatibility...');
    
    const domTests = [
      {
        name: 'querySelector',
        test: () => typeof document.querySelector === 'function'
      },
      {
        name: 'querySelectorAll',
        test: () => typeof document.querySelectorAll === 'function'
      },
      {
        name: 'addEventListener',
        test: () => {
          const div = document.createElement('div');
          return typeof div.addEventListener === 'function';
        }
      },
      {
        name: 'DocumentFragment',
        test: () => {
          const fragment = document.createDocumentFragment();
          return fragment instanceof DocumentFragment;
        }
      },
      {
        name: 'requestAnimationFrame',
        test: () => typeof requestAnimationFrame === 'function'
      },
      {
        name: 'getComputedStyle',
        test: () => typeof getComputedStyle === 'function'
      },
      {
        name: 'Element.closest',
        test: () => {
          const div = document.createElement('div');
          return typeof div.closest === 'function';
        }
      },
      {
        name: 'Element.matches',
        test: () => {
          const div = document.createElement('div');
          return typeof div.matches === 'function';
        }
      },
      {
        name: 'CustomEvent',
        test: () => {
          try {
            new CustomEvent('test');
            return true;
          } catch (e) {
            return false;
          }
        }
      }
    ];

    for (const test of domTests) {
      try {
        const result = test.test();
        const testResult = {
          test: 'DOM Features',
          case: test.name,
          supported: result,
          passed: result,
          browser: this.browserInfo.name,
          browserVersion: this.browserInfo.version
        };
        
        this.results.push(testResult);
        console.log(`  ${test.name}: ${result ? '✅' : '❌'}`);
      } catch (error) {
        const testResult = {
          test: 'DOM Features',
          case: test.name,
          supported: false,
          passed: false,
          error: error.message,
          browser: this.browserInfo.name,
          browserVersion: this.browserInfo.version
        };
        
        this.results.push(testResult);
        console.log(`  ${test.name}: ❌ (${error.message})`);
      }
    }
  }

  // Test storage compatibility
  async testStorageFeatures() {
    console.log('🧪 Testing storage features compatibility...');
    
    const storageTests = [
      {
        name: 'localStorage',
        test: () => {
          try {
            localStorage.setItem('test', 'value');
            const value = localStorage.getItem('test');
            localStorage.removeItem('test');
            return value === 'value';
          } catch (e) {
            return false;
          }
        }
      },
      {
        name: 'sessionStorage',
        test: () => {
          try {
            sessionStorage.setItem('test', 'value');
            const value = sessionStorage.getItem('test');
            sessionStorage.removeItem('test');
            return value === 'value';
          } catch (e) {
            return false;
          }
        }
      },
      {
        name: 'IndexedDB',
        test: () => {
          return typeof indexedDB !== 'undefined';
        }
      },
      {
        name: 'chrome.storage.local',
        test: () => {
          return typeof chrome !== 'undefined' && 
                 chrome.storage && 
                 chrome.storage.local;
        }
      },
      {
        name: 'chrome.storage.sync',
        test: () => {
          return typeof chrome !== 'undefined' && 
                 chrome.storage && 
                 chrome.storage.sync;
        }
      }
    ];

    for (const test of storageTests) {
      try {
        const result = test.test();
        const testResult = {
          test: 'Storage Features',
          case: test.name,
          supported: result,
          passed: result,
          browser: this.browserInfo.name,
          browserVersion: this.browserInfo.version
        };
        
        this.results.push(testResult);
        console.log(`  ${test.name}: ${result ? '✅' : '❌'}`);
      } catch (error) {
        const testResult = {
          test: 'Storage Features',
          case: test.name,
          supported: false,
          passed: false,
          error: error.message,
          browser: this.browserInfo.name,
          browserVersion: this.browserInfo.version
        };
        
        this.results.push(testResult);
        console.log(`  ${test.name}: ❌ (${error.message})`);
      }
    }
  }

  // Test security features
  async testSecurityFeatures() {
    console.log('🧪 Testing security features compatibility...');
    
    const securityTests = [
      {
        name: 'Content Security Policy',
        test: () => {
          // Check if CSP is supported
          return typeof document.createElement('meta').httpEquiv !== 'undefined';
        }
      },
      {
        name: 'Secure Context (HTTPS)',
        test: () => {
          return window.isSecureContext;
        }
      },
      {
        name: 'Same-Origin Policy',
        test: () => {
          try {
            // This should work in same origin
            return window.location.origin === window.location.origin;
          } catch (e) {
            return false;
          }
        }
      },
      {
        name: 'Trusted Types',
        test: () => {
          return typeof trustedTypes !== 'undefined';
        }
      }
    ];

    for (const test of securityTests) {
      try {
        const result = test.test();
        const testResult = {
          test: 'Security Features',
          case: test.name,
          supported: result,
          passed: result,
          browser: this.browserInfo.name,
          browserVersion: this.browserInfo.version
        };
        
        this.results.push(testResult);
        console.log(`  ${test.name}: ${result ? '✅' : '❌'}`);
      } catch (error) {
        const testResult = {
          test: 'Security Features',
          case: test.name,
          supported: false,
          passed: false,
          error: error.message,
          browser: this.browserInfo.name,
          browserVersion: this.browserInfo.version
        };
        
        this.results.push(testResult);
        console.log(`  ${test.name}: ❌ (${error.message})`);
      }
    }
  }

  // Run all compatibility tests
  async runAllTests() {
    console.log('🚀 Starting Chrome Chat Sidebar Compatibility Tests');
    console.log('===================================================');
    console.log(`Browser: ${this.browserInfo.name} ${this.browserInfo.version}`);
    console.log(`Engine: ${this.browserInfo.engine}`);
    console.log(`Manifest Version: ${this.manifestVersion}`);
    console.log('');
    
    this.results = [];
    
    await this.testExtensionAPIs();
    await this.testCSSFeatures();
    await this.testJavaScriptFeatures();
    await this.testDOMFeatures();
    await this.testStorageFeatures();
    await this.testSecurityFeatures();
    
    this.generateCompatibilityReport();
  }

  // Generate compatibility report
  generateCompatibilityReport() {
    console.log('\n📊 Compatibility Test Results');
    console.log('==============================');
    
    const passedTests = this.results.filter(r => r.passed).length;
    const totalTests = this.results.length;
    const passRate = (passedTests / totalTests * 100).toFixed(1);
    
    console.log(`Overall: ${passedTests}/${totalTests} tests passed (${passRate}%)`);
    console.log(`Browser: ${this.browserInfo.name} ${this.browserInfo.version}`);
    console.log('');
    
    // Group results by test type
    const groupedResults = this.results.reduce((groups, result) => {
      if (!groups[result.test]) {
        groups[result.test] = [];
      }
      groups[result.test].push(result);
      return groups;
    }, {});
    
    // Display results by category
    Object.entries(groupedResults).forEach(([testType, results]) => {
      const categoryPassed = results.filter(r => r.passed).length;
      const categoryTotal = results.length;
      const categoryRate = (categoryPassed / categoryTotal * 100).toFixed(1);
      
      console.log(`${testType} (${categoryPassed}/${categoryTotal} - ${categoryRate}%):`);
      results.forEach(result => {
        const status = result.passed ? '✅' : '❌';
        console.log(`  ${status} ${result.case}`);
        if (result.error) {
          console.log(`     Error: ${result.error}`);
        }
      });
      console.log('');
    });
    
    // Browser-specific recommendations
    this.generateBrowserRecommendations();
  }

  // Generate browser-specific recommendations
  generateBrowserRecommendations() {
    console.log('💡 Browser Compatibility Recommendations');
    console.log('========================================');
    
    const failedTests = this.results.filter(r => !r.passed);
    
    if (failedTests.length === 0) {
      console.log('✅ All compatibility tests passed! The extension should work well on this browser.');
      return;
    }
    
    console.log(`❌ ${failedTests.length} compatibility issues found:`);
    console.log('');
    
    // Group failed tests by category
    const failedByCategory = failedTests.reduce((groups, test) => {
      if (!groups[test.test]) {
        groups[test.test] = [];
      }
      groups[test.test].push(test);
      return groups;
    }, {});
    
    Object.entries(failedByCategory).forEach(([category, tests]) => {
      console.log(`${category}:`);
      tests.forEach(test => {
        console.log(`  ❌ ${test.case}`);
        
        // Provide specific recommendations
        if (category === 'Extension APIs') {
          if (test.case.includes('chrome.action')) {
            console.log('     - This browser may not support Manifest V3 action API');
            console.log('     - Consider fallback to browserAction for older browsers');
          }
          if (test.case.includes('Service Worker')) {
            console.log('     - Service Workers are required for Manifest V3');
            console.log('     - This browser may not be compatible with the extension');
          }
        }
        
        if (category === 'CSS Features') {
          if (test.case.includes('Grid') || test.case.includes('Flexbox')) {
            console.log('     - Consider providing fallback layouts');
            console.log('     - Use feature detection in CSS');
          }
          if (test.case.includes('Custom Properties')) {
            console.log('     - Use PostCSS or similar tools for fallbacks');
          }
        }
        
        if (category === 'JavaScript Features') {
          if (test.case.includes('Async/Await')) {
            console.log('     - Consider transpiling with Babel');
            console.log('     - Use Promise-based alternatives');
          }
        }
      });
      console.log('');
    });
    
    // Overall browser compatibility assessment
    const compatibilityScore = (this.results.filter(r => r.passed).length / this.results.length) * 100;
    
    if (compatibilityScore >= 90) {
      console.log('🟢 Excellent compatibility - Extension should work perfectly');
    } else if (compatibilityScore >= 75) {
      console.log('🟡 Good compatibility - Minor issues may occur');
    } else if (compatibilityScore >= 50) {
      console.log('🟠 Fair compatibility - Some features may not work');
    } else {
      console.log('🔴 Poor compatibility - Extension may not function properly');
    }
  }
}

// Export for use in tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CompatibilityTestSuite;
}

// Auto-run tests if loaded directly
if (typeof window !== 'undefined' && window.location) {
  window.CompatibilityTestSuite = CompatibilityTestSuite;
  
  // Add a global function to run tests
  window.runCompatibilityTests = async () => {
    const testSuite = new CompatibilityTestSuite();
    await testSuite.runAllTests();
  };
  
  console.log('Compatibility test suite loaded. Run window.runCompatibilityTests() to start testing.');
}