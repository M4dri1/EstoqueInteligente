import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedis() {
  const url = process.env.REDIS_URL || "redis://127.0.0.1:6379";
  return new Redis(url, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: true,
  });
}

export const redis = globalForRedis.redis ?? createRedis();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

export async function ensureRedisConnected() {
  if (!process.env.REDIS_URL && process.env.NODE_ENV === "production") {
    return false;
  }

  if (redis.status === "ready") {
    return true;
  }

  try {
    if (redis.status === "wait") {
      await redis.connect();
    }
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}
