# Experimental UI Refresh Testing

## New Hypothesis

**What if the issue isn't the import itself, but that we're importing "foreign" data?**

If we export from Insomnia itself (which has already loaded the MCP changes into its database) and then re-import that export, maybe Insomnia will treat it as a "refresh" operation rather than a "new data" operation.

## Theory

```
Traditional Approach (Doesn't Work):
MCP writes DB → Plugin imports from MCP URL → ❌ UI doesn't refresh

New Approach (Might Work):
MCP writes DB → Plugin exports from Insomnia → Plugin re-imports → ✅ UI refreshes?
                         ↓
                   (reads updated DB)
```

**Key insight**: Insomnia's export reads from the SAME database files that MCP just updated!

## Four Experimental Approaches

### Approach 1: Simple Export-Import Cycle
**Logic**: Export current state, immediately re-import it.

**Steps**:
```javascript
1. context.data.export.insomnia() // Reads updated DB
2. context.data.import.raw(exported) // Re-import same data
```

**Hypothesis**: The import operation might trigger UI refresh even though data is identical.

---

### Approach 2: Selective Re-Import
**Logic**: Export all, filter to changed workspace only, re-import just that.

**Steps**:
```javascript
1. Export all workspaces
2. Filter to resources matching workspaceId
3. Re-import only filtered resources
```

**Hypothesis**: Smaller import might be more efficient and trigger refresh.

---

### Approach 3: Merge MCP + Insomnia
**Logic**: Fetch MCP state, export Insomnia state, merge, re-import.

**Steps**:
```javascript
1. Fetch from MCP: /collections/export
2. Export from Insomnia: context.data.export.insomnia()
3. Merge MCP resources with Insomnia resources
4. Re-import merged data
```

**Hypothesis**: Merging ensures we don't lose any Insomnia-specific data while importing MCP changes.

---

### Approach 4: Double Import
**Logic**: Import from MCP, then export and re-import to "settle" changes.

**Steps**:
```javascript
1. context.data.import.uri(MCP_URL) // First import
2. Wait 100ms
3. context.data.export.insomnia() // Export what was imported
4. context.data.import.raw(exported) // Re-import to refresh
```

**Hypothesis**: The second import acts as a "commit" that triggers UI update.

## Testing Setup

### Install Experimental Plugin

1. Copy `experimental-refresh.js` to a test plugin directory:
```bash
mkdir -p ~/Library/Application\ Support/Insomnia/plugins/insomnia-plugin-experimental-refresh
cp plugin/experimental-refresh.js ~/Library/Application\ Support/Insomnia/plugins/insomnia-plugin-experimental-refresh/main.js

cat > ~/Library/Application\ Support/Insomnia/plugins/insomnia-plugin-experimental-refresh/package.json << 'EOF'
{
  "name": "insomnia-plugin-experimental-refresh",
  "version": "0.0.1",
  "private": true,
  "insomnia": {
    "name": "experimental-refresh",
    "description": "Experimental UI refresh testing"
  },
  "main": "main.js"
}
EOF
```

2. Restart Insomnia
3. Verify plugin loaded (Preferences → Plugins)

### Test Procedure

#### Pre-Test: Create Baseline
1. Open Insomnia
2. Note existing collections
3. In Claude: "Create an Insomnia collection called 'Experimental Test'"
4. Wait 5 seconds for MCP to write
5. **Don't restart Insomnia yet**

#### Test Each Approach
For each test:
1. Right-click any workspace
2. Select `[TEST] <Approach Name>`
3. Watch console (View → Toggle DevTools)
4. **Observe**: Does "Experimental Test" collection appear in sidebar?
5. Document result

#### Test 1: Export-Import Cycle
- Expected console output: `Export completed`, `Re-importing to trigger refresh`
- **Question**: Did UI update?

#### Test 2: Selective Re-Import
- Expected console output: `Filtered to X resources`
- **Question**: Did UI update?

#### Test 3: Merge & Re-Import
- Expected console output: `Merged X MCP + Y Insomnia resources`
- **Question**: Did UI update?

#### Test 4: Double Import
- Expected console output: `First import`, `Exporting`, `Re-importing`
- **Question**: Did UI update?

#### Test 5: All Approaches
- Runs all 4 approaches in sequence
- **Question**: Did ANY approach work?

### What to Watch For

#### Console Logs
Look for:
```
[MCP Experimental] Approach 1: Export-Import Cycle
[MCP Experimental] Exporting current workspace...
[MCP Experimental] Export completed, data length: 12345
[MCP Experimental] Re-importing to trigger refresh...
[MCP Experimental] ✅ Export-Import cycle completed
```

#### UI Changes
Watch sidebar for:
- New collections appearing
- Existing collections refreshing
- Folder structures updating
- Request counts changing

#### Errors
If any approach fails:
- Check error messages in console
- Note which approach failed
- Continue testing others

## Expected Outcomes

### If Export-Import Works ✅
- **Huge win!** This means we can:
  1. Let MCP write to DB (fast, reliable)
  2. Export-import cycle after each change (triggers refresh)
  3. No restart needed!

### If Selective Re-Import Works ✅
- **Good win!** More efficient than full export-import
- Can optimize to only refresh changed workspaces
- Faster, less disruptive

### If Merge Works ✅
- **Complex win!** More code but handles edge cases
- Preserves both MCP and Insomnia data
- Most robust solution

### If Double Import Works ✅
- **Interesting win!** Suggests import needs "settling time"
- Could optimize delay timing
- Simple implementation

### If Nothing Works ❌
- **Back to square one** - confirms API limitation
- But we've exhausted all reasonable approaches
- Feature request is our only path forward

## Why This Might Work

### Theory 1: Import Triggers Refresh Only for "Current" Data
Insomnia might have logic like:
```javascript
async function importData(data) {
  writeToDatabase(data);

  if (isCurrentWorkspace(data)) {
    refreshUI(); // Only refresh if importing to active workspace
  }
}
```

By exporting first, we ensure we're importing data Insomnia recognizes as "current."

### Theory 2: Export Reads Fresh from DB
When we call `context.data.export.insomnia()`, it reads directly from the database files that MCP just updated. So the exported data INCLUDES the MCP changes!

```
MCP writes: wrk_new_collection
            ↓
        insomnia.Workspace.db (updated)
            ↓
Export reads: wrk_new_collection ✅ (it's there!)
            ↓
Re-import: wrk_new_collection
            ↓
UI refresh? 🤔
```

### Theory 3: Re-Import Triggers "Conflict Resolution"
Insomnia might have code that detects "conflicts" when importing:
```javascript
if (existsInDatabase(resource._id)) {
  // Conflict! Trigger merge UI
  showConflictResolution();
  refreshWorkspace(); // ← This might be our trigger!
}
```

By re-importing existing data, we might trigger this code path.

## Reporting Results

Please document:
1. Which approach(es) you tested
2. Whether UI refreshed (YES/NO)
3. Any console errors
4. Insomnia version (Help → About)
5. Any unexpected behavior

### Format
```
## Test Results

**Date**: 2025-09-30
**Insomnia Version**: X.X.X
**OS**: macOS/Windows/Linux

### Approach 1: Export-Import Cycle
- ✅/❌ UI Refreshed: NO
- Console errors: None
- Notes: Completed successfully, but no visible UI change

### Approach 2: Selective Re-Import
- ✅/❌ UI Refreshed: NO
- Console errors: None
- Notes: Filtered correctly, but no UI refresh

### Approach 3: Merge & Re-Import
- ✅/❌ UI Refreshed: NO
- Console errors: None
- Notes: Merge worked, but no refresh

### Approach 4: Double Import
- ✅/❌ UI Refreshed: YES!!! 🎉
- Console errors: None
- Notes: Second import triggered UI update!
```

## Next Steps Based on Results

### If ANY Approach Works
1. Integrate into main plugin
2. Add configuration for refresh method
3. Optimize timing/performance
4. Update documentation
5. **Celebrate!** 🎉

### If NOTHING Works
1. Document all attempts thoroughly
2. Include in feature request to Kong
3. Demonstrate we've tried everything
4. Keep restart workaround
5. Hope for API improvements

## Safety Notes

- These tests are read-only (export) or idempotent (re-import same data)
- No data should be lost
- If something goes wrong, restart Insomnia
- Backup important collections before testing
- Tests don't modify MCP server

## Questions?

If you encounter issues:
1. Check MCP server is running: `curl http://localhost:3847/health`
2. Verify plugin installed: Preferences → Plugins
3. Check console for detailed logs
4. Try approaches individually, not all at once
5. Document unexpected behavior

---

**Good luck with testing!** 🧪

This experiment could be the breakthrough we need to solve the UI refresh problem!