## 这个 PR 做了什么

（一句话说明；如果是修复，请附对应 Issue 编号）

## 为什么需要它

（描述触发它的真实场景；"更优雅"不是理由，"少一次误判"才是）

## 怎么验证

- [ ] `python -m py_compile` 通过（涉及 Python 改动时必填）
- [ ] 审计器自跑通过，且**贴出退出码**：

```bash
python skills/challenge-deliverable-auditor/scripts/audit.py \
  --dir examples/sample-ready \
  --spec "*skill说明*,*.skill,*教学说明*,*demo*,*AI日志*"; echo "exit=$?"
```

- [ ] 若新增/修改了样例，`examples/expected/` 下的输出是**机器生成**的（非手抄）
- [ ] 未引入第三方依赖
- [ ] 未让工具产生任何写入平台的行为

## 兼容性影响

- [ ] 不改变既有退出码语义（`0` 达标 / `1` 未达标 / `2` 用法错误）
- [ ] 不改变既有 JSON 报告字段名

## 备注

（已知限制、后续计划、需要 reviewer 特别关注的地方）
