import type { Command } from './Command.js';

export class History {
  private readonly undoStack: Command[] = [];
  private readonly redoStack: Command[] = [];

  public get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public peekUndo(): Command | null {
    return this.undoStack[this.undoStack.length - 1] ?? null;
  }

  public peekRedo(): Command | null {
    return this.redoStack[this.redoStack.length - 1] ?? null;
  }

  public clear(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }

  /** @internal 仅供 CommandExecutor 在 execute 成功后调用。 */
  public record(command: Command): void {
    this.undoStack.push(command);
    this.redoStack.length = 0;
  }

  /**
   * 撤销栈顶命令。仅当命令 undo 成功后才把同一个命令对象移入 redo 栈；
   * 空栈返回 false，命令抛错时异常向上传播且两个栈保持不变。
   */
  public undo(): boolean {
    const command = this.undoStack[this.undoStack.length - 1];

    if (command === undefined) {
      return false;
    }

    command.undo();
    this.undoStack.pop();
    this.redoStack.push(command);
    return true;
  }

  /**
   * 重做栈顶命令，复用历史中的同一个命令对象并再次调用 execute()。
   * 仅当 execute 成功后才移回 undo 栈；空栈返回 false，失败时栈保持不变。
   */
  public redo(): boolean {
    const command = this.redoStack[this.redoStack.length - 1];

    if (command === undefined) {
      return false;
    }

    command.execute();
    this.redoStack.pop();
    this.undoStack.push(command);
    return true;
  }
}
