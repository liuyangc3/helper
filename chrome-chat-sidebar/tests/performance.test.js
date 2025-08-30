// Performance tests for Chrome Chat Sidebar extension
// Tests memory usage, rendering performance, and storage efficiency

class PerformanceTestSuite {
  constructor() {
    this.results = [];
    this.baseline = null;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [PERF] [${type.toUpperCase()}] ${message}`);
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Measure memory usage
  measureMemory() {
    if (performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  }

  // Measure execution time
  async measureExecutionTime(name, fn) {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    const duration = end - start;
    
    this.log(`${name}: ${duration.toFixed(2)}ms`);
    
    return {
      name,
      duration,
      result
    };
  }

  // Test sidebar injection performance
  async testSidebarInjectionPerformance() {
    this.log('Testing sidebar injection performance...');
    
    const results = [];
    
    // Test multiple injections
    for (let i = 0; i < 10; i++) {
      // Clean up any existing sidebar
      const existingSidebar = document.getElementById('chrome-chat-sidebar');
      if (existingSidebar) {
        existingSidebar.remove();
      }
      
      const measurement = await this.measureExecutionTime(`Injection ${i + 1}`, async () => {
        if (typeof showSidebar === 'function') {
          showSidebar();
          
          // Wait for sidebar to be fully injected
          let attempts = 0;
          while (attempts < 50) {
            const sidebar = document.getElementById('chrome-chat-sidebar');
            if (sidebar && sidebar.classList.contains('visible')) {
              break;
            }
            await this.delay(10);
            attempts++;
          }
        }
      });
      
      results.push(measurement);
      await this.delay(100);
    }
    
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    const maxDuration = Math.max(...results.map(r => r.duration));
    const minDuration = Math.min(...results.map(r => r.duration));
    
    this.log(`Sidebar injection - Avg: ${avgDuration.toFixed(2)}ms, Min: ${minDuration.toFixed(2)}ms, Max: ${maxDuration.toFixed(2)}ms`);
    
    return {
      test: 'sidebar_injection',
      average: avgDuration,
      minimum: minDuration,
      maximum: maxDuration,
      samples: results.length,
      passed: avgDuration < 100 // Should be under 100ms
    };
  }

  // Test message rendering performance
  async testMessageRenderingPerformance() {
    this.log('Testing message rendering performance...');
    
    // Ensure sidebar is visible
    if (typeof showSidebar === 'function') {
      showSidebar();
      await this.delay(500);
    }
    
    const sidebar = document.getElementById('chrome-chat-sidebar');
    if (!sidebar) {
      throw new Error('Sidebar not available for performance testing');
    }
    
    const results = [];
    const messageCount = 100;
    
    // Test rendering many messages
    const measurement = await this.measureExecutionTime('Render 100 messages', async () => {
      for (let i = 0; i < messageCount; i++) {
        const message = {
          id: `perf_test_${i}`,
          content: `Performance test message ${i}`,
          timestamp: Date.now() - (messageCount - i) * 1000,
          type: 'user'
        };
        
        if (typeof addMessageToHistory === 'function') {
          addMessageToHistory(message, false); // Don't scroll for performance
        }
        
        // Yield control occasionally to prevent blocking
        if (i % 10 === 0) {
          await this.delay(1);
        }
      }
    });
    
    const messagesPerSecond = messageCount / (measurement.duration / 1000);
    this.log(`Message rendering rate: ${messagesPerSecond.toFixed(2)} messages/second`);
    
    return {
      test: 'message_rendering',
      duration: measurement.duration,
      messagesPerSecond: messagesPerSecond,
      messageCount: messageCount,
      passed: messagesPerSecond > 50 // Should render at least 50 messages per second
    };
  }

  // Test scrolling performance
  async testScrollingPerformance() {
    this.log('Testing scrolling performance...');
    
    const sidebar = document.getElementById('chrome-chat-sidebar');
    if (!sidebar) {
      throw new Error('Sidebar not available for scrolling test');
    }
    
    const chatHistory = sidebar.querySelector('#chat-history');
    if (!chatHistory) {
      throw new Error('Chat history not found');
    }
    
    const results = [];
    const scrollCount = 50;
    
    // Test multiple scroll operations
    const measurement = await this.measureExecutionTime('Scroll operations', async () => {
      for (let i = 0; i < scrollCount; i++) {
        const scrollTop = (chatHistory.scrollHeight / scrollCount) * i;
        chatHistory.scrollTop = scrollTop;
        
        // Force reflow
        chatHistory.offsetHeight;
        
        await this.delay(10);
      }
    });
    
    const scrollsPerSecond = scrollCount / (measurement.duration / 1000);
    this.log(`Scrolling rate: ${scrollsPerSecond.toFixed(2)} scrolls/second`);
    
    return {
      test: 'scrolling_performance',
      duration: measurement.duration,
      scrollsPerSecond: scrollsPerSecond,
      scrollCount: scrollCount,
      passed: scrollsPerSecond > 10 // Should handle at least 10 scrolls per second
    };
  }

  // Test storage performance
  async testStoragePerformance() {
    this.log('Testing storage performance...');
    
    const messageCount = 50;
    const messages = [];
    
    // Generate test messages
    for (let i = 0; i < messageCount; i++) {
      messages.push({
        content: `Storage performance test message ${i}`,
        type: 'user',
        url: window.location.href
      });
    }
    
    // Test saving messages
    const saveResults = [];
    for (const message of messages) {
      const measurement = await this.measureExecutionTime(`Save message`, async () => {
        return new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({
            action: 'saveMessage',
            data: message
          }, (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else if (response && response.success) {
              resolve(response);
            } else {
              reject(new Error('Save failed'));
            }
          });
        });
      });
      
      saveResults.push(measurement);
      await this.delay(10);
    }
    
    // Test retrieving messages
    const retrieveResult = await this.measureExecutionTime('Retrieve messages', async () => {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'getMessages',
          sessionId: null
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response && response.success) {
            resolve(response.data.messages);
          } else {
            reject(new Error('Retrieve failed'));
          }
        });
      });
    });
    
    const avgSaveTime = saveResults.reduce((sum, r) => sum + r.duration, 0) / saveResults.length;
    const retrieveTime = retrieveResult.duration;
    
    this.log(`Storage - Avg save: ${avgSaveTime.toFixed(2)}ms, Retrieve: ${retrieveTime.toFixed(2)}ms`);
    
    return {
      test: 'storage_performance',
      averageSaveTime: avgSaveTime,
      retrieveTime: retrieveTime,
      messageCount: messageCount,
      passed: avgSaveTime < 50 && retrieveTime < 100 // Save < 50ms, retrieve < 100ms
    };
  }

  // Test memory usage over time
  async testMemoryUsage() {
    this.log('Testing memory usage...');
    
    const initialMemory = this.measureMemory();
    if (!initialMemory) {
      this.log('Memory measurement not available in this browser');
      return { test: 'memory_usage', passed: true, reason: 'not_available' };
    }
    
    this.log(`Initial memory: ${(initialMemory.used / 1024 / 1024).toFixed(2)} MB`);
    
    // Perform memory-intensive operations
    const operations = [
      () => this.testSidebarInjectionPerformance(),
      () => this.testMessageRenderingPerformance(),
      () => this.testScrollingPerformance()
    ];
    
    const memorySnapshots = [initialMemory];
    
    for (const operation of operations) {
      await operation();
      await this.delay(1000); // Allow GC
      
      const memory = this.measureMemory();
      memorySnapshots.push(memory);
      this.log(`Memory after operation: ${(memory.used / 1024 / 1024).toFixed(2)} MB`);
    }
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
      await this.delay(1000);
      
      const finalMemory = this.measureMemory();
      memorySnapshots.push(finalMemory);
      this.log(`Memory after GC: ${(finalMemory.used / 1024 / 1024).toFixed(2)} MB`);
    }
    
    const maxMemory = Math.max(...memorySnapshots.map(m => m.used));
    const memoryIncrease = maxMemory - initialMemory.used;
    const memoryIncreaseMB = memoryIncrease / 1024 / 1024;
    
    this.log(`Maximum memory increase: ${memoryIncreaseMB.toFixed(2)} MB`);
    
    return {
      test: 'memory_usage',
      initialMemory: initialMemory.used,
      maxMemory: maxMemory,
      memoryIncrease: memoryIncrease,
      memoryIncreaseMB: memoryIncreaseMB,
      snapshots: memorySnapshots,
      passed: memoryIncreaseMB < 10 // Should not increase by more than 10MB
    };
  }

  // Test animation performance
  async testAnimationPerformance() {
    this.log('Testing animation performance...');
    
    const results = [];
    const animationCount = 20;
    
    // Test sidebar show/hide animations
    for (let i = 0; i < animationCount; i++) {
      const showMeasurement = await this.measureExecutionTime(`Show animation ${i + 1}`, async () => {
        if (typeof showSidebar === 'function') {
          showSidebar();
          
          // Wait for animation to complete
          await this.delay(350);
        }
      });
      
      const hideMeasurement = await this.measureExecutionTime(`Hide animation ${i + 1}`, async () => {
        if (typeof hideSidebar === 'function') {
          hideSidebar();
          
          // Wait for animation to complete
          await this.delay(300);
        }
      });
      
      results.push({ show: showMeasurement, hide: hideMeasurement });
      await this.delay(100);
    }
    
    const avgShowTime = results.reduce((sum, r) => sum + r.show.duration, 0) / results.length;
    const avgHideTime = results.reduce((sum, r) => sum + r.hide.duration, 0) / results.length;
    
    this.log(`Animation - Avg show: ${avgShowTime.toFixed(2)}ms, Avg hide: ${avgHideTime.toFixed(2)}ms`);
    
    return {
      test: 'animation_performance',
      averageShowTime: avgShowTime,
      averageHideTime: avgHideTime,
      animationCount: animationCount,
      passed: avgShowTime < 400 && avgHideTime < 350 // Should complete within expected time
    };
  }

  // Test input responsiveness
  async testInputResponsiveness() {
    this.log('Testing input responsiveness...');
    
    // Ensure sidebar is visible
    if (typeof showSidebar === 'function') {
      showSidebar();
      await this.delay(500);
    }
    
    const sidebar = document.getElementById('chrome-chat-sidebar');
    if (!sidebar) {
      throw new Error('Sidebar not available for input test');
    }
    
    const messageInput = sidebar.querySelector('#message-input');
    if (!messageInput) {
      throw new Error('Message input not found');
    }
    
    const results = [];
    const inputCount = 100;
    
    // Test rapid input events
    const measurement = await this.measureExecutionTime('Input events', async () => {
      for (let i = 0; i < inputCount; i++) {
        messageInput.value = `Test input ${i}`;
        messageInput.dispatchEvent(new Event('input'));
        
        // Yield control occasionally
        if (i % 10 === 0) {
          await this.delay(1);
        }
      }
    });
    
    const inputsPerSecond = inputCount / (measurement.duration / 1000);
    this.log(`Input responsiveness: ${inputsPerSecond.toFixed(2)} inputs/second`);
    
    return {
      test: 'input_responsiveness',
      duration: measurement.duration,
      inputsPerSecond: inputsPerSecond,
      inputCount: inputCount,
      passed: inputsPerSecond > 100 // Should handle at least 100 inputs per second
    };
  }

  // Run all performance tests
  async runAllTests() {
    console.log('🚀 Starting Performance Test Suite...');
    
    const tests = [
      ['Sidebar Injection Performance', () => this.testSidebarInjectionPerformance()],
      ['Message Rendering Performance', () => this.testMessageRenderingPerformance()],
      ['Scrolling Performance', () => this.testScrollingPerformance()],
      ['Storage Performance', () => this.testStoragePerformance()],
      ['Memory Usage', () => this.testMemoryUsage()],
      ['Animation Performance', () => this.testAnimationPerformance()],
      ['Input Responsiveness', () => this.testInputResponsiveness()]
    ];
    
    for (const [testName, testFunction] of tests) {
      try {
        this.log(`Running ${testName}...`);
        const result = await testFunction();
        result.testName = testName;
        this.results.push(result);
        
        await this.delay(1000); // Pause between tests
      } catch (error) {
        this.log(`Error in ${testName}: ${error.message}`, 'error');
        this.results.push({
          test: testName.toLowerCase().replace(/\s+/g, '_'),
          testName: testName,
          passed: false,
          error: error.message
        });
      }
    }
    
    this.generateReport();
    return this.getResults();
  }

  generateReport() {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(test => test.passed).length;
    const failedTests = this.results.filter(test => !test.passed).length;
    
    console.log('\n=== PERFORMANCE TEST REPORT ===');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    console.log('\n=== PERFORMANCE METRICS ===');
    this.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.testName || result.test}`);
      
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      } else {
        // Display relevant metrics
        if (result.duration) {
          console.log(`  Duration: ${result.duration.toFixed(2)}ms`);
        }
        if (result.average) {
          console.log(`  Average: ${result.average.toFixed(2)}ms`);
        }
        if (result.messagesPerSecond) {
          console.log(`  Rate: ${result.messagesPerSecond.toFixed(2)} messages/sec`);
        }
        if (result.memoryIncreaseMB) {
          console.log(`  Memory increase: ${result.memoryIncreaseMB.toFixed(2)} MB`);
        }
      }
    });
    
    console.log('\n=== PERFORMANCE RECOMMENDATIONS ===');
    this.results.forEach(result => {
      if (!result.passed && !result.error) {
        console.log(`⚠️  ${result.testName}: Consider optimization`);
        
        if (result.test === 'sidebar_injection' && result.average > 100) {
          console.log('  - Optimize DOM manipulation during sidebar creation');
        }
        if (result.test === 'message_rendering' && result.messagesPerSecond < 50) {
          console.log('  - Consider virtual scrolling for large message lists');
        }
        if (result.test === 'memory_usage' && result.memoryIncreaseMB > 10) {
          console.log('  - Check for memory leaks in event listeners or DOM references');
        }
      }
    });
  }

  getResults() {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(test => test.passed).length;
    const failedTests = this.results.filter(test => !test.passed).length;
    
    return {
      totalTests,
      passedTests,
      failedTests,
      successRate: (passedTests / totalTests) * 100,
      results: this.results,
      summary: {
        allTestsPassed: failedTests === 0,
        performanceGrade: this.calculatePerformanceGrade()
      }
    };
  }

  calculatePerformanceGrade() {
    const scores = this.results.map(result => {
      if (result.error) return 0;
      if (!result.passed) return 0.5;
      return 1;
    });
    
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    if (averageScore >= 0.9) return 'A';
    if (averageScore >= 0.8) return 'B';
    if (averageScore >= 0.7) return 'C';
    if (averageScore >= 0.6) return 'D';
    return 'F';
  }
}

// Export for use
window.PerformanceTestSuite = PerformanceTestSuite;

// Auto-run function
window.runPerformanceTests = async function() {
  const testSuite = new PerformanceTestSuite();
  return await testSuite.runAllTests();
};

console.log('Performance Test Suite loaded. Run with: runPerformanceTests()');

// Export for Node.js if available
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceTestSuite;
}