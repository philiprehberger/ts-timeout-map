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
