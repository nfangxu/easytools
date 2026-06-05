import { describe, expect, it } from 'vitest';

import { tools } from './registry';

describe('tool registry', () => {
  it('exposes the desktop toolbox tools in sidebar order', () => {
    expect(
      tools.map((tool) => ({
        id: tool.id,
        name: tool.name,
        category: tool.category,
      })),
    ).toEqual([
      { id: 'json', name: 'JSON 格式化', category: '文本处理' },
      { id: 'base64', name: 'Base64 加解密', category: '文本处理' },
      { id: 'jwt', name: 'JWT 校验解析', category: '文本处理' },
      { id: 'timestamp', name: '时间戳转换', category: '时间日期' },
      { id: 'llm-api', name: '大模型 API 校验', category: 'AI 工具' },
    ]);
  });
});
