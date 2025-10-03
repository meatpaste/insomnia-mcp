/**
 * EXPERIMENTAL: Export-Import Cycle for UI Refresh
 *
 * Theory: If we export the current Insomnia state and immediately re-import it,
 * maybe Insomnia will refresh the UI to reflect the imported data.
 *
 * Flow:
 * 1. MCP writes to NDJSON database (already working)
 * 2. Wait for MCP write to complete
 * 3. Export current Insomnia workspace (reads from DB)
 * 4. Re-import that export (triggers UI refresh?)
 */

const MCP_BASE_URL = 'http://localhost:3847';

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
    console.log(`[MCP Experimental] Failed to fetch ${endpoint}:`, error.message);
    return null;
  }
}

/**
 * APPROACH 1: Export-Import Round Trip
 * Export current state, then re-import to force refresh
 */
async function approachExportImportCycle(context) {
  try {
    console.log('[MCP Experimental] Approach 1: Export-Import Cycle');

    // Step 1: Export current Insomnia state
    console.log('[MCP Experimental] Exporting current workspace...');
    const exportedData = await context.data.export.insomnia({
      includePrivate: false,
      format: 'json'
    });

    console.log('[MCP Experimental] Export completed, data length:', exportedData.length);

    // Step 2: Re-import the exported data
    console.log('[MCP Experimental] Re-importing to trigger refresh...');
    await context.data.import.raw(exportedData);

    console.log('[MCP Experimental] ✅ Export-Import cycle completed');
    return 'Approach 1: Export-Import completed';
  } catch (error) {
    console.error('[MCP Experimental] Approach 1 failed:', error);
    throw error;
  }
}

/**
 * APPROACH 2: Selective Re-Import
 * Only re-import the specific workspace that changed
 */
async function approachSelectiveReImport(context, workspaceId) {
  try {
    console.log('[MCP Experimental] Approach 2: Selective Re-Import');

    // Step 1: Export full workspace
    const exportedData = await context.data.export.insomnia({
      includePrivate: false,
      format: 'json'
    });

    const parsed = JSON.parse(exportedData);
    console.log('[MCP Experimental] Exported resources:', parsed.resources?.length);

    // Step 2: Filter to only the changed workspace and its children
    if (workspaceId && parsed.resources) {
      const filtered = parsed.resources.filter(resource => {
        return resource._id === workspaceId || resource.parentId === workspaceId;
      });

      console.log('[MCP Experimental] Filtered to', filtered.length, 'resources');

      // Step 3: Re-import only the filtered resources
      const filteredExport = {
        ...parsed,
        resources: filtered
      };

      await context.data.import.raw(JSON.stringify(filteredExport));
      console.log('[MCP Experimental] ✅ Selective re-import completed');
      return `Approach 2: Selective re-import (${filtered.length} resources)`;
    } else {
      // Fallback to full re-import
      await context.data.import.raw(exportedData);
      console.log('[MCP Experimental] ✅ Full re-import completed');
      return 'Approach 2: Full re-import completed';
    }
  } catch (error) {
    console.error('[MCP Experimental] Approach 2 failed:', error);
    throw error;
  }
}

/**
 * APPROACH 3: MCP Export + Insomnia Import
 * Fetch from MCP, then export Insomnia state, merge, and re-import
 */
async function approachMergeAndReImport(context) {
  try {
    console.log('[MCP Experimental] Approach 3: Merge MCP + Insomnia Export');

    // Step 1: Get MCP state
    const mcpData = await fetchFromMCP('/collections/export');
    if (!mcpData) {
      throw new Error('Failed to fetch MCP collections');
    }

    console.log('[MCP Experimental] MCP resources:', mcpData.resources?.length);

    // Step 2: Export current Insomnia state
    const insomniaData = await context.data.export.insomnia({
      includePrivate: false,
      format: 'json'
    });
    const insomniaExport = JSON.parse(insomniaData);

    console.log('[MCP Experimental] Insomnia resources:', insomniaExport.resources?.length);

    // Step 3: Merge MCP resources with Insomnia resources
    const mcpResourceIds = new Set(mcpData.resources.map(r => r._id));
    const nonMcpResources = insomniaExport.resources.filter(r => !mcpResourceIds.has(r._id));

    const merged = {
      ...insomniaExport,
      resources: [...mcpData.resources, ...nonMcpResources]
    };

    console.log('[MCP Experimental] Merged resources:', merged.resources.length);

    // Step 4: Re-import merged data
    await context.data.import.raw(JSON.stringify(merged));

    console.log('[MCP Experimental] ✅ Merge and re-import completed');
    return `Approach 3: Merged ${mcpData.resources.length} MCP + ${nonMcpResources.length} Insomnia resources`;
  } catch (error) {
    console.error('[MCP Experimental] Approach 3 failed:', error);
    throw error;
  }
}

/**
 * APPROACH 4: Double Import
 * Import from MCP, then immediately export and re-import
 */
async function approachDoubleImport(context) {
  try {
    console.log('[MCP Experimental] Approach 4: Double Import');

    // Step 1: Import from MCP (writes to DB)
    const importUrl = `${MCP_BASE_URL}/collections/export`;
    console.log('[MCP Experimental] First import from MCP...');
    await context.data.import.uri(importUrl);

    // Step 2: Small delay to let first import settle
    await new Promise(resolve => setTimeout(resolve, 100));

    // Step 3: Export what we just imported
    console.log('[MCP Experimental] Exporting imported data...');
    const exported = await context.data.export.insomnia({
      includePrivate: false,
      format: 'json'
    });

    // Step 4: Re-import to force UI refresh
    console.log('[MCP Experimental] Re-importing to trigger refresh...');
    await context.data.import.raw(exported);

    console.log('[MCP Experimental] ✅ Double import completed');
    return 'Approach 4: Double import completed';
  } catch (error) {
    console.error('[MCP Experimental] Approach 4 failed:', error);
    throw error;
  }
}

// Export test actions
module.exports.workspaceActions = [
  {
    label: '[TEST] Export-Import Cycle',
    icon: 'fa-flask',
    action: async (context) => {
      try {
        const result = await approachExportImportCycle(context);
        context.app.alert('Test Result', `${result}\n\nCheck console for details.\n\nDid UI refresh? 🤔`);
      } catch (error) {
        context.app.alert('Test Failed', error.message);
      }
    }
  },
  {
    label: '[TEST] Selective Re-Import',
    icon: 'fa-flask',
    action: async (context) => {
      try {
        const result = await approachSelectiveReImport(context);
        context.app.alert('Test Result', `${result}\n\nCheck console for details.\n\nDid UI refresh? 🤔`);
      } catch (error) {
        context.app.alert('Test Failed', error.message);
      }
    }
  },
  {
    label: '[TEST] Merge & Re-Import',
    icon: 'fa-flask',
    action: async (context) => {
      try {
        const result = await approachMergeAndReImport(context);
        context.app.alert('Test Result', `${result}\n\nCheck console for details.\n\nDid UI refresh? 🤔`);
      } catch (error) {
        context.app.alert('Test Failed', error.message);
      }
    }
  },
  {
    label: '[TEST] Double Import',
    icon: 'fa-flask',
    action: async (context) => {
      try {
        const result = await approachDoubleImport(context);
        context.app.alert('Test Result', `${result}\n\nCheck console for details.\n\nDid UI refresh? 🤔`);
      } catch (error) {
        context.app.alert('Test Failed', error.message);
      }
    }
  },
  {
    label: '[TEST] All Approaches',
    icon: 'fa-flask',
    action: async (context) => {
      const results = [];

      try {
        results.push(await approachExportImportCycle(context));
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (e) {
        results.push('Approach 1: Failed - ' + e.message);
      }

      try {
        results.push(await approachSelectiveReImport(context));
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (e) {
        results.push('Approach 2: Failed - ' + e.message);
      }

      try {
        results.push(await approachMergeAndReImport(context));
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (e) {
        results.push('Approach 3: Failed - ' + e.message);
      }

      try {
        results.push(await approachDoubleImport(context));
      } catch (e) {
        results.push('Approach 4: Failed - ' + e.message);
      }

      context.app.alert(
        'All Tests Complete',
        results.join('\n\n') + '\n\n🤔 Did ANY approach refresh the UI?'
      );
    }
  }
];