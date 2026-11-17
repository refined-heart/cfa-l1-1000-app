# CFA 一级 1000 题 — 在线开发与测试

## 一、推荐：GitHub Codespaces，浏览器里直接测试

这是同一份 React Native/Expo App 的 **Web 预览**，不是另建一套模拟题库。
从 `dev/online-preview` 分支打开 Codespace，云端自动安装依赖、重建 1000 题数据并启动预览服务器。

1. 打开仓库 `refined-heart/cfa-l1-1000-app`，切换分支为 `dev/online-preview`。
2. 点击 **Code → Codespaces → Create codespace on dev/online-preview**。
3. Codespaces 初始化后，点击 **PORTS / 端口** 标签页上的 **8081（CFA 1000题 浏览器预览）→ Open in Browser**。
4. 可在电脑浏览器里按 F12 切换手机屏幕，也可以在一加手机的浏览器访问同一个私有预览地址（需要以自己的 GitHub 账号登录）。
5. 测试时向 ChatGPT 提供：**科目、章节、原题编号、预期效果、实际效果、截图**。我修改 `dev/online-preview` 分支，你在 Codespaces 的 Source Control 里 Pull 最新提交，再刷新预览。

默认预览地址为 **私有端口链接**，只有被授权的 GitHub 用户可以访问；不同 Codespace 的 URL 不同，并且 Codespace 暂停后链接可能暂时不可用。要暂停或删除 Codespace，请到 GitHub Codespaces 管理页面操作，以避免额外使用额度。

如网页未自动打开：在 Codespaces 终端运行 `npm run start:web`，再到 PORTS 里打开 8081；启动日志是 `/tmp/cfa-preview.log`。

## 二、一加安卓手机 — 测试真正的原生页面

网页预览适合检查题目、解析、交互和排版；**它不能完全代替 Android 真机验证**。

在 Codespaces 打开一个新终端，运行：

```bash
npx expo login
npx expo start --tunnel --port 8082
```

按提示安装 tunnel 所需的依赖并登录 Expo。手机安装 **Expo Go**（SDK 57），用相同 Expo 账号登录并扫终端二维码打开项目。开发服务运行期间，代码改动会通过 Metro 更新到 Expo Go，不必重新编译 APK。使用 tunnel 可能需要额外网络访问或登录。

注意：此前的离线 Release APK **没有配置 EAS Update**，因此它本身不会随着 GitHub 代码修改自动更新。浏览器预览与安卓 App 的答题记录也是两套独立的本地数据；当前并无账号云同步。

## 三、验收与发布规则

- 线上测试和代码修改优先放在 `dev/online-preview`；**正式 Android APK 仍从 `main` 构建**。
- 每次修改先运行 `npm run check:data` 和 `npm run build:web`；GitHub Actions 也会自动检查。
- 测试通过并由使用者确认后，再将审核过的变更合并到 `main`，构建新的离线 Release APK。
- 需要后续“不重装 APK 的空中更新”，可另行绑定 Expo EAS 项目、配置 `expo-updates`、分离 `preview` 与 `production` 更新通道，并重新安装一次支持 OTA 的预览版 APK；原生依赖变更仍可能需要新 APK。

## 四、项目内容的保密提醒

仓库目前是 **Public（公开）**，其中包含你整理的完整 CFA 题目及解析数据。若这些资料仅供你个人使用，或题库涉及第三方版权，建议把仓库改为 **Private**，并始终保持 Codespaces 转发端口为 Private。不要把带完整付费题库的预览链接或打包内容公开发布。
