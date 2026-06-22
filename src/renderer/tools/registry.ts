import type { ComponentType } from 'react';

import { Base64Tool } from './base64/Base64Tool';
import { IdentityTool } from './identity/IdentityTool';
import { JsonTool } from './json/JsonTool';
import { JwtTool } from './jwt/JwtTool';
import { TimestampTool } from './timestamp/TimestampTool';

export interface ToolComponentProps {
  onRecentRunAdded: () => void;
}

export interface ToolDefinition {
  id: 'json' | 'base64' | 'jwt' | 'timestamp' | 'identity';
  name: string;
  category: 'Text' | 'Date' | 'Data';
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
    id: 'identity',
    name: 'Identity Generator',
    category: 'Data',
    component: IdentityTool,
  },
];
