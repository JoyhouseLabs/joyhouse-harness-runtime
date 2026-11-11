import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import { targets, sha256, createRelease } from './contracts.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const directory = resolve(process.argv[2] ?? join(root, 'dist'))
const pkg = JSON.parse(await readFile(join(root, 'package.json')))
const config = JSON.parse(await readFile(join(root, 'runtime.json')))
const lockSha256 = sha256(await readFile(join(root, 'package-lock.json')))
const reports = []
for (const asset of Object.values(targets)) {
  const report = JSON.parse(await readFile(join(directory, `${asset}.json`)))
  assert.equal(report.sha256, sha256(await readFile(join(directory, asset))))
  assert.equal(report.lockSha256, lockSha256)
  reports.push(report)
}
const release = createRelease(pkg, config, reports, process.env.RUNTIME_BUILD_COMMIT, process.env.RUNTIME_BUILD_ID)
await writeFile(join(directory, 'runtime-release.json'), JSON.stringify(release, null, 2) + '\n')
await writeFile(join(directory, 'SHA256SUMS'), reports.map(report => `${report.sha256}  ${report.asset}\n`).join(''))
console.log(release.release.tag)
