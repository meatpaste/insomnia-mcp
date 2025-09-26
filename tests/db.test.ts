import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  createId,
  getDataDir,
  readNdjsonRecords,
  writeNdjsonRecords,
  toIso,
  buildEnvironmentRecord,
  resolveProjectId,
  readWorkspaceRecords,
  writeWorkspaceRecords,
  readRequestRecords,
  writeRequestRecords,
  readRequestGroupRecords,
  writeRequestGroupRecords,
  readEnvironmentRecords,
  writeEnvironmentRecords,
  readProjectRecords,
  nowMillis,
  WORKSPACE_FILE,
  REQUEST_FILE,
  DEFAULT_ENVIRONMENT_NAME,
} from "../src/storage/db.js";

const TEST_DATA_DIR = path.join(process.cwd(), "tests", "__fixtures__");

async function cleanup() {
  await fs.rm(TEST_DATA_DIR, { recursive: true, force: true });
}

async function ensureDir() {
  await fs.mkdir(TEST_DATA_DIR, { recursive: true });
}

describe("database utilities", () => {
  beforeEach(async () => {
    process.env.INSOMNIA_APP_DATA_DIR = TEST_DATA_DIR;
    await cleanup();
  });

  afterEach(async () => {
    await cleanup();
    delete process.env.INSOMNIA_APP_DATA_DIR;
  });

  it("creates unique IDs with proper prefixes", () => {
    const id1 = createId("req");
    const id2 = createId("req");
    const id3 = createId("wrk");

    expect(id1).toMatch(/^req_[a-f0-9]{32}$/);
    expect(id2).toMatch(/^req_[a-f0-9]{32}$/);
    expect(id3).toMatch(/^wrk_[a-f0-9]{32}$/);
    expect(id1).not.toBe(id2);
  });

  it("converts timestamps to ISO strings", () => {
    const timestamp = 1640995200000; // 2022-01-01T00:00:00.000Z
    const iso = toIso(timestamp);
    expect(iso).toBe("2022-01-01T00:00:00.000Z");
    expect(typeof iso).toBe("string");
  });

  it("gets data directory from environment or default", () => {
    const dataDir = getDataDir();
    expect(dataDir).toBe(TEST_DATA_DIR);
  });

  it("writes and reads NDJSON records", async () => {
    const records = [
      { _id: "test1", type: "Test", data: "value1" },
      { _id: "test2", type: "Test", data: "value2" },
    ];

    await writeNdjsonRecords("test.db", records);
    const readRecords = await readNdjsonRecords("test.db");

    expect(readRecords).toEqual(records);
  });

  it("handles empty NDJSON files", async () => {
    await writeNdjsonRecords("empty.db", []);
    const records = await readNdjsonRecords("empty.db");
    expect(records).toEqual([]);
  });

  it("returns empty array for non-existent files", async () => {
    const records = await readNdjsonRecords("nonexistent.db");
    expect(records).toEqual([]);
  });

  it("handles files with empty lines and whitespace", async () => {
    await ensureDir();
    const content = '{"_id":"test1","type":"Test"}\n\n  \n{"_id":"test2","type":"Test"}\n';
    await fs.writeFile(path.join(TEST_DATA_DIR, "whitespace.db"), content, "utf-8");

    const records = await readNdjsonRecords("whitespace.db");
    expect(records).toEqual([
      { _id: "test1", type: "Test" },
      { _id: "test2", type: "Test" },
    ]);
  });

  it("handles Windows line endings", async () => {
    await ensureDir();
    const content = '{"_id":"test1","type":"Test"}\r\n{"_id":"test2","type":"Test"}\r\n';
    await fs.writeFile(path.join(TEST_DATA_DIR, "windows.db"), content, "utf-8");

    const records = await readNdjsonRecords("windows.db");
    expect(records).toEqual([
      { _id: "test1", type: "Test" },
      { _id: "test2", type: "Test" },
    ]);
  });

  it("creates current timestamp", () => {
    const before = Date.now();
    const timestamp = nowMillis();
    const after = Date.now();

    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
    expect(typeof timestamp).toBe("number");
  });

  it("builds environment records with proper structure", () => {
    const workspaceId = "wrk_123";
    const timestamp = 1640995200000;

    const envRecord = buildEnvironmentRecord(workspaceId, timestamp);

    expect(envRecord).toMatchObject({
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
    });
    expect(envRecord._id).toMatch(/^env_[a-f0-9]{32}$/);
  });

  it("resolves project ID from environment variable", async () => {
    process.env.INSOMNIA_MCP_PROJECT_ID = "proj_custom";
    const projectId = await resolveProjectId();
    expect(projectId).toBe("proj_custom");
    delete process.env.INSOMNIA_MCP_PROJECT_ID;
  });

  it("resolves project ID from existing project records", async () => {
    const projects = [{ _id: "proj_existing", type: "Project", name: "Test Project" }];
    await writeNdjsonRecords("insomnia.Project.db", projects);

    const projectId = await resolveProjectId();
    expect(projectId).toBe("proj_existing");
  });

  it("falls back to default project ID", async () => {
    const projectId = await resolveProjectId();
    expect(projectId).toBe("proj_scratchpad");
  });

  it("reads and writes workspace records with filtering", async () => {
    const records = [
      { _id: "wrk_1", type: "Workspace", parentId: "proj_1", modified: 1, created: 1, name: "Test", scope: "collection" },
      { _id: "other_1", type: "Other", parentId: "proj_1", modified: 1, created: 1, name: "Not Workspace" },
    ];

    await writeWorkspaceRecords(records as any);
    const workspaces = await readWorkspaceRecords();

    expect(workspaces).toHaveLength(1);
    expect(workspaces[0].type).toBe("Workspace");
    expect(workspaces[0]._id).toBe("wrk_1");
  });

  it("reads and writes request records with filtering", async () => {
    const records = [
      {
        _id: "req_1",
        type: "Request",
        parentId: "wrk_1",
        modified: 1,
        created: 1,
        name: "Test",
        method: "GET",
        url: "https://test.com",
        headers: [],
        body: null,
        parameters: [],
        authentication: {},
        metaSortKey: 0,
        isPrivate: false,
        settingStoreCookies: true,
        settingSendCookies: true,
        settingDisableRenderRequestBody: false,
        settingEncodeUrl: true,
        settingRebuildPath: true,
        settingFollowRedirects: "global"
      },
      { _id: "other_1", type: "Other", parentId: "wrk_1", modified: 1, created: 1, name: "Not Request" },
    ];

    await writeRequestRecords(records as any);
    const requests = await readRequestRecords();

    expect(requests).toHaveLength(1);
    expect(requests[0].type).toBe("Request");
    expect(requests[0]._id).toBe("req_1");
  });

  it("reads and writes request group records with filtering", async () => {
    const records = [
      {
        _id: "fld_1",
        type: "RequestGroup",
        parentId: "wrk_1",
        modified: 1,
        created: 1,
        name: "Test Folder",
        description: undefined,
        environment: {},
        environmentPropertyOrder: null,
        metaSortKey: 0,
        environmentType: "kv"
      },
      { _id: "other_1", type: "Other", parentId: "wrk_1", modified: 1, created: 1, name: "Not RequestGroup" },
    ];

    await writeRequestGroupRecords(records as any);
    const folders = await readRequestGroupRecords();

    expect(folders).toHaveLength(1);
    expect(folders[0].type).toBe("RequestGroup");
    expect(folders[0]._id).toBe("fld_1");
  });

  it("reads and writes environment records with filtering", async () => {
    const records = [
      {
        _id: "env_1",
        type: "Environment",
        parentId: "wrk_1",
        modified: 1,
        created: 1,
        name: "Base Environment",
        data: {},
        dataPropertyOrder: null,
        color: null,
        isPrivate: false,
        metaSortKey: 0,
        environmentType: "kv"
      },
      { _id: "other_1", type: "Other", parentId: "wrk_1", modified: 1, created: 1, name: "Not Environment" },
    ];

    await writeEnvironmentRecords(records as any);
    const environments = await readEnvironmentRecords();

    expect(environments).toHaveLength(1);
    expect(environments[0].type).toBe("Environment");
    expect(environments[0]._id).toBe("env_1");
  });

  it("reads project records with filtering", async () => {
    const records = [
      { _id: "proj_1", type: "Project", name: "Test Project" },
      { _id: "other_1", type: "Other", name: "Not Project" },
    ];

    await writeNdjsonRecords("insomnia.Project.db", records);
    const projects = await readProjectRecords();

    expect(projects).toHaveLength(1);
    expect(projects[0].type).toBe("Project");
    expect(projects[0]._id).toBe("proj_1");
  });
});