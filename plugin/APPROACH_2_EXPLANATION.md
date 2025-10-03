# Approach 2: Merge Fresh MCP Data (v0.0.6)

## The Critical Insight

**Your hypothesis was correct!**

### The Problem with Approach 1

```
❌ Approach 1 (Export-Import Cycle):

MCP writes to DB files
         ↓
Insomnia's memory cache: STALE (doesn't read DB until restart)
         ↓
Plugin exports from Insomnia: Gets STALE cached data
         ↓
Re-imports STALE data: No new information for UI to refresh!
```

**Why it failed**: Insomnia doesn't read from DB files while running. It keeps data cached in memory. So `context.data.export.insomnia()` returns the **OLD cached state**, not the fresh MCP changes!

### The Solution: Approach 2

```
✅ Approach 2 (Merge Fresh MCP Data):

MCP writes to DB files
         ↓
Plugin fetches from MCP HTTP: Gets FRESH data (MCP reads from DB!)
         ↓
Plugin exports from Insomnia: Gets STALE cached data
         ↓
Plugin MERGES: Fresh MCP data OVERRIDES stale Insomnia data
         ↓
Re-imports MERGED data: UI sees NEW data and hopefully refreshes!
```

## Implementation Details

### Step 1: Fetch Fresh Data from MCP
```javascript
const mcpData = await fetchFromMCP('/collections/export');
// mcpData.resources contains FRESH data from DB files
```

**Key**: MCP server reads directly from Insomnia's DB files that it just updated. This data is guaranteed fresh.

### Step 2: Export Stale Data from Insomnia
```javascript
const insomniaData = await context.data.export.insomnia();
const insomniaExport = JSON.parse(insomniaData);
// insomniaExport.resources contains STALE cached data
```

**Key**: This is the data Insomnia currently has in memory. May be missing MCP changes.

### Step 3: Merge (MCP Takes Priority)
```javascript
const mcpResourceIds = new Set(mcpData.resources.map(r => r._id));

// Keep Insomnia resources that MCP doesn't manage
const nonMcpResources = insomniaExport.resources.filter(
  r => !mcpResourceIds.has(r._id)
);

// MCP resources OVERRIDE any matching Insomnia resources
const merged = {
  ...insomniaExport,
  resources: [...mcpData.resources, ...nonMcpResources]
};
```

**Merge Strategy**:
- If resource ID exists in MCP data: Use MCP version (fresh)
- If resource ID doesn't exist in MCP data: Keep Insomnia version (user created)

**Example**:
```
MCP manages:
  - wrk_abc123 (updated by Claude)
  - req_def456 (updated by Claude)

Insomnia has in memory:
  - wrk_abc123 (old version)
  - req_def456 (old version)
  - wrk_xyz789 (user created in Insomnia directly)

After merge:
  - wrk_abc123 (✅ MCP version - fresh)
  - req_def456 (✅ MCP version - fresh)
  - wrk_xyz789 (✅ Insomnia version - preserved)
```

### Step 4: Re-Import Merged Data
```javascript
await context.data.import.raw(JSON.stringify(merged));
```

**Key**: Now we're importing data that contains BOTH:
- Fresh MCP changes (from DB files)
- Existing Insomnia data (from memory cache)

This gives the UI fresh information to potentially trigger a refresh.

## Why This Might Work

### Theory 1: Import Sees "New" Data
When Insomnia's import logic compares the incoming data with its memory cache:

```javascript
// Insomnia's import logic (hypothetical)
function import(newData) {
  for (resource of newData.resources) {
    const existing = cache.get(resource._id);

    if (!existing) {
      // Completely new resource
      cache.add(resource);
      ui.renderNew(resource); // ← UI refresh!
    } else if (existing.modified < resource.modified) {
      // Resource was updated
      cache.update(resource);
      ui.renderUpdate(resource); // ← UI refresh!
    }
  }
}
```

With Approach 1, all resources had the same timestamps (stale), so no refresh.

With Approach 2, MCP resources have NEWER timestamps, so UI might refresh!

### Theory 2: Conflict Resolution Triggers Refresh
Insomnia might have conflict resolution logic:

```javascript
if (resource._id exists in cache && data is different) {
  // Conflict detected! Show in UI
  showConflictResolution(resource);
}
```

Merging fresh data creates "conflicts" that force UI updates.

### Theory 3: Import from "External Source"
Insomnia might treat imports differently based on source:

- Export-import cycle: "This is my own data, no UI refresh needed"
- Merged external data: "This is new external data, refresh UI to show user"

## Comparison

| Aspect | Approach 1 | Approach 2 |
|--------|-----------|-----------|
| **Data Source** | Insomnia cache (stale) | MCP server (fresh) |
| **Merge Logic** | None | Smart merge |
| **MCP Changes** | ❌ Lost in cache | ✅ Preserved |
| **User Changes** | ✅ Preserved | ✅ Preserved |
| **Timestamps** | All same (old) | MCP newer |
| **UI Refresh?** | ❌ No new data | ✅ Maybe! Has new data |

## Expected Outcomes

### If This Works ✅
- UI sees fresh MCP data with newer timestamps
- Detects changes and triggers refresh
- Collections/requests appear immediately
- No restart required!

### If This Still Doesn't Work ❌
- At least we're importing correct data
- Proves UI refresh is fundamentally blocked by Insomnia
- Strengthens feature request case
- But data integrity is maintained

## Testing

### Before Testing
1. Restart Insomnia (start with fresh memory cache)
2. Enable auto-sync
3. Note existing collections

### Test 1: Create Collection
1. In Claude: "Create Insomnia collection 'Test Fresh Merge'"
2. Wait 5 seconds for auto-sync
3. **Observe**: Does collection appear WITHOUT restart?
4. Check console logs for merge details

### Test 2: Update Request
1. In Claude: "Update the URL of request X to https://new-url.com"
2. Wait 5 seconds for auto-sync
3. **Observe**: Does URL update WITHOUT restart?
4. Verify merge preserved other requests

### Test 3: Verify No Data Loss
1. Create collection manually in Insomnia: "Manual Collection"
2. In Claude: "Create Insomnia collection 'Claude Collection'"
3. Wait 5 seconds for auto-sync
4. **Observe**: Both collections should exist (no data loss)

### Console Logs to Watch For
```
[MCP Auto-Refresh] Starting merge-and-reimport...
[MCP Auto-Refresh] Fetching fresh data from MCP...
[MCP Auto-Refresh] MCP resources: 5
[MCP Auto-Refresh] Exporting current Insomnia state...
[MCP Auto-Refresh] Insomnia resources: 3
[MCP Auto-Refresh] Merged: {
  mcpResources: 5,
  nonMcpResources: 1,  ← Should be >0 if you have manual collections
  total: 6
}
[MCP Auto-Refresh] Re-importing merged data...
[MCP Auto-Refresh] ✅ Merge-and-reimport completed
```

## Success Criteria

✅ **Full Success**: UI updates immediately, no restart needed
⚠️ **Partial Success**: Data correct after restart, but UI still doesn't refresh
❌ **Failure**: Data loss or merge conflicts

## Next Steps

### If Successful
1. Document the working approach
2. Add configuration options (merge strategy)
3. Optimize merge logic
4. Celebrate! 🎉

### If Still Fails
1. Confirm data is correct (check DB files)
2. Document that merge preserves data correctly
3. Conclude UI refresh is impossible via plugin API
4. Submit feature request with all our findings
5. Keep merge approach (better data handling anyway)

## Why This Approach is Better Regardless

Even if UI refresh doesn't work, Approach 2 is superior because:

1. ✅ **Data Integrity**: Fresh MCP data guaranteed
2. ✅ **No Data Loss**: Preserves user-created resources
3. ✅ **Smart Merge**: Handles conflicts intelligently
4. ✅ **Verifiable**: Can check what was merged in logs
5. ✅ **Debuggable**: Clear logging of merge process

Approach 1 just re-imported stale data blindly. Approach 2 is a proper data synchronization strategy.