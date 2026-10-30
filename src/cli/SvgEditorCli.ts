import { createInterface, type Interface } from 'node:readline';
import { SvgEditorApplication } from '../app/SvgEditorApplication.js';
import { CommandParser } from './CommandParser.js';
import { Tokenizer } from './Tokenizer.js';

export class SvgEditorCli {
  private readonly lineReader: Interface;
  private readonly interactive: boolean;
  private readonly tokenizer = new Tokenizer();
  private readonly commandParser = new CommandParser();
  private readonly application = new SvgEditorApplication();
  private closing = false;

  constructor() {
    this.interactive = process.stdin.isTTY === true;
    this.lineReader = createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'svg> ',
    });
  }

  public run(): void {
    console.log("svg-editor 0.1 — type 'help' for commands");

    this.lineReader.on('line', (line: string) => {
      this.handleLine(line);
    });

    this.lineReader.on('close', () => {
      console.log('Goodbye.');
    });

    this.prompt();
  }

  private handleLine(line: string): void {
    try {
      const tokens = this.tokenizer.tokenize(line);

      if (tokens.length === 0) {
        this.prompt();
        return;
      }

      this.execute(tokens);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`error: ${message}`);
    }

    if (!this.closing) {
      this.prompt();
    }
  }

  private prompt(): void {
    if (this.interactive) {
      this.lineReader.prompt();
    }
  }

  private execute(tokens: string[]): void {
    const name = tokens[0];
    const args = tokens.slice(1);

    if (name === 'help') {
      this.printHelp();
      return;
    }

    if (name === 'exit') {
      this.closing = true;
      this.lineReader.close();
      return;
    }

    const output = this.application.execute({
      name,
      parse: () => this.commandParser.parseCommand(name, args),
    });

    for (const line of output) {
      console.log(line);
    }
  }

  private printHelp(): void {
    console.log('Available commands:');
    console.log('  init [w] [h]                                  Create a new canvas.');
    console.log('  read <file.svg>                               Read an SVG file into the canvas.');
    console.log('  canvas [w] [h]                                Show or resize the canvas.');
    console.log('  create rect <id> <x> <y> <w> <h> [fill]       Create a rectangle.');
    console.log('  create circle <id> <cx> <cy> <r> [fill]       Create a circle.');
    console.log('  create ellipse <id> <cx> <cy> <rx> <ry> [fill] Create an ellipse.');
    console.log('  create line <id> <x1> <y1> <x2> <y2> [stroke] Create a line.');
    console.log('  create text <id> <x> <y> "content"             Create a text element.');
    console.log('  create g <id>                                  Create an empty group.');
    console.log('  create <type> ... [in <group>]                 Add a shape to the root or an existing group.');
    console.log('  move <id> <dx> <dy>                            Move a shape or group.');
    console.log('  scale <id> <factor>                            Scale a shape or group.');
    console.log('  set <id> <attr> <value>                        Set an attribute.');
    console.log('  delete <id>                                    Delete a shape or group.');
    console.log('  group <newGid> <id1> <id2>...                  Group existing shapes.');
    console.log('  ungroup <gid>                                  Dissolve a nested group.');
    console.log('  addto <gid> <id>                               Move a shape into a group.');
    console.log('  front <id>                                     Move a shape to the front.');
    console.log('  back <id>                                      Move a shape to the back.');
    console.log('  undo                                           Undo the last edit command.');
    console.log('  redo                                           Redo the last undone command.');
    console.log('  tree [id]                                     Show the document tree or a node subtree.');
    console.log('  show <id>                                     Show a shape or group in detail.');
    console.log('  save [file.svg]                               Save the current document.');
    console.log('  help                                          Show this help message.');
    console.log('  exit                                          Exit the editor.');
  }
}
