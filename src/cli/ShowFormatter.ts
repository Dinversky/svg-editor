import type { Shape } from '../model/Shape.js';

const STYLE_SUFFIX = /(?: (?:fill|stroke)=[^\s]+)+$/;

export class ShowFormatter {
  public format(shape: Shape): string {
    const description = shape.describe();
    const firstSpace = description.indexOf(' ');
    const label = firstSpace === -1 ? description : description.slice(0, firstSpace);
    const detail = firstSpace === -1 ? '' : description.slice(firstSpace + 1);
    const styleMatch = detail.match(STYLE_SUFFIX);
    const geometry = (styleMatch === null ? detail : detail.slice(0, styleMatch.index)).trimEnd();
    const styles = styleMatch === null ? '' : styleMatch[0].trim();
    const parent = shape.parent === null ? 'none' : shape.parent.describe();
    const lines: string[] = [`${label}  parent=${parent}`];

    if (geometry.length > 0) {
      lines.push(`  ${geometry}`);
    }

    if (styles.length > 0) {
      lines.push(`  ${styles}`);
    }

    return lines.join('\n');
  }
}
