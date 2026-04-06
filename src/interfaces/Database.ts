/**
 * Database abstraction - caller provides implementation
 * Represents external data store for cache misses
 */
export interface Database<K, V> {
	get(key: K): Promise<V | undefined>;
	put(key: K, value: V): Promise<void>;
}
