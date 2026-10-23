# Task 3：建立多态 Shape 基类并迁移矩形模型

你是 `Dinversky/svg-editor` 项目的开发 Agent。请严格执行以下任务，不要重新规划项目阶段，也不要扩大任务范围。

## 一、任务目标

当前项目已经支持：

- `init [w] [h]`
- `create rect <id> <x> <y> <w> <h> [fill]`
- `tree`
- `save <file.svg>`
- `help`、`exit`

但当前模型只有 `RectangleShape`，`TreeFormatter` 和 `SvgSerializer` 直接读取矩形属性。这不符合项目阶段规划中要求的多态图形模型。

本任务只建立图形多态的基础：

1. 新增抽象类 `Shape`。
2. 将 `RectangleShape` 迁移为 `Rect`，使其继承 `Shape`。
3. 将图形属性描述和 SVG 元素生成职责放到图形对象自身。
4. 让 `TreeFormatter` 和 `SvgSerializer` 面向 `Shape` 的多态接口工作，而不是直接处理矩形属性。
5. 保持现有 CLI 的外部行为不变。

本任务不要求一次性完成阶段 2 的所有工作。

## 二、开始前检查

修改文件前，先检查：

1. 当前仓库目录、分支、`git status --short --branch`、最近提交和远程配置。
2. 根目录 `AGENTS.md`、`README.md`、`Task2.md`、`doc/README.md`。
3. `src/model/Canvas.ts`、`src/model/RectangleShape.ts`、`src/model/ShapeFactory.ts`。
4. `src/cli/TreeFormatter.ts`、`src/io/SvgSerializer.ts`、`src/cli/SvgEditorCli.ts` 和现有测试。
5. 当前 TypeScript 配置和实际可用的 npm scripts。

遵循仓库中的 `AGENTS.md`。保留所有已有修改，不得重置、清理或覆盖用户工作。

如果发现本地工作区存在未提交改动，先确认哪些文件与本任务有关，并在不覆盖这些改动的前提下继续。不要仅凭远程 GitHub 内容推断本地工作区状态。

## 三、实现要求

### 1. 新增 `Shape` 抽象类

在 `src/model/Shape.ts` 中定义抽象类 `Shape`。

至少满足：

- 通过基类封装图形 ID。
- ID 不能为空。
- 提供抽象方法 `describe(): string`，返回图形在 `tree` 输出中使用的属性描述。
- 提供抽象方法 `toSvgElement(): string`，返回该图形对应的 SVG 元素文本。
- 遵循项目的一类一文件规则。

不要把矩形的坐标、宽高等属性放入基类。基类只保留适用于各种图形的共同职责。

当前还没有 `Group` 或统一容器抽象，因此本任务不要为了预留未来功能而引入不完整的父子关系系统。父节点和容器模型留到后续 `Document`/容器任务中实现。

### 2. 将矩形迁移为 `Rect`

新增 `src/model/Rect.ts`，让 `Rect extends Shape`。

要求：

- 保留现有矩形几何属性及其校验。
- 保留 `fill` 可选的行为。
- `x`、`y` 必须是有限数值；宽高必须是有限正数。
- 不因图形越过画布边界而拒绝、裁剪、移动或改变图形。越界行为已确认符合项目约定，不需要另行设计或增加任务。
- `describe()` 输出与现有 `tree` 中矩形条目一致。
- `toSvgElement()` 输出矩形 SVG 元素，属性顺序和转义规则与当前序列化结果一致。

完成迁移后，删除旧的 `RectangleShape.ts`，但前提是所有引用均已迁移，且不存在仍需要保留该类名的兼容要求。不要同时保留两套重复的矩形模型。

### 3. 调整 `Canvas`

当前 `Canvas` 暂时继续承担画布尺寸和根级图形集合的职责。

本任务中：

- 将图形集合的类型从 `RectangleShape[]` 改为 `Shape[]`。
- 保持当前的插入顺序和大小写敏感的 ID 唯一性规则。
- 保持现有 `hasShape`、`addShape` 的外部行为。
- 不实现 `Document`、ID 哈希索引、`Group` 或嵌套子节点。
- 不引入与本次任务无关的抽象。

### 4. 调整 `ShapeFactory`

保留现有 `ShapeFactory`，继续只支持 `rect`。

- 创建方法应返回 `Rect`。
- 不新增其他图形类型。
- 不在 CLI 中直接构造 `Rect`。
- 不在本任务中实现注册表式工厂；该项按阶段规划留到后续图形类型扩展任务。

### 5. 调整树输出与 SVG 序列化

修改 `TreeFormatter` 和 `SvgSerializer`：

- `TreeFormatter` 应通过图形的 `describe()` 获取图形描述。
- `SvgSerializer` 应通过图形的 `toSvgElement()` 获取 SVG 元素文本。
- 两者不得再直接读取矩形的 `x`、`y`、`width`、`height`、`fill` 等具体属性。
- 画布根节点、空画布输出、插入顺序、缩进和换行均保持现有行为。
- SVG 的 XML 声明、根元素、属性顺序、特殊字符转义和结尾换行均保持现有行为。

不要为了证明多态而新增暂时无法使用的图形类。

## 四、自动化测试

优先扩展现有测试，避免另建重复测试框架。

至少验证：

1. `Rect` 的 ID、几何属性和可选 `fill`。
2. 非法 ID、非有限坐标、非有限尺寸、零或负宽高仍会被拒绝。
3. `describe()` 的输出与当前矩形 `tree` 条目一致。
4. `toSvgElement()` 的输出符合当前 SVG 元素格式，属性转义行为不退化。
5. `init → create rect → tree → save` 仍然可用。
6. 多个矩形的插入顺序不变，重复 ID 仍被拒绝。
7. 失败的创建操作不会改变现有文档。
8. 负坐标、部分越界和完全位于画布范围之外的矩形，仍按原样保留。

测试应验证可观察行为，而不是只验证类名或实现细节。

## 五、文档与代码范围

### `doc/README.md`

根据真实改动更新现有章节，而不是重复添加一份文档：

- 架构方案：说明 `Shape`、`Rect` 的职责，以及树输出和 SVG 序列化如何使用多态接口。
- 过程记录：记录本次实际遇到的问题、验证方法和修正结果。
- 一致性自查：核对实际模型和模块职责。
- 质量保证：只记录本次实际执行的检查结果。

遵守 `doc/AGENTS.md`。不得编造对话、测试结果或尚未发生的开发过程。

### 根目录 `README.md`

遵守根目录 `AGENTS.md` 的 README Update Gate。

### 明确禁止

本任务不实现：

- `Circle`、`Ellipse`、`Line`、`Text`、`Group`。
- `Document`、统一容器抽象、父子关系或 ID 索引重构。
- `Tokenizer`、带引号参数、注释解析或 REPL 重构。
- `Command`、`UndoableCommand`、`CommandRegistry`。
- `EditorError` 统一错误体系。
- 编辑命令、撤销/重做、文件读取。
- 插件系统、`box` 图形、无关依赖或无关重构。
- 自动 commit、push、创建分支或标签。

这些事项应在后续任务中单独安排。

## 六、验证与结束条件

完成后：

1. 运行 `npm run typecheck`。
2. 运行 `npm test`。
3. 检查所有矩形类引用，确认旧 `RectangleShape` 没有残留引用。
4. 检查 `TreeFormatter` 和 `SvgSerializer` 不再直接读取矩形专属属性。
5. 检查 `git diff` 和 `git status --short`，确认没有混入无关改动。
6. 如果某条命令不存在、测试失败或环境无法执行检查，如实报告，不得声称通过。

本任务不授权提交、push、创建分支或标签。完成后停止，等待我检查。

## 七、最终报告

用中文汇报：

1. 修改前仓库状态及已确认的工作区限制。
2. `Shape` 和 `Rect` 的职责，以及为什么这样划分。
3. 修改、新增、删除的文件及原因。
4. 树输出和 SVG 序列化如何改为多态调用。
5. 实际执行的验证命令及结果。
6. README 更新决策和 `doc/README.md` 更新内容。
7. `git diff`、`git status` 的实际检查结果。
8. 尚未完成的阶段 2 要求。
9. 建议的下一项任务。

不要只输出计划；请实际完成上述范围内的实现与验证。完成后等待用户审查。