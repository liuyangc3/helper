// Content script for Chrome Chat Sidebar extension
// Handles sidebar injection, DOM manipulation, and user interactions

let sidebarContainer = null;
let isInjected = false;

// Initialize content script
(function init() {
  console.log('Chrome Chat Sidebar content script loaded');
  
  // Check if we should show sidebar on page load
  chrome.runtime.sendMessage({ action: 'getSidebarState' }, (response) => {
    if (response && response.success && response.data.visible) {
      showSidebar();
    }
  });
})();

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
      
    default:
      console.warn('Unknown message action:', message.action);
  }
});

// Create and inject sidebar into the page
function createSidebar() {
  if (sidebarContainer) {
    return sidebarContainer;
  }
  
  // Create main sidebar container
  sidebarContainer = document.createElement('div');
  sidebarContainer.id = 'chrome-chat-sidebar';
  sidebarContainer.className = 'chrome-chat-sidebar-container';
  
  // Create sidebar content structure
  sidebarContainer.innerHTML = `
    <div class="sidebar-header">
      <h3>Chat</h3>
      <button class="close-btn" id="sidebar-close-btn">×</button>
    </div>
    <div class="chat-history" id="chat-history">
      <!-- Chat messages will be populated here -->
      <div class="welcome-message">
        <p>Welcome to Chrome Chat Sidebar!</p>
        <p>Start typing a message below to begin chatting.</p>
      </div>
    </div>
    <div class="message-input-container">
      <textarea 
        id="message-input" 
        placeholder="Type your message here... (Enter to send, Shift+Enter for new line)"
        rows="1"
      ></textarea>
      <button id="send-button" class="send-btn">Send</button>
    </div>
  `;
  
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
  if (!isInjected) {
    const sidebar = createSidebar();
    document.body.appendChild(sidebar);
    isInjected = true;
  }
  
  if (sidebarContainer) {
    sidebarContainer.classList.add('visible');
  }
}

function hideSidebar() {
  if (sidebarContainer) {
    sidebarContainer.classList.remove('visible');
  }
  
  // Update background script state
  chrome.runtime.sendMessage({ 
    action: 'toggleSidebar', 
    visible: false 
  });
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

// Handle page navigation - maintain sidebar state
window.addEventListener('beforeunload', () => {
  // Cleanup if needed
});

// Prevent sidebar from interfering with page functionality
if (sidebarContainer) {
  sidebarContainer.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}