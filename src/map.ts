export class TimeoutMap<K, V> {
  private store = new Map<K, { value: V; expires: number | null }>();
  private defaultTtl: number | undefined;
  private onExpire?: (key: K, value: V) => void;

  constructor(options?: {
    defaultTtl?: number;
    onExpire?: (key: K, value: V) => void;
  }) {
    this.defaultTtl = options?.defaultTtl;
    this.onExpire = options?.onExpire;
  }

  set(key: K, value: V, ttl?: number): this {
    const t = ttl ?? this.defaultTtl;
    this.store.set(key, {
      value,
      expires: t ? Date.now() + t : null,
    });
    return this;
  }

  get(key: K): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expires !== null && Date.now() > entry.expires) {
      this.store.delete(key);
      this.onExpire?.(key, entry.value);
      return undefined;
    }
    return entry.value;
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
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
        this.onExpire?.(key, entry.value);
        continue;
      }
      yield [key, entry.value];
    }
  }
}
