import { readdirSync, watch } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const repoDir = path.resolve(dirname, '..')
const srcDir = path.join(repoDir, 'src')
const watchedFiles = [
  path.join(repoDir, 'package.json'),
  path.join(repoDir, 'tsconfig.json'),
]
const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const watchers = new Map()
const fileWatchers = []
const taskPriority = {
  build: 1,
  importmap: 2,
}

let activeTask = null
let pendingTask = null
let rescanTimer = null
let startTimer = null
let shuttingDown = false

const now = () =>
  new Date().toLocaleTimeString('en-GB', {
    hour12: false,
  })

const log = message => {
  console.log(`[plugin-watch ${now()}] ${message}`)
}

const normalizePath = targetPath => targetPath.split(path.sep).join('/')

const collectDirectories = directory => {
  const directories = [directory]

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue
    }

    directories.push(...collectDirectories(path.join(directory, entry.name)))
  }

  return directories
}

const createTask = relativePath => {
  const normalizedPath = normalizePath(relativePath)
  const refreshImportMap =
    normalizedPath === 'package.json'
    || normalizedPath === 'src/types.ts'
    || normalizedPath.startsWith('src/exports/')

  if (refreshImportMap) {
    return {
      args: ['run', 'generate:importmap'],
      label: `refresh import map after ${normalizedPath}`,
      type: 'importmap',
    }
  }

  return {
    args: ['--dir', '..', 'build'],
    label: `rebuild plugin after ${normalizedPath}`,
    type: 'build',
  }
}

const mergeTasks = (currentTask, nextTask) => {
  if (!currentTask) {
    return nextTask
  }

  if (taskPriority[nextTask.type] >= taskPriority[currentTask.type]) {
    return nextTask
  }

  return currentTask
}

const closeWatchers = () => {
  for (const watcher of watchers.values()) {
    watcher.close()
  }

  watchers.clear()

  for (const watcher of fileWatchers) {
    watcher.close()
  }

  fileWatchers.length = 0
}

const runTask = task => {
  log(`${task.label} started`)

  const child = spawn(pnpmCommand, task.args, {
    cwd: dirname,
    env: process.env,
    stdio: 'inherit',
  })

  activeTask = child

  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return
    }

    if ((code ?? 0) === 0 && !signal) {
      log(`${task.label} finished`)
    } else {
      log(`${task.label} failed with ${signal ?? `code ${code ?? 1}`}`)
    }

    activeTask = null

    if (!pendingTask) {
      return
    }

    const nextTask = pendingTask
    pendingTask = null
    runTask(nextTask)
  })
}

const scheduleTask = relativePath => {
  pendingTask = mergeTasks(pendingTask, createTask(relativePath))

  if (activeTask) {
    return
  }

  clearTimeout(startTimer)
  startTimer = setTimeout(() => {
    const nextTask = pendingTask
    pendingTask = null

    if (nextTask) {
      runTask(nextTask)
    }
  }, 120)
}

const syncDirectoryWatchers = () => {
  const nextDirectories = new Set(collectDirectories(srcDir))

  for (const directory of nextDirectories) {
    if (watchers.has(directory)) {
      continue
    }

    const watcher = watch(directory, (_eventType, fileName) => {
      const changedPath = fileName
        ? path.join(directory, fileName.toString())
        : directory
      const relativePath = normalizePath(path.relative(repoDir, changedPath))

      clearTimeout(rescanTimer)
      rescanTimer = setTimeout(() => {
        syncDirectoryWatchers()
      }, 120)

      scheduleTask(relativePath || 'src')
    })

    watcher.on('error', error => {
      if (shuttingDown) {
        return
      }

      log(`watch error in ${normalizePath(path.relative(repoDir, directory))}: ${error.message}`)
      syncDirectoryWatchers()
    })

    watchers.set(directory, watcher)
  }

  for (const [directory, watcher] of watchers.entries()) {
    if (nextDirectories.has(directory)) {
      continue
    }

    watcher.close()
    watchers.delete(directory)
  }
}

const shutdown = exitCode => {
  if (shuttingDown) {
    return
  }

  shuttingDown = true
  clearTimeout(rescanTimer)
  clearTimeout(startTimer)
  closeWatchers()

  if (activeTask && !activeTask.killed) {
    activeTask.kill('SIGTERM')
  }

  setTimeout(() => {
    process.exit(exitCode)
  }, 200).unref()
}

process.on('SIGINT', () => {
  shutdown(0)
})

process.on('SIGTERM', () => {
  shutdown(0)
})

syncDirectoryWatchers()

for (const filePath of watchedFiles) {
  const watcher = watch(filePath, () => {
    scheduleTask(path.relative(repoDir, filePath))
  })

  watcher.on('error', error => {
    if (shuttingDown) {
      return
    }

    log(`watch error in ${normalizePath(path.relative(repoDir, filePath))}: ${error.message}`)
  })

  fileWatchers.push(watcher)
}

log('watching root plugin source for rebuilds')