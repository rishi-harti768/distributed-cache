import type { Database } from "./interfaces/Database";
import { DistributedCache } from "./cache/DistributedCache";
import { ModuloDistributionStrategy } from "./distribution/ModuloDistributionStrategy";
import { LRUEvictionPolicy } from "./eviction/LRUEvictionPolicy";

/**
 * Mock database for demonstration
 * Simulates an external data store
 */
class MockDatabase<K, V> implements Database<K, V> {
	private store: Map<K, V> = new Map();

	async get(key: K): Promise<V | undefined> {
		console.log(`  [DB] get("${String(key)}")`);
		return this.store.get(key);
	}

	async put(key: K, value: V): Promise<void> {
		console.log(`  [DB] put("${String(key)}", ${JSON.stringify(value)})`);
		this.store.set(key, value);
	}
}

/**
 * Main demonstration
 */
async function main() {
	console.log("=== Distributed Cache Demo ===\n");

	// Setup
	const db = new MockDatabase<string, string>();
	const distributionStrategy = new ModuloDistributionStrategy<string>();
	const evictionPolicyFactory = () => new LRUEvictionPolicy<string, string>(2); // Capacity: 2 per node

	const cache = new DistributedCache(
		3, // 3 nodes
		2, // capacity 2 per node
		db,
		distributionStrategy,
		evictionPolicyFactory,
	);

	console.log("Configuration:");
	console.log(`  - Number of nodes: ${cache.getNodeCount()}`);
	console.log(`  - Capacity per node: 2`);
	console.log(`  - Distribution: Modulo hashing`);
	console.log(`  - Eviction: LRU\n`);

	// Scenario 1: Put and Get (cache miss → database hit)
	console.log("--- Scenario 1: Put and Get ---");
	console.log('Action: put("user:1", "Alice")');
	await cache.put("user:1", "Alice");
	console.log("Result: Stored in local node cache and database\n");

	console.log('Action: get("user:1")');
	const result1 = await cache.get("user:1");
	console.log(`Result: Cache hit, returned "${result1}"\n`);

	// Scenario 2: Cache miss with database fetch
	console.log("--- Scenario 2: Cache miss with database fetch ---");
	console.log('Assume "user:2" exists in database but not in cache');
	// Pre-populate database
	await db.put("user:2", "Bob");
	console.log('Action: get("user:2")');
	const result2 = await cache.get("user:2");
	console.log(`Result: Fetched from database, cached, returned "${result2}"\n`);

	// Scenario 3: Demonstrate distribution across nodes
	console.log("--- Scenario 3: Distribution across nodes ---");
	const keys = ["key:A", "key:B", "key:C", "key:D", "key:E"];
	console.log(`Putting ${keys.length} keys to test distribution:`);
	for (const key of keys) {
		const nodeIndex = distributionStrategy.getNodeIndex(
			key,
			cache.getNodeCount(),
		);
		console.log(`  "${key}" → Node ${nodeIndex}`);
		await cache.put(key, `value-${key}`);
	}
	console.log();

	// Scenario 4: LRU Eviction
	console.log("--- Scenario 4: LRU Eviction ---");
	console.log(
		"Each node has capacity 2. Filling one node to trigger eviction:\n",
	);

	// Find a node to fill
	const testKey1 = "test:1";
	const testKey2 = "test:2";
	const testKey3 = "test:3";
	const nodeIdx = distributionStrategy.getNodeIndex(
		testKey1,
		cache.getNodeCount(),
	);

	console.log(`Putting "${testKey1}" and "${testKey2}" to node ${nodeIdx}:`);
	await cache.put(testKey1, "value1");
	await cache.put(testKey2, "value2");
	console.log("Both stored (node now at capacity)\n");

	console.log(`Putting "${testKey3}" to same node ${nodeIdx}:`);
	console.log("This should evict the least recently used item (test:1)\n");
	await cache.put(testKey3, "value3");

	// Verify eviction: test:1 should be gone, test:2 and test:3 should be in node
	console.log("Verification:");
	console.log(`get("${testKey1}") - should hit DB (was evicted from cache)`);
	const evicted = await cache.get(testKey1);
	console.log(
		`Result: ${evicted === "value1" ? "retrieved from DB" : "not found"}\n`,
	);

	console.log(`get("${testKey2}") - should hit cache (still in node)`);
	const kept = await cache.get(testKey2);
	console.log(`Result: Cache hit, returned "${kept}"\n`);

	console.log("=== Demo Complete ===");
}

export { DistributedCache, ModuloDistributionStrategy, LRUEvictionPolicy };
export type { Database };

export async function runDemo() {
	await main();
}
