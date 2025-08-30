// Background service worker for Chrome Chat Sidebar extension
// Handles extension lifecycle, storage operations, and communication

// Extension installation and startup
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Chrome Chat Sidebar extension installed');
  
  try {
    // Initialize default settings
    await chrome.storage.local.set({
      sidebarVisible: false,
      currentSession: generateSessionId(),
      settings: {
        sidebarWidth: 350,
        theme: 'light',
        autoScroll: true
      }
    });
    
    // Log installation type for debugging
    if (details.reason === 'install') {
      console.log('Extension installed for the first time');
    } else if (details.reason === 'update') {
      console.log('Extension updated from version:', details.previousVersion);
    }
  } catch (error) {
    console.error('Error during extension installation:', error);
  }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Chrome Chat Sidebar extension started');
});

// Handle extension icon clicks to toggle sidebar
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Check if we can inject content script on this tab
    if (!canInjectContentScript(tab.url)) {
      console.warn('Cannot inject content script on this page:', tab.url);
      return;
    }
    
    // Get current sidebar state for this tab
    const result = await chrome.storage.local.get(['sidebarVisible']);
    const isVisible = result.sidebarVisible || false;
    
    // Toggle sidebar state
    const newState = !isVisible;
    await chrome.storage.local.set({ sidebarVisible: newState });
    
    // Send message to content script to toggle sidebar
    try {
      await chrome.tabs.sendMessage(tab.id, {
        action: 'toggleSidebar',
        visible: newState
      });
    } catch (messageError) {
      console.error('Error sending message to content script:', messageError);
      // Reset sidebar state if content script communication fails
      await chrome.storage.local.set({ sidebarVisible: false });
    }
    
  } catch (error) {
    console.error('Error toggling sidebar:', error);
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Validate message structure
  if (!message || !message.action) {
    console.warn('Invalid message received:', message);
    sendResponse({ success: false, error: 'Invalid message format' });
    return;
  }
  
  switch (message.action) {
    case 'getSidebarState':
      handleGetSidebarState(sendResponse);
      return true; // Keep message channel open for async response
      
    case 'saveMessage':
      handleSaveMessage(message.data, sendResponse);
      return true;
      
    case 'getMessages':
      handleGetMessages(message.sessionId, sendResponse);
      return true;
      
    case 'createSession':
      handleCreateSession(sendResponse);
      return true;
      
    case 'sidebarReady':
      handleSidebarReady(sender.tab.id, sendResponse);
      return true;
      
    default:
      console.warn('Unknown message action:', message.action);
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

// Helper functions
function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function canInjectContentScript(url) {
  // Check if URL allows content script injection
  if (!url) return false;
  
  const restrictedProtocols = ['chrome:', 'chrome-extension:', 'moz-extension:', 'file:'];
  const restrictedDomains = ['chrome.google.com'];
  
  try {
    const urlObj = new URL(url);
    
    // Check protocol
    if (restrictedProtocols.some(protocol => url.startsWith(protocol))) {
      return false;
    }
    
    // Check domain
    if (restrictedDomains.some(domain => urlObj.hostname.includes(domain))) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error parsing URL:', error);
    return false;
  }
}

async function handleGetSidebarState(sendResponse) {
  try {
    const result = await chrome.storage.local.get(['sidebarVisible', 'settings', 'currentSession']);
    sendResponse({
      success: true,
      data: {
        visible: result.sidebarVisible || false,
        settings: result.settings || {
          sidebarWidth: 350,
          theme: 'light',
          autoScroll: true
        },
        sessionId: result.currentSession || generateSessionId()
      }
    });
  } catch (error) {
    console.error('Error getting sidebar state:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleCreateSession(sendResponse) {
  try {
    const newSessionId = generateSessionId();
    await chrome.storage.local.set({ currentSession: newSessionId });
    
    sendResponse({
      success: true,
      data: { sessionId: newSessionId }
    });
  } catch (error) {
    console.error('Error creating session:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleSidebarReady(tabId, sendResponse) {
  try {
    // Sidebar is ready, we can perform any initialization here
    console.log('Sidebar ready on tab:', tabId);
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error handling sidebar ready:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleSaveMessage(messageData, sendResponse) {
  try {
    // Validate message data
    if (!messageData || !messageData.content) {
      throw new Error('Invalid message data');
    }
    
    // Get current session
    const result = await chrome.storage.local.get(['currentSession']);
    const sessionId = result.currentSession || generateSessionId();
    
    // Create message object
    const message = {
      id: generateMessageId(),
      content: messageData.content.trim(),
      timestamp: Date.now(),
      type: messageData.type || 'user',
      metadata: {
        url: messageData.url,
        tabId: messageData.tabId
      }
    };
    
    // Save message to session
    await saveMessageToSession(sessionId, message);
    
    sendResponse({ 
      success: true, 
      data: { 
        messageId: message.id,
        sessionId: sessionId 
      }
    });
  } catch (error) {
    console.error('Error saving message:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleGetMessages(sessionId, sendResponse) {
  try {
    // Get current session if not provided
    if (!sessionId) {
      const result = await chrome.storage.local.get(['currentSession']);
      sessionId = result.currentSession || generateSessionId();
    }
    
    // Retrieve messages for session
    const messages = await getMessagesFromSession(sessionId);
    
    sendResponse({ 
      success: true, 
      data: {
        messages: messages,
        sessionId: sessionId
      }
    });
  } catch (error) {
    console.error('Error getting messages:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Storage management functions
function generateMessageId() {
  return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

async function saveMessageToSession(sessionId, message) {
  try {
    // Get existing session data
    const sessionKey = `session_${sessionId}`;
    const result = await chrome.storage.local.get([sessionKey]);
    
    let sessionData = result[sessionKey] || {
      id: sessionId,
      messages: [],
      createdAt: Date.now(),
      lastActivity: Date.now()
    };
    
    // Add new message
    sessionData.messages.push(message);
    sessionData.lastActivity = Date.now();
    
    // Check storage limits and cleanup if necessary
    await checkStorageLimitsAndCleanup(sessionData);
    
    // Save updated session
    await chrome.storage.local.set({
      [sessionKey]: sessionData,
      currentSession: sessionId
    });
    
    console.log(`Message saved to session ${sessionId}:`, message.id);
  } catch (error) {
    console.error('Error saving message to session:', error);
    throw error;
  }
}

async function getMessagesFromSession(sessionId) {
  try {
    const sessionKey = `session_${sessionId}`;
    const result = await chrome.storage.local.get([sessionKey]);
    
    const sessionData = result[sessionKey];
    if (!sessionData) {
      console.log(`No session found for ID: ${sessionId}`);
      return [];
    }
    
    return sessionData.messages || [];
  } catch (error) {
    console.error('Error getting messages from session:', error);
    throw error;
  }
}

async function checkStorageLimitsAndCleanup(sessionData) {
  try {
    // Chrome storage.local has a limit of ~5MB per extension
    // Keep messages under a reasonable limit per session
    const MAX_MESSAGES_PER_SESSION = 1000;
    
    if (sessionData.messages.length > MAX_MESSAGES_PER_SESSION) {
      // Remove oldest messages, keeping the most recent ones
      const messagesToKeep = Math.floor(MAX_MESSAGES_PER_SESSION * 0.8); // Keep 80%
      sessionData.messages = sessionData.messages.slice(-messagesToKeep);
      console.log(`Cleaned up old messages, kept ${messagesToKeep} most recent messages`);
    }
    
    // Check overall storage usage
    const storageUsage = await chrome.storage.local.getBytesInUse();
    const STORAGE_LIMIT = 4 * 1024 * 1024; // 4MB limit (leaving 1MB buffer)
    
    if (storageUsage > STORAGE_LIMIT) {
      await cleanupOldSessions();
    }
  } catch (error) {
    console.error('Error checking storage limits:', error);
  }
}

async function cleanupOldSessions() {
  try {
    console.log('Starting cleanup of old sessions...');
    
    // Get all storage data
    const allData = await chrome.storage.local.get();
    const sessions = [];
    
    // Find all session keys
    for (const [key, value] of Object.entries(allData)) {
      if (key.startsWith('session_') && value.lastActivity) {
        sessions.push({
          key: key,
          lastActivity: value.lastActivity,
          messageCount: value.messages ? value.messages.length : 0
        });
      }
    }
    
    // Sort by last activity (oldest first)
    sessions.sort((a, b) => a.lastActivity - b.lastActivity);
    
    // Remove oldest sessions (keep only the 10 most recent)
    const MAX_SESSIONS = 10;
    if (sessions.length > MAX_SESSIONS) {
      const sessionsToRemove = sessions.slice(0, sessions.length - MAX_SESSIONS);
      const keysToRemove = sessionsToRemove.map(s => s.key);
      
      await chrome.storage.local.remove(keysToRemove);
      console.log(`Removed ${keysToRemove.length} old sessions:`, keysToRemove);
    }
  } catch (error) {
    console.error('Error cleaning up old sessions:', error);
  }
}

// Utility function to get all sessions (for debugging/management)
async function getAllSessions() {
  try {
    const allData = await chrome.storage.local.get();
    const sessions = {};
    
    for (const [key, value] of Object.entries(allData)) {
      if (key.startsWith('session_')) {
        sessions[key] = {
          id: value.id,
          messageCount: value.messages ? value.messages.length : 0,
          createdAt: value.createdAt,
          lastActivity: value.lastActivity
        };
      }
    }
    
    return sessions;
  } catch (error) {
    console.error('Error getting all sessions:', error);
    return {};
  }
}

// Cleanup function that can be called periodically
async function performMaintenanceCleanup() {
  try {
    console.log('Performing maintenance cleanup...');
    
    // Clean up sessions older than 30 days
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - THIRTY_DAYS;
    
    const allData = await chrome.storage.local.get();
    const keysToRemove = [];
    
    for (const [key, value] of Object.entries(allData)) {
      if (key.startsWith('session_') && value.lastActivity && value.lastActivity < cutoffTime) {
        keysToRemove.push(key);
      }
    }
    
    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
      console.log(`Maintenance cleanup removed ${keysToRemove.length} old sessions`);
    }
  } catch (error) {
    console.error('Error during maintenance cleanup:', error);
  }
}

// Run maintenance cleanup on extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Chrome Chat Sidebar extension started');
  // Run cleanup after a short delay to avoid blocking startup
  setTimeout(performMaintenanceCleanup, 5000);
});