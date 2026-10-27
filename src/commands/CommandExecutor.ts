import type { Command } from './Command.js';
import type { History } from './History.js';

export class CommandExecutor {
  public constructor(private readonly history: History) { }

  /**
   * 统一执行入口（Invoker）：先调用命令的 execute()，只有成功后才记录到历史。
   * 命令失败时异常向上传播，不进入 undo 栈，也不清空 redo 栈。
   */
  public execute(command: Command): void {
    command.execute();
    this.history.record(command);
  }
}
