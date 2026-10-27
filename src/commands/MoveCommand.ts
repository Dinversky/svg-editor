import type { Shape } from '../model/Shape.js';
import { GeometryCommand } from './GeometryCommand.js';

export class MoveCommand extends GeometryCommand {
  public constructor(
    target: Shape,
    private readonly dx: number,
    private readonly dy: number,
  ) {
    super(target);

    if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
      throw new Error('move deltas must be finite numbers');
    }
  }

  protected validate(): void {
    if (!this.target.canTranslateBy(this.dx, this.dy)) {
      throw new Error('move would produce invalid geometry');
    }
  }

  protected apply(): void {
    this.target.translateBy(this.dx, this.dy);
  }
}
