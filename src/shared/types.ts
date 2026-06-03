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

export type LlmApiProtocol = 'openai' | 'anthropic';

export type LlmApiStepStatus = 'success' | 'failed' | 'unsupported' | 'skipped';

export interface LlmApiValidationInput {
  protocol: LlmApiProtocol;
  baseUrl: string;
  apiKeys: string[];
  model?: string;
}

export interface LlmApiStepResult {
  status: LlmApiStepStatus;
  message: string;
}

export type LlmApiKeyStatus = 'available' | 'partial' | 'unavailable';

export interface LlmApiKeyValidationResult {
  protocol: LlmApiProtocol;
  maskedKey: string;
  selectedModel: string;
  modelList: LlmApiStepResult;
  balance: LlmApiStepResult;
  chat: LlmApiStepResult;
  status: LlmApiKeyStatus;
  errorSummary: string;
}

export interface LlmApiBatchValidationResult {
  total: number;
  availableCount: number;
  results: LlmApiKeyValidationResult[];
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
  validateLlmApi(input: LlmApiValidationInput): Promise<LlmApiBatchValidationResult>;
}
