import type { Database } from "../interfaces/Database";
import type { DistributionStrategy } from "../interfaces/DistributionStrategy";
import type { EvictionPolicy } from "../interfaces/EvictionPolicy";
import { CacheNode } from "./CacheNode";

/**
 * DistributedCache - main facade for distributed cache system
 * Manages multiple cache nodes and routes requests via distribution strategy
 *
 * Pattern: Facade
 * Why: Hides complexity of node management, eviction policy creation, and routing
 *
 * Single Responsibility: coordinate cache nodes and route requests
 * Dependency Inversion: depends on abstraction (Database, DistributionStrategy, EvictionPolicy), not implementations
 */
export class DistributedCache<K, V> {
	private readonly nodes: CacheNode<K, V>[];
	private readonly distributionStrategy: DistributionStrategy<K>;
	private readonly nodeCount: number;

	constructor(
		numberOfNodes: number,
		nodeCapacity: number,
		database: Database<K, V>,
		distributionStrategy: DistributionStrategy<K>,
		evictionPolicyFactory: () => EvictionPolicy<K, V>,
	) {
		if (numberOfNodes <= 0) {
			throw new Error("numberOfNodes must be > 0");
		}
		if (nodeCapacity <= 0) {
			throw new Error("nodeCapacity must be > 0");
		}

		this.nodeCount = numberOfNodes;
		this.distributionStrategy = distributionStrategy;

		// Initialize cache nodes
		this.nodes = [];
		for (let i = 0; i < numberOfNodes; i++) {
			const evictionPolicy = evictionPolicyFactory();
			const node = new CacheNode(database, evictionPolicy);
			this.nodes.push(node);
		}
	}

	/**
	 * Get a value from the cache
	 * Routes request to appropriate node via distribution strategy
	 */
	async get(key: K): Promise<V | undefined> {
		const nodeIndex = this.distributionStrategy.getNodeIndex(
			key,
			this.nodeCount,
		);
		const node = this.nodes[nodeIndex];

		if (!node) {
			throw new Error(`Invalid node index: ${nodeIndex}`);
		}

		return node.get(key);
	}

	/**
	 * Put a value in the cache
	 * Routes request to appropriate node via distribution strategy
	 */
	async put(key: K, value: V): Promise<void> {
		const nodeIndex = this.distributionStrategy.getNodeIndex(
			key,
			this.nodeCount,
		);
		const node = this.nodes[nodeIndex];

		if (!node) {
			throw new Error(`Invalid node index: ${nodeIndex}`);
		}

		await node.put(key, value);
	}

	/**
	 * Get the total number of nodes (useful for debugging/testing)
	 */
	getNodeCount(): number {
		return this.nodeCount;
	}

	/**
	 * Get a specific node (useful for debugging/testing)
	 */
	getNode(index: number): CacheNode<K, V> | undefined {
		return this.nodes[index];
	}
}
