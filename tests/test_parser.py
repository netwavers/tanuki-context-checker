import unittest
from tanuki_checker.parser import ApproximateASTParser
from tanuki_checker.ast import NodeType, TokenTag


class TestApproximateASTParser(unittest.TestCase):
    def setUp(self):
        self.parser = ApproximateASTParser()

    def test_parse_structure_and_tags(self):
        text = """# 技術概要

私自身、本技術の導入にあたっては慎重に検討を行う必要があると思われる。
しかしながら、一般的には極めて有用であると考えられる。

```markdown
AI生成のプロンプト残留
```
"""
        ast = self.parser.parse(text)
        self.assertGreater(len(ast.nodes), 0)

        # Check node types present
        doc_nodes = ast.get_nodes_by_type(NodeType.DOCUMENT)
        self.assertEqual(len(doc_nodes), 1)

        headings = ast.get_nodes_by_type(NodeType.SECTION_HEADING)
        self.assertEqual(len(headings), 1)

        sentences = ast.get_nodes_by_type(NodeType.SENTENCE)
        self.assertGreaterEqual(len(sentences), 2)

        # Check Token Tags
        tokens = ast.get_nodes_by_type(NodeType.TOKEN)
        tags = [t.tag for t in tokens if t.tag is not None]

        self.assertIn(TokenTag.PRON, tags)       # "私"
        self.assertIn(TokenTag.HEDGE, tags)      # "と思われる" / "と考えられる"
        self.assertIn(TokenTag.MARKDOWN_SYMBOL, tags) # ```markdown

    def test_max_depth_bound(self):
        text = "テスト文章です。"
        ast = self.parser.parse(text)
        self.assertLessEqual(ast.max_depth, 32)


if __name__ == "__main__":
    unittest.main()
