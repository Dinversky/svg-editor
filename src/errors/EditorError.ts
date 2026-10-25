export class EditorError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'EditorError';
  }
}
