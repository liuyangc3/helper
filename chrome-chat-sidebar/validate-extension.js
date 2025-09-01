// Extension validation script
// Validates that the Chrome Chat Sidebar extension is properly configured and functional

class ExtensionValidator {
  constructor() {
    this.validationResults = [];
    this.criticalIssues = [];
    this.warnings = [];
  }

  // Validate manifest.json
  async validateManifest() {
    console.log('🔍 Validating manifest.json...');
    
    try {
      const response = await fetch('manifest.json');
      const manifest = await response.json();
      
      // Check manifest version
      if (manifest.manifest_version !== 3) {
        this.criticalIssues.push('Manifest version must be 3 for modern Chrome extensions');
      } else {
        this.addValidationResult('Manifest Version', 'Manifest V3 ✅', true);
      }
      
      // Check required fields
      const requiredFields = ['name', 'version', 'description'];
      requiredFields.forEach(field => {
        if (manifest[field]) {
          this.addValidationResult('Manifest Fields', `${field}: ${manifest[field]} ✅`, true);
        } else {
          this.criticalIssues.push(`Missing required field: ${field}`);
        }
      });
      
      // Check permissions
      if (manifest.permissions && manifest.permissions.includes('storage')) {
        this.addValidationResult('Permissions', 'Storage permission ✅', true);
      } else {
        this.criticalIssues.push('Missing storage permission');
      }
      
      // Check background script
      if (manifest.background && manifest.background.service_worker) {
        this.addValidationResult('Background Script', 'Service worker configured ✅', true);
      } else {
        this.criticalIssues.push('Missing service worker configuration');
      }
      
      // Check content scripts
      if (manifest.content_scripts && manifest.content_scripts.length > 0) {
        this.addValidationResult('Content Scripts', 'Content scripts configured ✅', true);
      } else {
        this.criticalIssues.push('Missing content scripts');
      }
      
      // Check action (extension icon)
      if (manifest.action) {
        this.addValidationResult('Extension Action', 'Action configured ✅', true);
      } else {
        this.warnings.push('No action configured - users cannot interact with extension');
      }
      
      // Check icons
      if (manifest.icons) {
        const iconSizes = Object.keys(manifest.icons);
        if (iconSizes.includes('16') && iconSizes.includes('48') && iconSizes.includes('128')) {
          this.addValidationResult('Icons', 'All required icon sizes present ✅', true);
        } else {
          this.warnings.push('Missing recommended icon sizes (16, 48, 128)');
        }
      } else {
        this.warnings.push('No icons specified');
      }
      
    } catch (error) {
      this.criticalIssues.push(`Failed to load manifest.json: ${error.message}`);
    }
  }

  // Validate file structure
  async validateFileStructure() {
    console.log('🔍 Validating file structure...');
    
    const requiredFiles = [
      'background.js',
      'content.js',
      'styles/sidebar.css'
    ];
    
    const testFiles = [
      'performance-tests.js',
      'compatibility-tests.js',
      'integration-tests.js',
      'run-all-tests.js',
      'test-runner.html'
    ];
    
    // Check required files
    for (const file of requiredFiles) {
      try {
        const response = await fetch(file);
        if (response.ok) {
          this.addValidationResult('File Structure', `${file} ✅`, true);
        } else {
          this.criticalIssues.push(`Missing required file: ${file}`);
        }
      } catch (error) {
        this.criticalIssues.push(`Cannot access required file: ${file}`);
      }
    }
    
    // Check test files
    for (const file of testFiles) {
      try {
        const response = await fetch(file);
        if (response.ok) {
          this.addValidationResult('Test Files', `${file} ✅`, true);
        } else {
          this.warnings.push(`Missing test file: ${file}`);
        }
      } catch (error) {
        this.warnings.push(`Cannot access test file: ${file}`);
      }
    }
  }

  // Validate Chrome APIs availability
  validateChromeAPIs() {
    console.log('🔍 Validating Chrome APIs...');
    
    const requiredAPIs = [
      { name: 'chrome.runtime', api: () => typeof chrome !== 'undefined' && chrome.runtime },
      { name: 'chrome.storage', api: () => typeof chrome !== 'undefined' && chrome.storage },
      { name: 'chrome.action', api: () => typeof chrome !== 'undefined' && chrome.action },
      { name: 'chrome.tabs', api: () => typeof chrome !== 'undefined' && chrome.tabs }
    ];
    
    requiredAPIs.forEach(({ name, api }) => {
      try {
        if (api()) {
          this.addValidationResult('Chrome APIs', `${name} ✅`, true);
        } else {
          this.criticalIssues.push(`${name} API not available`);
        }
      } catch (error) {
        this.criticalIssues.push(`Error checking ${name}: ${error.message}`);
      }
    });
  }

  // Validate browser compatibility
  validateBrowserCompatibility() {
    console.log('🔍 Validating browser compatibility...');
    
    const userAgent = navigator.userAgent;
    const isChrome = userAgent.includes('Chrome');
    const isEdge = userAgent.includes('Edg');
    const isOpera = userAgent.includes('OPR');
    const isBrave = userAgent.includes('Brave');
    
    if (isChrome || isEdge || isOpera || isBrave) {
      this.addValidationResult('Browser Compatibility', 'Chromium-based browser detected ✅', true);
      
      // Check Chrome version
      const chromeMatch = userAgent.match(/Chrome\/(\d+)/);
      if (chromeMatch) {
        const chromeVersion = parseInt(chromeMatch[1]);
        if (chromeVersion >= 88) {
          this.addValidationResult('Browser Version', `Chrome ${chromeVersion} (Manifest V3 supported) ✅`, true);
        } else {
          this.criticalIssues.push(`Chrome version ${chromeVersion} is too old for Manifest V3`);
        }
      }
    } else {
      this.criticalIssues.push('Extension requires a Chromium-based browser');
    }
  }

  // Validate JavaScript features
  validateJavaScriptFeatures() {
    console.log('🔍 Validating JavaScript features...');
    
    const features = [
      {
        name: 'ES6 Classes',
        test: () => {
          class TestClass {}
          return new TestClass() instanceof TestClass;
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
      }
    ];
    
    features.forEach(({ name, test }) => {
      try {
        const result = test();
        if (result instanceof Promise) {
          result.then(res => {
            if (res) {
              this.addValidationResult('JavaScript Features', `${name} ✅`, true);
            } else {
              this.warnings.push(`${name} not working properly`);
            }
          });
        } else if (result) {
          this.addValidationResult('JavaScript Features', `${name} ✅`, true);
        } else {
          this.warnings.push(`${name} not working properly`);
        }
      } catch (error) {
        this.warnings.push(`${name} not supported: ${error.message}`);
      }
    });
  }

  // Validate CSS features
  validateCSSFeatures() {
    console.log('🔍 Validating CSS features...');
    
    const testElement = document.createElement('div');
    testElement.style.position = 'absolute';
    testElement.style.top = '-9999px';
    document.body.appendChild(testElement);
    
    try {
      const cssFeatures = [
        { name: 'CSS Grid', property: 'display', value: 'grid' },
        { name: 'CSS Flexbox', property: 'display', value: 'flex' },
        { name: 'CSS Transforms', property: 'transform', value: 'translateX(0)' },
        { name: 'CSS Transitions', property: 'transition', value: 'all 0.3s ease' },
        { name: 'CSS Custom Properties', property: '--test-var', value: 'test' }
      ];
      
      cssFeatures.forEach(({ name, property, value }) => {
        try {
          testElement.style.setProperty(property, value);
          const computedValue = getComputedStyle(testElement).getPropertyValue(property);
          const supported = computedValue !== '' && computedValue !== 'initial';
          
          if (supported) {
            this.addValidationResult('CSS Features', `${name} ✅`, true);
          } else {
            this.warnings.push(`${name} not supported`);
          }
        } catch (error) {
          this.warnings.push(`${name} test failed: ${error.message}`);
        }
      });
    } finally {
      document.body.removeChild(testElement);
    }
  }

  // Validate performance requirements
  validatePerformanceRequirements() {
    console.log('🔍 Validating performance requirements...');
    
    // Check memory usage
    if (performance.memory) {
      const memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
      if (memoryUsage < 50) {
        this.addValidationResult('Performance', `Memory usage: ${memoryUsage.toFixed(2)}MB ✅`, true);
      } else {
        this.warnings.push(`High memory usage: ${memoryUsage.toFixed(2)}MB`);
      }
    }
    
    // Check for performance APIs
    const performanceAPIs = [
      'requestAnimationFrame',
      'performance.now',
      'IntersectionObserver',
      'ResizeObserver'
    ];
    
    performanceAPIs.forEach(api => {
      const parts = api.split('.');
      let obj = window;
      let exists = true;
      
      for (const part of parts) {
        if (obj && typeof obj[part] !== 'undefined') {
          obj = obj[part];
        } else {
          exists = false;
          break;
        }
      }
      
      if (exists) {
        this.addValidationResult('Performance APIs', `${api} ✅`, true);
      } else {
        this.warnings.push(`${api} not available`);
      }
    });
  }

  // Add validation result
  addValidationResult(category, message, passed) {
    this.validationResults.push({
      category,
      message,
      passed,
      timestamp: Date.now()
    });
  }

  // Run all validations
  async runAllValidations() {
    console.log('🚀 Starting Extension Validation');
    console.log('================================');
    
    await this.validateManifest();
    await this.validateFileStructure();
    this.validateChromeAPIs();
    this.validateBrowserCompatibility();
    this.validateJavaScriptFeatures();
    this.validateCSSFeatures();
    this.validatePerformanceRequirements();
    
    this.generateValidationReport();
  }

  // Generate validation report
  generateValidationReport() {
    console.log('\n📊 EXTENSION VALIDATION REPORT');
    console.log('===============================');
    
    const totalChecks = this.validationResults.length;
    const passedChecks = this.validationResults.filter(r => r.passed).length;
    const passRate = totalChecks > 0 ? ((passedChecks / totalChecks) * 100).toFixed(1) : '0.0';
    
    console.log(`Overall: ${passedChecks}/${totalChecks} checks passed (${passRate}%)`);
    console.log('');
    
    // Group results by category
    const groupedResults = this.validationResults.reduce((groups, result) => {
      if (!groups[result.category]) {
        groups[result.category] = [];
      }
      groups[result.category].push(result);
      return groups;
    }, {});
    
    // Display results by category
    Object.entries(groupedResults).forEach(([category, results]) => {
      console.log(`${category}:`);
      results.forEach(result => {
        console.log(`  ${result.message}`);
      });
      console.log('');
    });
    
    // Display critical issues
    if (this.criticalIssues.length > 0) {
      console.log('🔴 CRITICAL ISSUES:');
      this.criticalIssues.forEach(issue => {
        console.log(`  ❌ ${issue}`);
      });
      console.log('');
    }
    
    // Display warnings
    if (this.warnings.length > 0) {
      console.log('🟡 WARNINGS:');
      this.warnings.forEach(warning => {
        console.log(`  ⚠️ ${warning}`);
      });
      console.log('');
    }
    
    // Final assessment
    if (this.criticalIssues.length === 0) {
      if (this.warnings.length === 0) {
        console.log('🟢 VALIDATION PASSED: Extension is ready for use!');
      } else {
        console.log('🟡 VALIDATION PASSED WITH WARNINGS: Extension should work but has minor issues.');
      }
    } else {
      console.log('🔴 VALIDATION FAILED: Critical issues must be fixed before using the extension.');
    }
    
    return {
      passed: this.criticalIssues.length === 0,
      passRate: parseFloat(passRate),
      criticalIssues: this.criticalIssues.length,
      warnings: this.warnings.length,
      totalChecks: totalChecks
    };
  }
}

// Export for use in tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExtensionValidator;
}

// Browser environment setup
if (typeof window !== 'undefined') {
  window.ExtensionValidator = ExtensionValidator;
  
  // Global function to run validation
  window.validateExtension = async () => {
    const validator = new ExtensionValidator();
    return await validator.runAllValidations();
  };
  
  console.log('Extension validator loaded. Run window.validateExtension() to start validation.');
}