/**
 * @jest-environment node
 */
import { Configuration, loadConfigAsync,  } from './Configuration'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { assertNotNullable } from '@/common/assert'
import { LogLevels } from '@/common/Logger'
import { Argv } from './argv'
import { test, expect, beforeEach, afterEach } from '@jest/globals'

let testDataRoot: string
let argv: Argv

beforeEach(() => {
  testDataRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ConfigurationSpecTestData'))

  argv = {
    configPath: './server.config.json',
    port: 8080,
    loglevel: LogLevels.INFO,
  }
})

afterEach(() => {
  fs.rmSync(testDataRoot, { recursive: true, force: true })
})

function writeConfig(filePath: string, cfg?: Record<string, unknown>): void {
  const config = cfg ?? {
    rooms: [
      {
        room: 'test',
        hash: 'ee26b0dd4af7e749aa1a8ee3c10ae9923f618980772e473f8819a5d4940e0db27ac185f8a0e1d5f84f88bc887fd67b143732c304cc5fa9ad8e6f57f50028a8ff',
      },
      {
        room: 'hoge',
        hash: 'dbb50237ad3fa5b818b8eeca9ca25a047e0f29517db2b25f4a8db5f717ff90bf0b7e94ef4f5c4e313dfb06e48fbd9a2e40795906a75c470cdb619cf9c2d4f6d9',
      },
    ],
    jwtPrivateKeyPath: path.join(testDataRoot, 'jwt.key'),
    jwtPublicKeyPath: path.join(testDataRoot, 'jwt.key.pub'),
    corsOrigins: ['/https://w+\\.live-comment\\.ga$/', 'http://localhost:8888']
  }
  fs.writeFileSync(filePath, JSON.stringify(config))
  if (!cfg) {
    createFile(config.jwtPrivateKeyPath as string)
    createFile(config.jwtPublicKeyPath as string)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function writeConfigSaml(filePath: string, samlConfig?: Record<string, any>) {
  const config = {
    rooms: [
      {
        room: 'test',
        hash: 'ee26b0dd4af7e749aa1a8ee3c10ae9923f618980772e473f8819a5d4940e0db27ac185f8a0e1d5f84f88bc887fd67b143732c304cc5fa9ad8e6f57f50028a8ff',
      },
      {
        room: 'hoge',
        hash: 'dbb50237ad3fa5b818b8eeca9ca25a047e0f29517db2b25f4a8db5f717ff90bf0b7e94ef4f5c4e313dfb06e48fbd9a2e40795906a75c470cdb619cf9c2d4f6d9',
      },
    ],
    jwtPrivateKeyPath: path.join(testDataRoot, 'jwt.key'),
    jwtPublicKeyPath: path.join(testDataRoot, 'jwt.key.pub'),
    corsOrigins: ['/https://w+\\.live-comment\\.ga$/', 'http://localhost:8888'],
    saml: samlConfig ?? {
      cookieSecret: 'cookieSecret',
      path: '/saml/acs',
      entryPoint: 'https://idp.example.com/idp/SSOService.php',
      issuer: 'issuer',
      certPaths: [path.join(testDataRoot, 'idp.0.crt'), path.join(testDataRoot, 'idp.1.cert')],
      decryption: {
        keyPath:  path.join(testDataRoot, 'decrypt.key'),
        certPath: path.join(testDataRoot, 'decrypt.cert'),
      },
      signing: {
        keyPath: path.join(testDataRoot, 'sign.key'),
        certPaths: [path.join(testDataRoot, 'sign.0.crt'), path.join(testDataRoot, 'sign.1.cert')],
      },
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(config))
  createFile(config.jwtPrivateKeyPath, 'jwtPrivateKey')
  createFile(config.jwtPublicKeyPath, 'jwtPublicKey')
  if (Array.isArray(config.saml.certPaths) && config.saml.certPaths.length === 2) {
    createFile(config.saml.certPaths[0], 'cert0')
    createFile(config.saml.certPaths[1], 'cert1')
  }
  if (config.saml.decryption?.keyPath) {
    createFile(config.saml.decryption.keyPath, 'decryptionKey')
  }
  if (config.saml.decryption?.certPath) {
    createFile(config.saml.decryption.certPath, 'decryptionCert')
  }
  if (config.saml.signing?.keyPath) {
    createFile(config.saml.signing.keyPath, 'signingKey')
  }
  if (Array.isArray(config.saml.signing?.certPaths) && config.saml.signing.certPaths.length === 2) {
    createFile(config.saml.signing.certPaths[0], 'signingCert0')
    createFile(config.saml.signing.certPaths[1], 'signingCert1')
  }

  return config
}

function createFile(path: string, content?: string): void {
  const fd = fs.openSync(path, 'w')
  if (content) {
    fs.writeSync(fd, content)
  }
  fs.closeSync(fd)
}

describe('loadConfigAsync', () => {
  test('Error if configuration file does not have any room definition', async () => {
    const configPath = path.join(testDataRoot, 'test.json')
    writeConfig(configPath, {})

    await expect(loadConfigAsync(configPath, 0))
      .rejects
      .toThrow('Room definition does not exist.')
  })

  test('Error if configuration file have empty rooms', async () => {
    const configPath = path.join(testDataRoot, 'test.json')
    writeConfig(configPath, { rooms: [] })

    await expect(loadConfigAsync(configPath, 0))
      .rejects
      .toThrow('Room definition does not exist.')
  })

  test('Error if a room has no name', async () => {
    const configPath = path.join(testDataRoot, 'test.json')
    writeConfig(configPath, { rooms: [{ hash: 'hash' }] })

    await expect(loadConfigAsync(configPath, 0))
      .rejects
      .toThrow('Unexpected room definition: {"hash":"hash"}')
  })

  test('Error if a room has no hash', async () => {
    const configPath = path.join(testDataRoot, 'test.json')
    writeConfig(configPath, { rooms: [{ room: 'room' }] })

    await expect(loadConfigAsync(configPath, 0))
      .rejects
      .toThrow('Unexpected room definition: {"room":"room"}')
  })

  test('No jwtPrivateKeyPath', async () => {
    const configPath = path.join(testDataRoot, 'test.json')
    const soundFilePath = path.join(testDataRoot, 'soundFile.zip')
    const checksumPath = path.join(testDataRoot, 'soundFile.zip.md5')
    writeConfig(configPath, {
      rooms: [{ room: ' room', hash: 'hash' }],
      soundFilePath,
    })
    createFile(soundFilePath)
    createFile(checksumPath)

    await expect(loadConfigAsync(configPath, 0))
      .rejects
      .toThrow('jwtPrivateKeyPath is empty or undefined.')
  })

  test('jwtPrivateKeyPath does not exist', async () => {
    const configPath = path.join(testDataRoot, 'test.json')
    const soundFilePath = path.join(testDataRoot, 'soundFile.zip')
    const checksumPath = path.join(testDataRoot, 'soundFile.zip.md5')
    const jwtPrivateKeyPath = path.join(testDataRoot, 'jwt.key')
    writeConfig(configPath, {
      rooms: [{ room: ' room', hash: 'hash' }],
      soundFilePath,
      jwtPrivateKeyPath,
    })
    createFile(soundFilePath)
    createFile(checksumPath)

    await expect(loadConfigAsync(configPath, 0))
      .rejects
      .toThrow(`ENOENT: no such file or directory, stat '${jwtPrivateKeyPath}'`)
  })

  test('jwtPrivateKeyPath is not a file.', async () => {
    const configPath = path.join(testDataRoot, 'test.json')
    const soundFilePath = path.join(testDataRoot, 'soundFile.zip')
    const checksumPath = path.join(testDataRoot, 'soundFile.zip.md5')
    const jwtPrivateKeyPath = path.join(testDataRoot, 'jwt.key')
    writeConfig(configPath, {
      rooms: [{ room: ' room', hash: 'hash' }],
      soundFilePath,
      jwtPrivateKeyPath,
    })
    createFile(soundFilePath)
    createFile(checksumPath)
    fs.mkdirSync(jwtPrivateKeyPath)

    await expect(loadConfigAsync(configPath, 0))
      .rejects
      .toThrow(`${jwtPrivateKeyPath} is not a file.`)
  })

  test('No jwtPublicKeyPath', async () => {
    const configPath = path.join(testDataRoot, 'test.json')
    const soundFilePath = path.join(testDataRoot, 'soundFile.zip')
    const checksumPath = path.join(testDataRoot, 'soundFile.zip.md5')
    const jwtPrivateKeyPath = path.join(testDataRoot, 'jwt.key')
    writeConfig(configPath, {
      rooms: [{ room: ' room', hash: 'hash' }],
      soundFilePath,
      jwtPrivateKeyPath,
    })
    createFile(soundFilePath)
    createFile(checksumPath)
    createFile(jwtPrivateKeyPath)

    await expect(loadConfigAsync(configPath, 0))
      .rejects
      .toThrow('jwtPublicKeyPath is empty or undefined.')
  })

  test('jwtPublicKeyPath does not exist', async () => {
    const configPath = path.join(testDataRoot, 'test.json')
    const soundFilePath = path.join(testDataRoot, 'soundFile.zip')
    const checksumPath = path.join(testDataRoot, 'soundFile.zip.md5')
    const jwtPrivateKeyPath = path.join(testDataRoot, 'jwt.key')
    const jwtPublicKeyPath = path.join(testDataRoot, 'jwt.key.pub')
    writeConfig(configPath, {
      rooms: [{ room: ' room', hash: 'hash' }],
      soundFilePath,
      jwtPrivateKeyPath,
      jwtPublicKeyPath,
    })
    createFile(soundFilePath)
    createFile(checksumPath)
    createFile(jwtPrivateKeyPath)

    await expect(loadConfigAsync(configPath, 0))
      .rejects
      .toThrow(`ENOENT: no such file or directory, stat '${jwtPublicKeyPath}'`)
  })

  test('jwtPublicKeyPath is not a file.', async () => {
    const configPath = path.join(testDataRoot, 'test.json')
    const soundFilePath = path.join(testDataRoot, 'soundFile.zip')
    const checksumPath = path.join(testDataRoot, 'soundFile.zip.md5')
    const jwtPrivateKeyPath = path.join(testDataRoot, 'jwt.key')
    const jwtPublicKeyPath = path.join(testDataRoot, 'jwt.key.pub')
    writeConfig(configPath, {
      rooms: [{ room: ' room', hash: 'hash' }],
      soundFilePath,
      jwtPrivateKeyPath,
      jwtPublicKeyPath
    })
    createFile(soundFilePath)
    createFile(checksumPath)
    createFile(jwtPrivateKeyPath)
    fs.mkdirSync(jwtPublicKeyPath)

    await expect(loadConfigAsync(configPath, 0))
      .rejects
      .toThrow(`${jwtPublicKeyPath} is not a file.`)
  })

  test('No corsOrigins', async () => {
    const configPath = path.join(testDataRoot, 'test.json')
    const soundFilePath = path.join(testDataRoot, 'soundFile.zip')
    const checksumPath = path.join(testDataRoot, 'soundFile.zip.md5')
    const jwtPrivateKeyPath = path.join(testDataRoot, 'jwt.key')
    const jwtPublicKeyPath = path.join(testDataRoot, 'jwt.key.pub')
    writeConfig(configPath, {
      rooms: [{ room: ' room', hash: 'hash' }],
      soundFilePath,
      jwtPrivateKeyPath,
      jwtPublicKeyPath,
    })
    createFile(soundFilePath)
    createFile(checksumPath)
    createFile(jwtPrivateKeyPath)
    createFile(jwtPublicKeyPath)

    await expect(loadConfigAsync(configPath, 0))
      .rejects
      .toThrow('corsOrigins is not defined.')
  })

  test('Get SAML configuration OK', async () => {
    const configPath = path.join(testDataRoot, 'test.json')
    const config = writeConfigSaml(configPath)

    const cache = await loadConfigAsync(configPath, 0)
    assertNotNullable(cache.content, 'cache.content must be defined.')

    const sut = new Configuration(argv, cache.content, cache.stat.mtimeMs)

    expect(sut.saml).toEqual({
      cookieSecret: 'cookieSecret',
      path: '/saml/acs',
      entryPoint: 'https://idp.example.com/idp/SSOService.php',
      issuer: 'issuer',
      cert: [
        fs.readFileSync(config.saml.certPaths[0]).toString(),
        fs.readFileSync(config.saml.certPaths[1]).toString(),
      ],
      decryptionPvk: fs.readFileSync(config.saml.decryption.keyPath).toString(),
      decryptionCert: fs.readFileSync(config.saml.decryption.certPath).toString(),
      privateKey: fs.readFileSync(config.saml.signing.keyPath).toString(),
      signingCert: [
        fs.readFileSync(config.saml.signing.certPaths[0]).toString(),
        fs.readFileSync(config.saml.signing.certPaths[1]).toString(),
      ],
    })
  })

  test('Get SAML configuration without cookie secret', async () => {
    const configPath = path.join(testDataRoot, 'test.json')
    writeConfigSaml(configPath, {
      path: '/saml/acs',
      entryPoint: 'https://idp.example.com/idp/SSOService.php',
      issuer: 'issuer',
      certPaths: [path.join(testDataRoot, 'idp.0.crt'), path.join(testDataRoot, 'idp.1.cert')],
      decryption: {
        keyPath:  path.join(testDataRoot, 'decrypt.key'),
        certPath: path.join(testDataRoot, 'decrypt.cert'),
      },
      signing: {
        keyPath: path.join(testDataRoot, 'sign.key'),
        certPaths: [path.join(testDataRoot, 'sign.0.crt'), path.join(testDataRoot, 'sign.1.cert')],
      },
    })

    await expect(loadConfigAsync(configPath, 0)).rejects.toThrow('cookieSecret is empty or undefined.')
  })

  test('Get SAML configuration without path', async () => {
    const configPath = path.join(testDataRoot, 'test.json')
    writeConfigSaml(configPath, {
      cookieSecret: 'cookieSecret',
      entryPoint: 'https://idp.example.com/idp/SSOService.php',
      issuer: 'issuer',
      certPaths: [path.join(testDataRoot, 'idp.0.crt'), path.join(testDataRoot, 'idp.1.cert')],
      decryption: {
        keyPath:  path.join(testDataRoot, 'decrypt.key'),
        certPath: path.join(testDataRoot, 'decrypt.cert'),
      },
      signing: {
        keyPath: path.join(testDataRoot, 'sign.key'),
        certPaths: [path.join(testDataRoot, 'sign.0.crt'), path.join(testDataRoot, 'sign.1.cert')],
      },
    })

    await expect(loadConfigAsync(configPath, 0)).rejects.toThrow('path is empty or undefined.')
  })

  test('Get SAML configuration without entryPoint', async () => {
    const configPath = path.join(testDataRoot, 'test.json')
    writeConfigSaml(configPath, {
      cookieSecret: 'cookieSecret',
      path: '/saml/acs',
      issuer: 'issuer',
      certPaths: [path.join(testDataRoot, 'idp.0.crt'), path.join(testDataRoot, 'idp.1.cert')],
      decryption: {
        keyPath:  path.join(testDataRoot, 'decrypt.key'),
        certPath: path.join(testDataRoot, 'decrypt.cert'),
      },
      signing: {
        keyPath: path.join(testDataRoot, 'sign.key'),
        certPaths: [path.join(testDataRoot, 'sign.0.crt'), path.join(testDataRoot, 'sign.1.cert')],
      },
    })

    await expect(loadConfigAsync(configPath, 0)).rejects.toThrow('entryPoint is empty or undefined.')
  })

  test('Get SAML configuration without issuer', async () => {
    const configPath = path.join(testDataRoot, 'test.json')
    writeConfigSaml(configPath, {
      cookieSecret: 'cookieSecret',
      path: '/saml/acs',
      entryPoint: 'https://idp.example.com/idp/SSOService.php',
      certPaths: [path.join(testDataRoot, 'idp.0.crt'), path.join(testDataRoot, 'idp.1.cert')],
      decryption: {
        keyPath:  path.join(testDataRoot, 'decrypt.key'),
        certPath: path.join(testDataRoot, 'decrypt.cert'),
      },
      signing: {
        keyPath: path.join(testDataRoot, 'sign.key'),
        certPaths: [path.join(testDataRoot, 'sign.0.crt'), path.join(testDataRoot, 'sign.1.cert')],
      },
    })

    await expect(loadConfigAsync(configPath, 0)).rejects.toThrow('issuer is empty or undefined.')
  })

  test('Get SAML configuration without certPaths', async () => {
    const configPath = path.join(testDataRoot, 'test.json')
    writeConfigSaml(configPath, {
      cookieSecret: 'cookieSecret',
      path: '/saml/acs',
      entryPoint: 'https://idp.example.com/idp/SSOService.php',
      issuer: 'issuer',
      decryption: {
        keyPath:  path.join(testDataRoot, 'decrypt.key'),
        certPath: path.join(testDataRoot, 'decrypt.cert'),
      },
      signing: {
        keyPath: path.join(testDataRoot, 'sign.key'),
        certPaths: [path.join(testDataRoot, 'sign.0.crt'), path.join(testDataRoot, 'sign.1.cert')],
      },
    })

    await expect(loadConfigAsync(configPath, 0)).rejects.toThrow('certPaths is empty or undefined.')
  })

  test('Get SAML configuration with non-array certPaths', async () => {
    const configPath = path.join(testDataRoot, 'test.json')
    writeConfigSaml(configPath, {
      cookieSecret: 'cookieSecret',
      path: '/saml/acs',
      entryPoint: 'https://idp.example.com/idp/SSOService.php',
      issuer: 'issuer',
      certPaths: path.join(testDataRoot, 'idp.0.crt'),
      decryption: {
        keyPath:  path.join(testDataRoot, 'decrypt.key'),
        certPath: path.join(testDataRoot, 'decrypt.cert'),
      },
      signing: {
        keyPath: path.join(testDataRoot, 'sign.key'),
        certPaths: [path.join(testDataRoot, 'sign.0.crt'), path.join(testDataRoot, 'sign.1.cert')],
      },
    })

    await expect(loadConfigAsync(configPath, 0)).rejects.toThrow('certPaths is not an array.')
  })

  test('Get SAML configuration with empty array certPaths', async () => {
    const configPath = path.join(testDataRoot, 'test.json')
    writeConfigSaml(configPath, {
      cookieSecret: 'cookieSecret',
      path: '/saml/acs',
      entryPoint: 'https://idp.example.com/idp/SSOService.php',
      issuer: 'issuer',
      certPaths: [],
      decryption: {
        keyPath:  path.join(testDataRoot, 'decrypt.key'),
        certPath: path.join(testDataRoot, 'decrypt.cert'),
      },
      signing: {
        keyPath: path.join(testDataRoot, 'sign.key'),
        certPaths: [path.join(testDataRoot, 'sign.0.crt'), path.join(testDataRoot, 'sign.1.cert')],
      },
    })

    await expect(loadConfigAsync(configPath, 0)).rejects.toThrow('certPaths is empty or undefined')
  })

  test('Get SAML configuration with empty array certPaths', async () => {
    const configPath = path.join(testDataRoot, 'test.json')
    writeConfigSaml(configPath, {
      cookieSecret: 'cookieSecret',
      path: '/saml/acs',
      entryPoint: 'https://idp.example.com/idp/SSOService.php',
      issuer: 'issuer',
      certPaths: [],
      decryption: {
        keyPath:  path.join(testDataRoot, 'decrypt.key'),
        certPath: path.join(testDataRoot, 'decrypt.cert'),
      },
      signing: {
        keyPath: path.join(testDataRoot, 'sign.key'),
        certPaths: [path.join(testDataRoot, 'sign.0.crt'), path.join(testDataRoot, 'sign.1.cert')],
      },
    })

    await expect(loadConfigAsync(configPath, 0)).rejects.toThrow('certPaths is empty or undefined')
  })

  test('Get SAML configuration with certPaths no file', async () => {
    const configPath = path.join(testDataRoot, 'test.json')
    writeConfigSaml(configPath, {
      cookieSecret: 'cookieSecret',
      path: '/saml/acs',
      entryPoint: 'https://idp.example.com/idp/SSOService.php',
      issuer: 'issuer',
      certPaths: [path.join(testDataRoot, 'idp.0.crt'), path.join(testDataRoot, 'idp.1.cert')],
      decryption: {
        keyPath:  path.join(testDataRoot, 'decrypt.key'),
        certPath: path.join(testDataRoot, 'decrypt.cert'),
      },
      signing: {
        keyPath: path.join(testDataRoot, 'sign.key'),
        certPaths: [path.join(testDataRoot, 'sign.0.crt'), path.join(testDataRoot, 'sign.1.cert')],
      },
    })
    fs.rmSync(path.join(testDataRoot, 'idp.1.cert'))

    await expect(loadConfigAsync(configPath, 0)).rejects.toThrow(/idp\.1\.cert/)
  })

  test('Get SAML configuration without decryption', async () => {
    const configPath = path.join(testDataRoot, 'test.json')
    writeConfigSaml(configPath, {
      cookieSecret: 'cookieSecret',
      path: '/saml/acs',
      entryPoint: 'https://idp.example.com/idp/SSOService.php',
      issuer: 'issuer',
      certPaths: [path.join(testDataRoot, 'idp.0.crt'), path.join(testDataRoot, 'idp.1.cert')],
      signing: {
        keyPath: path.join(testDataRoot, 'sign.key'),
        certPaths: [path.join(testDataRoot, 'sign.0.crt'), path.join(testDataRoot, 'sign.1.cert')],
      },
    })

    await expect(loadConfigAsync(configPath, 0)).rejects.toThrow('Expected value (saml.decryption) not to be nullable, actually undefined.')
  })

  test('Get SAML configuration decryption.keyPath not a file', async () => {
    const configPath = path.join(testDataRoot, 'test.json')
    writeConfigSaml(configPath, {
      cookieSecret: 'cookieSecret',
      path: '/saml/acs',
      entryPoint: 'https://idp.example.com/idp/SSOService.php',
      issuer: 'issuer',
      certPaths: [path.join(testDataRoot, 'idp.0.crt'), path.join(testDataRoot, 'idp.1.cert')],
      decryption: {
        keyPath: path.join(testDataRoot, 'decrypt.key'),
        certPath: path.join(testDataRoot, 'decrypt.cert'),
      },
      signing: {
        keyPath: path.join(testDataRoot, 'sign.key'),
        certPaths: [path.join(testDataRoot, 'sign.0.crt'), path.join(testDataRoot, 'sign.1.cert')],
      },
    })
    fs.rmSync(path.join(testDataRoot, 'decrypt.key'))

    await expect(loadConfigAsync(configPath, 0)).rejects.toThrow(/^saml.decryption.keyPath: /)
  })

  test('Get SAML configuration decryption.certPath not a file', async () => {
    const configPath = path.join(testDataRoot, 'test.json')
    writeConfigSaml(configPath, {
      cookieSecret: 'cookieSecret',
      path: '/saml/acs',
      entryPoint: 'https://idp.example.com/idp/SSOService.php',
      issuer: 'issuer',
      certPaths: [path.join(testDataRoot, 'idp.0.crt'), path.join(testDataRoot, 'idp.1.cert')],
      decryption: {
        keyPath: path.join(testDataRoot, 'decrypt.key'),
        certPath: path.join(testDataRoot, 'decrypt.cert'),
      },
      signing: {
        keyPath: path.join(testDataRoot, 'sign.key'),
        certPaths: [path.join(testDataRoot, 'sign.0.crt'), path.join(testDataRoot, 'sign.1.cert')],
      },
    })
    fs.rmSync(path.join(testDataRoot, 'decrypt.cert'))

    await expect(loadConfigAsync(configPath, 0)).rejects.toThrow(/^saml.decryption.certPath: /)
  })

  test('Get SAML configuration without signing', async () => {
    const configPath = path.join(testDataRoot, 'test.json')
    writeConfigSaml(configPath, {
      cookieSecret: 'cookieSecret',
      path: '/saml/acs',
      entryPoint: 'https://idp.example.com/idp/SSOService.php',
      issuer: 'issuer',
      certPaths: [path.join(testDataRoot, 'idp.0.crt'), path.join(testDataRoot, 'idp.1.cert')],
      decryption: {
        keyPath: path.join(testDataRoot, 'decrypt.key'),
        certPath: path.join(testDataRoot, 'decrypt.cert'),
      },
    })

    await expect(loadConfigAsync(configPath, 0)).rejects.toThrow('Expected value (saml.signing) not to be nullable, actually undefined.')
  })

  test('Get SAML configuration signing.keyPath is not a file', async () => {
    const configPath = path.join(testDataRoot, 'test.json')
    writeConfigSaml(configPath, {
      cookieSecret: 'cookieSecret',
      path: '/saml/acs',
      entryPoint: 'https://idp.example.com/idp/SSOService.php',
      issuer: 'issuer',
      certPaths: [path.join(testDataRoot, 'idp.0.crt'), path.join(testDataRoot, 'idp.1.cert')],
      decryption: {
        keyPath: path.join(testDataRoot, 'decrypt.key'),
        certPath: path.join(testDataRoot, 'decrypt.cert'),
      },
      signing: {
        keyPath: path.join(testDataRoot, 'sign.key'),
        certPaths: [path.join(testDataRoot, 'sign.0.crt'), path.join(testDataRoot, 'sign.1.cert')],
      },
    })
    fs.rmSync(path.join(testDataRoot, 'sign.key'))

    await expect(loadConfigAsync(configPath, 0)).rejects.toThrow(/^saml.signing.keyPath: /)
  })

  test('Get SAML configuration signing.certPaths is not a file', async () => {
    const configPath = path.join(testDataRoot, 'test.json')
    writeConfigSaml(configPath, {
      cookieSecret: 'cookieSecret',
      path: '/saml/acs',
      entryPoint: 'https://idp.example.com/idp/SSOService.php',
      issuer: 'issuer',
      certPaths: [path.join(testDataRoot, 'idp.0.crt'), path.join(testDataRoot, 'idp.1.cert')],
      decryption: {
        keyPath: path.join(testDataRoot, 'decrypt.key'),
        certPath: path.join(testDataRoot, 'decrypt.cert'),
      },
      signing: {
        keyPath: path.join(testDataRoot, 'sign.key'),
        certPaths: [path.join(testDataRoot, 'sign.0.crt'), path.join(testDataRoot, 'sign.1.cert')],
      },
    })
    fs.rmSync(path.join(testDataRoot, 'sign.1.cert'))

    await expect(loadConfigAsync(configPath, 0)).rejects.toThrow(/^saml.signing.certPaths: /)
  })
})


test('Default port is 8080', async () => {
  const configPath = path.join(testDataRoot, 'test.json')
  writeConfig(configPath)
  argv.configPath = configPath
  const cache = await loadConfigAsync(configPath, 0)
  assertNotNullable(cache.content, 'cache.content must be defined.')

  const sut = new Configuration(argv, cache.content, cache.stat.mtimeMs)

  expect(sut.port).toBe(8080)
})

test('Get port specified at command line', async () => {
  const configPath = path.join(testDataRoot, 'test.json')
  writeConfig(configPath)
  argv.configPath = configPath
  argv.port = 8888
  const cache = await loadConfigAsync(configPath, 0)
  assertNotNullable(cache.content, 'cache.content must be defined.')

  const sut = new Configuration(argv, cache.content, cache.stat.mtimeMs)

  expect(sut.port).toBe(8888)
})

describe('Configuration', () => {
  test('Default loglevel is INFO', async () => {
    const configPath = path.join(testDataRoot, 'test.json')
    writeConfig(configPath)
    argv.configPath = configPath
    const cache = await loadConfigAsync(configPath, 0)
    assertNotNullable(cache.content, 'cache.content must be defined.')

    const sut = new Configuration(argv, cache.content, cache.stat.mtimeMs)

    expect(sut.logLevel).toBe(LogLevels.INFO)
  })

  test('Get loglevel specified at command line', async () => {
    const configPath = path.join(testDataRoot, 'test.json')
    writeConfig(configPath)
    argv.configPath = configPath
    argv.loglevel = LogLevels.DEBUG
    const cache = await loadConfigAsync(configPath, 0)
    assertNotNullable(cache.content, 'cache.content must be defined.')

    const sut = new Configuration(argv, cache.content, cache.stat.mtimeMs)

    expect(sut.logLevel).toBe(LogLevels.DEBUG)
  })

  test('Not reload when timestamp is not changed.', async () => {
    const configPath = path.join(testDataRoot, 'test.json')
    writeConfig(configPath)
    argv.configPath = configPath

    const cache = await loadConfigAsync(configPath, 0)
    assertNotNullable(cache.content, 'cache.content must be defined.')
    const sut = new Configuration(argv, cache.content, cache.stat.mtimeMs)
    await sut.reloadIfUpdatedAsync()

    expect(sut['cache']).toBe(cache.content)
  })

  test('Reload when timestamp gets newer', async () => {
    const configPath = path.join(testDataRoot, 'test.json')
    writeConfig(configPath)
    argv.configPath = configPath

    const cache = await loadConfigAsync(configPath, 0)
    assertNotNullable(cache.content, 'cache.content must be defined.')
    const sut = new Configuration(argv, cache.content, cache.stat.mtimeMs)
    // Windows requires Date object for atime, utime
    const atime = new Date(cache.stat.atimeMs + 1000)
    const utime = new Date(cache.stat.mtimeMs + 1000)
    fs.utimesSync(configPath, atime, utime)
    await sut.reloadIfUpdatedAsync()

    expect(sut['cache']).not.toBe(cache.content)
  })

  test('Get CORS origins regexp', async () => {
    const configPath = path.join(testDataRoot, 'test.json')
    writeConfig(configPath)
    argv.configPath = configPath

    const cache = await loadConfigAsync(configPath, 0)
    assertNotNullable(cache.content, 'cache.content must be defined.')
    const sut = new Configuration(argv, cache.content, cache.stat.mtimeMs)

    if (!(sut.corsOrigins[0] instanceof RegExp)) {
      throw new Error('sut.corsOrigins[0] is not a RegExp.')
    }
    expect(sut.corsOrigins[0].source).toBe('https:\\/\\/w+\\.live-comment\\.ga$')
    expect(sut.corsOrigins[1]).toBe('http://localhost:8888')
    expect(sut.corsOrigins).toHaveLength(2)
  })

  test('Get saml configuration', async () => {
    const configPath = path.join(testDataRoot, 'test.json')
    const config = writeConfigSaml(configPath)
    argv.configPath = configPath

    const cache = await loadConfigAsync(configPath, 0)
    assertNotNullable(cache.content, 'cache.content must be defined.')
    const sut = new Configuration(argv, cache.content, cache.stat.mtimeMs)

    expect(sut.saml).toEqual({
      cookieSecret: 'cookieSecret',
      path: '/saml/acs',
      entryPoint: 'https://idp.example.com/idp/SSOService.php',
      issuer: 'issuer',
      cert: [
        fs.readFileSync(config.saml.certPaths[0]).toString(),
        fs.readFileSync(config.saml.certPaths[1]).toString(),
      ],
      decryptionPvk: fs.readFileSync(config.saml.decryption.keyPath).toString(),
      decryptionCert: fs.readFileSync(config.saml.decryption.certPath).toString(),
      privateKey: fs.readFileSync(config.saml.signing.keyPath).toString(),
      signingCert: [
        fs.readFileSync(config.saml.signing.certPaths[0]).toString(),
        fs.readFileSync(config.saml.signing.certPaths[1]).toString(),
      ],
    })
  })
})
