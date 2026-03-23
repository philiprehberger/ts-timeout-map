# Changelog

## 0.1.1

- Standardize package metadata, badges, and CHANGELOG

## 0.1.0

- `TimeoutMap` class with per-key TTL support
- Lazy expiration on `get()`, `has()`, `size`, and iteration
- `onExpire` callback for expiration notifications
- Default TTL with per-key override
- Full `Map`-like interface: `set()`, `get()`, `has()`, `delete()`, `clear()`
- Iterable via `Symbol.iterator`
