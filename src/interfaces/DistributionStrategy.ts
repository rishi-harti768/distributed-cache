/**
 * Distribution strategy abstraction (Strategy pattern)
 * Pluggable algorithm for deciding which cache node stores a key
 */
export interface DistributionStrategy<K> {
	/**
	 * Determine which node index should store this key
	 * @param key The key to route
	 * @param nodeCount Total number of cache nodes
	 * @returns Node index (0 to nodeCount - 1)
	 */
	getNodeIndex(key: K, nodeCount: number): number;
}
