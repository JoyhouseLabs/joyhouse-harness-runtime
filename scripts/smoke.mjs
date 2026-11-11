import assert from 'node:assert/strict'
import { spawn, execFileSync } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { get } from 'node:http'
import { fileURLToPath } from 'node:url'

function request(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = get(url, { headers, timeout: 5000 }, (res) => {
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers,
        body: Buffer.concat(chunks).toString() }))
    })
    req.on('timeout', () => req.destroy(new Error('HTTP timeout')))
    req.on('error', reject)
  })
}

export async function smoke(root, version) {
  execFileSync(process.execPath, [fileURLToPath(new URL('./native-smoke.cjs', import.meta.url)), root],
    { timeout: 20000, stdio: 'inherit' })
  const entry = join(root, 'node_modules/@deepseek-ai/dsh/lib/bin.js')
  assert.equal(execFileSync(process.execPath, [entry, '--version'], {
    encoding: 'utf8', timeout: 30000,
  }).trim(), version)
  const home = await mkdtemp(join(tmpdir(), 'joyhouse-runtime-smoke-'))
  const child = spawn(process.execPath, [entry, '--profile', 'web', '--host', '127.0.0.1', '--port', '0', '--no-open'], {
    cwd: root, env: { ...process.env, DSH_HOME: home }, stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  let timer
  const exited = new Promise(resolve => child.once('close', resolve))
  try {
    const launch = await new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error('Web startup timeout')), 90000)
      child.once('error', reject)
      child.once('exit', (code) => reject(new Error(`Web exited early: ${code}`)))
      function consume(chunk) {
        output = (output + chunk.toString()).slice(-65536)
        const match = output.replace(/\x1b\[[0-9;]*m/g, '').match(/dsh web: (http:\/\/127\.0\.0\.1:\d+\/\?token=[A-Za-z0-9_-]+)/)
        if (match) resolve(match[1])
      }
      child.stdout.on('data', consume)
      child.stderr.on('data', consume)
    })
    clearTimeout(timer)
    const auth = await request(launch)
    assert.equal(auth.status, 303)
    assert.equal(auth.headers.location, './')
    const cookies = (auth.headers['set-cookie'] ?? []).filter(value => value.startsWith('dsh-auth-'))
    assert.equal(cookies.length, 1)
    const response = await request(new URL('/', launch), { Cookie: cookies[0].split(';')[0] })
    assert.equal(response.status, 200)
    assert.match(response.body, /<html|<!doctype html/i)
  }
  catch (error) {
    // 启动令牌只参与本机测试，不写入构建日志。
    console.error(output.replace(/([?&]token=)[^\s"'&]+/g, '$1[REDACTED]'))
    throw error
  }
  finally {
    clearTimeout(timer)
    if (child.exitCode === null) {
      if (process.platform === 'win32') {
        try { execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' }) }
        catch { child.kill() }
      }
      else child.kill('SIGTERM')
    }
    const killTimer = setTimeout(() => child.kill('SIGKILL'), 5000)
    await exited
    clearTimeout(killTimer)
    await rm(home, { recursive: true, force: true })
  }
}
