export type SettingValue =
  | string
  | number
  | boolean
  | null
  | SettingValue[]
  | { [key: string]: SettingValue };

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

export interface WindowControlApi {
  minimize(): Promise<void>;
  toggleMaximize(): Promise<void>;
  close(): Promise<void>;
}

export interface EasyToolsApi {
  window: WindowControlApi;
  getSetting(namespace: string): Promise<SettingValue | null>;
  setSetting(namespace: string, value: SettingValue): Promise<void>;
  listRecentRuns(toolId: string): Promise<RecentRun[]>;
  addRecentRun(input: RecentRunInput): Promise<RecentRun>;
}
