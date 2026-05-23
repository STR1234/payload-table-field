import { spawn } from 'node:child_process'

const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

const children = new Set()
let shuttingDown = false

const stopChildren = signal => {
  for (const child of children) {
    if (!child.killed) {
      child.kill(signal)
    }
  }
}

const shutdown = exitCode => {
  if (shuttingDown) {
    return
  }

  shuttingDown = true
  process.exitCode = exitCode
  stopChildren('SIGTERM')

  setTimeout(() => {
    stopChildren('SIGKILL')
  }, 2_000).unref()
}

const spawnProcess = (name, args) => {
  const child = spawn(pnpmCommand, args, {
    env: process.env,
    stdio: 'inherit',
  })

  children.add(child)

  child.on('exit', () => {
    children.delete(child)
  })

  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return
    }

    const exitCode = code ?? (signal ? 1 : 0)

    if (exitCode !== 0) {
      console.error(`[${name}] exited with ${signal ?? `code ${exitCode}`}`)
    }

    shutdown(exitCode)
  })

  return child
}

process.on('SIGINT', () => {
  shutdown(0)
})

process.on('SIGTERM', () => {
  shutdown(0)
})

spawnProcess('plugin-watch', ['run', 'dev:plugin-watch'])
spawnProcess('next', ['run', 'dev:next'])