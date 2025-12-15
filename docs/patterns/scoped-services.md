# Scoped Services

This guide covers patterns for request-scoped and user-scoped services.

## Understanding Scopes

Scopes provide isolation boundaries for scoped services:
- Each scope gets its own instances of scoped services
- Singletons are shared across all scopes
- Scopes must be explicitly created and disposed

```typescript
const scope1 = container.createScope();
const scope2 = container.createScope();

// Same singleton
scope1.resolve(LoggerPort) === scope2.resolve(LoggerPort); // true

// Different scoped instances
scope1.resolve(UserSessionPort) !== scope2.resolve(UserSessionPort); // true
```

## HTTP Request Pattern

Create a scope per HTTP request:

```typescript
// Express middleware
function scopeMiddleware(container: Container) {
  return (req, res, next) => {
    const scope = container.createScope();
    req.diScope = scope;

    // Dispose scope when response finishes
    res.on('finish', () => {
      scope.dispose().catch(err => {
        console.error('Scope disposal error:', err);
      });
    });

    next();
  };
}

// Usage
app.use(scopeMiddleware(container));

app.get('/users/:id', async (req, res) => {
  const userService = req.diScope.resolve(UserServicePort);
  const user = await userService.getUser(req.params.id);
  res.json(user);
});
```

### Request Context Service

```typescript
// Scoped request context
interface RequestContext {
  requestId: string;
  startTime: Date;
  userId?: string;
}

const RequestContextAdapter = createAdapter({
  provides: RequestContextPort,
  requires: [],
  lifetime: 'scoped',
  factory: () => ({
    requestId: generateRequestId(),
    startTime: new Date(),
    userId: undefined
  })
});

// Use in middleware
app.use((req, res, next) => {
  const scope = container.createScope();
  req.diScope = scope;

  // Initialize context with request data
  const context = scope.resolve(RequestContextPort);
  context.userId = req.user?.id;

  next();
});
```

## User Session Pattern

Create scopes per user session:

```typescript
// Session manager
class SessionManager {
  private sessions = new Map<string, Scope>();

  constructor(private container: Container) {}

  getSession(userId: string): Scope {
    if (!this.sessions.has(userId)) {
      const scope = this.container.createScope();
      this.sessions.set(userId, scope);
    }
    return this.sessions.get(userId)!;
  }

  async endSession(userId: string) {
    const scope = this.sessions.get(userId);
    if (scope) {
      await scope.dispose();
      this.sessions.delete(userId);
    }
  }

  async endAllSessions() {
    await Promise.all(
      Array.from(this.sessions.values()).map(s => s.dispose())
    );
    this.sessions.clear();
  }
}

// Usage
const sessionManager = new SessionManager(container);

app.use(authenticateUser);
app.use((req, res, next) => {
  req.userScope = sessionManager.getSession(req.user.id);
  next();
});

app.get('/profile', (req, res) => {
  const profile = req.userScope.resolve(UserProfilePort);
  res.json(profile);
});
```

## React Scope Patterns

### Pattern 1: Route-Based Scopes

```typescript
function App() {
  const location = useLocation();

  return (
    <ContainerProvider container={container}>
      {/* New scope per route */}
      <AutoScopeProvider key={location.pathname}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </AutoScopeProvider>
    </ContainerProvider>
  );
}
```

### Pattern 2: User-Based Scopes

```typescript
function AuthenticatedApp() {
  const { user } = useAuth();

  // New scope when user changes
  const scopeKey = user?.id ?? 'anonymous';

  return (
    <AutoScopeProvider key={scopeKey}>
      <UserContext.Provider value={user}>
        <MainContent />
      </UserContext.Provider>
    </AutoScopeProvider>
  );
}
```

### Pattern 3: Feature-Based Scopes

```typescript
function ChatFeature() {
  const [chatRoomId, setChatRoomId] = useState<string | null>(null);

  return (
    <div>
      <ChatRoomList onSelect={setChatRoomId} />

      {chatRoomId && (
        // New scope per chat room
        <AutoScopeProvider key={chatRoomId}>
          <ChatRoom roomId={chatRoomId} />
        </AutoScopeProvider>
      )}
    </div>
  );
}
```

### Pattern 4: Modal Scopes

```typescript
function UserEditModal({ userId, onClose }) {
  return (
    <Modal onClose={onClose}>
      {/* Isolated scope for modal */}
      <AutoScopeProvider>
        <UserEditForm userId={userId} onSave={onClose} />
      </AutoScopeProvider>
    </Modal>
  );
}
```

## Scoped Service Examples

### Database Transaction

```typescript
interface TransactionContext {
  transaction: DatabaseTransaction;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

const TransactionContextAdapter = createAdapter({
  provides: TransactionContextPort,
  requires: [DatabasePort, LoggerPort],
  lifetime: 'scoped',
  factory: async (deps) => {
    const tx = await deps.Database.beginTransaction();
    deps.Logger.log('Transaction started');

    return {
      transaction: tx,
      commit: async () => {
        await tx.commit();
        deps.Logger.log('Transaction committed');
      },
      rollback: async () => {
        await tx.rollback();
        deps.Logger.log('Transaction rolled back');
      }
    };
  },
  finalizer: async (ctx) => {
    // Auto-rollback on scope dispose if not committed
    if (ctx.transaction.isActive) {
      await ctx.rollback();
    }
  }
});
```

### Request Tracing

```typescript
interface RequestTrace {
  traceId: string;
  spans: Span[];
  startSpan(name: string): Span;
}

const RequestTraceAdapter = createAdapter({
  provides: RequestTracePort,
  requires: [LoggerPort],
  lifetime: 'scoped',
  factory: (deps) => {
    const traceId = generateTraceId();
    const spans: Span[] = [];

    deps.Logger.log(`Trace ${traceId} started`);

    return {
      traceId,
      spans,
      startSpan: (name) => {
        const span = new Span(traceId, name);
        spans.push(span);
        return span;
      }
    };
  },
  finalizer: (trace) => {
    console.log(`Trace ${trace.traceId}: ${trace.spans.length} spans`);
    // Send to tracing backend
    sendToTracing(trace);
  }
});
```

### User Preferences

```typescript
interface UserPreferences {
  theme: 'light' | 'dark';
  language: string;
  notifications: boolean;
}

const UserPreferencesAdapter = createAdapter({
  provides: UserPreferencesPort,
  requires: [UserSessionPort, DatabasePort],
  lifetime: 'scoped',
  factory: async (deps) => {
    const prefs = await deps.Database.query(
      'SELECT * FROM user_preferences WHERE user_id = ?',
      [deps.UserSession.user.id]
    );

    return prefs ?? {
      theme: 'light',
      language: 'en',
      notifications: true
    };
  }
});
```

## Nested Scopes

Create child scopes from existing scopes:

```typescript
const requestScope = container.createScope();

// Child scope inherits request scope's scoped instances
const childScope = requestScope.createScope();

// Singleton: same in all
container.resolve(LoggerPort) === requestScope.resolve(LoggerPort); // true

// Request scope's scoped: shared with child
requestScope.resolve(RequestContextPort) === childScope.resolve(RequestContextPort); // true

// Child's new scoped instances
const nestedService = childScope.resolve(NestedScopedPort); // New instance
```

## Scope Lifecycle Management

### Always Dispose Scopes

```typescript
// Express - using middleware
app.use((req, res, next) => {
  const scope = container.createScope();
  req.scope = scope;

  // Ensure disposal
  const cleanup = () => scope.dispose().catch(console.error);
  res.on('finish', cleanup);
  res.on('close', cleanup);

  next();
});
```

### Try-Finally Pattern

```typescript
async function processRequest(data) {
  const scope = container.createScope();
  try {
    const service = scope.resolve(ProcessorPort);
    return await service.process(data);
  } finally {
    await scope.dispose();
  }
}
```

### React Cleanup

```typescript
function ScopedComponent() {
  const container = useContainer();
  const scopeRef = useRef<Scope | null>(null);

  useEffect(() => {
    scopeRef.current = container.createScope();

    return () => {
      scopeRef.current?.dispose();
    };
  }, [container]);

  // Or use AutoScopeProvider which handles this
}
```

## Multi-Tenancy Pattern

```typescript
// Tenant context service
interface TenantContext {
  tenantId: string;
  config: TenantConfig;
}

const TenantContextAdapter = createAdapter({
  provides: TenantContextPort,
  requires: [],
  lifetime: 'scoped',
  factory: () => {
    // Will be populated by middleware
    return {
      tenantId: '',
      config: {} as TenantConfig
    };
  }
});

// Middleware to set tenant
app.use((req, res, next) => {
  const scope = container.createScope();
  req.scope = scope;

  // Get tenant from header/subdomain
  const tenantId = req.headers['x-tenant-id'] as string;

  // Populate tenant context
  const context = scope.resolve(TenantContextPort);
  context.tenantId = tenantId;
  context.config = loadTenantConfig(tenantId);

  next();
});

// Services use tenant context
const TenantDatabaseAdapter = createAdapter({
  provides: TenantDatabasePort,
  requires: [TenantContextPort, DatabasePoolPort],
  lifetime: 'scoped',
  factory: (deps) => {
    // Connect to tenant-specific database
    return deps.DatabasePool.getConnection(deps.TenantContext.config.dbName);
  }
});
```

## Worker Thread Pattern

```typescript
// Worker pool with scoped services
class WorkerPool {
  private workers: Worker[] = [];
  private container: Container;

  constructor(container: Container, size: number) {
    this.container = container;
    for (let i = 0; i < size; i++) {
      this.workers.push(new Worker('./worker.js'));
    }
  }

  async processJob(job: Job) {
    const scope = this.container.createScope();
    try {
      const processor = scope.resolve(JobProcessorPort);
      return await processor.process(job);
    } finally {
      await scope.dispose();
    }
  }
}
```

## Best Practices

### 1. Minimize Scope Lifetime

```typescript
// Good - scope only for request duration
async function handleRequest(req) {
  const scope = container.createScope();
  try {
    return await processRequest(scope, req);
  } finally {
    await scope.dispose();
  }
}

// Avoid - long-lived scopes
const globalScope = container.createScope();
// Never disposed...
```

### 2. Don't Share Scopes Across Requests

```typescript
// Good - new scope per request
app.use((req, res, next) => {
  req.scope = container.createScope();
  next();
});

// Bad - shared scope
const sharedScope = container.createScope();
app.use((req, res, next) => {
  req.scope = sharedScope; // All requests share same scoped instances!
  next();
});
```

### 3. Initialize Scoped Services Early

```typescript
// Initialize context at start of scope
app.use(async (req, res, next) => {
  const scope = container.createScope();

  // Eagerly resolve and initialize
  const context = scope.resolve(RequestContextPort);
  context.requestId = req.headers['x-request-id'];
  context.userId = req.user?.id;

  req.scope = scope;
  next();
});
```

### 4. Use Finalizers for Cleanup

```typescript
const TempFileAdapter = createAdapter({
  provides: TempFilePort,
  requires: [LoggerPort],
  lifetime: 'scoped',
  factory: (deps) => {
    const path = createTempFile();
    deps.Logger.log(`Created temp file: ${path}`);
    return { path };
  },
  finalizer: (file) => {
    deleteFile(file.path);
  }
});
```

## Next Steps

- Learn [Finalizers and Cleanup](./finalizers-and-cleanup.md) patterns
- Explore [React Integration](../guides/react-integration.md)
- See [Testing Strategies](../guides/testing-strategies.md)
