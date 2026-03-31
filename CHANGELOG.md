# Changelog

## 0.1.2

- Standardize README to 3-badge format with emoji Support section
- Update CI actions to v5 for Node.js 24 compatibility
- Add GitHub issue templates, dependabot config, and PR template

## 0.1.1

- Standardize package metadata, badges, and CHANGELOG

## 0.1.0

- `TimeoutMap` class with per-key TTL support
- Lazy expiration on `get()`, `has()`, `size`, and iteration
- `onExpire` callback for expiration notifications
- Default TTL with per-key override
- Full `Map`-like interface: `set()`, `get()`, `has()`, `delete()`, `clear()`
- Iterable via `Symbol.iterator`
