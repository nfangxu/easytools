import type { ComponentType } from 'react';

import { Base64Tool } from './base64/Base64Tool';
import { JsonTool } from './json/JsonTool';
import { JwtTool } from './jwt/JwtTool';
import { LlmApiCheckerTool } from './llm-api/LlmApiCheckerTool';
import { TimestampTool } from './timestamp/TimestampTool';

export interface ToolComponentProps {
  onRecentRunAdded: () => void;
}

export interface ToolDefinition {
  id: 'json' | 'base64' | 'jwt' | 'timestamp' | 'llm-api';
  name: string;
  category: 'Text' | 'Date' | 'AI';
  component: ComponentType<ToolComponentProps>;
}

export const tools: ToolDefinition[] = [
  {
    id: 'timestamp',
    name: 'Timestamp Converter',
    category: 'Date',
    component: TimestampTool,
  },
  {
    id: 'base64',
    name: 'Base64 Encoder',
    category: 'Text',
    component: Base64Tool,
  },
  {
    id: 'json',
    name: 'JSON Formatter',
    category: 'Text',
    component: JsonTool,
  },
  {
    id: 'jwt',
    name: 'JWT Debugger',
    category: 'Text',
    component: JwtTool,
  },
  {
    id: 'llm-api',
    name: 'LLM API Checker',
    category: 'AI',
    component: LlmApiCheckerTool,
  },
];
