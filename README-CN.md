# EasyTools

EasyTools 是一个本地 Electron 桌面工具箱，用于日常开发和文本处理。

## 功能

- JSON 格式化和压缩
- Base64 编码和解码
- 时间戳转换
- 大模型 API Key 校验
- 本地保存最近运行记录
- 自定义无系统边框桌面窗口

## 开发

安装依赖：

```bash
npm install
```

启动 Electron 开发应用：

```bash
npm run dev
```

运行类型检查：

```bash
npm run typecheck
```

运行测试：

```bash
npm test
```

构建应用：

```bash
npm run build
```

## 打包

按当前平台打包：

```bash
npm run dist
```

打包 Windows 安装程序：

```bash
npm run dist:win
```

打包 macOS DMG：

```bash
npm run dist:mac
```

Windows 发布构建会生成 NSIS 安装包和 ZIP 便携包。macOS 发布构建会生成 DMG 安装包。

## GitHub 发布

推送版本标签会触发发布工作流：

```bash
git tag v0.1.0
git push origin v0.1.0
```

工作流会构建 Windows 和 macOS 安装包，并上传到该标签对应的 GitHub Release。

当前未配置代码签名和 macOS 公证，因此安装发布包时操作系统可能会显示安全提示。
