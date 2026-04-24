import type { JwtPayload } from './middleware/auth.ts'

export type AppEnv = {
  Variables: {
    user: JwtPayload
  }
}
