export type SettingValue =
  | Record<string, unknown>
  | string
  | number
  | boolean
  | null;

export interface RecentRunInput {
  toolId: string;
  operation: string;
  summary: string;
  preview?: string;
}

export interface RecentRun extends RecentRunInput {
  id: number;
  createdAt: string;
}

export interface EasyToolsApi {
  getSetting(namespace: string): Promise<SettingValue | null>;
  setSetting(namespace: string, value: SettingValue): Promise<void>;
  listRecentRuns(): Promise<RecentRun[]>;
  addRecentRun(input: RecentRunInput): Promise<RecentRun>;
}
