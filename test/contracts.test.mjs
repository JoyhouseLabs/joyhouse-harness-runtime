import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { targets, validateLock, validateTarget, createRelease } from '../scripts/contracts.mjs'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)))
const config = JSON.parse(readFileSync(new URL('../runtime.json', import.meta.url)))
const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url)))
const commit = 'a'.repeat(40)
function reports() {
  return Object.entries(targets).map(([target, asset]) => ({
    target, asset, version: pkg.version, commit, sourceCommit: config.source.commit,
    node: config.nodeVersion, npm: config.npmVersion, smoke: 'passed',
    sha256: 'b'.repeat(64), lockSha256: 'c'.repeat(64),
  }))
}

test('reviewed lock contains only registry dependencies and one Harness version', () => {
  validateLock(pkg, lock)
})
test('rejects Git dependencies, missing integrity, mixed Harness and local links', () => {
  for (const replacement of [
    { resolved: 'https://example.com/unreviewed.tgz' },
    { integrity: '' }, { version: '0.1.1-rc.2' }, { link: true },
  ]) {
    const changed = structuredClone(lock)
    Object.assign(changed.packages['node_modules/@deepseek-ai/dsh'], replacement)
    assert.throws(() => validateLock(pkg, changed))
  }
})
test('release requires four distinct verified platforms and matching build inputs', () => {
  const release = createRelease(pkg, config, reports(), commit, '1231')
  assert.equal(release.release.tag, `dsh-${pkg.version}-1231`)
  assert.equal(Object.keys(release.release.assets).length, 4)
  assert.throws(() => createRelease(pkg, config, reports().slice(1), commit, '1231'))
  for (const replacement of [
    { target: 'linux-arm64' }, { smoke: 'skipped' }, { commit: 'd'.repeat(40) },
    { lockSha256: 'd'.repeat(64) }, { node: '22.22.0' },
    { sourceCommit: 'd'.repeat(40) }, { asset: '../untrusted.zip' },
  ]) {
    const changed = reports()
    Object.assign(changed[0], replacement)
    assert.throws(() => createRelease(pkg, config, changed, commit, '1231'))
  }
  const duplicates = reports()
  duplicates[1] = duplicates[0]
  assert.throws(() => createRelease(pkg, config, duplicates, commit, '1231'))
})
test('unknown architectures do not receive an x64 archive', () => {
  assert.throws(() => validateTarget('win32-arm64'))
  assert.throws(() => validateTarget('linux-arm64'))
})
test('new install-script versions require explicit review', () => {
  const changed = structuredClone(pkg)
  changed.allowScripts = {}
  assert.throws(() => validateLock(changed, lock), /review install scripts/)
})
