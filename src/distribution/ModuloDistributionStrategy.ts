import type { DistributionStrategy } from "../interfaces/DistributionStrategy";
import { simpleHash } from "./HashUtil";

/**
 * Modulo-based distribution strategy
 * Routes keys using: hash(key) % numberOfNodes
 * Simple, deterministic, suitable for interview
 *
 * Pattern: Strategy
 * Why: Pluggable distribution allows swapping modulo with consistent hashing later
 */
export class ModuloDistributionStrategy<K> implements DistributionStrategy<K> {
	getNodeIndex(key: K, nodeCount: number): number {
		if (nodeCount <= 0) {
			throw new Error("nodeCount must be > 0");
		}
		return simpleHash(key) % nodeCount;
	}
}
