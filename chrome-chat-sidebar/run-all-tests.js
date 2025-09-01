// Comprehensive test runner for Chrome Chat Sidebar
// Runs performance, compatibility, and integration tests

class ComprehensiveTestRunner {
  constructor() {
    this.allResults = {
      performance: [],
      compatibility: [],
      integration: [],
      unit: []
    };
    this.startTime = null;
    this.endTime = null;
  }

  // Load test suites dynamically
  async loadTestSuites() {
    const suites = {};
    
    try {
      // Load performance tests
      if (typeof PerformanceTestSuite !== 'undefined') {
        suites.performance = new PerformanceTestSuite();
      } else {
        console.warn('PerformanceTestSuite not available');
      }
      
      // Load compatibility tests
      if (typeof CompatibilityTestSuite !== 'undefined') {
        suites.compatibility = new CompatibilityTestSuite();
      } else {
        console.warn('CompatibilityTestSuite not available');
      }
      
      // Load integration tests
      if (typeof IntegrationTestSuite !== 'undefined') {
        suites.integration = new IntegrationTestSuite();
      } else {
        console.warn('IntegrationTestSuite not available');
      }
      
      return suites;
    } catch (error) {
      console.error('Error loading test suites:', error);
      return {};
    }
  }

  // Run unit tests (existing test files)
  async runUnitTests() {
    console.log('🧪 Running Unit Tests...');
    console.log('========================');
    
    const unitTestResults = [];
    
    try {
      // Check if existing test runner is available
      if (typeof window !== 'undefined' && window.runTests) {
        const results = await window.runTests();
        unitTestResults.push(...(results || []));
      } else {
        console.log('No unit test runner found, skipping unit tests');
      }
    } catch (error) {
      console.error('Error running unit tests:', error);
      unitTestResults.push({
        test: 'Unit Tests',
        case: 'Test Runner Error',
        passed: false,
        error: error.message
      });
    }
    
    this.allResults.unit = unitTestResults;
    return unitTestResults;
  }

  // Run all test suites
  async runAllTests(options = {}) {
    this.startTime = Date.now();
    
    console.log('🚀 Chrome Chat Sidebar - Comprehensive Test Suite');
    console.log('=================================================');
    console.log(`Started at: ${new Date().toLocaleString()}`);
    console.log('');
    
    const {
      runPerformance = true,
      runCompatibility = true,
      runIntegration = true,
      runUnit = true,
      generateReport = true
    } = options;
    
    // Load test suites
    const suites = await this.loadTestSuites();
    
    // Run unit tests first
    if (runUnit) {
      try {
        await this.runUnitTests();
      } catch (error) {
        console.error('Unit tests failed:', error);
      }
    }
    
    // Run compatibility tests
    if (runCompatibility && suites.compatibility) {
      try {
        await suites.compatibility.runAllTests();
        this.allResults.compatibility = suites.compatibility.results;
      } catch (error) {
        console.error('Compatibility tests failed:', error);
      }
    }
    
    // Run performance tests
    if (runPerformance && suites.performance) {
      try {
        await suites.performance.runAllTests();
        this.allResults.performance = suites.performance.results;
      } catch (error) {
        console.error('Performance tests failed:', error);
      }
    }
    
    // Run integration tests
    if (runIntegration && suites.integration) {
      try {
        await suites.integration.runAllTests();
        this.allResults.integration = suites.integration.results;
      } catch (error) {
        console.error('Integration tests failed:', error);
      }
    }
    
    this.endTime = Date.now();
    
    if (generateReport) {
      this.generateComprehensiveReport();
    }
    
    return this.allResults;
  }

  // Generate comprehensive test report
  generateComprehensiveReport() {
    console.log('\n📊 COMPREHENSIVE TEST REPORT');
    console.log('=============================');
    
    const duration = this.endTime - this.startTime;
    console.log(`Test Duration: ${(duration / 1000).toFixed(2)} seconds`);
    console.log(`Completed at: ${new Date(this.endTime).toLocaleString()}`);
    console.log('');
    
    // Calculate overall statistics
    const stats = this.calculateOverallStats();
    
    console.log('📈 OVERALL STATISTICS');
    console.log('====================');
    console.log(`Total Tests: ${stats.total}`);
    console.log(`Passed: ${stats.passed} (${stats.passRate}%)`);
    console.log(`Failed: ${stats.failed} (${stats.failRate}%)`);
    console.log('');
    
    // Display results by category
    Object.entries(this.allResults).forEach(([category, results]) => {
      if (results.length > 0) {
        this.displayCategoryResults(category, results);
      }
    });
    
    // Generate overall assessment
    this.generateOverallAssessment(stats);
    
    // Generate actionable recommendations
    this.generateActionableRecommendations();
    
    // Generate test summary for CI/CD
    this.generateCISummary(stats);
  }

  // Calculate overall statistics
  calculateOverallStats() {
    const allTests = [
      ...this.allResults.unit,
      ...this.allResults.compatibility,
      ...this.allResults.performance,
      ...this.allResults.integration
    ];
    
    const total = allTests.length;
    const passed = allTests.filter(test => test.passed).length;
    const failed = total - passed;
    
    return {
      total,
      passed,
      failed,
      passRate: total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0',
      failRate: total > 0 ? ((failed / total) * 100).toFixed(1) : '0.0'
    };
  }

  // Display results for a specific category
  displayCategoryResults(category, results) {
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    const rate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
    
    console.log(`📋 ${categoryName.toUpperCase()} TESTS (${passed}/${total} - ${rate}%)`);
    console.log('='.repeat(categoryName.length + 20));
    
    // Group by test type
    const grouped = results.reduce((groups, result) => {
      const testType = result.test || 'Unknown';
      if (!groups[testType]) {
        groups[testType] = [];
      }
      groups[testType].push(result);
      return groups;
    }, {});
    
    Object.entries(grouped).forEach(([testType, tests]) => {
      const testPassed = tests.filter(t => t.passed).length;
      const testTotal = tests.length;
      const testRate = testTotal > 0 ? ((testPassed / testTotal) * 100).toFixed(1) : '0.0';
      
      console.log(`\n${testType} (${testPassed}/${testTotal} - ${testRate}%):`);
      
      tests.forEach(test => {
        const status = test.passed ? '✅' : '❌';
        const caseName = test.case || test.name || 'Unknown Test';
        console.log(`  ${status} ${caseName}`);
        
        if (!test.passed && test.error) {
          console.log(`     Error: ${test.error}`);
        }
        
        // Show additional metrics for performance tests
        if (category === 'performance') {
          if (test.renderTime) {
            console.log(`     Render Time: ${test.renderTime.toFixed(2)}ms`);
          }
          if (test.frameRate) {
            console.log(`     Frame Rate: ${test.frameRate.toFixed(1)}fps`);
          }
          if (test.memoryUsage && test.memoryUsage.used !== 'N/A') {
            console.log(`     Memory: ${test.memoryUsage.used}MB`);
          }
        }
      });
    });
    
    console.log('');
  }

  // Generate overall assessment
  generateOverallAssessment(stats) {
    console.log('🎯 OVERALL ASSESSMENT');
    console.log('====================');
    
    const passRate = parseFloat(stats.passRate);
    
    let grade, status, recommendation;
    
    if (passRate >= 95) {
      grade = 'A+';
      status = '🟢 EXCELLENT';
      recommendation = 'Extension is production-ready with excellent quality.';
    } else if (passRate >= 90) {
      grade = 'A';
      status = '🟢 VERY GOOD';
      recommendation = 'Extension is production-ready with minor improvements needed.';
    } else if (passRate >= 80) {
      grade = 'B';
      status = '🟡 GOOD';
      recommendation = 'Extension is mostly ready but needs some improvements.';
    } else if (passRate >= 70) {
      grade = 'C';
      status = '🟠 FAIR';
      recommendation = 'Extension needs significant improvements before production.';
    } else if (passRate >= 60) {
      grade = 'D';
      status = '🔴 POOR';
      recommendation = 'Extension has major issues that must be addressed.';
    } else {
      grade = 'F';
      status = '🔴 FAILING';
      recommendation = 'Extension is not ready for use and requires major fixes.';
    }
    
    console.log(`Grade: ${grade}`);
    console.log(`Status: ${status}`);
    console.log(`Recommendation: ${recommendation}`);
    console.log('');
    
    // Detailed breakdown
    const categories = ['unit', 'compatibility', 'performance', 'integration'];
    categories.forEach(category => {
      const results = this.allResults[category];
      if (results.length > 0) {
        const categoryPassed = results.filter(r => r.passed).length;
        const categoryTotal = results.length;
        const categoryRate = ((categoryPassed / categoryTotal) * 100).toFixed(1);
        
        let categoryStatus;
        if (categoryRate >= 90) categoryStatus = '🟢';
        else if (categoryRate >= 75) categoryStatus = '🟡';
        else if (categoryRate >= 50) categoryStatus = '🟠';
        else categoryStatus = '🔴';
        
        console.log(`${categoryStatus} ${category.charAt(0).toUpperCase() + category.slice(1)}: ${categoryRate}%`);
      }
    });
    
    console.log('');
  }

  // Generate actionable recommendations
  generateActionableRecommendations() {
    console.log('💡 ACTIONABLE RECOMMENDATIONS');
    console.log('=============================');
    
    const failedTests = [
      ...this.allResults.unit,
      ...this.allResults.compatibility,
      ...this.allResults.performance,
      ...this.allResults.integration
    ].filter(test => !test.passed);
    
    if (failedTests.length === 0) {
      console.log('✅ No issues found! The extension is working excellently.');
      return;
    }
    
    // Group failures by priority
    const criticalIssues = [];
    const performanceIssues = [];
    const compatibilityIssues = [];
    const minorIssues = [];
    
    failedTests.forEach(test => {
      if (test.test?.includes('Extension APIs') || test.test?.includes('Storage')) {
        criticalIssues.push(test);
      } else if (test.test?.includes('Performance') || test.test?.includes('Animation')) {
        performanceIssues.push(test);
      } else if (test.test?.includes('Compatibility') || test.test?.includes('CSS') || test.test?.includes('JavaScript')) {
        compatibilityIssues.push(test);
      } else {
        minorIssues.push(test);
      }
    });
    
    // Display recommendations by priority
    if (criticalIssues.length > 0) {
      console.log('🔴 CRITICAL ISSUES (Fix Immediately):');
      criticalIssues.forEach(issue => {
        console.log(`  • ${issue.case || issue.name}`);
        console.log(`    Impact: Core functionality affected`);
        console.log(`    Action: ${this.getRecommendationForIssue(issue)}`);
      });
      console.log('');
    }
    
    if (performanceIssues.length > 0) {
      console.log('🟠 PERFORMANCE ISSUES (Optimize Soon):');
      performanceIssues.forEach(issue => {
        console.log(`  • ${issue.case || issue.name}`);
        console.log(`    Impact: User experience degradation`);
        console.log(`    Action: ${this.getRecommendationForIssue(issue)}`);
      });
      console.log('');
    }
    
    if (compatibilityIssues.length > 0) {
      console.log('🟡 COMPATIBILITY ISSUES (Consider Fixing):');
      compatibilityIssues.forEach(issue => {
        console.log(`  • ${issue.case || issue.name}`);
        console.log(`    Impact: Limited browser support`);
        console.log(`    Action: ${this.getRecommendationForIssue(issue)}`);
      });
      console.log('');
    }
    
    if (minorIssues.length > 0) {
      console.log('🔵 MINOR ISSUES (Nice to Fix):');
      minorIssues.forEach(issue => {
        console.log(`  • ${issue.case || issue.name}`);
        console.log(`    Impact: Minor functionality issues`);
        console.log(`    Action: ${this.getRecommendationForIssue(issue)}`);
      });
      console.log('');
    }
  }

  // Get specific recommendation for an issue
  getRecommendationForIssue(issue) {
    const testType = issue.test || '';
    const caseName = issue.case || issue.name || '';
    
    // Extension API issues
    if (testType.includes('Extension APIs')) {
      if (caseName.includes('chrome.action')) {
        return 'Add fallback to browserAction API for older browsers';
      }
      if (caseName.includes('Service Worker')) {
        return 'Ensure Manifest V3 compliance and service worker registration';
      }
      return 'Check extension permissions and API availability';
    }
    
    // Performance issues
    if (testType.includes('Performance')) {
      if (caseName.includes('rendering')) {
        return 'Implement virtual scrolling and optimize DOM manipulation';
      }
      if (caseName.includes('scrolling')) {
        return 'Add scroll event throttling and reduce reflows';
      }
      if (caseName.includes('animation')) {
        return 'Use CSS transforms and enable hardware acceleration';
      }
      return 'Profile and optimize the specific performance bottleneck';
    }
    
    // Compatibility issues
    if (testType.includes('CSS Features')) {
      return 'Add CSS fallbacks and feature detection';
    }
    
    if (testType.includes('JavaScript Features')) {
      return 'Consider transpilation with Babel or provide polyfills';
    }
    
    // Storage issues
    if (testType.includes('Storage')) {
      return 'Implement quota management and error recovery';
    }
    
    // Default recommendation
    return 'Review the specific error and implement appropriate fixes';
  }

  // Generate CI/CD summary
  generateCISummary(stats) {
    console.log('🤖 CI/CD SUMMARY');
    console.log('================');
    
    const passRate = parseFloat(stats.passRate);
    const ciStatus = passRate >= 80 ? 'PASS' : 'FAIL';
    const ciColor = passRate >= 80 ? '🟢' : '🔴';
    
    console.log(`${ciColor} Build Status: ${ciStatus}`);
    console.log(`Pass Rate: ${stats.passRate}%`);
    console.log(`Total Tests: ${stats.total}`);
    console.log(`Passed: ${stats.passed}`);
    console.log(`Failed: ${stats.failed}`);
    
    // Exit code for CI systems
    if (typeof process !== 'undefined' && process.exit) {
      const exitCode = passRate >= 80 ? 0 : 1;
      console.log(`Exit Code: ${exitCode}`);
      
      // Don't actually exit in browser environment
      if (typeof window === 'undefined') {
        setTimeout(() => process.exit(exitCode), 1000);
      }
    }
    
    console.log('');
    console.log('Test run completed successfully! 🎉');
  }
}

// Export for use in Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ComprehensiveTestRunner;
}

// Browser environment setup
if (typeof window !== 'undefined') {
  window.ComprehensiveTestRunner = ComprehensiveTestRunner;
  
  // Global function to run all tests
  window.runAllTests = async (options) => {
    const runner = new ComprehensiveTestRunner();
    return await runner.runAllTests(options);
  };
  
  // Quick test functions
  window.runQuickTests = () => runAllTests({ 
    runPerformance: false, 
    runIntegration: false 
  });
  
  window.runPerformanceTests = () => runAllTests({ 
    runCompatibility: false, 
    runIntegration: false, 
    runUnit: false 
  });
  
  window.runCompatibilityTests = () => runAllTests({ 
    runPerformance: false, 
    runIntegration: false, 
    runUnit: false 
  });
  
  console.log('🚀 Comprehensive Test Runner loaded!');
  console.log('Available commands:');
  console.log('  - runAllTests() - Run all test suites');
  console.log('  - runQuickTests() - Run only unit and compatibility tests');
  console.log('  - runPerformanceTests() - Run only performance tests');
  console.log('  - runCompatibilityTests() - Run only compatibility tests');
}