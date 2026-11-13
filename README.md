# Joyhouse Harness Runtime

Joyhouse 自行维护的 DeepSeek Harness 运行时打包工程。只直接依赖官方 `@deepseek-ai/dsh@0.2.2-rc.1`；保留官方包的传递依赖，不修改 Harness 源码，不包含 Joyhouse 插件或个人数据。

公开仓库：[JoyhouseLabs/joyhouse-harness-runtime](https://github.com/JoyhouseLabs/joyhouse-harness-runtime)。本目录可独立检出运行；在产品仓库中暂存时也可运行测试。发布 workflow 位于本目录的 `.github/workflows/`，导出为独立仓库后生效。

## 本地构建

需要 Node **24.21.0**、npm **11.19.0**、Python 3.12 和对应平台的原生构建工具。构建必须来自已提交的干净源码。

```sh
node --test test/*.test.mjs
node scripts/build.mjs
```

构建在 `.build/` 临时目录中执行 `npm ci --omit=dev --include=optional`。依次验证 FFI/PTY 实际执行、CLI 版本，再用临时 DSH_HOME 启动官方 `web` profile，测试登录 token 换取 Cookie 和页面加载。通过后输出 ZIP、SHA-256 和构建报告到 `dist/`；测试失败不会生成新的发行报告。首次构建需要联网下载锁定依赖。依赖安装脚本按 `allowScripts` 精确版本审核；升级引入新的安装脚本时校验失败，不能静默漏装原生模块。

支持 Linux x64、macOS arm64/x64、Windows x64。ZIP 名称保留现有桌面解压协议使用的 `deepseek-harness-pkg-*.zip`；文件名不代表其仍来自第三方打包仓库。产物目录仍为 `package.json` + `node_modules/@deepseek-ai/dsh/lib/bin.js`，无需迁移用户资料。

## 升级官方包

在干净临时目录复制 `package.json` 与 `.npmrc`，更新精确版本，使用固定 npm 生成新的 `package-lock.json`，带回评审；同步 `runtime.json` 的官方源码 commit。不要在含旧 node_modules 的目录重新生成跨平台锁文件。执行测试、提交，然后让四个平台重新构建。

## 发布与接入桌面

独立仓库 Actions → **Build official Harness runtime** → Run workflow。默认只构建，`publish=true` 才在四个平台全部通过后发布 prerelease。发布包含原始 ZIP、逐平台报告、`SHA256SUMS` 和可供桌面 pin 脚本读取的 `runtime-release.json`。每次运行使用唯一 tag，重跑也不覆盖旧发行。

桌面需要显式接纳 `runtime-release.json`，重建产品清单并完成兼容检查。打包仓库公开时可直接从 GitHub Release 下载；私有时需要自有分发服务，不能让客户端携带 GitHub 管理令牌。

运行包发行与桌面安装包发行相互独立。以实际 Actions 和产品 `upstream.json` 为准。

## 当前验证记录（2026-11-11）

- 从 npm 官方 registry 独立生成锁文件，`npm ci` 安装 654 个包成功；直接运行官方 CLI 返回 `0.2.2-rc.1`。
- 已审核五个依赖的安装脚本并锁定版本，FFI 加载与 PTY 实际执行测试通过。
- 五项打包合同测试、五项桌面产品清单 Rust 测试通过。
- 本地受限窗口的 Web 启动曾因 `listen EPERM` 失败；后续在四个平台的 GitHub 原生 runner 上，CLI、FFI、PTY 与认证 Web 启动测试全部通过。
- 已发布 [四平台运行包](https://github.com/JoyhouseLabs/joyhouse-harness-runtime/releases/tag/dsh-0.2.2-rc.1-430095507731)（候选版），构建 commit `fc62f2288fc0599d8722febc905b91c47e12d403`。修复 Windows 探针进程退出及跨平台换行符差异后，完整发布流程通过。
- 桌面产品清单已推进到该自有发行；运行包内仍保留兼容现有解压协议的 `deepseek-harness-pkg-*.zip` 文件名。

### Explicit candidate tag release

In addition to the manual workflow (`publish=true`), maintainers can push a
`runtime-candidate-*` tag at a reviewed packaging commit. This explicitly requests
four-platform qualification and prerelease publication. All four native builds,
smoke tests and matching provenance reports remain mandatory. Ordinary branch
pushes do not publish. The output release keeps its immutable run-based `dsh-*`
tag; candidate tags must not be moved or reused.
