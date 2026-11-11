import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'

export const targets = Object.freeze({
  'linux-x64': 'deepseek-harness-pkg-linux.zip',
  'darwin-arm64': 'deepseek-harness-pkg-macos-arm64.zip',
  'darwin-x64': 'deepseek-harness-pkg-macos-x64.zip',
  'win32-x64': 'deepseek-harness-pkg-windows.zip',
})

export function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

export function validateLock(pkg, lock) {
  assert.equal(pkg.private, true)
  assert.deepEqual(pkg.dependencies, { '@deepseek-ai/dsh': pkg.version })
  assert.match(pkg.version, /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/)
  assert.equal(lock.lockfileVersion, 3)
  assert.deepEqual(lock.packages[''].dependencies, pkg.dependencies)
  assert.equal(lock.packages['node_modules/@deepseek-ai/dsh'].version, pkg.version)
  for (const [path, entry] of Object.entries(lock.packages)) {
    if (!path) continue
    assert.ok(path.startsWith('node_modules/') && !path.split('/').includes('..'), `unsafe package path: ${path}`)
    assert.equal(entry.link, undefined, `workspace link is not distributable: ${path}`)
    const url = new URL(entry.resolved)
    assert.equal(url.origin, 'https://registry.npmjs.org', `unapproved registry: ${path}`)
    assert.equal(url.username + url.password, '')
    assert.match(entry.integrity, /^sha512-[A-Za-z0-9+/]+={0,2}$/, `missing registry integrity: ${path}`)
    if (entry.hasInstallScript) {
      const name = path.split('node_modules/').at(-1)
      assert.equal(pkg.allowScripts?.[`${name}@${entry.version}`], true,
        `review install scripts before building: ${name}@${entry.version}`)
    }
    if (/(?:^|\/)node_modules\/@deepseek-ai\/dsh(?:-[^/]+)?$/.test(path))
      assert.equal(entry.version, pkg.version, `mixed Harness versions: ${path}`)
  }
}

export function validateTarget(target) {
  assert.ok(Object.hasOwn(targets, target), `unsupported target: ${target}`)
  return targets[target]
}

export function createRelease(pkg, config, reports, commit, buildId) {
  assert.match(commit, /^[0-9a-f]{40}$/)
  assert.match(buildId, /^\d+$/)
  assert.equal(config.repository, 'https://github.com/JoyhouseLabs/joyhouse-harness-runtime')
  assert.equal(reports.length, Object.keys(targets).length, 'all four platforms must pass')
  const assets = {}
  const lockHashes = new Set()
  for (const report of reports) {
    const asset = validateTarget(report.target)
    assert.equal(report.asset, asset)
    assert.equal(report.version, pkg.version)
    assert.equal(report.commit, commit)
    assert.equal(report.sourceCommit, config.source.commit)
    assert.equal(report.smoke, 'passed', 'unverified runtime cannot be promoted')
    assert.equal(report.node, config.nodeVersion)
    assert.equal(report.npm, config.npmVersion)
    assert.match(report.sha256, /^[0-9a-f]{64}$/)
    assert.match(report.lockSha256, /^[0-9a-f]{64}$/)
    assert.ok(!Object.hasOwn(assets, asset), 'duplicate platform')
    assets[asset] = `sha256:${report.sha256}`
    lockHashes.add(report.lockSha256)
  }
  assert.equal(lockHashes.size, 1, 'platforms must use the same lockfile')
  return { package: '@deepseek-ai/dsh', version: pkg.version,
    release: { repository: config.repository, tag: `dsh-${pkg.version}-${buildId}`, commit, assets } }
}
