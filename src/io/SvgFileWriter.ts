import { writeFileSync } from 'node:fs';

export class SvgFileWriter {
  public write(filePath: string, content: string): void {
    writeFileSync(filePath, content, 'utf8');
  }
}
