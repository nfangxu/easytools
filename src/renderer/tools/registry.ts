import type { ComponentType } from 'react';

import { Base64Tool } from './base64/Base64Tool';
import { JsonTool } from './json/JsonTool';
import { TimestampTool } from './timestamp/TimestampTool';

export interface ToolComponentProps {
  onRecentRunAdded: () => void;
}

export interface ToolDefinition {
  id: 'json' | 'base64' | 'timestamp';
  name: string;
  category: '文本处理' | '时间日期';
  component: ComponentType<ToolComponentProps>;
}

export const tools: ToolDefinition[] = [
  {
    id: 'json',
    name: 'JSON 格式化',
    category: '文本处理',
    component: JsonTool,
  },
  {
    id: 'base64',
    name: 'Base64 加解密',
    category: '文本处理',
    component: Base64Tool,
  },
  {
    id: 'timestamp',
    name: '时间戳转换',
    category: '时间日期',
    component: TimestampTool,
  },
];
