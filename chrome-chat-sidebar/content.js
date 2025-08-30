// Content script for Chrome Chat Sidebar extension
// Handles sidebar injection, DOM manipulation, and user interactions

let sidebarContainer = null;
let isInjected = false;
let isAnimating = false;

// Initialize content script with error handling
(function init() {
  try {
    console.log('Chrome Chat Sidebar content script loaded');
    
    // Check if we're in a supported environment
    if (!isEnvironmentSupported()) {
      console.warn('Chrome Chat Sidebar: Unsupported environment detected');
      return;
    }
    
    // Ensure DOM is ready before proceeding
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeSidebar);
    } else {
      initializeSidebar();
    }
  } catch (error) {
    console.error('Chrome Chat Sidebar: Failed to initialize content script:', error);
    reportError('content_script_init', error);
  }
})();

// Check if the current environment supports the sidebar
function isEnvironmentSupported() {
  try {
    // Check if we have access to required APIs
    if (!chrome || !chrome.runtime) {
      console.warn('Chrome runtime API not available');
      return false;
    }
    
    // Check if we can access the DOM
    if (!document || !document.body) {
      console.warn('DOM not accessible');
      return false;
    }
    
    // Check if we're in a frame that might have restrictions
    if (window !== window.top) {
      try {
        // Test if we can access parent window (cross-origin check)
        const parentOrigin = window.parent.location.origin;
        if (window.location.origin !== parentOrigin) {
          console.warn('Cross-origin frame detected, sidebar may not work properly');
          // Still allow initialization but with warnings
        }
      } catch (crossOriginError) {
        console.warn('Cross-origin frame restrictions detected');
        // Still allow initialization
      }
    }
    
    // Check for CSP restrictions
    if (document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      console.warn('Content Security Policy detected, sidebar may have limitations');
      // Still allow initialization but log warning
    }
    
    return true;
  } catch (error) {
    console.error('Error checking environment support:', error);
    return false;
  }
}

function initializeSidebar() {
  try {
    // Check if we should show sidebar on page load
    chrome.runtime.sendMessage({ action: 'getSidebarState' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error getting sidebar state:', chrome.runtime.lastError.message);
        handleRuntimeError(chrome.runtime.lastError);
        return;
      }
      
      if (response && response.success && response.data.visible) {
        showSidebar();
      }
    });
    
    // Notify background script that content script is ready
    chrome.runtime.sendMessage({ 
      action: 'sidebarReady',
      url: window.location.href 
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error notifying sidebar ready:', chrome.runtime.lastError.message);
        handleRuntimeError(chrome.runtime.lastError);
      }
    });
  } catch (error) {
    console.error('Error initializing sidebar:', error);
    reportError('sidebar_init', error);
  }
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
      <div class="input-wrapper">
        <textarea 
          id="message-input" 
          placeholder="Type your message here... (Enter to send, Shift+Enter for new line)"
          rows="1"
          aria-label="Message input"
          maxlength="2000"
          spellcheck="true"
          autocomplete="off"
          autocorrect="on"
          autocapitalize="sentences"
        ></textarea>
        <div class="character-count" id="character-count" aria-live="polite">
          <span class="count">0</span>/<span class="max">2000</span>
        </div>
      </div>
      <button id="send-button" class="send-btn" aria-label="Send message" title="Send message" disabled>
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

  // Handle Enter key for sending messages and Shift+Enter for new lines
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift+Enter: Allow new line (default behavior)
        // Just let the default behavior happen, but ensure auto-resize works
        setTimeout(() => {
          autoResizeTextarea(e.target);
          updateSendButtonState();
        }, 0);
      } else {
        // Enter: Send message
        e.preventDefault();
        sendMessage();
      }
    }
  });

  // Handle other keyboard shortcuts
  messageInput.addEventListener('keydown', (e) => {
    // Ctrl+Enter or Cmd+Enter: Also send message (alternative shortcut)
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      sendMessage();
    }

    // Escape: Clear input
    if (e.key === 'Escape') {
      e.preventDefault();
      clearMessageInput();
    }
  });

  // Handle auto-resize of textarea with enhanced functionality
  messageInput.addEventListener('input', (e) => {
    autoResizeTextarea(e.target);
    updateSendButtonState();
    updateCharacterCount();
  });

  // Handle focus events for better UX
  messageInput.addEventListener('focus', (e) => {
    e.target.parentElement.classList.add('focused');
  });

  messageInput.addEventListener('blur', (e) => {
    e.target.parentElement.classList.remove('focused');
  });

  // Handle paste events
  messageInput.addEventListener('paste', (e) => {
    // Allow paste, then resize after content is pasted
    setTimeout(() => {
      autoResizeTextarea(e.target);
      updateSendButtonState();
      updateCharacterCount();
    }, 0);
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
      const injectionResult = attemptSidebarInjection();
      if (!injectionResult.success) {
        console.error('Failed to inject sidebar:', injectionResult.error);
        showInjectionErrorMessage(injectionResult.error);
        return;
      }
    }

    if (sidebarContainer) {
      isAnimating = true;
      sidebarContainer.classList.add('visible');

      // Update background script state with error handling
      chrome.runtime.sendMessage({
        action: 'setSidebarState',
        visible: true,
        url: window.location.href,
        timestamp: Date.now()
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error updating sidebar state:', chrome.runtime.lastError.message);
          handleRuntimeError(chrome.runtime.lastError);
        }
      });

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
          // Initialize send button state and character count
          updateSendButtonState();
          updateCharacterCount();
        }
      }, 350);
    }
  } catch (error) {
    console.error('Error showing sidebar:', error);
    reportError('show_sidebar', error);
    isAnimating = false;
    showInjectionErrorMessage('Unexpected error occurred while showing sidebar');
  }
}

// Attempt to inject sidebar with comprehensive error handling
function attemptSidebarInjection() {
  try {
    // Check if document.body is available
    if (!document.body) {
      return { 
        success: false, 
        error: 'Document body not available. The page may still be loading.' 
      };
    }
    
    // Check for CSP restrictions that might block our injection
    if (hasCSPRestrictions()) {
      console.warn('Content Security Policy restrictions detected');
      // Continue with injection but log warning
    }
    
    // Check for potential conflicts with existing elements
    const existingSidebar = document.getElementById('chrome-chat-sidebar');
    if (existingSidebar && existingSidebar !== sidebarContainer) {
      console.warn('Removing conflicting sidebar element');
      existingSidebar.remove();
    }
    
    // Create sidebar
    const sidebar = createSidebar();
    if (!sidebar) {
      return { 
        success: false, 
        error: 'Failed to create sidebar element' 
      };
    }
    
    // Attempt to append to body
    try {
      document.body.appendChild(sidebar);
    } catch (appendError) {
      return { 
        success: false, 
        error: `Failed to append sidebar to page: ${appendError.message}` 
      };
    }
    
    isInjected = true;
    
    // Force reflow to ensure initial position is set
    sidebar.offsetHeight;
    
    return { success: true };
    
  } catch (error) {
    return { 
      success: false, 
      error: `Injection failed: ${error.message}` 
    };
  }
}

// Check for CSP restrictions
function hasCSPRestrictions() {
  try {
    // Check for CSP meta tags
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (cspMeta) {
      const cspContent = cspMeta.getAttribute('content');
      if (cspContent && (cspContent.includes("'unsafe-inline'") === false || cspContent.includes('style-src') !== -1)) {
        return true;
      }
    }
    
    // Check for CSP headers (we can't directly access them, but we can test injection)
    const testElement = document.createElement('div');
    testElement.style.cssText = 'position: absolute; top: -9999px;';
    
    try {
      document.body.appendChild(testElement);
      document.body.removeChild(testElement);
      return false; // No CSP restrictions detected
    } catch (cspError) {
      return true; // CSP restrictions likely present
    }
  } catch (error) {
    console.warn('Error checking CSP restrictions:', error);
    return false; // Assume no restrictions if we can't check
  }
}

// Show user-friendly error message for injection failures
function showInjectionErrorMessage(errorMessage) {
  try {
    // Create a simple error notification that doesn't rely on our main sidebar
    const errorNotification = document.createElement('div');
    errorNotification.id = 'chrome-chat-sidebar-error';
    errorNotification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff4444;
      color: white;
      padding: 12px 16px;
      border-radius: 4px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      z-index: 2147483647;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      max-width: 300px;
      word-wrap: break-word;
    `;
    
    errorNotification.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">Chat Sidebar Error</div>
      <div>${escapeHtml(errorMessage)}</div>
      <div style="margin-top: 8px; font-size: 12px; opacity: 0.9;">
        Try refreshing the page or check if the page allows extensions.
      </div>
    `;
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.style.cssText = `
      position: absolute;
      top: 4px;
      right: 8px;
      background: none;
      border: none;
      color: white;
      font-size: 18px;
      cursor: pointer;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    closeButton.onclick = () => {
      if (errorNotification.parentNode) {
        errorNotification.parentNode.removeChild(errorNotification);
      }
    };
    
    errorNotification.appendChild(closeButton);
    
    // Try to append to body, with fallback to documentElement
    try {
      document.body.appendChild(errorNotification);
    } catch (bodyError) {
      try {
        document.documentElement.appendChild(errorNotification);
      } catch (docError) {
        console.error('Cannot show error notification:', docError);
        return;
      }
    }
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (errorNotification.parentNode) {
        errorNotification.parentNode.removeChild(errorNotification);
      }
    }, 10000);
    
  } catch (error) {
    console.error('Failed to show injection error message:', error);
  }
}

function hideSidebar() {
  // Prevent multiple animations
  if (isAnimating) return;

  try {
    if (sidebarContainer) {
      isAnimating = true;
      sidebarContainer.classList.remove('visible');
      sidebarContainer.classList.add('hiding');

      // Update background script state
      chrome.runtime.sendMessage({
        action: 'setSidebarState',
        visible: false,
        url: window.location.href,
        timestamp: Date.now()
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error updating sidebar state:', chrome.runtime.lastError.message);
        }
      });

      // Reset animation flag after transition completes
      setTimeout(() => {
        sidebarContainer.classList.remove('hiding');
        isAnimating = false;
      }, 300); // Match CSS transition duration
    }
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
  if (!sidebarContainer) return;

  const messageInput = sidebarContainer.querySelector('#message-input');
  const sendButton = sidebarContainer.querySelector('#send-button');

  if (!messageInput) return;

  const message = messageInput.value.trim();

  // Validate message content
  if (!message || !validateMessage(message)) {
    return;
  }

  // Disable send button to prevent double-sending
  if (sendButton) {
    sendButton.disabled = true;
    sendButton.textContent = 'Sending...';
  }

  // Sanitize message content
  const sanitizedMessage = sanitizeMessage(message);

  // Create message object
  const messageObj = {
    id: generateMessageId(),
    content: sanitizedMessage,
    timestamp: Date.now(),
    type: 'user',
    metadata: {
      url: window.location.href,
      tabId: null // Will be set by background script
    }
  };

  // Add message to chat history immediately for better UX
  addMessageToHistory(messageObj);

  // Clear input and reset its height
  clearMessageInput();

  // Show typing indicator briefly for better UX
  showTypingIndicator();
  setTimeout(() => {
    hideTypingIndicator();
  }, 1000);

  // Save message to storage
  try {
    await saveMessageToStorage(messageObj);
    console.log('Message saved successfully:', messageObj.id);
  } catch (error) {
    console.error('Failed to save message:', error);
    // Show error indicator
    showMessageError(messageObj.id, 'Failed to save message');
  } finally {
    // Re-enable send button
    if (sendButton) {
      sendButton.disabled = false;
      sendButton.textContent = 'Send';
      updateSendButtonState();
    }
  }
}

function generateMessageId() {
  return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Enhanced auto-resize functionality for textarea
function autoResizeTextarea(textarea) {
  if (!textarea) return;

  // Reset height to auto to get the correct scrollHeight
  textarea.style.height = 'auto';

  // Calculate the new height based on content
  const minHeight = 36; // Minimum height in pixels
  const maxHeight = 120; // Maximum height in pixels
  const scrollHeight = textarea.scrollHeight;

  // Set the height within the min/max bounds
  const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
  textarea.style.height = newHeight + 'px';

  // Update the container's scroll position if needed
  const container = textarea.closest('.message-input-container');
  if (container && scrollHeight > maxHeight) {
    // If content exceeds max height, ensure the textarea is scrollable
    textarea.style.overflowY = 'auto';
  } else {
    textarea.style.overflowY = 'hidden';
  }
}

// Update send button state based on input content
function updateSendButtonState() {
  if (!sidebarContainer) return;

  const messageInput = sidebarContainer.querySelector('#message-input');
  const sendButton = sidebarContainer.querySelector('#send-button');

  if (!messageInput || !sendButton) return;

  const hasContent = messageInput.value.trim().length > 0;
  const isValid = validateMessage(messageInput.value);

  if (hasContent && isValid) {
    sendButton.disabled = false;
    sendButton.classList.remove('disabled');
  } else {
    sendButton.disabled = true;
    sendButton.classList.add('disabled');
  }
}

// Validate message content
function validateMessage(message) {
  if (!message || typeof message !== 'string') {
    return false;
  }

  const trimmed = message.trim();

  // Check if message is not empty
  if (trimmed.length === 0) {
    return false;
  }

  // Check maximum length (2000 characters as set in HTML)
  if (trimmed.length > 2000) {
    return false;
  }

  // Check for only whitespace or special characters
  if (!/\S/.test(trimmed)) {
    return false;
  }

  return true;
}

// Sanitize message content to prevent XSS and other security issues
function sanitizeMessage(message) {
  if (!message || typeof message !== 'string') {
    return '';
  }

  // Trim whitespace
  let sanitized = message.trim();

  // Remove or escape potentially dangerous characters
  // This is a basic sanitization - in a real app, you'd use a proper library
  sanitized = sanitized
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  // Normalize line breaks
  sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Limit consecutive line breaks
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');

  return sanitized;
}

// Clear message input and reset its state
function clearMessageInput() {
  if (!sidebarContainer) return;

  const messageInput = sidebarContainer.querySelector('#message-input');
  if (!messageInput) return;

  // Clear the input value
  messageInput.value = '';

  // Reset the height to minimum
  autoResizeTextarea(messageInput);

  // Update send button state
  updateSendButtonState();

  // Update character count
  updateCharacterCount();

  // Focus back on the input for better UX
  messageInput.focus();
}

// Update character count display
function updateCharacterCount() {
  if (!sidebarContainer) return;

  const messageInput = sidebarContainer.querySelector('#message-input');
  const characterCount = sidebarContainer.querySelector('#character-count');

  if (!messageInput || !characterCount) return;

  const currentLength = messageInput.value.length;
  const maxLength = parseInt(messageInput.getAttribute('maxlength')) || 2000;

  const countSpan = characterCount.querySelector('.count');
  if (countSpan) {
    countSpan.textContent = currentLength;
  }

  // Update styling based on character count
  characterCount.classList.remove('warning', 'danger');

  if (currentLength > maxLength * 0.9) {
    characterCount.classList.add('danger');
  } else if (currentLength > maxLength * 0.8) {
    characterCount.classList.add('warning');
  }

  // Update aria-label for accessibility
  const percentage = Math.round((currentLength / maxLength) * 100);
  characterCount.setAttribute('aria-label', `${currentLength} of ${maxLength} characters used (${percentage}%)`);
}

// Show error indicator for a specific message
function showMessageError(messageId, errorText) {
  if (!sidebarContainer) return;

  const messageElement = sidebarContainer.querySelector(`[data-message-id="${messageId}"]`);
  if (!messageElement) return;

  // Add error class to message
  messageElement.classList.add('message-error');

  // Add error indicator
  const errorIndicator = document.createElement('div');
  errorIndicator.className = 'message-error-indicator';
  errorIndicator.innerHTML = `
    <span class="error-icon">⚠️</span>
    <span class="error-text">${escapeHtml(errorText)}</span>
  `;

  const messageBubble = messageElement.querySelector('.message-bubble');
  if (messageBubble) {
    messageBubble.appendChild(errorIndicator);
  }

  // Auto-remove error after 5 seconds
  setTimeout(() => {
    if (errorIndicator.parentNode) {
      errorIndicator.remove();
      messageElement.classList.remove('message-error');
    }
  }, 5000);
}

// Message loading and display logic
function loadMessagesFromStorage() {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage({
        action: 'getMessages',
        sessionId: null // Will use current session
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error loading messages:', chrome.runtime.lastError.message);
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (response && response.success) {
          resolve(response.data.messages || []);
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
        data: {
          content: message.content,
          type: message.type,
          url: window.location.href,
          tabId: null // Will be set by background script
        }
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error saving message:', chrome.runtime.lastError.message);
          handleRuntimeError(chrome.runtime.lastError);
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (response && response.success) {
          resolve(response.data);
        } else {
          const errorMessage = response?.error || 'Unknown error';
          console.error('Failed to save message:', errorMessage);
          
          // Handle specific storage errors
          if (errorMessage.includes('quota exceeded') || errorMessage.includes('QUOTA_EXCEEDED')) {
            showStorageQuotaError();
          } else if (errorMessage.includes('Storage quota exceeded')) {
            showStorageQuotaError();
          }
          
          reject(new Error(errorMessage));
        }
      });
    } catch (error) {
      console.error('Error in saveMessageToStorage:', error);
      reportError('save_message_storage', error);
      reject(error);
    }
  });
}

// Show storage quota error message
function showStorageQuotaError() {
  try {
    const message = 'Storage is full. Some older messages may be automatically cleaned up to make space.';
    showTemporaryMessage(message, 'warning');
    
    // Offer to clean up storage
    setTimeout(() => {
      showStorageCleanupOption();
    }, 3000);
    
  } catch (error) {
    console.error('Error showing storage quota error:', error);
  }
}

// Show storage cleanup option
function showStorageCleanupOption() {
  try {
    // Remove any existing cleanup messages
    const existingCleanup = document.getElementById('chrome-chat-sidebar-cleanup-option');
    if (existingCleanup) {
      existingCleanup.remove();
    }
    
    const cleanupOption = document.createElement('div');
    cleanupOption.id = 'chrome-chat-sidebar-cleanup-option';
    cleanupOption.style.cssText = `
      position: fixed;
      top: 70px;
      right: 20px;
      background: #2196F3;
      color: white;
      padding: 12px 16px;
      border-radius: 4px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      z-index: 2147483647;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      max-width: 300px;
      word-wrap: break-word;
    `;
    
    cleanupOption.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px;">Free up storage space?</div>
      <div style="margin-bottom: 12px;">Clean up old messages and data to free up space.</div>
      <div style="display: flex; gap: 8px;">
        <button id="cleanup-yes" style="
          background: white;
          color: #2196F3;
          border: none;
          padding: 6px 12px;
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
          font-weight: bold;
        ">Clean Up</button>
        <button id="cleanup-no" style="
          background: rgba(255,255,255,0.2);
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
        ">Not Now</button>
      </div>
    `;
    
    // Add event listeners
    cleanupOption.querySelector('#cleanup-yes').onclick = () => {
      performStorageCleanup();
      cleanupOption.remove();
    };
    
    cleanupOption.querySelector('#cleanup-no').onclick = () => {
      cleanupOption.remove();
    };
    
    // Try to append to body
    try {
      document.body.appendChild(cleanupOption);
    } catch (bodyError) {
      document.documentElement.appendChild(cleanupOption);
    }
    
    // Auto-remove after 15 seconds
    setTimeout(() => {
      if (cleanupOption.parentNode) {
        cleanupOption.parentNode.removeChild(cleanupOption);
      }
    }, 15000);
    
  } catch (error) {
    console.error('Error showing storage cleanup option:', error);
  }
}

// Perform storage cleanup
function performStorageCleanup() {
  try {
    showTemporaryMessage('Cleaning up storage...', 'info');
    
    chrome.runtime.sendMessage({ action: 'cleanupStorage' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error during storage cleanup:', chrome.runtime.lastError.message);
        showTemporaryMessage('Storage cleanup failed. Please try again.', 'error');
        return;
      }
      
      if (response && response.success) {
        const freedMB = (response.data.freedBytes / (1024 * 1024)).toFixed(2);
        showTemporaryMessage(`Storage cleanup completed. Freed ${freedMB} MB of space.`, 'info');
      } else {
        showTemporaryMessage('Storage cleanup failed. Please try again.', 'error');
      }
    });
    
  } catch (error) {
    console.error('Error performing storage cleanup:', error);
    showTemporaryMessage('Storage cleanup failed. Please try again.', 'error');
  }
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

// Function to show typing indicator
function showTypingIndicator() {
  if (!sidebarContainer) return;

  const messageList = sidebarContainer.querySelector('#message-list');
  const existingTyping = messageList.querySelector('.typing-indicator');

  if (!existingTyping) {
    const typingElement = document.createElement('div');
    typingElement.className = 'typing-indicator';
    typingElement.innerHTML = `
      <div class="dot"></div>
      <div class="dot"></div>
      <div class="dot"></div>
    `;
    messageList.appendChild(typingElement);
    
    // Auto-scroll to show typing indicator
    scrollToLatestMessage();
  }
}

// Function to hide typing indicator
function hideTypingIndicator() {
  if (!sidebarContainer) return;

  const messageList = sidebarContainer.querySelector('#message-list');
  const typingElement = messageList.querySelector('.typing-indicator');

  if (typingElement) {
    typingElement.remove();
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

  // Add animation based on message type
  requestAnimationFrame(() => {
    if (message.type === 'user') {
      messageElement.classList.add('message-bounce');
    } else {
      messageElement.classList.add('message-fade-in');
    }
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

// Error handling and reporting functions
function handleRuntimeError(runtimeError) {
  try {
    const errorMessage = runtimeError.message || 'Unknown runtime error';
    
    // Check for specific error types
    if (errorMessage.includes('Extension context invalidated')) {
      console.warn('Extension context invalidated - extension may have been reloaded');
      showContextInvalidatedMessage();
      return;
    }
    
    if (errorMessage.includes('Could not establish connection')) {
      console.warn('Could not establish connection with background script');
      showConnectionErrorMessage();
      return;
    }
    
    // Generic runtime error handling
    console.error('Runtime error:', errorMessage);
    reportError('runtime_error', new Error(errorMessage));
    
  } catch (error) {
    console.error('Error handling runtime error:', error);
  }
}

function reportError(errorType, error, context = {}) {
  try {
    // Create error report
    const errorReport = {
      type: errorType,
      message: error.message,
      stack: error.stack,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      context: context
    };
    
    // Try to send error report to background script
    chrome.runtime.sendMessage({
      action: 'reportError',
      data: errorReport
    }, (response) => {
      if (chrome.runtime.lastError) {
        // If we can't send to background script, store locally
        console.error('Failed to report error to background script:', chrome.runtime.lastError.message);
        storeErrorLocally(errorReport);
      }
    });
    
  } catch (reportingError) {
    console.error('Failed to report error:', reportingError);
  }
}

function storeErrorLocally(errorReport) {
  try {
    // Store in sessionStorage as a fallback
    const errorKey = `sidebar_error_${Date.now()}`;
    const existingErrors = JSON.parse(sessionStorage.getItem('sidebar_errors') || '[]');
    existingErrors.push(errorReport);
    
    // Keep only the last 10 errors
    if (existingErrors.length > 10) {
      existingErrors.splice(0, existingErrors.length - 10);
    }
    
    sessionStorage.setItem('sidebar_errors', JSON.stringify(existingErrors));
  } catch (storageError) {
    console.error('Failed to store error locally:', storageError);
  }
}

function showContextInvalidatedMessage() {
  try {
    const message = 'Extension was reloaded. Please refresh the page to use the chat sidebar.';
    showTemporaryMessage(message, 'warning');
  } catch (error) {
    console.error('Error showing context invalidated message:', error);
  }
}

function showConnectionErrorMessage() {
  try {
    const message = 'Cannot connect to chat sidebar service. Please try refreshing the page.';
    showTemporaryMessage(message, 'error');
  } catch (error) {
    console.error('Error showing connection error message:', error);
  }
}

function showTemporaryMessage(message, type = 'info') {
  try {
    // Remove any existing temporary messages
    const existingMessage = document.getElementById('chrome-chat-sidebar-temp-message');
    if (existingMessage) {
      existingMessage.remove();
    }
    
    const tempMessage = document.createElement('div');
    tempMessage.id = 'chrome-chat-sidebar-temp-message';
    
    const backgroundColor = {
      'info': '#2196F3',
      'warning': '#FF9800',
      'error': '#F44336'
    }[type] || '#2196F3';
    
    tempMessage.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${backgroundColor};
      color: white;
      padding: 12px 16px;
      border-radius: 4px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      z-index: 2147483647;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      max-width: 300px;
      word-wrap: break-word;
      animation: slideIn 0.3s ease-out;
    `;
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    
    tempMessage.textContent = message;
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.style.cssText = `
      position: absolute;
      top: 4px;
      right: 8px;
      background: none;
      border: none;
      color: white;
      font-size: 18px;
      cursor: pointer;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    closeButton.onclick = () => {
      if (tempMessage.parentNode) {
        tempMessage.parentNode.removeChild(tempMessage);
      }
    };
    
    tempMessage.appendChild(closeButton);
    
    // Try to append to body
    try {
      document.body.appendChild(tempMessage);
    } catch (bodyError) {
      document.documentElement.appendChild(tempMessage);
    }
    
    // Auto-remove after 8 seconds
    setTimeout(() => {
      if (tempMessage.parentNode) {
        tempMessage.parentNode.removeChild(tempMessage);
      }
    }, 8000);
    
  } catch (error) {
    console.error('Error showing temporary message:', error);
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

// Persist sidebar state for cross-navigation
function persistSidebarState() {
  if (!sidebarContainer) return;
  
  const isVisible = sidebarContainer.classList.contains('visible');
  
  chrome.runtime.sendMessage({
    action: 'setSidebarState',
    visible: isVisible,
    url: window.location.href,
    timestamp: Date.now()
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error persisting sidebar state:', chrome.runtime.lastError.message);
    }
  });
}

// Handle URL changes for single-page applications
function handleUrlChange() {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    console.log('URL changed from', lastUrl, 'to', currentUrl);
    lastUrl = currentUrl;
    
    // Persist state for the previous URL and check state for new URL
    persistSidebarState();
    
    // Small delay to allow for page changes
    setTimeout(() => {
      initializeSidebar();
    }, 100);
  }
}

// Set up navigation monitoring
function setupNavigationMonitoring() {
  // Monitor for URL changes (for SPAs)
  if (window.history && window.history.pushState) {
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    
    window.history.pushState = function(...args) {
      originalPushState.apply(window.history, args);
      setTimeout(handleUrlChange, 0);
    };
    
    window.history.replaceState = function(...args) {
      originalReplaceState.apply(window.history, args);
      setTimeout(handleUrlChange, 0);
    };
  }
  
  // Listen for popstate events (back/forward navigation)
  window.addEventListener('popstate', () => {
    setTimeout(handleUrlChange, 0);
  });
  
  // Periodic check for URL changes (fallback)
  stateCheckInterval = setInterval(handleUrlChange, 1000);
}

// Initialize navigation monitoring
setupNavigationMonitoring();

// Health check function to ensure background script connection
function performHealthCheck() {
  chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn('Background script connection lost:', chrome.runtime.lastError.message);
      // Try to reconnect or handle gracefully
      setTimeout(performHealthCheck, 5000);
    } else if (response && response.success) {
      console.log('Background script connection healthy');
    }
  });
}

// Perform initial health check
setTimeout(performHealthCheck, 1000);

// Periodic health checks
setInterval(performHealthCheck, 30000); // Every 30 seconds

// Cleanup function for when content script is unloaded
function cleanup() {
  if (stateCheckInterval) {
    clearInterval(stateCheckInterval);
  }
  
  if (navigationObserver) {
    navigationObserver.disconnect();
  }
  
  persistSidebarState();
  removeSidebar();
}

// Register cleanup handlers
window.addEventListener('beforeunload', cleanup);
window.addEventListener('unload', cleanup);

// Handle extension context invalidation
chrome.runtime.onConnect.addListener((port) => {
  port.onDisconnect.addListener(() => {
    if (chrome.runtime.lastError) {
      console.warn('Extension context invalidated, cleaning up...');
      cleanup();
    }
  });
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

history.pushState = function (...args) {
  originalPushState.apply(history, args);
  handleNavigationChange();
};

history.replaceState = function (...args) {
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