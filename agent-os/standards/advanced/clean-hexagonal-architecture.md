# Clean & Hexagonal Architecture Standards

This document provides comprehensive guidance on implementing Clean Architecture and Hexagonal Architecture (Ports & Adapters) patterns to achieve domain isolation, testability, and maintainability.

---

## Table of Contents

1. [Hexagonal Architecture Fundamentals](#hexagonal-architecture-fundamentals)
2. [Ports: Communication Contracts](#ports-communication-contracts)
3. [Adapters: Primary and Secondary](#adapters-primary-and-secondary)
4. [Clean Architecture Layers](#clean-architecture-layers)
5. [Domain Layer Isolation](#domain-layer-isolation)
6. [Dependency Inversion Principle](#dependency-inversion-principle)
7. [Best Practices](#best-practices)
8. [Testing Approach](#testing-approach)
9. [Code Examples](#code-examples)

---

## Hexagonal Architecture Fundamentals

Hexagonal Architecture, also known as Ports & Adapters, was introduced by Alistair Cockburn. The core principle is to isolate the application's business logic from external concerns such as databases, APIs, UI frameworks, and messaging systems.

### Core Concepts

```
                    +------------------+
                    |    Primary       |
                    |    Adapters      |
                    |  (Controllers,   |
                    |   CLI, Events)   |
                    +--------+---------+
                             |
                             v
                    +--------+---------+
                    |      PORTS       |
                    |   (Interfaces)   |
                    +--------+---------+
                             |
                             v
            +----------------+----------------+
            |                                 |
            |         APPLICATION CORE        |
            |                                 |
            |   +-------------------------+   |
            |   |      Domain Layer       |   |
            |   |   (Entities, Value      |   |
            |   |    Objects, Services)   |   |
            |   +-------------------------+   |
            |                                 |
            +----------------+----------------+
                             |
                             v
                    +--------+---------+
                    |      PORTS       |
                    |   (Interfaces)   |
                    +--------+---------+
                             |
                             v
                    +--------+---------+
                    |    Secondary     |
                    |    Adapters      |
                    | (Repositories,   |
                    |  External APIs)  |
                    +------------------+
```

### Key Principles

1. **The domain is at the center**: Business logic knows nothing about the outside world
2. **Dependencies point inward**: External layers depend on inner layers, never the reverse
3. **Ports define boundaries**: Abstract interfaces specify how the outside world interacts with the core
4. **Adapters translate**: They convert external formats to domain concepts and vice versa

---

## Ports: Communication Contracts

Ports are abstract interfaces that define the communication points between the application core and the outside world. They establish contracts without implementation details.

### Types of Ports

#### Driving Ports (Primary/Inbound)
- Define use cases the application exposes
- Called BY external actors (users, other systems)
- Represent the application's API

#### Driven Ports (Secondary/Outbound)
- Define dependencies the application needs
- Called BY the application core
- Represent required infrastructure capabilities

### Port Design Principles

```typescript
// Good: Clear, focused port contract
interface OrderRepository {
  save(order: Order): Promise<void>;
  findById(id: OrderId): Promise<Order | null>;
  findByCustomer(customerId: CustomerId): Promise<Order[]>;
}

// Bad: Port leaking infrastructure details
interface OrderRepository {
  save(order: Order, connectionString: string): Promise<void>;
  executeSql(query: string): Promise<any>;
}
```

### Port Naming Conventions

- Use domain language, not technical terms
- Name after the capability, not the implementation
- Examples: `PaymentGateway`, `NotificationSender`, `OrderRepository`

---

## Adapters: Primary and Secondary

Adapters are concrete implementations that connect the outside world to the application through ports.

### Primary Adapters (Inbound/Driving)

Primary adapters drive the application. They receive external input and translate it into calls to the application core.

**Examples:**
- REST Controllers
- GraphQL Resolvers
- CLI Commands
- Message Queue Consumers
- Event Handlers
- gRPC Services

### Secondary Adapters (Outbound/Driven)

Secondary adapters are driven by the application. They implement outbound ports to provide infrastructure capabilities.

**Examples:**
- Database Repositories
- External API Clients
- Message Publishers
- Email Senders
- File System Access
- Cache Implementations

### Adapter Responsibilities

```
Primary Adapter:
1. Receive external request
2. Validate input format (not business rules)
3. Transform to domain objects
4. Call use case (port)
5. Transform response
6. Return to caller

Secondary Adapter:
1. Receive domain call
2. Transform domain objects to infrastructure format
3. Execute infrastructure operation
4. Transform result back to domain objects
5. Return to caller
```

---

## Clean Architecture Layers

Clean Architecture organizes code into concentric layers with dependencies pointing inward.

### Layer Structure

```
+----------------------------------------------------------+
|                    Frameworks & Drivers                   |
|  (Web Framework, Database, External Services, UI)         |
+----------------------------------------------------------+
|                    Interface Adapters                     |
|  (Controllers, Presenters, Gateways, Repositories)        |
+----------------------------------------------------------+
|                    Application Business Rules             |
|  (Use Cases, Application Services)                        |
+----------------------------------------------------------+
|                    Enterprise Business Rules              |
|  (Entities, Value Objects, Domain Services)               |
+----------------------------------------------------------+
```

### Layer Responsibilities

#### 1. Domain Layer (Enterprise Business Rules)
- Entities with business logic
- Value Objects
- Domain Services
- Domain Events
- Business rules and invariants

#### 2. Application Layer (Application Business Rules)
- Use Cases / Application Services
- Input/Output DTOs
- Port definitions
- Application-specific business rules
- Orchestration of domain objects

#### 3. Interface Adapters Layer
- Controllers and Presenters
- Repository implementations
- External service clients
- Data mappers
- View models

#### 4. Frameworks & Drivers Layer
- Framework configurations
- Database connections
- Web server setup
- Third-party library integrations

### Dependency Rule

> Source code dependencies must point only inward, toward higher-level policies.

- Inner layers define interfaces
- Outer layers provide implementations
- No inner layer should know about outer layers

---

## Domain Layer Isolation

The domain layer must be completely isolated from infrastructure concerns. This ensures:

- Business logic is testable without infrastructure
- Domain can evolve independently
- Technology decisions can change without affecting business rules

### Isolation Strategies

#### 1. No Framework Dependencies
```typescript
// Bad: Domain entity with framework decorator
@Entity()
class Order {
  @Column()
  status: string;
}

// Good: Pure domain entity
class Order {
  private status: OrderStatus;

  complete(): void {
    if (!this.canBeCompleted()) {
      throw new OrderCannotBeCompletedException();
    }
    this.status = OrderStatus.Completed;
  }
}
```

#### 2. No Infrastructure Types
```typescript
// Bad: Domain using infrastructure types
class OrderService {
  async process(order: Order): Promise<SqlResult> { }
}

// Good: Domain using domain types
class OrderService {
  async process(order: Order): Promise<ProcessingResult> { }
}
```

#### 3. Domain Events over Direct Calls
```typescript
// Good: Domain raises event, infrastructure handles side effects
class Order {
  complete(): void {
    this.status = OrderStatus.Completed;
    this.addDomainEvent(new OrderCompletedEvent(this.id));
  }
}
```

---

## Dependency Inversion Principle

The Dependency Inversion Principle (DIP) is fundamental to both Clean and Hexagonal architectures:

> A. High-level modules should not depend on low-level modules. Both should depend on abstractions.
> B. Abstractions should not depend on details. Details should depend on abstractions.

### Application in Architecture

```
Traditional:                    With DIP:
+---------------+              +---------------+
| Use Case      |              | Use Case      |
+-------+-------+              +-------+-------+
        |                              |
        | depends on                   | depends on
        v                              v
+---------------+              +---------------+
| Repository    |              | IRepository   | <-- Interface in
| Implementation|              | (Port)        |     application layer
+---------------+              +-------+-------+
                                       ^
                                       | implements
                               +-------+-------+
                               | Repository    |
                               | Implementation|
                               +---------------+
```

### Implementation Pattern

```typescript
// 1. Port defined in application layer
// file: application/ports/OrderRepository.ts
interface OrderRepository {
  save(order: Order): Promise<void>;
  findById(id: OrderId): Promise<Order | null>;
}

// 2. Use case depends on port (abstraction)
// file: application/use-cases/PlaceOrder.ts
class PlaceOrderUseCase {
  constructor(private orderRepository: OrderRepository) {}

  async execute(command: PlaceOrderCommand): Promise<OrderId> {
    const order = Order.create(command);
    await this.orderRepository.save(order);
    return order.id;
  }
}

// 3. Adapter implements port
// file: infrastructure/persistence/PostgresOrderRepository.ts
class PostgresOrderRepository implements OrderRepository {
  async save(order: Order): Promise<void> {
    // PostgreSQL-specific implementation
  }

  async findById(id: OrderId): Promise<Order | null> {
    // PostgreSQL-specific implementation
  }
}
```

---

## Best Practices

### 1. Clear Port Contracts

- Define ports with domain language
- Keep ports focused and cohesive
- Use domain types in port signatures
- Document expected behaviors

```typescript
// Clear, focused port
interface PaymentProcessor {
  /**
   * Processes a payment for an order.
   * @throws PaymentDeclinedException if payment is declined
   * @throws PaymentProviderUnavailableException if provider is down
   */
  processPayment(orderId: OrderId, amount: Money): Promise<PaymentResult>;
}
```

### 2. Framework-Agnostic Domain Logic

- No framework imports in domain layer
- No decorators from frameworks
- No ORM-specific base classes
- Use plain objects and functions

```typescript
// Domain layer - pure TypeScript
class Customer {
  private constructor(
    public readonly id: CustomerId,
    public readonly email: Email,
    private name: CustomerName
  ) {}

  static create(email: Email, name: CustomerName): Customer {
    return new Customer(CustomerId.generate(), email, name);
  }

  rename(newName: CustomerName): void {
    this.name = newName;
  }
}
```

### 3. Avoid Over-Abstraction

- Not every class needs an interface
- Create ports only at architectural boundaries
- Don't abstract domain internals
- Let domain objects collaborate directly

```typescript
// Over-abstracted - unnecessary interface
interface IOrderLineItem {
  getPrice(): Money;
}

// Better - direct domain collaboration
class Order {
  private items: OrderLineItem[];

  calculateTotal(): Money {
    return this.items.reduce(
      (sum, item) => sum.add(item.getPrice()),
      Money.zero()
    );
  }
}
```

### 4. Adapter Composition

- Adapters should be thin
- Business logic belongs in domain/application layers
- Adapters only translate and delegate

```typescript
// Good: Thin adapter
class OrderController {
  constructor(private placeOrder: PlaceOrderUseCase) {}

  async create(req: Request): Promise<Response> {
    const command = PlaceOrderCommand.fromRequest(req);
    const orderId = await this.placeOrder.execute(command);
    return Response.created({ orderId: orderId.toString() });
  }
}
```

### 5. Consistent Naming

```
Ports:
- OrderRepository (not IOrderRepository or OrderRepositoryInterface)
- PaymentGateway
- NotificationSender

Adapters:
- PostgresOrderRepository
- StripePaymentGateway
- TwilioNotificationSender

Use Cases:
- PlaceOrderUseCase
- CancelOrderUseCase
- GetOrderDetailsQuery
```

---

## Testing Approach

### Strategy: Mock Ports for Isolation

The port/adapter pattern enables excellent testability by allowing you to mock infrastructure dependencies.

### Testing Layers

```
+------------------+     +------------------+     +------------------+
|  Unit Tests      |     | Integration      |     | E2E Tests        |
|                  |     | Tests            |     |                  |
| - Domain logic   |     | - Adapters with  |     | - Full system    |
| - Use cases with |     |   real infra     |     |   with real      |
|   mocked ports   |     | - Port contracts |     |   adapters       |
+------------------+     +------------------+     +------------------+
```

### Testing Use Cases

```typescript
describe('PlaceOrderUseCase', () => {
  let useCase: PlaceOrderUseCase;
  let orderRepository: MockOrderRepository;
  let paymentGateway: MockPaymentGateway;

  beforeEach(() => {
    orderRepository = new MockOrderRepository();
    paymentGateway = new MockPaymentGateway();
    useCase = new PlaceOrderUseCase(orderRepository, paymentGateway);
  });

  it('should create order and process payment', async () => {
    // Arrange
    paymentGateway.willSucceed();
    const command = new PlaceOrderCommand(/* ... */);

    // Act
    const orderId = await useCase.execute(command);

    // Assert
    expect(orderRepository.savedOrders).toHaveLength(1);
    expect(paymentGateway.processedPayments).toHaveLength(1);
  });

  it('should not save order when payment fails', async () => {
    // Arrange
    paymentGateway.willFail();
    const command = new PlaceOrderCommand(/* ... */);

    // Act & Assert
    await expect(useCase.execute(command)).rejects.toThrow(PaymentFailedException);
    expect(orderRepository.savedOrders).toHaveLength(0);
  });
});
```

### Testing Domain Logic

```typescript
describe('Order', () => {
  it('should calculate total from line items', () => {
    const order = Order.create(customerId);
    order.addItem(new Product('SKU-1', Money.of(100)));
    order.addItem(new Product('SKU-2', Money.of(50)));

    expect(order.calculateTotal()).toEqual(Money.of(150));
  });

  it('should not allow completion without items', () => {
    const order = Order.create(customerId);

    expect(() => order.complete()).toThrow(OrderCannotBeEmptyException);
  });
});
```

### Contract Tests for Adapters

```typescript
// Shared contract test for all OrderRepository implementations
abstract class OrderRepositoryContract {
  abstract createRepository(): OrderRepository;

  it('should save and retrieve order', async () => {
    const repo = this.createRepository();
    const order = Order.create(customerId);

    await repo.save(order);
    const retrieved = await repo.findById(order.id);

    expect(retrieved).toEqual(order);
  });
}

// Implementation-specific test
describe('PostgresOrderRepository', () => {
  extends OrderRepositoryContract {
    createRepository() {
      return new PostgresOrderRepository(testConnection);
    }
  }
});
```

---

## Code Examples

### Complete Example: Order Management

#### Directory Structure

```
src/
  domain/
    entities/
      Order.ts
      OrderLineItem.ts
    value-objects/
      OrderId.ts
      Money.ts
      OrderStatus.ts
    services/
      PricingService.ts
    events/
      OrderCreatedEvent.ts
      OrderCompletedEvent.ts
  application/
    ports/
      driving/
        OrderUseCases.ts
      driven/
        OrderRepository.ts
        PaymentGateway.ts
        NotificationSender.ts
    use-cases/
      PlaceOrderUseCase.ts
      CompleteOrderUseCase.ts
    dto/
      PlaceOrderCommand.ts
      OrderResponse.ts
  infrastructure/
    adapters/
      primary/
        rest/
          OrderController.ts
        cli/
          OrderCommands.ts
      secondary/
        persistence/
          PostgresOrderRepository.ts
        payment/
          StripePaymentGateway.ts
        notification/
          EmailNotificationSender.ts
    config/
      DependencyInjection.ts
```

#### Domain Layer

```typescript
// domain/value-objects/OrderId.ts
export class OrderId {
  private constructor(private readonly value: string) {}

  static generate(): OrderId {
    return new OrderId(crypto.randomUUID());
  }

  static fromString(value: string): OrderId {
    if (!value || value.trim() === '') {
      throw new InvalidOrderIdException('Order ID cannot be empty');
    }
    return new OrderId(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: OrderId): boolean {
    return this.value === other.value;
  }
}

// domain/value-objects/Money.ts
export class Money {
  private constructor(
    private readonly amount: number,
    private readonly currency: string
  ) {}

  static of(amount: number, currency: string = 'USD'): Money {
    if (amount < 0) {
      throw new InvalidMoneyException('Amount cannot be negative');
    }
    return new Money(amount, currency);
  }

  static zero(currency: string = 'USD'): Money {
    return new Money(0, currency);
  }

  add(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money(this.amount + other.amount, this.currency);
  }

  multiply(factor: number): Money {
    return new Money(this.amount * factor, this.currency);
  }

  private ensureSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new CurrencyMismatchException();
    }
  }
}

// domain/entities/Order.ts
export class Order {
  private items: OrderLineItem[] = [];
  private status: OrderStatus = OrderStatus.Draft;
  private domainEvents: DomainEvent[] = [];

  private constructor(
    public readonly id: OrderId,
    public readonly customerId: CustomerId,
    private readonly createdAt: Date
  ) {}

  static create(customerId: CustomerId): Order {
    const order = new Order(
      OrderId.generate(),
      customerId,
      new Date()
    );
    order.addDomainEvent(new OrderCreatedEvent(order.id, customerId));
    return order;
  }

  addItem(product: Product, quantity: number): void {
    if (this.status !== OrderStatus.Draft) {
      throw new OrderNotModifiableException();
    }

    const existingItem = this.items.find(i => i.productId.equals(product.id));
    if (existingItem) {
      existingItem.increaseQuantity(quantity);
    } else {
      this.items.push(new OrderLineItem(product, quantity));
    }
  }

  calculateTotal(): Money {
    return this.items.reduce(
      (sum, item) => sum.add(item.calculateSubtotal()),
      Money.zero()
    );
  }

  submit(): void {
    if (this.items.length === 0) {
      throw new OrderCannotBeEmptyException();
    }
    if (this.status !== OrderStatus.Draft) {
      throw new InvalidOrderStateTransitionException();
    }
    this.status = OrderStatus.Submitted;
  }

  complete(): void {
    if (this.status !== OrderStatus.Submitted) {
      throw new InvalidOrderStateTransitionException();
    }
    this.status = OrderStatus.Completed;
    this.addDomainEvent(new OrderCompletedEvent(this.id));
  }

  private addDomainEvent(event: DomainEvent): void {
    this.domainEvents.push(event);
  }

  pullDomainEvents(): DomainEvent[] {
    const events = [...this.domainEvents];
    this.domainEvents = [];
    return events;
  }
}
```

#### Application Layer (Ports and Use Cases)

```typescript
// application/ports/driven/OrderRepository.ts
export interface OrderRepository {
  save(order: Order): Promise<void>;
  findById(id: OrderId): Promise<Order | null>;
  findByCustomer(customerId: CustomerId): Promise<Order[]>;
}

// application/ports/driven/PaymentGateway.ts
export interface PaymentGateway {
  processPayment(
    orderId: OrderId,
    amount: Money,
    paymentMethod: PaymentMethod
  ): Promise<PaymentResult>;

  refund(paymentId: PaymentId): Promise<RefundResult>;
}

// application/ports/driven/NotificationSender.ts
export interface NotificationSender {
  sendOrderConfirmation(
    customerId: CustomerId,
    orderId: OrderId
  ): Promise<void>;
}

// application/use-cases/PlaceOrderUseCase.ts
export class PlaceOrderUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly paymentGateway: PaymentGateway,
    private readonly notificationSender: NotificationSender
  ) {}

  async execute(command: PlaceOrderCommand): Promise<OrderId> {
    // Create order
    const order = Order.create(command.customerId);

    for (const item of command.items) {
      order.addItem(item.product, item.quantity);
    }

    order.submit();

    // Process payment
    const paymentResult = await this.paymentGateway.processPayment(
      order.id,
      order.calculateTotal(),
      command.paymentMethod
    );

    if (!paymentResult.isSuccessful) {
      throw new PaymentFailedException(paymentResult.failureReason);
    }

    // Complete order
    order.complete();

    // Persist
    await this.orderRepository.save(order);

    // Notify customer (fire and forget)
    this.notificationSender
      .sendOrderConfirmation(command.customerId, order.id)
      .catch(err => console.error('Failed to send notification', err));

    return order.id;
  }
}
```

#### Infrastructure Layer (Adapters)

```typescript
// infrastructure/adapters/primary/rest/OrderController.ts
export class OrderController {
  constructor(private readonly placeOrderUseCase: PlaceOrderUseCase) {}

  async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const command = this.mapToCommand(req.body);
      const orderId = await this.placeOrderUseCase.execute(command);

      res.status(201).json({
        orderId: orderId.toString(),
        message: 'Order created successfully'
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  private mapToCommand(body: any): PlaceOrderCommand {
    return new PlaceOrderCommand(
      CustomerId.fromString(body.customerId),
      body.items.map((item: any) => ({
        product: new Product(item.productId, Money.of(item.price)),
        quantity: item.quantity
      })),
      PaymentMethod.fromString(body.paymentMethod)
    );
  }

  private handleError(error: unknown, res: Response): void {
    if (error instanceof OrderCannotBeEmptyException) {
      res.status(400).json({ error: 'Order must have at least one item' });
    } else if (error instanceof PaymentFailedException) {
      res.status(402).json({ error: 'Payment failed' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

// infrastructure/adapters/secondary/persistence/PostgresOrderRepository.ts
export class PostgresOrderRepository implements OrderRepository {
  constructor(private readonly db: Database) {}

  async save(order: Order): Promise<void> {
    const orderData = this.mapToDatabase(order);

    await this.db.transaction(async (trx) => {
      await trx('orders').insert(orderData.order);

      for (const item of orderData.items) {
        await trx('order_items').insert(item);
      }
    });
  }

  async findById(id: OrderId): Promise<Order | null> {
    const orderRow = await this.db('orders')
      .where('id', id.toString())
      .first();

    if (!orderRow) {
      return null;
    }

    const itemRows = await this.db('order_items')
      .where('order_id', id.toString());

    return this.mapToDomain(orderRow, itemRows);
  }

  async findByCustomer(customerId: CustomerId): Promise<Order[]> {
    const orderRows = await this.db('orders')
      .where('customer_id', customerId.toString());

    return Promise.all(
      orderRows.map(async (row) => {
        const items = await this.db('order_items')
          .where('order_id', row.id);
        return this.mapToDomain(row, items);
      })
    );
  }

  private mapToDatabase(order: Order): DatabaseOrderData {
    // Transform domain object to database format
    return {
      order: {
        id: order.id.toString(),
        customer_id: order.customerId.toString(),
        status: order.status,
        total_amount: order.calculateTotal().amount,
        created_at: order.createdAt
      },
      items: order.items.map(item => ({
        order_id: order.id.toString(),
        product_id: item.productId.toString(),
        quantity: item.quantity,
        unit_price: item.unitPrice.amount
      }))
    };
  }

  private mapToDomain(orderRow: any, itemRows: any[]): Order {
    // Transform database format to domain object
    // This typically involves using a factory or reconstitution method
    return Order.reconstitute(
      OrderId.fromString(orderRow.id),
      CustomerId.fromString(orderRow.customer_id),
      OrderStatus.fromString(orderRow.status),
      itemRows.map(row => OrderLineItem.reconstitute(
        ProductId.fromString(row.product_id),
        row.quantity,
        Money.of(row.unit_price)
      )),
      new Date(orderRow.created_at)
    );
  }
}

// infrastructure/adapters/secondary/payment/StripePaymentGateway.ts
export class StripePaymentGateway implements PaymentGateway {
  constructor(private readonly stripeClient: Stripe) {}

  async processPayment(
    orderId: OrderId,
    amount: Money,
    paymentMethod: PaymentMethod
  ): Promise<PaymentResult> {
    try {
      const charge = await this.stripeClient.charges.create({
        amount: amount.toCents(),
        currency: amount.currency.toLowerCase(),
        source: paymentMethod.stripeToken,
        metadata: {
          orderId: orderId.toString()
        }
      });

      return PaymentResult.success(PaymentId.fromString(charge.id));
    } catch (error) {
      if (error instanceof Stripe.errors.StripeCardError) {
        return PaymentResult.declined(error.message);
      }
      throw new PaymentProviderUnavailableException(error);
    }
  }

  async refund(paymentId: PaymentId): Promise<RefundResult> {
    const refund = await this.stripeClient.refunds.create({
      charge: paymentId.toString()
    });

    return RefundResult.success(RefundId.fromString(refund.id));
  }
}
```

#### Dependency Injection Configuration

```typescript
// infrastructure/config/DependencyInjection.ts
export function configureDependencies(container: Container): void {
  // Database
  container.register('Database', () => createDatabaseConnection());

  // Repositories (Secondary Adapters)
  container.register<OrderRepository>(
    'OrderRepository',
    (c) => new PostgresOrderRepository(c.resolve('Database'))
  );

  // External Services (Secondary Adapters)
  container.register<PaymentGateway>(
    'PaymentGateway',
    () => new StripePaymentGateway(new Stripe(process.env.STRIPE_KEY))
  );

  container.register<NotificationSender>(
    'NotificationSender',
    () => new EmailNotificationSender(createEmailClient())
  );

  // Use Cases
  container.register(
    'PlaceOrderUseCase',
    (c) => new PlaceOrderUseCase(
      c.resolve('OrderRepository'),
      c.resolve('PaymentGateway'),
      c.resolve('NotificationSender')
    )
  );

  // Controllers (Primary Adapters)
  container.register(
    'OrderController',
    (c) => new OrderController(c.resolve('PlaceOrderUseCase'))
  );
}
```

---

## Summary

Clean and Hexagonal Architecture patterns provide a robust foundation for building maintainable, testable applications:

1. **Keep the domain pure**: No framework or infrastructure dependencies
2. **Define clear boundaries**: Ports specify contracts between layers
3. **Implement adapters**: Thin translation layers at the edges
4. **Invert dependencies**: High-level modules define abstractions
5. **Test in isolation**: Mock ports to test business logic without infrastructure
6. **Use domain language**: Name ports and concepts after business terminology
7. **Avoid over-abstraction**: Create ports only at architectural boundaries

By following these patterns, your applications will be:
- Easier to test
- More maintainable over time
- Flexible to technology changes
- Clear in their structure and responsibilities
