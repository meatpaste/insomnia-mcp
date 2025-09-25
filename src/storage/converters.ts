import type {
  EnvironmentRecord,
  RequestGroupRecord,
  RequestRecord,
  WorkspaceRecord,
} from "./db.js";
import { toIso } from "./db.js";
import type { StoredCollection, StoredEnvironment, StoredFolder, StoredRequest } from "./types.js";

export function toStoredRequest(record: RequestRecord, collectionId: string): StoredRequest {
  return {
    id: record._id,
    collectionId,
    name: record.name,
    method: record.method,
    url: record.url,
    headers: Array.isArray(record.headers) ? record.headers : [],
    body: record.body ?? null,
    description: typeof record.description === "string" ? record.description : undefined,
    folderId: record.parentId !== collectionId ? record.parentId : undefined,
    preRequestScript: typeof record.preRequestScript === "string" ? record.preRequestScript : undefined,
    afterResponseScript:
      typeof record.afterResponseScript === "string" ? record.afterResponseScript : undefined,
    createdAt: toIso(record.created),
    updatedAt: toIso(record.modified),
  };
}

export function toStoredEnvironment(record: EnvironmentRecord): StoredEnvironment {
  return {
    id: record._id,
    name: record.name,
    variables: (record.data as Record<string, unknown> | undefined) ?? {},
    createdAt: toIso(record.created),
    updatedAt: toIso(record.modified),
  };
}

export function toStoredFolder(record: RequestGroupRecord): StoredFolder {
  return {
    id: record._id,
    name: record.name,
    description:
      typeof record.description === "string" && record.description.length > 0
        ? record.description
        : undefined,
    parentId: record.parentId,
    createdAt: toIso(record.created),
    updatedAt: toIso(record.modified),
  };
}

export function toStoredCollection(
  workspace: WorkspaceRecord,
  environment: EnvironmentRecord,
  requests: RequestRecord[],
  folders: RequestGroupRecord[]
): StoredCollection {
  return {
    id: workspace._id,
    name: workspace.name,
    description:
      typeof workspace.description === "string" && workspace.description.length > 0
        ? workspace.description
        : undefined,
    environment: toStoredEnvironment(environment),
    folders: folders.map(toStoredFolder),
    requests: requests.map((request) => toStoredRequest(request, workspace._id)),
    createdAt: toIso(workspace.created),
    updatedAt: toIso(workspace.modified),
  };
}
