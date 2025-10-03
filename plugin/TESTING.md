# Testing Guide for Insomnia MCP Plugin

## Overview

This guide helps you test whether the plugin successfully triggers UI refresh when MCP collections change.

## Test Setup

### Prerequisites
1. MCP server running on `http://localhost:3847`
2. Insomnia app installed
3. Plugin installed (see README.md)
4. Claude Desktop or another MCP client connected

### Initial Setup
```bash
# 1. Start MCP server
cd ~/repo/insomnia-mcp
npm run build
npx insomnia-mcp

# 2. Start Insomnia
# 3. Enable plugin auto-sync (right-click workspace → Toggle MCP Auto-Sync)
```

## Test Cases

### Test 1: Create New Collection
**Goal**: Verify UI shows new collection immediately after MCP creates it.

1. Open Insomnia
2. Note current collections in sidebar
3. In Claude Desktop, say: "Create a new Insomnia collection called 'Test API'"
4. Wait 5 seconds (polling interval)
5. **Expected**:
   - Notification appears: "MCP Changes Synced"
   - New "Test API" collection appears in sidebar ✅
   - **WITHOUT** needing to restart Insomnia
6. **Actual**: _Record what happens_

### Test 2: Add Request to Collection
**Goal**: Verify UI shows new request in existing collection.

1. In Claude, say: "Add a GET request to https://api.example.com/users in the Test API collection"
2. Wait 5 seconds
3. **Expected**:
   - Notification appears
   - New request visible in "Test API" collection ✅
   - Request details (method, URL) are correct
4. **Actual**: _Record what happens_

### Test 3: Update Existing Request
**Goal**: Verify UI reflects changes to existing requests.

1. In Claude, say: "Change the URL of that request to https://api.example.com/v2/users"
2. Wait 5 seconds
3. **Expected**:
   - Notification appears
   - Request URL updates in UI ✅
   - No duplicate requests created
4. **Actual**: _Record what happens_

### Test 4: Create Folder Structure
**Goal**: Verify nested folders appear correctly.

1. In Claude, say: "Create a folder called 'Users' in Test API and add that request to it"
2. Wait 5 seconds
3. **Expected**:
   - Notification appears
   - "Users" folder visible in collection ✅
   - Request is nested under folder
4. **Actual**: _Record what happens_

### Test 5: Delete Request
**Goal**: Verify deleted requests disappear from UI.

1. In Claude, say: "Delete that request"
2. Wait 5 seconds
3. **Expected**:
   - Notification appears
   - Request disappears from UI ✅
4. **Actual**: _Record what happens_

### Test 6: Environment Variables
**Goal**: Verify environment changes reflect in UI.

1. In Claude, say: "Set environment variable baseUrl to https://api.example.com in Test API"
2. Wait 5 seconds
3. **Expected**:
   - Notification appears
   - Environment variable visible in collection environment ✅
4. **Actual**: _Record what happens_

## Known Issues to Watch For

### Issue #1: Multiple Workspaces Created
**Symptom**: Each import creates a NEW "Test API" workspace instead of updating existing one.

**Evidence**: Multiple workspaces with same name in sidebar.

**Workaround**: None yet (this is the core bug we're trying to fix).

### Issue #2: Partial UI Refresh
**Symptom**: Collection updates but sidebar doesn't refresh until clicked.

**Evidence**: Changes visible when you click workspace but not automatically.

**Workaround**: Click workspace to force refresh.

### Issue #3: Import Errors
**Symptom**: Notification shows "MCP Sync Failed".

**Check**:
1. Open Developer Tools (View → Toggle DevTools)
2. Look for `[MCP Auto-Refresh]` errors
3. Verify MCP server is running: `curl http://localhost:3847/health`

## Comparing import.uri() vs import.raw()

### Plugin v0.0.2 (import.raw())
- Fetches JSON from MCP
- Passes JSON string to `context.data.import.raw()`
- **Known issue**: Creates new workspaces

### Plugin v0.0.3 (import.uri())
- Passes URL directly to `context.data.import.uri()`
- Insomnia fetches the data itself
- **Hypothesis**: May handle workspace merging better

### How to Compare
1. Test with v0.0.2 first, record behavior
2. Upgrade to v0.0.3, repeat same tests
3. Note differences in:
   - Workspace creation behavior
   - UI refresh timing
   - Error messages

## Success Metrics

✅ **Full Success**:
- All tests pass
- No duplicate workspaces
- UI updates within 5 seconds
- No manual refresh needed

⚠️ **Partial Success**:
- Changes import correctly
- Duplicates workspaces created OR
- Manual refresh sometimes needed

❌ **Failure**:
- Import errors
- Changes don't appear
- App crashes

## Reporting Results

Please document your findings in GitHub issues with:
1. Insomnia version: `Help → About`
2. Plugin version: `0.0.3`
3. OS: macOS/Windows/Linux
4. Test results for each test case
5. Console logs if failures occur
6. Screenshots of UI behavior

## Alternative Testing: Manual Import

To isolate whether the issue is the plugin or Insomnia's import system:

1. In Insomnia: `Application → Preferences → Data → Import Data`
2. Choose "From URL"
3. Enter: `http://localhost:3847/collections/export`
4. Click "Scan" then "Import"
5. **Does this trigger proper UI refresh?**
   - If YES → Problem is in plugin code
   - If NO → Problem is in Insomnia's import system

## Console Monitoring

Open DevTools and filter for `[MCP Auto-Refresh]` to see:
```
[MCP Auto-Refresh] Started polling for changes
[MCP Auto-Refresh] Collections changed!
[MCP Auto-Refresh] Changes detected, auto-importing...
[MCP Auto-Refresh] Importing collections from URL...
[MCP Auto-Refresh] Import completed successfully
```

If you see errors, they'll appear here with stack traces.

## Next Steps

Based on test results:
1. **Full success** → Document and close issue
2. **Partial success** → Investigate UI refresh timing
3. **Failure** → Consider alternative architectures (WebSocket, direct file manipulation, etc.)