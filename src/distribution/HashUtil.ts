/**
 * Simple hash function for keys
 * No external dependencies, works with strings and objects
 */
export function simpleHash(key: unknown): number {
	const str = typeof key === "string" ? key : JSON.stringify(key);
	let hash = 0;

	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		// Using bit shift for simple hash computation
		hash = (hash << 5) - hash + char;
		// Convert to 32-bit integer
		hash = hash & hash;
	}

	// Return absolute value to avoid negative indices
	return Math.abs(hash);
}
