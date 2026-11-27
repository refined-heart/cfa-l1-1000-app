# Knowledge Studio V3 — 用户测试说明

## 如何进入
1. 在 GitHub 打开 refined-heart/cfa-l1-1000-app 的 v3 分支，创建 Codespace。
2. 在 Codespaces 的 PORTS 面板打开 5173。如果端口不在，在 Terminal 里 cd v2 && npm run dev。
3. 顶部紧凑选择器切换四大学习区；选择 CFA 后可以切换一级/二级/三级教程与 Practice 六模块。

## 上传的四个 ZIP 与导入位置
- practice.zip：CFA → CFA1 Practice → 选择原题 ZIP。保留原英文解析，可编辑中文解析和分节词汇。账户与设置提供导出 practice_V3_Editable_Export.zip。重新导入会读取 _study/v3-overrides.json 恢复编辑。
- Course_Content(1).zip：CFA → CFA1 教程 → 选择来源 Course_Content → 导入课程 ZIP。
- Course_Content_交付版(1).zip：CFA → CFA1 教程 → 选择来源 Course_Content_交付版 → 导入课程 ZIP。
- CFA_Financial_English_Vocabulary_V5_Complete(1).zip：专业英语 → CFA1 金融英语 → 导入 V5 词库 ZIP。

## 关键设计
- 题目英文答案、英文解析是源数据只读层。中文是单独本地编辑层；导出 practice.zip 时，只附加一个 JSON 覆盖层，不改变原题。
- 选择题解答后出现中文初稿、可编辑中文解析、原英文解答和高观点总结。
- 每个 Practice Module 有英文词汇面板，按本节题干、选项和解析识别词库，支持新增、编辑、移出本节。
- 词库英文小写单词是唯一标识；字段包括中文释义、英文定义、UK/US IPA、词根词缀、派生、屈折、短语、近义词、反义词。
- 点击题干/答案/教程文本中的英文词会打开详情；如词库无数据，尝试公开英英词典，缺少中文或词源则显示待补充；音频由浏览器英语合成语音提供。
- CFA1 教程识别 Answer/Solution/Explanation 标题与参考答案字样，把答案折叠到文末；可先作答再 Check。复杂题型与嵌在图片中的答案尚不能自动识别。
- 上方导入/导出按钮可以保存个人编辑层和 V2 账户记录 ZIP；跨设备时先导入相同题库，再恢复学习记录。
- 现代数学/金融学只提供知识脉络入口；CFA2/3 四个模块为待导入内容。没有提供资料的部分不会生成伪造题目。

## 使用边界与数据安全
原始题库和课程材料可能涉及版权，因此当前不提交到公开 GitHub；用户必须在浏览器本地导入。不同 Codespaces 域名上的 IndexedDB 不自动同步，建议定期备份。
大型课程交付包若包含压缩图片、PDF 或复杂交互文件，目前只解析较常见的 MD/JSON/HTML 正文。词汇 ZIP 仅在有可识别 JSON/CSV/TSV 结构化字段时能自动灌入，不会保证未经验证的全部词汇均已导入。

## 验收
V3 GitHub Actions 工作流运行：V2 数据兼容性逻辑测试；模拟 ZIP 导入/答案折叠/词库/覆盖层测试；React Vite 构建。
注意：自动验收使用合成小型 ZIP，不能替代对你实际上传的三份资料的逐文件验收。