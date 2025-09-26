/**
 * Storage layer for Insomnia MCP Server
 *
 * This module provides a clean, typed API for managing Insomnia collections,
 * requests, folders, and environments through NDJSON database files.
 */

// Re-export types
export type {
  StoredRequest,
  StoredRequestHeader,
  StoredRequestBody,
  StoredFolder,
  StoredEnvironment,
  StoredCollection,
} from "./types.js";

// Re-export collection operations
export {
  listCollections,
  getCollection,
  createCollection,
  ensureSampleData,
} from "./collections.js";

// Re-export request operations
export {
  createRequest,
  updateRequest,
  deleteRequest,
  getRequest,
} from "./requests.js";

// Re-export folder operations
export {
  createFolder,
  updateFolder,
  deleteFolder,
  getFolder,
} from "./folders.js";

// Re-export environment operations
export {
  getEnvironment,
  setEnvironmentVariable,
  getEnvironmentVariable,
} from "./environments.js";

// Re-export input types
export type {
  CreateCollectionInput,
} from "./collections.js";

export type {
  CreateRequestInput,
  UpdateRequestInput,
  DeleteRequestInput,
  GetRequestInput,
} from "./requests.js";

export type {
  CreateFolderInput,
  UpdateFolderInput,
  DeleteFolderInput,
  GetFolderInput,
} from "./folders.js";

export type {
  SetEnvironmentVariableInput,
} from "./environments.js";

// Re-export database utilities for testing
export {
  __resetStorageCacheForTests,
} from "./db.js";