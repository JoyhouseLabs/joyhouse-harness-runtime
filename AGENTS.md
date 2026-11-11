# Joyhouse Harness runtime packaging

- This directory is a standalone packaging repository, intended for `JoyhouseLabs/joyhouse-harness-runtime`. It can be exported with Git subtree; keep all scripts independent of the product parent directory.
- The only direct runtime dependency is an exact official `@deepseek-ai/dsh` npm version. Do not copy third-party built archives, patched source or private product data into the runtime.
- Own the build and release process, not a fork of Harness internals. Preserve upstream licenses and original package files. Transitive npm dependencies remain necessary and must be locked with registry integrity.
- `package-lock.json` is separate from the desktop pnpm lock. Generate it from a clean directory with the pinned npm, review it, then build using `npm ci`. Never regenerate locks during a release build.
- Build natively on each supported platform. Unknown architectures must fail, not silently receive another architecture's native modules. CLI and authenticated Web smoke tests must pass; no release bypass flag.
- Publish only after all four reports match the same commit, lock hash, runtime version and build toolchain. Preserve fixed release tags and SHA-256 assets; do not overwrite releases or auto-promote `latest` into the product.
- Package artifacts never contain user DSH_HOME, credentials, notes, caches or model keys. Smoke tests use a temporary home and redact launch tokens.
- Changing the desktop runtime source is separate from packaging. Only promote a real published release with all four verified digests; never invent checksums or point a desktop pin at a pending URL.
