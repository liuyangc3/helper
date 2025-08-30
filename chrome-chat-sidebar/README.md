# Chrome Chat Sidebar Extension

A Chrome browser extension that provides a chat interface in a sidebar, similar to Slack's UI.

## Project Structure

```
chrome-chat-sidebar/
├── manifest.json          # Extension manifest (Manifest V3)
├── background.js          # Background service worker
├── content.js            # Content script for sidebar injection
├── styles/
│   └── sidebar.css       # Sidebar styling with CSS isolation
├── icons/
│   ├── icon16.png        # 16x16 extension icon
│   ├── icon32.png        # 32x32 extension icon
│   ├── icon48.png        # 48x48 extension icon
│   └── icon128.png       # 128x128 extension icon
└── README.md             # This file
```

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the `chrome-chat-sidebar` directory
4. The extension icon should appear in the Chrome toolbar

## Usage

1. Click the extension icon in the Chrome toolbar to toggle the sidebar
2. The sidebar will appear on the right side of any webpage
3. Use the message input at the bottom to type messages
4. Press Enter to send messages, Shift+Enter for new lines
5. Click the × button or the extension icon again to close the sidebar

## Features

- **Manifest V3 Compliance**: Uses the latest Chrome extension standard
- **CSS Isolation**: Prevents conflicts with host page styles
- **Responsive Design**: Adapts to different screen sizes
- **Persistent State**: Maintains sidebar state across page navigation
- **Modern UI**: Clean, Slack-like interface design

## Development

This extension is built with vanilla JavaScript and follows Chrome Extension Manifest V3 standards. The architecture includes:

- **Background Service Worker**: Handles extension lifecycle and storage
- **Content Script**: Manages sidebar injection and user interactions
- **Storage API**: Persists chat data and extension settings

## Requirements Addressed

- **Requirement 1.1**: Extension icon click toggles sidebar display
- **Requirement 5.1**: Works consistently across different websites