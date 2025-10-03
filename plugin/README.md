# Insomnia MCP Auto-Refresh Plugin

This plugin connects to your MCP HTTP server and automatically imports collections when changes are detected. Much more reliable than file watching!

## Features

- **🌐 HTTP Polling**: Connects to MCP server at `localhost:3847`
- **🔄 Auto-Import**: Automatically imports collections when changes detected
- **📱 Smart Notifications**: Alerts when MCP changes are detected
- **🏷️ Status Templates**: Template tags to show connection and sync status
- **⚡ One-Click Import**: Manual import action for immediate sync

## Installation

### Method 1: Plugin Folder (Recommended for Development)

1. Copy the entire `plugin` folder to your Insomnia plugins directory:

   **macOS**: `~/Library/Application Support/Insomnia/plugins/insomnia-plugin-mcp-refresh/`

   **Windows**: `%APPDATA%/Insomnia/plugins/insomnia-plugin-mcp-refresh/`

   **Linux**: `~/.config/Insomnia/plugins/insomnia-plugin-mcp-refresh/`

2. Install dependencies:
   ```bash
   cd "~/Library/Application Support/Insomnia/plugins/insomnia-plugin-mcp-refresh"
   npm install
   ```

3. Restart Insomnia

### Method 2: NPM Package (Future)

```bash
npm install -g insomnia-plugin-mcp-refresh
```

## Usage

### Automatic Setup
- Plugin auto-detects MCP server at `http://localhost:3847`
- Automatically starts polling for changes every 5 seconds
- Shows notifications when collections are updated

### Workspace Actions
Right-click any workspace/collection to access:

1. **"Sync from MCP"** - Import with detailed success/failure feedback
2. **"Check MCP Connection"** - Test connectivity with response time & collection count
3. **"Toggle MCP Auto-Sync"** - Enable/disable automatic polling with clear feedback
4. **"MCP Status & Info"** - View comprehensive plugin status and features

### Status Templates
Use these template tags in requests:
- `{{ MCP Status }}` - Shows connection status (🟢/🔴) and sync state
- `{{ MCP Server URL }}` - Returns the MCP server URL

### Manual Import
You can also import directly from: `http://localhost:3847/collections/export`

## How It Works

1. **HTTP Polling**: Connects to MCP server's HTTP endpoint every 5 seconds
2. **Change Detection**: Compares collection hash to detect modifications
3. **Auto-Import**: Uses Insomnia's import API to sync collections
4. **Smart Notifications**: Alerts when changes are detected
5. **Manual Control**: Provides workspace actions for immediate sync

## Recent Improvements

**v0.0.6** - Merge fresh MCP data approach:
- ✅ **Implemented Approach 2**: Merge fresh MCP data with Insomnia's cached state
- ✅ **Key insight**: Insomnia caches data in memory, export gives stale data
- ✅ **Solution**: Fetch fresh data from MCP, merge with Insomnia export, re-import
- ✅ **Detailed feedback**: Shows MCP connection, import status, and refresh attempt results
- ✅ **Better diagnostics**: Connection test with response time and collection count
- ✅ **Clear status reporting**: Every operation reports success/failure with context
- ✅ **Graceful fallbacks**: Multiple fallback strategies if any step fails
- ⚠️ **Testing**: Merge approach ensures fresh data is imported, testing if UI refreshes

## Known Limitations

### UI Refresh Requires Restart
**Issue**: Insomnia's plugin import APIs (`context.data.import.uri()` and `context.data.import.raw()`) successfully import data into the database, but **do not trigger UI refresh**.

**Evidence**:
- Test confirmed: Collections created via MCP appear after restarting Insomnia
- Data is correctly written to NDJSON files
- Import executes without errors
- UI simply doesn't detect the database changes while running

**Workaround**:
1. Let auto-import run in background
2. When you see "MCP Changes Synced" notification
3. **Restart Insomnia** (⌘Q then reopen on Mac, Alt+F4 on Windows)
4. Changes will be visible

**Alternative**: Use "Import & Restart Insomnia" workspace action for reminder to restart.

### Other Limitations
- Requires MCP server to be running on `localhost:3847`
- Import process may take a few seconds for large collections
- Multiple imports may create duplicate workspaces (Insomnia bug #6125)

## Troubleshooting

### Plugin Not Loading
- Check that the plugin folder is in the correct location
- Restart Insomnia completely
- Look for plugin in Preferences → Plugins

### No Auto-Sync
- Verify MCP server is running: visit `http://localhost:3847/health`
- Check console for error messages: `[MCP Auto-Refresh]`
- Try "Check MCP Status" workspace action
- Manually toggle auto-sync off/on

### Import Failures
- Ensure MCP server is accessible
- Check that collections exist in MCP
- Try manual "Import from MCP" action
- Look for error details in Developer Tools console

## Development

To modify the plugin:

1. Edit `index.js` in the plugin folder
2. Restart Insomnia to load changes
3. Check Insomnia Developer Tools (View > Toggle DevTools) for console output

## Contributing

This plugin is part of the `insomnia-mcp` project. Please submit issues and pull requests to the main repository.