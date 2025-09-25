import { describe, expect, it } from "vitest";

import {
  buildFolderLookup,
  collectDescendantFolderIds,
  collectFoldersForWorkspace,
  collectRequestsForWorkspace,
  ensureFolderInWorkspace,
  ensureNoFolderCycle,
  folderBelongsToWorkspace,
  requestBelongsToWorkspace,
  resolveFolderParentId,
  resolveRequestParentId,
} from "../src/storage/folderTree.js";
import type { RequestGroupRecord, RequestRecord } from "../src/storage/db.js";

const WORKSPACE_ID = "wrk_main";

function makeFolder(
  id: string,
  parentId: string,
  overrides: Partial<RequestGroupRecord> = {}
): RequestGroupRecord {
  return {
    _id: id,
    type: "RequestGroup",
    parentId,
    modified: 1,
    created: 1,
    name: id,
    description: undefined,
    environment: null,
    environmentPropertyOrder: null,
    metaSortKey: 0,
    environmentType: "kv",
    ...overrides,
  };
}

function makeRequest(
  id: string,
  parentId: string,
  overrides: Partial<RequestRecord> = {}
): RequestRecord {
  return {
    _id: id,
    type: "Request",
    parentId,
    modified: 1,
    created: 1,
    url: "https://example.com",
    name: id,
    method: "GET",
    headers: [],
    body: null,
    parameters: [],
    authentication: {},
    metaSortKey: 0,
    settingStoreCookies: true,
    settingSendCookies: true,
    settingDisableRenderRequestBody: false,
    settingEncodeUrl: true,
    settingRebuildPath: true,
    settingFollowRedirects: "global",
    ...overrides,
  };
}

describe("folderTree helpers", () => {
  const rootFolder = makeFolder("fld_root", WORKSPACE_ID);
  const childFolder = makeFolder("fld_child", rootFolder._id);
  const grandChildFolder = makeFolder("fld_grand", childFolder._id);
  const otherWorkspaceFolder = makeFolder("fld_other", "wrk_other");

  const folders = [rootFolder, childFolder, grandChildFolder, otherWorkspaceFolder];
  const lookup = buildFolderLookup(folders);

  it("builds a lookup keyed by folder id", () => {
    expect(lookup.size).toBe(4);
    expect(lookup.get("fld_child")).toBe(childFolder);
  });

  it("detects when a folder belongs to the workspace", () => {
    expect(folderBelongsToWorkspace(childFolder, WORKSPACE_ID, lookup)).toBe(true);
    expect(folderBelongsToWorkspace(otherWorkspaceFolder, WORKSPACE_ID, lookup)).toBe(false);
  });

  it("collects only folders that belong to the workspace", () => {
    const collected = collectFoldersForWorkspace(WORKSPACE_ID, folders, lookup);
    expect(collected.map((folder) => folder._id)).toEqual([
      "fld_root",
      "fld_child",
      "fld_grand",
    ]);
  });

  it("resolves folder parents while validating workspace membership", () => {
    expect(resolveFolderParentId(WORKSPACE_ID, undefined, lookup)).toBe(WORKSPACE_ID);
    expect(resolveFolderParentId(WORKSPACE_ID, null, lookup)).toBe(WORKSPACE_ID);
    expect(resolveFolderParentId(WORKSPACE_ID, rootFolder._id, lookup)).toBe(rootFolder._id);
  });

  it("throws when resolving a parent outside the workspace", () => {
    expect(() => resolveFolderParentId(WORKSPACE_ID, otherWorkspaceFolder._id, lookup)).toThrow(
      /does not belong/
    );
  });

  it("prevents folder cycles", () => {
    expect(() => ensureNoFolderCycle(childFolder._id, WORKSPACE_ID, lookup)).not.toThrow();
    expect(() => ensureNoFolderCycle(rootFolder._id, grandChildFolder._id, lookup)).toThrow(
      /descendants/
    );
  });

  it("collects all descendant folder ids", () => {
    const descendants = collectDescendantFolderIds(rootFolder._id, lookup);
    expect(descendants).toEqual(new Set(["fld_root", "fld_child", "fld_grand"]));
  });

  const workspaceRequest = makeRequest("req_workspace", WORKSPACE_ID);
  const nestedRequest = makeRequest("req_nested", childFolder._id);
  const otherRequest = makeRequest("req_other", "wrk_other");
  const requests = [workspaceRequest, nestedRequest, otherRequest];

  it("detects request workspace membership", () => {
    expect(requestBelongsToWorkspace(workspaceRequest, WORKSPACE_ID, lookup)).toBe(true);
    expect(requestBelongsToWorkspace(nestedRequest, WORKSPACE_ID, lookup)).toBe(true);
    expect(requestBelongsToWorkspace(otherRequest, WORKSPACE_ID, lookup)).toBe(false);
  });

  it("collects requests belonging to the workspace", () => {
    const collected = collectRequestsForWorkspace(WORKSPACE_ID, requests, lookup);
    expect(collected.map((request) => request._id)).toEqual([
      "req_workspace",
      "req_nested",
    ]);
  });

  it("resolves request parent ids", () => {
    expect(resolveRequestParentId(WORKSPACE_ID, undefined, lookup)).toBe(WORKSPACE_ID);
    expect(resolveRequestParentId(WORKSPACE_ID, childFolder._id, lookup)).toBe(childFolder._id);
  });

  it("ensures folders exist within the workspace", () => {
    expect(ensureFolderInWorkspace(childFolder._id, WORKSPACE_ID, lookup)).toBe(childFolder);
    expect(() => ensureFolderInWorkspace(otherWorkspaceFolder._id, WORKSPACE_ID, lookup)).toThrow(
      /does not belong/
    );
  });
});
