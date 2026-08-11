import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import time
import math
import json
import tracemalloc
from typing import Dict, List
from tanuki_checker.pipeline import TanukiContextChecker
from tanuki_checker.metrics import ConfidenceFlag, FinalAssessmentReport


def compute_roc_auc(scores: List[float], labels: List[int]) -> float:
    """
    Compute ROC-AUC score.
    labels: 1 for AI, 0 for Human.
    scores: higher score means higher probability of AI.
    """
    positives = [s for s, l in zip(scores, labels) if l == 1]
    negatives = [s for s, l in zip(scores, labels) if l == 0]
    if not positives or not negatives:
        return 1.0

    rank_sum = 0
    for p in positives:
        for n in negatives:
            if p > n:
                rank_sum += 1.0
            elif p == n:
                rank_sum += 0.5
    return rank_sum / (len(positives) * len(negatives))


class Stage3AuditSuite:
    def __init__(self, corpus_path: str = "tests/corpus/evaluation_corpus.json"):
        with open(corpus_path, "r", encoding="utf-8") as f:
            self.corpus_data = json.load(f)
        self.checker = TanukiContextChecker()

    def run_accuracy_audit(self) -> Dict:
        samples = self.corpus_data.get("samples", [])
        total_samples = len(samples)

        y_true = []  # 1 for AI, 0 for Human
        y_scores = []
        sample_results = []

        expected_band_matches = 0
        tech_fp_count = 0
        tech_total = 0
        prompt_ai_detected = 0
        prompt_ai_total = 0
        boundary_correct = 0
        boundary_total = 0

        for sample in samples:
            doc_id = sample["sample_id"]
            text = sample["text"]
            domain = str(sample["domain"])
            author_type = sample["author_type"]
            expected_band = sample.get("expected_score_band")

            report = self.checker.analyze_text(text, domain=domain, doc_id=doc_id)

            is_ai = 1 if author_type.startswith("ai") else 0

            # Exclude short boundary sample from binary classification metrics if skipped
            if len(text.strip()) >= 100:
                y_true.append(is_ai)
                y_scores.append(report.overall_score)
            else:
                boundary_total += 1
                if report.confidence == ConfidenceFlag.INSUFFICIENT_LENGTH and report.overall_score == 0.0:
                    boundary_correct += 1

            # Check expected band
            band_passed = False
            if expected_band:
                min_s = expected_band["min_score"]
                max_s = expected_band["max_score"]
                if min_s <= report.overall_score <= max_s:
                    expected_band_matches += 1
                    band_passed = True

            # Tech doc FPR
            if domain == "technical_doc" and author_type == "human":
                tech_total += 1
                if report.classification == "AI_HOMOGENEOUS_HIGH":
                    tech_fp_count += 1

            # Prompt engineered AI recall
            if author_type == "ai_prompt_engineered":
                prompt_ai_total += 1
                if report.classification in ["MIXED_NEEDS_REVIEW", "AI_HOMOGENEOUS_HIGH"]:
                    prompt_ai_detected += 1

            sample_results.append({
                "sample_id": doc_id,
                "domain": domain,
                "author_type": author_type,
                "score": report.overall_score,
                "classification": report.classification,
                "confidence": report.confidence.value,
                "band_passed": band_passed,
            })

        roc_auc = compute_roc_auc(y_scores, y_true) if y_scores else 1.0
        tech_fpr = (tech_fp_count / tech_total) if tech_total > 0 else 0.0
        prompt_recall = (prompt_ai_detected / prompt_ai_total) if prompt_ai_total > 0 else 1.0

        return {
            "total_samples": total_samples,
            "expected_band_matches": expected_band_matches,
            "accuracy_rate": expected_band_matches / total_samples if total_samples > 0 else 0.0,
            "roc_auc": round(roc_auc, 4),
            "tech_doc_fpr": round(tech_fpr, 4),
            "prompt_ai_recall": round(prompt_recall, 4),
            "boundary_handling_pass": boundary_correct == boundary_total,
            "sample_results": sample_results,
        }

    def run_performance_profile(self, iterations: int = 50) -> Dict:
        samples = [s for s in self.corpus_data.get("samples", []) if len(s["text"].strip()) >= 100]

        # 1. Total Execution Time & Memory Allocation
        tracemalloc.start()
        start_time = time.perf_counter()

        total_chars = 0

        for _ in range(iterations):
            for sample in samples:
                text = sample["text"]
                domain = str(sample["domain"])
                doc_id = sample["sample_id"]
                report = self.checker.analyze_text(text, domain=domain, doc_id=doc_id)
                total_chars += len(text)

        end_time = time.perf_counter()
        current_mem, peak_mem = tracemalloc.get_traced_memory()
        tracemalloc.stop()

        total_time_sec = end_time - start_time
        total_docs = len(samples) * iterations
        avg_latency_ms = (total_time_sec / total_docs) * 1000.0
        chars_per_sec = total_chars / total_time_sec if total_time_sec > 0 else 0.0

        # 2. Detailed Pass Breakdown Profiling
        stage_times: Dict[str, float] = {
            "ast_parse": 0.0,
            "symbol_pass": 0.0,
            "surface_pass": 0.0,
            "lexical_pass": 0.0,
            "structural_pass": 0.0,
            "flow_pass": 0.0,
        }

        for _ in range(iterations):
            for sample in samples:
                text = sample["text"]
                doc_id = sample["sample_id"]

                # Parse AST
                t0 = time.perf_counter()
                ast = self.checker.parser.parse(text, doc_id=doc_id)
                t1 = time.perf_counter()
                stage_times["ast_parse"] += (t1 - t0)

                # Symbol Pass
                from tanuki_checker.symbol import SymbolTable
                sym_table = SymbolTable()
                t2 = time.perf_counter()
                p_sym = self.checker.passes[0]
                p_sym.execute(ast, sym_table)
                t3 = time.perf_counter()
                stage_times["symbol_pass"] += (t3 - t2)

                # Surface Pass
                t4 = time.perf_counter()
                self.checker.passes[1].execute(ast, sym_table)
                t5 = time.perf_counter()
                stage_times["surface_pass"] += (t5 - t4)

                # Lexical Pass
                t6 = time.perf_counter()
                self.checker.passes[2].execute(ast, sym_table)
                t7 = time.perf_counter()
                stage_times["lexical_pass"] += (t7 - t6)

                # Structural Pass
                t8 = time.perf_counter()
                self.checker.passes[3].execute(ast, sym_table)
                t9 = time.perf_counter()
                stage_times["structural_pass"] += (t9 - t8)

                # Flow Pass
                t10 = time.perf_counter()
                self.checker.passes[4].execute(ast, sym_table)
                t11 = time.perf_counter()
                stage_times["flow_pass"] += (t11 - t10)

        # Convert stage times to ms per document
        stage_breakdown_ms = {k: round((v / total_docs) * 1000.0, 3) for k, v in stage_times.items()}
        sum_stage_v = sum(stage_times.values())
        stage_percentages = {k: round((v / sum_stage_v) * 100.0, 1) for k, v in stage_times.items()}

        return {
            "total_documents_processed": total_docs,
            "total_chars_processed": total_chars,
            "total_time_sec": round(total_time_sec, 4),
            "avg_latency_ms": round(avg_latency_ms, 3),
            "throughput_chars_per_sec": round(chars_per_sec, 1),
            "peak_memory_bytes": peak_mem,
            "peak_memory_kb": round(peak_mem / 1024.0, 2),
            "stage_breakdown_ms": stage_breakdown_ms,
            "stage_percentages": stage_percentages,
        }


if __name__ == "__main__":
    audit = Stage3AuditSuite()
    print("=== 1. Accuracy Audit ===")
    acc_results = audit.run_accuracy_audit()
    print(json.dumps(acc_results, indent=2, ensure_ascii=False))

    print("\n=== 2. Performance & Resource Audit ===")
    perf_results = audit.run_performance_profile(iterations=50)
    print(json.dumps(perf_results, indent=2, ensure_ascii=False))
