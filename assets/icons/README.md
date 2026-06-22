# easytools — Electron 应用图标

Windows 和 macOS 需要的图标格式 **不同**,这里已经分别打包好。

```
build/
├── icon.icns   ← macOS 用(多分辨率,含 Retina @2x)
├── icon.ico    ← Windows 用(含 16/32/48/64/128/256)
└── icon.png    ← Linux / 通用 fallback(1024×1024)
```

## electron-builder(推荐)

把 `build/` 目录放到项目根,electron-builder 默认就会自动识别:

- macOS → 自动用 `build/icon.icns`
- Windows → 自动用 `build/icon.ico`
- Linux → 自动用 `build/icon.png`

无需额外配置。如需显式指定,在 `package.json` 的 `build` 字段里:

```json
{
  "build": {
    "mac":   { "icon": "build/icon.icns" },
    "win":   { "icon": "build/icon.ico" },
    "linux": { "icon": "build/icon.png" }
  }
}
```

## Electron Forge

```js
// forge.config.js
module.exports = {
  packagerConfig: {
    icon: "build/icon" // 不带扩展名,Forge 按平台自动选 .icns / .ico
  }
};
```

## 纯 Electron(BrowserWindow)

```js
const { BrowserWindow } = require("electron");
const path = require("path");

new BrowserWindow({
  icon: process.platform === "win32"
    ? path.join(__dirname, "build/icon.ico")
    : path.join(__dirname, "build/icon.png") // mac 的 Dock 图标由 .icns 在打包时决定
});
```

> 说明:macOS 运行时的应用图标来自打包进 `.app` 的 `.icns`(由 builder 处理),`BrowserWindow` 的 `icon` 在 mac 上主要影响开发期。Windows / Linux 则直接用上面的文件。
