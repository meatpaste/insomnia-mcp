import {
  readRequestRecords,
  writeRequestRecords,
  readRequestGroupRecords,
  writeWorkspaceRecords,
  createId,
  nowMillis,
  type RequestRecord,
} from "./db.js";
import { toStoredRequest } from "./converters.js";
import { buildFolderLookup, resolveRequestParentId, requestBelongsToWorkspace } from "./folderTree.js";
import { loadWorkspace } from "./collections.js";
import type { StoredRequest, StoredRequestHeader, StoredRequestBody } from "./types.js";

export interface CreateRequestInput {
  collectionId: string;
  name: string;
  method: string;
  url: string;
  headers?: StoredRequestHeader[];
  body?: StoredRequestBody | null;
  description?: string;
  folderId?: string | null;
  preRequestScript?: string;
  afterResponseScript?: string;
}

export interface UpdateRequestInput {
  collectionId: string;
  requestId: string;
  name?: string;
  method?: string;
  url?: string;
  headers?: StoredRequestHeader[];
  body?: StoredRequestBody | null;
  description?: string | null;
  folderId?: string | null;
  preRequestScript?: string | null;
  afterResponseScript?: string | null;
}

export interface DeleteRequestInput {
  collectionId: string;
  requestId: string;
}

export interface GetRequestInput {
  collectionId: string;
  requestId: string;
}

/**
 * Create a new HTTP request in a collection
 *
 * Creates an HTTP request with the specified method, URL, headers, and body.
 * Requests can be placed in folders for organization. The request is persisted
 * to Insomnia's database immediately.
 *
 * @param input - Request configuration
 * @param input.collectionId - The collection to add the request to (required)
 * @param input.name - Display name for the request (required)
 * @param input.method - HTTP method (GET, POST, PUT, DELETE, etc.) (required)
 * @param input.url - Request URL, supports {{template}} variables (required)
 * @param input.folderId - Optional folder to place request in
 * @param input.headers - Optional array of HTTP headers
 * @param input.body - Optional request body with mimeType and text
 * @param input.description - Optional description
 * @param input.preRequestScript - Optional JavaScript to run before request
 * @param input.afterResponseScript - Optional JavaScript to run after response
 *
 * @returns The created request with generated ID and timestamps
 *
 * @throws {Error} If collection doesn't exist
 * @throws {Error} If folderId is provided but folder doesn't exist
 *
 * @example
 * ```typescript
 * const request = await createRequest({
 *   collectionId: 'wrk_abc123',
 *   name: 'Get Users',
 *   method: 'GET',
 *   url: 'https://api.example.com/users',
 *   headers: [{ name: 'Authorization', value: 'Bearer {{token}}' }],
 *   folderId: 'fld_xyz789'
 * });
 * ```
 */
export async function createRequest(input: CreateRequestInput): Promise<StoredRequest> {
  const { workspace, all } = await loadWorkspace(input.collectionId);
  const timestamp = nowMillis();
  const requestGroups = await readRequestGroupRecords();
  const folderLookup = buildFolderLookup(requestGroups);
  const parentId = resolveRequestParentId(workspace._id, input.folderId ?? undefined, folderLookup);
  const requestRecord = buildRequestRecord(parentId, input, timestamp);

  const requests = await readRequestRecords();
  requests.push(requestRecord);
  await writeRequestRecords(requests);

  workspace.modified = timestamp;
  await writeWorkspaceRecords(all);

  return toStoredRequest(requestRecord, workspace._id);
}

/**
 * Update an existing request
 */
export async function updateRequest(input: UpdateRequestInput): Promise<StoredRequest> {
  const { workspace, all } = await loadWorkspace(input.collectionId);
  const requestGroups = await readRequestGroupRecords();
  const folderLookup = buildFolderLookup(requestGroups);
  const requests = await readRequestRecords();
  const request = requests.find((record) => record._id === input.requestId);
  if (!request || !requestBelongsToWorkspace(request, workspace._id, folderLookup)) {
    throw new Error(`Request ${input.requestId} not found`);
  }

  if (input.folderId !== undefined) {
    const newParentId = resolveRequestParentId(workspace._id, input.folderId ?? undefined, folderLookup);
    request.parentId = newParentId;
  }

  if (input.name !== undefined) {
    request.name = input.name;
  }
  if (input.method !== undefined) {
    request.method = input.method.toUpperCase();
  }
  if (input.url !== undefined) {
    request.url = input.url;
  }
  if (input.headers !== undefined) {
    request.headers = input.headers;
  }
  if (input.body !== undefined) {
    request.body = input.body;
  }
  if (input.description !== undefined) {
    request.description = input.description ?? undefined;
  }
  if (input.preRequestScript !== undefined) {
    if (input.preRequestScript === null || (typeof input.preRequestScript === 'string' && input.preRequestScript.trim().length === 0)) {
      // Remove the field entirely for empty/null scripts
      delete request.preRequestScript;
    } else {
      request.preRequestScript = input.preRequestScript;
    }
  }
  if (input.afterResponseScript !== undefined) {
    if (input.afterResponseScript === null || (typeof input.afterResponseScript === 'string' && input.afterResponseScript.trim().length === 0)) {
      // Remove the field entirely for empty/null scripts
      delete request.afterResponseScript;
    } else {
      request.afterResponseScript = input.afterResponseScript;
    }
  }

  const timestamp = nowMillis();
  request.modified = timestamp;

  await writeRequestRecords(requests);

  workspace.modified = timestamp;
  await writeWorkspaceRecords(all);

  return toStoredRequest(request, workspace._id);
}

/**
 * Delete a request
 */
export async function deleteRequest(input: DeleteRequestInput): Promise<void> {
  const { workspace, all } = await loadWorkspace(input.collectionId);
  const requestGroups = await readRequestGroupRecords();
  const folderLookup = buildFolderLookup(requestGroups);
  const requests = await readRequestRecords();
  const index = requests.findIndex((record) => record._id === input.requestId);
  if (index === -1) {
    throw new Error(`Request ${input.requestId} not found`);
  }
  if (!requestBelongsToWorkspace(requests[index], workspace._id, folderLookup)) {
    throw new Error(`Request ${input.requestId} not found`);
  }

  requests.splice(index, 1);
  await writeRequestRecords(requests);

  const timestamp = nowMillis();
  workspace.modified = timestamp;
  await writeWorkspaceRecords(all);
}

/**
 * Get a single request
 */
export async function getRequest(input: GetRequestInput): Promise<StoredRequest> {
  const { workspace } = await loadWorkspace(input.collectionId);
  const requestGroups = await readRequestGroupRecords();
  const folderLookup = buildFolderLookup(requestGroups);
  const requests = await readRequestRecords();
  const request = requests.find((record) => record._id === input.requestId);
  if (!request || !requestBelongsToWorkspace(request, workspace._id, folderLookup)) {
    throw new Error(`Request ${input.requestId} not found`);
  }
  return toStoredRequest(request, workspace._id);
}

/**
 * Build a request record from input
 */
function buildRequestRecord(parentId: string, input: CreateRequestInput, timestamp: number): RequestRecord {
  const headers = input.headers ?? [];
  const record: RequestRecord = {
    _id: createId("req"),
    type: "Request",
    parentId,
    modified: timestamp,
    created: timestamp,
    url: input.url,
    name: input.name,
    description: input.description,
    method: input.method.toUpperCase(),
    headers,
    body: input.body ?? null,
    parameters: [],
    authentication: {},
    metaSortKey: -timestamp,
    isPrivate: false,
    settingStoreCookies: true,
    settingSendCookies: true,
    settingDisableRenderRequestBody: false,
    settingEncodeUrl: true,
    settingRebuildPath: true,
    settingFollowRedirects: "global",
  };

  // Only include script fields if they have non-empty content
  if (input.preRequestScript && input.preRequestScript.trim().length > 0) {
    record.preRequestScript = input.preRequestScript;
  }
  if (input.afterResponseScript && input.afterResponseScript.trim().length > 0) {
    record.afterResponseScript = input.afterResponseScript;
  }

  return record;
}