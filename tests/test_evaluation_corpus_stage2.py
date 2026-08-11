import json
import unittest
from tanuki_checker.pipeline import TanukiContextChecker, ConfidenceFlag


class TestCorpusIntegrationStage2(unittest.TestCase):
    def setUp(self):
        with open("tests/corpus/evaluation_corpus.json", "r", encoding="utf-8") as f:
            self.corpus_data = json.load(f)
        self.checker = TanukiContextChecker()

    def test_run_checker_on_all_corpus_samples(self):
        samples = self.corpus_data.get("samples", [])
        self.assertGreater(len(samples), 0)

        for sample in samples:
            doc_id = sample["sample_id"]
            text = sample["text"]
            domain = str(sample["domain"])

            report = self.checker.analyze_text(text, domain=domain, doc_id=doc_id)

            self.assertEqual(report.doc_id, doc_id)
            self.assertEqual(report.domain_applied, domain)

            if len(text.strip()) < 100:
                self.assertEqual(report.confidence, ConfidenceFlag.INSUFFICIENT_LENGTH)
            else:
                self.assertEqual(report.confidence, ConfidenceFlag.HIGH)
                self.assertIn(report.classification, [
                    "HUMAN_FLUCTUATION_STRONG",
                    "MIXED_NEEDS_REVIEW",
                    "AI_HOMOGENEOUS_HIGH"
                ])
                self.assertIn("surface", report.layer_scores)
                self.assertIn("lexical", report.layer_scores)
                self.assertIn("structural", report.layer_scores)
                self.assertIn("flow", report.layer_scores)

            print(f"Sample [{doc_id}] Score: {report.overall_score} | Confidence: {report.confidence} | Classification: {report.classification}")




if __name__ == "__main__":
    unittest.main()
