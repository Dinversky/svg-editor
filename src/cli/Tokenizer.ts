export class Tokenizer {
  public tokenize(line: string): string[] {
    let index = 0;

    // 行首空白不参与解析；空行和整行注释直接返回空 token 数组。
    while (index < line.length && this.isWhitespace(line[index])) {
      index += 1;
    }

    if (index === line.length || line[index] === '#') {
      return [];
    }

    const tokens: string[] = [];
    let currentToken = '';
    let hasToken = false;
    let inQuotes = false;
    let afterQuote = false;

    while (index < line.length) {
      const character = line[index];

      if (afterQuote) {
        if (!this.isWhitespace(character)) {
          throw new Error('invalid quote syntax');
        }

        tokens.push(currentToken);
        currentToken = '';
        hasToken = false;
        afterQuote = false;
        index += 1;
        continue;
      }

      if (inQuotes) {
        if (character === '"') {
          inQuotes = false;
          afterQuote = true;
        } else {
          currentToken += character;
        }

        index += 1;
        continue;
      }

      if (character === '"') {
        if (hasToken) {
          throw new Error('invalid quote syntax');
        }

        inQuotes = true;
        hasToken = true;
        index += 1;
        continue;
      }

      if (this.isWhitespace(character)) {
        if (hasToken) {
          tokens.push(currentToken);
          currentToken = '';
          hasToken = false;
        }

        index += 1;
        continue;
      }

      currentToken += character;
      hasToken = true;
      index += 1;
    }

    if (inQuotes) {
      throw new Error('unclosed double quote');
    }

    if (afterQuote) {
      tokens.push(currentToken);
    } else if (hasToken) {
      tokens.push(currentToken);
    }

    return tokens;
  }

  private isWhitespace(character: string): boolean {
    return character.trim() === '';
  }
}
