# Knowledge Studio V4 — 完整课程学习版

V4 将 CFA1 教程与专业英语 V5 重做为教材阅读和学习系统，另保留原 CFA1 Practice、错题本、多账户、词典及四大学习区入口。

**[打开 V4 在线测试环境](https://codespaces.new/refined-heart/cfa-l1-1000-app/tree/v4-curriculum)**

在 Codespaces 的 Ports 面板打开 **5173**（默认 Private）；若没有启动，进入终端执行 `cd v2 && npm run dev`。

## 来源资料

| 学习区 | 用户提供的 ZIP | V4 使用方式 |
|---|---|---|
| CFA → CFA1 教程 / 原始版 | `Course_Content(1).zip` | 课程→章节→课次、原文、图片、题目、答案、笔记 |
| CFA → CFA1 教程 / 交付版 | `Course_Content_交付版(1).zip` | 独立目录、原文、图表、答案核对、进度 |
| 专业英语 | `CFA_Financial_English_Vocabulary_V5_Complete(1).zip` | V5 完整 PDF 教材 + Unit 00–15 词族 + 三阶 A-Z 词典 |
| CFA → CFA1 Practice | `practice.zip` | 保留旧版题目/错题/统计/中文解析编辑与导入导出 |

原 ZIP 不会传到本公开仓库。请在 V4 浏览器中导入一次后自动生成课程；需要更换浏览器时重新导入相同原始资料。可分别导出原 ZIP 与编辑记录。

**[V4 详细使用与验收说明](./V4_SETUP.md)**

开发命令：`cd v2 && npm install && npm run check:v4 && npm run dev`。

**[查看 V4 自动构建验收](https://github.com/refined-heart/cfa-l1-1000-app/actions/workflows/validate-v4.yml)**

注意：源课程 ZIP 含有较大资源文件。V4 有文件覆盖报告，未能渲染的文件应通过原始附件核对，不能认定已全部成功转换。完整 V5 原著以 ZIP 内 PDF 的实际内容为准；单词卡不是全书替代品。
