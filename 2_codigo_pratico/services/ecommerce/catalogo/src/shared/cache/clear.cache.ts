import { Cache } from 'cache-manager';

function getCacheKeys(cacheManager: Cache): Promise<string[]> {
  const redisStore: any = cacheManager.store;

  // Execute Redis 'keys' command to get all keys
  return new Promise((resolve, reject) => {
    redisStore.keys('*', (err, keys) => {
      if (err) {
        reject(err);
      }
      resolve(keys);
    });
  });
}

export const clearCacheKeys = async (cacheManager: Cache): Promise<void> => {
  const keys = await getCacheKeys(cacheManager);
  keys.forEach(async (key: string) => await cacheManager.del(key));
};
