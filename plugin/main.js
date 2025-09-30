/**
 * Insomnia MCP Auto-Refresh Plugin
 *
 * Polls MCP HTTP endpoint for changes and auto-imports collections
 * Much more reliable than file watching approach
 */

const MCP_BASE_URL = 'http://localhost:3847';
const POLL_INTERVAL = 5000; // 5 seconds

// Global state
let pollTimer = null;
let lastKnownHash = null;
let isPolling = false;

/**
 * Fetch data from MCP endpoint
 */
async function fetchFromMCP(endpoint) {
  try {
    const response = await fetch(`${MCP_BASE_URL}${endpoint}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.log(`[MCP Auto-Refresh] Failed to fetch ${endpoint}:`, error.message);
    return null;
  }
}

/**
 * Check if MCP collections have changed
 */
async function checkForChanges() {
  const hashData = await fetchFromMCP('/collections/hash');
  if (!hashData) {
    return false;
  }

  if (lastKnownHash === null) {
    lastKnownHash = hashData.hash;
    console.log('[MCP Auto-Refresh] Initial hash stored');
    return false;
  }

  if (hashData.hash !== lastKnownHash) {
    console.log('[MCP Auto-Refresh] Collections changed!');
    lastKnownHash = hashData.hash;
    return true;
  }

  return false;
}

/**
 * Import collections from MCP
 */
async function importFromMCP(context) {
  try {
    const exportData = await fetchFromMCP('/collections/export');
    if (!exportData) {
      throw new Error('Failed to fetch collections');
    }

    console.log('[MCP Auto-Refresh] Importing collections...');

    // Use Insomnia's data import functionality
    const imported = await context.data.import.raw(JSON.stringify(exportData));

    if (imported && imported.length > 0) {
      return `Imported ${imported.length} items from MCP`;
    } else {
      return 'No new items to import';
    }
  } catch (error) {
    console.error('[MCP Auto-Refresh] Import failed:', error);
    throw error;
  }
}

/**
 * Start polling for changes
 */
function startPolling(context) {
  if (isPolling) {
    return;
  }

  isPolling = true;
  console.log('[MCP Auto-Refresh] Started polling for changes');

  pollTimer = setInterval(async () => {
    try {
      const hasChanges = await checkForChanges();
      if (hasChanges) {
        // Show notification about detected changes
        context.app.alert(
          'MCP Changes Detected',
          'Collections have been updated. Click "Import from MCP" to sync changes.'
        );
      }
    } catch (error) {
      console.error('[MCP Auto-Refresh] Polling error:', error);
    }
  }, POLL_INTERVAL);
}

/**
 * Stop polling for changes
 */
function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  isPolling = false;
  console.log('[MCP Auto-Refresh] Stopped polling');
}

/**
 * Check if MCP server is available
 */
async function checkMCPConnection() {
  const health = await fetchFromMCP('/health');
  return health !== null;
}

// Workspace Actions
module.exports.workspaceActions = [
  {
    label: 'Import from MCP',
    icon: 'fa-download',
    action: async (context) => {
      try {
        const result = await importFromMCP(context);
        context.app.alert('Import Successful', result);
      } catch (error) {
        context.app.alert('Import Failed', `Error: ${error.message}`);
      }
    }
  },
  {
    label: 'Toggle MCP Auto-Sync',
    icon: 'fa-sync',
    action: async (context) => {
      if (isPolling) {
        stopPolling();
        context.app.alert('Auto-Sync', 'MCP auto-sync disabled');
      } else {
        const connected = await checkMCPConnection();
        if (connected) {
          startPolling(context);
          context.app.alert('Auto-Sync', 'MCP auto-sync enabled');
        } else {
          context.app.alert('Connection Failed', `Cannot connect to MCP server at ${MCP_BASE_URL}`);
        }
      }
    }
  },
  {
    label: 'Check MCP Status',
    icon: 'fa-info-circle',
    action: async (context) => {
      const connected = await checkMCPConnection();
      const status = connected ? 'Connected' : 'Disconnected';
      const polling = isPolling ? 'Auto-sync enabled' : 'Auto-sync disabled';

      context.app.alert('MCP Status', `Server: ${status}\nPolling: ${polling}\nURL: ${MCP_BASE_URL}`);
    }
  }
];

// Request Hooks - Initialize plugin
module.exports.requestHooks = [
  async (context) => {
    // Auto-start polling if MCP server is available
    setTimeout(async () => {
      const connected = await checkMCPConnection();
      if (connected && !isPolling) {
        console.log('[MCP Auto-Refresh] MCP server detected, starting auto-sync');
        startPolling(context);
      }
    }, 2000); // Wait 2 seconds for everything to initialize
  }
];

// Template Tags
module.exports.templateTags = [
  {
    name: 'mcp-status',
    displayName: 'MCP Status',
    description: 'Shows MCP connection and sync status',
    args: [],
    async run() {
      const connected = await checkMCPConnection();
      const status = connected ? '🟢 Connected' : '🔴 Disconnected';
      const sync = isPolling ? ' (Auto-sync ON)' : ' (Auto-sync OFF)';
      return status + sync;
    }
  },
  {
    name: 'mcp-url',
    displayName: 'MCP Server URL',
    description: 'Returns the MCP server URL',
    args: [],
    async run() {
      return MCP_BASE_URL;
    }
  }
];

// Clean up on plugin unload
if (typeof process !== 'undefined') {
  process.on('exit', stopPolling);
  process.on('SIGINT', stopPolling);
  process.on('SIGTERM', stopPolling);
}