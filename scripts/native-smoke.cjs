// 使用官方依赖的 FFI 和 PTY 实际执行一次，防止漏装原生库或 spawn-helper 权限。
const assert = require('node:assert/strict')
const { createRequire } = require('node:module')
const { join } = require('node:path')
const runtimeRequire = createRequire(join(process.argv[2], 'package.json'))
assert.ok(runtimeRequire('koffi').version)
const pty = runtimeRequire('node-pty').spawn(process.execPath,
  ['-e', 'process.stdout.write("JOYHOUSE_PTY_OK")'], {
    name: 'xterm-color', cols: 80, rows: 24, cwd: process.argv[2], env: process.env,
  })
let output = ''
const timer = setTimeout(() => {
  pty.kill()
  console.error('Native terminal smoke timed out')
  process.exit(1)
}, 15000)
pty.onData(data => { output += data })
pty.onExit(({ exitCode }) => {
  clearTimeout(timer)
  assert.equal(exitCode, 0)
  assert.match(output, /JOYHOUSE_PTY_OK/)
})
