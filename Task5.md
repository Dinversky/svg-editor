# Task 5：实现独立 Tokenizer（Stage 2-C）

你是 `Dinversky/svg-editor` 项目的开发 Agent。请严格按照本任务完成 Stage 2-C，不要重新规划项目阶段，不要扩大实现范围，也不要将后续阶段的功能提前实现。

## 一、任务背景与目标

项目已完成 Stage 2-A 和 Stage 2-B。

当前主要结构包括：

- `Shape`、`Rect`：图形抽象与矩形实现。
- `Document`、`ShapeRegistry`：文档状态与图形 ID 索引。
- `ShapeContainer`、`ChildShapeList`、`RootContainer`：容器抽象、子节点管理与根容器。
- `SvgEditorCli`：当前 CLI 入口、命令解析和命令分派。
- `TreeFormatter`、`SvgSerializer`：tree 输出与 SVG 序列化。

当前 `SvgEditorCli` 仍然使用：

`command.split(/\s+/)`

这种解析方式无法将 `"my file.svg"` 识别为一个参数，也无法正确处理整行注释。

本任务目标是：

1. 新增独立的 `Tokenizer`。
2. 支持普通空白分隔、双引号包裹的参数和整行注释。
3. 将 Tokenizer 接入现有 CLI。
4. 保持现有命令的解析结果、输出和错误行为不受无关影响。
5. 增加独立的 Tokenizer 单元测试及 CLI 集成测试。

本任务只负责词法切分，不负责把命令实现迁移到独立命令类。

## 二、开始前的检查

修改前必须：

1. 检查 `git status --short --branch`、当前分支、HEAD 和最近 5 条提交。
2. 检查 `AGENTS.md`、`doc/AGENTS.md`。
3. 阅读以下文件：
   - `src/cli/SvgEditorCli.ts`
   - `package.json`
   - `test/cli.test.mjs`
   - `doc/README.md`
   - `README.md`
4. 核实当前测试脚本和目录结构，不要假定仓库没有发生变化。
5. 记录工作区中已有的修改。不得覆盖或删除与本任务无关的文件。

如果发现现有未提交修改，应保留它们，只修改本任务必需的部分。

## 三、固定的实现设计

### 1. 新增 Tokenizer

新增：

`src/cli/Tokenizer.ts`

只在该文件中定义 `Tokenizer` 类。

接口固定为：

`tokenize(line: string): string[]`

其职责仅限于将一行原始输入切分成参数数组，不执行命令、不访问文档、不输出日志。

具体规则如下。

#### 规则 A：普通空白分隔

不在双引号内的空格、制表符等空白字符均作为分隔符。

例如：

输入：

`create rect r1 10 20 30 40 blue`

输出：

`["create", "rect", "r1", "10", "20", "30", "40", "blue"]`

连续空白不产生空参数。

#### 规则 B：双引号参数

双引号用于将包含空白的内容视为一个完整参数。

例如：

输入：

`save "my drawing.svg"`

输出：

`["save", "my drawing.svg"]`

引号本身不包含在输出参数中。

再例如：

输入：

`create rect r1 10 20 30 40 "light blue"`

输出中的最后一个参数应为：

`light blue`

固定以下语法约束：

- 仅支持双引号，不支持单引号作为引用符。
- 双引号必须从一个参数的起始位置开始。
- 闭合双引号之后，只允许出现空白或行尾。
- 不支持反斜杠转义、嵌套引号和引号内转义序列。
- `""` 是合法的空字符串参数，不能直接丢弃。
- 不符合上述语法的引号结构应报错，不得静默拼接或丢弃字符。

#### 规则 C：未闭合引号

如果一行输入中的双引号没有闭合，`tokenize()` 必须抛出：

`Error("unclosed double quote")`

CLI 最终输出：

`error: unclosed double quote`

不得让此类输入导致进程异常退出，也不得将不完整参数交给命令执行。

对于其他不符合本任务所定义引号语法的输入，使用：

`Error("invalid quote syntax")`

CLI 对应输出：

`error: invalid quote syntax`

Tokenizer 不负责输出上述错误，只负责抛出异常。

#### 规则 D：整行注释

如果去除行首空白后，第一位字符是 `#`，则整行是注释。

例如：

`# this is a comment`

以及：

`    # this is also a comment`

两者均返回：

`[]`

空行或只包含空白的行也返回：

`[]`

**只有行首的 `#` 才代表整行注释，不能把参数中的 `#` 当作注释起始符。**

例如：

`create rect r1 10 20 30 40 #fff`

必须正常切分，最后一个参数为 `#fff`。

不要实现行内注释，也不要在参数中途遇到 `#` 时截断输入。

#### 规则 E：解析状态

使用清晰、可维护的状态机或等价的简单实现。

至少需要区分：

- 普通参数解析。
- 双引号参数解析。
- 参数结束。
- 空行或注释行。
- 非法或未闭合引号。

不要引入正则表达式堆叠、第三方解析库或通用语法解析框架。

在实现前，先简要说明 Tokenizer 的状态划分和解析规则，再修改代码。

### 2. 接入 SvgEditorCli

修改：

`src/cli/SvgEditorCli.ts`

要求：

- CLI 使用 `Tokenizer` 解析原始输入。
- `SvgEditorCli` 不再使用 `command.split(/\s+/)` 进行命令参数切分。
- 将词法解析与命令执行分离：Tokenizer 生成 token 数组，CLI 根据 token 数组执行现有命令分派。
- 保留当前的 `switch` 命令分派，不在本任务中引入 `Command` 或 `CommandRegistry`。
- 保留现有 `readline` 循环、提示符、banner、命令实现和输出格式。
- 空行与注释行不执行任何命令，不输出错误，正常显示下一次提示符。
- Tokenizer 抛出的异常应进入现有错误处理流程，并以单行 `error: ...` 格式输出。
- 未闭合引号和非法引号语法不能导致 CLI 退出。
- 现有 `init`、`create rect`、`tree`、`save`、`help`、`exit` 命令必须继续工作。

注意：CLI 可能通过管道接收输入，因此不能只测试交互式终端输入。

不要为了接入 Tokenizer 而重写 `SvgEditorCli` 的整体结构。

## 四、自动化测试

继续使用项目已有的 Node.js `node:test`，不引入 Vitest、Jest 或其他测试框架。

### 1. 新增独立测试文件

新增：

`test/tokenizer.test.mjs`

该文件只测试 Tokenizer 的词法解析行为，不依赖 CLI 子进程。

使用项目现有的 TypeScript 构建产物测试方式加载 Tokenizer。先确认构建输出路径与当前项目一致。

至少覆盖以下场景：

| 测试场景 | 预期结果 |
|---|---|
| 普通空格分隔 | 正确生成 token 数组 |
| 连续空白 | 不生成空 token |
| 前后空白 | 不影响解析结果 |
| 双引号包裹带空格参数 | 输出一个参数，且不包含引号 |
| 双引号包裹的空字符串 | 保留空字符串 token |
| 未闭合双引号 | 抛出 `unclosed double quote` |
| 引号后紧接非空白字符 | 抛出 `invalid quote syntax` |
| 空行或纯空白行 | 返回空数组 |
| 行首注释 | 返回空数组 |
| 前置空白后出现 `#` | 返回空数组 |
| 普通参数中的 `#fff` | 保留为正常参数 |
| 行内出现 `#` | 不截断输入 |

每个测试必须验证具体结果或异常，不要只检查返回值存在。

### 2. 扩展 CLI 集成测试

在现有 CLI 测试中补充集成测试，确认 Tokenizer 已被真实使用，而不是只新增了一个未接入的类。

至少覆盖：

1. 在一段管道输入中包含空行和整行注释，CLI 继续执行后续命令。
2. `create rect` 的 `fill` 为 `#fff` 时，不被误判为注释。
3. 使用 `save "包含空格的文件名.svg"` 时，文件能够被写入正确路径。
4. 未闭合引号时，CLI 输出 `error: unclosed double quote`，随后仍能执行合法命令。
5. 非法引号结构输出 `error: invalid quote syntax`，随后仍能执行合法命令。
6. 不带引号的现有命令仍按原有规则解析。

测试临时文件应使用项目现有的临时目录清理方式，不能在仓库根目录遗留测试文件。

### 3. 保持现有回归测试

现有 CLI 和模型测试必须继续通过。

不要修改原有测试的预期输出来迁就新的实现。

如果发现某项旧测试与本任务要求确实冲突，应先说明冲突及原因，不能直接删除测试。

### 4. 更新 npm test 脚本

当前测试脚本明确指定 `test/cli.test.mjs`。

由于本任务新增 `test/tokenizer.test.mjs`，必须确保 `npm test` 会执行两个测试文件。

将 `package.json` 中的 `test` 脚本调整为明确运行两个测试文件的形式，例如：

`node --test test/cli.test.mjs test/tokenizer.test.mjs`

保留现有构建步骤，不改变其他 npm 脚本。

不要依赖只在某一种操作系统 shell 中有效的通配符展开。

## 五、文档更新

### 1. 更新 `doc/README.md`

遵守 `doc/AGENTS.md`。

更新现有章节，不要追加一份重复的架构文档。

至少更新：

- `src/cli/` 的模块职责：说明命令行词法解析由独立 `Tokenizer` 负责。
- 当前实现的类清单：新增 `Tokenizer`，准确说明其职责。
- 依赖方向或类关系图：如果实际依赖结构发生变化，更新对应图示。
- 过程记录：记录本次实现的设计、遇到的问题和实际修正。
- 一致性自查：确认 CLI 不再直接使用 `split(/\s+/)` 作为命令解析器。
- 质量保证：记录实际执行的测试与类型检查结果。

不得把尚未执行的测试或检查写成通过。

不要改写 Stage 2-A、Stage 2-B 的历史记录来掩盖原先的实现状态。

### 2. 检查根目录 `README.md`

遵守根目录 `AGENTS.md` 的 README Update Gate。

本任务扩展了命令输入语法，因此检查现有用户说明是否需要增加简短的输入规则说明。

如果更新，只修改相关段落，可简要说明：

- 参数默认按空白分隔。
- 带空格的参数可以使用双引号。
- 行首 `#` 表示整行注释。

不需要在根 README 中写入完整词法规则、状态机细节或内部实现。

如果现有说明没有因此变得不准确，可以不修改，并在最终报告中说明原因。

## 六、明确禁止的工作

本任务不实现：

- `Command`、`CommandRegistry`、`UndoableCommand`、`History`。
- `EditorError` 或新的统一错误架构。
- `undo`、`redo` 及任何编辑命令。
- `Circle`、`Ellipse`、`Line`、`Text`、`Group`。
- 图形嵌套、`create ... in`、`group`、`ungroup`。
- SVG 文件读取、XML 解析器或新 IO 功能。
- ESLint、dependency-cruiser、CI。
- 新的第三方依赖或测试框架。
- 与 Tokenizer 无关的模型层重构。

特别注意：Stage 2-B 中 `Shape.attachTo()` 和 `Shape.detachFrom()` 的可见性及父节点不变量问题属于独立的模型层审查事项。不要在本任务中顺带修改它们；如发现相关问题，只在最终报告中列为后续待办。

如果实现中发现上述功能是完成 Tokenizer 的必要前提，不要自行扩大范围，先说明具体阻碍。

## 七、验证与完成条件

完成后按顺序执行：

1. `npm run typecheck`
2. `npm test`
3. 检查 Tokenizer 是否为独立模块。
4. 搜索 `src/cli/`，确认命令解析不再直接使用 `command.split(/\s+/)`。
5. 检查空白、双引号、注释和 `#fff` 的处理逻辑。
6. 检查 Tokenizer 的异常是否被 CLI 正确捕获，且错误后 CLI 仍可继续运行。
7. 检查现有命令的语法和用户可见输出是否发生无关变化。
8. 检查 `git diff --check`、`git diff` 和 `git status --short`。
9. 更新 `doc/README.md`，核实记录的验证结果真实准确。
10. 如果没有实际运行某项检查，必须在最终报告中明确说明。

Stage 2-C 的完成标准是：

- `Tokenizer` 独立存在并由 CLI 实际使用。
- 空白分隔、双引号参数、整行注释和引号错误均符合本任务规定。
- `#fff` 等普通参数不会被误判为注释。
- 新增独立单元测试与 CLI 集成测试。
- `npm test` 会执行新旧两组测试。
- 现有 CLI 命令行为保持稳定。
- 类型检查、自动化测试与文档更新结果均有真实记录。

若有检查失败，先报告失败及原因，不得将任务标记为完全通过。

## 八、Git 操作限制

本任务不授权：

- 创建 Git commit。
- push 到远程仓库。
- 创建、移动或删除 tag。
- 创建或切换分支。

完成后保留工作区状态，等待用户审查。

## 九、最终报告

完成后用中文汇报：

1. 修改前的分支、HEAD、工作区状态。
2. Tokenizer 的实现方式与固定解析规则。
3. 修改、新增的文件及各自原因。
4. 新增的单元测试和集成测试场景。
5. 实际执行的 `npm run typecheck`、`npm test` 结果。
6. `README.md` 是否更新及原因。
7. `doc/README.md` 的更新内容。
8. `git diff` 和 `git status` 的检查结果。
9. 未解决的问题及后续建议。

不要只输出计划；请实际完成本任务范围内的实现和验证。完成后停止，等待用户审查。