import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Define valid rate limit keys
export type RateLimitKey = 
  | 'sync-gmail' 
  | 'api-insights' 
  | 'calendar-sync' 
  | 'api-notifications'

// Check if we have Redis credentials
const hasRedisConfig =
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN

// Create Redis client only if config is available
let redis: Redis | null = null
let rateLimits: Record<RateLimitKey, Ratelimit> | null = null

if (hasRedisConfig) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })

  // Define rate limit configurations
  rateLimits = {
    'sync-gmail': new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(5, '1 m'),
      analytics: true,
    }),
    'api-insights': new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      analytics: true,
    }),
    'calendar-sync': new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(5, '1 m'),
      analytics: true,
    }),
    'api-notifications': new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(20, '1 m'),
      analytics: true,
    }),
  }
}

/**
 * Rate limit a request
 * @param type Rate limit type (e.g., 'sync-gmail', 'api-insights')
 * @param identifier User ID or IP address
 * @returns {Promise<{ allowed: boolean; reset: number }>}
 */
export async function rateLimit(
  type: RateLimitKey,
  identifier: string
): Promise<{ allowed: boolean; reset: number }> {
  // If no Redis config, allow all requests
  if (!rateLimits) {
    return { allowed: true, reset: Date.now() }
  }

  const limiter = rateLimits[type]
  const result = await limiter.limit(identifier)

  return {
    allowed: result.success,
    reset: result.reset,
  }
}
