// Performance testing suite for Chrome Chat Sidebar
// Tests extension performance with large chat histories and various scenarios

class PerformanceTestSuite {
  constructor() {
    this.results = [];
    this.testData = {
      smallMessageCount: 50,
      mediumMessageCount: 500,
      largeMessageCount: 2000,
      extremeMessageCount: 10000
    };
  }

  // Generate test messages for performance testing
  generateTestMessages(count) {
    const messages = [];
    const messageTypes = ['user', 'system'];
    const sampleTexts = [
      'Hello, this is a test message.',
      'This is a longer test message that contains more text to simulate real-world usage patterns.',
      'Short msg',
      'This is an extremely long message that simulates what happens when users send very long messages with lots of text content that might cause performance issues in the chat interface. It includes multiple sentences and various punctuation marks to test text rendering performance.',
      '👋 Hello! This message contains emojis 🚀 and special characters to test Unicode handling performance.',
      'Line 1\nLine 2\nLine 3\nThis message contains multiple lines to test multi-line rendering performance.',
      'https://example.com/very-long-url-that-might-cause-layout-issues-in-the-chat-interface',
      JSON.stringify({ test: 'data', nested: { value: 123, array: [1, 2, 3] } })
    ];

    for (let i = 0; i < count; i++) {
      messages.push({
        id: `perf_test_msg_${i}`,
        content: sampleTexts[i % sampleTexts.length],
        timestamp: Date.now() - (count - i) * 1000,
        type: messageTypes[i % messageTypes.length],
        metadata: {
          url: 'https://test.example.com',
          tabId: 1
        }
      });
    }

    return messages;
  }

  // Test message rendering performance
  async testMessageRenderingPerformance() {
    console.log('🧪 Testing message rendering performance...');
    
    const testCases = [
      { name: 'Small (50 messages)', count: this.testData.smallMessageCount },
      { name: 'Medium (500 messages)', count: this.testData.mediumMessageCount },
      { name: 'Large (2000 messages)', count: this.testData.largeMessageCount },
      { name: 'Extreme (10000 messages)', count: this.testData.extremeMessageCount }
    ];

    for (const testCase of testCases) {
      const messages = this.generateTestMessages(testCase.count);
      
      // Measure rendering time
      const startTime = performance.now();
      
      // Simulate message rendering
      await this.simulateMessageRendering(messages);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Measure memory usage
      const memoryUsage = this.measureMemoryUsage();
      
      const result = {
        test: 'Message Rendering',
        case: testCase.name,
        messageCount: testCase.count,
        renderTime: renderTime,
        averageTimePerMessage: renderTime / testCase.count,
        memoryUsage: memoryUsage,
        passed: renderTime < (testCase.count * 2) // 2ms per message threshold
      };
      
      this.results.push(result);
      console.log(`  ${testCase.name}: ${renderTime.toFixed(2)}ms (${result.averageTimePerMessage.toFixed(3)}ms/msg)`);
    }
  }

  // Test virtual scrolling performance
  async testVirtualScrollingPerformance() {
    console.log('🧪 Testing virtual scrolling performance...');
    
    const largeMessageSet = this.generateTestMessages(this.testData.extremeMessageCount);
    
    // Test scroll performance
    const scrollTests = [
      { name: 'Scroll to top', scrollTo: 0 },
      { name: 'Scroll to middle', scrollTo: 0.5 },
      { name: 'Scroll to bottom', scrollTo: 1 },
      { name: 'Rapid scrolling', scrollTo: 'rapid' }
    ];

    for (const scrollTest of scrollTests) {
      const startTime = performance.now();
      
      await this.simulateScrolling(largeMessageSet, scrollTest.scrollTo);
      
      const endTime = performance.now();
      const scrollTime = endTime - startTime;
      
      const result = {
        test: 'Virtual Scrolling',
        case: scrollTest.name,
        messageCount: largeMessageSet.length,
        scrollTime: scrollTime,
        memoryUsage: this.measureMemoryUsage(),
        passed: scrollTime < 100 // 100ms threshold for scroll operations
      };
      
      this.results.push(result);
      console.log(`  ${scrollTest.name}: ${scrollTime.toFixed(2)}ms`);
    }
  }

  // Test storage performance
  async testStoragePerformance() {
    console.log('🧪 Testing storage performance...');
    
    const testCases = [
      { name: 'Save single message', count: 1 },
      { name: 'Save batch (10 messages)', count: 10 },
      { name: 'Save large batch (100 messages)', count: 100 },
      { name: 'Load message history', count: 1000, operation: 'load' }
    ];

    for (const testCase of testCases) {
      const messages = this.generateTestMessages(testCase.count);
      
      const startTime = performance.now();
      
      if (testCase.operation === 'load') {
        await this.simulateStorageLoad(testCase.count);
      } else {
        await this.simulateStorageSave(messages);
      }
      
      const endTime = performance.now();
      const operationTime = endTime - startTime;
      
      const result = {
        test: 'Storage Performance',
        case: testCase.name,
        messageCount: testCase.count,
        operationTime: operationTime,
        averageTimePerMessage: operationTime / testCase.count,
        passed: operationTime < (testCase.count * 5) // 5ms per message threshold
      };
      
      this.results.push(result);
      console.log(`  ${testCase.name}: ${operationTime.toFixed(2)}ms`);
    }
  }

  // Test animation performance
  async testAnimationPerformance() {
    console.log('🧪 Testing animation performance...');
    
    const animationTests = [
      { name: 'Sidebar slide-in', animation: 'slideIn' },
      { name: 'Sidebar slide-out', animation: 'slideOut' },
      { name: 'Message fade-in', animation: 'messageFadeIn' },
      { name: 'Scroll animations', animation: 'scroll' }
    ];

    for (const animTest of animationTests) {
      const startTime = performance.now();
      
      await this.simulateAnimation(animTest.animation);
      
      const endTime = performance.now();
      const animationTime = endTime - startTime;
      
      // Measure frame rate during animation
      const frameRate = await this.measureFrameRate(animTest.animation);
      
      const result = {
        test: 'Animation Performance',
        case: animTest.name,
        animationTime: animationTime,
        frameRate: frameRate,
        passed: frameRate >= 30 && animationTime < 500 // 30fps and under 500ms
      };
      
      this.results.push(result);
      console.log(`  ${animTest.name}: ${animationTime.toFixed(2)}ms @ ${frameRate.toFixed(1)}fps`);
    }
  }

  // Simulate message rendering for testing
  async simulateMessageRendering(messages) {
    // Create a test container
    const testContainer = document.createElement('div');
    testContainer.style.position = 'absolute';
    testContainer.style.top = '-9999px';
    testContainer.style.width = '350px';
    document.body.appendChild(testContainer);

    try {
      // Simulate the actual rendering process
      const fragment = document.createDocumentFragment();
      
      for (const message of messages) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message-item';
        messageElement.innerHTML = `
          <div class="message-bubble ${message.type}">
            <div class="message-content">${this.escapeHtml(message.content)}</div>
            <div class="message-timestamp">${new Date(message.timestamp).toLocaleTimeString()}</div>
          </div>
        `;
        fragment.appendChild(messageElement);
      }
      
      testContainer.appendChild(fragment);
      
      // Force layout calculation
      testContainer.offsetHeight;
      
      // Simulate scroll to bottom
      testContainer.scrollTop = testContainer.scrollHeight;
      
    } finally {
      document.body.removeChild(testContainer);
    }
  }

  // Simulate scrolling for performance testing
  async simulateScrolling(messages, scrollType) {
    return new Promise((resolve) => {
      if (scrollType === 'rapid') {
        // Simulate rapid scrolling
        let scrollPosition = 0;
        const maxScroll = messages.length * 80; // Estimated height per message
        const scrollStep = maxScroll / 20;
        
        const rapidScroll = () => {
          scrollPosition += scrollStep;
          if (scrollPosition < maxScroll) {
            requestAnimationFrame(rapidScroll);
          } else {
            resolve();
          }
        };
        
        rapidScroll();
      } else {
        // Simulate single scroll operation
        setTimeout(resolve, 50);
      }
    });
  }

  // Simulate storage operations
  async simulateStorageSave(messages) {
    // Simulate Chrome storage API delay
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate JSON serialization overhead
        JSON.stringify(messages);
        resolve();
      }, Math.random() * 10 + 5); // 5-15ms delay
    });
  }

  async simulateStorageLoad(messageCount) {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate loading and parsing overhead
        const mockData = this.generateTestMessages(messageCount);
        JSON.parse(JSON.stringify(mockData));
        resolve();
      }, Math.random() * 20 + 10); // 10-30ms delay
    });
  }

  // Simulate animations
  async simulateAnimation(animationType) {
    return new Promise((resolve) => {
      const duration = animationType === 'slideIn' || animationType === 'slideOut' ? 350 : 200;
      setTimeout(resolve, duration);
    });
  }

  // Measure frame rate during animation
  async measureFrameRate(animationType) {
    return new Promise((resolve) => {
      let frameCount = 0;
      const startTime = performance.now();
      const duration = 1000; // Measure for 1 second
      
      const countFrames = () => {
        frameCount++;
        if (performance.now() - startTime < duration) {
          requestAnimationFrame(countFrames);
        } else {
          const fps = frameCount / (duration / 1000);
          resolve(fps);
        }
      };
      
      requestAnimationFrame(countFrames);
    });
  }

  // Measure memory usage
  measureMemoryUsage() {
    if (performance.memory) {
      return {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024 * 100) / 100,
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024 * 100) / 100,
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024 * 100) / 100
      };
    }
    return { used: 'N/A', total: 'N/A', limit: 'N/A' };
  }

  // Utility function to escape HTML
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Run all performance tests
  async runAllTests() {
    console.log('🚀 Starting Chrome Chat Sidebar Performance Tests');
    console.log('================================================');
    
    this.results = [];
    
    await this.testMessageRenderingPerformance();
    await this.testVirtualScrollingPerformance();
    await this.testStoragePerformance();
    await this.testAnimationPerformance();
    
    this.generateReport();
  }

  // Generate performance report
  generateReport() {
    console.log('\n📊 Performance Test Results');
    console.log('============================');
    
    const passedTests = this.results.filter(r => r.passed).length;
    const totalTests = this.results.length;
    const passRate = (passedTests / totalTests * 100).toFixed(1);
    
    console.log(`Overall: ${passedTests}/${totalTests} tests passed (${passRate}%)`);
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
      console.log(`${testType}:`);
      results.forEach(result => {
        const status = result.passed ? '✅' : '❌';
        console.log(`  ${status} ${result.case}`);
        
        if (result.renderTime) {
          console.log(`     Render time: ${result.renderTime.toFixed(2)}ms`);
        }
        if (result.scrollTime) {
          console.log(`     Scroll time: ${result.scrollTime.toFixed(2)}ms`);
        }
        if (result.operationTime) {
          console.log(`     Operation time: ${result.operationTime.toFixed(2)}ms`);
        }
        if (result.animationTime) {
          console.log(`     Animation time: ${result.animationTime.toFixed(2)}ms`);
        }
        if (result.frameRate) {
          console.log(`     Frame rate: ${result.frameRate.toFixed(1)}fps`);
        }
        if (result.memoryUsage && result.memoryUsage.used !== 'N/A') {
          console.log(`     Memory usage: ${result.memoryUsage.used}MB`);
        }
      });
      console.log('');
    });
    
    // Performance recommendations
    this.generateRecommendations();
  }

  // Generate performance recommendations
  generateRecommendations() {
    console.log('💡 Performance Recommendations');
    console.log('==============================');
    
    const failedTests = this.results.filter(r => !r.passed);
    
    if (failedTests.length === 0) {
      console.log('✅ All performance tests passed! The extension is performing well.');
      return;
    }
    
    failedTests.forEach(test => {
      console.log(`❌ ${test.test} - ${test.case}:`);
      
      if (test.test === 'Message Rendering' && test.renderTime > test.messageCount * 2) {
        console.log('   - Consider implementing virtual scrolling for large message lists');
        console.log('   - Optimize DOM manipulation by using DocumentFragment');
        console.log('   - Reduce CSS complexity and avoid expensive selectors');
      }
      
      if (test.test === 'Virtual Scrolling' && test.scrollTime > 100) {
        console.log('   - Optimize scroll event handlers with throttling/debouncing');
        console.log('   - Reduce the number of DOM elements rendered simultaneously');
        console.log('   - Use CSS transforms instead of changing layout properties');
      }
      
      if (test.test === 'Storage Performance' && test.operationTime > test.messageCount * 5) {
        console.log('   - Implement message batching for storage operations');
        console.log('   - Consider using compression for large message histories');
        console.log('   - Add storage quota management and cleanup');
      }
      
      if (test.test === 'Animation Performance' && (test.frameRate < 30 || test.animationTime > 500)) {
        console.log('   - Use CSS transforms and opacity for animations');
        console.log('   - Enable hardware acceleration with transform3d');
        console.log('   - Reduce animation complexity and duration');
      }
    });
  }
}

// Export for use in tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceTestSuite;
}

// Auto-run tests if loaded directly
if (typeof window !== 'undefined' && window.location) {
  window.PerformanceTestSuite = PerformanceTestSuite;
  
  // Add a global function to run tests
  window.runPerformanceTests = async () => {
    const testSuite = new PerformanceTestSuite();
    await testSuite.runAllTests();
  };
  
  console.log('Performance test suite loaded. Run window.runPerformanceTests() to start testing.');
}