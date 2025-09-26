/**
 * Database file constants and configuration
 */

export const DATABASE_FILES = {
  WORKSPACE: "insomnia.Workspace.db",
  REQUEST: "insomnia.Request.db",
  REQUEST_GROUP: "insomnia.RequestGroup.db",
  ENVIRONMENT: "insomnia.Environment.db",
  PROJECT: "insomnia.Project.db",
} as const;

export const DEFAULTS = {
  ENVIRONMENT_NAME: "Base Environment",
  COLLECTION_SCOPE: "collection",
  PROJECT_ID: "proj_scratchpad",
} as const;