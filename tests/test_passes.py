import unittest
from tanuki_checker.parser import ApproximateASTParser
from tanuki_checker.symbol import SymbolTable
from tanuki_checker.passes.surface import SurfacePass
from tanuki_checker.passes.lexical import LexicalPass
from tanuki_checker.passes.structural import StructuralPass
from tanuki_checker.passes.base import PassExecutionError


class TestAnalysisPasses(unittest.TestCase):
    def setUp(self):
        self.parser = ApproximateASTParser()
        self.sym_table = SymbolTable()

    def test_surface_pass(self):
        text = """# サンプルタイトル

本稿では、AI生成文章の検出手法について**徹底解説**いたします。

```markdown
残留プロンプト記号
```
"""
        ast = self.parser.parse(text)
        pass_inst = SurfacePass()
        metrics = pass_inst.execute(ast, self.sym_table)

        self.assertIn("markdown_anomaly_score", metrics)
        self.assertIn("punctuation_uniformity", metrics)
        self.assertIn("em_dash_density", metrics)

    def test_lexical_pass(self):
        text = "本記事では、多角的な視点から背景について徹底解説いたします。一般的には非常に有用であると考えられる。"
        ast = self.parser.parse(text)
        pass_inst = LexicalPass()
        metrics = pass_inst.execute(ast, self.sym_table)

        self.assertIn("ai_phrase_density", metrics)
        self.assertIn("ngram_entropy", metrics)
        self.assertIn("hedge_expression_ratio", metrics)
        self.assertGreater(metrics["ai_phrase_density"], 0.0)

    def test_structural_pass(self):
        text = """# セクション1

これは第1パラグラフの文章です。長さが適切に調整されています。

## セクション2

- リスト項目1
- リスト項目2
- リスト項目3
"""
        ast = self.parser.parse(text)
        pass_inst = StructuralPass()
        metrics = pass_inst.execute(ast, self.sym_table)

        self.assertIn("depth_variance", metrics)
        self.assertIn("sentence_length_cv", metrics)
        self.assertIn("paragraph_length_cv", metrics)
        self.assertIn("heading_density", metrics)
        self.assertIn("list_density", metrics)


if __name__ == "__main__":
    unittest.main()
