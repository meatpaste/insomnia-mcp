import {
  readRequestGroupRecords,
  writeRequestGroupRecords,
  readRequestRecords,
  writeRequestRecords,
  writeWorkspaceRecords,
  createId,
  nowMillis,
  type RequestGroupRecord,
} from "./db.js";
import { toStoredFolder } from "./converters.js";
import {
  buildFolderLookup,
  resolveFolderParentId,
  folderBelongsToWorkspace,
  ensureNoFolderCycle,
  collectDescendantFolderIds,
} from "./folderTree.js";
import { loadWorkspace } from "./collections.js";
import type { StoredFolder } from "./types.js";

export interface CreateFolderInput {
  collectionId: string;
  name: string;
  description?: string;
  parentId?: string | null;
}

export interface UpdateFolderInput {
  collectionId: string;
  folderId: string;
  name?: string;
  description?: string | null;
  parentId?: string | null;
}

export interface DeleteFolderInput {
  collectionId: string;
  folderId: string;
}

export interface GetFolderInput {
  collectionId: string;
  folderId: string;
}

/**
 * Create a new folder (request group)
 */
export async function createFolder(input: CreateFolderInput): Promise<StoredFolder> {
  const { workspace, all } = await loadWorkspace(input.collectionId);
  const timestamp = nowMillis();
  const folders = await readRequestGroupRecords();
  const folderLookup = buildFolderLookup(folders);
  const parentId = resolveFolderParentId(workspace._id, input.parentId ?? undefined, folderLookup);
  const folderRecord = buildFolderRecord(parentId, input, timestamp);

  folders.push(folderRecord);
  await writeRequestGroupRecords(folders);

  workspace.modified = timestamp;
  await writeWorkspaceRecords(all);

  return toStoredFolder(folderRecord);
}

/**
 * Update an existing folder
 */
export async function updateFolder(input: UpdateFolderInput): Promise<StoredFolder> {
  const { workspace, all } = await loadWorkspace(input.collectionId);
  const folders = await readRequestGroupRecords();
  const folderLookup = buildFolderLookup(folders);
  const folder = folders.find((record) => record._id === input.folderId);
  if (!folder || !folderBelongsToWorkspace(folder, workspace._id, folderLookup)) {
    throw new Error(`Folder ${input.folderId} not found`);
  }

  const timestamp = nowMillis();

  if (input.parentId !== undefined) {
    const newParentId = resolveFolderParentId(workspace._id, input.parentId ?? undefined, folderLookup);
    if (newParentId !== workspace._id) {
      ensureNoFolderCycle(folder._id, newParentId, folderLookup);
    }
    folder.parentId = newParentId;
  }

  if (input.name !== undefined) {
    folder.name = input.name;
  }
  if (input.description !== undefined) {
    folder.description = input.description ?? undefined;
  }

  folder.modified = timestamp;
  folder.metaSortKey = -timestamp;
  folderLookup.set(folder._id, folder);

  await writeRequestGroupRecords(folders);

  workspace.modified = timestamp;
  await writeWorkspaceRecords(all);

  return toStoredFolder(folder);
}

/**
 * Delete a folder and all its descendants (folders and requests)
 */
export async function deleteFolder(input: DeleteFolderInput): Promise<void> {
  const { workspace, all } = await loadWorkspace(input.collectionId);
  const folders = await readRequestGroupRecords();
  const folderLookup = buildFolderLookup(folders);
  const folder = folderLookup.get(input.folderId);
  if (!folder || !folderBelongsToWorkspace(folder, workspace._id, folderLookup)) {
    throw new Error(`Folder ${input.folderId} not found`);
  }

  const requests = await readRequestRecords();
  const descendantIds = collectDescendantFolderIds(folder._id, folderLookup);

  const remainingFolders = folders.filter((record) => !descendantIds.has(record._id));
  const remainingRequests = requests.filter((record) => !descendantIds.has(record.parentId));

  await writeRequestGroupRecords(remainingFolders);
  await writeRequestRecords(remainingRequests);

  const timestamp = nowMillis();
  workspace.modified = timestamp;
  await writeWorkspaceRecords(all);
}

/**
 * Get a single folder
 */
export async function getFolder(input: GetFolderInput): Promise<StoredFolder> {
  const { workspace } = await loadWorkspace(input.collectionId);
  const folders = await readRequestGroupRecords();
  const folderLookup = buildFolderLookup(folders);
  const folder = folderLookup.get(input.folderId);
  if (!folder || !folderBelongsToWorkspace(folder, workspace._id, folderLookup)) {
    throw new Error(`Folder ${input.folderId} not found`);
  }
  return toStoredFolder(folder);
}

/**
 * Build a folder record from input
 */
function buildFolderRecord(parentId: string, input: CreateFolderInput, timestamp: number): RequestGroupRecord {
  return {
    _id: createId("fld"),
    type: "RequestGroup",
    parentId,
    modified: timestamp,
    created: timestamp,
    name: input.name,
    description: input.description,
    environment: {},
    environmentPropertyOrder: null,
    metaSortKey: -timestamp,
    environmentType: "kv",
  };
}