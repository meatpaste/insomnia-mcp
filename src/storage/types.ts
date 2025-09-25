export interface StoredRequestHeader {
  name: string;
  value: string;
  disabled?: boolean;
}

export interface StoredRequestBody {
  mimeType?: string;
  text?: string;
  [key: string]: unknown;
}

export interface StoredRequest {
  id: string;
  collectionId: string;
  name: string;
  method: string;
  url: string;
  headers: StoredRequestHeader[];
  body?: StoredRequestBody | null;
  description?: string;
  folderId?: string;
  preRequestScript?: string;
  afterResponseScript?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredFolder {
  id: string;
  name: string;
  description?: string;
  parentId: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredEnvironment {
  id: string;
  name: string;
  variables: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface StoredCollection {
  id: string;
  name: string;
  description?: string;
  environment: StoredEnvironment;
  folders: StoredFolder[];
  requests: StoredRequest[];
  createdAt: string;
  updatedAt: string;
}
