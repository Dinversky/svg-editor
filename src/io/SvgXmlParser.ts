import { XMLParser, XMLValidator } from 'fast-xml-parser';

export interface SvgXmlElement {
  readonly name: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly children: readonly SvgXmlElement[];
  readonly text: string;
}

/** 把 SVG XML 转换为保留子元素顺序的轻量树；不构建模型，也不输出日志。 */
export class SvgXmlParser {
  private readonly parser = new XMLParser({
    preserveOrder: true,
    ignoreAttributes: false,
    attributeNamePrefix: '',
    removeNSPrefix: true,
    ignoreDeclaration: true,
    ignorePiTags: true,
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: true,
    allowBooleanAttributes: true,
  });

  public parse(xml: string): SvgXmlElement {
    const source = xml.replace(/^\uFEFF/, '');

    if (source.trim().length === 0) {
      throw new Error('empty XML document');
    }

    if (XMLValidator.validate(source) !== true) {
      throw new Error('invalid XML');
    }

    const parsed: unknown = this.parser.parse(source);
    if (!Array.isArray(parsed)) {
      throw new Error('invalid XML');
    }

    const roots = parsed.filter((node) => this.tagNameOf(node) !== null);
    if (roots.length !== 1) {
      throw new Error('XML document must contain exactly one root element');
    }

    const root = this.buildElement(roots[0]);
    if (root.name !== 'svg') {
      throw new Error('root element must be svg');
    }

    return root;
  }

  private buildElement(node: unknown): SvgXmlElement {
    const name = this.tagNameOf(node);
    if (name === null) {
      throw new Error('invalid XML element');
    }

    const record = node as Record<string, unknown>;
    const attributes = this.readAttributes(record[':@']);
    const children: SvgXmlElement[] = [];
    let text = '';
    const rawChildren = record[name];

    if (Array.isArray(rawChildren)) {
      for (const child of rawChildren) {
        if (this.tagNameOf(child) !== null) {
          children.push(this.buildElement(child));
          continue;
        }

        if (this.isRecord(child) && typeof child['#text'] === 'string') {
          text += child['#text'];
        }
      }
    }

    return {
      name,
      attributes,
      children,
      text: text.trim(),
    };
  }

  private readAttributes(value: unknown): Readonly<Record<string, string>> {
    const attributes: Record<string, string> = {};

    if (this.isRecord(value)) {
      for (const [name, attribute] of Object.entries(value)) {
        attributes[name] = String(attribute);
      }
    }

    return attributes;
  }

  private tagNameOf(node: unknown): string | null {
    if (!this.isRecord(node)) {
      return null;
    }

    const names = Object.keys(node).filter(
      (key) => key !== ':@' && !key.startsWith('#'),
    );

    return names.length === 1 ? names[0] : null;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
