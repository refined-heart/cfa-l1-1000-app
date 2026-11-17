# CFA Level I 1000 题 — 在线预览和安卓 App

Android 采用 React Native / Expo，题库内置完整 1000 题，按十科及知识点重排；做题后显示答案与深度解析，错题自动进入错题本。

## 在线测试（开发版）

**[打开 GitHub Codespaces 云端开发/测试环境](https://codespaces.new/refined-heart/cfa-l1-1000-app/tree/dev/online-preview?quickstart=1)**

> 如果 GitHub 没自动选中，请确保创建的 Codespace 使用 **`dev/online-preview`** 分支。

进入 Codespaces 后依赖和题库会自动准备，网页版会启动在私有转发的 **8081** 端口。在 **PORTS** 面板选择 **8081 → Open in Browser** 就能在电脑或一加手机浏览器测试。

本分支用于试改和验收，正式离线 APK 从 `main` 构建。浏览器本地记录与 Android 手机的记录不自动同步。完整操作、原生 Expo Go 测试及错误反馈方法请阅读 [ONLINE_PREVIEW.md](./ONLINE_PREVIEW.md)。

## 安卓 Release APK

`main` 分支的 GitHub Actions **Build Android Release APK** 工作流将构建带 JS bundle 的离线 APK，下载入口位于该工作流执行结果的 Artifacts 下。不要安装需要 Metro 服务器的 debug APK。

## 保密提醒

此仓库目前为 Public。题库及解析可能包含第三方受版权保护的内容；个人使用建议修改为 Private，并保持 Codespaces 预览端口为 Private。
