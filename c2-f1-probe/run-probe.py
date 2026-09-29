"""C2 fidelity-gate probe runner.

Mechanical statement-fidelity check for the audit protocol of the C2 paper:
compare an *intent* statement against a *formalised* statement using only
extracted surface features (condition atoms / numerals / strict inequalities /
quantifier class). Emits per-category coverage, control false-positive rate,
and the confusion between the check's verdict and the ground-truth label.

Run:  python run-probe.py
Outputs: probe-output/results.json  (machine-readable, all per-case detail)
"""
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
CASES = os.path.join(HERE, "probe-cases.json")
OUT_DIR = os.path.join(HERE, "probe-output")

VOCAB = [
    ("nonzero", r"nonzero|non-zero|!= 0"),
    ("positive", r"positive|> 0|>\s*0"),
    ("nonneg", r"nonnegative|non-negative|>= 0"),
    ("integer", r"integer"),
    ("even", r"\beven\b"),
    ("odd", r"\bodd\b"),
    ("prime", r"\bprimes?\b"),
    ("continuous", r"continuous"),
    ("differentiable", r"differentiable"),
    ("integrable", r"integrable"),
    ("bounded", r"bounded"),
    ("convergent", r"convergent"),
    ("compact", r"compact"),
    ("complete", r"complete"),
    ("nonempty", r"nonempty|non-empty"),
    ("finite", r"finite"),
    ("infinite", r"infinite"),
    ("monotone", r"monoton"),
    ("convex", r"convex"),
    ("irreducible", r"irreducible"),
    ("symmetric", r"symmetric"),
    ("invertible", r"invertible"),
    ("coprime", r"coprime"),
    ("divisible", r"divisible"),
]

QUANT = [
    ("forall", r"for every|for all|every\b"),
    ("exists", r"there exists|there is a|some\b"),
]


def features(text):
    s = text.lower()
    atoms = set(k for k, p in VOCAB if re.search(p, s))
    quant = set(k for k, p in QUANT if re.search(p, s))
    nums = set(re.findall(r"\d+", s))
    # strip non-strict comparison operators before counting strict ones
    s2 = re.sub(r">=|<=|>=|=>", " ", s)
    strict = len(re.findall(r"[<>]", s2))
    return {"atoms": sorted(atoms), "quant": sorted(quant),
            "nums": sorted(nums), "strict": strict}


def verdict(fi, ff):
    """Return (flagged_category_or_None, [differing feature names])."""
    diff = []
    if fi["quant"] != ff["quant"]:
        diff.append("quantifier")
    if fi["atoms"] != ff["atoms"]:
        diff.append("condition_atoms")
    if fi["nums"] != ff["nums"]:
        diff.append("numerals")
    if fi["strict"] != ff["strict"]:
        diff.append("strict_inequalities")
    if not diff:
        return None, []
    return ("F2" if "quantifier" in diff else "F1"), diff


def main():
    with open(CASES, encoding="utf-8") as fh:
        data = json.load(fh)

    rows, per_cat = [], {}
    tp = fp = tn = fn = 0
    named_right = named_total = 0

    for c in data["cases"]:
        fi, ff = features(c["intent"]), features(c["formal"])
        v, diff = verdict(fi, ff)
        truth = c["truth"]
        if truth == "none":
            if v is None:
                tn += 1
            else:
                fp += 1
        else:
            if v is None:
                fn += 1
            else:
                tp += 1
                named_total += 1
                if v == truth:
                    named_right += 1
        st = per_cat.setdefault(truth, {"cases": 0, "detected": 0})
        st["cases"] += 1
        if v is not None and truth != "none":
            st["detected"] += 1
        rows.append({"id": c["id"], "truth": truth, "verdict": v,
                     "differing": diff, "intent_feats": fi, "formal_feats": ff})

    drift_total = tp + fn
    metrics = {
        "cases_total": len(data["cases"]),
        "drift_cases": drift_total,
        "controls": tn + fp,
        "detected": tp,
        "missed": fn,
        "false_positives": fp,
        "true_negatives": tn,
        "coverage_on_drift": round(tp / drift_total, 4) if drift_total else None,
        "specificity_on_controls": round(tn / (tn + fp), 4) if (tn + fp) else None,
        "precision": round(tp / (tp + fp), 4) if (tp + fp) else None,
        "category_accuracy_when_flagged": round(named_right / named_total, 4) if named_total else None,
        "per_category": {k: dict(v, coverage=round(v["detected"] / v["cases"], 4))
                         for k, v in sorted(per_cat.items())},
    }

    os.makedirs(OUT_DIR, exist_ok=True)
    out = {"metrics": metrics, "cases": rows}
    with open(os.path.join(OUT_DIR, "results.json"), "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=2)

    print("=== per-case ===")
    for r in rows:
        print("%-13s truth=%-5s verdict=%-5s %s" %
              (r["id"], r["truth"], str(r["verdict"]), ",".join(r["differing"])))
    print("\n=== metrics ===")
    for k, v in metrics.items():
        if k != "per_category":
            print("%-32s %s" % (k, v))
    print("\n=== per category ===")
    for k, v in metrics["per_category"].items():
        print("%-8s cases=%d detected=%d coverage=%s" %
              (k, v["cases"], v["detected"], v["coverage"]))
    print("\nwritten: %s" % os.path.join(OUT_DIR, "results.json"))


if __name__ == "__main__":
    main()
