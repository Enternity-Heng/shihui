# 参与开发

感谢帮助改进式绘。提交问题前，请先阅读 [使用手册](docs/使用手册.md) 中的支持范围与限制。

## 本地开发

使用 Windows x64、Node.js 24 和 npm：

```powershell
npm ci
npm run setup
npm test
npm run build
```

`npm run setup` 会准备 Electron 并按固定 SHA-256 下载缺失的 OCR 模型。开发环境首次准备需要联网；应用运行时离线工作。

日常修改后运行 `npm test` 和 `npm run build`。涉及桌面行为时，按改动范围选择 `test:desktop`、`test:ocr`、`test:professional`、`test:expression`、`test:specialty` 或 `test:ui`。桌面测试会打开窗口并使用剪贴板，请先保存其他工作；人工兼容性验证方法见使用手册。

## 提交修改

- 一次提交集中解决一个问题，说明触发条件、修改后的行为与验证结果。
- 修改公式模板或案例时，保留稳定 ID，补充变量、适用条件和方法来源。
- 不提交 `node_modules/`、`dist/`、`release/`、`test-results/`、`.test-profile/`、模型权重及个人配置。
- 不将真实收藏、历史、草稿或私人截图放入问题描述和测试样例。
- 变更使用方式时，同步更新 README 或 `docs/` 内对应说明。

## 问题反馈

请提供应用版本、Windows 版本、复现步骤、预期和实际结果。涉及目标软件粘贴时，请写明软件名称和版本；识别错误可附不含隐私的最小公式截图。

## 许可证

项目代码采用 [MIT](LICENSE) 许可证。第三方组件、模型与 Windows 运行组件遵循各自许可证，见 [第三方声明](THIRD-PARTY-NOTICES.txt) 和 `assets/` 内的许可证文件。
