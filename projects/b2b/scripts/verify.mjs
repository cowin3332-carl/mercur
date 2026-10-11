import { spawn } from 'node:child_process'
import { mkdirSync, openSync, closeSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const cwd = fileURLToPath(new URL('../', import.meta.url))
mkdirSync(`${cwd}/.local`, { recursive: true })
const children = []
const logs = []
const env = { ...process.env, MEDUSA_DISABLE_TELEMETRY: 'true', NEXT_TELEMETRY_DISABLED: '1' }
function start(name, args) {
  const fd = openSync(`${cwd}/.local/${name}.log`, 'w')
  logs.push(fd)
  const child = spawn('pnpm', args, { cwd, env, detached: true, stdio: ['ignore', fd, fd] })
  children.push(child)
  return child
}
async function ready(url, child, timeout = 120000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Server exited with ${child.exitCode}; see .local logs`)
    try { const response = await fetch(url, { signal: AbortSignal.timeout(2000) }); if (response.ok) return } catch {}
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error(`Server not ready: ${url}; see .local logs`)
}
const run = (args) => new Promise((resolve, reject) => {
  const child = spawn('pnpm', args, { cwd, env, stdio: 'inherit' })
  child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${args.join(' ')} exited ${code}`)))
})
try {
  const backend = start('backend', ['dev:backend'])
  await ready('http://localhost:9000/health', backend)
  console.log('Backend ready')
  const storefront = start('storefront', ['dev:storefront'])
  await ready('http://localhost:8000/gb/account', storefront)
  console.log('B2B storefront ready')
  await run(['smoke'])
  if (process.argv.includes('--build')) await run(['--filter', '@b2b-starter/storefront', 'build'])
} finally {
  for (const child of children) { try { process.kill(-child.pid, 'SIGTERM') } catch {} }
  for (const fd of logs) closeSync(fd)
}
