import type { AttributeValue, Shape } from '../model/Shape.js';
import type { Command } from './Command.js';

export class SetCommand implements Command {
  private previous: AttributeValue | undefined;
  private hasSnapshot = false;

  public constructor(
    private readonly target: Shape,
    private readonly attribute: string,
    private readonly value: AttributeValue,
  ) {
    target.validateAttribute(attribute, value);
  }

  public execute(): void {
    if (!this.hasSnapshot) {
      this.previous = this.target.getAttribute(this.attribute);
      this.hasSnapshot = true;
    }

    this.target.setAttribute(this.attribute, this.value);
  }

  public undo(): void {
    if (!this.hasSnapshot) {
      throw new Error('command has not been executed');
    }

    this.target.restoreAttribute(this.attribute, this.previous);
  }
}
