# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-03-21

### Added

- `TimeoutMap` class with per-key TTL support
- Lazy expiration on `get()`, `has()`, `size`, and iteration
- `onExpire` callback for expiration notifications
- Default TTL with per-key override
- Full `Map`-like interface: `set()`, `get()`, `has()`, `delete()`, `clear()`
- Iterable via `Symbol.iterator`
