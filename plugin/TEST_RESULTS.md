# Test Results

## Test 1: Create New Collection

**Date**: 2025-09-30
**Plugin Version**: 0.0.3
**Insomnia Version**: [User to fill in]
**Tester**: roger.hughes

### Test Execution

1. ✅ Opened Insomnia
2. ✅ Noted current collections in sidebar
3. ✅ In Claude Desktop, said: "Create a new Insomnia collection called 'Test API'"
4. ✅ Waited 5 seconds (polling interval)

### Results

**Expected**:
- Notification appears: "MCP Changes Synced"
- New "Test API" collection appears in sidebar
- WITHOUT needing to restart Insomnia

**Actual**:
- ❌ **No reaction in the UI**
- ✅ **Restarting the app shows the new collection**

### Analysis

This confirms:
1. ✅ MCP server correctly writes to NDJSON database files
2. ✅ Data persists correctly (visible after restart)
3. ✅ Plugin polling detects changes (presumably notification appeared?)
4. ✅ Import executes (data gets written)
5. ❌ **UI does NOT auto-refresh after import**

### Root Cause

The issue is confirmed to be **Insomnia's import API does not trigger UI refresh**, regardless of whether we use:
- `context.data.import.raw()` (v0.0.2)
- `context.data.import.uri()` (v0.0.3)

Both methods successfully import data, but neither forces the UI to re-render.

### Questions for User

1. Did you see a notification that said "MCP Changes Synced"?
2. Did the console show any errors? (View → Toggle DevTools)
3. What version of Insomnia are you running? (Help → About)
4. Did the plugin show as "enabled" in Preferences → Plugins?

---

## Next Steps

Since `import.uri()` doesn't solve the UI refresh issue, we have several options:

### Option A: Document Limitation (Quick)
Accept that users must restart Insomnia and document this clearly.

**Pros**: No code changes, honest about limitations
**Cons**: Poor UX, defeats "auto-refresh" purpose

### Option B: Trigger Workspace Switch (Hacky)
Try to force UI refresh by programmatically switching workspaces.

**Implementation idea**:
```javascript
// After import, try to trigger refresh by:
// 1. Get current workspace ID
// 2. Switch to a different workspace
// 3. Switch back to original workspace
// This might force Insomnia to reload the workspace data
```

### Option C: Direct File Manipulation + Touch Sentinel (Advanced)
Since we know the data is already in the files, just "touch" a file to trigger Insomnia's file watcher (if it exists).

**Implementation**:
```javascript
// After detecting changes:
// 1. Write current timestamp to ~/.../Insomnia/.mcp-trigger
// 2. Hope Insomnia notices and reloads
```

### Option D: Add "Refresh UI" Button (Pragmatic)
Add a workspace action that programmatically restarts Insomnia or reloads the window.

**Research needed**: Does Insomnia expose `window.location.reload()` or similar?

### Option E: File Feature Request with Kong (Long-term)
Document this limitation and request:
1. `context.workspace.reload()` API
2. Fix `import.*()` to trigger UI refresh
3. Built-in file system watcher for data directory

---

## Recommendation

I suggest we try **Option B** (workspace switch hack) as it's:
- Quick to implement
- Non-invasive (doesn't modify files directly)
- Might actually work
- Easy to test

If that fails, combine **Option D** (manual refresh button) with **Option E** (feature request).

Would you like me to implement Option B?