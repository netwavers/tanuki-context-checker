import unittest
from tanuki_checker.ast import DocumentAST
from tanuki_checker.symbol import SymbolTable, EntityScope
from tanuki_checker.parser import ApproximateASTParser
from tanuki_checker.passes.symbol import SymbolPass
from tanuki_checker.passes.flow import FlowPass


class TestSymbolAndFlowPasses(unittest.TestCase):
    def setUp(self):
        self.parser = ApproximateASTParser()
        self.symbol_pass = SymbolPass()
        self.flow_pass = FlowPass()

    def test_symbol_pass_tracking_and_implicit_refs(self):
        text = """
昨日の夜、ふと思い立って昔買った古い真空管アンプの電源を入れてみた。
私自身、デジタルオーディオの利便性には勝てないと思う。
だけど、こういう無駄な時間こそが大切だ。
"""
        ast = self.parser.parse(text)
        sym_table = SymbolTable()
        metrics = self.symbol_pass.execute(ast, sym_table)

        self.assertGreater(metrics["total_symbols"], 0)
        self.assertGreater(metrics["first_person_count"], 0)
        self.assertIn("私", sym_table.symbols)
        self.assertEqual(sym_table.symbols["私"].entity_type, "FIRST_PERSON")

    def test_flow_pass_metrics_detection(self):
        text = """
昨日の夜、ふと思い立って昔買った古い真空管アンプの電源を入れてみた。
最初はハムノイズしか聞こえなくて落胆したのだが、昔聴き込んだビル・エヴァンスのピアノが響き始めた。
いや、正確にはエヴァンスではなくマイルス・デイヴィスの『Kind of Blue』だったかもしれない。

デジタルオーディオの利便性には勝てないが、私にとっては音楽を聴く体験そのものなのだと思う。
最近の仕事でも同じことを感じる。すべてを効率化し、AIで最適化されたコードを書くのは確かに気持ちいい。
だが、ふとしたバグ調査の途中で脱線してオープンソースのソースコードを読みふけってしまう、あの寄り道にこそエンジニアとしての面白さが詰まっている。
"""
        ast = self.parser.parse(text)
        sym_table = SymbolTable()
        self.symbol_pass.execute(ast, sym_table)

        flow_metrics = self.flow_pass.analyze(ast, sym_table)

        self.assertGreaterEqual(flow_metrics.self_correction_count, 1)  # "いや、正確には"
        self.assertGreater(flow_metrics.topic_jump_density, 0.0)         # "脱線" / "寄り道"
        self.assertGreater(flow_metrics.first_person_experience_density, 0.0)
        self.assertGreater(flow_metrics.emphasis_imbalance_entropy, 0.0)

    def test_homogeneous_ai_text_low_flow_signals(self):
        text = """
## Pythonにおける非同期処理（asyncio）の基本概念と活用法

近年、Webアプリケーションの高性能化に伴い、非同期処理の重要性が高まっています。
Pythonでは asyncio ライブラリを使用することで、効率的なI/O多重化を実現することが可能です。

### 非同期処理の主なメリット
1. レスポンスタイムの向上: I/O待ち時間中に他のタスクを実行できます。
2. リソース消費の削減: スレッドを大量に生成する必要がありません。
"""
        ast = self.parser.parse(text)
        sym_table = SymbolTable()
        self.symbol_pass.execute(ast, sym_table)

        flow_metrics = self.flow_pass.analyze(ast, sym_table)

        self.assertEqual(flow_metrics.self_correction_count, 0)
        self.assertEqual(flow_metrics.first_person_experience_density, 0.0)


if __name__ == "__main__":
    unittest.main()
