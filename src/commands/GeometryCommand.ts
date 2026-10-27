import type { Shape } from '../model/Shape.js';
import type { Command } from './Command.js';

interface GeometryEntry {
  readonly shape: Shape;
  readonly values: readonly number[];
}

export abstract class GeometryCommand implements Command {
  private snapshot: GeometryEntry[] | null = null;

  protected constructor(protected readonly target: Shape) { }

  public execute(): void {
    this.validate();

    if (this.snapshot === null) {
      this.snapshot = this.capture(this.target);
    }

    this.apply();
  }

  public undo(): void {
    if (this.snapshot === null) {
      throw new Error('command has not been executed');
    }

    for (const entry of this.snapshot) {
      entry.shape.restoreGeometry(entry.values);
    }
  }

  protected abstract validate(): void;

  protected abstract apply(): void;

  private capture(shape: Shape): GeometryEntry[] {
    const entries: GeometryEntry[] = [
      { shape, values: shape.captureGeometry() },
    ];
    const container = shape.asContainer();

    if (container !== null) {
      for (const child of container.children) {
        entries.push(...this.capture(child));
      }
    }

    return entries;
  }
}
