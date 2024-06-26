import { createApp } from './http'
import { parseArgv } from './argv'
import { loadConfigAsync, Configuration } from './Configuration'
import { getLogger, setDefaultLogLevel, LogLevels } from '@/common/Logger'
import { assertNotNullable } from '@/common/assert'

(async function (): Promise<void> {
  const argv = parseArgv()
  setDefaultLogLevel(argv.loglevel)
  const config = await loadConfigAsync(argv.configPath, 0)
  assertNotNullable(config.content, 'config must be object.')
  const configuration = new Configuration(argv, config.content, config.stat.mtimeMs)
  const log = getLogger('api')
  if (log.enabledFor(LogLevels.DEBUG)) {
    log.debug('configPath', argv.configPath)
    log.debug('logLevel', argv.loglevel)
    log.debug('port', argv.port)
    log.debug('Configuration', JSON.stringify(configuration))
  }

  const app = createApp(configuration)
  app.listen(argv.port)
})()
