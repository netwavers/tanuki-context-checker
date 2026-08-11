import unittest
from tanuki_checker.preprocessor import Preprocessor


class TestPreprocessor(unittest.TestCase):
    def setUp(self):
        self.preprocessor = Preprocessor()

    def test_unicode_normalization(self):
        text = "ﾃｽﾄ文章１２３\r\n２行目"
        normalized = self.preprocessor.normalize_text(text)
        self.assertIn("テスト文章123", normalized)
        self.assertNotIn("\r", normalized)

    def test_paragraph_and_heading_splitting(self):
        sample = "# タイトル見出し\n\n最初の段落です。文章が続きます。\n\n## 節見出し\n\n- リスト項目1\n- リスト項目2"
        doc_block = self.preprocessor.process(sample)

        self.assertGreaterEqual(len(doc_block.paragraphs), 4)

        # First paragraph should be heading level 1
        p0 = doc_block.paragraphs[0]
        self.assertTrue(p0.is_heading)
        self.assertEqual(p0.heading_level, 1)

        # List items
        list_paras = [p for p in doc_block.paragraphs if p.is_list_item]
        self.assertEqual(len(list_paras), 2)

    def test_japanese_sentence_splitting(self):
        text = "こんにちは。本日の天気は晴れです！明日の予報はどうでしょうか？"
        p_block = self.preprocessor._split_sentences(text, 0)
        self.assertEqual(len(p_block), 3)
        self.assertEqual(p_block[0].text, "こんにちは。")
        self.assertEqual(p_block[1].text, "本日の天気は晴れです！")
        self.assertEqual(p_block[2].text, "明日の予報はどうでしょうか？")


if __name__ == "__main__":
    unittest.main()
