# Testability & AI-Ergonomic Design Standards

This guide provides comprehensive standards for designing code that is both highly testable and optimized for AI/LLM interaction. These principles ensure robust, maintainable systems that work effectively with AI-assisted development tools.

---

## Table of Contents

1. [Test-Driven Development with LLM Code Generation](#test-driven-development-with-llm-code-generation)
2. [LLM-Friendly Documentation Patterns](#llm-friendly-documentation-patterns)
3. [Design Patterns for AI-Assisted Systems](#design-patterns-for-ai-assisted-systems)
4. [Explicit, Observable, and Testable Orchestration](#explicit-observable-and-testable-orchestration)
5. [Avoiding Implicit State and Memory Reliance](#avoiding-implicit-state-and-memory-reliance)
6. [Self-Documenting Code and Naming Conventions](#self-documenting-code-and-naming-conventions)
7. [Second LLM as Judge Pattern](#second-llm-as-judge-pattern)
8. [Building Robust Systems Over Demo-ware](#building-robust-systems-over-demo-ware)
9. [TiCoder: Intent Clarification Through Tests](#ticoder-intent-clarification-through-tests)
10. [AI-Ergonomic Code Design Best Practices](#ai-ergonomic-code-design-best-practices)
11. [Concrete Examples](#concrete-examples)

---

## Test-Driven Development with LLM Code Generation

### Core Principle

Write tests BEFORE asking an LLM to generate implementation code. Tests serve as executable specifications that constrain and validate LLM outputs.

### The TDD-LLM Workflow

```
1. Define the interface/contract
2. Write comprehensive tests covering:
   - Happy path scenarios
   - Edge cases
   - Error conditions
   - Boundary conditions
3. Provide tests to LLM as context
4. Request implementation that passes all tests
5. Run tests to validate
6. Iterate if needed
```

### Benefits

- **Constrained Generation**: Tests limit the solution space, reducing hallucination
- **Objective Validation**: Pass/fail provides clear success criteria
- **Intent Communication**: Tests express what you want better than prose descriptions
- **Regression Safety**: Future LLM modifications must still pass existing tests

### Example Workflow

```typescript
// STEP 1: Define the contract
interface PriceCalculator {
  calculateTotal(items: CartItem[]): Money;
}

// STEP 2: Write tests FIRST
describe('PriceCalculator', () => {
  it('should sum item prices correctly', () => {
    const calculator = new StandardPriceCalculator();
    const items = [
      { productId: '1', price: money(10.00), quantity: 2 },
      { productId: '2', price: money(5.50), quantity: 1 }
    ];
    expect(calculator.calculateTotal(items)).toEqual(money(25.50));
  });

  it('should apply quantity discounts for bulk orders', () => {
    const calculator = new StandardPriceCalculator();
    const items = [
      { productId: '1', price: money(10.00), quantity: 10 } // 10% discount at 10+
    ];
    expect(calculator.calculateTotal(items)).toEqual(money(90.00));
  });

  it('should handle empty cart', () => {
    const calculator = new StandardPriceCalculator();
    expect(calculator.calculateTotal([])).toEqual(money(0));
  });

  it('should throw for negative quantities', () => {
    const calculator = new StandardPriceCalculator();
    const items = [{ productId: '1', price: money(10.00), quantity: -1 }];
    expect(() => calculator.calculateTotal(items)).toThrow(InvalidQuantityError);
  });
});

// STEP 3: Provide tests to LLM and request implementation
// STEP 4: Validate generated code passes all tests
```

---

## LLM-Friendly Documentation Patterns

### llms.txt Files

Create `llms.txt` files at project and directory levels to provide LLMs with immediate context.

#### Project Root llms.txt

```markdown
# Project: E-Commerce Platform

## Architecture Overview
- Hexagonal architecture with ports and adapters
- Domain-driven design in /src/domain
- CQRS pattern for read/write separation

## Key Directories
- /src/domain - Pure business logic, no dependencies
- /src/application - Use cases and orchestration
- /src/infrastructure - External integrations
- /src/api - HTTP handlers and DTOs

## Conventions
- All domain objects are immutable
- Use Result<T, E> for error handling (no throwing in domain)
- Repository interfaces in domain, implementations in infrastructure
- All public methods must have JSDoc comments

## Testing Strategy
- Unit tests for domain logic
- Integration tests for repositories
- E2E tests for critical user journeys

## Common Patterns
See /docs/patterns/ for:
- aggregate-design.md
- event-sourcing.md
- saga-pattern.md
```

#### Directory-Level llms.txt

```markdown
# /src/domain/orders

## Purpose
Order aggregate and related domain logic.

## Key Files
- Order.ts - Order aggregate root
- OrderItem.ts - Line item value object
- OrderStatus.ts - Status state machine
- OrderRepository.ts - Repository port (interface only)

## Invariants
- Order total must equal sum of line items
- Cannot modify order after shipping
- Maximum 100 items per order

## Events Emitted
- OrderCreated
- OrderItemAdded
- OrderShipped
- OrderCancelled
```

### Structured Comments for LLM Context

```typescript
/**
 * @llm-context This service orchestrates the order placement flow.
 * @llm-dependencies PaymentGateway, InventoryService, NotificationService
 * @llm-invariants Payment must succeed before inventory is reserved
 * @llm-error-handling Uses saga pattern for rollback on failure
 */
export class OrderPlacementService {
  // ...
}
```

### API Documentation Pattern

```typescript
/**
 * Creates a new order for the authenticated user.
 *
 * @endpoint POST /api/orders
 * @auth Required - Bearer token
 * @rate-limit 10 requests per minute
 *
 * @param {CreateOrderRequest} request - Order details
 * @returns {Order} Created order with generated ID
 *
 * @throws {ValidationError} 400 - Invalid request body
 * @throws {InsufficientInventoryError} 409 - Item out of stock
 * @throws {PaymentDeclinedError} 402 - Payment failed
 *
 * @example
 * // Request
 * POST /api/orders
 * {
 *   "items": [{ "productId": "abc123", "quantity": 2 }],
 *   "shippingAddress": { "street": "123 Main St", ... }
 * }
 *
 * // Response 201
 * {
 *   "id": "order-456",
 *   "status": "PENDING",
 *   "items": [...],
 *   "total": { "amount": 99.99, "currency": "USD" }
 * }
 */
```

---

## Design Patterns for AI-Assisted Systems

### 1. Explicit Contract Pattern

Define clear interfaces that fully specify behavior:

```typescript
// BAD: Implicit behavior
class UserService {
  getUser(id: string) { /* what happens if not found? */ }
}

// GOOD: Explicit contract
interface UserService {
  /**
   * Retrieves a user by ID.
   * @returns Result.Ok with user if found
   * @returns Result.Err with NotFoundError if user doesn't exist
   * @returns Result.Err with ValidationError if ID format is invalid
   */
  getUser(id: UserId): Promise<Result<User, NotFoundError | ValidationError>>;
}
```

### 2. State Machine Pattern

Make state transitions explicit and validatable:

```typescript
// Define valid states
type OrderState = 'draft' | 'submitted' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

// Define valid transitions
const ORDER_TRANSITIONS: Record<OrderState, OrderState[]> = {
  draft: ['submitted', 'cancelled'],
  submitted: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: []
};

// Enforce in code
class Order {
  transition(to: OrderState): Result<Order, InvalidTransitionError> {
    const validTransitions = ORDER_TRANSITIONS[this.state];
    if (!validTransitions.includes(to)) {
      return Result.err(new InvalidTransitionError(this.state, to));
    }
    return Result.ok(this.withState(to));
  }
}
```

### 3. Command/Query Separation

Separate read and write operations explicitly:

```typescript
// Commands - change state, return void or Result
interface OrderCommands {
  createOrder(command: CreateOrderCommand): Promise<Result<OrderId, OrderError>>;
  cancelOrder(command: CancelOrderCommand): Promise<Result<void, OrderError>>;
  shipOrder(command: ShipOrderCommand): Promise<Result<void, OrderError>>;
}

// Queries - read state, never modify
interface OrderQueries {
  getOrderById(id: OrderId): Promise<Order | null>;
  getOrdersByCustomer(customerId: CustomerId): Promise<Order[]>;
  getOrderSummary(id: OrderId): Promise<OrderSummaryDTO>;
}
```

### 4. Pipeline Pattern

Structure processing as explicit, composable steps:

```typescript
// Each step is pure and testable
type PipelineStep<TIn, TOut> = (input: TIn) => Result<TOut, PipelineError>;

// Compose pipeline explicitly
const orderProcessingPipeline = pipe(
  validateOrderRequest,      // RequestDTO -> ValidatedOrder
  checkInventoryAvailability, // ValidatedOrder -> OrderWithInventory
  calculatePricing,          // OrderWithInventory -> PricedOrder
  reserveInventory,          // PricedOrder -> ReservedOrder
  processPayment,            // ReservedOrder -> PaidOrder
  createOrderRecord          // PaidOrder -> Order
);

// Each step can be tested in isolation
describe('calculatePricing', () => {
  it('applies volume discounts', () => { /* ... */ });
  it('applies promotional codes', () => { /* ... */ });
  it('handles tax calculation', () => { /* ... */ });
});
```

---

## Explicit, Observable, and Testable Orchestration

### Make Orchestration Visible

```typescript
// BAD: Hidden orchestration
class OrderService {
  async createOrder(request: OrderRequest): Promise<Order> {
    // 200 lines of interleaved logic
  }
}

// GOOD: Explicit orchestration with observable steps
class OrderOrchestrator {
  private readonly steps: OrderCreationStep[] = [
    this.validateRequest,
    this.checkInventory,
    this.processPayment,
    this.reserveInventory,
    this.createOrder,
    this.sendConfirmation
  ];

  async execute(request: OrderRequest): Promise<Result<Order, OrderError>> {
    const context = new OrderCreationContext(request);

    for (const step of this.steps) {
      const result = await step.execute(context);

      this.logger.info('Step completed', {
        step: step.name,
        status: result.isOk() ? 'success' : 'failure',
        duration: result.duration,
        context: context.toLoggable()
      });

      if (result.isErr()) {
        await this.rollback(context);
        return result;
      }
    }

    return Result.ok(context.order);
  }
}
```

### Observable Metrics

```typescript
interface OrchestrationMetrics {
  // Track each step
  stepStarted(step: string, context: Record<string, unknown>): void;
  stepCompleted(step: string, duration: number): void;
  stepFailed(step: string, error: Error): void;

  // Track overall flow
  orchestrationStarted(flowId: string, type: string): void;
  orchestrationCompleted(flowId: string, duration: number): void;
  orchestrationFailed(flowId: string, failedStep: string, error: Error): void;
}

// Usage
class InstrumentedOrchestrator {
  async execute(request: Request): Promise<Result<Response, Error>> {
    const flowId = generateFlowId();
    this.metrics.orchestrationStarted(flowId, 'order-creation');

    for (const step of this.steps) {
      this.metrics.stepStarted(step.name, { flowId });
      const start = performance.now();

      try {
        const result = await step.execute(context);
        this.metrics.stepCompleted(step.name, performance.now() - start);

        if (result.isErr()) {
          this.metrics.orchestrationFailed(flowId, step.name, result.error);
          return result;
        }
      } catch (error) {
        this.metrics.stepFailed(step.name, error);
        throw error;
      }
    }

    this.metrics.orchestrationCompleted(flowId, totalDuration);
    return Result.ok(response);
  }
}
```

### Testable Orchestration

```typescript
describe('OrderOrchestrator', () => {
  it('executes steps in order', async () => {
    const executionOrder: string[] = [];

    const mockStep = (name: string) => ({
      name,
      execute: async () => {
        executionOrder.push(name);
        return Result.ok(undefined);
      }
    });

    const orchestrator = new OrderOrchestrator([
      mockStep('validate'),
      mockStep('payment'),
      mockStep('fulfill')
    ]);

    await orchestrator.execute(validRequest);

    expect(executionOrder).toEqual(['validate', 'payment', 'fulfill']);
  });

  it('stops and rolls back on failure', async () => {
    const rollbackCalled: string[] = [];

    const orchestrator = new OrderOrchestrator([
      successStep('validate'),
      failingStep('payment', new PaymentError()),
      successStep('fulfill') // Should not execute
    ]);

    orchestrator.onRollback((step) => rollbackCalled.push(step));

    const result = await orchestrator.execute(validRequest);

    expect(result.isErr()).toBe(true);
    expect(rollbackCalled).toEqual(['validate']); // Only completed steps rolled back
  });
});
```

---

## Avoiding Implicit State and Memory Reliance

### Problem: Implicit State

```typescript
// BAD: Relies on implicit state
class ConversationHandler {
  private context: any; // Accumulated across calls

  async handleMessage(message: string): Promise<string> {
    // Uses this.context implicitly
    // State accumulated over time
    // Hard to test, hard for LLM to reason about
  }
}
```

### Solution: Explicit State Passing

```typescript
// GOOD: Explicit state
interface ConversationState {
  messages: Message[];
  currentIntent: Intent | null;
  collectedSlots: Record<string, SlotValue>;
  turnCount: number;
}

class ConversationHandler {
  // Pure function - same input always produces same output
  handleMessage(
    state: ConversationState,
    message: string
  ): { newState: ConversationState; response: string } {
    // All state is explicit
    // Easy to test with specific states
    // Easy for LLM to understand
  }
}

// Test any state scenario directly
describe('ConversationHandler', () => {
  it('handles slot filling after intent detected', () => {
    const state: ConversationState = {
      messages: [],
      currentIntent: { name: 'book_flight', confidence: 0.95 },
      collectedSlots: { destination: 'NYC' },
      turnCount: 2
    };

    const { newState, response } = handler.handleMessage(state, 'tomorrow');

    expect(newState.collectedSlots.date).toBeDefined();
    expect(response).toContain('departure time');
  });
});
```

### Stateless Service Pattern

```typescript
// All dependencies and state passed explicitly
interface OrderService {
  createOrder(
    // Dependencies
    deps: {
      paymentGateway: PaymentGateway;
      inventoryService: InventoryService;
      orderRepository: OrderRepository;
    },
    // Input
    request: CreateOrderRequest,
    // Context
    context: {
      userId: UserId;
      correlationId: string;
      timestamp: Date;
    }
  ): Promise<Result<Order, OrderError>>;
}
```

### Event-Sourced State

```typescript
// State derived from events - fully reproducible
interface OrderAggregate {
  // Current state derived from events
  readonly state: OrderState;

  // Apply event to produce new state (pure function)
  apply(event: OrderEvent): OrderAggregate;

  // Rebuild state from event history
  static fromEvents(events: OrderEvent[]): OrderAggregate;
}

// Test state at any point in history
describe('OrderAggregate', () => {
  it('rebuilds state from events', () => {
    const events: OrderEvent[] = [
      { type: 'OrderCreated', orderId: '123', items: [...] },
      { type: 'ItemAdded', orderId: '123', item: {...} },
      { type: 'OrderSubmitted', orderId: '123', timestamp: new Date() }
    ];

    const order = OrderAggregate.fromEvents(events);

    expect(order.state.status).toBe('submitted');
    expect(order.state.items).toHaveLength(2);
  });
});
```

---

## Self-Documenting Code and Naming Conventions

### Intention-Revealing Names

```typescript
// BAD: Cryptic names
function proc(d: any[], f: number): number {
  return d.reduce((a, i) => a + i.p * i.q, 0) * (1 - f);
}

// GOOD: Self-documenting
function calculateDiscountedOrderTotal(
  lineItems: OrderLineItem[],
  discountPercentage: number
): Money {
  const subtotal = lineItems.reduce(
    (total, item) => total.add(item.price.multiply(item.quantity)),
    Money.zero()
  );
  return subtotal.applyDiscount(discountPercentage);
}
```

### Consistent Naming Patterns

```typescript
// Commands: verb + noun
createOrder()
cancelSubscription()
updateUserProfile()
sendNotification()

// Queries: get/find/list + noun
getOrderById()
findUsersByEmail()
listActiveSubscriptions()

// Predicates: is/has/can/should
isOrderComplete()
hasValidPayment()
canBeCancelled()
shouldApplyDiscount()

// Factories: create/make/build
createOrderFromCart()
makePaymentRequest()
buildNotificationPayload()

// Event handlers: on/handle + event
onOrderCreated()
handlePaymentReceived()
```

### Type Names That Communicate

```typescript
// Value objects with semantic meaning
type EmailAddress = string & { readonly brand: unique symbol };
type OrderId = string & { readonly brand: unique symbol };
type Money = { amount: number; currency: Currency };

// DTOs clearly labeled
interface CreateOrderRequestDTO { /* ... */ }
interface OrderResponseDTO { /* ... */ }

// Domain objects
interface Order { /* ... */ }      // Aggregate root
interface OrderItem { /* ... */ }  // Entity
interface Address { /* ... */ }    // Value object

// Errors with clear context
class OrderNotFoundError extends Error { orderId: OrderId; }
class InsufficientInventoryError extends Error { productId: ProductId; requested: number; available: number; }
class PaymentDeclinedError extends Error { reason: PaymentDeclineReason; }
```

### Module Structure That Tells a Story

```
/src/orders/
  index.ts              # Public API - what's exported
  Order.ts              # The aggregate root
  OrderItem.ts          # Line item entity
  OrderStatus.ts        # Status value object/enum
  OrderRepository.ts    # Repository port
  OrderService.ts       # Application service
  OrderErrors.ts        # Domain errors
  OrderEvents.ts        # Domain events
  /commands/
    CreateOrder.ts
    CancelOrder.ts
  /queries/
    GetOrderById.ts
    ListOrdersByCustomer.ts
  /tests/
    Order.test.ts
    OrderService.test.ts
```

---

## Second LLM as Judge Pattern

### Purpose

Use a second LLM (or the same LLM with a different prompt) to validate, critique, or improve outputs from the first LLM.

### Implementation Pattern

```typescript
interface LLMJudge {
  evaluate(
    original: GeneratedCode,
    criteria: EvaluationCriteria
  ): Promise<JudgementResult>;
}

interface EvaluationCriteria {
  correctness: boolean;      // Does it solve the stated problem?
  testCoverage: boolean;     // Are edge cases handled?
  codeQuality: boolean;      // Is it maintainable?
  securityReview: boolean;   // Are there vulnerabilities?
  performanceReview: boolean; // Are there efficiency issues?
}

interface JudgementResult {
  passed: boolean;
  score: number;              // 0-100
  issues: Issue[];
  suggestions: Suggestion[];
  revisedCode?: string;       // Optional improvement
}
```

### Workflow Implementation

```typescript
class LLMCodeGenerationPipeline {
  async generateWithValidation(
    specification: CodeSpecification
  ): Promise<ValidatedCode> {
    // Step 1: Generate initial code
    const generatedCode = await this.generator.generate(specification);

    // Step 2: Judge evaluates the code
    const judgement = await this.judge.evaluate(generatedCode, {
      correctness: true,
      testCoverage: true,
      codeQuality: true,
      securityReview: specification.securityCritical
    });

    // Step 3: Handle judgement
    if (judgement.passed && judgement.score >= 80) {
      return { code: generatedCode, validation: judgement };
    }

    // Step 4: Iterate if needed
    if (this.iterationCount < this.maxIterations) {
      const improvedSpec = this.incorporateFeedback(
        specification,
        judgement.issues,
        judgement.suggestions
      );
      return this.generateWithValidation(improvedSpec);
    }

    throw new GenerationFailedError(judgement);
  }
}
```

### Judge Prompt Engineering

```typescript
const JUDGE_SYSTEM_PROMPT = `
You are a code review expert. Evaluate the provided code against these criteria:

## Correctness
- Does the code correctly implement the specification?
- Are all requirements met?
- Are edge cases handled?

## Test Coverage
- Are there tests for happy path?
- Are there tests for error cases?
- Are boundary conditions tested?

## Code Quality
- Is the code readable and maintainable?
- Does it follow SOLID principles?
- Is it properly typed?

## Security (if applicable)
- Input validation
- SQL injection prevention
- XSS prevention
- Authentication/authorization checks

Provide your evaluation as JSON:
{
  "passed": boolean,
  "score": number (0-100),
  "issues": [{ "severity": "critical|major|minor", "description": string, "location": string }],
  "suggestions": [{ "type": "improvement|alternative", "description": string }]
}
`;
```

### Multi-Judge Consensus

```typescript
class ConsensusJudge implements LLMJudge {
  private judges: LLMJudge[];

  async evaluate(code: GeneratedCode, criteria: EvaluationCriteria): Promise<JudgementResult> {
    // Run multiple judges in parallel
    const judgements = await Promise.all(
      this.judges.map(judge => judge.evaluate(code, criteria))
    );

    // Require consensus
    const allPassed = judgements.every(j => j.passed);
    const averageScore = judgements.reduce((sum, j) => sum + j.score, 0) / judgements.length;
    const allIssues = judgements.flatMap(j => j.issues);
    const uniqueIssues = this.deduplicateIssues(allIssues);

    return {
      passed: allPassed && averageScore >= this.threshold,
      score: averageScore,
      issues: uniqueIssues,
      suggestions: this.mergeSuggestions(judgements)
    };
  }
}
```

---

## Building Robust Systems Over Demo-ware

### Demo-ware vs. Production Code

| Demo-ware | Production Code |
|-----------|-----------------|
| Happy path only | All paths covered |
| Hardcoded values | Configurable |
| No error handling | Comprehensive errors |
| No logging | Observable |
| No tests | Thoroughly tested |
| Monolithic | Modular |
| Implicit assumptions | Explicit contracts |

### Production-Ready Checklist

```typescript
// Every service should address these concerns:

interface ProductionReadyService {
  // 1. Input Validation
  validateInput(input: unknown): Result<ValidInput, ValidationError>;

  // 2. Error Handling
  handleError(error: Error): ErrorResponse;

  // 3. Logging
  logger: Logger;

  // 4. Metrics
  metrics: MetricsCollector;

  // 5. Health Check
  healthCheck(): Promise<HealthStatus>;

  // 6. Configuration
  config: ServiceConfig;

  // 7. Graceful Shutdown
  shutdown(): Promise<void>;

  // 8. Retry Logic
  retryPolicy: RetryPolicy;

  // 9. Circuit Breaker
  circuitBreaker: CircuitBreaker;

  // 10. Rate Limiting
  rateLimiter: RateLimiter;
}
```

### Error Handling Spectrum

```typescript
// Level 1: Basic (Demo-ware)
async function getUser(id: string) {
  const user = await db.findUser(id);
  return user; // What if null? What if db fails?
}

// Level 2: Null Handling
async function getUser(id: string): Promise<User | null> {
  const user = await db.findUser(id);
  return user;
}

// Level 3: Result Type
async function getUser(id: string): Promise<Result<User, NotFoundError>> {
  const user = await db.findUser(id);
  if (!user) {
    return Result.err(new NotFoundError('User', id));
  }
  return Result.ok(user);
}

// Level 4: Comprehensive (Production)
async function getUser(
  id: string,
  options: GetUserOptions = {}
): Promise<Result<User, GetUserError>> {
  // Validate input
  const validatedId = UserId.parse(id);
  if (validatedId.isErr()) {
    return Result.err(new InvalidUserIdError(id, validatedId.error));
  }

  // Check cache first
  if (options.useCache !== false) {
    const cached = await this.cache.get(`user:${id}`);
    if (cached) {
      this.metrics.increment('user.cache.hit');
      return Result.ok(cached);
    }
    this.metrics.increment('user.cache.miss');
  }

  // Query database with timeout
  try {
    const user = await this.withTimeout(
      this.db.findUser(validatedId.value),
      options.timeout ?? this.config.defaultTimeout
    );

    if (!user) {
      this.logger.debug('User not found', { userId: id });
      return Result.err(new UserNotFoundError(id));
    }

    // Update cache
    await this.cache.set(`user:${id}`, user, this.config.cacheTTL);

    this.metrics.increment('user.fetch.success');
    return Result.ok(user);

  } catch (error) {
    this.logger.error('Failed to fetch user', { userId: id, error });
    this.metrics.increment('user.fetch.error');

    if (error instanceof TimeoutError) {
      return Result.err(new UserFetchTimeoutError(id));
    }
    if (error instanceof DatabaseError) {
      return Result.err(new UserFetchDatabaseError(id, error));
    }

    return Result.err(new UnexpectedUserFetchError(id, error));
  }
}
```

### Testing for Production

```typescript
describe('UserService.getUser', () => {
  // Happy path
  it('returns user when found', async () => { /* ... */ });

  // Cache behavior
  it('returns cached user without database hit', async () => { /* ... */ });
  it('populates cache on database fetch', async () => { /* ... */ });

  // Error cases
  it('returns NotFoundError when user does not exist', async () => { /* ... */ });
  it('returns InvalidIdError for malformed IDs', async () => { /* ... */ });
  it('returns TimeoutError when database is slow', async () => { /* ... */ });
  it('returns DatabaseError when connection fails', async () => { /* ... */ });

  // Boundary conditions
  it('handles concurrent requests for same user', async () => { /* ... */ });
  it('handles cache invalidation during fetch', async () => { /* ... */ });

  // Observability
  it('logs appropriate messages for each scenario', async () => { /* ... */ });
  it('records correct metrics', async () => { /* ... */ });
});
```

---

## TiCoder: Intent Clarification Through Tests

### The TiCoder Approach

TiCoder (Test-driven Intent Clarification) uses tests as a medium for clarifying ambiguous specifications with LLMs.

### Workflow

```
1. User provides natural language specification
2. LLM generates clarifying test cases
3. User validates/corrects test expectations
4. LLM implements code that passes validated tests
5. Iterate until specification is fully clarified
```

### Implementation Example

```typescript
// Step 1: User specification
const spec = "Create a function that calculates shipping cost based on weight and distance";

// Step 2: LLM generates clarifying tests
const clarifyingTests = `
// Clarification Question 1: What are the weight breakpoints?
describe('weight-based pricing', () => {
  it('charges $5 for items under 1 pound', () => {
    expect(calculateShipping({ weight: 0.5, distance: 10 })).toBe(5);
  });
  it('charges $10 for items 1-5 pounds', () => {
    expect(calculateShipping({ weight: 3, distance: 10 })).toBe(10);
  });
  it('charges $20 for items over 5 pounds', () => {
    expect(calculateShipping({ weight: 10, distance: 10 })).toBe(20);
  });
});

// Clarification Question 2: How does distance factor in?
describe('distance-based pricing', () => {
  it('adds $1 per 100 miles for standard items', () => {
    expect(calculateShipping({ weight: 1, distance: 500 })).toBe(15); // $10 base + $5 distance
  });
});

// Clarification Question 3: What about edge cases?
describe('edge cases', () => {
  it('throws for negative weight', () => {
    expect(() => calculateShipping({ weight: -1, distance: 10 })).toThrow();
  });
  it('returns 0 for zero weight (free shipping for digital?)', () => {
    expect(calculateShipping({ weight: 0, distance: 10 })).toBe(0);
  });
});
`;

// Step 3: User corrects expectations
const correctedTests = `
// User feedback: Distance pricing is different
describe('distance-based pricing', () => {
  it('adds $2 per 100 miles for all items', () => {
    expect(calculateShipping({ weight: 1, distance: 500 })).toBe(20); // $10 base + $10 distance
  });
});

// User feedback: Zero weight should error, not free shipping
describe('edge cases', () => {
  it('throws for zero weight', () => {
    expect(() => calculateShipping({ weight: 0, distance: 10 })).toThrow();
  });
});
`;

// Step 4: LLM implements based on validated tests
```

### Test-as-Specification Pattern

```typescript
// Tests serve as executable specification
describe('PaymentProcessor - Specification', () => {
  describe('Authorization', () => {
    it('MUST verify card is not expired', () => { /* ... */ });
    it('MUST check CVV matches', () => { /* ... */ });
    it('MUST verify billing address for amounts over $100', () => { /* ... */ });
  });

  describe('Fraud Prevention', () => {
    it('MUST flag transactions over $10,000 for review', () => { /* ... */ });
    it('MUST reject more than 3 failed attempts per hour', () => { /* ... */ });
    it('SHOULD warn on first international transaction', () => { /* ... */ });
  });

  describe('Processing', () => {
    it('MUST complete within 30 seconds', () => { /* ... */ });
    it('MUST be idempotent for same transaction ID', () => { /* ... */ });
    it('MUST log all attempts for audit', () => { /* ... */ });
  });
});
```

---

## AI-Ergonomic Code Design Best Practices

### 1. Chunking for Context Windows

```typescript
// BAD: Monolithic file (5000+ lines)
// LLM cannot hold entire context

// GOOD: Logical chunks (~200-500 lines each)
// order/
//   Order.ts (aggregate)
//   OrderItem.ts (entity)
//   OrderService.ts (application service)
//   OrderRepository.ts (port)
//   OrderErrors.ts (errors)
```

### 2. Explicit Dependencies

```typescript
// BAD: Hidden dependencies
class OrderService {
  process() {
    const config = globalConfig; // Where did this come from?
    const db = Database.getInstance(); // Singleton hiding
  }
}

// GOOD: Constructor injection
class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly paymentGateway: PaymentGateway,
    private readonly config: OrderServiceConfig
  ) {}
}
```

### 3. Predictable Patterns

```typescript
// Use consistent patterns across codebase
// LLMs learn patterns and apply them

// Repository pattern - always the same shape
interface Repository<T, ID> {
  findById(id: ID): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<T>;
  delete(id: ID): Promise<void>;
}

// Service pattern - always the same shape
interface Service<TCommand, TResult, TError> {
  execute(command: TCommand): Promise<Result<TResult, TError>>;
}
```

### 4. Comprehensive Types

```typescript
// BAD: Weak types
function processOrder(order: any, options?: any): any

// GOOD: Strong types that document themselves
function processOrder(
  order: ValidatedOrder,
  options: ProcessingOptions
): Promise<Result<ProcessedOrder, ProcessingError>>

// Types tell the LLM exactly what's expected
interface ValidatedOrder {
  readonly id: OrderId;
  readonly items: NonEmptyArray<OrderItem>;
  readonly customer: ValidatedCustomer;
  readonly shippingAddress: ValidatedAddress;
  readonly validatedAt: Date;
}
```

### 5. Error Hierarchies

```typescript
// Well-structured error hierarchy helps LLM understand failure modes
abstract class OrderError extends Error {
  abstract readonly code: string;
  abstract readonly recoverable: boolean;
}

class OrderValidationError extends OrderError {
  readonly code = 'ORDER_VALIDATION';
  readonly recoverable = true;
  constructor(readonly violations: ValidationViolation[]) {
    super(`Order validation failed: ${violations.length} violations`);
  }
}

class OrderNotFoundError extends OrderError {
  readonly code = 'ORDER_NOT_FOUND';
  readonly recoverable = false;
  constructor(readonly orderId: OrderId) {
    super(`Order not found: ${orderId}`);
  }
}
```

### 6. Examples in Code

```typescript
/**
 * Calculates discount based on customer tier and order total.
 *
 * @example
 * // Bronze customer, small order - no discount
 * calculateDiscount({ tier: 'bronze', orderTotal: 50 }) // returns 0
 *
 * @example
 * // Gold customer, large order - 15% discount
 * calculateDiscount({ tier: 'gold', orderTotal: 500 }) // returns 75
 *
 * @example
 * // Platinum customer with promo code
 * calculateDiscount({
 *   tier: 'platinum',
 *   orderTotal: 1000,
 *   promoCode: 'SAVE20'
 * }) // returns 350 (20% tier + 15% promo)
 */
function calculateDiscount(params: DiscountParams): Money { /* ... */ }
```

---

## Concrete Examples

### Example 1: LLM-Friendly API Handler

```typescript
/**
 * @file CreateOrderHandler.ts
 * @description HTTP handler for order creation endpoint
 *
 * @llm-context POST /api/orders - Creates a new order
 * @llm-dependencies OrderService, OrderValidator, AuthMiddleware
 * @llm-errors See OrderErrors.ts for all possible errors
 */

import { Request, Response } from 'express';
import { CreateOrderCommand, OrderService, OrderError } from '../application';
import { CreateOrderRequestDTO, OrderResponseDTO } from './dto';

/**
 * Creates a new order from the provided cart items.
 *
 * @route POST /api/orders
 * @auth Required - Bearer token with 'orders:write' scope
 * @rate-limit 10 requests/minute per user
 *
 * @param req.body {CreateOrderRequestDTO} Order details
 * @returns 201 {OrderResponseDTO} Created order
 * @returns 400 {ValidationErrorDTO} Invalid request
 * @returns 402 {PaymentErrorDTO} Payment declined
 * @returns 409 {ConflictErrorDTO} Item out of stock
 *
 * @example
 * // Request
 * POST /api/orders
 * Authorization: Bearer <token>
 * Content-Type: application/json
 * {
 *   "items": [
 *     { "productId": "prod-123", "quantity": 2 }
 *   ],
 *   "shippingAddressId": "addr-456"
 * }
 *
 * // Success Response (201)
 * {
 *   "id": "order-789",
 *   "status": "PENDING_PAYMENT",
 *   "items": [...],
 *   "total": { "amount": 99.99, "currency": "USD" },
 *   "createdAt": "2024-01-15T10:30:00Z"
 * }
 */
export class CreateOrderHandler {
  constructor(
    private readonly orderService: OrderService,
    private readonly validator: OrderValidator,
    private readonly mapper: OrderMapper
  ) {}

  async handle(req: Request, res: Response): Promise<void> {
    // Step 1: Validate request body
    const validationResult = this.validator.validate(req.body);
    if (validationResult.isErr()) {
      res.status(400).json(this.mapper.toValidationErrorDTO(validationResult.error));
      return;
    }

    // Step 2: Build command
    const command: CreateOrderCommand = {
      userId: req.user.id,
      items: validationResult.value.items,
      shippingAddressId: validationResult.value.shippingAddressId,
      correlationId: req.headers['x-correlation-id'] as string
    };

    // Step 3: Execute command
    const result = await this.orderService.createOrder(command);

    // Step 4: Map result to response
    if (result.isOk()) {
      res.status(201).json(this.mapper.toOrderResponseDTO(result.value));
      return;
    }

    // Step 5: Handle specific errors
    const error = result.error;
    switch (error.code) {
      case 'VALIDATION_ERROR':
        res.status(400).json(this.mapper.toValidationErrorDTO(error));
        break;
      case 'PAYMENT_DECLINED':
        res.status(402).json(this.mapper.toPaymentErrorDTO(error));
        break;
      case 'INSUFFICIENT_INVENTORY':
        res.status(409).json(this.mapper.toConflictErrorDTO(error));
        break;
      default:
        res.status(500).json({ message: 'Internal server error' });
    }
  }
}
```

### Example 2: Testable Domain Logic

```typescript
/**
 * @file PricingCalculator.ts
 * @description Pure domain logic for order pricing calculations
 *
 * @llm-context This is pure domain logic with no side effects.
 * All inputs explicit, all outputs deterministic.
 * Perfect for unit testing and LLM generation.
 */

import { Money } from '../value-objects/Money';
import { OrderItem } from '../entities/OrderItem';
import { DiscountPolicy } from '../policies/DiscountPolicy';

/**
 * Input for pricing calculation - all required context explicit
 */
interface PricingInput {
  items: OrderItem[];
  discountPolicy: DiscountPolicy;
  taxRate: number;
  shippingMethod: ShippingMethod;
}

/**
 * Output with full breakdown - transparent calculation
 */
interface PricingResult {
  subtotal: Money;
  discount: Money;
  tax: Money;
  shipping: Money;
  total: Money;
  breakdown: PricingBreakdown;
}

/**
 * Calculates complete order pricing.
 *
 * Pure function: same inputs always produce same outputs.
 * No side effects, no external dependencies.
 *
 * @param input All required pricing context
 * @returns Complete pricing breakdown
 *
 * @example
 * const result = calculatePricing({
 *   items: [
 *     { productId: 'A', unitPrice: money(10), quantity: 2 },
 *     { productId: 'B', unitPrice: money(25), quantity: 1 }
 *   ],
 *   discountPolicy: percentageDiscount(10),
 *   taxRate: 0.08,
 *   shippingMethod: 'standard'
 * });
 *
 * // Result:
 * // subtotal: $45.00
 * // discount: $4.50 (10%)
 * // tax: $3.24 (8% of $40.50)
 * // shipping: $5.00
 * // total: $48.74
 */
export function calculatePricing(input: PricingInput): PricingResult {
  const { items, discountPolicy, taxRate, shippingMethod } = input;

  // Calculate subtotal
  const subtotal = items.reduce(
    (sum, item) => sum.add(item.unitPrice.multiply(item.quantity)),
    Money.zero()
  );

  // Apply discount
  const discount = discountPolicy.calculate(subtotal, items);
  const afterDiscount = subtotal.subtract(discount);

  // Calculate tax
  const tax = afterDiscount.multiply(taxRate);

  // Calculate shipping
  const shipping = calculateShipping(items, shippingMethod);

  // Final total
  const total = afterDiscount.add(tax).add(shipping);

  return {
    subtotal,
    discount,
    tax,
    shipping,
    total,
    breakdown: {
      itemCount: items.length,
      totalQuantity: items.reduce((sum, i) => sum + i.quantity, 0),
      discountPercentage: discountPolicy.percentage,
      taxRate,
      shippingMethod
    }
  };
}
```

### Example 3: Test Suite for TDD with LLM

```typescript
/**
 * @file PricingCalculator.test.ts
 * @description Comprehensive tests that serve as specification
 *
 * @llm-context Use these tests to understand expected behavior.
 * Each test documents a specific requirement.
 */

import { calculatePricing } from './PricingCalculator';
import { money, percentageDiscount, flatDiscount, noDiscount } from '../test-helpers';

describe('PricingCalculator', () => {
  describe('Subtotal Calculation', () => {
    it('sums item prices correctly', () => {
      const result = calculatePricing({
        items: [
          { productId: 'A', unitPrice: money(10), quantity: 2 },
          { productId: 'B', unitPrice: money(5.50), quantity: 3 }
        ],
        discountPolicy: noDiscount(),
        taxRate: 0,
        shippingMethod: 'standard'
      });

      expect(result.subtotal).toEqual(money(36.50));
    });

    it('returns zero for empty cart', () => {
      const result = calculatePricing({
        items: [],
        discountPolicy: noDiscount(),
        taxRate: 0,
        shippingMethod: 'standard'
      });

      expect(result.subtotal).toEqual(money(0));
      expect(result.total).toEqual(money(0));
    });
  });

  describe('Discount Application', () => {
    it('applies percentage discount to subtotal', () => {
      const result = calculatePricing({
        items: [{ productId: 'A', unitPrice: money(100), quantity: 1 }],
        discountPolicy: percentageDiscount(10),
        taxRate: 0,
        shippingMethod: 'pickup' // no shipping cost
      });

      expect(result.discount).toEqual(money(10));
      expect(result.total).toEqual(money(90));
    });

    it('applies flat discount without going negative', () => {
      const result = calculatePricing({
        items: [{ productId: 'A', unitPrice: money(20), quantity: 1 }],
        discountPolicy: flatDiscount(50), // More than subtotal
        taxRate: 0,
        shippingMethod: 'pickup'
      });

      expect(result.discount).toEqual(money(20)); // Capped at subtotal
      expect(result.total).toEqual(money(0));
    });
  });

  describe('Tax Calculation', () => {
    it('applies tax after discount', () => {
      const result = calculatePricing({
        items: [{ productId: 'A', unitPrice: money(100), quantity: 1 }],
        discountPolicy: percentageDiscount(10), // $90 after discount
        taxRate: 0.10, // 10% tax
        shippingMethod: 'pickup'
      });

      expect(result.tax).toEqual(money(9)); // 10% of $90
    });

    it('handles zero tax rate', () => {
      const result = calculatePricing({
        items: [{ productId: 'A', unitPrice: money(100), quantity: 1 }],
        discountPolicy: noDiscount(),
        taxRate: 0,
        shippingMethod: 'pickup'
      });

      expect(result.tax).toEqual(money(0));
    });
  });

  describe('Shipping Calculation', () => {
    it('charges $5 for standard shipping', () => {
      const result = calculatePricing({
        items: [{ productId: 'A', unitPrice: money(50), quantity: 1 }],
        discountPolicy: noDiscount(),
        taxRate: 0,
        shippingMethod: 'standard'
      });

      expect(result.shipping).toEqual(money(5));
    });

    it('charges $15 for express shipping', () => {
      const result = calculatePricing({
        items: [{ productId: 'A', unitPrice: money(50), quantity: 1 }],
        discountPolicy: noDiscount(),
        taxRate: 0,
        shippingMethod: 'express'
      });

      expect(result.shipping).toEqual(money(15));
    });

    it('provides free shipping for orders over $100', () => {
      const result = calculatePricing({
        items: [{ productId: 'A', unitPrice: money(150), quantity: 1 }],
        discountPolicy: noDiscount(),
        taxRate: 0,
        shippingMethod: 'standard'
      });

      expect(result.shipping).toEqual(money(0));
    });
  });

  describe('Complete Calculation', () => {
    it('calculates full order with all factors', () => {
      // Scenario: $100 order, 10% discount, 8% tax, standard shipping
      const result = calculatePricing({
        items: [
          { productId: 'A', unitPrice: money(50), quantity: 1 },
          { productId: 'B', unitPrice: money(25), quantity: 2 }
        ],
        discountPolicy: percentageDiscount(10),
        taxRate: 0.08,
        shippingMethod: 'standard'
      });

      // Subtotal: $100
      expect(result.subtotal).toEqual(money(100));
      // Discount: $10 (10% of $100)
      expect(result.discount).toEqual(money(10));
      // Tax: $7.20 (8% of $90)
      expect(result.tax).toEqual(money(7.20));
      // Shipping: $5 (under $100 after discount)
      expect(result.shipping).toEqual(money(5));
      // Total: $90 + $7.20 + $5 = $102.20
      expect(result.total).toEqual(money(102.20));
    });
  });
});
```

---

## Summary

Designing for testability and AI-ergonomics requires:

1. **Explicit over implicit**: All state, dependencies, and behavior should be visible
2. **Tests as specifications**: Write tests first to constrain LLM outputs
3. **Clear documentation**: Use llms.txt and structured comments
4. **Consistent patterns**: Predictable structures help LLMs generalize
5. **Strong typing**: Types document expectations
6. **Observable systems**: Make orchestration and state transitions visible
7. **Validation loops**: Use second LLM as judge for quality assurance
8. **Production mindset**: Build robust systems, not demo-ware

Following these standards ensures codebases that are:
- Easy for humans AND LLMs to understand
- Thoroughly testable at all levels
- Maintainable over time
- Safe to modify with AI assistance
