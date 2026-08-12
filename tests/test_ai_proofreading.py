import unittest
from tanuki_checker.pipeline import TanukiContextChecker

class TestAIProofreadingPayload(unittest.TestCase):
    def setUp(self):
        self.checker = TanukiContextChecker()

    def test_proofread_payload_structure(self):
        ai_sample_text = (
            "```markdown\n"
            "AI技術の活用は現代社会において極めて重要ですわ。\n"
            "結論として、多くの企業が導入を進めていますの。\n"
            "具体的には、効率化やコスト削減が期待できると考えられますわ。\n"
            "お気軽にお知らせください。\n"
            "```"
        )
        payload = self.checker.generate_proofread_payload(ai_sample_text, domain="general")

        self.assertIsNotNone(payload)
        self.assertEqual(payload.domain_applied, "general")
        self.assertIn("surface", payload.diagnostics)
        self.assertIn("lexical", payload.diagnostics)
        self.assertIn("structural", payload.diagnostics)
        self.assertIn("flow", payload.diagnostics)

        # Check directives
        self.assertTrue(len(payload.proofreading_directives) > 0)
        has_surface_directive = any(d.layer == "surface" for d in payload.proofreading_directives)
        self.assertTrue(has_surface_directive)

        # Check LLM Prompt template
        self.assertIn("AI校正指示", payload.llm_prompt_template.user_prompt)
        self.assertIn("AI臭さ", payload.llm_prompt_template.system_prompt)

    def test_human_sample_directives(self):
        human_text = (
            "昨日は久しぶりに海辺のカフェに立ち寄ってみたの。店内に入ると、香ばしいコーヒーの香りが広がっていてとても落ち着く空間だったわ。\n"
            "ただし、思ったよりも混雑していて希望のテラス席には座れなかったのよね。実際には平日でも結構ファンが多いみたい。\n"
            "今度は開直後の空いている時間を狙ってまた行ってみようと思うわ。"
        )
        payload = self.checker.generate_proofread_payload(human_text, domain="blog")
        self.assertIsNotNone(payload)
        self.assertLess(payload.overall_score, 50.0)

if __name__ == "__main__":
    unittest.main()
