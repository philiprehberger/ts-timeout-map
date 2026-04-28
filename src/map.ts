export interface TimeoutMapOptions<K, V> {
  /** Default TTL in milliseconds for all entries. */
  defaultTtl?: number;
  /** Callback fired when an entry expires via TTL. */
  onExpire?: (key: K, value: V) => void;
  /** When true, accessing an entry via get() or has() resets its TTL. */
  slidingExpiration?: boolean;
  /** Maximum number of entries. Oldest entries are evicted when exceeded. */
  maxSize?: number;
  /** Callback fired when an entry is evicted due to maxSize. */
  onEvict?: (key: K, value: V) => void;
}

/** Entry metadata returned by `getWithExpiry()`. */
export interface EntryWithExpiry<V> {
  /** The stored value. */
  value: V;
  /** Absolute expiration timestamp in ms (Date.now() based). `Infinity` if no TTL. */
  expiresAt: number;
  /** Milliseconds remaining until expiration. `Infinity` if no TTL. */
  remainingMs: number;
}

/** Hit/miss/expiration counters returned by `stats()`. */
export interface TimeoutMapStats {
  /** Current count of non-expired entries. */
  size: number;
  /** Number of successful lookups (entry found and not expired). */
  hits: number;
  /** Number of failed lookups (entry missing or expired). */
  misses: number;
  /** Number of entries removed due to TTL expiration. */
  expirations: number;
  /** hits / (hits + misses), or 0 if both are 0. */
  hitRate: number;
}

interface Entry<V> {
  value: V;
  expires: number | null;
  ttl: number | null;
  insertedAt: number;
}

export class TimeoutMap<K, V> {
  private store = new Map<K, Entry<V>>();
  private defaultTtl: number | undefined;
  private onExpire?: (key: K, value: V) => void;
  private slidingExpiration: boolean;
  private maxSize: number | undefined;
  private onEvict?: (key: K, value: V) => void;
  private cleanupTimer?: ReturnType<typeof setInterval>;
  private hits = 0;
  private misses = 0;
  private expirations = 0;

  constructor(options?: TimeoutMapOptions<K, V>) {
    this.defaultTtl = options?.defaultTtl;
    this.onExpire = options?.onExpire;
    this.slidingExpiration = options?.slidingExpiration ?? false;
    this.maxSize = options?.maxSize;
    this.onEvict = options?.onEvict;
  }

  set(key: K, value: V, ttl?: number): this {
    const t = ttl ?? this.defaultTtl;
    const now = Date.now();
    this.store.set(key, {
      value,
      expires: t ? now + t : null,
      ttl: t ?? null,
      insertedAt: now,
    });
    this.enforceMaxSize();
    return this;
  }

  get(key: K): V | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }
    if (entry.expires !== null && Date.now() > entry.expires) {
      this.store.delete(key);
      this.expirations++;
      this.onExpire?.(key, entry.value);
      this.misses++;
      return undefined;
    }
    if (this.slidingExpiration && entry.ttl !== null) {
      entry.expires = Date.now() + entry.ttl;
    }
    this.hits++;
    return entry.value;
  }

  has(key: K): boolean {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return false;
    }
    if (entry.expires !== null && Date.now() > entry.expires) {
      this.store.delete(key);
      this.expirations++;
      this.onExpire?.(key, entry.value);
      this.misses++;
      return false;
    }
    if (this.slidingExpiration && entry.ttl !== null) {
      entry.expires = Date.now() + entry.ttl;
    }
    this.hits++;
    return true;
  }

  /**
   * Get a value along with its expiry metadata. Returns `undefined` for missing or
   * expired entries (and triggers lazy expiration just like `get()`).
   */
  getWithExpiry(key: K): EntryWithExpiry<V> | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }
    const now = Date.now();
    if (entry.expires !== null && now > entry.expires) {
      this.store.delete(key);
      this.expirations++;
      this.onExpire?.(key, entry.value);
      this.misses++;
      return undefined;
    }
    if (this.slidingExpiration && entry.ttl !== null) {
      entry.expires = now + entry.ttl;
    }
    this.hits++;
    const expiresAt = entry.expires ?? Infinity;
    const remainingMs = entry.expires === null ? Infinity : entry.expires - now;
    return { value: entry.value, expiresAt, remainingMs };
  }

  /** Snapshot of current cache statistics. */
  stats(): TimeoutMapStats {
    const total = this.hits + this.misses;
    return {
      size: this.size,
      hits: this.hits,
      misses: this.misses,
      expirations: this.expirations,
      hitRate: total === 0 ? 0 : this.hits / total,
    };
  }

  /** Reset hit/miss/expiration counters to zero. */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    this.expirations = 0;
  }

  delete(key: K): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    let count = 0;
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expires !== null && now > entry.expires) {
        this.store.delete(key);
        this.expirations++;
        this.onExpire?.(key, entry.value);
      } else {
        count++;
      }
    }
    return count;
  }

  *[Symbol.iterator](): Iterator<[K, V]> {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expires !== null && now > entry.expires) {
        this.store.delete(key);
        this.expirations++;
        this.onExpire?.(key, entry.value);
        continue;
      }
      yield [key, entry.value];
    }
  }

  /** Set multiple entries at once. */
  setMany(entries: Iterable<[K, V, number?]>): this {
    const now = Date.now();
    for (const [key, value, ttl] of entries) {
      const t = ttl ?? this.defaultTtl;
      this.store.set(key, {
        value,
        expires: t ? now + t : null,
        ttl: t ?? null,
        insertedAt: now,
      });
    }
    this.enforceMaxSize();
    return this;
  }

  /** Get multiple values by key. Returns a Map of key to value (missing/expired keys omitted). */
  getMany(keys: Iterable<K>): Map<K, V> {
    const result = new Map<K, V>();
    for (const key of keys) {
      const value = this.get(key);
      if (value !== undefined) {
        result.set(key, value);
      }
    }
    return result;
  }

  /** Delete multiple keys at once. Returns the number of entries actually removed. */
  deleteMany(keys: Iterable<K>): number {
    let count = 0;
    for (const key of keys) {
      if (this.store.delete(key)) {
        count++;
      }
    }
    return count;
  }

  /** Start periodic background cleanup of expired entries. */
  startCleanup(intervalMs: number): void {
    this.stopCleanup();
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store) {
        if (entry.expires !== null && now > entry.expires) {
          this.store.delete(key);
          this.expirations++;
          this.onExpire?.(key, entry.value);
        }
      }
    }, intervalMs);
    // Allow the process to exit even if the timer is running (Node.js)
    const timer = this.cleanupTimer as unknown as { unref?: () => void };
    if (typeof timer?.unref === 'function') {
      timer.unref();
    }
  }

  /** Stop periodic background cleanup. */
  stopCleanup(): void {
    if (this.cleanupTimer !== undefined) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  private enforceMaxSize(): void {
    if (this.maxSize === undefined) return;
    while (this.store.size > this.maxSize) {
      // Map iteration order is insertion order, so first key is the oldest
      const oldest = this.store.keys().next();
      if (oldest.done) break;
      const key = oldest.value;
      const entry = this.store.get(key);
      this.store.delete(key);
      if (entry) {
        this.onEvict?.(key, entry.value);
      }
    }
  }
}
