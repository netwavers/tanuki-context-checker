import json
import unittest
from tanuki_checker.pipeline import TanukiContextChecker, DEFAULT_DOMAIN_BASELINES
from tanuki_checker.metrics import ConfidenceFlag, FinalAssessmentReport


class TestScoreIntegrationStage3(unittest.TestCase):
    def setUp(self):
        with open("tests/corpus/evaluation_corpus.json", "r", encoding="utf-8") as f:
            self.corpus_data = json.load(f)
        self.checker = TanukiContextChecker()

    def test_corpus_samples_against_expected_bands(self):
        samples = self.corpus_data.get("samples", [])
        self.assertGreater(len(samples), 0)

        for sample in samples:
            doc_id = sample["sample_id"]
            text = sample["text"]
            domain = str(sample["domain"])
            expected_band = sample.get("expected_score_band")

            report = self.checker.analyze_text(text, domain=domain, doc_id=doc_id)

            self.assertIsInstance(report, FinalAssessmentReport)
            self.assertEqual(report.doc_id, doc_id)
            self.assertEqual(report.domain_applied, domain)

            if len(text.strip()) < 100:
                self.assertEqual(report.confidence, ConfidenceFlag.INSUFFICIENT_LENGTH)
                self.assertEqual(report.overall_score, 0.0)
            else:
                self.assertIn(
                    report.confidence,
                    [ConfidenceFlag.HIGH, ConfidenceFlag.MEDIUM, ConfidenceFlag.LOW],
                )
                self.assertIn(
                    report.classification,
                    [
                        "HUMAN_FLUCTUATION_STRONG",
                        "MIXED_NEEDS_REVIEW",
                        "AI_HOMOGENEOUS_HIGH",
                    ],
                )

                if expected_band:
                    min_s = expected_band["min_score"]
                    max_s = expected_band["max_score"]
                    self.assertGreaterEqual(
                        report.overall_score,
                        min_s,
                        f"Sample {doc_id} score {report.overall_score} < min expected {min_s}",
                    )
                    self.assertLessEqual(
                        report.overall_score,
                        max_s,
                        f"Sample {doc_id} score {report.overall_score} > max expected {max_s}",
                    )

    def test_domain_compensation_logic(self):
        sample_text = """
# API インターフェース仕様書
## エンドポイント
POST /api/v1/resource
- リクエストヘッダー: Content-Type: application/json
- ペイロード: JSON オブジェクト
認証エラー時は HTTP 401 Unauthorized を返却し、データ整合性を担保すること。
""" * 2

        report_essay = self.checker.analyze_text(sample_text, domain="essay")
        report_tech = self.checker.analyze_text(sample_text, domain="technical_doc")

        # Technical domain compensation must suppress score relative to essay domain
        self.assertLess(report_tech.overall_score, report_essay.overall_score)
        self.assertTrue(
            any("ドメイン補正 (technical_doc)" in ev for ev in report_tech.evidence_explanations)
        )

    def test_explanatory_evidence_richness(self):
        ai_sample = [s for s in self.corpus_data["samples"] if s["sample_id"] == "SAMPLE-AI-CLAUDE-002"][0]
        report = self.checker.analyze_text(ai_sample["text"], domain=ai_sample["domain"])

        self.assertGreater(len(report.evidence_explanations), 0)
        has_surface_ev = any("コードブロック" in ev or "Markdown" in ev for ev in report.evidence_explanations)
        has_lexical_ev = any("AI頻出定型句" in ev for ev in report.evidence_explanations)
        has_flow_ev = any("フロー" in ev or "欠如" in ev for ev in report.evidence_explanations)

        self.assertTrue(has_surface_ev, "Missing surface evidence in explanation")
        self.assertTrue(has_lexical_ev, "Missing lexical evidence in explanation")
        self.assertTrue(has_flow_ev, "Missing flow evidence in explanation")

    def test_confidence_flag_thresholds(self):
        short_text = "これは100文字未満の非常に短いサンプル文章です。"
        rep_short = self.checker.analyze_text(short_text)
        self.assertEqual(rep_short.confidence, ConfidenceFlag.INSUFFICIENT_LENGTH)

        mid_text = "本文章は120文字前後のテキストサンプルです。" * 6  # 138 chars
        rep_mid = self.checker.analyze_text(mid_text)
        self.assertEqual(rep_mid.confidence, ConfidenceFlag.LOW)

        med_text = "本文章は170文字前後のテキストサンプルです。" * 8  # 184 chars
        rep_med = self.checker.analyze_text(med_text)
        self.assertEqual(rep_med.confidence, ConfidenceFlag.MEDIUM)

        long_text = "本文章は300文字以上の十分な長さを持つテキストサンプルです。" * 15  # 465 chars
        rep_long = self.checker.analyze_text(long_text)
        self.assertEqual(rep_long.confidence, ConfidenceFlag.HIGH)



if __name__ == "__main__":
    unittest.main()
