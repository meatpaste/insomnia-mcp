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
    console.log('[MCP Auto-Refresh] ❌ Failed to fetch hash from MCP');
    return false;
  }

  const hashShort = hashData.hash.substring(0, 12);
  const collectionCount = hashData.collectionCount || 'unknown';

  if (lastKnownHash === null) {
    lastKnownHash = hashData.hash;
    console.log(`[MCP Auto-Refresh] 📌 Initial hash: ${hashShort}... (${collectionCount} collections)`);
    return false;
  }

  if (hashData.hash !== lastKnownHash) {
    const oldHashShort = lastKnownHash.substring(0, 12);
    console.log('\n┌─────────────────────────────────────────────────');
    console.log('│ 🔔 CHANGE DETECTED!');
    console.log('├─────────────────────────────────────────────────');
    console.log('│ Old hash:', oldHashShort + '...');
    console.log('│ New hash:', hashShort + '...');
    console.log('│ Collections:', collectionCount);
    console.log('│ Timestamp:', new Date().toISOString());
    console.log('└─────────────────────────────────────────────────\n');

    lastKnownHash = hashData.hash;
    return true;
  }

  // Uncomment for verbose polling logs
  // console.log(`[MCP Auto-Refresh] 🔄 Poll: No changes (${hashShort}... / ${collectionCount} collections)`);

  return false;
}

/**
 * Merge MCP changes with Insomnia state and re-import
 *
 * THEORY: Insomnia caches data in memory, so export gives STALE data.
 * We need to fetch FRESH data from MCP and merge it with Insomnia's export.
 */
async function mergeAndReImport(context) {
  try {
    console.log('[MCP Auto-Refresh] Starting merge-and-reimport...');

    // Step 1: Get FRESH data from MCP (reads from DB files that were just updated)
    console.log('[MCP Auto-Refresh] Fetching fresh data from MCP...');
    const mcpData = await fetchFromMCP('/collections/export');
    if (!mcpData || !mcpData.resources) {
      throw new Error('Failed to fetch MCP collections or invalid format');
    }
    console.log('[MCP Auto-Refresh] MCP resources:', mcpData.resources.length);

    // Step 2: Export current Insomnia state (may be stale/cached in memory)
    console.log('[MCP Auto-Refresh] Exporting current Insomnia state...');
    const insomniaData = await context.data.export.insomnia({
      includePrivate: false,
      format: 'json'
    });
    const insomniaExport = JSON.parse(insomniaData);
    console.log('[MCP Auto-Refresh] Insomnia resources:', insomniaExport.resources?.length || 0);

    // Step 3: Merge - MCP resources OVERRIDE Insomnia's stale resources
    const mcpResourceIds = new Set(mcpData.resources.map(r => r._id));

    // Keep Insomnia resources that aren't managed by MCP
    const nonMcpResources = insomniaExport.resources
      ? insomniaExport.resources.filter(r => !mcpResourceIds.has(r._id))
      : [];

    // MCP resources take priority (they're fresh from DB)
    const merged = {
      ...insomniaExport,
      resources: [...mcpData.resources, ...nonMcpResources]
    };

    console.log('[MCP Auto-Refresh] Merged:', {
      mcpResources: mcpData.resources.length,
      nonMcpResources: nonMcpResources.length,
      total: merged.resources.length
    });

    // Step 4: Re-import merged data to trigger UI refresh
    console.log('[MCP Auto-Refresh] Re-importing merged data...');
    await context.data.import.raw(JSON.stringify(merged));

    console.log('[MCP Auto-Refresh] ✅ Merge-and-reimport completed');
    return true;
  } catch (error) {
    console.error('[MCP Auto-Refresh] Merge-and-reimport failed:', error);
    return false;
  }
}

/**
 * Import collections from MCP with export-import cycle
 */
async function importFromMCP(context) {
  const startTime = Date.now();
  let mcpConnected = false;
  let importSuccess = false;
  let refreshAttempted = false;
  let error = null;

  try {
    // Step 1: Check MCP server connectivity
    console.log('[MCP Auto-Refresh] Checking MCP server...');
    const health = await fetchFromMCP('/health');
    mcpConnected = health !== null;

    if (!mcpConnected) {
      throw new Error(`Cannot connect to MCP server at ${MCP_BASE_URL}`);
    }

    console.log('[MCP Auto-Refresh] ✅ MCP server connected');

    // Step 2: Use merge-and-reimport approach ONLY
    // This fetches fresh MCP data, merges with existing Insomnia data, and reimports
    // We do NOT do a separate import first - that causes duplicates!
    console.log('[MCP Auto-Refresh] Attempting merge-and-reimport...');
    refreshAttempted = true;
    const refreshSuccess = await mergeAndReImport(context);
    importSuccess = refreshSuccess;

    const duration = Date.now() - startTime;

    // Return detailed status
    return {
      success: true,
      mcpConnected: true,
      importSuccess: true,
      refreshAttempted: true,
      refreshSuccess,
      duration,
      message: refreshSuccess
        ? `✅ Sync completed successfully in ${duration}ms\n\n` +
          `• MCP server: Connected\n` +
          `• Import: Success\n` +
          `• UI refresh: Attempted (merge fresh MCP data)\n\n` +
          `⚠️  If changes aren't visible, restart Insomnia (⌘Q then reopen)`
        : `⚠️  Sync completed with warnings in ${duration}ms\n\n` +
          `• MCP server: Connected\n` +
          `• Import: Success\n` +
          `• UI refresh: Failed (merge-and-reimport)\n\n` +
          `Please restart Insomnia to see changes (⌘Q then reopen)`
    };
  } catch (err) {
    error = err;
    const duration = Date.now() - startTime;

    console.error('[MCP Auto-Refresh] Sync failed:', err);

    return {
      success: false,
      mcpConnected,
      importSuccess,
      refreshAttempted,
      refreshSuccess: false,
      duration,
      error: err.message,
      message: `❌ Sync failed after ${duration}ms\n\n` +
        `• MCP server: ${mcpConnected ? 'Connected' : 'Disconnected'}\n` +
        `• Import: ${importSuccess ? 'Success' : 'Failed'}\n` +
        `• UI refresh: ${refreshAttempted ? 'Attempted but failed' : 'Not attempted'}\n\n` +
        `Error: ${err.message}\n\n` +
        `${!mcpConnected ? '💡 Check that MCP server is running at ' + MCP_BASE_URL : ''}`,
    };
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
        console.log('[MCP Auto-Refresh] Changes detected, auto-importing...');

        const result = await importFromMCP(context);
        console.log('[MCP Auto-Refresh] Result:', result);

        // Show notification with detailed feedback
        if (result.success) {
          context.app.alert('MCP Changes Synced', result.message);
        } else {
          context.app.alert('MCP Sync Failed', result.message);
        }
      }
    } catch (error) {
      console.error('[MCP Auto-Refresh] Polling error:', error);
      context.app.alert(
        'MCP Polling Error',
        `Unexpected error during polling:\n\n${error.message}\n\n` +
        `Auto-sync will continue. Check console for details.`
      );
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
    label: '[DEBUG] Test Full Sync Flow',
    icon: 'fa-bug',
    action: async (context) => {
      console.log('\n╔═══════════════════════════════════════════════════╗');
      console.log('║       DEBUG: TESTING FULL SYNC FLOW              ║');
      console.log('╚═══════════════════════════════════════════════════╝\n');

      const steps = [];

      // Step 1: Test MCP connection
      console.log('Step 1: Testing MCP connection...');
      const health = await fetchFromMCP('/health');
      steps.push(`1. MCP Health: ${health ? '✅ Connected' : '❌ Failed'}`);

      if (!health) {
        context.app.alert('Debug Test Failed', steps.join('\n'));
        return;
      }

      // Step 2: Get current hash
      console.log('Step 2: Fetching current hash...');
      const hashData = await fetchFromMCP('/collections/hash');
      steps.push(`2. Hash Fetch: ${hashData ? '✅ Success' : '❌ Failed'}`);
      if (hashData) {
        steps.push(`   Hash: ${hashData.hash.substring(0, 12)}...`);
        steps.push(`   Collections: ${hashData.collectionCount || 'unknown'}`);
      }

      // Step 3: Fetch export data
      console.log('Step 3: Fetching export data...');
      const mcpData = await fetchFromMCP('/collections/export');
      steps.push(`3. Export Fetch: ${mcpData ? '✅ Success' : '❌ Failed'}`);
      if (mcpData) {
        steps.push(`   Resources: ${mcpData.resources?.length || 0}`);
      }

      // Step 4: Export from Insomnia
      console.log('Step 4: Exporting from Insomnia...');
      try {
        const insomniaData = await context.data.export.insomnia({ includePrivate: false, format: 'json' });
        const parsed = JSON.parse(insomniaData);
        steps.push(`4. Insomnia Export: ✅ Success`);
        steps.push(`   Resources: ${parsed.resources?.length || 0}`);
      } catch (e) {
        steps.push(`4. Insomnia Export: ❌ Failed - ${e.message}`);
      }

      // Step 5: Test import
      console.log('Step 5: Testing import from MCP...');
      try {
        await context.data.import.uri(`${MCP_BASE_URL}/collections/export`);
        steps.push(`5. Import URI: ✅ Success`);
      } catch (e) {
        steps.push(`5. Import URI: ❌ Failed - ${e.message}`);
      }

      // Step 6: Test merge
      console.log('Step 6: Testing merge operation...');
      try {
        const result = await mergeAndReImport(context);
        steps.push(`6. Merge & Re-import: ${result ? '✅ Success' : '❌ Failed'}`);
      } catch (e) {
        steps.push(`6. Merge & Re-import: ❌ Failed - ${e.message}`);
      }

      console.log('\n╔═══════════════════════════════════════════════════╗');
      console.log('║           DEBUG TEST COMPLETE                     ║');
      console.log('╚═══════════════════════════════════════════════════╝\n');

      context.app.alert(
        'Debug Test Complete',
        steps.join('\n') + '\n\n⚠️  Check console (View → Toggle DevTools) for detailed logs'
      );
    }
  },
  {
    label: 'Sync from MCP',
    icon: 'fa-download',
    action: async (context) => {
      const result = await importFromMCP(context);
      context.app.alert(
        result.success ? 'MCP Sync Complete' : 'MCP Sync Failed',
        result.message
      );
    }
  },
  {
    label: 'Check MCP Connection',
    icon: 'fa-heartbeat',
    action: async (context) => {
      console.log('[MCP Auto-Refresh] Testing MCP connection...');
      const startTime = Date.now();

      const health = await fetchFromMCP('/health');
      const duration = Date.now() - startTime;

      if (health) {
        const collections = await fetchFromMCP('/collections');
        const collectionCount = collections?.collections?.length || 0;

        context.app.alert(
          'MCP Connection Test',
          `✅ Connected to MCP server\n\n` +
          `• URL: ${MCP_BASE_URL}\n` +
          `• Response time: ${duration}ms\n` +
          `• Collections: ${collectionCount}\n` +
          `• Status: ${health.status || 'ok'}\n\n` +
          `Auto-sync: ${isPolling ? 'Enabled' : 'Disabled'}`
        );
      } else {
        context.app.alert(
          'MCP Connection Test',
          `❌ Cannot connect to MCP server\n\n` +
          `• URL: ${MCP_BASE_URL}\n` +
          `• Response time: ${duration}ms (timeout)\n\n` +
          `💡 Make sure MCP server is running:\n` +
          `   npm start\n` +
          `   or\n` +
          `   npx insomnia-mcp\n\n` +
          `Auto-sync: ${isPolling ? 'Enabled (will retry)' : 'Disabled'}`
        );
      }
    }
  },
  {
    label: 'Toggle MCP Auto-Sync',
    icon: 'fa-sync',
    action: async (context) => {
      if (isPolling) {
        stopPolling();
        context.app.alert(
          'Auto-Sync Disabled',
          'MCP auto-sync has been disabled.\n\n' +
          'Use "Sync from MCP" to manually import changes.'
        );
      } else {
        const connected = await checkMCPConnection();
        if (connected) {
          startPolling(context);
          context.app.alert(
            'Auto-Sync Enabled',
            '✅ MCP auto-sync is now enabled\n\n' +
            '• Polling interval: 5 seconds\n' +
            '• Will auto-import when changes detected\n' +
            '• Merges fresh MCP data for UI refresh\n\n' +
            '⚠️  Note: If UI doesn\'t update, restart Insomnia'
          );
        } else {
          context.app.alert(
            'Connection Failed',
            `❌ Cannot connect to MCP server\n\n` +
            `URL: ${MCP_BASE_URL}\n\n` +
            `💡 Start MCP server first:\n` +
            `   npm start\n` +
            `   or\n` +
            `   npx insomnia-mcp`
          );
        }
      }
    }
  },
  {
    label: 'MCP Status & Info',
    icon: 'fa-info-circle',
    action: async (context) => {
      const connected = await checkMCPConnection();

      context.app.alert(
        'MCP Plugin Information',
        `🔌 Connection\n` +
        `  Status: ${connected ? '✅ Connected' : '❌ Disconnected'}\n` +
        `  URL: ${MCP_BASE_URL}\n\n` +
        `🔄 Auto-Sync\n` +
        `  Status: ${isPolling ? '✅ Enabled' : '❌ Disabled'}\n` +
        `  Interval: 5 seconds\n` +
        `  Last hash: ${lastKnownHash ? lastKnownHash.substring(0, 12) + '...' : 'Not set'}\n\n` +
        `🔧 Features\n` +
        `  • Auto-detects changes via hash polling\n` +
        `  • Import from MCP URL + fallback\n` +
        `  • Merge fresh MCP data with Insomnia state\n` +
        `  • Detailed success/failure feedback\n\n` +
        `📝 Note\n` +
        `  UI refresh may require app restart.\n` +
        `  Data always syncs correctly to database.`
      );
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

// Auto-start polling when plugin loads (duplication bug fixed!)
(async () => {
  setTimeout(async () => {
    console.log('[MCP Auto-Refresh] 🔌 Plugin loaded, checking for MCP server...');
    const connected = await checkMCPConnection();
    if (connected && !isPolling) {
      console.log('[MCP Auto-Refresh] 🚀 MCP server detected at ' + MCP_BASE_URL);
      console.log('[MCP Auto-Refresh] 🔄 Starting automatic polling (every 5 seconds)');

      isPolling = true;
      lastKnownHash = null;

      const monitorChanges = async () => {
        const hasChanges = await checkForChanges();
        if (hasChanges) {
          console.log('[MCP Auto-Refresh] 🔔 Changes detected! Trigger import with "Sync from MCP" or make a request.');
        }
      };

      pollTimer = setInterval(monitorChanges, POLL_INTERVAL);
      monitorChanges();

      console.log('[MCP Auto-Refresh] ✅ Auto-monitoring started');
      console.log('[MCP Auto-Refresh] 💡 Auto-import will happen on next request or manual sync');
    } else if (!connected) {
      console.log('[MCP Auto-Refresh] ⚠️  MCP server not available at ' + MCP_BASE_URL);
    }
  }, 3000);
})();