import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";

import type {
  StoredCollection,
  StoredEnvironment,
  StoredFolder,
  StoredRequest,
  StoredRequestBody,
  StoredRequestHeader,
} from "./types.js";

export const WORKSPACE_FILE = "insomnia.Workspace.db";
export const REQUEST_FILE = "insomnia.Request.db";
export const REQUEST_GROUP_FILE = "insomnia.RequestGroup.db";
export const ENVIRONMENT_FILE = "insomnia.Environment.db";
export const PROJECT_FILE = "insomnia.Project.db";
export const DEFAULT_ENVIRONMENT_NAME = "Base Environment";

export type NdjsonRecord = {
  _id: string;
  type: string;
  [key: string]: unknown;
};

export interface WorkspaceRecord extends NdjsonRecord {
  parentId: string;
  modified: number;
  created: number;
  name: string;
  description?: string;
  scope: string;
}

export interface RequestRecord extends NdjsonRecord {
  parentId: string;
  modified: number;
  created: number;
  url: string;
  name: string;
  description?: string;
  method: string;
  headers?: StoredRequestHeader[];
  body?: StoredRequestBody | null;
  preRequestScript?: string;
  afterResponseScript?: string;
  parameters?: unknown[];
  authentication?: Record<string, unknown>;
  metaSortKey?: number;
  isPrivate?: boolean;
  settingStoreCookies?: boolean;
  settingSendCookies?: boolean;
  settingDisableRenderRequestBody?: boolean;
  settingEncodeUrl?: boolean;
  settingRebuildPath?: boolean;
  settingFollowRedirects?: string;
}

export interface RequestGroupRecord extends NdjsonRecord {
  parentId: string;
  modified: number;
  created: number;
  name: string;
  description?: string;
  environment?: Record<string, unknown> | null;
  environmentPropertyOrder?: unknown;
  metaSortKey?: number;
  environmentType?: string;
}

export interface EnvironmentRecord extends NdjsonRecord {
  parentId: string;
  modified: number;
  created: number;
  name: string;
  data?: Record<string, unknown> | null;
  dataPropertyOrder?: unknown;
  color?: string | null;
  isPrivate?: boolean;
  metaSortKey?: number;
  environmentType?: string;
}

export interface ProjectRecord extends NdjsonRecord {
  name?: string;
  remoteId?: string | null;
}

function getDefaultInsomniaDir(): string {
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "Insomnia");
  }
  if (process.platform === "win32") {
    return path.join(os.homedir(), "AppData", "Roaming", "Insomnia");
  }
  return path.join(os.homedir(), ".config", "Insomnia");
}

export function getDataDir(): string {
  return process.env.INSOMNIA_APP_DATA_DIR ?? getDefaultInsomniaDir();
}

function filePath(fileName: string): string {
  return path.join(getDataDir(), fileName);
}

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(getDataDir(), { recursive: true });
}

export async function readNdjsonRecords<T extends NdjsonRecord>(fileName: string): Promise<T[]> {
  const pathToFile = filePath(fileName);
  try {
    const raw = await fs.readFile(pathToFile, "utf-8");
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as T);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function writeNdjsonRecords<T extends NdjsonRecord>(
  fileName: string,
  records: T[]
): Promise<void> {
  await ensureDataDir();
  const pathToFile = filePath(fileName);
  const content = records.map((record) => JSON.stringify(record)).join("\n");
  const finalContent = content.length > 0 ? `${content}\n` : "";
  await fs.writeFile(pathToFile, finalContent, "utf-8");
}

export function createId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "")}`;
}

export function nowMillis(): number {
  return Date.now();
}

export function toIso(millis: number): string {
  return new Date(millis).toISOString();
}

export async function readWorkspaceRecords(): Promise<WorkspaceRecord[]> {
  const records = await readNdjsonRecords<WorkspaceRecord>(WORKSPACE_FILE);
  return records.filter((record) => record.type === "Workspace");
}

export async function writeWorkspaceRecords(records: WorkspaceRecord[]): Promise<void> {
  await writeNdjsonRecords(WORKSPACE_FILE, records);
}

export async function readRequestRecords(): Promise<RequestRecord[]> {
  const records = await readNdjsonRecords<RequestRecord>(REQUEST_FILE);
  return records.filter((record) => record.type === "Request");
}

export async function writeRequestRecords(records: RequestRecord[]): Promise<void> {
  await writeNdjsonRecords(REQUEST_FILE, records);
}

export async function readRequestGroupRecords(): Promise<RequestGroupRecord[]> {
  const records = await readNdjsonRecords<RequestGroupRecord>(REQUEST_GROUP_FILE);
  return records.filter((record) => record.type === "RequestGroup");
}

export async function writeRequestGroupRecords(records: RequestGroupRecord[]): Promise<void> {
  await writeNdjsonRecords(REQUEST_GROUP_FILE, records);
}

export async function readEnvironmentRecords(): Promise<EnvironmentRecord[]> {
  const records = await readNdjsonRecords<EnvironmentRecord>(ENVIRONMENT_FILE);
  return records.filter((record) => record.type === "Environment");
}

export async function writeEnvironmentRecords(records: EnvironmentRecord[]): Promise<void> {
  await writeNdjsonRecords(ENVIRONMENT_FILE, records);
}

export async function readProjectRecords(): Promise<ProjectRecord[]> {
  const records = await readNdjsonRecords<ProjectRecord>(PROJECT_FILE);
  return records.filter((record) => record.type === "Project");
}

export function buildEnvironmentRecord(
  workspaceId: string,
  timestamp: number
): EnvironmentRecord {
  return {
    _id: createId("env"),
    type: "Environment",
    parentId: workspaceId,
    modified: timestamp,
    created: timestamp,
    name: DEFAULT_ENVIRONMENT_NAME,
    data: {},
    dataPropertyOrder: null,
    color: null,
    isPrivate: false,
    metaSortKey: timestamp,
    environmentType: "kv",
  };
}

export async function resolveProjectId(): Promise<string> {
  if (process.env.INSOMNIA_MCP_PROJECT_ID) {
    return process.env.INSOMNIA_MCP_PROJECT_ID;
  }
  const projects = await readProjectRecords();
  const project = projects.find((record) => typeof record._id === "string");
  if (project?._id) {
    return project._id;
  }
  return "proj_scratchpad";
}

export function toStoredRequest(record: RequestRecord, collectionId: string): StoredRequest {
  return {
    id: record._id,
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

export async function ensureEnvironmentForWorkspace(
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

export async function loadWorkspace(
  workspaceId: string
): Promise<{ workspace: WorkspaceRecord; all: WorkspaceRecord[] }> {
  const workspaces = await readWorkspaceRecords();
  const workspace = workspaces.find((record) => record._id === workspaceId);
  if (!workspace) {
    throw new Error(`Collection ${workspaceId} not found`);
  }
  return { workspace, all: workspaces };
}

export function __resetStorageCacheForTests(): void {
  // No caching in the Insomnia-backed storage layer; provided for backwards compatibility with tests.
}
