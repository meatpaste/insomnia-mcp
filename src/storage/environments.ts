import {
  readEnvironmentRecords,
  writeEnvironmentRecords,
  writeWorkspaceRecords,
  nowMillis,
  // type EnvironmentRecord,
} from "./db.js";
import { toStoredEnvironment } from "./converters.js";
import { loadWorkspace } from "./collections.js";
import type { StoredEnvironment } from "./types.js";

export interface SetEnvironmentVariableInput {
  collectionId: string;
  key: string;
  value: unknown;
}

/**
 * Get environment for a collection
 */
export async function getEnvironment(collectionId: string): Promise<StoredEnvironment> {
  const { workspace } = await loadWorkspace(collectionId);
  const environments = await readEnvironmentRecords();
  const environment = environments.find((record) => record.parentId === workspace._id);
  if (!environment) {
    throw new Error(`Environment for collection ${collectionId} not found`);
  }
  return toStoredEnvironment(environment);
}

/**
 * Set an environment variable
 */
export async function setEnvironmentVariable(
  input: SetEnvironmentVariableInput
): Promise<StoredEnvironment> {
  const { workspace, all } = await loadWorkspace(input.collectionId);
  const environments = await readEnvironmentRecords();
  const environment = environments.find((record) => record.parentId === workspace._id);
  if (!environment) {
    throw new Error(`Environment for collection ${input.collectionId} not found`);
  }

  const data = environment.data || {};
  data[input.key] = input.value;
  environment.data = data;

  const timestamp = nowMillis();
  environment.modified = timestamp;

  await writeEnvironmentRecords(environments);

  workspace.modified = timestamp;
  await writeWorkspaceRecords(all);

  return toStoredEnvironment(environment);
}

/**
 * Get a specific environment variable
 */
export async function getEnvironmentVariable(collectionId: string, key: string): Promise<unknown> {
  const { workspace } = await loadWorkspace(collectionId);
  const environments = await readEnvironmentRecords();
  const environment = environments.find((record) => record.parentId === workspace._id);
  if (!environment) {
    throw new Error(`Environment for collection ${collectionId} not found`);
  }
  return environment.data?.[key];
}
