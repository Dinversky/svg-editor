import { EditorError } from '../errors/EditorError.js';
import type {
  ApplicationCommandHandler,
  ApplicationCommandInput,
  ApplicationRequestHandler,
} from './ApplicationCommandHandler.js';
import type { ApplicationRequest } from './ApplicationRequest.js';

export class ApplicationCommandDispatcher {
  private readonly handlers = new Map<string, ApplicationCommandHandler>();

  public register<TRequest extends ApplicationRequest>(
    name: string,
    handler: ApplicationRequestHandler<TRequest>,
  ): void {
    this.assertValidName(name);

    if (this.handlers.has(name)) {
      throw new EditorError(`command already registered: ${name}`);
    }

    this.handlers.set(
      name,
      (input) => handler(() => input.parse() as TRequest),
    );
  }

  public has(name: string): boolean {
    return this.handlers.has(name);
  }

  public names(): string[] {
    return [...this.handlers.keys()];
  }

  public dispatch(input: ApplicationCommandInput): readonly string[] {
    const handler = this.handlers.get(input.name);
    if (handler === undefined) {
      throw new EditorError(`unknown command: ${input.name}`);
    }

    return handler(input);
  }

  private assertValidName(name: string): void {
    if (name.trim().length === 0) {
      throw new EditorError('command name must not be empty');
    }
  }
}
