/**
 * Eviction policy abstraction (Strategy pattern)
 * Pluggable algorithm for deciding what to evict when capacity exceeded
 */
export interface KeyValuePair<K, V> {
	key: K;
	value: V;
}

export interface EvictionPolicy<K, V> {
	/**
	 * Record that a key was accessed (for LRU, move to most recent)
	 */
	recordAccess(key: K): void;

	/**
	 * Record that a key was set/stored (add or update)
	 */
	recordSet(key: K, value: V): void;

	/**
	 * Evict one item when capacity exceeded
	 * Returns the evicted key-value pair, or undefined if nothing to evict
	 */
	evict(): KeyValuePair<K, V> | undefined;

	/**
	 * Check if item exists in eviction tracker
	 */
	has(key: K): boolean;

	/**
	 * Remove a key from eviction tracker (when explicitly deleted)
	 */
	remove(key: K): void;
}
