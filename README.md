# CFA Level I 1000题 · Android App

离线内置 1000 道 CFA Level I 练习题，按 10 科和知识点章节重新分类。

主要功能：按科目/章节刷题、随机题、即时判题与解析、错题本、收藏、学习统计、本地保存进度。

## 自动构建 APK

推送到 main 或创建 Pull Request 后，GitHub Actions 的 **Build Android APK** 会自动生成可安装的 `CFA-L1-1000.apk`。

构建前会先把 `src/data/questions.json.br` 解压为 `questions.json`，并强制校验：
- 总题数 = 1000
- 每题必须有题干、A/B/C、答案、科目与章节
- 数据不完整 = 0

> apk-build-test 分支仅用于验证 Android 云构建链。

Build retry after Android SDK action upgrade.
