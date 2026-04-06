import type {
	EvictionPolicy,
	KeyValuePair,
} from "../interfaces/EvictionPolicy";

/**
 * LRU (Least Recently Used) eviction policy
 * Tracks access order; evicts the least recently accessed item when capacity exceeded
 *
 * Pattern: Strategy
 * Why: Pluggable eviction allows swapping LRU with LFU, MRU later
 *
 * Implementation note (SRP & KISS):
 * - Uses Map for O(1) key lookup
 * - Tracks order via a simple sorted approach: keys array ordered by access time
 * - When evicting, removes first element (least recently used)
 */
export class LRUEvictionPolicy<K, V> implements EvictionPolicy<K, V> {
	private readonly maxSize: number;
	private readonly storage: Map<K, V> = new Map();
	private readonly accessOrder: K[] = []; // Tracks LRU order: oldest first

	constructor(maxSize: number) {
		if (maxSize <= 0) {
			throw new Error("maxSize must be > 0");
		}
		this.maxSize = maxSize;
	}

	recordSet(key: K, value: V): void {
		// If key already exists, remove its old position in access order
		if (this.storage.has(key)) {
			this.storage.set(key, value);
			this.removeFromAccessOrder(key);
		} else {
			this.storage.set(key, value);
		}

		// Add to end (most recently used)
		this.accessOrder.push(key);

		// Evict if over capacity
		while (this.storage.size > this.maxSize) {
			this.evict();
		}
	}

	recordAccess(key: K): void {
		if (!this.storage.has(key)) {
			return; // Key not tracked, ignore
		}

		// Move to end (most recently used)
		this.removeFromAccessOrder(key);
		this.accessOrder.push(key);
	}

	evict(): KeyValuePair<K, V> | undefined {
		if (this.accessOrder.length === 0) {
			return undefined;
		}

		// Evict oldest (first in array)
		const lruKey = this.accessOrder.shift();
		if (lruKey === undefined) {
			return undefined;
		}

		const value = this.storage.get(lruKey);
		if (value === undefined) {
			return undefined;
		}

		this.storage.delete(lruKey);
		return { key: lruKey, value };
	}

	has(key: K): boolean {
		return this.storage.has(key);
	}

	remove(key: K): void {
		this.storage.delete(key);
		this.removeFromAccessOrder(key);
	}

	private removeFromAccessOrder(key: K): void {
		const index = this.accessOrder.indexOf(key);
		if (index > -1) {
			this.accessOrder.splice(index, 1);
		}
	}
}
