# CFA 1000 题 — Codespaces 在线开发与测试

## 最稳妥的打开方式（不依赖深链接）

1. 先打开 [仓库 preview 分支](https://github.com/refined-heart/cfa-l1-1000-app/tree/preview) 并确认已登录 GitHub。
2. 点击绿色 **Code** 按钮，选择 **Codespaces**。
3. 如未创建过环境，点击 **Create codespace on preview**；已经创建过则从 https://github.com/codespaces 继续原来的环境。
4. 云端 VS Code 出现后，下方 **PORTS** 面板应有 8081 端口。右键点击该端口（或点地球图标），选择 **Open in Browser**。
5. 进入网页预览后即可按科目、章节练习并验证错题本。可复制私有转发链接到一加手机浏览器，以 GitHub 账号登录使用。

也可以试用 [短链接 Codespaces.new（preview 分支）](https://codespaces.new/refined-heart/cfa-l1-1000-app/tree/preview)。此链接仅负责启动你自己的云端开发环境，**不是长期运行的公开 App 网址**。

## 如果打不开，按出现的错误排查

- **GitHub 仓库可以打开，Codespaces 按钮不存在或禁用：** 检查 GitHub Codespaces 账号权限、使用额度、仓库是否允许创建。尝试 https://github.com/codespaces/new 从列表手动选仓库和 preview 分支。
- **找不到仓库/跳到错误分支：** 在仓库首页先切换到 preview 分支，然后使用 Code → Codespaces。
- **Codespace 正在创建，提示 provisioning/build 失败：** 在 https://github.com/codespaces 查看是否创建成功；失败时打开创建日志、截图完整报错。
- **进入编辑器，但预览网页打不开：** 打开 Terminal 输入 `npm run start:web`，确认没有报错；检查 8081 端口是否出现在 PORTS 面板，并使用端口提供的 HTTPS URL，不能用你自己电脑的 localhost:8081。
- **预览网页白屏：** 点击 Terminal 右侧终端输出或运行 `npm run build:web`，截图首条报错；可以用 GitHub Actions 的 Validate Online Preview 判断是构建错误还是运行环境错误。
- **提示 503 / Codespace stopped：** 从 https://github.com/codespaces 点 **Start**，然后重新打开私有端口。

## 代码修改流程

1. 你发一张截图，最好标注“科目、章节、原题编号、期望行为、实际行为”。
2. 我提交修改到 `preview` 分支，同时运行 `npm run check:data` 和 `npm run build:web` 验证。
3. 在 Codespaces 的 Source Control 或 Terminal 中执行 `git pull`，然后刷新网页；源代码修改一般由 Expo Dev Server 自动热更新。
4. 你确认后，再将修改合并到 `main` 并单独构建新的 Release APK。

## 安卓一加手机真机开发调试

浏览器预览是 React Native Web，不等同于原生安装效果。如需实时原生调试，在 Codespaces 中开启新终端，运行：

```bash
npx expo start --tunnel --port 8082
```

如有提示，按 Expo 指引安装隧道依赖；手机安装兼容 SDK 的 Expo Go 并扫码。首次需要你本人配置相关登录与手机权限。此前离线 Release APK 未配置 OTA 更新，所以并不会因为改了线上代码而自动更新。

## 安全和计费

Codespaces 是分配给你账号的远程开发机；首次创建和运行都可能消耗你自己的 Codespaces 额度。建议闲置时停止 Codespace。预览端口保持 **Private**，不要公开题库。浏览器的答题记录仅存于当前浏览器，并未与安卓 APK 同步。
