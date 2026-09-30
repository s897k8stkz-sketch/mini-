# -*- coding: utf-8 -*-
"""Frozen-metric assertion for the C2 fidelity probe.

Reads probe-output/results.json (produced by run-probe.py) and exits non-zero if the probe no
longer reproduces the numbers reported in the paper's subsection
"A reproducible probe of the fidelity gate". Prints Markdown for the CI step summary.

Run:  python3 check-metrics.py
"""
import io, json, os, sys
from collections import OrderedDict

HERE = os.path.dirname(os.path.abspath(__file__))
RES = os.path.join(HERE, "probe-output", "results.json")

EXPECTED = OrderedDict([
    ("cases_total", 22),
    ("drift_cases", 16),
    ("controls", 6),
    ("detected", 14),
    ("missed", 2),
    ("false_positives", 0),
    ("true_negatives", 6),
    ("coverage_on_drift", 0.875),
    ("specificity_on_controls", 1.0),
    ("precision", 1.0),
    ("category_accuracy_when_flagged", 1.0),
])
EXPECTED_FC = {"F1": (10, 10), "F2": (6, 4), "none": (6, 0)}


def main():
    with io.open(RES, encoding="utf-8") as fh:
        data = json.load(fh)
    m = data["metrics"]
    bad = []
    for k, v in EXPECTED.items():
        if abs(float(m.get(k, float("nan"))) - float(v)) > 1e-9:
            bad.append("%s: got %r, expected %r" % (k, m.get(k), v))
    for tag, (cases, detected) in EXPECTED_FC.items():
        got = m["per_category"][tag]
        if (int(got["cases"]), int(got["detected"])) != (cases, detected):
            bad.append("per_category.%s: got cases=%r detected=%r, expected %d/%d"
                       % (tag, got["cases"], got["detected"], cases, detected))

    pc = m["per_category"]
    print("### Fidelity probe (statement-drift checker)")
    print("")
    print("`python3 c2-f1-probe/run-probe.py` on this commit:")
    print("")
    print("| quantity | value |")
    print("| --- | --- |")
    print("| pairs / drifted / controls | %d / %d / %d |"
          % (m["cases_total"], m["drift_cases"], m["controls"]))
    print("| injected drifts detected | %d |" % m["detected"])
    print("| coverage on injected drifts | %d/%d = %.3f |"
          % (m["detected"], m["drift_cases"], m["coverage_on_drift"]))
    print("| coverage, F1 class | %d/%d = %.3f |"
          % (pc["F1"]["detected"], pc["F1"]["cases"], pc["F1"]["coverage"]))
    print("| coverage, F2 class | %d/%d = %.3f |"
          % (pc["F2"]["detected"], pc["F2"]["cases"], pc["F2"]["coverage"]))
    print("| false alarms on faithful controls | %d/%d |"
          % (m["false_positives"], m["controls"]))
    print("| precision / defect-class accuracy | %.3f / %.3f |"
          % (m["precision"], m["category_accuracy_when_flagged"]))
    print("")
    if bad:
        print("**PROBE MISMATCH** against the numbers reported in the paper:")
        for b in bad:
            print("  - " + b)
        return 1
    print("OK: probe reproduces the numbers reported in the paper.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
