// 使用官方依赖的 FFI 和 PTY 实际执行一次，防止漏装原生库或 spawn-helper 权限。
const assert = require('node:assert/strict')
const { createRequire } = require('node:module')
const { join } = require('node:path')
const runtimeRequire = createRequire(join(process.argv[2], 'package.json'))
console.log('Checking native FFI')
assert.ok(runtimeRequire('koffi').version)
console.log('Starting native PTY')
const pty = runtimeRequire('node-pty').spawn(process.execPath,
  ['-e', 'process.stdout.write("JOYHOUSE_PTY_OK")'], {
    name: 'xterm-color', cols: 80, rows: 24, cwd: process.argv[2], env: process.env,
  })
console.log('Native PTY started')
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
  console.log('Native FFI and PTY smoke passed')
  // Windows 的 ConPTY worker 可能仍持有句柄；子进程退出和输出已验证后结束独立探针。
  process.exit(0)
})
