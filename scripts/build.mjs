import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile, writeFile, copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { validateLock, validateTarget, sha256 } from './contracts.mjs'
import { smoke } from './smoke.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const pkg = JSON.parse(await readFile(join(root, 'package.json')))
const config = JSON.parse(await readFile(join(root, 'runtime.json')))
const lockBytes = await readFile(join(root, 'package-lock.json'))
validateLock(pkg, JSON.parse(lockBytes))
assert.equal(process.versions.node, config.nodeVersion, 'build with the pinned Node version')
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
function run(command, args, cwd, capture = false) {
  return execFileSync(command, args, { cwd, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit',
    shell: process.platform === 'win32' && command.endsWith('.cmd') })
}
const npmVersion = run(npm, ['--version'], root, true).trim()
assert.equal(npmVersion, config.npmVersion, 'build with the pinned npm version')
const target = `${process.platform}-${process.arch}`
const asset = validateTarget(target)
const head = run('git', ['rev-parse', 'HEAD'], root, true).trim()
const commit = process.env.RUNTIME_BUILD_COMMIT ?? head
assert.match(commit, /^[0-9a-f]{40}$/)
assert.equal(commit, head, 'build provenance must identify the checked-out commit')
assert.equal(run('git', ['status', '--porcelain', '--', '.'], root, true).trim(), '',
  'commit packaging inputs before building a releasable runtime')
await mkdir(join(root, '.build'), { recursive: true })
await mkdir(join(root, 'dist'), { recursive: true })
for (const name of [asset, `${asset}.json`])
  await rm(join(root, 'dist', name), { force: true })
const staging = await mkdtemp(join(root, '.build', `${target}-`))
try {
  for (const file of ['package.json', 'package-lock.json', '.npmrc'])
    await copyFile(join(root, file), join(staging, file))
  run(npm, ['ci', '--omit=dev', '--include=optional', '--ignore-scripts=false', '--no-audit', '--no-fund'], staging)
  await smoke(staging, pkg.version)
  const report = { schemaVersion: 1, target, asset, version: pkg.version, commit,
    sourceCommit: config.source.commit, node: process.versions.node, npm: npmVersion,
    lockSha256: sha256(lockBytes), smoke: 'passed' }
  await writeFile(join(staging, 'joyhouse-runtime-build.json'), JSON.stringify(report, null, 2) + '\n')
  run(process.env.PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3'),
    [join(root, 'scripts/archive.py'), staging, join(root, 'dist', asset)], root)
  report.sha256 = sha256(await readFile(join(root, 'dist', asset)))
  await writeFile(join(root, 'dist', `${asset}.json`), JSON.stringify(report, null, 2) + '\n')
  console.log(`${asset} sha256:${report.sha256}`)
}
finally {
  await rm(staging, { recursive: true, force: true })
}
