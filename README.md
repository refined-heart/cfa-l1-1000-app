# Knowledge Studio V3

V3 四大学习区：现代数学、专业英语、金融学、CFA。

## V3 线上测试入口

https://codespaces.new/refined-heart/cfa-l1-1000-app/tree/v3

新建基于 v3 分支的 GitHub Codespace；进入后在 PORTS 面板打开私有端口 5173。

## CFA 六个模块

CFA1 教程 / CFA1 Practice / CFA2 教程 / CFA2 Practice / CFA3 教程 / CFA3 Practice。

CFA1 教程可导入两份 Course_Content ZIP，课程答案默认在末尾折叠，支持 Check。

CFA1 Practice 保留 V2 的题库、错题本、多账户和统计；中文解析现在可编辑，英文原文保持不动；可导出/导入带 V3 修改层的 practice.zip。

专业英语区导入 CFA_Financial_English_Vocabulary_V5_Complete ZIP，识别结构化 JSON/CSV/TSV 单词表，支持编辑与删除。

题目和讲义中的英文单词可点开词典，查看英美音标/朗读、中文和英文解释、派生、屈折、词根词缀、短语及近反义词。无数据时显示待补充。

CFA2/3 四个子模块以及现代数学、金融学目前仅提供课程导航，不能伪称已导入教材。

原始课程/题库 ZIP 不上传当前公开 GitHub；用户在自己浏览器里导入。学习资料较大，浏览器存储会受本地配额限制。

## 构建验证

进入仓库 v2 目录，执行 npm install、npm run check:v3、npm run dev。
自动验收：https://github.com/refined-heart/cfa-l1-1000-app/actions/workflows/validate-v3.yml

现阶段是网页 QA 版本；尚未构建 Android V3 安装包。