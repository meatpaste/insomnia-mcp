import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";

export interface StoredRequestHeader {
  name: string;
  value: string;
  disabled?: boolean;
}

export interface StoredRequestBody {
  mimeType?: string;
  text?: string;
  [key: string]: unknown;
}

export interface StoredRequest {
  id: string;
  name: string;
  method: string;
  url: string;
  headers: StoredRequestHeader[];
  body?: StoredRequestBody | null;
  description?: string;
  folderId?: string;
  preRequestScript?: string;
  afterResponseScript?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredFolder {
  id: string;
  name: string;
  description?: string;
  parentId: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredEnvironment {
  id: string;
  name: string;
  variables: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface StoredCollection {
  id: string;
  name: string;
  description?: string;
  environment: StoredEnvironment;
  folders: StoredFolder[];
  requests: StoredRequest[];
  createdAt: string;
  updatedAt: string;
}

const WORKSPACE_FILE = "insomnia.Workspace.db";
const REQUEST_FILE = "insomnia.Request.db";
const REQUEST_GROUP_FILE = "insomnia.RequestGroup.db";
const ENVIRONMENT_FILE = "insomnia.Environment.db";
const PROJECT_FILE = "insomnia.Project.db";
const DEFAULT_ENVIRONMENT_NAME = "Base Environment";

type NdjsonRecord = {
  _id: string;
  type: string;
  [key: string]: unknown;
};

interface WorkspaceRecord extends NdjsonRecord {
  parentId: string;
  modified: number;
  created: number;
  name: string;
  description?: string;
  scope: string;
}

interface RequestRecord extends NdjsonRecord {
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

interface RequestGroupRecord extends NdjsonRecord {
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

interface EnvironmentRecord extends NdjsonRecord {
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

interface ProjectRecord extends NdjsonRecord {
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

function getDataDir(): string {
  return process.env.INSOMNIA_APP_DATA_DIR ?? getDefaultInsomniaDir();
}

function filePath(fileName: string): string {
  return path.join(getDataDir(), fileName);
}

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(getDataDir(), { recursive: true });
}

async function readNdjsonRecords<T extends NdjsonRecord>(fileName: string): Promise<T[]> {
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

async function writeNdjsonRecords<T extends NdjsonRecord>(fileName: string, records: T[]): Promise<void> {
  await ensureDataDir();
  const pathToFile = filePath(fileName);
  const content = records.map((record) => JSON.stringify(record)).join("\n");
  const finalContent = content.length > 0 ? `${content}\n` : "";
  await fs.writeFile(pathToFile, finalContent, "utf-8");
}

function createId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "")}`;
}

function nowMillis(): number {
  return Date.now();
}

function toIso(millis: number): string {
  return new Date(millis).toISOString();
}

async function readWorkspaceRecords(): Promise<WorkspaceRecord[]> {
  const records = await readNdjsonRecords<WorkspaceRecord>(WORKSPACE_FILE);
  return records.filter((record) => record.type === "Workspace");
}

async function writeWorkspaceRecords(records: WorkspaceRecord[]): Promise<void> {
  await writeNdjsonRecords(WORKSPACE_FILE, records);
}

async function readRequestRecords(): Promise<RequestRecord[]> {
  const records = await readNdjsonRecords<RequestRecord>(REQUEST_FILE);
  return records.filter((record) => record.type === "Request");
}

async function writeRequestRecords(records: RequestRecord[]): Promise<void> {
  await writeNdjsonRecords(REQUEST_FILE, records);
}

async function readRequestGroupRecords(): Promise<RequestGroupRecord[]> {
  const records = await readNdjsonRecords<RequestGroupRecord>(REQUEST_GROUP_FILE);
  return records.filter((record) => record.type === "RequestGroup");
}

async function writeRequestGroupRecords(records: RequestGroupRecord[]): Promise<void> {
  await writeNdjsonRecords(REQUEST_GROUP_FILE, records);
}

async function readEnvironmentRecords(): Promise<EnvironmentRecord[]> {
  const records = await readNdjsonRecords<EnvironmentRecord>(ENVIRONMENT_FILE);
  return records.filter((record) => record.type === "Environment");
}

async function writeEnvironmentRecords(records: EnvironmentRecord[]): Promise<void> {
  await writeNdjsonRecords(ENVIRONMENT_FILE, records);
}

async function readProjectRecords(): Promise<ProjectRecord[]> {
  const records = await readNdjsonRecords<ProjectRecord>(PROJECT_FILE);
  return records.filter((record) => record.type === "Project");
}

function buildEnvironmentRecord(workspaceId: string, timestamp: number): EnvironmentRecord {
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

async function resolveProjectId(): Promise<string> {
  if (process.env.INSOMNIA_MCP_PROJECT_ID) {
    return process.env.INSOMNIA_MCP_PROJECT_ID;
  }
  const projects = await readProjectRecords();
  const project = projects.find((record) => typeof record._id === "string");
  if (project?. _id) {
    return project._id;
  }
  return "proj_scratchpad";
}

function toStoredRequest(record: RequestRecord, collectionId: string): StoredRequest {
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

function toStoredEnvironment(record: EnvironmentRecord): StoredEnvironment {
  return {
    id: record._id,
    name: record.name,
    variables: (record.data as Record<string, unknown> | undefined) ?? {},
    createdAt: toIso(record.created),
    updatedAt: toIso(record.modified),
  };
}

function toStoredFolder(record: RequestGroupRecord): StoredFolder {
  return {
    id: record._id,
    name: record.name,
    description: typeof record.description === "string" && record.description.length > 0 ? record.description : undefined,
    parentId: record.parentId,
    createdAt: toIso(record.created),
    updatedAt: toIso(record.modified),
  };
}

function toStoredCollection(
  workspace: WorkspaceRecord,
  environment: EnvironmentRecord,
  requests: RequestRecord[],
  folders: RequestGroupRecord[]
): StoredCollection {
  return {
    id: workspace._id,
    name: workspace.name,
    description: typeof workspace.description === "string" && workspace.description.length > 0 ? workspace.description : undefined,
    environment: toStoredEnvironment(environment),
    folders: folders.map(toStoredFolder),
    requests: requests.map((request) => toStoredRequest(request, workspace._id)),
    createdAt: toIso(workspace.created),
    updatedAt: toIso(workspace.modified),
  };
}

function buildFolderLookup(folders: RequestGroupRecord[]): Map<string, RequestGroupRecord> {
  const lookup = new Map<string, RequestGroupRecord>();
  for (const folder of folders) {
    lookup.set(folder._id, folder);
  }
  return lookup;
}

function folderBelongsToWorkspace(
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

function collectFoldersForWorkspace(
  workspaceId: string,
  folders: RequestGroupRecord[],
  folderLookup: Map<string, RequestGroupRecord>
): RequestGroupRecord[] {
  return folders.filter((folder) => folderBelongsToWorkspace(folder, workspaceId, folderLookup));
}

function requestBelongsToWorkspace(
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

function collectRequestsForWorkspace(
  workspaceId: string,
  requests: RequestRecord[],
  folderLookup: Map<string, RequestGroupRecord>
): RequestRecord[] {
  return requests.filter((request) => requestBelongsToWorkspace(request, workspaceId, folderLookup));
}

function ensureFolderInWorkspace(
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

function resolveFolderParentId(
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

function resolveRequestParentId(
  workspaceId: string,
  folderId: string | null | undefined,
  folderLookup: Map<string, RequestGroupRecord>
): string {
  return resolveFolderParentId(workspaceId, folderId ?? undefined, folderLookup);
}

function ensureNoFolderCycle(
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

function collectDescendantFolderIds(
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

async function loadWorkspace(workspaceId: string): Promise<{
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

export function __resetStorageCacheForTests(): void {
  // No caching in the Insomnia-backed storage layer; provided for backwards compatibility with tests.
}

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
    if (workspace.scope !== "collection") {
      continue;
    }
    const { environment, updated } = await ensureEnvironmentForWorkspace(workspace._id, environments);
    if (updated) {
      envByWorkspace.set(workspace._id, environment);
      environmentsUpdated = true;
    }
    const collectionFolders = collectFoldersForWorkspace(workspace._id, requestGroups, folderLookup);
    const collectionRequests = collectRequestsForWorkspace(workspace._id, requests, folderLookup);
    collections.push(toStoredCollection(workspace, environment, collectionRequests, collectionFolders));
  }

  if (environmentsUpdated) {
    await writeEnvironmentRecords(environments);
  }

  return collections;
}

export async function getCollection(collectionId: string): Promise<StoredCollection | undefined> {
  const workspaces = await readWorkspaceRecords();
  const workspace = workspaces.find((record) => record._id === collectionId && record.scope === "collection");
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

export interface CreateCollectionInput {
  name: string;
  description?: string;
}

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
    scope: "collection",
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

export interface CreateFolderInput {
  collectionId: string;
  name: string;
  description?: string;
  parentId?: string | null;
}

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

export interface UpdateFolderInput {
  collectionId: string;
  folderId: string;
  name?: string;
  description?: string | null;
  parentId?: string | null;
}

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

export interface DeleteFolderInput {
  collectionId: string;
  folderId: string;
}

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

function buildRequestRecord(parentId: string, input: CreateRequestInput, timestamp: number): RequestRecord {
  const headers = input.headers ?? [];
  return {
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
    preRequestScript: input.preRequestScript,
    afterResponseScript: input.afterResponseScript,
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
}

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
    request.preRequestScript = input.preRequestScript ?? undefined;
  }
  if (input.afterResponseScript !== undefined) {
    request.afterResponseScript = input.afterResponseScript ?? undefined;
  }

  const timestamp = nowMillis();
  request.modified = timestamp;

  await writeRequestRecords(requests);

  workspace.modified = timestamp;
  await writeWorkspaceRecords(all);

  return toStoredRequest(request, workspace._id);
}

export interface DeleteRequestInput {
  collectionId: string;
  requestId: string;
}

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

export interface SetEnvironmentVariableInput {
  collectionId: string;
  key: string;
  value: unknown;
}

export async function setEnvironmentVariable(
  input: SetEnvironmentVariableInput
): Promise<StoredEnvironment> {
  const { workspace, all } = await loadWorkspace(input.collectionId);
  const environments = await readEnvironmentRecords();
  const { environment, updated } = await ensureEnvironmentForWorkspace(workspace._id, environments);
  const timestamp = nowMillis();

  const data = (environment.data as Record<string, unknown> | undefined) ?? {};
  data[input.key] = input.value;
  environment.data = data;
  environment.modified = timestamp;
  environment.metaSortKey = timestamp;

  await writeEnvironmentRecords(environments);

  workspace.modified = timestamp;
  if (!updated) {
    workspace.modified = timestamp;
  }
  await writeWorkspaceRecords(all);

  return toStoredEnvironment(environment);
}

export async function getEnvironment(collectionId: string): Promise<StoredEnvironment> {
  const { workspace } = await loadWorkspace(collectionId);
  const environments = await readEnvironmentRecords();
  const { environment, updated } = await ensureEnvironmentForWorkspace(workspace._id, environments);
  if (updated) {
    await writeEnvironmentRecords(environments);
  }
  return toStoredEnvironment(environment);
}

export async function ensureSampleData(): Promise<void> {
  const workspaces = await readWorkspaceRecords();
  if (workspaces.length === 0) {
    return;
  }
  const environments = await readEnvironmentRecords();
  let updated = false;
  for (const workspace of workspaces) {
    if (workspace.scope !== "collection") {
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
