import type { Shape } from '../model/Shape.js';
import { GeometryCommand } from './GeometryCommand.js';

export class ScaleCommand extends GeometryCommand {
  public constructor(
    target: Shape,
    private readonly factor: number,
  ) {
    super(target);

    if (!Number.isFinite(factor) || factor <= 0) {
      throw new Error('scale factor must be positive');
    }
  }

  protected validate(): void {
    if (!this.target.canScaleBy(this.factor)) {
      throw new Error('scale would produce invalid geometry');
    }
  }

  protected apply(): void {
    this.target.scaleBy(this.factor);
  }
}
