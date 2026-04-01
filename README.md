# @philiprehberger/timeout-map

[![CI](https://github.com/philiprehberger/ts-timeout-map/actions/workflows/ci.yml/badge.svg)](https://github.com/philiprehberger/ts-timeout-map/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@philiprehberger/timeout-map.svg)](https://www.npmjs.com/package/@philiprehberger/timeout-map)
[![Last updated](https://img.shields.io/github/last-commit/philiprehberger/ts-timeout-map)](https://github.com/philiprehberger/ts-timeout-map/commits/main)

Map with automatic entry expiration -- TTL per key.

## Installation

```bash
npm install @philiprehberger/timeout-map
```

## Usage

### Basic Usage

```ts
import { TimeoutMap } from '@philiprehberger/timeout-map';

// Basic usage with per-key TTL
const cache = new TimeoutMap<string, string>();
cache.set('token', 'abc123', 60_000); // expires in 1 minute
cache.get('token'); // 'abc123'

// Default TTL for all entries
const sessions = new TimeoutMap<string, object>({
  defaultTtl: 30 * 60_000, // 30 minutes
});

// Expiration callback
const map = new TimeoutMap<string, number>({
  defaultTtl: 5_000,
  onExpire: (key, value) => {
    console.log(`Expired: ${key} = ${value}`);
  },
});

// Iteration skips expired entries
for (const [key, value] of map) {
  console.log(key, value);
}
```

### Sliding Window TTL

Extend an entry's TTL each time it is accessed via `get()` or `has()`:

```ts
const sessions = new TimeoutMap<string, object>({
  defaultTtl: 15 * 60_000, // 15 minutes
  slidingExpiration: true,
});

sessions.set('user:1', { role: 'admin' });

// Each access resets the 15-minute timer
sessions.get('user:1'); // TTL reset to 15 minutes from now
```

### Max Size Limit

Cap the number of entries and evict the oldest when the limit is exceeded:

```ts
const cache = new TimeoutMap<string, Buffer>({
  maxSize: 1000,
  onEvict: (key, value) => {
    console.log(`Evicted: ${key}`);
  },
});

// When the 1001st entry is added, the oldest entry is evicted
cache.set('key-1001', data);
```

### Batch Operations

Efficiently set, get, or delete multiple entries at once:

```ts
const map = new TimeoutMap<string, number>({ defaultTtl: 60_000 });

// Set multiple entries (each tuple is [key, value, ttl?])
map.setMany([
  ['a', 1],
  ['b', 2],
  ['c', 3, 30_000], // per-key TTL override
]);

// Get multiple values (returns a Map, omits missing/expired)
const results = map.getMany(['a', 'b', 'missing']);
// Map { 'a' => 1, 'b' => 2 }

// Delete multiple keys (returns count of deleted entries)
const removed = map.deleteMany(['a', 'c']);
// 2
```

### Periodic Background Cleanup

Eagerly remove expired entries on a timer instead of waiting for lazy access:

```ts
const cache = new TimeoutMap<string, string>({
  defaultTtl: 60_000,
  onExpire: (key) => console.log(`Cleaned up: ${key}`),
});

// Run cleanup every 10 seconds
cache.startCleanup(10_000);

// Stop cleanup when no longer needed
cache.stopCleanup();
```

## API

### `new TimeoutMap<K, V>(options?)`

Creates a new timeout map.

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `defaultTtl` | `number` | Default TTL in milliseconds for all entries |
| `onExpire` | `(key, value) => void` | Callback fired when an entry expires |
| `slidingExpiration` | `boolean` | Reset TTL on each `get()` / `has()` access (default `false`) |
| `maxSize` | `number` | Maximum number of entries; oldest evicted when exceeded |
| `onEvict` | `(key, value) => void` | Callback fired when an entry is evicted due to `maxSize` |

### Methods

- **`set(key, value, ttl?)`** -- Set a value with optional per-key TTL (overrides default)
- **`get(key)`** -- Get a value, returns `undefined` if expired or missing
- **`has(key)`** -- Check if a non-expired entry exists
- **`delete(key)`** -- Remove an entry
- **`clear()`** -- Remove all entries
- **`size`** -- Count of non-expired entries (triggers cleanup)
- **`setMany(entries)`** -- Set multiple `[key, value, ttl?]` tuples at once
- **`getMany(keys)`** -- Get multiple values; returns a `Map` (omits missing/expired)
- **`deleteMany(keys)`** -- Delete multiple keys; returns count of entries removed
- **`startCleanup(intervalMs)`** -- Start periodic background expiration sweep
- **`stopCleanup()`** -- Stop the background cleanup timer
- **`[Symbol.iterator]()`** -- Iterate over non-expired `[key, value]` pairs

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
