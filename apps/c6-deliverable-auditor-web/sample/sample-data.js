/*! sample-data.js — 内置样例（离线可演示：不联网、不调用 AI）
 *
 * 这是一个「故意做坏」的交付目录清单，用来证明工具真的会报错、而不是永远 READY：
 *   - 2025105400247_C6_app链接.md 是 0 字节（EMPTY，最常见也最隐蔽的坑：文件名对了，内容没保存）
 *   - 命名为 C6_AI_LOG.md 而不是含「AI日志」的名字（MISSING，说明命中文档名本身也是交付的一部分）
 *   - ~$2025105400247_C6_demo.md 是 Office 临时锁文件（warn：不该提交）
 *   - 新建文本文档.txt 是 0 字节占位文件（error + warn）
 *   - 报告 终版.pdf 含空格与全角字符（info：跨平台脚本易出错）
 * 清单字段与浏览器端 File 对象一致：只取 rel（= webkitRelativePath）+ size，name 由内核从 rel 推导。
 * 页面加载后点「载入内置样例」即可复现；结论应为 NOT READY，2/4 项满足。
 */
window.SAMPLE_DATA = {
  label: '内置样例（故意做坏的交付目录）',
  spec: '*app链接*,*demo*,*repo链接*,*AI日志*',
  challenge_text: [
    '交付物要求：',
    '1) app链接 —— 可运行的 Web 应用地址或仓库内路径，并说明如何打开；',
    '2) demo —— 演示说明（含复现步骤与真实输出）；',
    '3) repo链接 —— 公开仓库地址；',
    '4) AI日志 —— 记录与 AI 协作的过程、纠错与分工。'
  ].join('\n'),
  inventory: [
    { name: '2025105400247_C6_app链接.md', rel: '2025105400247_C6_app链接.md', size: 0 },
    { name: '2025105400247_C6_demo.md', rel: '2025105400247_C6_demo.md', size: 2310 },
    { name: '2025105400247_C6_repo链接.md', rel: '2025105400247_C6_repo链接.md', size: 512 },
    { name: 'C6_AI_LOG.md', rel: '旧版/C6_AI_LOG.md', size: 1180 },
    { name: 'demo草稿.md', rel: '草稿/demo草稿.md', size: 742 },
    { name: '新建文本文档.txt', rel: '新建文本文档.txt', size: 0 },
    { name: '报告 终版.pdf', rel: '报告 终版.pdf', size: 20480 },
    { name: '~$2025105400247_C6_demo.md', rel: '~$2025105400247_C6_demo.md', size: 1024 }
  ]
};
