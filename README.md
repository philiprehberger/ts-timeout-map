# @philiprehberger/timeout-map

[![CI](https://github.com/philiprehberger/ts-timeout-map/actions/workflows/ci.yml/badge.svg)](https://github.com/philiprehberger/ts-timeout-map/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@philiprehberger/timeout-map.svg)](https://www.npmjs.com/package/@philiprehberger/timeout-map)
[![Last updated](https://img.shields.io/github/last-commit/philiprehberger/ts-timeout-map)](https://github.com/philiprehberger/ts-timeout-map/commits/main)

Map with automatic entry expiration — TTL per key

## Installation

```bash
npm install @philiprehberger/timeout-map
```

## Usage

```ts
import { TimeoutMap } from '@philiprehberger/timeout-map';

const cache = new TimeoutMap<string, string>();
cache.set('token', 'abc123', 60_000); // expires in 1 minute
cache.get('token'); // 'abc123'
```

### Default TTL and Expiration Callback

```ts
import { TimeoutMap } from '@philiprehberger/timeout-map';

const map = new TimeoutMap<string, number>({
  defaultTtl: 5_000,
  onExpire: (key, value) => {
    console.log(`Expired: ${key} = ${value}`);
  },
});

map.set('a', 1); // uses defaultTtl
```

### Sliding Window TTL

Extend an entry's TTL each time it is accessed via `get()` or `has()`:

```ts
import { TimeoutMap } from '@philiprehberger/timeout-map';

const sessions = new TimeoutMap<string, object>({
  defaultTtl: 15 * 60_000, // 15 minutes
  slidingExpiration: true,
});

sessions.set('user:1', { role: 'admin' });
sessions.get('user:1'); // TTL reset to 15 minutes from now
```

### Max Size Limit

Cap the number of entries and evict the oldest when the limit is exceeded:

```ts
import { TimeoutMap } from '@philiprehberger/timeout-map';

const cache = new TimeoutMap<string, Buffer>({
  maxSize: 1000,
  onEvict: (key) => {
    console.log(`Evicted: ${key}`);
  },
});

cache.set('key-1001', Buffer.from('data'));
```

### Batch Operations

Efficiently set, get, or delete multiple entries at once:

```ts
import { TimeoutMap } from '@philiprehberger/timeout-map';

const map = new TimeoutMap<string, number>({ defaultTtl: 60_000 });

map.setMany([
  ['a', 1],
  ['b', 2],
  ['c', 3, 30_000], // per-key TTL override
]);

const results = map.getMany(['a', 'b', 'missing']);
// Map { 'a' => 1, 'b' => 2 }

const removed = map.deleteMany(['a', 'c']);
// 2
```

### Periodic Background Cleanup

Eagerly remove expired entries on a timer instead of waiting for lazy access:

```ts
import { TimeoutMap } from '@philiprehberger/timeout-map';

const cache = new TimeoutMap<string, string>({
  defaultTtl: 60_000,
  onExpire: (key) => console.log(`Cleaned up: ${key}`),
});

cache.startCleanup(10_000); // sweep every 10 seconds
cache.stopCleanup();
```

### Inspecting Entry Expiry

Get a value alongside its absolute expiry timestamp and remaining time:

```ts
import { TimeoutMap } from '@philiprehberger/timeout-map';

const cache = new TimeoutMap<string, string>();
cache.set('token', 'abc123', 60_000);

const info = cache.getWithExpiry('token');
if (info) {
  console.log(info.value);       // 'abc123'
  console.log(info.expiresAt);   // ms-since-epoch timestamp
  console.log(info.remainingMs); // ~60000 immediately after set
}
```

Entries without a TTL report `expiresAt` and `remainingMs` as `Infinity`. Expired or missing keys return `undefined`.

### Hit/Miss Statistics

Track cache effectiveness with built-in counters:

```ts
import { TimeoutMap } from '@philiprehberger/timeout-map';

const cache = new TimeoutMap<string, number>({ defaultTtl: 60_000 });
cache.set('a', 1);

cache.get('a');       // hit
cache.get('missing'); // miss

const stats = cache.stats();
// { size: 1, hits: 1, misses: 1, expirations: 0, hitRate: 0.5 }

cache.resetStats(); // zero counters for the next observation window
```

`stats().expirations` increments whenever a TTL-expired entry is removed — whether on lazy access, during `[Symbol.iterator]`/`size`, or via `startCleanup()`.

## API

### `new TimeoutMap<K, V>(options?)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `defaultTtl` | `number` | `undefined` | Default TTL in milliseconds for all entries |
| `onExpire` | `(key, value) => void` | `undefined` | Callback fired when an entry expires |
| `slidingExpiration` | `boolean` | `false` | Reset TTL on each `get()` / `has()` access |
| `maxSize` | `number` | `undefined` | Maximum number of entries; oldest evicted when exceeded |
| `onEvict` | `(key, value) => void` | `undefined` | Callback fired when an entry is evicted due to `maxSize` |

### Methods

| Method | Description |
|--------|-------------|
| `set(key, value, ttl?)` | Set a value with optional per-key TTL (overrides default) |
| `get(key)` | Get a value, or `undefined` if expired or missing |
| `getWithExpiry(key)` | Get `{ value, expiresAt, remainingMs }`, or `undefined` if expired/missing |
| `has(key)` | Check if a non-expired entry exists |
| `delete(key)` | Remove an entry |
| `clear()` | Remove all entries |
| `size` | Count of non-expired entries (triggers cleanup) |
| `stats()` | Returns `{ size, hits, misses, expirations, hitRate }` |
| `resetStats()` | Zero the hit/miss/expiration counters |
| `setMany(entries)` | Set multiple `[key, value, ttl?]` tuples at once |
| `getMany(keys)` | Get multiple values; returns a `Map` (omits missing/expired) |
| `deleteMany(keys)` | Delete multiple keys; returns count of entries removed |
| `startCleanup(intervalMs)` | Start periodic background expiration sweep |
| `stopCleanup()` | Stop the background cleanup timer |
| `[Symbol.iterator]()` | Iterate over non-expired `[key, value]` pairs |

## Development

```bash
npm install
npm run build
npm test
```

## Support

If you find this project useful:

⭐ [Star the repo](https://github.com/philiprehberger/ts-timeout-map)

🐛 [Report issues](https://github.com/philiprehberger/ts-timeout-map/issues?q=is%3Aissue+is%3Aopen+label%3Abug)

💡 [Suggest features](https://github.com/philiprehberger/ts-timeout-map/issues?q=is%3Aissue+is%3Aopen+label%3Aenhancement)

❤️ [Sponsor development](https://github.com/sponsors/philiprehberger)

🌐 [All Open Source Projects](https://philiprehberger.com/open-source-packages)

💻 [GitHub Profile](https://github.com/philiprehberger)

🔗 [LinkedIn Profile](https://www.linkedin.com/in/philiprehberger)

## License

[MIT](LICENSE)
