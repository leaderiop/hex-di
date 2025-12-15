# First Application

Let's build a complete application step by step to see HexDI in action. We'll create a simple task management service with logging.

## What We'll Build

A task service that:
- Logs all operations
- Stores tasks in memory
- Demonstrates dependency injection patterns

## Project Setup

Create a new directory and initialize the project:

```bash
mkdir hexdi-tasks
cd hexdi-tasks
pnpm init
pnpm add @hex-di/ports @hex-di/graph @hex-di/runtime typescript tsx
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "moduleResolution": "bundler",
    "target": "ES2022",
    "module": "ESNext",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

## Step 1: Define Service Interfaces

Create `src/types.ts`:

```typescript
/**
 * Service interfaces for our task application.
 * These define WHAT services do, not HOW they do it.
 */

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
}

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export interface TaskStore {
  getAll(): Task[];
  getById(id: string): Task | undefined;
  add(title: string): Task;
  complete(id: string): boolean;
  delete(id: string): boolean;
}

export interface TaskService {
  listTasks(): Task[];
  createTask(title: string): Task;
  completeTask(id: string): void;
  deleteTask(id: string): void;
}
```

## Step 2: Create Ports

Create `src/ports.ts`:

```typescript
/**
 * Port definitions - typed tokens for our services.
 * Ports are the "contracts" in our dependency injection system.
 */

import { createPort } from '@hex-di/ports';
import type { Logger, TaskStore, TaskService } from './types.js';

// Logger port - singleton service for logging
export const LoggerPort = createPort<'Logger', Logger>('Logger');

// TaskStore port - singleton service for task persistence
export const TaskStorePort = createPort<'TaskStore', TaskStore>('TaskStore');

// TaskService port - the main service consumers interact with
export const TaskServicePort = createPort<'TaskService', TaskService>('TaskService');

// Type representing all ports in our app
export type AppPorts =
  | typeof LoggerPort
  | typeof TaskStorePort
  | typeof TaskServicePort;
```

## Step 3: Create Adapters

Create `src/adapters.ts`:

```typescript
/**
 * Adapter implementations - the concrete implementations of our ports.
 * Adapters define HOW services work and what they depend on.
 */

import { createAdapter } from '@hex-di/graph';
import { LoggerPort, TaskStorePort, TaskServicePort } from './ports.js';
import type { Task, Logger, TaskStore, TaskService } from './types.js';

// =============================================================================
// Logger Adapter - No dependencies, singleton lifetime
// =============================================================================

export const ConsoleLoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: 'singleton',
  factory: (): Logger => {
    const timestamp = () => new Date().toISOString();

    return {
      info: (message) => console.log(`[${timestamp()}] INFO: ${message}`),
      warn: (message) => console.warn(`[${timestamp()}] WARN: ${message}`),
      error: (message) => console.error(`[${timestamp()}] ERROR: ${message}`)
    };
  }
});

// =============================================================================
// TaskStore Adapter - Depends on Logger, singleton lifetime
// =============================================================================

export const InMemoryTaskStoreAdapter = createAdapter({
  provides: TaskStorePort,
  requires: [LoggerPort],
  lifetime: 'singleton',
  factory: (deps): TaskStore => {
    // deps is typed as { Logger: Logger }
    const { Logger } = deps;

    // In-memory storage
    const tasks: Map<string, Task> = new Map();
    let nextId = 1;

    Logger.info('TaskStore initialized');

    return {
      getAll: () => {
        Logger.info(`Fetching all tasks (${tasks.size} total)`);
        return Array.from(tasks.values());
      },

      getById: (id) => {
        const task = tasks.get(id);
        if (task) {
          Logger.info(`Found task: ${id}`);
        } else {
          Logger.warn(`Task not found: ${id}`);
        }
        return task;
      },

      add: (title) => {
        const task: Task = {
          id: `task-${nextId++}`,
          title,
          completed: false,
          createdAt: new Date()
        };
        tasks.set(task.id, task);
        Logger.info(`Created task: ${task.id} - "${title}"`);
        return task;
      },

      complete: (id) => {
        const task = tasks.get(id);
        if (task) {
          task.completed = true;
          Logger.info(`Completed task: ${id}`);
          return true;
        }
        Logger.warn(`Cannot complete - task not found: ${id}`);
        return false;
      },

      delete: (id) => {
        const deleted = tasks.delete(id);
        if (deleted) {
          Logger.info(`Deleted task: ${id}`);
        } else {
          Logger.warn(`Cannot delete - task not found: ${id}`);
        }
        return deleted;
      }
    };
  }
});

// =============================================================================
// TaskService Adapter - Depends on Logger and TaskStore, singleton lifetime
// =============================================================================

export const TaskServiceAdapter = createAdapter({
  provides: TaskServicePort,
  requires: [LoggerPort, TaskStorePort],
  lifetime: 'singleton',
  factory: (deps): TaskService => {
    // deps is typed as { Logger: Logger; TaskStore: TaskStore }
    const { Logger, TaskStore } = deps;

    Logger.info('TaskService initialized');

    return {
      listTasks: () => {
        Logger.info('Listing all tasks');
        return TaskStore.getAll();
      },

      createTask: (title) => {
        if (!title.trim()) {
          Logger.error('Cannot create task with empty title');
          throw new Error('Task title cannot be empty');
        }
        Logger.info(`Creating task: "${title}"`);
        return TaskStore.add(title);
      },

      completeTask: (id) => {
        Logger.info(`Completing task: ${id}`);
        const success = TaskStore.complete(id);
        if (!success) {
          throw new Error(`Task not found: ${id}`);
        }
      },

      deleteTask: (id) => {
        Logger.info(`Deleting task: ${id}`);
        const success = TaskStore.delete(id);
        if (!success) {
          throw new Error(`Task not found: ${id}`);
        }
      }
    };
  }
});
```

## Step 4: Build the Graph

Create `src/graph.ts`:

```typescript
/**
 * Graph composition - wire all adapters together.
 * The graph is validated at compile time!
 */

import { GraphBuilder } from '@hex-di/graph';
import {
  ConsoleLoggerAdapter,
  InMemoryTaskStoreAdapter,
  TaskServiceAdapter
} from './adapters.js';

// Build the dependency graph
// Order doesn't matter - HexDI validates dependencies at compile time
export const appGraph = GraphBuilder.create()
  .provide(ConsoleLoggerAdapter)      // provides Logger
  .provide(InMemoryTaskStoreAdapter)  // provides TaskStore, requires Logger
  .provide(TaskServiceAdapter)        // provides TaskService, requires Logger & TaskStore
  .build();

// Try commenting out ConsoleLoggerAdapter - you'll get a compile error!
// The error will show exactly which dependencies are missing.
```

## Step 5: Create the Container and Use It

Create `src/main.ts`:

```typescript
/**
 * Application entry point - create container and use services.
 */

import { createContainer } from '@hex-di/runtime';
import { appGraph } from './graph.js';
import { TaskServicePort, LoggerPort } from './ports.js';

// Create the container from our validated graph
const container = createContainer(appGraph);

// Get our services
const logger = container.resolve(LoggerPort);
const taskService = container.resolve(TaskServicePort);

// Use the task service
async function main() {
  logger.info('=== Task Management Demo ===');

  // Create some tasks
  const task1 = taskService.createTask('Learn HexDI');
  const task2 = taskService.createTask('Build an app');
  const task3 = taskService.createTask('Write tests');

  // List all tasks
  console.log('\nAll tasks:');
  taskService.listTasks().forEach(task => {
    console.log(`  - [${task.completed ? 'x' : ' '}] ${task.title} (${task.id})`);
  });

  // Complete a task
  taskService.completeTask(task1.id);

  // Delete a task
  taskService.deleteTask(task3.id);

  // List tasks again
  console.log('\nTasks after updates:');
  taskService.listTasks().forEach(task => {
    console.log(`  - [${task.completed ? 'x' : ' '}] ${task.title} (${task.id})`);
  });

  // Cleanup
  await container.dispose();
  logger.info('Application shutdown complete');
}

main().catch(console.error);
```

## Step 6: Run the Application

```bash
npx tsx src/main.ts
```

You should see output like:

```
[2024-01-15T10:30:00.000Z] INFO: TaskStore initialized
[2024-01-15T10:30:00.001Z] INFO: TaskService initialized
[2024-01-15T10:30:00.001Z] INFO: === Task Management Demo ===
[2024-01-15T10:30:00.001Z] INFO: Creating task: "Learn HexDI"
[2024-01-15T10:30:00.001Z] INFO: Created task: task-1 - "Learn HexDI"
[2024-01-15T10:30:00.002Z] INFO: Creating task: "Build an app"
[2024-01-15T10:30:00.002Z] INFO: Created task: task-2 - "Build an app"
[2024-01-15T10:30:00.002Z] INFO: Creating task: "Write tests"
[2024-01-15T10:30:00.002Z] INFO: Created task: task-3 - "Write tests"

All tasks:
  - [ ] Learn HexDI (task-1)
  - [ ] Build an app (task-2)
  - [ ] Write tests (task-3)

[2024-01-15T10:30:00.003Z] INFO: Completing task: task-1
[2024-01-15T10:30:00.003Z] INFO: Completed task: task-1
[2024-01-15T10:30:00.003Z] INFO: Deleting task: task-3
[2024-01-15T10:30:00.003Z] INFO: Deleted task: task-3

Tasks after updates:
  - [x] Learn HexDI (task-1)
  - [ ] Build an app (task-2)

[2024-01-15T10:30:00.004Z] INFO: Application shutdown complete
```

## Understanding What Happened

### Dependency Resolution Order

HexDI automatically resolves dependencies in the correct order:

1. When you call `container.resolve(TaskServicePort)`:
2. HexDI sees TaskService needs Logger and TaskStore
3. It resolves Logger first (no dependencies)
4. Then resolves TaskStore (needs Logger, already resolved)
5. Finally creates TaskService with both dependencies injected

### Singleton Behavior

All our services are singletons:
- The same Logger instance is used everywhere
- TaskStore is created once and shared
- TaskService is created once with its dependencies

### Type Safety

Try these experiments:

1. **Remove an adapter from the graph:**
   ```typescript
   const graph = GraphBuilder.create()
     // .provide(ConsoleLoggerAdapter)  // Comment this out
     .provide(InMemoryTaskStoreAdapter)
     .provide(TaskServiceAdapter)
     .build(); // Compile error!
   ```

2. **Resolve a port not in the graph:**
   ```typescript
   const unknownPort = createPort<'Unknown', { foo: string }>('Unknown');
   container.resolve(unknownPort); // Compile error!
   ```

3. **Wrong dependency in factory:**
   ```typescript
   factory: (deps) => {
     deps.NonExistent.method(); // Compile error!
   }
   ```

## Project Structure

After completing this tutorial, your project looks like:

```
hexdi-tasks/
├── package.json
├── tsconfig.json
└── src/
    ├── types.ts      # Service interfaces
    ├── ports.ts      # Port definitions
    ├── adapters.ts   # Adapter implementations
    ├── graph.ts      # Graph composition
    └── main.ts       # Application entry
```

This structure separates concerns clearly:
- **types.ts** - Pure TypeScript interfaces (no HexDI)
- **ports.ts** - Contracts for dependency injection
- **adapters.ts** - Implementations with dependency declarations
- **graph.ts** - Wiring everything together
- **main.ts** - Application code using the container

## Next Steps

- Learn about [Lifetimes](./lifetimes.md) for scoped and request services
- Explore [Project Structure](../patterns/project-structure.md) patterns
- Add [React Integration](../guides/react-integration.md) for React apps
- Set up [Testing](../guides/testing-strategies.md) with mocks
