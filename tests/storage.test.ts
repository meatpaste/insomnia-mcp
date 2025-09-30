import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";

import {
  __resetStorageCacheForTests,
  createCollection,
  createFolder,
  createRequest,
  deleteFolder,
  deleteRequest,
  ensureSampleData,
  getCollection,
  getEnvironment,
  getRequest,
  listCollections,
  setEnvironmentVariable,
  updateFolder,
  updateRequest,
} from "../src/storage.js";

const TEST_DATA_DIR = path.join(process.cwd(), "tests", "__fixtures__");
const WORKSPACE_FILE = path.join(TEST_DATA_DIR, "insomnia.Workspace.db");
const REQUEST_FILE = path.join(TEST_DATA_DIR, "insomnia.Request.db");
const REQUEST_GROUP_FILE = path.join(TEST_DATA_DIR, "insomnia.RequestGroup.db");
const ENVIRONMENT_FILE = path.join(TEST_DATA_DIR, "insomnia.Environment.db");

async function cleanup() {
  await fs.rm(TEST_DATA_DIR, { recursive: true, force: true });
}

async function ensureDir() {
  await fs.mkdir(TEST_DATA_DIR, { recursive: true });
}

async function writeNdjson(filePath: string, records: unknown[]): Promise<void> {
  await ensureDir(); // Ensure directory exists before every write
  const content = records.map((record) => JSON.stringify(record)).join("\n");
  const finalContent = content.length > 0 ? `${content}\n` : "";
  await fs.writeFile(filePath, finalContent, "utf-8");
}

async function readNdjson<T>(filePath: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
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

describe("storage", () => {
  beforeEach(async () => {
    process.env.INSOMNIA_APP_DATA_DIR = TEST_DATA_DIR;
    process.env.INSOMNIA_MCP_PROJECT_ID = "proj_test";
    __resetStorageCacheForTests();
    await cleanup();
  });

  afterEach(async () => {
    await cleanup();
    delete process.env.INSOMNIA_APP_DATA_DIR;
    delete process.env.INSOMNIA_MCP_PROJECT_ID;
    __resetStorageCacheForTests();
  });

  it("ensures base environments for existing workspaces", async () => {
    const timestamp = Date.now();
    await writeNdjson(WORKSPACE_FILE, [
      {
        _id: "wrk_existing",
        type: "Workspace",
        parentId: "proj_test",
        modified: timestamp,
        created: timestamp,
        name: "Existing",
        description: "",
        scope: "collection",
      },
    ]);

    await ensureSampleData();

    const environments = await readNdjson(ENVIRONMENT_FILE);
    expect(environments).toHaveLength(1);
    expect(environments[0]).toMatchObject({ parentId: "wrk_existing", name: "Base Environment" });
  });

  it("creates and retrieves collections with environment", async () => {
    const collection = await createCollection({
      name: "My API",
      description: "Test API",
    });

    const retrieved = await getCollection(collection.id);

    expect(retrieved).toBeDefined();
    expect(retrieved?.environment.variables).toEqual({});
    expect(retrieved?.environment.name).toBe("Base Environment");
    expect(retrieved?.folders).toEqual([]);
    expect(retrieved?.requests).toEqual([]);

    const workspaces = await readNdjson(WORKSPACE_FILE);
    expect(workspaces).toHaveLength(1);
    expect(workspaces[0]).toMatchObject({ name: "My API", scope: "collection" });
  });

  it("creates, updates, and deletes requests", async () => {
    const collection = await createCollection({ name: "CRUD" });
    const folder = await createFolder({
      collectionId: collection.id,
      name: "Operations",
    });

    const request = await createRequest({
      collectionId: collection.id,
      name: "List",
      method: "get",
      url: "https://example.com",
      folderId: folder.id,
      preRequestScript: "console.log('pre');",
      afterResponseScript: "console.log('post');",
    });

    let requestRecords = await readNdjson<{ parentId: string }>(REQUEST_FILE);
    expect(requestRecords).toHaveLength(1);
    expect(requestRecords[0].parentId).toBe(folder.id);
    expect(request.preRequestScript).toBe("console.log('pre');");
    expect(request.afterResponseScript).toBe("console.log('post');");

    const collectionSnapshot = await getCollection(collection.id);
    expect(collectionSnapshot?.requests[0].preRequestScript).toBe("console.log('pre');");
    expect(collectionSnapshot?.requests[0].afterResponseScript).toBe("console.log('post');");

    const retrievedRequest = await getRequest({
      collectionId: collection.id,
      requestId: request.id,
    });
    expect(retrievedRequest.preRequestScript).toBe("console.log('pre');");
    expect(retrievedRequest.afterResponseScript).toBe("console.log('post');");

    const collections = await listCollections();
    const listRequest = collections
      .find((item) => item.id === collection.id)
      ?.requests.find((item) => item.id === request.id);
    expect(listRequest?.preRequestScript).toBe("console.log('pre');");
    expect(listRequest?.afterResponseScript).toBe("console.log('post');");

    const updated = await updateRequest({
      collectionId: collection.id,
      requestId: request.id,
      name: "List Users",
      method: "post",
      url: "https://example.com/users",
      description: "Fetch users",
      folderId: null,
      preRequestScript: null,
      afterResponseScript: "console.log('updated post');",
    });

    expect(updated.name).toBe("List Users");
    expect(updated.method).toBe("POST");
    expect(updated.url).toBe("https://example.com/users");
    expect(updated.folderId).toBeUndefined();
    expect(updated.preRequestScript).toBeUndefined();
    expect(updated.afterResponseScript).toBe("console.log('updated post');");

    requestRecords = await readNdjson<{ parentId: string }>(REQUEST_FILE);
    expect(requestRecords[0].parentId).toBe(collection.id);

    const updatedWithScript = await updateRequest({
      collectionId: collection.id,
      requestId: request.id,
      preRequestScript: "console.log('re-added pre');",
      afterResponseScript: "console.log('re-added post');",
    });
    expect(updatedWithScript.preRequestScript).toBe("console.log('re-added pre');");
    expect(updatedWithScript.afterResponseScript).toBe("console.log('re-added post');");

    const persistedUpdated = await getRequest({
      collectionId: collection.id,
      requestId: request.id,
    });
    expect(persistedUpdated.preRequestScript).toBe("console.log('re-added pre');");
    expect(persistedUpdated.afterResponseScript).toBe("console.log('re-added post');");

    await deleteRequest({ collectionId: collection.id, requestId: request.id });

    requestRecords = await readNdjson(REQUEST_FILE);
    expect(requestRecords).toHaveLength(0);
  });

  it("creates, updates, and deletes folders", async () => {
    const collection = await createCollection({ name: "Foldered" });
    const rootFolder = await createFolder({
      collectionId: collection.id,
      name: "Root",
      description: "Top level",
    });
    expect(rootFolder.parentId).toBe(collection.id);

    const childFolder = await createFolder({
      collectionId: collection.id,
      name: "Child",
      parentId: rootFolder.id,
    });
    expect(childFolder.parentId).toBe(rootFolder.id);

    const request = await createRequest({
      collectionId: collection.id,
      name: "Inside",
      method: "get",
      url: "https://example.com/folder",
      folderId: childFolder.id,
    });
    expect(request.folderId).toBe(childFolder.id);

    const updatedChild = await updateFolder({
      collectionId: collection.id,
      folderId: childFolder.id,
      name: "Child Updated",
      description: "Nested",
      parentId: rootFolder.id,
    });
    expect(updatedChild.parentId).toBe(rootFolder.id);
    expect(updatedChild.name).toBe("Child Updated");

    await deleteFolder({ collectionId: collection.id, folderId: rootFolder.id });

    const remainingFolders = await readNdjson(REQUEST_GROUP_FILE);
    expect(remainingFolders).toHaveLength(0);

    const remainingRequests = await readNdjson(REQUEST_FILE);
    expect(remainingRequests).toHaveLength(0);
  });

  it("sets environment variables and persists changes", async () => {
    const collection = await createCollection({ name: "Env" });
    const environment = await setEnvironmentVariable({
      collectionId: collection.id,
      key: "baseUrl",
      value: "https://api.example.com",
    });

    expect(environment.variables.baseUrl).toBe("https://api.example.com");

    const reloaded = await getEnvironment(collection.id);
    expect(reloaded.variables.baseUrl).toBe("https://api.example.com");

    const environments = await readNdjson(ENVIRONMENT_FILE);
    expect(environments[0]).toMatchObject({
      parentId: collection.id,
    });
  });

  it("lists collections from Insomnia data files", async () => {
    const collectionA = await createCollection({ name: "Workspace A" });
    const folderA = await createFolder({
      collectionId: collectionA.id,
      name: "Group A",
    });
    await createRequest({
      collectionId: collectionA.id,
      name: "List Users",
      method: "get",
      url: "https://example.com/users",
      folderId: folderA.id,
    });

    const collectionB = await createCollection({ name: "Workspace B" });

    const collections = await listCollections();
    const ids = collections.map((item) => item.id);
    expect(ids).toEqual(expect.arrayContaining([collectionA.id, collectionB.id]));
    const workspaceA = collections.find((item) => item.id === collectionA.id);
    expect(workspaceA?.requests).toHaveLength(1);
    expect(workspaceA?.folders).toHaveLength(1);
    expect(workspaceA?.folders[0]).toMatchObject({ name: "Group A", parentId: collectionA.id });
  });
});
