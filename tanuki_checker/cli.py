import argparse
import json
import sys
from typing import Optional
from tanuki_checker.pipeline import TanukiContextChecker, DEFAULT_DOMAIN_BASELINES

def main(args: Optional[list] = None) -> None:
    parser = argparse.ArgumentParser(
        description="Tanuki Context Checker (生成AI文章チェッカー) CLI Tool"
    )
    parser.add_argument(
        "text",
        nargs="?",
        default=None,
        help="解析対象のテキスト（指定しない場合は --file または標準入力を使用）",
    )
    parser.add_argument(
        "-f",
        "--file",
        type=str,
        default=None,
        help="解析対象のテキストファイルパス",
    )
    parser.add_argument(
        "-d",
        "--domain",
        type=str,
        default="general",
        choices=list(DEFAULT_DOMAIN_BASELINES.keys()),
        help="文章ドメイン (default: general)",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="結果をJSON形式で出力",
    )

    parsed_args = parser.parse_args(args)

    input_text = ""
    if parsed_args.text:
        input_text = parsed_args.text
    elif parsed_args.file:
        try:
            with open(parsed_args.file, "r", encoding="utf-8") as f:
                input_text = f.read()
        except Exception as e:
            print(f"Error reading file {parsed_args.file}: {e}", file=sys.stderr)
            sys.exit(1)
    elif not sys.stdin.isatty():
        input_text = sys.stdin.read()
    else:
        parser.print_help()
        sys.exit(1)

    checker = TanukiContextChecker()
    report = checker.analyze_text(input_text, domain=parsed_args.domain)

    if parsed_args.json:
        result_dict = {
            "doc_id": report.doc_id,
            "overall_score": report.overall_score,
            "classification": report.classification,
            "confidence": report.confidence.value,
            "layer_scores": report.layer_scores,
            "evidence_explanations": report.evidence_explanations,
            "domain_applied": report.domain_applied,
        }
        print(json.dumps(result_dict, ensure_ascii=False, indent=2))
    else:
        class_jp = {
            "HUMAN_FLUCTUATION_STRONG": "人間らしいゆらぎが強い (人間執筆の可能性が高い)",
            "MIXED_NEEDS_REVIEW": "混在・要確認 (人間補正またはAIと人間の共同編集)",
            "AI_HOMOGENEOUS_HIGH": "AI生成の可能性が高い (ゆらぎ欠如・均質化)",
            "AI_GENERATED_HIGH": "AI生成の可能性が高い (ゆらぎ欠如・均質化)",
        }.get(report.classification, report.classification)

        print("=" * 60)
        print("🐾 Tanuki Context Checker - 解析レポート")
        print("=" * 60)
        print(f"総合AI生成スコア : {report.overall_score:.1f} / 100.0")
        print(f"判定区分         : {class_jp}")
        print(f"判定信頼度       : {report.confidence.value}")
        print(f"適用ドメイン     : {report.domain_applied}")
        print("-" * 60)
        print("【層別スコア (100点満点中、高いほどAI均質化傾向)】")
        print(f"  • 表層スコア (Surface)   : {report.layer_scores.get('surface', 0.0):.1f}")
        print(f"  • 語彙スコア (Lexical)   : {report.layer_scores.get('lexical', 0.0):.1f}")
        print(f"  • 構造スコア (Structural): {report.layer_scores.get('structural', 0.0):.1f}")
        print(f"  • フロースコア (Flow)    : {report.layer_scores.get('flow', 0.0):.1f}")
        print("-" * 60)
        print("【主要な検出根拠・説明 (Explainability)】")
        if report.evidence_explanations:
            for idx, exp in enumerate(report.evidence_explanations, 1):
                print(f"  {idx}. {exp}")
        else:
            print("  （特記すべきシグナルは検出されませんでした）")
        print("=" * 60)

if __name__ == "__main__":
    main()
