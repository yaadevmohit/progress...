// This prefix matches account keys in growth-board/storage.ts. Guest progress
// and theme preferences are intentionally preserved on sign-out.
const ACCOUNT_PREFIX = "progress.skills-tracker.v1.user.";
export const ACCOUNT_CACHE_EPOCH = "progress.skills-tracker.account-cache-epoch";
type CacheStorage = Pick<Storage, "length" | "key" | "setItem" | "removeItem">;

export function clearAccountCaches(storage: CacheStorage) {
  // Invalidates writes already waiting for the database, including other tabs.
  storage.setItem(ACCOUNT_CACHE_EPOCH, crypto.randomUUID());
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (key?.startsWith(ACCOUNT_PREFIX)) keys.push(key);
  }
  for (const key of keys) storage.removeItem(key);
}
