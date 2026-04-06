import type { Database } from "../interfaces/Database";
import type { EvictionPolicy } from "../interfaces/EvictionPolicy";

/**
 * CacheNode - represents a single node in the distributed cache
 * Each node has its own storage and LRU eviction policy
 *
 * Single Responsibility: manage local cache storage and eviction for one node
 * Dependency Inversion: depends on Database and EvictionPolicy abstractions, not implementations
 */
export class CacheNode<K, V> {
	private readonly storage: Map<K, V> = new Map();
	private readonly database: Database<K, V>;
	private readonly evictionPolicy: EvictionPolicy<K, V>;

	constructor(database: Database<K, V>, evictionPolicy: EvictionPolicy<K, V>) {
		this.database = database;
		this.evictionPolicy = evictionPolicy;
	}

	/**
	 * Get a value by key
	 * Cache hit: return from storage, record access for LRU
	 * Cache miss: fetch from database, store locally, return
	 */
	async get(key: K): Promise<V | undefined> {
		// Cache hit
		if (this.storage.has(key)) {
			const value = this.storage.get(key);
			this.evictionPolicy.recordAccess(key);
			return value;
		}

		// Cache miss: fetch from database
		const value = await this.database.get(key);

		// If found in database, cache it
		if (value !== undefined) {
			await this.putLocal(key, value);
		}

		return value;
	}

	/**
	 * Put a value in the cache
	 * Stores locally and updates database
	 * Eviction policy tracks this insertion
	 */
	async put(key: K, value: V): Promise<void> {
		await this.putLocal(key, value);
		// Update database
		await this.database.put(key, value);
	}

	/**
	 * Internal helper: put in local storage without DB update
	 */
	private async putLocal(key: K, value: V): Promise<void> {
		// Store locally
		this.storage.set(key, value);

		// Record in eviction policy (may trigger eviction if over capacity)
		this.evictionPolicy.recordSet(key, value);
	}

	/**
	 * Check if key is in local storage (without DB fallback)
	 */
	has(key: K): boolean {
		return this.storage.has(key);
	}
}
