/**
 * Configuration module for Insomnia MCP Server
 *
 * Centralizes all configuration values and environment variable handling.
 * This makes it easy to understand what configuration options are available
 * and provides type-safe access to configuration values.
 */

/**
 * Parse integer from environment variable with fallback
 */
function parseIntEnv(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Parse boolean from environment variable
 */
function parseBoolEnv(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Log levels for structured logging
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

/**
 * Server configuration
 */
export interface ServerConfig {
  /** HTTP server configuration */
  httpServer: {
    /** Whether HTTP server is enabled */
    enabled: boolean;
    /** Port to listen on */
    port: number;
  };

  /** Storage configuration */
  storage: {
    /** Insomnia data directory */
    dataDir?: string;
    /** Project ID to use */
    projectId?: string;
  };

  /** Logging configuration */
  logging: {
    /** Log level */
    level: LogLevel;
  };
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): ServerConfig {
  return {
    httpServer: {
      enabled: !parseBoolEnv(process.env.INSOMNIA_MCP_DISABLE_HTTP_SERVER, false),
      port: parseIntEnv(process.env.INSOMNIA_MCP_HTTP_PORT, 3847),
    },
    storage: {
      dataDir: process.env.INSOMNIA_APP_DATA_DIR,
      projectId: process.env.INSOMNIA_MCP_PROJECT_ID,
    },
    logging: {
      level: (process.env.INSOMNIA_MCP_LOG_LEVEL || 'info') as LogLevel,
    },
  };
}

/**
 * Global configuration instance
 */
export const config = loadConfig();

/**
 * Environment variable documentation
 *
 * Available environment variables:
 * - `INSOMNIA_MCP_DISABLE_HTTP_SERVER`: Set to 'true' to disable HTTP server (default: false)
 * - `INSOMNIA_MCP_HTTP_PORT`: Port for HTTP server (default: 3847)
 * - `INSOMNIA_APP_DATA_DIR`: Path to Insomnia data directory (default: auto-detected)
 * - `INSOMNIA_MCP_PROJECT_ID`: Project ID to use (default: auto-detected)
 * - `INSOMNIA_MCP_LOG_LEVEL`: Log level - error, warn, info, debug (default: info)
 */