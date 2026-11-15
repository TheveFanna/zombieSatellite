# Workflow — zombieSatellite

- Spec documents in .kiro/specs (requirements.md, design.md, tasks.md) are written in English. Chat replies stay in Chinese.

- Commit locally once after each task is complete and its tests pass, then push immediately. Never push in the middle of a task.

- Before submission: add an English version of docs/reference/TECHNICAL_ROUTE.md. README and the Devpost text must state that the coordinate conventions and numeric acceptance baselines come from the author's earlier personal project SatAware AR, and that all code was newly written during the Kiroween 2026 submission period.

- 需求阶段不运行任何代码或扫描来复核验收基线：参考文档第 4 节的基线已经过验证、是 normative 的，直接引用。验证只发生在实现阶段的验收测试里。
- 需求细化只把发起稿转成 EARS 条目，不自行新增发起稿之外的验收用例；认为缺用例时先列出来问我，不要自行补算。
- 实现阶段纪律：守卫、工具类代码用最简的充分验证即可，禁止为单个自检或单个工具函数做多层对照实验、底层埋桩验证或负向仪器化测试。拿不准时按 design.md 的既定方案直接执行，不自行扩展验证范围；认为 design 不足时先停下来问，不要边想边加码。
- 并行执行：仅当多个 task 互不依赖、且改动的文件互不重叠时，才可拆给子 agent 并行执行，最多同时 2–3 个。子 agent 只负责写代码和跑自己 task 的测试，commit 与 push 一律由主 agent 在子 agent 返回后串行完成。文件有重叠或依赖关系不清时串行执行。默认串行，只在赶工或任务量大的 spec 时启用并行。
