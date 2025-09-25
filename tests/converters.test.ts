import { describe, expect, it } from "vitest";

import {
  toStoredCollection,
  toStoredEnvironment,
  toStoredFolder,
  toStoredRequest,
} from "../src/storage/converters.js";
import { toIso } from "../src/storage/db.js";
import type {
  EnvironmentRecord,
  RequestGroupRecord,
  RequestRecord,
  WorkspaceRecord,
} from "../src/storage/db.js";

function makeWorkspaceRecord(overrides: Partial<WorkspaceRecord> = {}): WorkspaceRecord {
  return {
    _id: "wrk_1",
    type: "Workspace",
    parentId: "proj_1",
    modified: 1,
    created: 1,
    name: "Workspace",
    description: "Description",
    scope: "collection",
    ...overrides,
  };
}

function makeEnvironmentRecord(overrides: Partial<EnvironmentRecord> = {}): EnvironmentRecord {
  return {
    _id: "env_1",
    type: "Environment",
    parentId: "wrk_1",
    modified: 1,
    created: 1,
    name: "Base Environment",
    data: { base_url: "https://example.com" },
    dataPropertyOrder: null,
    color: null,
    isPrivate: false,
    metaSortKey: 0,
    environmentType: "kv",
    ...overrides,
  };
}

function makeRequestRecord(overrides: Partial<RequestRecord> = {}): RequestRecord {
  return {
    _id: "req_1",
    type: "Request",
    parentId: "wrk_1",
    modified: 1,
    created: 1,
    url: "https://example.com",
    name: "Request",
    method: "GET",
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
    settingFollowRedirects: "global",
    ...overrides,
  };
}

function makeFolderRecord(overrides: Partial<RequestGroupRecord> = {}): RequestGroupRecord {
  return {
    _id: "fld_1",
    type: "RequestGroup",
    parentId: "wrk_1",
    modified: 1,
    created: 1,
    name: "Folder",
    description: "Folder description",
    environment: {},
    environmentPropertyOrder: null,
    metaSortKey: 0,
    environmentType: "kv",
    ...overrides,
  };
}

describe("converter helpers", () => {
  it("converts request records including collectionId and optional folderId", () => {
    const requestRecord = makeRequestRecord({ parentId: "fld_2" });
    const stored = toStoredRequest(requestRecord, "wrk_1");
    expect(stored).toMatchObject({
      id: "req_1",
      collectionId: "wrk_1",
      folderId: "fld_2",
      method: "GET",
    });
    expect(stored.createdAt).toBe(toIso(1));
  });

  it("converts environment records into stored environments", () => {
    const environmentRecord = makeEnvironmentRecord();
    const stored = toStoredEnvironment(environmentRecord);
    expect(stored).toMatchObject({
      id: "env_1",
      name: "Base Environment",
      variables: { base_url: "https://example.com" },
    });
  });

  it("converts folder records without empty descriptions", () => {
    const folderRecord = makeFolderRecord({ description: "" });
    const stored = toStoredFolder(folderRecord);
    expect(stored.description).toBeUndefined();
    expect(stored.parentId).toBe("wrk_1");
  });

  it("aggregates stored collections with requests and folders", () => {
    const workspace = makeWorkspaceRecord();
    const environment = makeEnvironmentRecord();
    const requestRecord = makeRequestRecord();
    const folderRecord = makeFolderRecord();
    const storedCollection = toStoredCollection(workspace, environment, [requestRecord], [folderRecord]);
    expect(storedCollection.environment.id).toBe("env_1");
    expect(storedCollection.requests[0].collectionId).toBe("wrk_1");
    expect(storedCollection.folders).toHaveLength(1);
  });
});
