import { SquareClient, SquareEnvironment } from 'square'

// Server-only. Never import this from a client component — the access token must
// stay off the browser bundle entirely.
export function getSquareClient() {
  const token = process.env.SQUARE_ACCESS_TOKEN
  if (!token) return null
  const environment = process.env.SQUARE_ENVIRONMENT === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox
  return new SquareClient({ token, environment })
}

export const SQUARE_LOCATION_ID = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID
