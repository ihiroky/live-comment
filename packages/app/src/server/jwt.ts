import { sign as jwtSign, verify as jwtVerify, Secret, JwtPayload, VerifyErrors, VerifyCallback } from 'jsonwebtoken'

const JWT_ALG = 'ES256'

export type { JwtPayload, VerifyErrors } from 'jsonwebtoken'

export function sign(
  payload: Record<string, unknown>,
  privateKey: Secret,
  longLife: boolean | undefined
): Promise<string> {
  return new Promise<string>((resolve: (token: string) => void, reject: (reason: unknown) => void): void => {
    jwtSign(payload, privateKey,
      {
        expiresIn: longLife ? '30d' : '12h',
        algorithm: JWT_ALG,
      },
      (err: Error | null, encoded: string | undefined): void => {
        if (err === null && encoded) {
          resolve(encoded)
        } else {
          reject(err)
        }
      }
    )
  })
}

export function verify(token: string, publicKey: Secret): Promise<JwtPayload> {
  return new Promise<JwtPayload>((resolve: (payload: JwtPayload) => void, reject: (reason: unknown) => void): void => {
    const callback: VerifyCallback<JwtPayload | string> = (
      err: VerifyErrors | null,
      payload: JwtPayload | string | undefined
    ): void => {
      if (err === null && payload) {
        if (typeof payload === 'object') {
          resolve(payload)
        } else {
          reject(new Error(`Unexpected payload ${payload}`))
        }
      } else {
        reject(err)
      }
    }

    jwtVerify(token, publicKey, { algorithms: [JWT_ALG] }, callback)
  })
}
