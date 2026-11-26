# CFA Level I — V1 Android + V2 Study Workspace

## V2（独立测试版，建议新功能先在这里验收）

**[打开 V2 Codespaces 创建入口](https://codespaces.new/refined-heart/cfa-l1-1000-app/tree/v2)**

进入云端 VS Code 后，在 PORTS 面板打开 **5173**。首次进入 V2 网页，请在首页选择本机的 `practice.zip` 导入。V2 不会覆盖 V1，也不会将原始题库 ZIP 提交到 GitHub。

- V2 代码与中文设置说明：[`v2/`](./v2/) · [V2_SETUP.md](./V2_SETUP.md)
- [V2 最近一次构建验证](https://github.com/refined-heart/cfa-l1-1000-app/actions/workflows/validate-v2.yml)
- [V2 源代码分支](https://github.com/refined-heart/cfa-l1-1000-app/tree/v2)

## V1（现有 Android App 与 1000 题）

- [V1 在线预览](https://github.com/refined-heart/cfa-l1-1000-app/tree/preview)
- [正式 Android APK 构建工作流](https://github.com/refined-heart/cfa-l1-1000-app/actions/workflows/build-android.yml)

## 数据与隐私

本仓库当前为 Public。V2 原始题库不会放入 GitHub，用户在浏览器本地导入并保存在 IndexedDB。预览端口保持 Private。V2 的学习记录 JSON 备份不包含题库本体；跨设备恢复时，需要先导入相同版本的 practice.zip。
