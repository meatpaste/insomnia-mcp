# Plugin Architecture & UI Refresh Analysis

## Problem Statement

**Core Challenge**: How to make Insomnia's UI automatically refresh when MCP server modifies collections?

### The Original Approach (v0.0.1 - v0.0.2)

```
┌─────────────────────────────────────────────────────────────┐
│                  ORIGINAL ARCHITECTURE                      │
└─────────────────────────────────────────────────────────────┘

Claude Desktop (MCP Client)
         ↓
    MCP Tool Call (e.g., "create_request")
         ↓
MCP Server writes to NDJSON database files:
  • ~/.../Insomnia/insomnia.Workspace.db
  • ~/.../Insomnia/insomnia.Request.db
  • ~/.../Insomnia/insomnia.Environment.db
         ↓
❌ Insomnia DOESN'T detect file changes
         ↓
Plugin polls /collections/hash every 5s
         ↓
Detects changes → Shows notification
         ↓
User clicks "Import from MCP"
         ↓
Plugin calls context.data.import.raw(JSON)
         ↓
❌ PROBLEMS:
   1. Creates NEW workspace instead of updating existing (bug #6125)
   2. UI doesn't refresh properly
   3. Requires manual user action
```

**Why This Failed:**
1. Insomnia doesn't watch its database files while running
2. `context.data.import.raw()` has a known bug creating duplicate workspaces
3. Import API doesn't trigger full UI refresh
4. Manual intervention defeats "auto-refresh" purpose

---

## Architectural Insights

### Discovery 1: Insomnia's Import System

**Key Realization**: Insomnia's import functionality is designed to be triggered by:
- **UI actions**: File → Import Data
- **Manual URL imports**: User pastes URL and clicks "Import"
- **Plugin imports**: `context.data.import.uri()` or `context.data.import.raw()`

**BUT**: None of these are designed for "background auto-sync" scenarios.

### Discovery 2: Two Import Methods

```typescript
context.data.import.uri(url: string, options?: ImportOptions)
context.data.import.raw(text: string, options?: ImportOptions)
```

**Hypothesis**: `import.uri()` might behave differently than `import.raw()` because:
1. It's a different code path in Insomnia
2. URL imports might have different workspace resolution logic
3. It's closer to how users manually import (File → Import → From URL)

### Discovery 3: ImportOptions Deprecated

From GitHub issues #6125 and #7457:
```typescript
interface ImportOptions {
  workspaceId?: string;  // ❌ Ignored in recent versions
  workspaceScope?: 'design' | 'collection';
}
```

The `workspaceId` parameter used to allow specifying which workspace to import into, but:
- This feature was removed in recent Insomnia versions
- Documentation is outdated
- Now always creates new workspace

---

## The New Approach (v0.0.3)

```
┌─────────────────────────────────────────────────────────────┐
│                    NEW ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────┘

Claude Desktop (MCP Client)
         ↓
    MCP Tool Call (e.g., "create_request")
         ↓
MCP Server:
  1. Writes to NDJSON files (for persistence)
  2. Updates in-memory state
  3. Serves HTTP endpoint: /collections/export
         ↓
Plugin polls /collections/hash every 5s
         ↓
Detects changes → Auto-imports immediately
         ↓
Plugin calls context.data.import.uri(MCP_URL)  ← KEY CHANGE!
         ↓
Insomnia fetches and processes the import
         ↓
✅ BENEFITS:
   1. Uses URL import (different code path)
   2. Automatic (no user action required)
   3. Fallback to import.raw() if URL fails
   4. Shows success/failure notifications
```

### Key Changes

#### 1. Switched to `import.uri()`
**Before:**
```javascript
const exportData = await fetchFromMCP('/collections/export');
await context.data.import.raw(JSON.stringify(exportData));
```

**After:**
```javascript
const importUrl = `${MCP_BASE_URL}/collections/export`;
await context.data.import.uri(importUrl);
```

**Why This Might Help:**
- `uri()` method is closer to manual UI import
- Insomnia handles the HTTP fetch itself
- May have different workspace resolution logic
- Could trigger proper UI refresh events

#### 2. Automatic Import on Change
**Before:** Notify user → Wait for manual action

**After:** Detect change → Import automatically → Notify result

```javascript
if (hasChanges) {
  try {
    const result = await importFromMCP(context);
    context.app.alert('MCP Changes Synced', `Collections updated.\n\n${result}`);
  } catch (error) {
    context.app.alert('MCP Sync Failed', `Error: ${error.message}`);
  }
}
```

#### 3. Graceful Fallback
```javascript
try {
  await context.data.import.uri(importUrl);
} catch (error) {
  // Fallback to raw import
  const exportData = await fetchFromMCP('/collections/export');
  await context.data.import.raw(JSON.stringify(exportData));
}
```

---

## Testing Hypotheses

### Hypothesis 1: `import.uri()` Handles Workspaces Better
**Test**: Create collection via MCP, import via plugin, check if duplicates are created.

**Expected**: If `uri()` uses different code path, it might:
- Merge into existing workspace
- OR still create duplicates (but we'll know)

### Hypothesis 2: Import Triggers UI Refresh
**Test**: Create request via MCP, wait for auto-import, observe UI without interaction.

**Expected**: If import is a first-class operation:
- UI should update automatically
- No click required to see changes

### Hypothesis 3: URL Import is More Reliable
**Test**: Compare error rates between `uri()` and `raw()` methods.

**Expected**: `uri()` might be more stable because:
- It's the method used by manual URL imports
- May have better error handling
- Could handle CORS/security differently

---

## Alternative Architectures Considered

### Option A: Direct File Manipulation (Abandoned)
**Idea**: Plugin writes directly to NDJSON files, bypassing import API.

**Pros:**
- Complete control over merge logic
- Can preserve existing workspaces

**Cons:**
- Race conditions with Insomnia's writes
- Platform-specific file paths
- No UI refresh trigger
- Breaks if Insomnia changes file format

**Verdict**: Too fragile, doesn't solve UI refresh problem.

---

### Option B: WebSocket Push Notifications
**Idea**: Replace HTTP polling with WebSocket for instant notifications.

```
MCP Server
  ↓
WebSocket broadcast: "collection_changed"
  ↓
Plugin receives instantly (no 5s delay)
  ↓
Triggers import
```

**Pros:**
- Instant updates (no polling delay)
- Efficient (no wasteful polling)
- Scalable

**Cons:**
- More complex setup
- Requires WebSocket server in MCP
- Still doesn't solve import/refresh problem

**Verdict**: Good future enhancement, but doesn't address core issue.

---

### Option C: In-Memory MCP Storage (Considered)
**Idea**: MCP server doesn't write to Insomnia files at all, keeps state in memory.

**Pros:**
- Clean separation of concerns
- No file conflicts
- Easier testing

**Cons:**
- Loses data on MCP server restart
- Requires syncing with Insomnia on startup
- Doesn't integrate with Insomnia's persistence

**Verdict**: Interesting for future, but current hybrid approach is better.

---

### Option D: Insomnia Feature Request (Long-term)
**Idea**: Ask Kong/Insomnia to add proper plugin APIs.

**Needed APIs:**
1. `context.workspace.reload()` - Force UI refresh
2. `context.data.import.* with workspaceId` - Fix workspace merging
3. File system watcher for data directory
4. Workspace lifecycle hooks (onCreate, onUpdate, onDelete)

**Pros:**
- Proper solution at the right layer
- Benefits all plugin developers

**Cons:**
- Requires Kong to implement
- Could take months/years
- No guarantee of acceptance

**Verdict**: File feature requests, but need workaround now.

---

## Current Architecture (Hybrid Approach)

### What We Keep:
1. ✅ MCP writes to NDJSON files (persistence)
2. ✅ HTTP server serves `/collections/export` (already implemented)
3. ✅ Plugin polls for changes (simple, reliable)

### What We Changed:
1. ✅ Use `import.uri()` instead of `import.raw()`
2. ✅ Auto-import on change (no manual action)
3. ✅ Fallback mechanism if URL import fails
4. ✅ Better notifications (success/failure)

### What We're Testing:
- Does `import.uri()` trigger UI refresh?
- Does it handle workspaces better?
- Is it more reliable?

---

## Implementation Details

### Polling Mechanism
```javascript
// Check every 5 seconds
const POLL_INTERVAL = 5000;

// Compute hash of collections for change detection
const hash = Buffer.from(JSON.stringify(collections)).toString('base64');

// Compare with last known hash
if (hash !== lastKnownHash) {
  // Change detected!
  await importFromMCP(context);
}
```

**Why Polling?**
- Simple to implement
- Reliable (no complex event system)
- 5-second delay acceptable for this use case
- Easy to toggle on/off

**Future**: Could upgrade to WebSocket for instant updates.

### Import Flow
```javascript
async function importFromMCP(context) {
  try {
    // PRIMARY: Use URL import
    const url = 'http://localhost:3847/collections/export';
    await context.data.import.uri(url);
    return 'Import completed successfully';
  } catch (error) {
    // FALLBACK: Use raw import
    const data = await fetch(url).then(r => r.json());
    await context.data.import.raw(JSON.stringify(data));
    return 'Import completed successfully (fallback)';
  }
}
```

### Error Handling
```javascript
try {
  const result = await importFromMCP(context);
  context.app.alert('MCP Changes Synced', result);
} catch (error) {
  context.app.alert('MCP Sync Failed', error.message);
  console.error('[MCP Auto-Refresh]', error);
}
```

---

## Known Limitations

### 1. Workspace Duplication (Unresolved)
- Insomnia bug #6125 still exists
- May create duplicate workspaces on each import
- Workaround: Manually delete duplicates
- Testing if `import.uri()` behaves differently

### 2. Polling Delay
- 5-second delay between change and import
- Could be reduced, but increases server load
- WebSocket would eliminate delay

### 3. Large Collections
- Import can take several seconds
- UI may be unresponsive during import
- Progress indication not available

### 4. MCP Server Dependency
- Plugin requires MCP server running
- If server stops, plugin keeps polling (harmless)
- Auto-detects when server comes back

---

## Success Criteria

### Minimal Success ✅
- [ ] Collections imported when MCP makes changes
- [ ] Notifications show import status
- [ ] No manual "Import from MCP" action needed
- [ ] Fallback works if primary method fails

### Ideal Success 🎯
- [ ] **UI refreshes automatically** (key goal!)
- [ ] No duplicate workspaces created
- [ ] Updates visible within 5 seconds
- [ ] No Insomnia restart required

### Stretch Goals 🚀
- [ ] Instant updates (WebSocket)
- [ ] Smart conflict resolution
- [ ] Selective sync (only changed resources)
- [ ] Bi-directional sync (Insomnia → MCP)

---

## Next Steps

### Immediate (v0.0.3)
1. ✅ Implement `import.uri()` method
2. ✅ Add automatic import on change
3. ✅ Create testing guide
4. ⏳ Gather user feedback on behavior

### Short-term (v0.1.0)
1. Optimize polling (smarter intervals)
2. Add configuration UI (disable auto-import, change interval)
3. Improve error messages
4. Add retry logic for failed imports

### Medium-term (v0.2.0)
1. Implement WebSocket for instant updates
2. Add selective sync (track which resources changed)
3. Optimize for large collections
4. Add import progress indicator

### Long-term (v1.0.0)
1. File feature requests with Kong/Insomnia
2. Investigate bi-directional sync
3. Support multiple MCP servers
4. Cloud sync support

---

## Conclusion

The v0.0.3 architecture represents a **pivot from fighting Insomnia's system to working with it**:

**Old thinking**: "How do we force Insomnia to see our file changes?"

**New thinking**: "How do we leverage Insomnia's import system properly?"

By switching from `import.raw()` to `import.uri()` and enabling automatic import, we're:
1. Using Insomnia's APIs as designed
2. Testing a different code path that might work better
3. Removing manual user steps
4. Providing better feedback

**The key question**: Does `import.uri()` trigger proper UI refresh?

**If YES** → Problem solved! 🎉

**If NO** → We've learned that the issue is deeper in Insomnia's architecture, and need to:
- File detailed bug reports with Kong
- Consider more invasive workarounds
- Or accept "restart Insomnia" as necessary

Either way, we've significantly improved the plugin and gained valuable architectural insights.