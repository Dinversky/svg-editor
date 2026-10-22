import { createInterface, type Interface } from 'node:readline';

export class SvgEditorCli {
  private readonly lineReader: Interface;

  constructor() {
    this.lineReader = createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'svg-editor> ',
    });
  }

  public run(): void {
    console.log('Welcome to SVG Editor CLI.');
    console.log('Type "help" for available commands, or "exit" to quit.');

    this.lineReader.on('line', (line: string) => {
      this.handleLine(line);
    });

    this.lineReader.on('close', () => {
      console.log('Goodbye.');
    });

    this.lineReader.prompt();
  }

  private handleLine(line: string): void {
    const command = line.trim();

    if (command === '') {
      this.lineReader.prompt();
      return;
    }

    if (command === 'help') {
      this.printHelp();
      this.lineReader.prompt();
      return;
    }

    if (command === 'exit') {
      this.lineReader.close();
      return;
    }

    console.log(`Unknown command: ${command}`);
    console.log('Type "help" for available commands.');
    this.lineReader.prompt();
  }

  private printHelp(): void {
    console.log('Available commands:');
    console.log('  help  Show this help message.');
    console.log('  exit  Exit the editor.');
  }
}
