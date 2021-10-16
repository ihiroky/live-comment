import { sign as jwtSign, verify as jwtVerify, Secret, JwtPayload, VerifyErrors } from 'jsonwebtoken'

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
        expiresIn: longLife ? '30d' : '1d',
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
    jwtVerify(token, publicKey, { algorithms: [JWT_ALG] },
      (err: VerifyErrors | null, payload: JwtPayload | undefined): void => {
        if (err === null && payload) {
          resolve(payload)
        } else {
          reject(err)
        }
      }
    )
  })
}