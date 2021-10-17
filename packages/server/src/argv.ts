import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import fs from 'fs'
import path from 'path'
import { parseLogLevel, LogLevel } from 'common'

const ENV_CONFIG = 'LIVE_COMMENT_SERVER_CONFIG'
const DEFAULT_PORT = 8080

function getHomeConfigPath(): string {
  const home = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME']
  if (!home) {
    throw new Error('Home directory does not exist.')
  }
  return path.join(home, '.config', 'live-comment', 'server.config.json')
}

function isFile(path: string): boolean {
  try {
    return fs.statSync(path).isFile()
  } catch (e: unknown) {
    return false
  }
}

function findConfigPath(v?: string): string {
  // Specified at command line.
  if (v && isFile(v)) {
    return v
  }
  // Specified by environment variable.
  const envConfigPath = process.env[ENV_CONFIG]
  if (envConfigPath) {
    return envConfigPath
  }
  // In home directory.
  const homeConfigPath = getHomeConfigPath()
  if (isFile(homeConfigPath)) {
    return homeConfigPath
  }
  // Repository default.
  const pathInRepository = './config/server.config.json'
  if (isFile(pathInRepository)) {
    return pathInRepository
  }
  throw new Error(`Configuration file does not exist in [${v}, ${homeConfigPath}, ${pathInRepository}]`)
}

function parsePort(v: unknown): number {
  const n = Number(v)
  return isNaN(n) ? DEFAULT_PORT : n
}

export type Argv = {
  configPath: string
  port: number
  loglevel: LogLevel
}

export function parseArgv(): Argv {
  const argv = yargs(hideBin(process.argv))
    .option('configPath', {
      alias: 'c',
      type: 'string',
      description: 'Path to configuration file (JSON).',
      default: undefined,
      coerce: findConfigPath
    })
    .option('port', {
      alias: 'p',
      type: 'number',
      description: `WebSocket server listen port (default: ${DEFAULT_PORT}).`,
      default: undefined,
      coerce: parsePort
    })
    .option('loglevel', {
      alias: 'l',
      type: 'string',
      description: 'Log level (OFF, ERROR, WARN, INFO, DEBUG, TRACE, default: INFO).',
      default: undefined,
      coerce: parseLogLevel
    })
    .help()
  return argv.argv
}
