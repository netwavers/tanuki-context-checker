"""
Corpus Dataset Validation Script for Tanuki Context Checker.
Validates structural integrity, Pydantic compliance, label coverage, and domain balance
of tests/corpus/evaluation_corpus.json.
"""

import sys
from pathlib import Path
from dataset_schema import CorpusDataset, DomainType, AuthorType, ClassificationLabel


def validate_corpus(file_path: Path) -> bool:
    print(f"Loading and validating corpus file: {file_path}")
    if not file_path.exists():
        print(f"ERROR: File not found: {file_path}")
        return False

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        dataset = CorpusDataset.model_validate_json(content)
        print("✔ Pydantic Schema Validation: PASSED")
    except Exception as e:
        print(f"✖ Pydantic Schema Validation FAILED: {e}")
        return False

    errors = []
    warnings = []

    # 1. Unique sample IDs check
    sample_ids = set()
    for s in dataset.samples:
        if s.sample_id in sample_ids:
            errors.append(f"Duplicate sample_id found: {s.sample_id}")
        sample_ids.add(s.sample_id)

    # 2. Domain coverage check
    domains_present = {s.domain for s in dataset.samples}
    expected_domains = {DomainType.TECHNICAL_DOC, DomainType.ESSAY, DomainType.BLOG, DomainType.REPORT}
    missing_domains = expected_domains - domains_present
    if missing_domains:
        errors.append(f"Missing domain coverage for: {missing_domains}")
    else:
        print(f"✔ Domain Coverage ({len(domains_present)} domains): PASSED")

    # 3. Author type coverage check
    authors_present = {s.author_type for s in dataset.samples}
    expected_authors = {AuthorType.HUMAN, AuthorType.AI_GPT4O, AuthorType.AI_CLAUDE35, AuthorType.AI_PROMPT_ENGINEERED}
    missing_authors = expected_authors - authors_present
    if missing_authors:
        errors.append(f"Missing author type coverage for: {missing_authors}")
    else:
        print(f"✔ Author Type Coverage ({len(authors_present)} author types): PASSED")

    # 4. Classification label coverage check
    labels_present = {s.expected_score_band.target_classification for s in dataset.samples}
    expected_labels = {
        ClassificationLabel.HUMAN_FLUCTUATION_STRONG,
        ClassificationLabel.MIXED_NEEDS_REVIEW,
        ClassificationLabel.AI_HOMOGENEOUS_HIGH,
    }
    missing_labels = expected_labels - labels_present
    if missing_labels:
        errors.append(f"Missing classification label coverage for: {missing_labels}")
    else:
        print(f"✔ Classification Label Coverage ({len(labels_present)} categories): PASSED")

    # 5. Domain baseline mapping check
    for domain_enum in DomainType:
        if domain_enum.value not in dataset.domain_baselines:
            warnings.append(f"Domain baseline config missing for domain: {domain_enum.value}")

    # 6. Character count sanity check
    for s in dataset.samples:
        if len(s.text) != s.char_count:
            errors.append(f"Sample {s.sample_id}: text length ({len(s.text)}) != char_count ({s.char_count})")

    # Output Summary
    print(f"\n--- Validation Summary for {len(dataset.samples)} Samples ---")
    if warnings:
        for w in warnings:
            print(f"⚠️  WARNING: {w}")
    if errors:
        for err in errors:
            print(f"✖ ERROR: {err}")
        return False

    print("✔ All Integrity and Coverage Checks PASSED successfully!\n")
    return True


if __name__ == "__main__":
    corpus_file = Path(__file__).parent / "evaluation_corpus.json"
    success = validate_corpus(corpus_file)
    if not success:
        sys.exit(1)
