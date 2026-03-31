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

## API

### `new TimeoutMap<K, V>(options?)`

Creates a new timeout map.

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `defaultTtl` | `number` | Default TTL in milliseconds for all entries |
| `onExpire` | `(key, value) => void` | Callback fired when an entry expires |

### Methods

- **`set(key, value, ttl?)`** -- Set a value with optional per-key TTL (overrides default)
- **`get(key)`** -- Get a value, returns `undefined` if expired or missing
- **`has(key)`** -- Check if a non-expired entry exists
- **`delete(key)`** -- Remove an entry
- **`clear()`** -- Remove all entries
- **`size`** -- Count of non-expired entries (triggers cleanup)
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
