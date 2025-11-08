export interface SchemaVersion {
  version: string;
  migratedAt?: string;
}

export interface StorageConfig {
  owner: string;
  repo: string;
  branch: string;
}
