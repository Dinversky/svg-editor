# SVG Editor

面向 Lab1 逐步开发的 TypeScript 命令行 SVG 编辑器。

## 当前范围

本迭代提供一个最小可用的 SVG 文档编辑器，支持矩形、圆形、椭圆、直线和文本。已实现的命令：

- `init [w] [h]` — 新建画布，默认 `800x600`。
- `read <file.svg>` — 读取 SVG 文件作为当前文档；缺失 ID 会自动补齐并给出警告，重复 ID 会导致整次读取失败。
- `canvas [w] [h]` — 显示画布尺寸，或修改尺寸；省略的维度保持当前值。
- `create rect <id> <x> <y> <w> <h> [fill]` — 添加矩形。
- `create circle <id> <cx> <cy> <r> [fill]` — 添加圆形。
- `create ellipse <id> <cx> <cy> <rx> <ry> [fill]` — 添加椭圆。
- `create line <id> <x1> <y1> <x2> <y2> [stroke]` — 添加直线。
- `create text <id> <x> <y> "content"` — 添加文本。
- `create g <id>` — 添加空分组。
- 所有 `create` 命令支持可选的尾部 `in <groupId>`，把新图形加入已有分组；省略时加入根容器。
- 颜色参数（`fill`/`stroke`）接受 SVG 颜色关键字（如 `red`，大小写不敏感）与 3/6 位十六进制（`#fff`、`#ff0000`）；非法颜色以单行错误提示拒绝。
- `move <id> <dx> <dy>` — 平移图形或分组。
- `scale <id> <factor>` — 缩放图形或分组的几何尺寸。
- `set <id> <attr> <value>` — 修改支持的几何、文本或样式属性。
- `delete <id>` — 删除图形，或删除分组及其全部后代。
- `group <newGid> <id1> <id2>...` — 把已有图形组合为新分组；子节点保持命令中的顺序，新分组插入到第一个被选图形的原位置。
- `ungroup <gid>` — 拆解嵌套分组，并把子节点原地提升到其父容器。根级分组不可拆解。
- `addto <gid> <id>` — 把已有图形移动到目标分组末尾。
- `front <id>` / `back <id>` — 把图形移到同级的最上层/最下层。
- `tree [id]` — 显示完整画布树，或只显示以指定图形/分组 ID 为根的子树。
- `show <id>` — 显示图形或分组的父容器与属性明细。
- `save [file.svg]` — 把画布序列化为 SVG；省略文件名时保存到最近一次成功 `read` 记录的路径。
- `undo` / `redo` — 撤销或重做编辑命令。
- `help` / `exit`。

每条编辑命令（含 `create`）构成一个撤销单元，显示类命令（`tree`、`show`、`help`）不进入历史。`init` 替换文档并清空 undo/redo 历史。成功的 `init`、`read`、`save` 或修改尺寸的 `canvas` 之后，`undo` 与 `redo` 会报 `error: undo/redo not allowed after io command`，直到下一条编辑命令成功执行；编辑历史在 `save` 前后保留。空栈分别报 `error: nothing to undo` 与 `error: nothing to redo`。

`read` 替换当前文档并记录其路径。缺失 ID、不支持的元素、无效元素与 `transform` 会产生文档化的警告；不支持的属性被忽略。文件不可读时报 `error: cannot read file: <path>`，重复 ID 报 `error: id already exists: <id>`。不带参数的 `canvas` 只显示当前尺寸，不锁定历史；修改尺寸会锁定 undo/redo，直到下一条编辑命令。不带文件名的 `save` 写入最近一次成功 `read` 的路径，无该路径时报错。其他图形类型与 `box` 插件尚未实现。

## 环境要求

- Node.js 22 或更高版本（已在 Node.js 22.22.2 验证）
- npm

## 开发

```text
npm install
npm run typecheck
npm test
npm run cli
```

`npm run cli` 先构建再启动交互式编辑器；`npm start` 直接运行上次构建的 CLI。

## 使用

```text
npm run cli
```

在 `svg>` 提示符下输入：

```text
init 800 600
create rect r1 100 120 200 80 blue
create circle c1 100 100 20 red
create ellipse e1 300 150 80 50 green
create line l1 100 250 700 250 black
create text t1 40 300 "Hello SVG"
create g markers
tree
save demo.svg
exit
```

最后一条命令会在当前工作目录写出 `demo.svg`。输入 `help` 查看命令列表，输入 `exit` 退出。

输入规则：

- 参数以空白分隔。
- 含空格的参数用双引号包裹，例如 `save "my drawing.svg"`。
- 首个非空白字符为 `#` 的行是整行注释；命令中的 `#fff` 等值仍作为普通参数，行内注释不受支持。

## 手工验证

1. 运行 `npm run cli`。
2. 依次输入上面的命令。
3. 在 Chrome 或 Edge 中打开生成的 `demo.svg`：应看到位于 `(100, 120)`、尺寸 `200x80` 的蓝色矩形，圆心 `(100, 100)`、半径 `20` 的红色圆形，圆心 `(300, 150)`、半径 `80x50` 的绿色椭圆，从 `(100, 250)` 到 `(700, 250)` 的黑色直线，以及位于 `(40, 300)` 的黑色文本 `Hello SVG`。

源码布局遵循作业架构：

- `src/cli/` — 入口、交互循环、词法切分、把命令解析为类型化请求，以及输出打印。
- `src/app/` — 应用状态、命令处理器与分发、文档/历史/IO 协调，以及 tree/show 格式化。
- `src/model/` — `Shape`、`Rect`、`Circle`、`Ellipse`、`Line`、`Text`、`Group`、`Document`、容器与 ID 管理、`ShapeFactory` 和 `SvgColor`。
- `src/commands/` — `Command` 接口、`CommandRegistry`、`CommandExecutor`、`History`、`CreateCommand`、`GeometryCommand`、`MoveCommand`、`ScaleCommand`、`SetCommand`、`DeleteCommand`、`GroupCommand`、`UngroupCommand`、`AddToCommand`、`FrontCommand` 与 `BackCommand`；应用层使用注册表、执行器与历史。
- `src/io/` — SVG 序列化、XML 解析与文档构建、文件读取与写入。
- `src/errors/` — 共享的 `EditorError` 错误类型。
- `test/` — 8 个自动化测试文件：CLI 端到端、词法、命令注册表、历史与 IO 锁、模型编辑 API、全部命令对象、应用层分发与行为、SVG 读写。
- `doc/README.md` — 架构与开发过程记录。
