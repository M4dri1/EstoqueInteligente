import { ensureRedisConnected, redis } from "./redis";

type Bucket = {
  count: number;
  resetAt: number;
};

const memoryBuckets = new Map<string, Bucket>();

function checkMemoryRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const current = memoryBuckets.get(key);

  if (!current || now > current.resetAt) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000),
    };
  }

  current.count += 1;
  memoryBuckets.set(key, current);
  return { allowed: true, retryAfterSeconds: 0 };
}

export async function checkRateLimit(
  key: string,
  limit = 8,
  windowMs = 60_000
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const connected = await ensureRedisConnected();
  if (!connected) {
    return checkMemoryRateLimit(key, limit, windowMs);
  }

  try {
    const redisKey = `rl:${key}`;
    const count = await redis.incr(redisKey);

    if (count === 1) {
      await redis.pexpire(redisKey, windowMs);
    }

    if (count > limit) {
      const ttl = await redis.pttl(redisKey);
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil(ttl / 1000)),
      };
    }

    return { allowed: true, retryAfterSeconds: 0 };
  } catch {
    return checkMemoryRateLimit(key, limit, windowMs);
  }
}
