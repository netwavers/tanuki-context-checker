import re
import unicodedata
from typing import List, Tuple
from dataclasses import dataclass


@dataclass
class SentenceBlock:
    text: str
    start_char: int
    end_char: int


@dataclass
class ParagraphBlock:
    text: str
    start_char: int
    end_char: int
    is_heading: bool
    is_list_item: bool
    heading_level: int
    sentences: List[SentenceBlock]


@dataclass
class DocumentBlock:
    raw_text: str
    normalized_text: str
    paragraphs: List[ParagraphBlock]


class Preprocessor:
    def __init__(self, language: str = "auto"):
        self.language = language

    def normalize_text(self, text: str) -> str:
        """Apply NFKC normalization and standardize newline characters."""
        text = text.replace("\r\n", "\n").replace("\r", "\n")
        normalized = unicodedata.normalize("NFKC", text)
        return normalized

    def process(self, text: str) -> DocumentBlock:
        normalized_text = self.normalize_text(text)
        paragraphs = self._split_paragraphs(normalized_text)
        return DocumentBlock(
            raw_text=text,
            normalized_text=normalized_text,
            paragraphs=paragraphs,
        )

    def _split_paragraphs(self, text: str) -> List[ParagraphBlock]:
        paragraphs: List[ParagraphBlock] = []
        lines = text.split("\n")
        
        current_p_lines: List[Tuple[str, int, int]] = []
        current_start = 0

        char_offset = 0

        for line in lines:
            line_len = len(line)
            line_start = char_offset
            line_end = char_offset + line_len

            # Advance character offset for next line (including '\n')
            char_offset = line_end + 1

            stripped = line.strip()
            if not stripped:
                if current_p_lines:
                    p_block = self._create_paragraph_block(current_p_lines, text)
                    if p_block:
                        paragraphs.append(p_block)
                    current_p_lines = []
                continue

            # Heading check (# ..., ## ...)
            heading_match = re.match(r"^(#{1,6})\s+(.*)$", stripped)
            # List item check (- ..., * ..., 1. ..., ・ ...)
            list_match = re.match(r"^(?:[-*+・]|\d+\.)\s+(.*)$", stripped)

            if heading_match or list_match:
                # Close any preceding paragraph block
                if current_p_lines:
                    p_block = self._create_paragraph_block(current_p_lines, text)
                    if p_block:
                        paragraphs.append(p_block)
                    current_p_lines = []

                # Headings or List items form standalone paragraph blocks
                heading_level = len(heading_match.group(1)) if heading_match else 0
                is_heading = heading_match is not None
                is_list_item = list_match is not None

                sentences = self._split_sentences(stripped, line_start)
                paragraphs.append(
                    ParagraphBlock(
                        text=stripped,
                        start_char=line_start,
                        end_char=line_end,
                        is_heading=is_heading,
                        is_list_item=is_list_item,
                        heading_level=heading_level,
                        sentences=sentences,
                    )
                )
            else:
                current_p_lines.append((line, line_start, line_end))

        if current_p_lines:
            p_block = self._create_paragraph_block(current_p_lines, text)
            if p_block:
                paragraphs.append(p_block)

        return paragraphs

    def _create_paragraph_block(
        self, lines_info: List[Tuple[str, int, int]], full_text: str
    ) -> ParagraphBlock:
        p_text = "\n".join(info[0] for info in lines_info)
        start_char = lines_info[0][1]
        end_char = lines_info[-1][2]
        sentences = self._split_sentences(p_text, start_char)
        return ParagraphBlock(
            text=p_text,
            start_char=start_char,
            end_char=end_char,
            is_heading=False,
            is_list_item=False,
            heading_level=0,
            sentences=sentences,
        )

    def _split_sentences(self, text: str, base_offset: int) -> List[SentenceBlock]:
        """Split text into sentences for Japanese and English, preserving offsets."""
        sentences: List[SentenceBlock] = []
        if not text:
            return sentences

        # Japanese pattern: terminates at 。！？
        # English pattern: terminates at . ! ? followed by space/end of string
        pattern = r"([^。！？.!?]+[。！？.!?]+['”」』\)]*|[^。！？.!?]+$)"
        
        matches = list(re.finditer(pattern, text, re.MULTILINE))
        if not matches:
            sentences.append(
                SentenceBlock(
                    text=text,
                    start_char=base_offset,
                    end_char=base_offset + len(text),
                )
            )
            return sentences

        for m in matches:
            s_text = m.group(0).strip()
            if s_text:
                s_start = base_offset + m.start()
                s_end = base_offset + m.end()
                sentences.append(
                    SentenceBlock(
                        text=s_text,
                        start_char=s_start,
                        end_char=s_end,
                    )
                )

        return sentences
