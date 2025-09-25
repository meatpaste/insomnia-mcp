import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";

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

export interface RequestRecordHeader {
  name: string;
  value: string;
  disabled?: boolean;
}

export interface RequestRecordBody {
  mimeType?: string;
  text?: string;
  [key: string]: unknown;
}

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
  headers?: RequestRecordHeader[];
  body?: RequestRecordBody | null;
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

export function __resetStorageCacheForTests(): void {
  // No caching in the Insomnia-backed storage layer; provided for backwards compatibility with tests.
}
