export class SentenceBlock {
  constructor(text, startChar, endChar) {
    this.text = text;
    this.start_char = startChar;
    this.end_char = endChar;
  }
}

export class ParagraphBlock {
  constructor(text, startChar, endChar, isHeading, isListItem, headingLevel, sentences) {
    this.text = text;
    this.start_char = startChar;
    this.end_char = endChar;
    this.is_heading = isHeading;
    this.is_list_item = isListItem;
    this.heading_level = headingLevel;
    this.sentences = sentences;
  }
}

export class DocumentBlock {
  constructor(rawText, normalizedText, paragraphs) {
    this.raw_text = rawText;
    this.normalized_text = normalizedText;
    this.paragraphs = paragraphs;
  }
}

export class Preprocessor {
  constructor(language = 'auto') {
    this.language = language;
  }

  normalizeText(text) {
    let normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (typeof normalized.normalize === 'function') {
      normalized = normalized.normalize('NFKC');
    }
    return normalized;
  }

  process(text) {
    const normalizedText = this.normalizeText(text);
    const paragraphs = this._splitParagraphs(normalizedText);
    return new DocumentBlock(text, normalizedText, paragraphs);
  }

  _splitParagraphs(text) {
    const paragraphs = [];
    const lines = text.split('\n');

    let currentPLines = [];
    let charOffset = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineLen = line.length;
      const lineStart = charOffset;
      const lineEnd = charOffset + lineLen;

      // Advance charOffset for next line (+1 for '\n')
      charOffset = lineEnd + 1;

      const stripped = line.trim();
      if (!stripped) {
        if (currentPLines.length > 0) {
          const pBlock = this._createParagraphBlock(currentPLines, text);
          if (pBlock) paragraphs.push(pBlock);
          currentPLines = [];
        }
        continue;
      }

      const headingMatch = stripped.match(/^(#{1,6})\s+(.*)$/);
      const listMatch = stripped.match(/^(?:[-*+・]|\d+\.)\s+(.*)$/);

      if (headingMatch || listMatch) {
        if (currentPLines.length > 0) {
          const pBlock = this._createParagraphBlock(currentPLines, text);
          if (pBlock) paragraphs.push(pBlock);
          currentPLines = [];
        }

        const headingLevel = headingMatch ? headingMatch[1].length : 0;
        const isHeading = !!headingMatch;
        const isListItem = !!listMatch;

        const sentences = this._splitSentences(stripped, lineStart);
        paragraphs.push(
          new ParagraphBlock(
            stripped,
            lineStart,
            lineEnd,
            isHeading,
            isListItem,
            headingLevel,
            sentences
          )
        );
      } else {
        currentPLines.push([line, lineStart, lineEnd]);
      }
    }

    if (currentPLines.length > 0) {
      const pBlock = this._createParagraphBlock(currentPLines, text);
      if (pBlock) paragraphs.push(pBlock);
    }

    return paragraphs;
  }

  _createParagraphBlock(linesInfo, fullText) {
    const pText = linesInfo.map(info => info[0]).join('\n');
    const startChar = linesInfo[0][1];
    const endChar = linesInfo[linesInfo.length - 1][2];
    const sentences = this._splitSentences(pText, startChar);
    return new ParagraphBlock(pText, startChar, endChar, false, false, 0, sentences);
  }

  _splitSentences(text, baseOffset) {
    const sentences = [];
    if (!text) return sentences;

    const pattern = /([^。！？.!?]+[。！？.!?]+['”」』\)]*|[^。！？.!?]+$)/g;
    let match;
    let lastIndex = 0;

    while ((match = pattern.exec(text)) !== null) {
      const sText = match[0].trim();
      if (sText) {
        const sStart = baseOffset + match.index;
        const sEnd = baseOffset + match.index + match[0].length;
        sentences.push(new SentenceBlock(sText, sStart, sEnd));
      }
      if (pattern.lastIndex === lastIndex) break;
      lastIndex = pattern.lastIndex;
    }

    if (sentences.length === 0) {
      sentences.push(new SentenceBlock(text, baseOffset, baseOffset + text.length));
    }

    return sentences;
  }
}
