# Debug Guide - Finding Where Things Break

## Overview

We've added comprehensive logging to both MCP server and plugin to see exactly where the data flow breaks down.

## Setup

### 1. Terminal 1: MCP Server with Logging
```bash
cd /Users/roger.hughes/repo/insomnia-mcp
npm start
```

**What you'll see:**
- Server starts with port info
- Every hash request logs: `[HTTP] 🔍 Hash requested: abc123... (X collections)`
- Every export request shows full breakdown
- Every tool call (create_collection, etc.) shows detailed execution

### 2. Terminal 2: Open Insomnia with DevTools
```bash
open -a Insomnia
```

Then: **View → Toggle DevTools** (or Cmd+Alt+I)

**What you'll see:**
- `[MCP Auto-Refresh]` logs for all plugin activity
- Change detection notifications
- Import/merge operation details

### 3. Terminal 3: Claude Desktop
Use Claude to create collections

---

## Testing Flow

### Test 1: Initial Connection

**In Insomnia:**
1. Right-click workspace → `[DEBUG] Test Full Sync Flow`
2. Watch Insomnia DevTools console
3. Watch MCP server terminal

**Expected MCP Server Output:**
```
[HTTP] 🔍 Hash requested: abc123... (0 collections)

┌─────────────────────────────────────────────────
│ 📤 HTTP: /collections/export requested
└─────────────────────────────────────────────────
├─────────────────────────────────────────────────
│ ✅ Export generated
│ Resources: 0
│ Size: 234 bytes
└─────────────────────────────────────────────────
```

**Expected Plugin Console Output:**
```
╔═══════════════════════════════════════════════════╗
║       DEBUG: TESTING FULL SYNC FLOW              ║
╚═══════════════════════════════════════════════════╝

Step 1: Testing MCP connection...
Step 2: Fetching current hash...
Step 3: Fetching export data...
Step 4: Exporting from Insomnia...
Step 5: Testing import from MCP...
Step 6: Testing merge operation...

╔═══════════════════════════════════════════════════╗
║           DEBUG TEST COMPLETE                     ║
╚═══════════════════════════════════════════════════╝
```

**Expected Alert:**
```
Debug Test Complete

1. MCP Health: ✅ Connected
2. Hash Fetch: ✅ Success
   Hash: abc123...
   Collections: 0
3. Export Fetch: ✅ Success
   Resources: 0
4. Insomnia Export: ✅ Success
   Resources: 0
5. Import URI: ✅ Success
6. Merge & Re-import: ✅ Success

⚠️  Check console for detailed logs
```

### Test 2: Create Collection via Claude

**In Claude Desktop:**
```
Create a new Insomnia collection called "Debug Test Collection"
```

**Expected MCP Server Output:**
```
┌─────────────────────────────────────────────────
│ 🔧 MCP TOOL: create_collection
├─────────────────────────────────────────────────
│ Input: {
│   "name": "Debug Test Collection"
│ }
└─────────────────────────────────────────────────

┌─────────────────────────────────────────────────
│ ✅ COLLECTION CREATED
├─────────────────────────────────────────────────
│ ID: wrk_abc123def456
│ Name: Debug Test Collection
│ Duration: 15ms
│ Timestamp: 2025-09-30T...
└─────────────────────────────────────────────────
📤 Sending notifications to plugin...
✅ Notifications sent
```

**Expected Claude Response:**
```
✅ Created collection "Debug Test Collection"

Collection ID: wrk_abc123def456
Description: (none)
Created: 9/30/2025, 11:30:00 AM
Duration: 15ms

🔔 IMPORTANT: Check Insomnia plugin for sync notification
   The plugin should detect this change within 5 seconds
```

**Within 5 seconds - Expected Plugin Console Output:**
```
[HTTP] 🔍 Hash requested: xyz789... (1 collections)

┌─────────────────────────────────────────────────
│ 🔔 CHANGE DETECTED!
├─────────────────────────────────────────────────
│ Old hash: abc123...
│ New hash: xyz789...
│ Collections: 1
│ Timestamp: 2025-09-30T...
└─────────────────────────────────────────────────

[MCP Auto-Refresh] Checking MCP server...
[MCP Auto-Refresh] ✅ MCP server connected
[MCP Auto-Refresh] Importing from MCP...
[MCP Auto-Refresh] ✅ Import from MCP completed
[MCP Auto-Refresh] Attempting UI refresh via merge-and-reimport...
[MCP Auto-Refresh] Starting merge-and-reimport...
[MCP Auto-Refresh] Fetching fresh data from MCP...
```

**Expected MCP Server Output (during plugin fetch):**
```
[HTTP] 🔍 Hash requested: xyz789... (1 collections)

┌─────────────────────────────────────────────────
│ 📤 HTTP: /collections/export requested
└─────────────────────────────────────────────────
├─────────────────────────────────────────────────
│ ✅ Export generated
│ Resources: 2  ← (1 workspace + 1 environment)
│ Size: 1234 bytes
└─────────────────────────────────────────────────
```

**Expected Plugin Console (continued):**
```
[MCP Auto-Refresh] MCP resources: 2
[MCP Auto-Refresh] Exporting current Insomnia state...
[MCP Auto-Refresh] Insomnia resources: 0
[MCP Auto-Refresh] Merged: {
  mcpResources: 2,
  nonMcpResources: 0,
  total: 2
}
[MCP Auto-Refresh] Re-importing merged data...
[MCP Auto-Refresh] ✅ Merge-and-reimport completed
```

**Expected Insomnia Alert:**
```
MCP Changes Synced

✅ Sync completed successfully in 234ms

• MCP server: Connected
• Import: Success
• UI refresh: Attempted (merge fresh MCP data)

⚠️  If changes aren't visible, restart Insomnia
```

---

## Diagnostic Checklist

### ❌ If No Hash Poll Logs

**Problem**: Plugin not polling
**Check**:
1. Is auto-sync enabled? (Right-click → Toggle MCP Auto-Sync)
2. Plugin console shows: `[MCP Auto-Refresh] Started polling for changes`
3. MCP server terminal shows periodic: `[HTTP] 🔍 Hash requested`

**Fix**: Toggle auto-sync off then on

### ❌ If Change Not Detected

**Problem**: Hash not changing
**Check MCP Server**:
1. Does `create_collection` show `✅ COLLECTION CREATED`?
2. Does it show the collection ID?
3. Next hash request shows increased collection count?

**Check Plugin**:
1. Does hash poll show same hash twice?
2. Compare old vs new hash in logs

**Possible causes**:
- MCP not writing to DB (check MCP logs for errors)
- Plugin checking wrong hash endpoint
- Hash not including new collection

### ❌ If Change Detected but No Sync

**Problem**: Import not triggering
**Check Plugin**:
1. Does it show `[MCP Auto-Refresh] Changes detected, auto-importing...`?
2. Does it show `[MCP Auto-Refresh] Checking MCP server...`?
3. Any errors in import flow?

**Check MCP Server**:
1. Does `/collections/export` get requested?
2. Does it show 2+ resources (workspace + environment)?

### ❌ If Sync Completes but No UI Update

**Problem**: This is the core issue we're investigating!
**Verify**:
1. Plugin shows: `✅ Merge-and-reimport completed`
2. Alert shows: `✅ Sync completed successfully`
3. But sidebar doesn't show new collection

**Data verification**:
```bash
# Check if data is in DB files
cat ~/Library/Application\ Support/Insomnia/insomnia.Workspace.db | grep "Debug Test Collection"
```

If data IS in files → UI refresh issue confirmed
If data NOT in files → Import not writing correctly

---

## Troubleshooting

### Enable Verbose Polling Logs

In `plugin/main.js` line 67, uncomment:
```javascript
console.log(`[MCP Auto-Refresh] 🔄 Poll: No changes (${hashShort}... / ${collectionCount} collections)`);
```

Now you'll see every 5-second poll attempt.

### Check MCP Server Health

```bash
curl http://localhost:3847/health
curl http://localhost:3847/collections
curl http://localhost:3847/collections/hash
```

### Check Insomnia DB Files

```bash
# List all Insomnia data files
ls -la ~/Library/Application\ Support/Insomnia/*.db

# Check workspace file
cat ~/Library/Application\ Support/Insomnia/insomnia.Workspace.db
```

### Force Restart Test

1. Create collection via Claude
2. Check MCP logs (should show creation)
3. Check plugin logs (should show sync)
4. Restart Insomnia
5. Does collection appear?

**If YES**: Confirms data is writing but UI not refreshing
**If NO**: Confirms data is not writing at all

---

## Expected Timeline

```
T+0s    : Claude receives "create collection" command
T+0.1s  : MCP server shows "🔧 MCP TOOL: create_collection"
T+0.2s  : MCP server shows "✅ COLLECTION CREATED"
T+0.3s  : Claude shows success message
T+0.3s  : MCP writes to DB files
T+5s    : Plugin polls hash (next 5-second interval)
T+5.1s  : MCP server shows "🔍 Hash requested" with new hash
T+5.2s  : Plugin shows "🔔 CHANGE DETECTED!"
T+5.3s  : Plugin starts sync process
T+5.4s  : MCP server shows "📤 HTTP: /collections/export requested"
T+5.5s  : Plugin completes merge
T+5.6s  : Plugin shows alert "MCP Changes Synced"
T+5.6s  : UI should update (THIS IS WHERE IT FAILS)
```

---

## Success Criteria

✅ **MCP Server Logs**:
- Tool calls log clearly
- HTTP requests log with details
- Resource counts accurate

✅ **Plugin Logs**:
- Polling shows hash checks
- Change detection triggers
- Sync process completes
- Merge shows resource counts

✅ **Data Verification**:
- DB files contain new data
- Export endpoint returns new data
- Hash changes after creation

❌ **UI Update**:
- This is expected to fail
- But we'll see WHERE and WHY with logs

---

## What to Report

Please capture and share:

1. **Full MCP server output** from creation to sync
2. **Full plugin console output** from change detection
3. **Result of data verification** (check DB files)
4. **Screenshot of Insomnia UI** (before and after)
5. **Insomnia version**: Help → About

This will show us exactly where the data flow breaks!