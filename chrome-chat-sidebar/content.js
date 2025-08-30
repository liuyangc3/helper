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
      <div class="message-list" id="message-list">
        <div class="welcome-message" role="status">
          <p>Welcome to Chrome Chat Sidebar!</p>
          <p>Start typing a message below to begin chatting.</p>
        </div>
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
      
      // Initialize chat history and focus on message input
      setTimeout(() => {
        initializeChatHistory();
        const messageInput = sidebarContainer.querySelector('#message-input');
        if (messageInput) {
          messageInput.focus();
        }
      }, 350);
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

// Message rendering functions
function createMessageElement(message) {
  const messageElement = document.createElement('div');
  messageElement.className = 'message-item';
  messageElement.setAttribute('data-message-id', message.id);
  messageElement.setAttribute('data-message-type', message.type);
  
  const timestamp = formatTimestamp(message.timestamp);
  
  messageElement.innerHTML = `
    <div class="message-bubble ${message.type}">
      <div class="message-content">${escapeHtml(message.content)}</div>
      <div class="message-timestamp" title="${new Date(message.timestamp).toLocaleString()}">${timestamp}</div>
    </div>
  `;
  
  return messageElement;
}

function formatTimestamp(timestamp) {
  const now = new Date();
  const messageDate = new Date(timestamp);
  const diffInMinutes = Math.floor((now - messageDate) / (1000 * 60));
  
  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInMinutes < 1440) { // Less than 24 hours
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours}h ago`;
  } else {
    // More than 24 hours, show date
    const options = { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return messageDate.toLocaleDateString('en-US', options);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function addMessageToHistory(message) {
  if (!sidebarContainer) return;
  
  const messageList = sidebarContainer.querySelector('#message-list');
  const welcomeMessage = messageList.querySelector('.welcome-message');
  
  // Remove welcome message if it exists
  if (welcomeMessage) {
    welcomeMessage.remove();
  }
  
  // Create and add new message element
  const messageElement = createMessageElement(message);
  messageList.appendChild(messageElement);
  
  // Auto-scroll to latest message
  scrollToLatestMessage();
  
  // Add fade-in animation
  requestAnimationFrame(() => {
    messageElement.classList.add('message-fade-in');
  });
}

function scrollToLatestMessage() {
  if (!sidebarContainer) return;
  
  const chatHistory = sidebarContainer.querySelector('#chat-history');
  if (chatHistory) {
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }
}

function renderMessageHistory(messages) {
  if (!sidebarContainer || !messages || messages.length === 0) return;
  
  const messageList = sidebarContainer.querySelector('#message-list');
  
  // Clear existing messages except welcome message
  const existingMessages = messageList.querySelectorAll('.message-item');
  existingMessages.forEach(msg => msg.remove());
  
  // Remove welcome message if we have actual messages
  if (messages.length > 0) {
    const welcomeMessage = messageList.querySelector('.welcome-message');
    if (welcomeMessage) {
      welcomeMessage.remove();
    }
  }
  
  // Add all messages
  messages.forEach(message => {
    const messageElement = createMessageElement(message);
    messageList.appendChild(messageElement);
  });
  
  // Scroll to latest message
  scrollToLatestMessage();
}

async function sendMessage() {
  const messageInput = sidebarContainer.querySelector('#message-input');
  const message = messageInput.value.trim();
  
  if (!message) return;
  
  // Create message object
  const messageObj = {
    id: generateMessageId(),
    content: message,
    timestamp: Date.now(),
    type: 'user',
    metadata: {
      url: window.location.href,
      tabId: null // Will be set by background script
    }
  };
  
  // Add message to chat history immediately for better UX
  addMessageToHistory(messageObj);
  
  // Clear input
  messageInput.value = '';
  messageInput.style.height = 'auto';
  
  // Save message to storage
  try {
    await saveMessageToStorage(messageObj);
    console.log('Message saved successfully:', messageObj.id);
  } catch (error) {
    console.error('Failed to save message:', error);
    // Could add error indicator to the message bubble here
  }
}

function generateMessageId() {
  return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Message loading and display logic
function loadMessagesFromStorage() {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage({ 
        action: 'getMessages',
        url: window.location.href 
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error loading messages:', chrome.runtime.lastError.message);
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        if (response && response.success) {
          resolve(response.data || []);
        } else {
          console.error('Failed to load messages:', response?.error);
          reject(new Error(response?.error || 'Unknown error'));
        }
      });
    } catch (error) {
      console.error('Error in loadMessagesFromStorage:', error);
      reject(error);
    }
  });
}

function saveMessageToStorage(message) {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage({ 
        action: 'saveMessage',
        message: message,
        url: window.location.href 
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error saving message:', chrome.runtime.lastError.message);
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        if (response && response.success) {
          resolve(response.data);
        } else {
          console.error('Failed to save message:', response?.error);
          reject(new Error(response?.error || 'Unknown error'));
        }
      });
    } catch (error) {
      console.error('Error in saveMessageToStorage:', error);
      reject(error);
    }
  });
}

async function initializeChatHistory() {
  if (!sidebarContainer) return;
  
  try {
    // Show loading state
    showLoadingState();
    
    // Load messages from storage
    const messages = await loadMessagesFromStorage();
    
    // Hide loading state
    hideLoadingState();
    
    // Render messages
    if (messages && messages.length > 0) {
      renderMessageHistory(messages);
    } else {
      // Show welcome message if no messages
      showWelcomeMessage();
    }
  } catch (error) {
    console.error('Error initializing chat history:', error);
    hideLoadingState();
    showErrorState('Failed to load chat history');
  }
}

function showLoadingState() {
  if (!sidebarContainer) return;
  
  const messageList = sidebarContainer.querySelector('#message-list');
  const existingLoading = messageList.querySelector('.loading-state');
  
  if (!existingLoading) {
    const loadingElement = document.createElement('div');
    loadingElement.className = 'loading-state';
    loadingElement.innerHTML = `
      <div class="loading-spinner"></div>
      <p>Loading messages...</p>
    `;
    messageList.appendChild(loadingElement);
  }
}

function hideLoadingState() {
  if (!sidebarContainer) return;
  
  const messageList = sidebarContainer.querySelector('#message-list');
  const loadingElement = messageList.querySelector('.loading-state');
  
  if (loadingElement) {
    loadingElement.remove();
  }
}

function showErrorState(errorMessage) {
  if (!sidebarContainer) return;
  
  const messageList = sidebarContainer.querySelector('#message-list');
  const existingError = messageList.querySelector('.error-state');
  
  if (!existingError) {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-state';
    errorElement.innerHTML = `
      <div class="error-icon">⚠️</div>
      <p>${escapeHtml(errorMessage)}</p>
      <button class="retry-btn" onclick="initializeChatHistory()">Retry</button>
    `;
    messageList.appendChild(errorElement);
  }
}

function showWelcomeMessage() {
  if (!sidebarContainer) return;
  
  const messageList = sidebarContainer.querySelector('#message-list');
  const existingWelcome = messageList.querySelector('.welcome-message');
  
  if (!existingWelcome) {
    const welcomeElement = document.createElement('div');
    welcomeElement.className = 'welcome-message';
    welcomeElement.setAttribute('role', 'status');
    welcomeElement.innerHTML = `
      <p>Welcome to Chrome Chat Sidebar!</p>
      <p>Start typing a message below to begin chatting.</p>
    `;
    messageList.appendChild(welcomeElement);
  }
}

// Enhanced auto-scroll functionality
function scrollToLatestMessage(smooth = true) {
  if (!sidebarContainer) return;
  
  const chatHistory = sidebarContainer.querySelector('#chat-history');
  if (!chatHistory) return;
  
  const scrollOptions = {
    top: chatHistory.scrollHeight,
    behavior: smooth ? 'smooth' : 'auto'
  };
  
  // Use requestAnimationFrame for better performance
  requestAnimationFrame(() => {
    chatHistory.scrollTo(scrollOptions);
  });
}

function isScrolledToBottom() {
  if (!sidebarContainer) return true;
  
  const chatHistory = sidebarContainer.querySelector('#chat-history');
  if (!chatHistory) return true;
  
  const threshold = 50; // pixels from bottom
  return chatHistory.scrollHeight - chatHistory.scrollTop - chatHistory.clientHeight < threshold;
}

// Enhanced message addition with efficient DOM manipulation
function addMessageToHistory(message, shouldScroll = true) {
  if (!sidebarContainer) return;
  
  const messageList = sidebarContainer.querySelector('#message-list');
  const welcomeMessage = messageList.querySelector('.welcome-message');
  const loadingState = messageList.querySelector('.loading-state');
  const errorState = messageList.querySelector('.error-state');
  
  // Remove welcome message, loading, or error states if they exist
  [welcomeMessage, loadingState, errorState].forEach(element => {
    if (element) element.remove();
  });
  
  // Check if user was scrolled to bottom before adding message
  const wasScrolledToBottom = isScrolledToBottom();
  
  // Create and add new message element
  const messageElement = createMessageElement(message);
  
  // Use document fragment for better performance if adding multiple messages
  const fragment = document.createDocumentFragment();
  fragment.appendChild(messageElement);
  messageList.appendChild(fragment);
  
  // Auto-scroll only if user was at bottom or if explicitly requested
  if (shouldScroll && (wasScrolledToBottom || message.type === 'user')) {
    scrollToLatestMessage();
  }
  
  // Add fade-in animation
  requestAnimationFrame(() => {
    messageElement.classList.add('message-fade-in');
  });
  
  // Limit message history to prevent memory issues
  limitMessageHistory();
}

function limitMessageHistory(maxMessages = 100) {
  if (!sidebarContainer) return;
  
  const messageList = sidebarContainer.querySelector('#message-list');
  const messages = messageList.querySelectorAll('.message-item');
  
  if (messages.length > maxMessages) {
    const messagesToRemove = messages.length - maxMessages;
    for (let i = 0; i < messagesToRemove; i++) {
      messages[i].remove();
    }
  }
}

// Enhanced message rendering with performance optimizations
function renderMessageHistory(messages, append = false) {
  if (!sidebarContainer || !messages || messages.length === 0) return;
  
  const messageList = sidebarContainer.querySelector('#message-list');
  
  if (!append) {
    // Clear existing messages except welcome message
    const existingMessages = messageList.querySelectorAll('.message-item');
    existingMessages.forEach(msg => msg.remove());
    
    // Remove states
    ['welcome-message', 'loading-state', 'error-state'].forEach(className => {
      const element = messageList.querySelector(`.${className}`);
      if (element) element.remove();
    });
  }
  
  // Use document fragment for better performance
  const fragment = document.createDocumentFragment();
  
  // Create message elements
  messages.forEach(message => {
    const messageElement = createMessageElement(message);
    fragment.appendChild(messageElement);
  });
  
  // Add all messages at once
  messageList.appendChild(fragment);
  
  // Scroll to latest message
  scrollToLatestMessage(false); // Don't use smooth scroll for initial load
  
  // Add fade-in animations with staggered timing
  const messageElements = messageList.querySelectorAll('.message-item');
  messageElements.forEach((element, index) => {
    setTimeout(() => {
      element.classList.add('message-fade-in');
    }, index * 50); // Stagger animations by 50ms
  });
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