// Content script for Chrome Chat Sidebar extension
// Handles sidebar injection, DOM manipulation, and user interactions

let sidebarContainer = null;
let isInjected = false;
let isAnimating = false;

// Initialize content script
(function init() {
  console.log('Chrome Chat Sidebar content script loaded');
  
  // Ensure DOM is ready before proceeding
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSidebar);
  } else {
    initializeSidebar();
  }
})();

function initializeSidebar() {
  // Check if we should show sidebar on page load
  chrome.runtime.sendMessage({ action: 'getSidebarState' }, (response) => {
    if (response && response.success && response.data.visible) {
      showSidebar();
    }
  });
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'toggleSidebar':
      if (message.visible) {
        showSidebar();
      } else {
        hideSidebar();
      }
      sendResponse({ success: true });
      break;
      
    case 'getSidebarState':
      // Return current sidebar state
      const isVisible = sidebarContainer && sidebarContainer.classList.contains('visible');
      sendResponse({ 
        success: true, 
        data: { 
          visible: isVisible,
          injected: isInjected 
        } 
      });
      break;
      
    case 'setSidebarState':
      // Set sidebar state (used for cross-page persistence)
      if (message.visible) {
        showSidebar();
      } else {
        hideSidebar();
      }
      sendResponse({ success: true });
      break;
      
    case 'ping':
      // Health check for extension context
      sendResponse({ success: true, timestamp: Date.now() });
      break;
      
    default:
      console.warn('Unknown message action:', message.action);
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

// Create and inject sidebar into the page
function createSidebar() {
  if (sidebarContainer) {
    return sidebarContainer;
  }
  
  // Create main sidebar container with enhanced CSS isolation
  sidebarContainer = document.createElement('div');
  sidebarContainer.id = 'chrome-chat-sidebar';
  sidebarContainer.className = 'chrome-chat-sidebar-container';
  
  // Add data attributes for better isolation and debugging
  sidebarContainer.setAttribute('data-extension', 'chrome-chat-sidebar');
  sidebarContainer.setAttribute('data-version', '1.0.0');
  
  // Create sidebar content structure with semantic HTML
  sidebarContainer.innerHTML = `
    <div class="sidebar-header" role="banner">
      <h3 class="sidebar-title">Chat</h3>
      <button class="close-btn" id="sidebar-close-btn" aria-label="Close sidebar" title="Close sidebar">
        <span aria-hidden="true">×</span>
      </button>
    </div>
    <div class="chat-history" id="chat-history" role="main" aria-label="Chat messages">
      <!-- Chat messages will be populated here -->
      <div class="welcome-message" role="status">
        <p>Welcome to Chrome Chat Sidebar!</p>
        <p>Start typing a message below to begin chatting.</p>
      </div>
    </div>
    <div class="message-input-container" role="complementary">
      <textarea 
        id="message-input" 
        placeholder="Type your message here... (Enter to send, Shift+Enter for new line)"
        rows="1"
        aria-label="Message input"
        maxlength="2000"
      ></textarea>
      <button id="send-button" class="send-btn" aria-label="Send message" title="Send message">
        Send
      </button>
    </div>
  `;
  
  // Prevent sidebar from interfering with page functionality
  sidebarContainer.addEventListener('click', (e) => {
    e.stopPropagation();
  });
  
  sidebarContainer.addEventListener('keydown', (e) => {
    e.stopPropagation();
  });
  
  // Add event listeners
  setupEventListeners();
  
  return sidebarContainer;
}

function setupEventListeners() {
  if (!sidebarContainer) return;
  
  // Close button
  const closeBtn = sidebarContainer.querySelector('#sidebar-close-btn');
  closeBtn.addEventListener('click', hideSidebar);
  
  // Message input
  const messageInput = sidebarContainer.querySelector('#message-input');
  const sendButton = sidebarContainer.querySelector('#send-button');
  
  // Handle Enter key for sending messages
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  // Handle auto-resize of textarea
  messageInput.addEventListener('input', (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  });
  
  // Send button click
  sendButton.addEventListener('click', sendMessage);
}

function showSidebar() {
  // Prevent multiple animations
  if (isAnimating) return;
  
  try {
    // Inject sidebar if not already done
    if (!isInjected) {
      const sidebar = createSidebar();
      
      // Ensure we can inject into the page
      if (!document.body) {
        console.error('Cannot inject sidebar: document.body not available');
        return;
      }
      
      // Check for potential conflicts with existing elements
      const existingSidebar = document.getElementById('chrome-chat-sidebar');
      if (existingSidebar && existingSidebar !== sidebarContainer) {
        existingSidebar.remove();
      }
      
      document.body.appendChild(sidebar);
      isInjected = true;
      
      // Force reflow to ensure initial position is set
      sidebar.offsetHeight;
    }
    
    if (sidebarContainer) {
      isAnimating = true;
      sidebarContainer.classList.add('visible');
      
      // Reset animation flag after transition completes
      setTimeout(() => {
        isAnimating = false;
      }, 300); // Match CSS transition duration
      
      // Focus on message input for better UX
      const messageInput = sidebarContainer.querySelector('#message-input');
      if (messageInput) {
        setTimeout(() => messageInput.focus(), 350);
      }
    }
  } catch (error) {
    console.error('Error showing sidebar:', error);
    isAnimating = false;
  }
}

function hideSidebar() {
  // Prevent multiple animations
  if (isAnimating) return;
  
  try {
    if (sidebarContainer) {
      isAnimating = true;
      sidebarContainer.classList.remove('visible');
      
      // Reset animation flag after transition completes
      setTimeout(() => {
        isAnimating = false;
      }, 300); // Match CSS transition duration
    }
    
    // Update background script state
    chrome.runtime.sendMessage({ 
      action: 'toggleSidebar', 
      visible: false 
    });
  } catch (error) {
    console.error('Error hiding sidebar:', error);
    isAnimating = false;
  }
}

function removeSidebar() {
  try {
    if (sidebarContainer && sidebarContainer.parentNode) {
      sidebarContainer.parentNode.removeChild(sidebarContainer);
    }
    sidebarContainer = null;
    isInjected = false;
    isAnimating = false;
  } catch (error) {
    console.error('Error removing sidebar:', error);
  }
}

function sendMessage() {
  const messageInput = sidebarContainer.querySelector('#message-input');
  const message = messageInput.value.trim();
  
  if (!message) return;
  
  // TODO: Implement message sending logic
  console.log('Sending message:', message);
  
  // Clear input
  messageInput.value = '';
  messageInput.style.height = 'auto';
  
  // TODO: Add message to chat history
  // TODO: Save message to storage
}

// Enhanced navigation and state persistence handling
let navigationObserver = null;
let stateCheckInterval = null;
let lastUrl = window.location.href;

// Handle page navigation and cleanup
window.addEventListener('beforeunload', () => {
  // Save current state before page unload
  persistSidebarState();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Page is hidden, save state
    persistSidebarState();
  } else {
    // Page is visible again, restore state if needed
    restoreSidebarState();
  }
});

// Handle browser back/forward navigation
window.addEventListener('popstate', () => {
  handleNavigationChange();
});

// Handle pushState/replaceState navigation (SPA navigation)
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function(...args) {
  originalPushState.apply(history, args);
  handleNavigationChange();
};

history.replaceState = function(...args) {
  originalReplaceState.apply(history, args);
  handleNavigationChange();
};

// Monitor for URL changes (for SPAs that don't use history API)
function startNavigationMonitoring() {
  if (stateCheckInterval) {
    clearInterval(stateCheckInterval);
  }
  
  stateCheckInterval = setInterval(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      handleNavigationChange();
    }
  }, 1000); // Check every second
}

// Handle navigation changes
function handleNavigationChange() {
  console.log('Navigation detected, handling state persistence');
  
  // Save current state
  persistSidebarState();
  
  // Small delay to allow new page to load, then restore state
  setTimeout(() => {
    restoreSidebarState();
  }, 100);
}

// Persist sidebar state to background script
function persistSidebarState() {
  try {
    const isVisible = sidebarContainer && sidebarContainer.classList.contains('visible');
    
    chrome.runtime.sendMessage({ 
      action: 'setSidebarState', 
      visible: isVisible,
      url: window.location.href,
      timestamp: Date.now()
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('Failed to persist sidebar state:', chrome.runtime.lastError.message);
      }
    });
  } catch (error) {
    console.error('Error persisting sidebar state:', error);
  }
}

// Restore sidebar state from background script
function restoreSidebarState() {
  try {
    chrome.runtime.sendMessage({ action: 'getSidebarState' }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('Failed to get sidebar state:', chrome.runtime.lastError.message);
        return;
      }
      
      if (response && response.success && response.data.visible) {
        // Restore sidebar if it was visible
        setTimeout(() => {
          showSidebar();
        }, 50); // Small delay to ensure DOM is ready
      }
    });
  } catch (error) {
    console.error('Error restoring sidebar state:', error);
  }
}

// Enhanced DOM mutation observer for dynamic content changes
function startDOMObserver() {
  if (navigationObserver) {
    navigationObserver.disconnect();
  }
  
  navigationObserver = new MutationObserver((mutations) => {
    let shouldCheckState = false;
    
    mutations.forEach((mutation) => {
      // Check if significant DOM changes occurred
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // Check if our sidebar was removed by page changes
        if (sidebarContainer && !document.contains(sidebarContainer)) {
          console.log('Sidebar removed by page changes, re-injecting...');
          isInjected = false;
          sidebarContainer = null;
          shouldCheckState = true;
        }
      }
    });
    
    if (shouldCheckState) {
      restoreSidebarState();
    }
  });
  
  // Start observing
  navigationObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Initialize navigation monitoring
function initializeNavigationHandling() {
  startNavigationMonitoring();
  startDOMObserver();
  
  // Set up periodic state synchronization
  setInterval(() => {
    // Verify extension context is still valid
    try {
      chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
        if (chrome.runtime.lastError) {
          // Extension context is invalid, cleanup
          cleanup();
        }
      });
    } catch (error) {
      // Extension context is invalid
      cleanup();
    }
  }, 30000); // Check every 30 seconds
}

// Enhanced initialization with navigation handling
function initializeSidebar() {
  // Initialize navigation handling
  initializeNavigationHandling();
  
  // Check if we should show sidebar on page load
  chrome.runtime.sendMessage({ action: 'getSidebarState' }, (response) => {
    if (response && response.success && response.data.visible) {
      showSidebar();
    }
  });
}

// Enhanced cleanup function for extension unload and navigation
function cleanup() {
  try {
    // Save state before cleanup
    persistSidebarState();
    
    // Clear intervals and observers
    if (stateCheckInterval) {
      clearInterval(stateCheckInterval);
      stateCheckInterval = null;
    }
    
    if (navigationObserver) {
      navigationObserver.disconnect();
      navigationObserver = null;
    }
    
    // Restore original history methods
    if (originalPushState) {
      history.pushState = originalPushState;
    }
    if (originalReplaceState) {
      history.replaceState = originalReplaceState;
    }
    
    // Remove sidebar
    removeSidebar();
    
    console.log('Content script cleanup completed');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

// Handle extension context invalidation
chrome.runtime.onConnect.addListener(() => {
  // Extension context is still valid
});

// Detect if extension context becomes invalid
try {
  chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
    if (chrome.runtime.lastError) {
      // Extension context is invalid, cleanup
      cleanup();
    }
  });
} catch (error) {
  // Extension context is invalid
  cleanup();
}