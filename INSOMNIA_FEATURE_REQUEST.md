# Feature Request: Plugin API for UI Refresh After Programmatic Import

## Summary

Add plugin APIs to trigger UI refresh after programmatic data imports, enabling plugins to create seamless data synchronization experiences without requiring manual app restarts.

## Motivation

**Use Case**: MCP (Model Context Protocol) integration for Insomnia
- AI assistants (Claude, etc.) can create/modify collections via MCP
- Plugin automatically imports changes to keep Insomnia in sync
- **Problem**: UI doesn't refresh after import, requiring manual restart

**Current Behavior**:
```javascript
// Plugin code
await context.data.import.uri('http://localhost:3847/collections/export');
// ✅ Data imported successfully to NDJSON files
// ❌ UI shows stale state until app restart
```

**User Impact**:
- Collections created via MCP are invisible until restart
- Workflow interrupted by manual restart requirement
- Degrades UX of otherwise excellent automation

## Current Limitations

### 1. Import APIs Don't Trigger UI Refresh

Neither `context.data.import.uri()` nor `context.data.import.raw()` trigger UI updates:

```javascript
// Both methods import data successfully but UI remains stale
await context.data.import.uri(url);
await context.data.import.raw(json);
```

**Evidence**:
- Data appears in NDJSON files immediately
- Restarting Insomnia shows all changes
- UI simply doesn't detect database changes while running

### 2. No Workspace Reload API

Plugins have no way to force UI refresh:

```javascript
// These don't exist in plugin API:
context.workspace.reload(workspaceId);  // ❌
context.app.refresh();                   // ❌
context.ui.update();                     // ❌
```

### 3. ImportOptions.workspaceId Deprecated

Related issues #6125 and #7457 document that:
- `workspaceId` parameter used to allow merging into existing workspace
- This was removed, now always creates new workspace
- Exacerbates the problem by creating duplicates

### 4. Read-Only Models

Issue #2983 documented that workspace models in plugin context are read-only:
> "changes to said object doesn't affect the actual element"

No way to modify and persist workspace data directly.

## Proposed Solutions

### Solution 1: Add Workspace Reload API (Preferred)

Add method to force UI refresh for specific workspace:

```typescript
interface WorkspaceContext {
  /**
   * Force UI to reload and re-render workspace
   * @param workspaceId - Optional workspace ID to reload (defaults to current)
   */
  reload(workspaceId?: string): Promise<void>;
}

// Usage in plugins
await context.data.import.uri(url);
await context.workspace.reload(); // ✅ UI refreshes
```

### Solution 2: Fix Import APIs to Auto-Refresh

Make import operations trigger UI refresh automatically:

```typescript
interface ImportOptions {
  workspaceId?: string;
  merge?: boolean;
  refreshUI?: boolean; // Auto-refresh UI after import (default: true)
}

// Usage
await context.data.import.uri(url, {
  workspaceId: 'wrk_123',
  merge: true,
  refreshUI: true // ✅ UI refreshes automatically
});
```

### Solution 3: Add Workspace Lifecycle Hooks

Allow plugins to subscribe to data changes:

```typescript
module.exports.workspaceHooks = {
  /**
   * Called when workspace data changes
   */
  onDataChanged: async (context, workspaceId) => {
    console.log('Workspace changed:', workspaceId);
    // Plugin can react to changes
  },

  /**
   * Called after successful import
   */
  onImportComplete: async (context, importedResources) => {
    console.log('Import completed:', importedResources);
  }
};
```

### Solution 4: Built-in File System Watcher

Insomnia should watch its data directory for external changes:

- Monitor `~/.../Insomnia/*.db` files
- Auto-reload UI when files change externally
- Benefits all users (not just plugins)
- Enables external tools to modify Insomnia data

## Workarounds We Tried

### ❌ Window Events
```javascript
window.dispatchEvent(new Event('focus'));
window.dispatchEvent(new Event('storage'));
// Doesn't trigger Insomnia's UI update logic
```

### ❌ Direct File Manipulation
- Writing NDJSON files directly works
- But still no UI refresh (same problem)

### ❌ Workspace Switching
- No API to programmatically switch workspaces
- Wouldn't guarantee refresh anyway

### ✅ Manual Restart (Current Solution)
```javascript
context.app.alert(
  'Restart Required',
  'Please restart Insomnia (⌘Q then reopen) to see changes.'
);
```

This works but provides poor UX.

## Real-World Impact

### Our Use Case: Insomnia MCP Server

**Project**: [insomnia-mcp](https://github.com/yourusername/insomnia-mcp)
- Exposes Insomnia collections via Model Context Protocol
- Allows AI assistants to create/manage requests
- Auto-sync plugin keeps Insomnia UI in sync

**Current Status**:
- ✅ Data synchronization: 100% reliable
- ✅ Change detection: Works perfectly
- ✅ Import execution: No errors
- ❌ UI refresh: Requires manual restart

**User Workflow**:
1. User asks Claude: "Create a new Insomnia collection for my API"
2. MCP server creates collection in database
3. Plugin detects change and imports
4. **User must restart Insomnia to see collection** ⬅️ Pain point

### Other Potential Use Cases

This API would enable:
- **Git sync plugins**: Auto-update UI when pulling from remote
- **Team sync plugins**: Real-time collaboration features
- **Backup/restore plugins**: Seamless data restoration
- **Import automation**: Scheduled imports from CI/CD
- **Multi-tool integrations**: Sync with Postman, Thunder Client, etc.

## Technical Details

### Environment
- **OS**: macOS 14.6 (also affects Windows/Linux)
- **Insomnia Version**: 2024.x (issue persists in latest)
- **Plugin API Version**: Current stable

### Reproduction

1. Create plugin with import functionality:
```javascript
module.exports.workspaceActions = [{
  label: 'Test Import',
  action: async (context) => {
    await context.data.import.raw(JSON.stringify({
      _type: "export",
      __export_format: 4,
      resources: [
        {
          _id: "wrk_test123",
          _type: "workspace",
          name: "Test Collection",
          scope: "collection"
        }
      ]
    }));

    // ❌ UI doesn't show new collection
    // ✅ Restart reveals collection exists
  }
}];
```

2. Install plugin and run action
3. Observe: No UI update
4. Restart Insomnia
5. Observe: Collection is present (data imported correctly)

## Related Issues

- #6125 - Import through plugin creates new workspaces
- #7457 - ImportOptions.workspaceId ignored
- #2983 - Plugin workspace models are read-only
- #4664 - Plugin remote access to Electron APIs limited
- #1524 - Plugins not refreshed correctly

## Proposed API Contract

### Minimal Solution

```typescript
// Add to existing context
interface Context {
  workspace: {
    reload(workspaceId?: string): Promise<void>;
  }
}
```

### Ideal Solution

```typescript
interface Context {
  workspace: {
    // Force UI reload
    reload(workspaceId?: string): Promise<void>;

    // Get current workspace ID
    getCurrentId(): string;

    // Switch to different workspace
    switch(workspaceId: string): Promise<void>;
  },

  ui: {
    // Force full UI refresh
    refresh(): Promise<void>;

    // Show loading indicator
    showLoading(message: string): void;
    hideLoading(): void;
  }
}

// Enhanced import options
interface ImportOptions {
  workspaceId?: string;
  merge?: boolean;        // Merge into existing vs create new
  refreshUI?: boolean;    // Auto-refresh after import
  silent?: boolean;       // Suppress notifications
}
```

## Benefits

### For Plugin Developers
- ✅ Build seamless sync experiences
- ✅ No hacky workarounds needed
- ✅ Better error handling (know when refresh fails)
- ✅ More professional integrations

### For Users
- ✅ Immediate visual feedback
- ✅ No manual restarts
- ✅ Smooth workflow
- ✅ Better automation experiences

### For Insomnia
- ✅ More powerful plugin ecosystem
- ✅ Enables new use cases (team sync, git sync, etc.)
- ✅ Competitive advantage over other API clients
- ✅ Better integration with AI tools

## Implementation Notes

### Suggested Approach

1. **Phase 1**: Add `context.workspace.reload()`
   - Simple API, big impact
   - Can be polyfilled in older versions
   - Low risk, high value

2. **Phase 2**: Fix import APIs
   - Restore `ImportOptions.workspaceId` functionality
   - Add auto-refresh by default
   - Fix duplicate workspace bug

3. **Phase 3**: Add lifecycle hooks
   - Enable reactive plugins
   - More advanced use cases
   - Future-proof plugin system

### Backward Compatibility

- New APIs should be optional
- Plugins should detect availability:
```javascript
if (context.workspace?.reload) {
  await context.workspace.reload();
} else {
  // Fallback to notification
  context.app.alert('Please restart Insomnia');
}
```

## Documentation Needed

If implemented, please document:
1. When UI refresh is automatic vs manual
2. Performance implications of reload
3. Best practices for batch operations
4. Error handling for refresh failures

## Workaround Documentation

Until this is implemented, we recommend:
1. Document restart requirement clearly
2. Provide "Import & Restart" actions with instructions
3. Batch multiple changes before restarting
4. Set user expectations upfront

See our implementation: [insomnia-mcp plugin](link)

## Willing to Contribute

We're happy to:
- Test implementation
- Provide feedback on API design
- Write documentation
- Create proof-of-concept PR

Our MCP integration is production-ready except for this limitation.

## Questions?

Happy to provide:
- More detailed reproduction steps
- Plugin source code
- Video demonstration
- Additional use case details

---

**Thank you for considering this request!** This would unlock a whole new category of powerful Insomnia plugins and significantly improve the automation experience.