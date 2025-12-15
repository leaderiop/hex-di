# @hex-di/devtools API Reference

Visualization and debugging tools for HexDI dependency graphs.

## Installation

```bash
pnpm add @hex-di/devtools
```

## Overview

`@hex-di/devtools` provides:
- Export functions for JSON, DOT, and Mermaid formats
- Filter and transform utilities
- React DevTools components
- Tracing container for resolution monitoring

## Export Functions

### toJSON

Exports a graph to JSON format.

```typescript
function toJSON<TProvides extends Port<unknown, string>>(
  graph: Graph<TProvides>
): ExportedGraph
```

**Returns:**

```typescript
interface ExportedGraph {
  nodes: ExportedNode[];
  edges: ExportedEdge[];
}

interface ExportedNode {
  portName: string;
  lifetime: Lifetime;
  dependencies: string[];
}

interface ExportedEdge {
  from: string;
  to: string;
}
```

**Example:**

```typescript
import { toJSON } from '@hex-di/devtools';

const exported = toJSON(appGraph);
console.log(JSON.stringify(exported, null, 2));
```

### toDOT

Exports a graph to Graphviz DOT format.

```typescript
function toDOT<TProvides extends Port<unknown, string>>(
  graph: Graph<TProvides>,
  options?: DOTOptions
): string
```

**Options:**

```typescript
interface DOTOptions {
  title?: string;
  rankdir?: 'TB' | 'BT' | 'LR' | 'RL';
  colors?: {
    singleton?: string;
    scoped?: string;
    request?: string;
  };
}
```

**Example:**

```typescript
import { toDOT } from '@hex-di/devtools';

const dot = toDOT(appGraph, {
  title: 'App Dependencies',
  rankdir: 'LR',
  colors: {
    singleton: '#90EE90',
    scoped: '#87CEEB',
    request: '#FFB6C1'
  }
});

// Use with Graphviz: dot -Tpng graph.dot -o graph.png
```

### toMermaid

Exports a graph to Mermaid diagram format.

```typescript
function toMermaid<TProvides extends Port<unknown, string>>(
  graph: Graph<TProvides>,
  options?: MermaidOptions
): string
```

**Options:**

```typescript
interface MermaidOptions {
  direction?: 'TB' | 'BT' | 'LR' | 'RL';
  showLifetime?: boolean;
  theme?: string;
}
```

**Example:**

```typescript
import { toMermaid } from '@hex-di/devtools';

const mermaid = toMermaid(appGraph, {
  direction: 'TB',
  showLifetime: true
});

// Output:
// graph TD
//   Logger[Logger<br/>singleton]
//   UserService[UserService<br/>scoped]
//   UserService --> Logger
```

## Filter Functions

### filterGraph

Filters nodes by a predicate function.

```typescript
function filterGraph(
  exported: ExportedGraph,
  predicate: (node: ExportedNode) => boolean
): ExportedGraph
```

**Example:**

```typescript
import { toJSON, filterGraph } from '@hex-di/devtools';

const exported = toJSON(appGraph);

// Custom filter
const withDeps = filterGraph(exported, (node) =>
  node.dependencies.length > 0
);
```

### byLifetime

Creates a predicate for filtering by lifetime.

```typescript
function byLifetime(lifetime: Lifetime): (node: ExportedNode) => boolean
```

**Example:**

```typescript
import { filterGraph, byLifetime } from '@hex-di/devtools';

const singletons = filterGraph(exported, byLifetime('singleton'));
const scoped = filterGraph(exported, byLifetime('scoped'));
```

### byPortName

Creates a predicate for filtering by port name pattern.

```typescript
function byPortName(pattern: string | RegExp): (node: ExportedNode) => boolean
```

**Example:**

```typescript
import { filterGraph, byPortName } from '@hex-di/devtools';

// By string (exact match)
const loggers = filterGraph(exported, byPortName('Logger'));

// By regex
const services = filterGraph(exported, byPortName(/Service$/));
const userRelated = filterGraph(exported, byPortName(/User/));
```

### relabelPorts

Transforms node labels.

```typescript
function relabelPorts(
  exported: ExportedGraph,
  transform: (name: string) => string
): ExportedGraph
```

**Example:**

```typescript
import { relabelPorts } from '@hex-di/devtools';

// Add prefix
const prefixed = relabelPorts(exported, (name) => `App.${name}`);

// Remove suffix
const simplified = relabelPorts(exported, (name) =>
  name.replace('Port', '')
);
```

## React Components

### DevToolsFloating

A floating panel for development debugging.

```typescript
interface DevToolsFloatingProps {
  graph: Graph<Port<unknown, string>>;
  container?: Container<Port<unknown, string>>;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  defaultOpen?: boolean;
}
```

**Example:**

```typescript
import { DevToolsFloating } from '@hex-di/devtools';

function App() {
  return (
    <ContainerProvider container={container}>
      <MyApp />
      {process.env.NODE_ENV === 'development' && (
        <DevToolsFloating
          graph={appGraph}
          container={container}
          position="bottom-right"
        />
      )}
    </ContainerProvider>
  );
}
```

### DevToolsPanel

An embeddable panel for custom layouts.

```typescript
interface DevToolsPanelProps {
  graph: Graph<Port<unknown, string>>;
  container?: Container<Port<unknown, string>>;
  width?: number | string;
  height?: number | string;
}
```

**Example:**

```typescript
import { DevToolsPanel } from '@hex-di/devtools';

function DebugPage() {
  return (
    <div>
      <h1>Dependency Graph</h1>
      <DevToolsPanel
        graph={appGraph}
        container={container}
        height={600}
      />
    </div>
  );
}
```

## Tracing

### createTracingContainer

Creates a container with resolution tracing enabled.

```typescript
function createTracingContainer<TProvides extends Port<unknown, string>>(
  graph: Graph<TProvides>,
  options?: TracingOptions
): Container<TProvides> & TracingAPI
```

**Options:**

```typescript
interface TracingOptions {
  maxTraces?: number;
  retention?: 'sliding-window' | 'first-n' | 'last-n';
  filter?: (portName: string) => boolean;
}
```

**Returns:**
- A container with additional `TracingAPI` methods

**Example:**

```typescript
import { createTracingContainer } from '@hex-di/devtools';

const container = createTracingContainer(appGraph, {
  maxTraces: 1000,
  retention: 'sliding-window',
  filter: (name) => !name.includes('Logger')
});
```

### TracingAPI

Additional methods on tracing containers.

```typescript
interface TracingAPI {
  getTraces(): Trace[];
  getStats(): TraceStats;
  clearTraces(): void;
}

interface Trace {
  id: string;
  portName: string;
  timestamp: number;
  duration: number;
  lifetime: Lifetime;
  cached: boolean;
  scopeId?: string;
  dependencies: string[];
  error?: Error;
}

interface TraceStats {
  totalResolutions: number;
  byPort: Record<string, PortStats>;
}

interface PortStats {
  count: number;
  totalTime: number;
  avgTime: number;
  cacheHits: number;
}
```

**Example:**

```typescript
import { TRACING_ACCESS } from '@hex-di/runtime';

// Access tracing API
const tracingApi = container[TRACING_ACCESS];

// Get all traces
const traces = tracingApi.getTraces();
traces.forEach(t => {
  console.log(`${t.portName}: ${t.duration}ms (cached: ${t.cached})`);
});

// Get statistics
const stats = tracingApi.getStats();
console.log('Total resolutions:', stats.totalResolutions);
console.log('By port:', stats.byPort);

// Clear traces
tracingApi.clearTraces();
```

## Usage Examples

### Generate Documentation

```typescript
import { toMermaid } from '@hex-di/devtools';
import { appGraph } from './di/graph';

const diagram = toMermaid(appGraph, { direction: 'TB' });

const markdown = `
# Dependencies

\`\`\`mermaid
${diagram}
\`\`\`
`;
```

### Analyze Dependencies

```typescript
import { toJSON, filterGraph, byLifetime } from '@hex-di/devtools';

const exported = toJSON(appGraph);

// Find most connected services
const sorted = [...exported.nodes].sort(
  (a, b) => b.dependencies.length - a.dependencies.length
);
console.log('Most dependencies:', sorted.slice(0, 5));

// Find singletons
const singletons = filterGraph(exported, byLifetime('singleton'));
console.log('Singleton services:', singletons.nodes.length);
```

### Development Debugging

```typescript
import { createTracingContainer, DevToolsFloating } from '@hex-di/devtools';

// Create tracing container in development
const container = process.env.NODE_ENV === 'development'
  ? createTracingContainer(appGraph)
  : createContainer(appGraph);

function App() {
  return (
    <>
      <MyApp />
      {process.env.NODE_ENV === 'development' && (
        <DevToolsFloating
          graph={appGraph}
          container={container}
        />
      )}
    </>
  );
}
```
