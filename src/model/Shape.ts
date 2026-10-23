export abstract class Shape {
  private readonly shapeId: string;

  protected constructor(id: string) {
    if (id.length === 0) {
      throw new Error('shape id must not be empty');
    }

    this.shapeId = id;
  }

  public get id(): string {
    return this.shapeId;
  }

  public abstract describe(): string;

  public abstract toSvgElement(): string;

  protected escapeAttribute(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }
}
