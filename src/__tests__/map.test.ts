import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TimeoutMap } from '../../dist/index.js';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('TimeoutMap', () => {
  it('should set and get values', () => {
    const map = new TimeoutMap<string, number>();
    map.set('a', 1);
    assert.strictEqual(map.get('a'), 1);
  });

  it('should return undefined for expired entries', async () => {
    const map = new TimeoutMap<string, number>();
    map.set('a', 1, 50);
    assert.strictEqual(map.get('a'), 1);

    await sleep(80);

    assert.strictEqual(map.get('a'), undefined);
  });

  it('should return true for has() when key exists and not expired', () => {
    const map = new TimeoutMap<string, number>();
    map.set('a', 1);
    assert.strictEqual(map.has('a'), true);
  });

  it('should return false for has() when key does not exist', () => {
    const map = new TimeoutMap<string, number>();
    assert.strictEqual(map.has('a'), false);
  });

  it('should delete entries', () => {
    const map = new TimeoutMap<string, number>();
    map.set('a', 1);
    assert.strictEqual(map.delete('a'), true);
    assert.strictEqual(map.get('a'), undefined);
  });

  it('should clear all entries', () => {
    const map = new TimeoutMap<string, number>();
    map.set('a', 1);
    map.set('b', 2);
    map.clear();
    assert.strictEqual(map.size, 0);
  });

  it('should count only non-expired entries in size', async () => {
    const map = new TimeoutMap<string, number>();
    map.set('a', 1, 50);
    map.set('b', 2);

    assert.strictEqual(map.size, 2);

    await sleep(80);

    assert.strictEqual(map.size, 1);
  });

  it('should skip expired entries during iteration', async () => {
    const map = new TimeoutMap<string, number>();
    map.set('a', 1, 50);
    map.set('b', 2);
    map.set('c', 3);

    await sleep(80);

    const entries: [string, number][] = [];
    for (const entry of map) {
      entries.push(entry);
    }
    assert.strictEqual(entries.length, 2);
    assert.deepStrictEqual(entries, [
      ['b', 2],
      ['c', 3],
    ]);
  });

  it('should fire onExpire callback', async () => {
    const expired: [string, number][] = [];
    const map = new TimeoutMap<string, number>({
      onExpire: (key, value) => expired.push([key, value]),
    });

    map.set('a', 42, 50);
    await sleep(80);

    map.get('a'); // triggers expiration
    assert.deepStrictEqual(expired, [['a', 42]]);
  });

  it('should support per-key TTL override', async () => {
    const map = new TimeoutMap<string, number>({ defaultTtl: 200 });
    map.set('short', 1, 50);
    map.set('default', 2);

    await sleep(80);

    assert.strictEqual(map.get('short'), undefined);
    assert.strictEqual(map.get('default'), 2);
  });

  it('should not expire entries without TTL', async () => {
    const map = new TimeoutMap<string, number>();
    map.set('a', 1);

    await sleep(50);

    assert.strictEqual(map.get('a'), 1);
  });

  it('should apply defaultTtl when no per-key TTL given', async () => {
    const map = new TimeoutMap<string, number>({ defaultTtl: 50 });
    map.set('a', 1);

    await sleep(80);

    assert.strictEqual(map.get('a'), undefined);
  });
});

describe('TimeoutMap.getWithExpiry', () => {
  it('should return value with Infinity expiry when no TTL is set', () => {
    const map = new TimeoutMap<string, number>();
    map.set('a', 1);

    const result = map.getWithExpiry('a');
    assert.ok(result);
    assert.strictEqual(result.value, 1);
    assert.strictEqual(result.expiresAt, Infinity);
    assert.strictEqual(result.remainingMs, Infinity);
  });

  it('should return value with finite expiry when a TTL is set', () => {
    const map = new TimeoutMap<string, number>();
    const before = Date.now();
    map.set('a', 42, 1000);

    const result = map.getWithExpiry('a');
    assert.ok(result);
    assert.strictEqual(result.value, 42);
    assert.ok(result.expiresAt >= before + 1000);
    assert.ok(result.remainingMs > 0 && result.remainingMs <= 1000);
  });

  it('should return undefined for missing keys', () => {
    const map = new TimeoutMap<string, number>();
    assert.strictEqual(map.getWithExpiry('nope'), undefined);
  });

  it('should return undefined for expired entries', async () => {
    const map = new TimeoutMap<string, number>();
    map.set('a', 1, 50);

    await sleep(80);

    assert.strictEqual(map.getWithExpiry('a'), undefined);
  });

  it('should reset TTL when slidingExpiration is enabled', async () => {
    const map = new TimeoutMap<string, number>({ slidingExpiration: true });
    map.set('a', 1, 200);

    await sleep(120);
    const result = map.getWithExpiry('a');
    assert.ok(result);
    // After sliding reset, remainingMs should be near 200, not the original ~80
    assert.ok(result.remainingMs > 150);
  });
});

describe('TimeoutMap.stats', () => {
  it('should report zero stats on a fresh map', () => {
    const map = new TimeoutMap<string, number>();
    const stats = map.stats();
    assert.strictEqual(stats.size, 0);
    assert.strictEqual(stats.hits, 0);
    assert.strictEqual(stats.misses, 0);
    assert.strictEqual(stats.expirations, 0);
    assert.strictEqual(stats.hitRate, 0);
  });

  it('should count hits and misses on get()', () => {
    const map = new TimeoutMap<string, number>();
    map.set('a', 1);

    map.get('a'); // hit
    map.get('a'); // hit
    map.get('missing'); // miss

    const stats = map.stats();
    assert.strictEqual(stats.hits, 2);
    assert.strictEqual(stats.misses, 1);
    assert.strictEqual(stats.hitRate, 2 / 3);
  });

  it('should count hits and misses on has()', () => {
    const map = new TimeoutMap<string, number>();
    map.set('a', 1);

    map.has('a'); // hit
    map.has('missing'); // miss

    const stats = map.stats();
    assert.strictEqual(stats.hits, 1);
    assert.strictEqual(stats.misses, 1);
    assert.strictEqual(stats.hitRate, 0.5);
  });

  it('should count hits and misses on getWithExpiry()', () => {
    const map = new TimeoutMap<string, number>();
    map.set('a', 1);

    map.getWithExpiry('a'); // hit
    map.getWithExpiry('missing'); // miss

    const stats = map.stats();
    assert.strictEqual(stats.hits, 1);
    assert.strictEqual(stats.misses, 1);
  });

  it('should count expirations on lazy access', async () => {
    const map = new TimeoutMap<string, number>();
    map.set('a', 1, 50);

    await sleep(80);

    map.get('a'); // expired -> miss + expiration
    const stats = map.stats();
    assert.strictEqual(stats.misses, 1);
    assert.strictEqual(stats.expirations, 1);
  });

  it('should count expirations from background cleanup', async () => {
    const map = new TimeoutMap<string, number>();
    map.set('a', 1, 30);
    map.set('b', 2, 30);

    map.startCleanup(20);
    await sleep(120);
    map.stopCleanup();

    const stats = map.stats();
    assert.ok(stats.expirations >= 2);
  });

  it('should count expirations triggered by onExpire from iteration', async () => {
    const map = new TimeoutMap<string, number>();
    map.set('a', 1, 50);
    map.set('b', 2);

    await sleep(80);

    // iteration triggers expiration
    for (const _entry of map) {
      void _entry;
    }
    assert.strictEqual(map.stats().expirations, 1);
  });

  it('should reflect current size in stats', () => {
    const map = new TimeoutMap<string, number>();
    map.set('a', 1);
    map.set('b', 2);
    assert.strictEqual(map.stats().size, 2);
  });

  it('resetStats() should zero all counters but leave entries intact', () => {
    const map = new TimeoutMap<string, number>();
    map.set('a', 1);
    map.get('a');
    map.get('missing');

    map.resetStats();

    const stats = map.stats();
    assert.strictEqual(stats.hits, 0);
    assert.strictEqual(stats.misses, 0);
    assert.strictEqual(stats.expirations, 0);
    assert.strictEqual(stats.hitRate, 0);
    assert.strictEqual(stats.size, 1);
    assert.strictEqual(map.get('a'), 1);
  });
});
