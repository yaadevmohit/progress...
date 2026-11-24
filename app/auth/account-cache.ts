// Account caches and offline outboxes share the storage.ts account prefix.
const ACCOUNT_PREFIX = "progress.skills-tracker.v1.user.";
export const ACCOUNT_CACHE_EPOCH = "progress.skills-tracker.account-cache-epoch";
type CacheStorage = Pick<Storage, "length" | "key" | "getItem" | "setItem" | "removeItem">;
function pendingAccounts(storage: Pick<CacheStorage, "length" | "key" | "getItem">) {
  const accounts = new Set<string>();
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (!key?.startsWith(ACCOUNT_PREFIX) || !key.endsWith(".offline")) continue;
    try {
      if (JSON.parse(storage.getItem(key) ?? "null")?.pending) accounts.add(key.slice(0, -8));
    } catch { accounts.add(key.slice(0, -8)); } // Keep unreadable recovery data.
  }
  return accounts;
}
export function hasPendingAccountChanges(storage: Pick<CacheStorage, "length" | "key" | "getItem">, userId?: string) {
  const accounts = pendingAccounts(storage);
  return userId ? accounts.has(`${ACCOUNT_PREFIX}${userId}`) : accounts.size > 0;
}
export function clearAccountCaches(storage: CacheStorage) {
  storage.setItem(ACCOUNT_CACHE_EPOCH, crypto.randomUUID());
  const pending = pendingAccounts(storage), keys: string[] = [];
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (key?.startsWith(ACCOUNT_PREFIX) && !pending.has(key) && !pending.has(key.replace(/\.offline$/u, ""))) keys.push(key);
  }
  // Explicit logout is blocked while edits are pending. Automatic session
  // expiration preserves the outbox so reauthentication can recover the work.
  for (const key of keys) storage.removeItem(key);
}
