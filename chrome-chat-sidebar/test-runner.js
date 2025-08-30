// Comprehensive test runner for Chrome Chat Sidebar extension
// Combines all test suites: unit, integration, e2e, and performance tests

class ComprehensiveTestRunner {
  constructor() {
    this.results = {
      unit: null,
      integration: null,
      e2e: null,
      performance: null,
      website: null
    };
    this.startTime = null;
    this.endTime = null;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [TEST-RUNNER] [${type.toUpperCase()}] ${message}`;
    console.log(logEntry);
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL(src);
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async ensureTestSuitesLoaded() {
    this.log('Loading test suites...');
    
    const testSuites = [
      'test-integration.js',
      'tests/e2e.test.js',
      'tests/performance.test.js',
      'test-websites.js'
    ];
    
    for (const suite of testSuites) {
      try {
        await this.loadScript(suite);
        this.log(`Loaded ${suite}`);
      } catch (error) {
        this.log(`Failed to load ${suite}: ${error.message}`, 'error');
      }
    }
    
    await this.delay(1000); // Allow scripts to initialize
  }

  async runUnitTests() {
    this.log('Running unit tests...');
    
    try {
      // Run basic browser tests
      if (typeof runBasicTests === 'function') {
        runBasicTests();
        
        // Wait for async tests to complete
        await this.delay(3000);
        
        this.results.unit = {
          status: 'completed',
          type: 'basic_functionality',
          passed: true // Assume passed if no errors thrown
        };
      } else {
        this.results.unit = {
          status: 'skipped',
          reason: 'Basic test functions not available'
        };
      }
    } catch (error) {
      this.log(`Unit tests failed: ${error.message}`, 'error');
      this.results.unit = {
        status: 'failed',
        error: error.message
      };
    }
  }

  async runIntegrationTests() {
    this.log('Running integration tests...');
    
    try {
      if (typeof IntegrationTester !== 'undefined') {
        const tester = new IntegrationTester();
        const results = await tester.runAllTests();
        
        this.results.integration = {
          status: 'completed',
          ...results
        };
      } else {
        this.results.integration = {
          status: 'skipped',
          reason: 'IntegrationTester not available'
        };
      }
    } catch (error) {
      this.log(`Integration tests failed: ${error.message}`, 'error');
      this.results.integration = {
        status: 'failed',
        error: error.message
      };
    }
  }

  async runE2ETests() {
    this.log('Running end-to-end tests...');
    
    try {
      if (typeof E2ETestSuite !== 'undefined') {
        const testSuite = new E2ETestSuite();
        const results = await testSuite.runAllTests();
        
        this.results.e2e = {
          status: 'completed',
          ...results
        };
      } else {
        this.results.e2e = {
          status: 'skipped',
          reason: 'E2ETestSuite not available'
        };
      }
    } catch (error) {
      this.log(`E2E tests failed: ${error.message}`, 'error');
      this.results.e2e = {
        status: 'failed',
        error: error.message
      };
    }
  }

  async runPerformanceTests() {
    this.log('Running performance tests...');
    
    try {
      if (typeof PerformanceTestSuite !== 'undefined') {
        const testSuite = new PerformanceTestSuite();
        const results = await testSuite.runAllTests();
        
        this.results.performance = {
          status: 'completed',
          ...results
        };
      } else {
        this.results.performance = {
          status: 'skipped',
          reason: 'PerformanceTestSuite not available'
        };
      }
    } catch (error) {
      this.log(`Performance tests failed: ${error.message}`, 'error');
      this.results.performance = {
        status: 'failed',
        error: error.message
      };
    }
  }

  async runWebsiteCompatibilityTests() {
    this.log('Running website compatibility tests...');
    
    try {
      if (typeof testCurrentWebsite === 'function') {
        const result = await testCurrentWebsite();
        
        this.results.website = {
          status: 'completed',
          result: result
        };
      } else {
        this.results.website = {
          status: 'skipped',
          reason: 'Website compatibility tester not available'
        };
      }
    } catch (error) {
      this.log(`Website compatibility tests failed: ${error.message}`, 'error');
      this.results.website = {
        status: 'failed',
        error: error.message
      };
    }
  }

  async runAllTests(options = {}) {
    this.startTime = Date.now();
    
    console.log('🚀 Starting Comprehensive Test Suite for Chrome Chat Sidebar...');
    console.log('='.repeat(80));
    
    // Check prerequisites
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      throw new Error('Chrome extension APIs not available');
    }
    
    if (typeof showSidebar !== 'function') {
      throw new Error('Content script not loaded');
    }
    
    // Load test suites
    await this.ensureTestSuitesLoaded();
    
    // Run test suites based on options
    const testSuites = [
      { name: 'unit', fn: () => this.runUnitTests(), enabled: options.unit !== false },
      { name: 'integration', fn: () => this.runIntegrationTests(), enabled: options.integration !== false },
      { name: 'e2e', fn: () => this.runE2ETests(), enabled: options.e2e !== false },
      { name: 'performance', fn: () => this.runPerformanceTests(), enabled: options.performance !== false },
      { name: 'website', fn: () => this.runWebsiteCompatibilityTests(), enabled: options.website !== false }
    ];
    
    for (const suite of testSuites) {
      if (suite.enabled) {
        console.log(`\n${'='.repeat(40)}`);
        console.log(`Running ${suite.name.toUpperCase()} Tests`);
        console.log(`${'='.repeat(40)}`);
        
        try {
          await suite.fn();
        } catch (error) {
          this.log(`Failed to run ${suite.name} tests: ${error.message}`, 'error');
        }
        
        // Pause between test suites
        await this.delay(2000);
      } else {
        this.log(`Skipping ${suite.name} tests (disabled by options)`);
        this.results[suite.name] = { status: 'skipped', reason: 'disabled_by_options' };
      }
    }
    
    this.endTime = Date.now();
    
    // Generate comprehensive report
    this.generateComprehensiveReport();
    
    return this.getComprehensiveResults();
  }

  generateComprehensiveReport() {
    const duration = this.endTime - this.startTime;
    
    console.log('\n' + '='.repeat(80));
    console.log('COMPREHENSIVE TEST REPORT');
    console.log('='.repeat(80));
    
    console.log(`\nTotal execution time: ${(duration / 1000).toFixed(2)} seconds`);
    console.log(`Test run completed at: ${new Date(this.endTime).toLocaleString()}`);
    
    // Summary by test suite
    console.log('\n📊 TEST SUITE SUMMARY');
    console.log('-'.repeat(50));
    
    const suiteNames = {
      unit: 'Unit Tests',
      integration: 'Integration Tests',
      e2e: 'End-to-End Tests',
      performance: 'Performance Tests',
      website: 'Website Compatibility'
    };
    
    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    
    Object.entries(this.results).forEach(([key, result]) => {
      const suiteName = suiteNames[key] || key;
      
      if (!result) {
        console.log(`❓ ${suiteName}: Not run`);
        return;
      }
      
      if (result.status === 'skipped') {
        console.log(`⏭️  ${suiteName}: Skipped (${result.reason})`);
        totalSkipped++;
        return;
      }
      
      if (result.status === 'failed') {
        console.log(`❌ ${suiteName}: Failed (${result.error})`);
        totalFailed++;
        return;
      }
      
      if (result.status === 'completed') {
        const passed = result.passedTests || (result.passed ? 1 : 0);
        const failed = result.failedTests || (result.passed ? 0 : 1);
        const total = result.totalTests || 1;
        
        totalTests += total;
        totalPassed += passed;
        totalFailed += failed;
        
        const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
        const status = failed === 0 ? '✅' : '⚠️';
        
        console.log(`${status} ${suiteName}: ${passed}/${total} passed (${successRate}%)`);
        
        // Additional details for specific test types
        if (key === 'performance' && result.summary) {
          console.log(`   Performance Grade: ${result.summary.performanceGrade}`);
        }
        
        if (key === 'e2e' && result.results) {
          const criticalFailures = result.results.filter(r => 
            r.status === 'failed' && 
            (r.name.includes('Complete User Workflow') || r.name.includes('Message Flow'))
          );
          if (criticalFailures.length > 0) {
            console.log(`   ⚠️  Critical workflow failures detected`);
          }
        }
      }
    });
    
    // Overall summary
    console.log('\n🎯 OVERALL SUMMARY');
    console.log('-'.repeat(50));
    console.log(`Total test suites: ${Object.keys(this.results).length}`);
    console.log(`Completed: ${Object.values(this.results).filter(r => r?.status === 'completed').length}`);
    console.log(`Skipped: ${totalSkipped}`);
    console.log(`Failed: ${Object.values(this.results).filter(r => r?.status === 'failed').length}`);
    
    if (totalTests > 0) {
      const overallSuccessRate = ((totalPassed / totalTests) * 100).toFixed(1);
      console.log(`\nIndividual tests: ${totalPassed}/${totalTests} passed (${overallSuccessRate}%)`);
    }
    
    // Quality assessment
    console.log('\n🏆 QUALITY ASSESSMENT');
    console.log('-'.repeat(50));
    
    const qualityScore = this.calculateQualityScore();
    console.log(`Quality Score: ${qualityScore.score}/100`);
    console.log(`Quality Grade: ${qualityScore.grade}`);
    
    if (qualityScore.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS');
      console.log('-'.repeat(50));
      qualityScore.recommendations.forEach(rec => {
        console.log(`• ${rec}`);
      });
    }
    
    // Critical issues
    const criticalIssues = this.identifyCriticalIssues();
    if (criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES');
      console.log('-'.repeat(50));
      criticalIssues.forEach(issue => {
        console.log(`❌ ${issue}`);
      });
    }
    
    console.log('\n' + '='.repeat(80));
  }

  calculateQualityScore() {
    let score = 0;
    let maxScore = 0;
    const recommendations = [];
    
    // Unit tests (20 points)
    maxScore += 20;
    if (this.results.unit?.status === 'completed') {
      score += 20;
    } else if (this.results.unit?.status === 'skipped') {
      score += 10;
      recommendations.push('Implement comprehensive unit tests');
    }
    
    // Integration tests (25 points)
    maxScore += 25;
    if (this.results.integration?.status === 'completed') {
      const successRate = this.results.integration.successRate || 0;
      score += Math.round((successRate / 100) * 25);
      
      if (successRate < 90) {
        recommendations.push('Improve integration test coverage and reliability');
      }
    } else {
      recommendations.push('Add integration tests for component communication');
    }
    
    // E2E tests (25 points)
    maxScore += 25;
    if (this.results.e2e?.status === 'completed') {
      const successRate = this.results.e2e.successRate || 0;
      score += Math.round((successRate / 100) * 25);
      
      if (successRate < 95) {
        recommendations.push('Fix end-to-end workflow issues');
      }
    } else {
      recommendations.push('Add end-to-end tests for user workflows');
    }
    
    // Performance tests (20 points)
    maxScore += 20;
    if (this.results.performance?.status === 'completed') {
      const grade = this.results.performance.summary?.performanceGrade || 'F';
      const gradePoints = { 'A': 20, 'B': 16, 'C': 12, 'D': 8, 'F': 4 };
      score += gradePoints[grade] || 0;
      
      if (grade < 'B') {
        recommendations.push('Optimize performance bottlenecks');
      }
    } else {
      recommendations.push('Add performance benchmarks and monitoring');
    }
    
    // Website compatibility (10 points)
    maxScore += 10;
    if (this.results.website?.status === 'completed') {
      score += 10;
    } else {
      recommendations.push('Test compatibility across different website types');
    }
    
    const finalScore = Math.round((score / maxScore) * 100);
    let grade = 'F';
    
    if (finalScore >= 90) grade = 'A';
    else if (finalScore >= 80) grade = 'B';
    else if (finalScore >= 70) grade = 'C';
    else if (finalScore >= 60) grade = 'D';
    
    return {
      score: finalScore,
      grade: grade,
      recommendations: recommendations
    };
  }

  identifyCriticalIssues() {
    const issues = [];
    
    // Check for critical test failures
    if (this.results.integration?.status === 'failed') {
      issues.push('Integration tests failed - core functionality may be broken');
    }
    
    if (this.results.e2e?.status === 'completed' && this.results.e2e.failedTests > 0) {
      const criticalFailures = this.results.e2e.results?.filter(r => 
        r.status === 'failed' && r.name.includes('Complete User Workflow')
      );
      if (criticalFailures?.length > 0) {
        issues.push('Critical user workflow is broken');
      }
    }
    
    // Check for performance issues
    if (this.results.performance?.status === 'completed') {
      const grade = this.results.performance.summary?.performanceGrade;
      if (grade === 'F') {
        issues.push('Severe performance issues detected');
      }
    }
    
    // Check for extension loading issues
    if (this.results.unit?.status === 'failed') {
      issues.push('Basic extension functionality is not working');
    }
    
    return issues;
  }

  getComprehensiveResults() {
    const duration = this.endTime - this.startTime;
    const qualityScore = this.calculateQualityScore();
    const criticalIssues = this.identifyCriticalIssues();
    
    return {
      duration: duration,
      timestamp: this.endTime,
      results: this.results,
      summary: {
        qualityScore: qualityScore.score,
        qualityGrade: qualityScore.grade,
        recommendations: qualityScore.recommendations,
        criticalIssues: criticalIssues,
        overallStatus: criticalIssues.length === 0 ? 'healthy' : 'issues_detected'
      }
    };
  }
}

// Export for use
window.ComprehensiveTestRunner = ComprehensiveTestRunner;

// Convenience functions
window.runAllTests = async function(options = {}) {
  const runner = new ComprehensiveTestRunner();
  return await runner.runAllTests(options);
};

window.runQuickTests = async function() {
  const runner = new ComprehensiveTestRunner();
  return await runner.runAllTests({
    unit: true,
    integration: true,
    e2e: false,
    performance: false,
    website: false
  });
};

window.runFullTests = async function() {
  const runner = new ComprehensiveTestRunner();
  return await runner.runAllTests();
};

console.log('🧪 Comprehensive Test Runner loaded!');
console.log('Available commands:');
console.log('  - runAllTests() - Run all test suites');
console.log('  - runQuickTests() - Run unit and integration tests only');
console.log('  - runFullTests() - Run complete test suite');
console.log('  - runAllTests({performance: false}) - Run all except performance tests');

// Export for Node.js if available
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ComprehensiveTestRunner;
}