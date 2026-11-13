Joyhouse-maintained packaging of the unmodified official `@deepseek-ai/dsh` npm package.

This is a Joyhouse runtime distribution, not an official DeepSeek desktop release. The lockfile, build scripts and exact source revision are available in this repository. Native builds must pass CLI and authenticated Web startup smoke tests before publication. Each archive includes package manifests, dependency licenses and build provenance. `SHA256SUMS` and `runtime-release.json` describe the published artifacts.

Desktop promotion is a separate reviewed pin update. This prerelease does not automatically update installed desktops.

## 0.2.2-rc.2 candidate

- Official source: `ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c` (`dsh-v0.2.2-rc.2`).
- Exact official npm dependency: `@deepseek-ai/dsh@0.2.2-rc.2`; clean npm 11.19.0 lock generation.
- Reviewed install-script allowlist remains limited to the official subprocess package, Google GenAI, Koffi, node-pty and protobufjs. Only the subprocess package version changes.
- This is a prerelease candidate. Personal and enterprise desktop compatibility and promotion are tracked independently from these four native runtime builds.
