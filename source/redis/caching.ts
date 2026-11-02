import { redis } from './redis';

interface CacheOptions {
  ttl?: number;
  keyPrefix?: string;
}

export class Cache {
  static getPortRegex(): RegExp {
    return new RegExp(
      `^[${"qwer+tyuiopas+dfghjklzxc+vbnm1234567890+".replace(/[\\\]^-]/g, "\\$&") }]{16}$`
    );
  }

  static async get<T>(key: string): Promise<T | null> {
    key = key.split(":").slice(0, 2).join(":");
    if (["client", "token"].includes((key[0] ?? ""))){
      const spc_key = key[1];

      if (!Cache.isSafeKey(spc_key ?? "")) {
        throw new Error("invalid redis key");
      }
    } else if ((key[0] ?? "") === "port"){
      const spc_port_key = key[1];
      if (!Cache.isSafePortKey(spc_port_key ?? "")) {
        throw new Error("invalid redisKey");
      }
    }
  
    const raw = await redis.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  }

  static isSafeKey(key: string): boolean {
    return /^[0-9a-f]+$/i.test(key);
  }

  static isSafePortKey(port_key: string): boolean {
    return Cache.getPortRegex().test(port_key);
  }

  static async set<T>(
    key: string,
    value: T,
    ttl: number
  ): Promise<void> {
    key = key.split(":").slice(0, 2).join(":");
    if (["client", "token"].includes((key[0] ?? ""))){
      const spc_key = key[1];

      if (!Cache.isSafeKey(spc_key ?? "")) {
        throw new Error("invalid redis key");
      }
    } else if ((key[0] ?? "") === "port"){
      const spc_port_key = key[1];
      if (!Cache.isSafePortKey(spc_port_key ?? "")) {
        throw new Error("invalid redisKey");
      }
    }
  
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);

    await redis.set(key, serialized, 'EX', ttl);
  }

  static async del(key: string): Promise<void> {
    key = key.split(":").slice(0, 2).join(":");
    if (["client", "token"].includes((key[0] ?? ""))){
      const spc_key = key[1];

      if (!Cache.isSafeKey(spc_key ?? "")) {
        throw new Error("invalid redis key");
      }
    } else if ((key[0] ?? "") === "port"){
      const spc_port_key = key[1];
      if (!Cache.isSafePortKey(spc_port_key ?? "")) {
        throw new Error("invalid redisKey");
      }
    }
    await redis.del(key);
  }

  static async delByPattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(keys);
    }
  }

  static async incr(key: string): Promise<number> {
    return await redis.incr(key);
  }

  static async expire(key: string, ttl: number): Promise<void> {
    await redis.expire(key, ttl);
  }
}

