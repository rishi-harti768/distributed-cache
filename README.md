# Distributed Cache

A production-grade, interview-ready distributed cache system implemented in TypeScript with pluggable distribution strategies and eviction policies.

## Overview

This project implements a distributed cache that:

- **Distributes** keys across multiple cache nodes using configurable strategies
- **Caches** frequently accessed data to reduce database queries
- **Evicts** items using pluggable policies (LRU, with extensibility for MRU, LFU)
- **Routes** all requests via a clean Strategy pattern for extensibility
- **Maintains** zero external dependencies and zero TypeScript strict mode errors

### Key Features

| Feature                   | Implementation                                                |
| ------------------------- | ------------------------------------------------------------- |
| **Distribution Strategy** | Pluggable (modulo hashing provided; consistent hashing ready) |
| **Eviction Policy**       | Pluggable (LRU provided; MRU, LFU ready)                      |
| **Cache Hit Path**        | Local node lookup, no DB call                                 |
| **Cache Miss Path**       | DB fetch → local cache → return                               |
| **Per-Node Eviction**     | Independent LRU tracking per node                             |
| **Type Safety**           | 100% TypeScript strict mode                                   |
| **Dependencies**          | Zero external packages                                        |

---

## Architecture

### Design Patterns Applied

- **Strategy Pattern** — `DistributionStrategy` and `EvictionPolicy` are pluggable
- **Facade Pattern** — `DistributedCache` hides node management complexity
- **Dependency Inversion** — Core logic depends on abstractions, not implementations

### Component Overview

```
DistributedCache (Facade)
├── Routes via DistributionStrategy
├── Manages multiple CacheNodes
└── Each CacheNode
    ├── Local storage (Map)
    ├── EvictionPolicy tracker
    └── Database interface
```

### Directory Structure

```
src/
├── interfaces/
│   ├── Database.ts              # External DB abstraction
│   ├── EvictionPolicy.ts        # Eviction algorithm contract
│   └── DistributionStrategy.ts  # Routing algorithm contract
├── distribution/
│   ├── HashUtil.ts              # Hash function utility
│   └── ModuloDistributionStrategy.ts  # hash(key) % nodeCount
├── eviction/
│   └── LRUEvictionPolicy.ts     # Least-Recently-Used eviction
├── cache/
│   ├── CacheNode.ts             # Single node logic
│   └── DistributedCache.ts      # Main facade
└── index.ts                     # Demo + exports
```

---

## Installation & Running

### Prerequisites

- [Bun](https://bun.com) v1.3.9+
- TypeScript 6.0.2+

### Install Dependencies

```bash
bun install
```

### Run the Demo

```bash
bun run index.ts
```

This executes a comprehensive demo showing:

1. **Cache Hit** — Getting a key that exists in cache
2. **Cache Miss** — Getting a key that requires DB fetch and caching
3. **Distribution** — Keys routed to different nodes via hash modulo
4. **LRU Eviction** — Eviction when node capacity is exceeded

### Verify TypeScript Compilation

```bash
bunx tsc --noEmit
```

Expected output: ✅ **0 errors**

---

## Usage Guide

### Creating a Distributed Cache

```typescript
import {
  DistributedCache,
  ModuloDistributionStrategy,
  LRUEvictionPolicy,
} from "./src/cache/DistributedCache";
import type { Database } from "./src/interfaces/Database";

// Implement your database interface
class MyDatabase<K, V> implements Database<K, V> {
  async get(key: K): Promise<V | undefined> {
    // Fetch from your actual database
  }

  async put(key: K, value: V): Promise<void> {
    // Store in your actual database
  }
}

// Create the cache
const db = new MyDatabase<string, string>();
const cache = new DistributedCache(
  3, // Number of nodes
  100, // Capacity per node
  db, // Database instance
  new ModuloDistributionStrategy<string>(), // Distribution strategy
  () => new LRUEvictionPolicy<string, string>(100), // Eviction policy factory
);

// Use the cache
await cache.put("user:123", "John Doe");
const value = await cache.get("user:123"); // Cache hit
```

### How Cache Hit Works

```typescript
// Key is in cache node
const value = await cache.get("user:123");
// → Node lookup (O(1))
// → Record access (for LRU)
// → Return value (no DB call)
```

### How Cache Miss Works

```typescript
// Key not in cache, but exists in database
const value = await cache.get("user:456");
// → Node lookup (O(1))
// → Cache miss
// → Fetch from database
// → Store in node cache
// → Record in eviction policy
// → Return value
```

### How Eviction Works

```typescript
// Node has capacity 2, trying to store 3 items
await cache.put("key:1", "val1"); // Node: [key:1]
await cache.put("key:2", "val2"); // Node: [key:1, key:2]
await cache.put("key:3", "val3"); // Node: [key:2, key:3] ← key:1 evicted (LRU)

// Accessing key:1 will fetch from database
const val = await cache.get("key:1");
```

---

## Extension Guide

### Implementing a Custom Distribution Strategy

```typescript
import type { DistributionStrategy } from "./src/interfaces/DistributionStrategy";

export class ConsistentHashStrategy<K> implements DistributionStrategy<K> {
  getNodeIndex(key: K, nodeCount: number): number {
    // Your consistent hashing implementation
    // The interface only requires this one method!
  }
}

// Use it immediately
const cache = new DistributedCache(
  3,
  100,
  db,
  new ConsistentHashStrategy<string>(), // ← Plug it in
  () => new LRUEvictionPolicy<string, string>(100),
);
```

### Implementing a Custom Eviction Policy

```typescript
import type {
  EvictionPolicy,
  KeyValuePair,
} from "./src/interfaces/EvictionPolicy";

export class LFUEvictionPolicy<K, V> implements EvictionPolicy<K, V> {
  recordSet(key: K, value: V): void {
    /* ... */
  }
  recordAccess(key: K): void {
    /* ... */
  }
  evict(): KeyValuePair<K, V> | undefined {
    /* ... */
  }
  has(key: K): boolean {
    /* ... */
  }
  remove(key: K): void {
    /* ... */
  }
}

// Use it immediately
const cache = new DistributedCache(
  3,
  100,
  db,
  new ModuloDistributionStrategy<string>(),
  () => new LFUEvictionPolicy<string, string>(100), // ← Plug it in
);
```

---

## Design Principles

This implementation follows SOLID and clean code principles:

| Principle                            | Application                                                                        |
| ------------------------------------ | ---------------------------------------------------------------------------------- |
| **S** — Single Responsibility        | Each class owns one responsibility: distribution, eviction, routing, or node logic |
| **O** — Open/Closed                  | New strategies extend without modifying existing code                              |
| **L** — Liskov Substitution          | All strategies are substitutable via their interfaces                              |
| **I** — Interface Segregation        | Interfaces are minimal and focused                                                 |
| **D** — Dependency Inversion         | Cache depends on abstractions, not implementations                                 |
| **DRY** — Don't Repeat Yourself      | No duplication of distribution or eviction logic                                   |
| **KISS** — Keep It Simple            | Modulo hashing, per-node LRU, no unnecessary complexity                            |
| **YAGNI** — You Aren't Gonna Need It | Only what's needed for the spec, not hypothetical features                         |

---

## Testing the Demo

The included demo (`src/index.ts`) tests all core scenarios:

```bash
bun run index.ts
```

**Output highlights:**

- Configuration: 3 nodes, 2 capacity per node
- Scenario 1: Put and get (cache hit)
- Scenario 2: Cache miss with database fetch
- Scenario 3: Distribution across nodes (keys route consistently)
- Scenario 4: LRU eviction (least recently used item removed)

---

## Specifications Met

| Requirement                           | Status | How                                                                       |
| ------------------------------------- | ------ | ------------------------------------------------------------------------- |
| `get(key)` operation                  | ✅     | `DistributedCache.get()` routes to node, returns value or fetches from DB |
| `put(key, value)` operation           | ✅     | `DistributedCache.put()` routes to node, stores, updates DB               |
| Distributed across configurable nodes | ✅     | Constructor accepts `numberOfNodes` parameter                             |
| Cache hit returns value               | ✅     | Node checks local storage first, no DB call                               |
| Cache miss fetches from DB            | ✅     | Node fetches from database, stores, returns                               |
| Pluggable distribution strategy       | ✅     | `DistributionStrategy` interface, modulo provided                         |
| Pluggable eviction policy             | ✅     | `EvictionPolicy` interface, LRU provided                                  |
| LRU eviction in current impl          | ✅     | `LRUEvictionPolicy` tracks access order                                   |
| Zero external dependencies            | ✅     | No npm packages, only TypeScript & Bun                                    |
| Zero TypeScript errors                | ✅     | `bunx tsc --noEmit` returns 0 errors                                      |
| Zero runtime errors                   | ✅     | Demo runs successfully with mock database                                 |

---

## Performance Characteristics

| Operation         | Time Complexity                    | Space Complexity     |
| ----------------- | ---------------------------------- | -------------------- |
| `get(key)`        | O(1) lookup + O(log n) LRU update  | O(nodeCount) nodes   |
| `put(key, value)` | O(1) storage + O(log n) LRU update | O(capacity) per node |
| Distribution      | O(1) hash + modulo                 | O(1)                 |
| Eviction          | O(n) LRU scan (n = capacity)       | O(capacity)          |

_Note: Per-node LRU implementation uses O(n) eviction for simplicity; production could optimize with linked lists._

---

## Future Enhancements

Easily plug in without modifying core code:

- 🔄 **Consistent Hashing** — Replace `ModuloDistributionStrategy`
- 🔄 **LFU Eviction** — Implement `EvictionPolicy`, track frequency
- 🔄 **MRU Eviction** — Implement `EvictionPolicy`, track most recent
- 🔄 **TTL Support** — Add expiration to `CacheNode`
- 🔄 **Metrics/Observability** — Wrap nodes with observer pattern
- 🔄 **Network Replication** — Async replication between real nodes

---

## Type Safety

All code is 100% TypeScript with `strict: true`:

```typescript
"compilerOptions": {
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitOverride": true,
  "verbatimModuleSyntax": true
}
```

This ensures:

- ✅ No implicit `any`
- ✅ No optional chaining surprises
- ✅ No unintended type coercion
- ✅ Full IDE autocomplete support
