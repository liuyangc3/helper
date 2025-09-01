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
    const injectionResult = await checkAndHandleInjection(tab);
    if (!injectionResult.success) {
      console.warn('Cannot use sidebar on this page:', injectionResult.reason);
      await showInjectionError(tab, injectionResult.reason);
      return;
    }
    
    // Get current sidebar state for this tab
    const result = await chrome.storage.local.get(['sidebarVisible']);
    const isVisible = result.sidebarVisible || false;
    
    // Toggle sidebar state
    const newState = !isVisible;
    await chrome.storage.local.set({ sidebarVisible: newState });
    
    // Send message to content script to toggle sidebar with retry mechanism
    const messageResult = await sendMessageWithRetry(tab.id, {
      action: 'toggleSidebar',
      visible: newState
    });
    
    if (!messageResult.success) {
      console.error('Failed to communicate with content script:', messageResult.error);
      // Reset sidebar state if content script communication fails
      await chrome.storage.local.set({ sidebarVisible: false });
      await showCommunicationError(tab, messageResult.error);
    }
    
  } catch (error) {
    console.error('Error toggling sidebar:', error);
    await logError('toggle_sidebar', error, { tabId: tab.id, url: tab.url });
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
      handleGetSidebarState(sender.tab?.id, sendResponse);
      return true; // Keep message channel open for async response
      
    case 'setSidebarState':
      handleSetSidebarState(message, sender.tab?.id, sendResponse);
      return true;
      
    case 'toggleSidebar':
      handleToggleSidebar(message, sender.tab?.id, sendResponse);
      return true;
      
    case 'saveMessage':
      handleSaveMessage(message.data, sendResponse);
      return true;
      
    case 'getMessages':
      handleGetMessages(message, sendResponse);
      return true;
      
    case 'createSession':
      handleCreateSession(sendResponse);
      return true;
      
    case 'sidebarReady':
      handleSidebarReady(sender.tab?.id, sendResponse);
      return true;
      
    case 'ping':
      // Health check response
      sendResponse({ success: true, timestamp: Date.now() });
      break;
      
    case 'reportError':
      handleErrorReport(message.data, sender.tab?.id, sendResponse);
      return true;
      
    case 'getStorageInfo':
      handleGetStorageInfo(sendResponse);
      return true;
      
    case 'exportData':
      handleExportData(sendResponse);
      return true;
      
    case 'importData':
      handleImportData(message.data, sendResponse);
      return true;
      
    case 'cleanupStorage':
      handleCleanupStorage(sendResponse);
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
  
  const restrictedProtocols = ['chrome:', 'chrome-extension:', 'moz-extension:', 'file:', 'about:', 'data:', 'javascript:'];
  const restrictedDomains = ['chrome.google.com', 'chromewebstore.google.com'];
  const restrictedPaths = ['/chrome/', '/edge/', '/browser/'];
  
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
    
    // Check specific paths that might be restricted
    if (restrictedPaths.some(path => urlObj.pathname.startsWith(path))) {
      return false;
    }
    
    // Check for localhost with specific ports that might be restricted
    if (urlObj.hostname === 'localhost' && ['9222', '9229'].includes(urlObj.port)) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error parsing URL:', error);
    return false;
  }
}

// Enhanced injection checking with detailed error reporting
async function checkAndHandleInjection(tab) {
  try {
    // Basic URL validation
    if (!tab.url) {
      return { success: false, reason: 'No URL available' };
    }
    
    // Check if URL allows content script injection
    if (!canInjectContentScript(tab.url)) {
      const urlObj = new URL(tab.url);
      let reason = 'Restricted page';
      
      if (tab.url.startsWith('chrome:')) {
        reason = 'Chat sidebar cannot be used on Chrome internal pages (chrome://)';
      } else if (tab.url.startsWith('file:')) {
        reason = 'Chat sidebar cannot be used on local files (file://)';
      } else if (tab.url.startsWith('chrome-extension:')) {
        reason = 'Chat sidebar cannot be used on extension pages';
      } else if (urlObj.hostname.includes('chrome.google.com')) {
        reason = 'Chat sidebar cannot be used on Chrome Web Store pages';
      }
      
      return { success: false, reason };
    }
    
    // Check if tab is in a valid state
    if (tab.status !== 'complete') {
      return { success: false, reason: 'Page is still loading' };
    }
    
    // Try to ping the content script to see if it's already injected and responsive
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
      if (response && response.success) {
        return { success: true, reason: 'Content script already active' };
      }
    } catch (pingError) {
      // Content script not available, which is expected for new pages
      console.log('Content script not available, will rely on manifest injection');
    }
    
    // If we get here, the page should support content script injection
    return { success: true, reason: 'Page supports content script injection' };
    
  } catch (error) {
    console.error('Error checking injection capability:', error);
    return { success: false, reason: 'Error checking page compatibility' };
  }
}

// Send message with retry mechanism
async function sendMessageWithRetry(tabId, message, maxRetries = 3, delay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, message);
      return { success: true, data: response };
    } catch (error) {
      console.warn(`Message attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        return { 
          success: false, 
          error: `Failed after ${maxRetries} attempts: ${error.message}` 
        };
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 1.5; // Exponential backoff
    }
  }
}

// Show user-friendly message for injection restrictions and errors
// Distinguishes between expected restrictions (Chrome internal pages) and actual errors
async function showInjectionError(tab, reason) {
  try {
    // Determine if this is an expected restriction or an actual error
    const isExpectedRestriction = reason.includes('Chrome internal pages') || 
                                 reason.includes('local files') || 
                                 reason.includes('extension pages') || 
                                 reason.includes('Chrome Web Store');
    
    if (isExpectedRestriction) {
      // Log as info rather than error for expected restrictions
      console.info(`[restriction_info] ${reason}`, { 
        tabId: tab.id, 
        url: tab.url 
      });
    } else {
      // Log as actual error for unexpected injection failures
      await logError('injection_failed', new Error(reason), { 
        tabId: tab.id, 
        url: tab.url,
        reason 
      });
    }
    
    // Try to show a notification (if permissions allow)
    if (chrome.notifications) {
      const title = isExpectedRestriction ? 'Chat Sidebar Not Available' : 'Chat Sidebar Error';
      const message = isExpectedRestriction ? 
        `${reason}. Try using the sidebar on a regular website.` : 
        reason;
        
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: title,
        message: message
      });
    }
    
    // Update extension badge to indicate restriction/error
    chrome.action.setBadgeText({ text: isExpectedRestriction ? 'i' : '!', tabId: tab.id });
    chrome.action.setBadgeBackgroundColor({ 
      color: isExpectedRestriction ? '#2196F3' : '#ff4444', 
      tabId: tab.id 
    });
    
    // Clear badge after 5 seconds
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '', tabId: tab.id });
    }, 5000);
    
  } catch (error) {
    console.error('Error showing injection restriction/error:', error);
  }
}

// Show user-friendly error for communication failures
async function showCommunicationError(tab, error) {
  try {
    // Log the error for debugging
    await logError('communication_failed', new Error(error), { 
      tabId: tab.id, 
      url: tab.url 
    });
    
    // Try to show a notification
    if (chrome.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Chat Sidebar Error',
        message: 'Failed to communicate with page. Try refreshing the page.'
      });
    }
    
    // Update extension badge to indicate error
    chrome.action.setBadgeText({ text: '!', tabId: tab.id });
    chrome.action.setBadgeBackgroundColor({ color: '#ff8800', tabId: tab.id });
    
    // Clear badge after 5 seconds
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '', tabId: tab.id });
    }, 5000);
    
  } catch (error) {
    console.error('Error showing communication error:', error);
  }
}

// Enhanced error logging system
async function logError(errorType, error, context = {}) {
  try {
    const errorLog = {
      type: errorType,
      message: error.message,
      stack: error.stack,
      timestamp: Date.now(),
      context: context,
      userAgent: navigator.userAgent,
      extensionVersion: chrome.runtime.getManifest().version
    };
    
    // Store error in local storage for debugging
    const errorKey = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await chrome.storage.local.set({ [errorKey]: errorLog });
    
    // Keep only the last 50 errors to prevent storage bloat
    await cleanupErrorLogs();
    
    console.error(`[${errorType}]`, error, context);
  } catch (logError) {
    console.error('Failed to log error:', logError);
  }
}

// Clean up old error logs
async function cleanupErrorLogs() {
  try {
    const allData = await chrome.storage.local.get();
    const errorKeys = Object.keys(allData).filter(key => key.startsWith('error_'));
    
    if (errorKeys.length > 50) {
      // Sort by timestamp (extract from key) and remove oldest
      errorKeys.sort();
      const keysToRemove = errorKeys.slice(0, errorKeys.length - 50);
      await chrome.storage.local.remove(keysToRemove);
    }
  } catch (error) {
    console.error('Error cleaning up error logs:', error);
  }
}

// Handle error reports from content scripts
async function handleErrorReport(errorData, tabId, sendResponse) {
  try {
    // Enhance error data with additional context
    const enhancedError = {
      ...errorData,
      tabId: tabId,
      reportedAt: Date.now(),
      source: 'content_script'
    };
    
    // Log the error using our existing error logging system
    await logError(errorData.type || 'content_script_error', new Error(errorData.message), enhancedError);
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error handling error report:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle storage info requests
async function handleGetStorageInfo(sendResponse) {
  try {
    const quotaInfo = await checkStorageQuota();
    const allData = await chrome.storage.local.get();
    
    // Count different types of data
    let sessionCount = 0;
    let messageCount = 0;
    let backupCount = 0;
    let errorCount = 0;
    
    for (const [key, value] of Object.entries(allData)) {
      if (key.startsWith('session_')) {
        sessionCount++;
        if (value.messages) {
          messageCount += value.messages.length;
        }
      } else if (key.startsWith('backup_')) {
        backupCount++;
      } else if (key.startsWith('error_')) {
        errorCount++;
      }
    }
    
    sendResponse({
      success: true,
      data: {
        quota: quotaInfo,
        counts: {
          sessions: sessionCount,
          messages: messageCount,
          backups: backupCount,
          errors: errorCount
        }
      }
    });
  } catch (error) {
    console.error('Error getting storage info:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle data export requests
async function handleExportData(sendResponse) {
  try {
    const exportData = await exportAllUserData();
    sendResponse({ success: true, data: exportData });
  } catch (error) {
    console.error('Error exporting data:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle data import requests
async function handleImportData(importData, sendResponse) {
  try {
    const result = await importUserData(importData);
    sendResponse({ success: true, data: result });
  } catch (error) {
    console.error('Error importing data:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle storage cleanup requests
async function handleCleanupStorage(sendResponse) {
  try {
    const beforeQuota = await checkStorageQuota();
    
    // Perform maintenance cleanup
    await performMaintenanceCleanup();
    await cleanupTabStates();
    
    // Clean up old backups
    const allData = await chrome.storage.local.get();
    const backupsBySession = {};
    
    for (const key of Object.keys(allData)) {
      if (key.startsWith('backup_')) {
        const sessionId = key.split('_')[1];
        if (!backupsBySession[sessionId]) {
          backupsBySession[sessionId] = [];
        }
        backupsBySession[sessionId].push(key);
      }
    }
    
    for (const sessionId of Object.keys(backupsBySession)) {
      await cleanupOldBackups(sessionId);
    }
    
    const afterQuota = await checkStorageQuota();
    
    sendResponse({
      success: true,
      data: {
        before: beforeQuota,
        after: afterQuota,
        freedBytes: beforeQuota.usedBytes - afterQuota.usedBytes
      }
    });
  } catch (error) {
    console.error('Error cleaning up storage:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleGetSidebarState(tabId, sendResponse) {
  try {
    // Get both global and tab-specific state
    const globalResult = await chrome.storage.local.get(['sidebarVisible', 'settings', 'currentSession']);
    const tabStateKey = `tabState_${tabId}`;
    const tabResult = await chrome.storage.local.get([tabStateKey]);
    
    const tabState = tabResult[tabStateKey] || {};
    
    sendResponse({
      success: true,
      data: {
        visible: tabState.visible !== undefined ? tabState.visible : (globalResult.sidebarVisible || false),
        settings: globalResult.settings || {
          sidebarWidth: 350,
          theme: 'light',
          autoScroll: true
        },
        sessionId: globalResult.currentSession || generateSessionId(),
        tabId: tabId,
        lastUpdate: tabState.lastUpdate || Date.now()
      }
    });
  } catch (error) {
    console.error('Error getting sidebar state:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleSetSidebarState(message, tabId, sendResponse) {
  try {
    const visible = message.visible || false;
    const url = message.url || '';
    const timestamp = message.timestamp || Date.now();
    
    // Update global state
    await chrome.storage.local.set({ sidebarVisible: visible });
    
    // Update tab-specific state for cross-navigation persistence
    if (tabId) {
      const tabStateKey = `tabState_${tabId}`;
      await chrome.storage.local.set({
        [tabStateKey]: {
          visible: visible,
          url: url,
          lastUpdate: timestamp
        }
      });
    }
    
    sendResponse({ 
      success: true, 
      data: { 
        visible: visible,
        tabId: tabId,
        timestamp: timestamp
      }
    });
  } catch (error) {
    console.error('Error setting sidebar state:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleToggleSidebar(message, tabId, sendResponse) {
  try {
    const visible = message.visible || false;
    
    // Update both global and tab-specific state
    await chrome.storage.local.set({ sidebarVisible: visible });
    
    if (tabId) {
      const tabStateKey = `tabState_${tabId}`;
      await chrome.storage.local.set({
        [tabStateKey]: {
          visible: visible,
          lastUpdate: Date.now()
        }
      });
    }
    
    sendResponse({ 
      success: true, 
      data: { 
        visible: visible,
        tabId: tabId
      }
    });
  } catch (error) {
    console.error('Error toggling sidebar:', error);
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

async function handleGetMessages(message, sendResponse) {
  try {
    // Extract parameters from message
    const { sessionId: requestedSessionId, offset = 0, limit = 50 } = message || {};
    
    // Get current session if not provided
    let sessionId = requestedSessionId;
    if (!sessionId) {
      const result = await chrome.storage.local.get(['currentSession']);
      sessionId = result.currentSession || generateSessionId();
    }
    
    // Retrieve messages for session with pagination
    const result = await getMessagesFromSessionPaginated(sessionId, offset, limit);
    
    sendResponse({ 
      success: true, 
      data: {
        messages: result.messages,
        sessionId: sessionId,
        total: result.total,
        hasMore: result.hasMore,
        offset: offset,
        limit: limit
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
    // Check storage quota before attempting to save
    const quotaCheck = await checkStorageQuota();
    if (!quotaCheck.hasSpace) {
      console.warn('Storage quota exceeded, attempting cleanup...');
      await performEmergencyCleanup();
      
      // Check again after cleanup
      const quotaCheckAfterCleanup = await checkStorageQuota();
      if (!quotaCheckAfterCleanup.hasSpace) {
        throw new Error('Storage quota exceeded and cleanup failed');
      }
    }
    
    // Get existing session data with retry mechanism
    const sessionKey = `session_${sessionId}`;
    const result = await getStorageWithRetry([sessionKey]);
    
    let sessionData = result[sessionKey] || {
      id: sessionId,
      messages: [],
      createdAt: Date.now(),
      lastActivity: Date.now()
    };
    
    // Validate message before adding
    if (!validateMessageData(message)) {
      throw new Error('Invalid message data');
    }
    
    // Add new message
    sessionData.messages.push(message);
    sessionData.lastActivity = Date.now();
    
    // Check storage limits and cleanup if necessary
    await checkStorageLimitsAndCleanup(sessionData);
    
    // Save updated session with retry mechanism
    await setStorageWithRetry({
      [sessionKey]: sessionData,
      currentSession: sessionId
    });
    
    console.log(`Message saved to session ${sessionId}:`, message.id);
    
    // Create backup if this is a significant session
    if (sessionData.messages.length % 50 === 0) {
      await createSessionBackup(sessionId, sessionData);
    }
    
  } catch (error) {
    console.error('Error saving message to session:', error);
    await logError('save_message_failed', error, { sessionId, messageId: message.id });
    throw error;
  }
}

// Paginated message retrieval for performance optimization
async function getMessagesFromSessionPaginated(sessionId, offset = 0, limit = 50) {
  try {
    const sessionKey = `session_${sessionId}`;
    const result = await getStorageWithRetry([sessionKey]);
    
    const sessionData = result[sessionKey];
    if (!sessionData) {
      console.log(`No session found for ID: ${sessionId}`);
      
      // Try to restore from backup
      const backupData = await restoreSessionFromBackup(sessionId);
      if (backupData && backupData.messages) {
        console.log(`Restored session ${sessionId} from backup`);
        return paginateMessages(backupData.messages, offset, limit);
      }
      
      return { messages: [], total: 0, hasMore: false };
    }
    
    // Validate session data integrity
    if (!validateSessionData(sessionData)) {
      console.warn(`Session data corrupted for ${sessionId}, attempting recovery...`);
      const recoveredData = await recoverCorruptedSession(sessionId, sessionData);
      return paginateMessages(recoveredData.messages || [], offset, limit);
    }
    
    return paginateMessages(sessionData.messages || [], offset, limit);
  } catch (error) {
    console.error('Error getting messages from session:', error);
    await logError('get_messages_failed', error, { sessionId });
    
    // Try to recover from backup as last resort
    try {
      const backupData = await restoreSessionFromBackup(sessionId);
      if (backupData && backupData.messages) {
        return paginateMessages(backupData.messages, offset, limit);
      }
    } catch (backupError) {
      console.error('Backup recovery also failed:', backupError);
    }
    
    return { messages: [], total: 0, hasMore: false };
  }
}

// Helper function to paginate messages
function paginateMessages(messages, offset, limit) {
  const total = messages.length;
  
  // For chat messages, we typically want newest first, so reverse the array
  const sortedMessages = [...messages].sort((a, b) => b.timestamp - a.timestamp);
  
  // Apply pagination
  const startIndex = Math.max(0, offset);
  const endIndex = Math.min(total, startIndex + limit);
  const paginatedMessages = sortedMessages.slice(startIndex, endIndex);
  
  // Reverse back to chronological order for display
  const chronologicalMessages = paginatedMessages.reverse();
  
  return {
    messages: chronologicalMessages,
    total: total,
    hasMore: endIndex < total,
    offset: offset,
    limit: limit
  };
}

async function getMessagesFromSession(sessionId) {
  try {
    const sessionKey = `session_${sessionId}`;
    const result = await getStorageWithRetry([sessionKey]);
    
    const sessionData = result[sessionKey];
    if (!sessionData) {
      console.log(`No session found for ID: ${sessionId}`);
      
      // Try to restore from backup
      const backupData = await restoreSessionFromBackup(sessionId);
      if (backupData && backupData.messages) {
        console.log(`Restored session ${sessionId} from backup`);
        return backupData.messages;
      }
      
      return [];
    }
    
    // Validate session data integrity
    if (!validateSessionData(sessionData)) {
      console.warn(`Session data corrupted for ${sessionId}, attempting recovery...`);
      const recoveredData = await recoverCorruptedSession(sessionId, sessionData);
      return recoveredData.messages || [];
    }
    
    return sessionData.messages || [];
  } catch (error) {
    console.error('Error getting messages from session:', error);
    await logError('get_messages_failed', error, { sessionId });
    
    // Try to recover from backup as last resort
    try {
      const backupData = await restoreSessionFromBackup(sessionId);
      if (backupData && backupData.messages) {
        console.log(`Recovered session ${sessionId} from backup after error`);
        return backupData.messages;
      }
    } catch (backupError) {
      console.error('Backup recovery also failed:', backupError);
    }
    
    throw error;
  }
}

async function checkStorageLimitsAndCleanup(sessionData) {
  try {
    // Chrome storage.local has a limit of ~5MB per extension
    // Keep messages under a reasonable limit per session
    const MAX_MESSAGES_PER_SESSION = 1000;
    
    if (sessionData.messages.length > MAX_MESSAGES_PER_SESSION) {
      // Create backup before cleanup
      await createSessionBackup(sessionData.id, sessionData);
      
      // Remove oldest messages, keeping the most recent ones
      const messagesToKeep = Math.floor(MAX_MESSAGES_PER_SESSION * 0.8); // Keep 80%
      const removedMessages = sessionData.messages.slice(0, sessionData.messages.length - messagesToKeep);
      sessionData.messages = sessionData.messages.slice(-messagesToKeep);
      
      console.log(`Cleaned up ${removedMessages.length} old messages, kept ${messagesToKeep} most recent messages`);
      await logError('session_cleanup', new Error('Session message limit reached'), {
        sessionId: sessionData.id,
        removedCount: removedMessages.length,
        keptCount: messagesToKeep
      });
    }
    
    // Check overall storage usage
    const quotaInfo = await checkStorageQuota();
    
    if (!quotaInfo.hasSpace) {
      console.warn(`Storage usage: ${quotaInfo.usedBytes} / ${quotaInfo.totalBytes} bytes`);
      await cleanupOldSessions();
      
      // Check again after cleanup
      const quotaAfterCleanup = await checkStorageQuota();
      if (!quotaAfterCleanup.hasSpace) {
        await performEmergencyCleanup();
      }
    }
  } catch (error) {
    console.error('Error checking storage limits:', error);
    await logError('storage_limit_check_failed', error);
  }
}

// Check storage quota and usage
async function checkStorageQuota() {
  try {
    const bytesInUse = await chrome.storage.local.getBytesInUse();
    const STORAGE_LIMIT = 4.5 * 1024 * 1024; // 4.5MB limit (leaving 0.5MB buffer)
    
    return {
      usedBytes: bytesInUse,
      totalBytes: STORAGE_LIMIT,
      availableBytes: STORAGE_LIMIT - bytesInUse,
      hasSpace: bytesInUse < STORAGE_LIMIT,
      usagePercentage: (bytesInUse / STORAGE_LIMIT) * 100
    };
  } catch (error) {
    console.error('Error checking storage quota:', error);
    return {
      usedBytes: 0,
      totalBytes: 0,
      availableBytes: 0,
      hasSpace: false,
      usagePercentage: 100
    };
  }
}

// Storage operations with retry mechanism
async function getStorageWithRetry(keys, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await chrome.storage.local.get(keys);
    } catch (error) {
      console.warn(`Storage get attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw new Error(`Storage get failed after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
    }
  }
}

async function setStorageWithRetry(data, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await chrome.storage.local.set(data);
      return;
    } catch (error) {
      console.warn(`Storage set attempt ${attempt} failed:`, error.message);
      
      if (error.message.includes('QUOTA_EXCEEDED')) {
        // Handle quota exceeded error specifically
        console.error('Storage quota exceeded during set operation');
        await performEmergencyCleanup();
        
        if (attempt === maxRetries) {
          throw new Error('Storage quota exceeded and emergency cleanup failed');
        }
      } else if (attempt === maxRetries) {
        throw new Error(`Storage set failed after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
    }
  }
}

// Validate message data integrity
function validateMessageData(message) {
  try {
    if (!message || typeof message !== 'object') {
      return false;
    }
    
    // Required fields
    if (!message.id || !message.content || !message.timestamp) {
      return false;
    }
    
    // Type validation
    if (typeof message.id !== 'string' || typeof message.content !== 'string') {
      return false;
    }
    
    if (typeof message.timestamp !== 'number' || message.timestamp <= 0) {
      return false;
    }
    
    // Content length validation
    if (message.content.length > 10000) { // 10KB limit per message
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error validating message data:', error);
    return false;
  }
}

// Validate session data integrity
function validateSessionData(sessionData) {
  try {
    if (!sessionData || typeof sessionData !== 'object') {
      return false;
    }
    
    // Required fields
    if (!sessionData.id || !sessionData.messages || !Array.isArray(sessionData.messages)) {
      return false;
    }
    
    // Validate timestamps
    if (typeof sessionData.createdAt !== 'number' || typeof sessionData.lastActivity !== 'number') {
      return false;
    }
    
    // Validate each message
    for (const message of sessionData.messages) {
      if (!validateMessageData(message)) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error validating session data:', error);
    return false;
  }
}

// Emergency cleanup when storage is critically full
async function performEmergencyCleanup() {
  try {
    console.log('Performing emergency storage cleanup...');
    
    // Get all data
    const allData = await chrome.storage.local.get();
    const sessions = [];
    const errors = [];
    const tabStates = [];
    
    // Categorize data
    for (const [key, value] of Object.entries(allData)) {
      if (key.startsWith('session_')) {
        sessions.push({ key, data: value, lastActivity: value.lastActivity || 0 });
      } else if (key.startsWith('error_')) {
        errors.push({ key, timestamp: extractTimestampFromKey(key) });
      } else if (key.startsWith('tabState_')) {
        tabStates.push({ key, data: value });
      }
    }
    
    // Remove all error logs first
    if (errors.length > 0) {
      const errorKeys = errors.map(e => e.key);
      await chrome.storage.local.remove(errorKeys);
      console.log(`Emergency cleanup: Removed ${errorKeys.length} error logs`);
    }
    
    // Remove old tab states
    if (tabStates.length > 0) {
      const tabStateKeys = tabStates.map(t => t.key);
      await chrome.storage.local.remove(tabStateKeys);
      console.log(`Emergency cleanup: Removed ${tabStateKeys.length} tab states`);
    }
    
    // Remove oldest sessions, keep only the 3 most recent
    if (sessions.length > 3) {
      sessions.sort((a, b) => b.lastActivity - a.lastActivity);
      const sessionsToRemove = sessions.slice(3);
      
      // Create backups before removing
      for (const session of sessionsToRemove) {
        await createSessionBackup(session.data.id, session.data);
      }
      
      const sessionKeysToRemove = sessionsToRemove.map(s => s.key);
      await chrome.storage.local.remove(sessionKeysToRemove);
      console.log(`Emergency cleanup: Removed ${sessionKeysToRemove.length} old sessions`);
    }
    
    // Truncate remaining sessions to 100 messages each
    const remainingSessions = sessions.slice(0, 3);
    for (const session of remainingSessions) {
      if (session.data.messages && session.data.messages.length > 100) {
        // Create backup before truncating
        await createSessionBackup(session.data.id, session.data);
        
        session.data.messages = session.data.messages.slice(-100);
        await chrome.storage.local.set({ [session.key]: session.data });
        console.log(`Emergency cleanup: Truncated session ${session.data.id} to 100 messages`);
      }
    }
    
    console.log('Emergency cleanup completed');
    
  } catch (error) {
    console.error('Error during emergency cleanup:', error);
    throw error;
  }
}

// Extract timestamp from error key
function extractTimestampFromKey(key) {
  try {
    const parts = key.split('_');
    return parseInt(parts[1]) || 0;
  } catch (error) {
    return 0;
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

// Handle tab events for better state management
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  try {
    // Clean up tab-specific state when tab is closed
    const tabStateKey = `tabState_${tabId}`;
    await chrome.storage.local.remove([tabStateKey]);
    console.log(`Cleaned up state for closed tab: ${tabId}`);
  } catch (error) {
    console.error('Error cleaning up tab state:', error);
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  try {
    // Handle navigation within the same tab
    if (changeInfo.status === 'complete' && tab.url) {
      // Check if content script can be injected on this URL
      if (!canInjectContentScript(tab.url)) {
        // Clean up state for restricted pages
        const tabStateKey = `tabState_${tabId}`;
        await chrome.storage.local.remove([tabStateKey]);
        return;
      }
      
      // Get current tab state
      const tabStateKey = `tabState_${tabId}`;
      const result = await chrome.storage.local.get([tabStateKey]);
      const tabState = result[tabStateKey];
      
      // If sidebar was visible, notify content script to restore it
      if (tabState && tabState.visible) {
        try {
          await chrome.tabs.sendMessage(tabId, {
            action: 'setSidebarState',
            visible: true
          });
        } catch (messageError) {
          // Content script might not be ready yet, that's okay
          console.log('Content script not ready for tab:', tabId);
        }
      }
    }
  } catch (error) {
    console.error('Error handling tab update:', error);
  }
});

// Periodic cleanup of old tab states
async function cleanupTabStates() {
  try {
    console.log('Cleaning up old tab states...');
    
    // Get all current tabs
    const tabs = await chrome.tabs.query({});
    const currentTabIds = new Set(tabs.map(tab => tab.id));
    
    // Get all storage data
    const allData = await chrome.storage.local.get();
    const keysToRemove = [];
    
    // Find tab state keys for tabs that no longer exist
    for (const key of Object.keys(allData)) {
      if (key.startsWith('tabState_')) {
        const tabId = parseInt(key.replace('tabState_', ''));
        if (!currentTabIds.has(tabId)) {
          keysToRemove.push(key);
        }
      }
    }
    
    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
      console.log(`Cleaned up ${keysToRemove.length} old tab states`);
    }
  } catch (error) {
    console.error('Error cleaning up tab states:', error);
  }
}

// Run maintenance cleanup on extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Chrome Chat Sidebar extension started');
  // Run cleanup after a short delay to avoid blocking startup
  setTimeout(() => {
    performMaintenanceCleanup();
    cleanupTabStates();
  }, 5000);
});

// Backup and restore functionality
async function createSessionBackup(sessionId, sessionData) {
  try {
    // Create compressed backup
    const backupData = {
      id: sessionId,
      messages: sessionData.messages || [],
      createdAt: sessionData.createdAt,
      lastActivity: sessionData.lastActivity,
      backupCreatedAt: Date.now(),
      version: '1.0'
    };
    
    // Store backup with a different key pattern
    const backupKey = `backup_${sessionId}_${Date.now()}`;
    
    // Only keep essential message data to save space
    const compressedMessages = backupData.messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      timestamp: msg.timestamp,
      type: msg.type
    }));
    
    const compressedBackup = {
      ...backupData,
      messages: compressedMessages
    };
    
    await chrome.storage.local.set({ [backupKey]: compressedBackup });
    console.log(`Created backup for session ${sessionId}: ${backupKey}`);
    
    // Clean up old backups for this session (keep only the 3 most recent)
    await cleanupOldBackups(sessionId);
    
  } catch (error) {
    console.error('Error creating session backup:', error);
    await logError('backup_creation_failed', error, { sessionId });
  }
}

async function restoreSessionFromBackup(sessionId) {
  try {
    // Find the most recent backup for this session
    const allData = await chrome.storage.local.get();
    const backups = [];
    
    for (const [key, value] of Object.entries(allData)) {
      if (key.startsWith(`backup_${sessionId}_`)) {
        const timestamp = extractTimestampFromBackupKey(key);
        backups.push({ key, data: value, timestamp });
      }
    }
    
    if (backups.length === 0) {
      console.log(`No backups found for session ${sessionId}`);
      return null;
    }
    
    // Sort by timestamp (most recent first)
    backups.sort((a, b) => b.timestamp - a.timestamp);
    const mostRecentBackup = backups[0];
    
    console.log(`Restoring session ${sessionId} from backup: ${mostRecentBackup.key}`);
    return mostRecentBackup.data;
    
  } catch (error) {
    console.error('Error restoring session from backup:', error);
    await logError('backup_restore_failed', error, { sessionId });
    return null;
  }
}

async function cleanupOldBackups(sessionId) {
  try {
    const allData = await chrome.storage.local.get();
    const backups = [];
    
    for (const [key, value] of Object.entries(allData)) {
      if (key.startsWith(`backup_${sessionId}_`)) {
        const timestamp = extractTimestampFromBackupKey(key);
        backups.push({ key, timestamp });
      }
    }
    
    // Keep only the 3 most recent backups
    if (backups.length > 3) {
      backups.sort((a, b) => b.timestamp - a.timestamp);
      const backupsToRemove = backups.slice(3);
      const keysToRemove = backupsToRemove.map(b => b.key);
      
      await chrome.storage.local.remove(keysToRemove);
      console.log(`Cleaned up ${keysToRemove.length} old backups for session ${sessionId}`);
    }
  } catch (error) {
    console.error('Error cleaning up old backups:', error);
  }
}

function extractTimestampFromBackupKey(key) {
  try {
    const parts = key.split('_');
    return parseInt(parts[parts.length - 1]) || 0;
  } catch (error) {
    return 0;
  }
}

// Recover corrupted session data
async function recoverCorruptedSession(sessionId, corruptedData) {
  try {
    console.log(`Attempting to recover corrupted session: ${sessionId}`);
    
    // Try to restore from backup first
    const backupData = await restoreSessionFromBackup(sessionId);
    if (backupData && validateSessionData(backupData)) {
      console.log(`Successfully recovered session ${sessionId} from backup`);
      
      // Save the recovered data back to the main session
      const sessionKey = `session_${sessionId}`;
      await chrome.storage.local.set({ [sessionKey]: backupData });
      
      return backupData;
    }
    
    // If no backup available, try to salvage what we can from corrupted data
    const recoveredData = {
      id: sessionId,
      messages: [],
      createdAt: corruptedData.createdAt || Date.now(),
      lastActivity: Date.now()
    };
    
    // Try to recover valid messages
    if (corruptedData.messages && Array.isArray(corruptedData.messages)) {
      for (const message of corruptedData.messages) {
        if (validateMessageData(message)) {
          recoveredData.messages.push(message);
        }
      }
    }
    
    console.log(`Recovered ${recoveredData.messages.length} messages from corrupted session ${sessionId}`);
    
    // Save the recovered data
    const sessionKey = `session_${sessionId}`;
    await chrome.storage.local.set({ [sessionKey]: recoveredData });
    
    // Log the recovery
    await logError('session_recovery', new Error('Session data corrupted and recovered'), {
      sessionId,
      originalMessageCount: corruptedData.messages?.length || 0,
      recoveredMessageCount: recoveredData.messages.length
    });
    
    return recoveredData;
    
  } catch (error) {
    console.error('Error recovering corrupted session:', error);
    await logError('session_recovery_failed', error, { sessionId });
    
    // Return minimal session data as last resort
    return {
      id: sessionId,
      messages: [],
      createdAt: Date.now(),
      lastActivity: Date.now()
    };
  }
}

// Export/Import functionality for user data management
async function exportAllUserData() {
  try {
    const allData = await chrome.storage.local.get();
    const exportData = {
      exportedAt: Date.now(),
      version: '1.0',
      sessions: {},
      settings: {},
      metadata: {
        extensionVersion: chrome.runtime.getManifest().version,
        userAgent: navigator.userAgent
      }
    };
    
    // Extract sessions
    for (const [key, value] of Object.entries(allData)) {
      if (key.startsWith('session_')) {
        exportData.sessions[key] = value;
      } else if (key === 'settings' || key === 'currentSession' || key === 'sidebarVisible') {
        exportData.settings[key] = value;
      }
    }
    
    return exportData;
  } catch (error) {
    console.error('Error exporting user data:', error);
    throw error;
  }
}

async function importUserData(importData) {
  try {
    if (!importData || typeof importData !== 'object') {
      throw new Error('Invalid import data format');
    }
    
    // Validate import data structure
    if (!importData.sessions || !importData.exportedAt) {
      throw new Error('Import data missing required fields');
    }
    
    // Create backup of current data before import
    const currentData = await exportAllUserData();
    const backupKey = `import_backup_${Date.now()}`;
    await chrome.storage.local.set({ [backupKey]: currentData });
    
    // Import sessions
    const importPromises = [];
    for (const [sessionKey, sessionData] of Object.entries(importData.sessions)) {
      if (validateSessionData(sessionData)) {
        importPromises.push(chrome.storage.local.set({ [sessionKey]: sessionData }));
      }
    }
    
    // Import settings
    if (importData.settings) {
      for (const [settingKey, settingValue] of Object.entries(importData.settings)) {
        importPromises.push(chrome.storage.local.set({ [settingKey]: settingValue }));
      }
    }
    
    await Promise.all(importPromises);
    console.log('User data import completed successfully');
    
    return { success: true, importedSessions: Object.keys(importData.sessions).length };
    
  } catch (error) {
    console.error('Error importing user data:', error);
    await logError('data_import_failed', error);
    throw error;
  }
}

// Run tab state cleanup periodically
setInterval(cleanupTabStates, 5 * 60 * 1000); // Every 5 minutes

// Run backup cleanup periodically
setInterval(async () => {
  try {
    // Clean up old backups across all sessions
    const allData = await chrome.storage.local.get();
    const backupsBySession = {};
    
    for (const key of Object.keys(allData)) {
      if (key.startsWith('backup_')) {
        const sessionId = key.split('_')[1];
        if (!backupsBySession[sessionId]) {
          backupsBySession[sessionId] = [];
        }
        backupsBySession[sessionId].push(key);
      }
    }
    
    for (const sessionId of Object.keys(backupsBySession)) {
      await cleanupOldBackups(sessionId);
    }
  } catch (error) {
    console.error('Error in periodic backup cleanup:', error);
  }
}, 30 * 60 * 1000); // Every 30 minutes