import {
  readWorkspaceRecords,
  writeWorkspaceRecords,
  readEnvironmentRecords,
  writeEnvironmentRecords,
  buildEnvironmentRecord,
  resolveProjectId,
  createId,
  nowMillis,
  type WorkspaceRecord,
  type EnvironmentRecord,
} from "./db.js";
import { toStoredCollection } from "./converters.js";
import {
  collectFoldersForWorkspace,
  collectRequestsForWorkspace,
  buildFolderLookup,
} from "./folderTree.js";
import { readRequestRecords, readRequestGroupRecords } from "./db.js";
import { DEFAULTS } from "./constants.js";
import type { StoredCollection } from "./types.js";

export interface CreateCollectionInput {
  name: string;
  description?: string;
}

/**
 * List all collections (workspaces with collection scope)
 */
export async function listCollections(): Promise<StoredCollection[]> {
  const workspaces = await readWorkspaceRecords();
  if (workspaces.length === 0) {
    return [];
  }
  const requests = await readRequestRecords();
  const requestGroups = await readRequestGroupRecords();
  const environments = await readEnvironmentRecords();
  const folderLookup = buildFolderLookup(requestGroups);
  const envByWorkspace = new Map<string, EnvironmentRecord>();
  for (const environment of environments) {
    if (typeof environment.parentId === "string") {
      envByWorkspace.set(environment.parentId, environment);
    }
  }

  let environmentsUpdated = false;
  const collections: StoredCollection[] = [];
  for (const workspace of workspaces) {
    if (workspace.scope !== DEFAULTS.COLLECTION_SCOPE) {
      continue;
    }
    const { environment, updated } = await ensureEnvironmentForWorkspace(
      workspace._id,
      environments
    );
    if (updated) {
      envByWorkspace.set(workspace._id, environment);
      environmentsUpdated = true;
    }
    const collectionFolders = collectFoldersForWorkspace(
      workspace._id,
      requestGroups,
      folderLookup
    );
    const collectionRequests = collectRequestsForWorkspace(workspace._id, requests, folderLookup);
    collections.push(
      toStoredCollection(workspace, environment, collectionRequests, collectionFolders)
    );
  }

  if (environmentsUpdated) {
    await writeEnvironmentRecords(environments);
  }

  return collections;
}

/**
 * Get a single collection by ID
 */
export async function getCollection(collectionId: string): Promise<StoredCollection | undefined> {
  const workspaces = await readWorkspaceRecords();
  const workspace = workspaces.find(
    (record) => record._id === collectionId && record.scope === DEFAULTS.COLLECTION_SCOPE
  );
  if (!workspace) {
    return undefined;
  }
  const requests = await readRequestRecords();
  const requestGroups = await readRequestGroupRecords();
  const environments = await readEnvironmentRecords();
  const folderLookup = buildFolderLookup(requestGroups);
  const { environment, updated } = await ensureEnvironmentForWorkspace(workspace._id, environments);
  if (updated) {
    await writeEnvironmentRecords(environments);
  }
  const collectionFolders = collectFoldersForWorkspace(workspace._id, requestGroups, folderLookup);
  const collectionRequests = collectRequestsForWorkspace(workspace._id, requests, folderLookup);
  return toStoredCollection(workspace, environment, collectionRequests, collectionFolders);
}

/**
 * Create a new collection
 *
 * Creates a new Insomnia workspace/collection with an associated base environment.
 * The collection is persisted to the Insomnia database files immediately.
 *
 * @param input - Collection configuration
 * @param input.name - Display name for the collection
 * @param input.description - Optional description
 *
 * @returns The created collection with generated ID, timestamps, and empty environment
 *
 * @example
 * ```typescript
 * const collection = await createCollection({
 *   name: "My API",
 *   description: "REST API for my application"
 * });
 * console.log(collection.id); // wrk_abc123...
 * ```
 */
export async function createCollection(input: CreateCollectionInput): Promise<StoredCollection> {
  const timestamp = nowMillis();
  const workspace: WorkspaceRecord = {
    _id: createId("wrk"),
    type: "Workspace",
    parentId: await resolveProjectId(),
    modified: timestamp,
    created: timestamp,
    name: input.name,
    description: input.description,
    scope: DEFAULTS.COLLECTION_SCOPE,
  };

  const workspaces = await readWorkspaceRecords();
  workspaces.push(workspace);
  await writeWorkspaceRecords(workspaces);

  const environments = await readEnvironmentRecords();
  const environmentRecord = buildEnvironmentRecord(workspace._id, timestamp);
  environments.push(environmentRecord);
  await writeEnvironmentRecords(environments);

  return toStoredCollection(workspace, environmentRecord, [], []);
}

/**
 * Load and validate a workspace by ID
 */
export async function loadWorkspace(workspaceId: string): Promise<{
  workspace: WorkspaceRecord;
  all: WorkspaceRecord[];
}> {
  const workspaces = await readWorkspaceRecords();
  const workspace = workspaces.find((record) => record._id === workspaceId);
  if (!workspace) {
    throw new Error(`Collection ${workspaceId} not found`);
  }
  return { workspace, all: workspaces };
}

/**
 * Ensure an environment exists for a workspace
 */
async function ensureEnvironmentForWorkspace(
  workspaceId: string,
  environments: EnvironmentRecord[]
): Promise<{ environment: EnvironmentRecord; updated: boolean }> {
  const existing = environments.find((record) => record.parentId === workspaceId);
  if (existing) {
    return { environment: existing, updated: false };
  }
  const timestamp = nowMillis();
  const environment = buildEnvironmentRecord(workspaceId, timestamp);
  environments.push(environment);
  return { environment, updated: true };
}

/**
 * Ensure sample data exists (creates base environments for existing workspaces)
 */
export async function ensureSampleData(): Promise<void> {
  const workspaces = await readWorkspaceRecords();
  if (workspaces.length === 0) {
    return;
  }
  const environments = await readEnvironmentRecords();
  let updated = false;
  for (const workspace of workspaces) {
    if (workspace.scope !== DEFAULTS.COLLECTION_SCOPE) {
      continue;
    }
    const { updated: created } = await ensureEnvironmentForWorkspace(workspace._id, environments);
    if (created) {
      updated = true;
    }
  }
  if (updated) {
    await writeEnvironmentRecords(environments);
  }
}
