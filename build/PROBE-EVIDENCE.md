### Fidelity probe (statement-drift checker)

`python3 c2-f1-probe/run-probe.py` on this commit:

| quantity | value |
| --- | --- |
| pairs / drifted / controls | 22 / 16 / 6 |
| injected drifts detected | 14 |
| coverage on injected drifts | 14/16 = 0.875 |
| coverage, F1 class | 10/10 = 1.000 |
| coverage, F2 class | 4/6 = 0.667 |
| false alarms on faithful controls | 0/6 |
| precision / defect-class accuracy | 1.000 / 1.000 |

OK: probe reproduces the numbers reported in the paper.
