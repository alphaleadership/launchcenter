import { spawn } from 'bun'

console.log('🚀 Starting Launch Center...')

const server = spawn({
  cmd: ['bun', 'run', 'server/index.ts'],
  stdout: 'inherit',
  stderr: 'inherit'
})

const client = spawn({
  cmd: ['bun', 'run', 'dev'],
  cwd: './client',
  stdout: 'inherit',
  stderr: 'inherit'
})

process.on('SIGINT', () => {
  console.log('Shutting down...')
  server.kill()
  client.kill()
  process.exit()
})
