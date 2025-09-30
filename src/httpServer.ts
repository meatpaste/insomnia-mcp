/**
 * HTTP Server for serving Insomnia collections
 *
 * This server runs alongside the MCP server to provide HTTP endpoints
 * that Insomnia can import from, enabling auto-refresh functionality.
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { config } from './config.js';
import { listCollections, getCollection } from './storage/index.js';

const PORT = config.httpServer.port;
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

interface InsomniaExport {
  _type: 'export';
  __export_format: number;
  __export_date: string;
  __export_source: string;
  resources: any[];
}

/**
 * Convert collections to Insomnia export format
 */
async function generateInsomniaExport(): Promise<InsomniaExport> {
  const collections = await listCollections();
  const resources: any[] = [];

  for (const collection of collections) {
    try {
      const fullCollection = await getCollection(collection.id);

      // Add workspace
      resources.push({
        _id: fullCollection.id,
        _type: 'workspace',
        created: Date.now(),
        modified: Date.now(),
        name: fullCollection.name,
        description: fullCollection.description || '',
        scope: 'collection'
      });

      // Add requests
      if (fullCollection.requests) {
        for (const request of fullCollection.requests) {
          resources.push({
            _id: request.id,
            _type: 'request',
            parentId: request.folderId || fullCollection.id,
            created: Date.now(),
            modified: Date.now(),
            name: request.name,
            description: request.description || '',
            url: request.url,
            method: request.method,
            headers: request.headers || [],
            body: request.body ? {
              mimeType: request.body.mimeType || 'application/json',
              text: request.body.text || ''
            } : undefined,
            parameters: []
          });
        }
      }

      // Add folders
      if (fullCollection.folders) {
        for (const folder of fullCollection.folders) {
          resources.push({
            _id: folder.id,
            _type: 'request_group',
            parentId: folder.parentId || fullCollection.id,
            created: Date.now(),
            modified: Date.now(),
            name: folder.name,
            description: folder.description || '',
            environment: {}
          });
        }
      }

      // Add environments
      if (fullCollection.environments) {
        for (const env of fullCollection.environments) {
          resources.push({
            _id: env.id,
            _type: 'environment',
            parentId: fullCollection.id,
            created: Date.now(),
            modified: Date.now(),
            name: env.name,
            data: env.variables || {},
            isPrivate: false
          });
        }
      }
    } catch (error) {
      console.error(`Error processing collection ${collection.id}:`, error);
    }
  }

  return {
    _type: 'export',
    __export_format: 4,
    __export_date: new Date().toISOString(),
    __export_source: 'insomnia-mcp-server',
    resources
  };
}

/**
 * Handle HTTP requests
 */
async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  // Set CORS headers
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://localhost:${PORT}`);

  try {
    switch (url.pathname) {
      case '/':
      case '/health':
        res.statusCode = 200;
        res.end(JSON.stringify({
          status: 'ok',
          message: 'Insomnia MCP HTTP Server',
          endpoints: ['/collections', '/collections/export']
        }));
        break;

      case '/collections':
        const collections = await listCollections();
        res.statusCode = 200;
        res.end(JSON.stringify({ collections }));
        break;

      case '/collections/export':
        const exportData = await generateInsomniaExport();
        res.statusCode = 200;
        res.end(JSON.stringify(exportData, null, 2));
        break;

      case '/collections/hash':
        // Return a hash of current collections for change detection
        const collectionsForHash = await listCollections();
        const hash = Buffer.from(JSON.stringify(collectionsForHash)).toString('base64');
        res.statusCode = 200;
        res.end(JSON.stringify({ hash, timestamp: Date.now() }));
        break;

      default:
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Not found' }));
    }
  } catch (error) {
    console.error('HTTP Server Error:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}

/**
 * Start the HTTP server
 */
export function startHttpServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = createServer(handleRequest);

    server.listen(PORT, () => {
      console.log(`🌐 Insomnia MCP HTTP Server running on http://localhost:${PORT}`);
      console.log(`📥 Import URL: http://localhost:${PORT}/collections/export`);
      resolve();
    });

    server.on('error', (error) => {
      if ((error as any).code === 'EADDRINUSE') {
        console.log(`⚠️  Port ${PORT} already in use - HTTP server not started`);
        resolve(); // Don't fail the entire process
      } else {
        reject(error);
      }
    });
  });
}