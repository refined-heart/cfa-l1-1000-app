# CFA Level I 1000 题 — 在线测试与安卓 App

本项目使用 React Native / Expo，包含十科 1000 题与分类练习、答题后解析、错题本和进度记录。

## 在线测试（首选入口）

**[打开 Codespaces 创建页：preview 分支](https://codespaces.new/refined-heart/cfa-l1-1000-app/tree/preview)**

若上述入口在浏览器中无法跳转，**不必使用该链接**，直接打开：
**[项目 preview 分支](https://github.com/refined-heart/cfa-l1-1000-app/tree/preview)**

确保登录 GitHub 账号 `refined-heart`，点击 **Code → Codespaces → Create codespace on preview**。如已创建过 Codespace，请从 https://github.com/codespaces 打开已有的环境，而不是重复创建。

进入云端编辑器后，在底部 **PORTS** 面板找到 `8081`，选择 **Open in Browser**。若没有端口，打开 Terminal 运行 `npm run start:web`，再刷新 Ports 视图。网页版用于测试，记录单独保存在浏览器 Local Storage，不自动同步到安卓手机。

**[详细操作及常见问题](./ONLINE_PREVIEW.md)**

## 代码协作

- `preview`：新的浏览器测试分支。你反馈问题后优先在此分支改。
- `dev/online-preview`：保留的旧测试分支。
- `main`：正式离线 Android Release APK 分支。不会因为测试版代码更新就自动变化。

## 版权与数据提醒

仓库当前为 **Public**，其中包含题库与解析。若仅供个人学习，且素材来源于第三方付费内容，请将仓库设为 **Private**，并保持 Codespaces 的转发端口为 Private。
