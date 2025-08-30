// Background service worker for Chrome Chat Sidebar extension
// Handles extension lifecycle, storage operations, and communication

// Extension installation and startup
chrome.runtime.onInstalled.addListener(() => {
  console.log('Chrome Chat Sidebar extension installed');
  
  // Initialize default settings
  chrome.storage.local.set({
    sidebarVisible: false,
    currentSession: generateSessionId(),
    settings: {
      sidebarWidth: 350,
      theme: 'light',
      autoScroll: true
    }
  });
});

// Handle extension icon clicks to toggle sidebar
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Get current sidebar state
    const result = await chrome.storage.local.get(['sidebarVisible']);
    const isVisible = result.sidebarVisible || false;
    
    // Toggle sidebar state
    const newState = !isVisible;
    await chrome.storage.local.set({ sidebarVisible: newState });
    
    // Send message to content script to toggle sidebar
    chrome.tabs.sendMessage(tab.id, {
      action: 'toggleSidebar',
      visible: newState
    });
    
  } catch (error) {
    console.error('Error toggling sidebar:', error);
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'getSidebarState':
      handleGetSidebarState(sendResponse);
      return true; // Keep message channel open for async response
      
    case 'saveMessage':
      handleSaveMessage(message.data, sendResponse);
      return true;
      
    case 'getMessages':
      handleGetMessages(sendResponse);
      return true;
      
    default:
      console.warn('Unknown message action:', message.action);
  }
});

// Helper functions
function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

async function handleGetSidebarState(sendResponse) {
  try {
    const result = await chrome.storage.local.get(['sidebarVisible', 'settings']);
    sendResponse({
      success: true,
      data: {
        visible: result.sidebarVisible || false,
        settings: result.settings || {}
      }
    });
  } catch (error) {
    console.error('Error getting sidebar state:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleSaveMessage(messageData, sendResponse) {
  try {
    // TODO: Implement message saving logic
    console.log('Saving message:', messageData);
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error saving message:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleGetMessages(sendResponse) {
  try {
    // TODO: Implement message retrieval logic
    console.log('Getting messages');
    sendResponse({ success: true, data: [] });
  } catch (error) {
    console.error('Error getting messages:', error);
    sendResponse({ success: false, error: error.message });
  }
}