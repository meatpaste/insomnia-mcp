export type InsomniaResourceType =
  | "workspace"
  | "request"
  | "request_group"
  | "request_group_meta"
  | "environment"
  | "api_spec"
  | "unit_test"
  | "unit_test_suite"
  | "proto_file"
  | "proto_directory"
  | "request_group_scenario"
  | "request_group_test"
  | "cookiejar"
  | "request_group_workspace"
  | "generate_code";

export interface InsomniaExportResourceBase {
  _id: string;
  _type: InsomniaResourceType | string;
  parentId?: string | null;
  modified?: number;
  created?: number;
  [key: string]: unknown;
}

export interface InsomniaExportFile {
  _type: "export";
  __export_format: number;
  __export_date: string;
  __export_source: string;
  resources: InsomniaExportResourceBase[];
}

export type WorkspaceResource = InsomniaExportResourceBase & {
  _type: "workspace";
  name: string;
  description?: string;
  scope?: string;
};

export type RequestResource = InsomniaExportResourceBase & {
  _type: "request";
  name: string;
  method: string;
  url: string;
  body?: unknown;
  headers?: unknown;
};

export type EnvironmentResource = InsomniaExportResourceBase & {
  _type: "environment";
  name: string;
  data: Record<string, unknown>;
};
