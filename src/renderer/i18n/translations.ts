import type { Language } from './types';

/**
 * Flat key→string map for English. The English table is canonical:
 * `TranslationKey` is derived from its keys, and any other language's table
 * must cover the same set (TypeScript enforces this via the satisfies clause
 * at the bottom of this file).
 *
 * Conventions for keys:
 *   common.*   — shared button / field labels reused across tools
 *   sidebar.*  — left navigation chrome
 *   topnav.*   — top bar chrome
 *   recent.*   — recent-runs panel
 *   status.*   — runtime status banners (returned from utility helpers)
 *   settings.* — the Settings page
 *   tool.<id>.* — strings owned by a single tool
 *
 * Notes on intentional non-translation:
 *   - Tool plate stencil names (BASE64 / JSON / JWT / TIMESTAMP)
 *     and subtitles (ENCODER / FORMATTER / DEBUGGER / CONVERTER)
 *     are brand stamping rendered in Big Shoulders Stencil — a Latin-only
 *     typeface — so they stay English in both languages.
 *   - Gauge state codes (ENCODE / DECODE / PARSE / etc.) and segment labels
 *     (IN / OUT / ALG / CLAIMS / SIG / TEMPLATE / KEYS / AVAIL) are kept as
 *     mono-uppercase technical readouts that read the same in any locale.
 *   - Vendor template names ("阿里百炼", "MiniMax", …) are proper nouns and
 *     are not translated.
 */
const en = {
  // Shared chrome -------------------------------------------------------
  'common.copy': 'Copy',
  'common.clear': 'Clear',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.copyToClipboard': 'Copy to clipboard',
  'common.input': 'Input',
  'common.output': 'Output',

  'sidebar.tag': 'Workbench',
  'sidebar.section.tools': 'Tools',
  'sidebar.settings': 'Settings',
  'sidebar.docs': 'Docs',

  'topnav.search': 'Quick search',
  'topnav.workbench': 'WORKBENCH',
  'topnav.notifications': 'Notifications',
  'topnav.account': 'Account',

  'recent.title': 'Recent runs',
  'recent.empty': 'No records yet',
  'recent.loadFailed': 'Failed to load recent records',

  // Runtime status banners returned from tool utilities ----------------
  'status.copied': 'Copied',
  'status.copyFailed': 'Copy failed',
  'status.electronUnavailable': 'Electron API unavailable. Please launch the desktop app via npm run dev.',
  'status.recentRunFailed': 'Failed to save recent run',

  // Settings page ------------------------------------------------------
  'settings.name': 'SETTINGS',
  'settings.subtitle': 'PREFERENCES',
  'settings.description': 'Application preferences and language.',
  'settings.section.language': 'Language',
  'settings.section.language.help': 'Switch UI language. The change applies immediately.',
  'settings.language.en': 'English',
  'settings.language.zh': '简体中文',

  // Tool names (sidebar / top-nav stamp / titlebar) ---------------------
  'tool.timestamp.name': 'Timestamp Converter',
  'tool.base64.name': 'Base64 Encoder',
  'tool.json.name': 'JSON Formatter',
  'tool.jwt.name': 'JWT Debugger',
  'tool.identity.name': 'Identity Generator',

  // Timestamp tool ------------------------------------------------------
  'tool.timestamp.description': 'Convert between Unix timestamps and local dates.',
  'tool.timestamp.label.timestamp': 'Timestamp',
  'tool.timestamp.label.datetime': 'Date / Time',
  'tool.timestamp.label.result': 'Result',
  'tool.timestamp.placeholder.timestamp': '10-digit seconds or 13-digit milliseconds',
  'tool.timestamp.placeholder.datetime': 'YYYY-MM-DD HH:mm:ss',
  'tool.timestamp.placeholder.result': 'Conversion result will appear here',
  'tool.timestamp.action.toDate': '→ Date',
  'tool.timestamp.action.toTimestamp': '→ Timestamp',
  'tool.timestamp.action.current': 'Current',
  'tool.timestamp.summary.toDate': 'Timestamp → date',
  'tool.timestamp.summary.toTimestamp': 'Date → timestamp',
  'tool.timestamp.summary.current': 'Current timestamp',

  // Base64 tool ---------------------------------------------------------
  'tool.base64.description': 'Local Base64 encode / decode. Data never leaves your machine.',
  'tool.base64.label.input': 'Input source',
  'tool.base64.label.output': 'Output result',
  'tool.base64.placeholder.input': 'Paste or type your content here…',
  'tool.base64.action.encode': 'Encode',
  'tool.base64.action.decode': 'Decode',
  'tool.base64.summary.encode': 'Base64 encode',
  'tool.base64.summary.decode': 'Base64 decode',

  // JSON tool -----------------------------------------------------------
  'tool.json.description': 'Format or compact JSON text. Invalid input stays in the editor.',
  'tool.json.placeholder.input': 'Paste JSON text',
  'tool.json.placeholder.output': 'Result will appear after running',
  'tool.json.action.format': 'Format',
  'tool.json.action.compact': 'Compact',
  'tool.json.summary.format': 'JSON format',
  'tool.json.summary.compact': 'JSON compact',

  // JWT tool ------------------------------------------------------------
  'tool.jwt.description': 'Parse JWT header / payload, with optional HS256/HS384/HS512 signature verification.',
  'tool.jwt.label.token': 'JWT Token',
  'tool.jwt.label.secret': 'HMAC Secret',
  'tool.jwt.label.header': 'Header',
  'tool.jwt.label.payload': 'Payload',
  'tool.jwt.placeholder.token': 'Paste JWT string',
  'tool.jwt.placeholder.secret': 'Optional, HS256/384/512 only',
  'tool.jwt.placeholder.output': 'Parsed JSON will appear here',
  'tool.jwt.action.parse': 'Parse',
  'tool.jwt.action.copyPayload': 'Copy payload',
  'tool.jwt.claims': 'Claims & Signature',
  'tool.jwt.noSecret': 'No secret provided, signature unverified.',
  'tool.jwt.summary.parse': 'JWT parse',
  'tool.jwt.summary.parseVerify': 'JWT parse with signature verify',
  'tool.jwt.error.malformed': 'A JWT must contain three parts: header, payload, signature.',
  'tool.jwt.error.parseFailed': 'JWT parse failed.',
  'tool.jwt.error.invalidPart': '{{part}} must be a JSON object.',
  'tool.jwt.timing.expired': 'Expired: {{at}}',
  'tool.jwt.timing.notExpired': 'Not expired: {{at}}',
  'tool.jwt.timing.notYetValid': 'Not yet valid: {{at}}',
  'tool.jwt.timing.alreadyValid': 'Effective since: {{at}}',
  'tool.jwt.timing.iat': 'Issued at: {{at}}',
  'tool.jwt.timing.none': 'No exp/nbf/iat claims present.',
  'tool.jwt.signature.unsupported': 'Only HS256/HS384/HS512 are supported for signature verification.',
  'tool.jwt.signature.noSecret': 'Enter a secret to verify the signature.',
  'tool.jwt.signature.valid': '{{alg}} signature verified.',
  'tool.jwt.signature.invalid': '{{alg}} signature failed verification.',
  'tool.jwt.sigState.valid': 'VALID',
  'tool.jwt.sigState.invalid': 'INVALID',
  'tool.jwt.sigState.pending': 'PENDING',
  'tool.jwt.sigState.unverified': 'UNVERIFIED',


  // Identity generator --------------------------------------------------
  'tool.identity.description': 'Generate plausible Chinese names + resident ID numbers locally for testing.',
  'tool.identity.action.generate': 'Generate',
  'tool.identity.action.copyRow': 'Copy ID',
  'tool.identity.action.copyAll': 'Copy all (TSV)',
  'tool.identity.action.copyJson': 'Copy JSON',
  'tool.identity.section.region': 'Region',
  'tool.identity.section.birth': 'Birth date',
  'tool.identity.section.gender': 'Gender',
  'tool.identity.section.count': 'Count',
  'tool.identity.region.any': 'Any',
  'tool.identity.region.province': 'Province',
  'tool.identity.region.city': 'City',
  'tool.identity.region.county': 'County',
  'tool.identity.birth.from': 'From',
  'tool.identity.birth.to': 'To',
  'tool.identity.birth.help': 'Leave blank to use the default range (1950 – today).',
  'tool.identity.gender.random': 'Random',
  'tool.identity.gender.male': 'Male',
  'tool.identity.gender.female': 'Female',
  'tool.identity.gender.male.short': 'M',
  'tool.identity.gender.female.short': 'F',
  'tool.identity.column.index': '#',
  'tool.identity.column.name': 'Name',
  'tool.identity.column.gender': 'Gender',
  'tool.identity.column.birth': 'Birth',
  'tool.identity.column.region': 'Region',
  'tool.identity.column.id': 'ID number',
  'tool.identity.column.mobile': 'Mobile',
  'tool.identity.empty': 'No records yet — set filters (or none) and click Generate.',
  'tool.identity.summary': 'Generated {{count}} identities',
  'tool.identity.error.invalidRange': 'The "to" date is earlier than the "from" date.',
  'tool.identity.error.invalidCount': 'Count must be between {{min}} and {{max}}.',
} satisfies Record<string, string>;

const zh: Record<keyof typeof en, string> = {
  'common.copy': '复制',
  'common.clear': '清空',
  'common.cancel': '取消',
  'common.save': '保存',
  'common.copyToClipboard': '复制到剪贴板',
  'common.input': '输入',
  'common.output': '输出',

  'sidebar.tag': '工作台',
  'sidebar.section.tools': '工具',
  'sidebar.settings': '设置',
  'sidebar.docs': '文档',

  'topnav.search': '快速搜索',
  'topnav.workbench': 'WORKBENCH',
  'topnav.notifications': '通知',
  'topnav.account': '账户',

  'recent.title': '最近运行',
  'recent.empty': '暂无记录',
  'recent.loadFailed': '最近记录加载失败',

  'status.copied': '已复制',
  'status.copyFailed': '复制失败',
  'status.electronUnavailable': 'Electron API 不可用，请通过 npm run dev 启动桌面应用。',
  'status.recentRunFailed': '最近记录保存失败',

  'settings.name': 'SETTINGS',
  'settings.subtitle': 'PREFERENCES',
  'settings.description': '应用偏好与语言设置。',
  'settings.section.language': '语言',
  'settings.section.language.help': '切换界面语言，立即生效。',
  'settings.language.en': 'English',
  'settings.language.zh': '简体中文',

  'tool.timestamp.name': '时间戳转换',
  'tool.base64.name': 'Base64 编码',
  'tool.json.name': 'JSON 格式化',
  'tool.jwt.name': 'JWT 调试',
  'tool.identity.name': '姓名身份证',

  'tool.timestamp.description': '在 Unix 时间戳与本地日期之间转换。',
  'tool.timestamp.label.timestamp': '时间戳',
  'tool.timestamp.label.datetime': '日期 / 时间',
  'tool.timestamp.label.result': '结果',
  'tool.timestamp.placeholder.timestamp': '10 位秒或 13 位毫秒',
  'tool.timestamp.placeholder.datetime': 'YYYY-MM-DD HH:mm:ss',
  'tool.timestamp.placeholder.result': '运行后显示转换结果',
  'tool.timestamp.action.toDate': '→ 日期',
  'tool.timestamp.action.toTimestamp': '→ 时间戳',
  'tool.timestamp.action.current': '当前时间',
  'tool.timestamp.summary.toDate': '时间戳转日期',
  'tool.timestamp.summary.toTimestamp': '日期转时间戳',
  'tool.timestamp.summary.current': '当前时间戳',

  'tool.base64.description': '本地 Base64 编码 / 解码。所有数据仅在你的机器上处理。',
  'tool.base64.label.input': '输入',
  'tool.base64.label.output': '输出',
  'tool.base64.placeholder.input': '粘贴或输入内容…',
  'tool.base64.action.encode': '编码',
  'tool.base64.action.decode': '解码',
  'tool.base64.summary.encode': 'Base64 编码',
  'tool.base64.summary.decode': 'Base64 解码',

  'tool.json.description': '格式化或压缩 JSON 文本，错误输入会保留在编辑区。',
  'tool.json.placeholder.input': '粘贴 JSON 文本',
  'tool.json.placeholder.output': '运行后显示结果',
  'tool.json.action.format': '格式化',
  'tool.json.action.compact': '压缩',
  'tool.json.summary.format': 'JSON 格式化',
  'tool.json.summary.compact': 'JSON 压缩',

  'tool.jwt.description': '解析 JWT Header / Payload，可选 HS256/HS384/HS512 密钥校验。',
  'tool.jwt.label.token': 'JWT Token',
  'tool.jwt.label.secret': 'HMAC 密钥',
  'tool.jwt.label.header': 'Header',
  'tool.jwt.label.payload': 'Payload',
  'tool.jwt.placeholder.token': '粘贴 JWT 字符串',
  'tool.jwt.placeholder.secret': '可选，仅 HS256/384/512',
  'tool.jwt.placeholder.output': '解析后显示 JSON',
  'tool.jwt.action.parse': '解析',
  'tool.jwt.action.copyPayload': '复制 Payload',
  'tool.jwt.claims': '声明与签名',
  'tool.jwt.noSecret': '未输入密钥，未校验签名。',
  'tool.jwt.summary.parse': 'JWT 解析',
  'tool.jwt.summary.parseVerify': 'JWT 解析并校验签名',
  'tool.jwt.error.malformed': 'JWT 必须包含 header、payload、signature 三段。',
  'tool.jwt.error.parseFailed': 'JWT 解析失败。',
  'tool.jwt.error.invalidPart': '{{part}} 必须是 JSON 对象。',
  'tool.jwt.timing.expired': '已过期：{{at}}',
  'tool.jwt.timing.notExpired': '未过期：{{at}}',
  'tool.jwt.timing.notYetValid': '尚未生效：{{at}}',
  'tool.jwt.timing.alreadyValid': '已生效：{{at}}',
  'tool.jwt.timing.iat': '签发时间：{{at}}',
  'tool.jwt.timing.none': '未包含 exp/nbf/iat 时间声明。',
  'tool.jwt.signature.unsupported': '当前仅支持 HS256/HS384/HS512 密钥校验。',
  'tool.jwt.signature.noSecret': '请输入密钥后再校验签名。',
  'tool.jwt.signature.valid': '{{alg}} 签名校验通过。',
  'tool.jwt.signature.invalid': '{{alg}} 签名校验失败。',
  'tool.jwt.sigState.valid': 'VALID',
  'tool.jwt.sigState.invalid': 'INVALID',
  'tool.jwt.sigState.pending': 'PENDING',
  'tool.jwt.sigState.unverified': 'UNVERIFIED',


  'tool.identity.description': '本地生成符合校验规则的中文姓名 + 身份证号，用于测试场景。',
  'tool.identity.action.generate': '生成',
  'tool.identity.action.copyRow': '复制 ID',
  'tool.identity.action.copyAll': '复制全部 (TSV)',
  'tool.identity.action.copyJson': '复制为 JSON',
  'tool.identity.section.region': '地区',
  'tool.identity.section.birth': '生日',
  'tool.identity.section.gender': '性别',
  'tool.identity.section.count': '条数',
  'tool.identity.region.any': '随机',
  'tool.identity.region.province': '省份',
  'tool.identity.region.city': '城市',
  'tool.identity.region.county': '区县',
  'tool.identity.birth.from': '起始',
  'tool.identity.birth.to': '截止',
  'tool.identity.birth.help': '留空使用默认区间（1950 至今）。',
  'tool.identity.gender.random': '随机',
  'tool.identity.gender.male': '男',
  'tool.identity.gender.female': '女',
  'tool.identity.gender.male.short': '男',
  'tool.identity.gender.female.short': '女',
  'tool.identity.column.index': '#',
  'tool.identity.column.name': '姓名',
  'tool.identity.column.gender': '性别',
  'tool.identity.column.birth': '生日',
  'tool.identity.column.region': '地区',
  'tool.identity.column.id': '身份证号',
  'tool.identity.column.mobile': '手机号',
  'tool.identity.empty': '尚无数据——选择条件（或不选）后点击生成。',
  'tool.identity.summary': '已生成 {{count}} 条',
  'tool.identity.error.invalidRange': '截止日期早于起始日期。',
  'tool.identity.error.invalidCount': '条数必须在 {{min}} 到 {{max}} 之间。',
};

export type TranslationKey = keyof typeof en;

export const translations: Record<Language, Record<TranslationKey, string>> = {
  en,
  zh,
};

/**
 * Replace `{{name}}` placeholders inside `template` with values from `vars`.
 * Pure helper exported so the provider and any direct callers can share it.
 */
export function interpolate(
  template: string,
  vars: Record<string, string | number> | undefined,
): string {
  if (!vars) {
    return template;
  }
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
  }
  return out;
}
