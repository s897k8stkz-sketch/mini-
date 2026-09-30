# run-parity.ps1 — C6 应用「可复现」证明脚本（6 项检查，全部通过才退出 0）
#
# 为什么需要它：这个 Web 应用把「提交前自检」做成了浏览器工具，但工具本身必须可被第三方复跑。
# 于是把同一批夹具同时喂给两个独立实现，逐字段比对它们的 JSON 报告：
#   - Python 版：skills/challenge-deliverable-auditor/scripts/audit.py（C4 交付的技能包）
#   - JS 版    ：apps/c6-deliverable-auditor-web/js/audit-core.js（本应用；浏览器与命令行共用同一内核）
# 再单独钉住「浏览器路径（只有相对路径、没有 name 字段）== 命令行路径」这条回归。
#
# 用法（在 apps/c6-deliverable-auditor-web 目录下）：
#   powershell -ExecutionPolicy Bypass -File tests/run-parity.ps1
# 退出码：0 = 全部通过；1 = 有检查失败；2 = 环境缺失。
# 注意：本文件含中文，必须保存为「UTF-8 带 BOM」，否则 Windows PowerShell 5.1 会按本地代码页解码而报语法错。
#
# 两个设计细节，都是被真实失败逼出来的：
#   1) 中间产物写进系统临时目录而不是 tests/out —— 否则「先跑的 Python 写出报告」会让
#      紧接着列目录的 JS 多看到一个文件（file_count 104 vs 105），比对失败的原因竟是
#      比对脚本自己污染了被扫描目录。真实目录检查必须扫到同一份快照。
#   2) 判定不用 PowerShell 解析 JSON（PS 5.1 读 UTF-8 无 BOM 会乱码），一律交给
#      node tests/assert-report.mjs 与 node tests/canonical-json.mjs。

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$here = Split-Path -Parent $MyInvocation.MyCommand.Path     # .../apps/c6-deliverable-auditor-web/tests
$app  = Split-Path -Parent $here                            # .../apps/c6-deliverable-auditor-web
$repo = (Resolve-Path (Join-Path $app '..\..')).Path        # mini-（仓库根）
$py   = Join-Path $repo 'skills\challenge-deliverable-auditor\scripts\audit.py'
$tmp  = Join-Path $env:TEMP ('c6-parity-' + $PID)           # 中间产物：仓库外，避免污染被扫描目录
$evid = Join-Path $here 'out'                               # 证据副本：随仓库一起提交
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
New-Item -ItemType Directory -Force -Path $evid | Out-Null

if (-not (Test-Path $py)) { Write-Host "[ERR ] 找不到 Python 实现：$py" -ForegroundColor Red; exit 2 }

$results = @()
function Record($name, $ok, $detail) {
  $script:results += [pscustomobject]@{ 检查 = $name; 结果 = $(if ($ok) { 'PASS' } else { 'FAIL' }); 说明 = $detail }
  $color = if ($ok) { 'Green' } else { 'Red' }
  Write-Host ("[{0}] {1} — {2}" -f $(if ($ok) { 'OK  ' } else { 'FAIL' }), $name, $detail) -ForegroundColor $color
}

function Invoke-Py($dir, $spec, $jsonPath) {
  $null = & python $py --dir $dir --spec $spec --quiet --json $jsonPath
  return $LASTEXITCODE
}
function Invoke-Js($dir, $spec, $jsonPath) {
  $null = & node 'js/audit-cli.mjs' --dir $dir --spec $spec --quiet --json $jsonPath
  return $LASTEXITCODE
}
function Compare-Json($a, $b) {
  $txt = & node 'tests/canonical-json.mjs' $a $b
  Write-Host ("        " + $txt)
  return $LASTEXITCODE
}
function Assert-Report($jsonPath, [string[]]$checks) {
  $txt = & node 'tests/assert-report.mjs' $jsonPath @checks
  Write-Host ("        " + $txt)
  return $LASTEXITCODE
}

Push-Location $app
try {
  $specC6    = '*app链接*,*demo*,*repo链接*,*AI日志*'
  $specFuzzy = 'AI日志'
  $specRepo  = 'README.md,repo链接,AI日志,拿来说明'

  # ---- 检查 0：静态语法（JS 全量 node --check + Python 编译） ----
  $jsFiles = @('js/app.js', 'js/app-ai.js', 'js/ai-client.js', 'js/audit-cli.mjs', 'js/audit-core.js', 'js/inventory-fs.mjs', 'sample/sample-data.js',
    'tests/canonical-json.mjs', 'tests/browser-path-check.mjs', 'tests/assert-report.mjs')
  $bad = @()
  foreach ($f in $jsFiles) { $null = & node --check $f; if ($LASTEXITCODE -ne 0) { $bad += $f } }
  $null = & python -m py_compile $py; $pyc = $LASTEXITCODE
  Record '0 静态语法：JS 全量语法检查 + Python 编译' (($bad.Count -eq 0) -and ($pyc -eq 0)) `
    ("JS $($jsFiles.Count) 个文件，失败 $($bad.Count) 个；Python 编译 exit=$pyc")

  # ---- 检查 1：正例夹具，两边都应 READY（退出码 0）且报告逐字段一致 ----
  $pyOk = Invoke-Py 'tests/fixtures/submit-ok' $specC6 (Join-Path $tmp 'py-ok.json')
  $jsOk = Invoke-Js 'tests/fixtures/submit-ok' $specC6 (Join-Path $tmp 'js-ok.json')
  $cmpOk = Compare-Json (Join-Path $tmp 'py-ok.json') (Join-Path $tmp 'js-ok.json')
  $asOk = Assert-Report (Join-Path $tmp 'js-ok.json') @('--ready=true', '--passed=4', '--required=4')
  Record '1 正例夹具：双实现结论一致且 4/4 满足' (($pyOk -eq 0) -and ($jsOk -eq 0) -and ($cmpOk -eq 0) -and ($asOk -eq 0)) `
    ("python exit=$pyOk js exit=$jsOk 比对=$cmpOk 断言=$asOk")

  # ---- 检查 2：模糊命中分支（清单模式不带通配符 → PASS_FUZZY 计入满足） ----
  $pyFz = Invoke-Py 'tests/fixtures/submit-fuzzy' $specFuzzy (Join-Path $tmp 'py-fuzzy.json')
  $jsFz = Invoke-Js 'tests/fixtures/submit-fuzzy' $specFuzzy (Join-Path $tmp 'js-fuzzy.json')
  $cmpFz = Compare-Json (Join-Path $tmp 'py-fuzzy.json') (Join-Path $tmp 'js-fuzzy.json')
  $asFz = Assert-Report (Join-Path $tmp 'js-fuzzy.json') @('--ready=true', '--passed=1', '--required=1', '--verdict=AI日志:PASS_FUZZY')
  Record '2 模糊命中：PASS_FUZZY 计入满足且两边一致' (($pyFz -eq 0) -and ($jsFz -eq 0) -and ($cmpFz -eq 0) -and ($asFz -eq 0)) `
    ("python exit=$pyFz js exit=$jsFz 比对=$cmpFz 断言=$asFz")

  # ---- 检查 3：反例夹具，两边都应 NOT READY（退出码 1），且四态各自正确 ----
  $pyBad = Invoke-Py 'tests/fixtures/submit-bad' $specC6 (Join-Path $tmp 'py-bad.json')
  $jsBad = Invoke-Js 'tests/fixtures/submit-bad' $specC6 (Join-Path $tmp 'js-bad.json')
  $cmpBad = Compare-Json (Join-Path $tmp 'py-bad.json') (Join-Path $tmp 'js-bad.json')
  $asBad = Assert-Report (Join-Path $tmp 'js-bad.json') @('--ready=false', '--passed=2', '--required=4',
    '--verdict=*app链接*:EMPTY,*demo*:PASS,*repo链接*:PASS,*AI日志*:MISSING', '--min-risks=3')
  Record '3 反例夹具：EMPTY / PASS / PASS / MISSING + 风险项齐报' (($pyBad -eq 1) -and ($jsBad -eq 1) -and ($cmpBad -eq 0) -and ($asBad -eq 0)) `
    ("python exit=$pyBad js exit=$jsBad 比对=$cmpBad 断言=$asBad")

  # ---- 检查 4：真实目录（仓库根，混合命中与缺失），比对 + 结论双保险 ----
  $pyRepo = Invoke-Py '..\..' $specRepo (Join-Path $tmp 'py-repo.json')
  $jsRepo = Invoke-Js '..\..' $specRepo (Join-Path $tmp 'js-repo.json')
  $cmpRepo = Compare-Json (Join-Path $tmp 'py-repo.json') (Join-Path $tmp 'js-repo.json')
  $asRepo = Assert-Report (Join-Path $tmp 'js-repo.json') @('--ready=true', '--passed=4', '--required=4')
  Record '4 真实目录（仓库根）：双实现结论一致且 4/4 满足' (($pyRepo -eq $jsRepo) -and ($cmpRepo -eq 0) -and ($asRepo -eq 0)) `
    ("python exit=$pyRepo js exit=$jsRepo 比对=$cmpRepo 断言=$asRepo")

  # ---- 检查 5：浏览器路径回归 —— 剥掉 name 字段后结果必须完全不变 ----
  $br = @{}
  foreach ($t in @('ok', 'fuzzy', 'bad', 'repo')) {
    $txt = & node 'tests/browser-path-check.mjs' (Join-Path $tmp ("js-$t.json"))
    $br[$t] = $LASTEXITCODE
    Write-Host ("        [$t] " + $txt)
  }
  $brOk = (@($br.Values | Where-Object { $_ -ne 0 }).Count -eq 0)
  Record '5 浏览器路径（无 name 字段）与命令行路径等价' $brOk `
    ("正例=$($br['ok']) 模糊=$($br['fuzzy']) 反例=$($br['bad']) 真实目录=$($br['repo'])")

  # ---- 证据落盘：中间报告与总报告复制到 tests/out（两者都是无 BOM UTF-8，Node 可直接读） ----
  foreach ($t in @('py-ok', 'js-ok', 'py-fuzzy', 'js-fuzzy', 'py-bad', 'js-bad', 'py-repo', 'js-repo')) {
    Copy-Item (Join-Path $tmp "$t.json") (Join-Path $evid "$t.json") -Force
  }
  $json = $results | ConvertTo-Json -Depth 4
  [System.IO.File]::WriteAllText((Join-Path $evid 'parity-report.json'), $json, (New-Object System.Text.UTF8Encoding($false)))
}
finally {
  Pop-Location
}

Write-Host ''
$results | Format-Table -AutoSize | Out-String -Width 200 | Write-Host
$failed = @($results | Where-Object { $_.结果 -eq 'FAIL' })
Write-Host ("通过 {0}/{1} 项；证据已写入 tests/out（parity-report.json 及 8 份原始报告）" -f ($results.Count - $failed.Count), $results.Count)
if ($failed.Count) { exit 1 }
exit 0
