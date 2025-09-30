/**
 * Custom error classes for Insomnia MCP Server
 *
 * These provide structured, typed errors with error codes
 * for better error handling and debugging.
 */

/**
 * Base error class for all Insomnia MCP errors
 */
export class InsomniaError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'InsomniaError';
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON for logging/debugging
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      stack: this.stack,
    };
  }
}

/**
 * Collection not found error
 */
export class CollectionNotFoundError extends InsomniaError {
  constructor(collectionId: string) {
    super(
      `Collection "${collectionId}" not found`,
      'COLLECTION_NOT_FOUND',
      { collectionId }
    );
    this.name = 'CollectionNotFoundError';
  }
}

/**
 * Request not found error
 */
export class RequestNotFoundError extends InsomniaError {
  constructor(requestId: string, collectionId?: string) {
    super(
      `Request "${requestId}" not found${collectionId ? ` in collection "${collectionId}"` : ''}`,
      'REQUEST_NOT_FOUND',
      { requestId, collectionId }
    );
    this.name = 'RequestNotFoundError';
  }
}

/**
 * Folder not found error
 */
export class FolderNotFoundError extends InsomniaError {
  constructor(folderId: string, collectionId?: string) {
    super(
      `Folder "${folderId}" not found${collectionId ? ` in collection "${collectionId}"` : ''}`,
      'FOLDER_NOT_FOUND',
      { folderId, collectionId }
    );
    this.name = 'FolderNotFoundError';
  }
}

/**
 * Environment not found error
 */
export class EnvironmentNotFoundError extends InsomniaError {
  constructor(collectionId: string) {
    super(
      `Environment not found for collection "${collectionId}"`,
      'ENVIRONMENT_NOT_FOUND',
      { collectionId }
    );
    this.name = 'EnvironmentNotFoundError';
  }
}

/**
 * Invalid input error (validation failures)
 */
export class ValidationError extends InsomniaError {
  constructor(message: string, fieldErrors?: Record<string, string>) {
    super(
      message,
      'VALIDATION_ERROR',
      { fieldErrors }
    );
    this.name = 'ValidationError';
  }
}

/**
 * File system error
 */
export class FileSystemError extends InsomniaError {
  constructor(message: string, filePath?: string, cause?: Error) {
    super(
      message,
      'FILE_SYSTEM_ERROR',
      { filePath, cause: cause?.message }
    );
    this.name = 'FileSystemError';
  }
}

/**
 * Type guard to check if error is an InsomniaError
 */
export function isInsomniaError(error: unknown): error is InsomniaError {
  return error instanceof InsomniaError;
}

/**
 * Format error for user-friendly display
 */
export function formatError(error: unknown): string {
  if (isInsomniaError(error)) {
    return `[${error.code}] ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}