import type { Command } from './Command.js';

export type CommandFactory<TRequest = unknown> = (request: TRequest) => Command;

export class CommandRegistry<TRequest = unknown> {
  private readonly factories = new Map<string, CommandFactory<TRequest>>();

  public register(name: string, factory: CommandFactory<TRequest>): void {
    this.assertValidName(name);

    if (this.factories.has(name)) {
      throw new Error(`command already registered: ${name}`);
    }

    this.factories.set(name, factory);
  }

  public has(name: string): boolean {
    return this.factories.has(name);
  }

  public create(name: string, request?: TRequest): Command {
    this.assertValidName(name);

    const factory = this.factories.get(name);
    if (factory === undefined) {
      throw new Error(`unknown command: ${name}`);
    }

    return factory(request as TRequest);
  }

  public names(): string[] {
    return [...this.factories.keys()];
  }

  private assertValidName(name: string): void {
    if (name.trim().length === 0) {
      throw new Error('command name must not be empty');
    }
  }
}
