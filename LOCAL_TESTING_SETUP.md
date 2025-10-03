# Local Testing Setup - See All The Logs!

## Current Problem

You've been using the published npm package via Claude Desktop config, which hides all the logs. We need to run the MCP server locally in a terminal to see what's happening.

## Setup Steps

### Step 1: Build the Local MCP Server

```bash
cd /Users/roger.hughes/repo/insomnia-mcp
npm run build
```

This compiles TypeScript → JavaScript in the `dist/` folder.

### Step 2: Update Claude Desktop Config to Use Local Server

Open Claude Desktop config:

```bash
# macOS
code ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Or manually open:
# ~/Library/Application Support/Claude/claude_desktop_config.json
```

**Change from** (published npm):
```json
{
  "mcpServers": {
    "insomnia": {
      "command": "npx",
      "args": ["insomnia-mcp@latest"]
    }
  }
}
```

**Change to** (local development):
```json
{
  "mcpServers": {
    "insomnia": {
      "command": "node",
      "args": ["/Users/roger.hughes/repo/insomnia-mcp/dist/index.js"]
    }
  }
}
```

**Save and restart Claude Desktop** (⌘Q then reopen)

### Step 3: Open Multiple Terminals

#### Terminal 1: Watch MCP Logs
```bash
# This shows Claude Desktop's stdout/stderr which includes our MCP logs
tail -f ~/Library/Logs/Claude/mcp*.log
```

Or on some systems:
```bash
# Alternative log location
tail -f ~/Library/Application\ Support/Claude/logs/mcp*.log
```

**Note**: You might need to find the exact log location. Try:
```bash
find ~/Library -name "mcp*.log" 2>/dev/null
```

#### Terminal 2: Monitor Insomnia Data Directory
```bash
# Watch for file changes in Insomnia's database
watch -n 1 'ls -lth ~/Library/Application\ Support/Insomnia/*.db | head -5'
```

This updates every second showing the most recently modified DB files.

#### Terminal 3: Claude Desktop
Keep Claude Desktop open for sending commands.

### Step 4: Test the Setup

**In Claude Desktop**, say:
```
Create an Insomnia collection called "Local Test Collection"
```

**Watch Terminal 1** for MCP logs:
```
┌─────────────────────────────────────────────────
│ 🔧 MCP TOOL: create_collection
├─────────────────────────────────────────────────
│ Input: { "name": "Local Test Collection" }
└─────────────────────────────────────────────────
```

If you see logs → ✅ Setup working!
If no logs → See troubleshooting below.

---

## Alternative: Run MCP Server Standalone (More Reliable)

If Claude Desktop's logs are hard to find, run the MCP server separately:

### Option A: Run with Environment Variable

```bash
cd /Users/roger.hughes/repo/insomnia-mcp

# Run the server directly
node dist/index.js
```

**You'll see**:
```
🌐 Insomnia MCP HTTP Server running on http://localhost:3847
📥 Import URL: http://localhost:3847/collections/export
```

**But wait!** This won't work with Claude Desktop because MCP protocol runs over stdio.

### Option B: Run MCP Server with Test Harness

We need to create a test script that exercises the MCP server:

```bash
# Create a test script
cat > /Users/roger.hughes/repo/insomnia-mcp/test-mcp-local.js << 'EOF'
#!/usr/bin/env node

/**
 * Test harness for MCP server - simulates Claude Desktop
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';

console.log('🧪 Starting MCP Server Test Harness\n');

// Spawn the MCP server
const mcp = spawn('node', ['./dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Read MCP stdout
const rl = createInterface({
  input: mcp.stdout,
  crlfDelay: Infinity
});

rl.on('line', (line) => {
  console.log('[MCP →]', line);
});

// Read MCP stderr (our console.logs)
mcp.stderr.on('data', (data) => {
  console.log('[MCP ERR]', data.toString());
});

// Send test commands
setTimeout(() => {
  console.log('\n📤 Sending: initialize request\n');

  mcp.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-harness',
        version: '1.0.0'
      }
    }
  }) + '\n');
}, 1000);

setTimeout(() => {
  console.log('\n📤 Sending: list_tools request\n');

  mcp.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list'
  }) + '\n');
}, 2000);

setTimeout(() => {
  console.log('\n📤 Sending: create_collection tool call\n');

  mcp.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'create_collection',
      arguments: {
        name: 'Test Local Collection',
        description: 'Created via local test harness'
      }
    }
  }) + '\n');
}, 3000);

// Keep alive
setTimeout(() => {
  console.log('\n✅ Test complete. Press Ctrl+C to exit.\n');
}, 5000);

process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down...\n');
  mcp.kill();
  process.exit(0);
});
EOF

chmod +x /Users/roger.hughes/repo/insomnia-mcp/test-mcp-local.js
```

**Run it**:
```bash
cd /Users/roger.hughes/repo/insomnia-mcp
node test-mcp-local.js
```

**You'll see ALL the logs** including our debug output!

---

## Easier Option: Just Run HTTP Server Separately

The HTTP server has all the same logging, and we can test the plugin independently:

```bash
cd /Users/roger.hughes/repo/insomnia-mcp

# Start just the HTTP server part
node -e "
import('./dist/index.js').then(async (module) => {
  console.log('Starting HTTP server only...');
  // HTTP server starts automatically
  process.stdin.resume();
});
"
```

This is simpler because:
- ✅ HTTP server logs are visible
- ✅ Plugin can still poll it
- ✅ Can manually test endpoints

**Test it**:
```bash
# In another terminal
curl http://localhost:3847/health
curl http://localhost:3847/collections
curl http://localhost:3847/collections/hash
```

But this won't work with Claude Desktop (no MCP protocol).

---

## Recommended Solution: Use Published Package + Check Logs

Keep using the published package, but find Claude's logs:

```bash
# Find all Claude-related logs
find ~/Library -name "*.log" -path "*/Claude/*" 2>/dev/null

# Common locations:
ls -la ~/Library/Logs/Claude/
ls -la ~/Library/Application\ Support/Claude/logs/
```

**Once you find the log directory**:
```bash
# Follow all logs
tail -f ~/Library/Logs/Claude/*.log

# Or just MCP logs
tail -f ~/Library/Logs/Claude/mcp-*.log
```

**Pro tip**: Keep this terminal open while using Claude Desktop. All our console.log() calls will appear here.

---

## Quick Test Checklist

### ✅ Verify MCP Server is Running

**Via Claude Desktop**:
Say: "List my Insomnia collections"

**Via HTTP** (if server is running):
```bash
curl http://localhost:3847/health
```

Should return: `{"status":"ok",...}`

### ✅ Verify Plugin is Loaded

**In Insomnia**:
1. Preferences → Plugins
2. Look for "mcp-refresh"
3. Should show version 0.0.6

### ✅ Verify Plugin Can Reach MCP

**In Insomnia**:
1. Right-click workspace
2. Click "[DEBUG] Test Full Sync Flow"
3. Alert should show all green ✅

### ✅ Verify Logging Works

**In Insomnia DevTools** (View → Toggle DevTools):
1. Console tab
2. Filter: "[MCP Auto-Refresh]"
3. Should see logs

**In MCP logs** (wherever you found them):
```bash
tail -f <log-file>
```

Should see logs when creating collections.

---

## If You Still Can't See Logs

### Nuclear Option: Add File Logging

Edit `src/tools/tool_create_collection.ts`:

```typescript
import { appendFileSync } from 'fs';

// At start of tool function
appendFileSync('/tmp/mcp-debug.log',
  `[${new Date().toISOString()}] create_collection called: ${JSON.stringify(args)}\n`
);
```

Then rebuild:
```bash
npm run build
```

Now check:
```bash
tail -f /tmp/mcp-debug.log
```

This WILL show up no matter what!

---

## My Recommendation

**Easiest path forward**:

1. Keep using published npm package
2. Find Claude's log directory:
   ```bash
   find ~/Library -name "*.log" -path "*/Claude/*" 2>/dev/null
   ```
3. Tail those logs:
   ```bash
   tail -f <path-to-claude-logs>/*.log
   ```
4. Use Insomnia DevTools for plugin logs (View → Toggle DevTools)
5. Use `[DEBUG] Test Full Sync Flow` action to verify everything

This gives you visibility without changing your setup!

Want me to help you find the Claude logs directory?