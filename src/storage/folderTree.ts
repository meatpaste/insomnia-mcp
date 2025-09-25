import type { RequestGroupRecord, RequestRecord } from "./db.js";

export function buildFolderLookup(
  folders: RequestGroupRecord[]
): Map<string, RequestGroupRecord> {
  const lookup = new Map<string, RequestGroupRecord>();
  for (const folder of folders) {
    lookup.set(folder._id, folder);
  }
  return lookup;
}

export function folderBelongsToWorkspace(
  folder: RequestGroupRecord,
  workspaceId: string,
  folderLookup: Map<string, RequestGroupRecord>
): boolean {
  let parentId = folder.parentId;
  const visited = new Set<string>();
  while (parentId) {
    if (parentId === workspaceId) {
      return true;
    }
    if (visited.has(parentId)) {
      break;
    }
    visited.add(parentId);
    const parentFolder = folderLookup.get(parentId);
    if (!parentFolder) {
      break;
    }
    parentId = parentFolder.parentId;
  }
  return false;
}

export function collectFoldersForWorkspace(
  workspaceId: string,
  folders: RequestGroupRecord[],
  folderLookup: Map<string, RequestGroupRecord>
): RequestGroupRecord[] {
  return folders.filter((folder) => folderBelongsToWorkspace(folder, workspaceId, folderLookup));
}

export function requestBelongsToWorkspace(
  request: RequestRecord,
  workspaceId: string,
  folderLookup: Map<string, RequestGroupRecord>
): boolean {
  if (request.parentId === workspaceId) {
    return true;
  }
  const folder = folderLookup.get(request.parentId);
  if (!folder) {
    return false;
  }
  return folderBelongsToWorkspace(folder, workspaceId, folderLookup);
}

export function collectRequestsForWorkspace(
  workspaceId: string,
  requests: RequestRecord[],
  folderLookup: Map<string, RequestGroupRecord>
): RequestRecord[] {
  return requests.filter((request) => requestBelongsToWorkspace(request, workspaceId, folderLookup));
}

export function ensureFolderInWorkspace(
  folderId: string,
  workspaceId: string,
  folderLookup: Map<string, RequestGroupRecord>
): RequestGroupRecord {
  const folder = folderLookup.get(folderId);
  if (!folder) {
    throw new Error(`Folder ${folderId} not found`);
  }
  if (!folderBelongsToWorkspace(folder, workspaceId, folderLookup)) {
    throw new Error(`Folder ${folderId} does not belong to collection ${workspaceId}`);
  }
  return folder;
}

export function resolveFolderParentId(
  workspaceId: string,
  parentId: string | null | undefined,
  folderLookup: Map<string, RequestGroupRecord>
): string {
  if (!parentId || parentId === workspaceId) {
    return workspaceId;
  }
  const folder = ensureFolderInWorkspace(parentId, workspaceId, folderLookup);
  return folder._id;
}

export function resolveRequestParentId(
  workspaceId: string,
  folderId: string | null | undefined,
  folderLookup: Map<string, RequestGroupRecord>
): string {
  return resolveFolderParentId(workspaceId, folderId ?? undefined, folderLookup);
}

export function ensureNoFolderCycle(
  folderId: string,
  parentId: string,
  folderLookup: Map<string, RequestGroupRecord>
): void {
  let currentId: string | undefined = parentId;
  const visited = new Set<string>();
  while (currentId) {
    if (currentId === folderId) {
      throw new Error("Cannot move a folder into itself or its descendants");
    }
    if (visited.has(currentId)) {
      break;
    }
    visited.add(currentId);
    const parentFolder = folderLookup.get(currentId);
    if (!parentFolder) {
      break;
    }
    currentId = parentFolder.parentId;
  }
}

export function collectDescendantFolderIds(
  folderId: string,
  folderLookup: Map<string, RequestGroupRecord>
): Set<string> {
  const descendants = new Set<string>();
  const stack: string[] = [folderId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (descendants.has(current)) {
      continue;
    }
    descendants.add(current);
    for (const folder of folderLookup.values()) {
      if (folder.parentId === current) {
        stack.push(folder._id);
      }
    }
  }
  return descendants;
}
