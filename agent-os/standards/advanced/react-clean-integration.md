# React Clean Architecture Integration

This guide covers integrating React with clean architecture principles, ensuring the domain layer remains framework-agnostic while leveraging React's strengths through well-designed adapter patterns.

## Core Principles

### 1. Domain Layer Independence

The domain layer must remain completely framework-agnostic. It should contain:
- Business entities and value objects
- Use cases (interactors)
- Domain services
- Repository interfaces (ports)

```typescript
// domains/order/entities/Order.ts
export interface Order {
  id: string;
  items: OrderItem[];
  status: OrderStatus;
  totalAmount: number;
  customerId: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered';

// domains/order/usecases/CreateOrder.ts
export interface CreateOrderInput {
  customerId: string;
  items: { productId: string; quantity: number }[];
}

export interface CreateOrderOutput {
  order: Order;
}

export interface OrderRepository {
  save(order: Order): Promise<Order>;
  findById(id: string): Promise<Order | null>;
}

export class CreateOrderUseCase {
  constructor(private orderRepository: OrderRepository) {}

  async execute(input: CreateOrderInput): Promise<CreateOrderOutput> {
    // Business logic here - no React, no hooks, no framework code
    const order = this.buildOrder(input);
    const savedOrder = await this.orderRepository.save(order);
    return { order: savedOrder };
  }

  private buildOrder(input: CreateOrderInput): Order {
    // Domain logic for building an order
    return {
      id: crypto.randomUUID(),
      items: input.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: 0, // Would be fetched from product service
      })),
      status: 'pending',
      totalAmount: 0,
      customerId: input.customerId,
    };
  }
}
```

### 2. Adapter Layer: Hooks as the DI Mechanism

Custom hooks serve as the adapter layer, connecting React components to domain use cases. They handle:
- Dependency injection of repositories and services
- State management for UI concerns
- Transformation between domain and view models

```typescript
// adapters/hooks/useCreateOrder.ts
import { useState, useCallback } from 'react';
import { CreateOrderUseCase, CreateOrderInput } from '@/domains/order/usecases/CreateOrder';
import { OrderRepositoryImpl } from '@/infrastructure/repositories/OrderRepositoryImpl';

interface UseCreateOrderResult {
  createOrder: (input: CreateOrderInput) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  order: Order | null;
}

export function useCreateOrder(): UseCreateOrderResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);

  // Dependency injection happens here in the adapter
  const orderRepository = new OrderRepositoryImpl();
  const useCase = new CreateOrderUseCase(orderRepository);

  const createOrder = useCallback(async (input: CreateOrderInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await useCase.execute(input);
      setOrder(result.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { createOrder, isLoading, error, order };
}
```

### 3. Presenters as React Hooks (Modern Approach)

Presenters transform domain data into view models. In React, this pattern is elegantly implemented as custom hooks:

```typescript
// adapters/presenters/useOrderPresenter.ts
import { useMemo } from 'react';
import { Order, OrderStatus } from '@/domains/order/entities/Order';

interface OrderViewModel {
  id: string;
  displayStatus: string;
  statusColor: string;
  formattedTotal: string;
  itemCount: number;
  canCancel: boolean;
  canEdit: boolean;
}

export function useOrderPresenter(order: Order | null): OrderViewModel | null {
  return useMemo(() => {
    if (!order) return null;

    return {
      id: order.id,
      displayStatus: formatStatus(order.status),
      statusColor: getStatusColor(order.status),
      formattedTotal: formatCurrency(order.totalAmount),
      itemCount: order.items.length,
      canCancel: order.status === 'pending',
      canEdit: order.status === 'pending',
    };
  }, [order]);
}

// Pure functions - no React, easily testable
function formatStatus(status: OrderStatus): string {
  const statusMap: Record<OrderStatus, string> = {
    pending: 'Pending Confirmation',
    confirmed: 'Order Confirmed',
    shipped: 'In Transit',
    delivered: 'Delivered',
  };
  return statusMap[status];
}

function getStatusColor(status: OrderStatus): string {
  const colorMap: Record<OrderStatus, string> = {
    pending: 'yellow',
    confirmed: 'blue',
    shipped: 'purple',
    delivered: 'green',
  };
  return colorMap[status];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}
```

### 4. Business Logic Outside Components

Move all business logic to separate functions. Components should only handle:
- Rendering UI
- Delegating user actions to hooks
- Composing view models

```typescript
// domains/order/services/orderValidation.ts
// Pure business logic - no React
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateOrderItems(
  items: { productId: string; quantity: number }[]
): ValidationResult {
  const errors: string[] = [];

  if (items.length === 0) {
    errors.push('Order must have at least one item');
  }

  items.forEach((item, index) => {
    if (item.quantity <= 0) {
      errors.push(`Item ${index + 1}: Quantity must be positive`);
    }
    if (item.quantity > 100) {
      errors.push(`Item ${index + 1}: Maximum quantity is 100`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// adapters/hooks/useOrderValidation.ts
import { useState, useCallback } from 'react';
import { validateOrderItems, ValidationResult } from '@/domains/order/services/orderValidation';

export function useOrderValidation() {
  const [validation, setValidation] = useState<ValidationResult>({ isValid: true, errors: [] });

  const validate = useCallback((items: { productId: string; quantity: number }[]) => {
    const result = validateOrderItems(items);
    setValidation(result);
    return result;
  }, []);

  return { validation, validate };
}
```

### 5. Data Layer for API Calls

API calls belong in the infrastructure layer, not in components or hooks directly:

```typescript
// infrastructure/api/orderApi.ts
// Pure API functions - no React
export interface OrderApiResponse {
  id: string;
  items: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
  }>;
  status: string;
  total_amount: number;
  customer_id: string;
}

export async function fetchOrder(orderId: string): Promise<OrderApiResponse> {
  const response = await fetch(`/api/orders/${orderId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch order: ${response.statusText}`);
  }
  return response.json();
}

export async function createOrder(
  data: { customerId: string; items: Array<{ productId: string; quantity: number }> }
): Promise<OrderApiResponse> {
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer_id: data.customerId,
      items: data.items.map(item => ({
        product_id: item.productId,
        quantity: item.quantity,
      })),
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to create order: ${response.statusText}`);
  }
  return response.json();
}

// infrastructure/repositories/OrderRepositoryImpl.ts
import { Order, OrderRepository } from '@/domains/order/usecases/CreateOrder';
import { fetchOrder, createOrder, OrderApiResponse } from '@/infrastructure/api/orderApi';

export class OrderRepositoryImpl implements OrderRepository {
  async save(order: Order): Promise<Order> {
    const response = await createOrder({
      customerId: order.customerId,
      items: order.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    });
    return this.mapToDomain(response);
  }

  async findById(id: string): Promise<Order | null> {
    try {
      const response = await fetchOrder(id);
      return this.mapToDomain(response);
    } catch {
      return null;
    }
  }

  private mapToDomain(response: OrderApiResponse): Order {
    return {
      id: response.id,
      items: response.items.map(item => ({
        productId: item.product_id,
        quantity: item.quantity,
        price: item.unit_price,
      })),
      status: response.status as Order['status'],
      totalAmount: response.total_amount,
      customerId: response.customer_id,
    };
  }
}
```

## Directory Structure

```
src/
├── domains/                    # Domain Layer (Framework-Agnostic)
│   └── order/
│       ├── entities/
│       │   └── Order.ts
│       ├── usecases/
│       │   ├── CreateOrder.ts
│       │   └── GetOrderDetails.ts
│       └── services/
│           └── orderValidation.ts
│
├── adapters/                   # Adapter Layer (React Integration)
│   ├── hooks/
│   │   ├── useCreateOrder.ts
│   │   ├── useOrderDetails.ts
│   │   └── useOrderValidation.ts
│   └── presenters/
│       └── useOrderPresenter.ts
│
├── infrastructure/             # Infrastructure Layer
│   ├── api/
│   │   └── orderApi.ts
│   └── repositories/
│       └── OrderRepositoryImpl.ts
│
└── frameworks/                 # Framework Layer (React Components)
    └── react/
        ├── components/
        │   ├── OrderForm.tsx
        │   └── OrderDetails.tsx
        └── pages/
            └── OrderPage.tsx
```

## Avoiding Framework Leakage

### What to Avoid

```typescript
// BAD: React state in domain layer
// domains/order/usecases/CreateOrder.ts
import { useState } from 'react'; // NEVER import React in domain

export class CreateOrderUseCase {
  // Domain should not know about React state
}

// BAD: Business logic in components
function OrderForm() {
  const [items, setItems] = useState([]);

  // Business logic should NOT be here
  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      const discount = item.quantity > 10 ? 0.1 : 0;
      return sum + (item.price * item.quantity * (1 - discount));
    }, 0);
  };
}

// BAD: API calls directly in components
function OrderDetails({ orderId }) {
  useEffect(() => {
    // API calls should be in infrastructure layer
    fetch(`/api/orders/${orderId}`)
      .then(res => res.json())
      .then(setOrder);
  }, [orderId]);
}
```

### Correct Approach

```typescript
// GOOD: Clean component using hooks as adapters
function OrderForm() {
  const { createOrder, isLoading, error } = useCreateOrder();
  const { validation, validate } = useOrderValidation();
  const [items, setItems] = useState<OrderItem[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationResult = validate(items);
    if (validationResult.isValid) {
      await createOrder({ customerId: 'user-123', items });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* UI only - no business logic */}
      {validation.errors.map(error => (
        <div key={error} className="error">{error}</div>
      ))}
      <ItemList items={items} onChange={setItems} />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create Order'}
      </button>
    </form>
  );
}

// GOOD: Component using presenter for view model
function OrderDetails({ orderId }: { orderId: string }) {
  const { order, isLoading, error } = useOrderDetails(orderId);
  const viewModel = useOrderPresenter(order);

  if (isLoading) return <Loading />;
  if (error) return <ErrorMessage message={error} />;
  if (!viewModel) return <NotFound />;

  return (
    <div className="order-details">
      <h1>Order #{viewModel.id}</h1>
      <StatusBadge color={viewModel.statusColor}>
        {viewModel.displayStatus}
      </StatusBadge>
      <p>Total: {viewModel.formattedTotal}</p>
      <p>{viewModel.itemCount} items</p>
      {viewModel.canCancel && <CancelButton orderId={orderId} />}
    </div>
  );
}
```

## Pragmatic Exceptions

While maintaining clean architecture is important, some pragmatic exceptions are acceptable:

### 1. Simple UI State

Local UI state that has no business meaning can live in components:

```typescript
function OrderForm() {
  // OK: Pure UI concern
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  // ...
}
```

### 2. Framework-Specific Optimizations

Performance optimizations using React primitives are acceptable in the adapter layer:

```typescript
// adapters/hooks/useOrderList.ts
export function useOrderList() {
  // OK: Using React Query or SWR for caching
  const { data, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => orderRepository.findAll(),
  });

  return { orders: data, isLoading };
}
```

### 3. Third-Party Integration

When integrating with React-specific libraries, isolate them in the adapter layer:

```typescript
// adapters/hooks/useOrderForm.ts
import { useForm } from 'react-hook-form';
import { validateOrderItems } from '@/domains/order/services/orderValidation';

export function useOrderForm() {
  const form = useForm({
    resolver: (values) => {
      // Bridge to domain validation
      const result = validateOrderItems(values.items);
      return {
        values: result.isValid ? values : {},
        errors: result.errors.reduce((acc, error, index) => {
          acc[`items.${index}`] = { message: error };
          return acc;
        }, {}),
      };
    },
  });

  return form;
}
```

## Complete Example: Order Feature

### Domain Layer

```typescript
// domains/order/entities/Order.ts
export interface Order {
  id: string;
  items: OrderItem[];
  status: OrderStatus;
  totalAmount: number;
  customerId: string;
  createdAt: Date;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

// domains/order/usecases/CreateOrder.ts
export interface CreateOrderInput {
  customerId: string;
  items: { productId: string; quantity: number }[];
}

export interface CreateOrderOutput {
  order: Order;
}

export interface OrderRepository {
  save(order: Order): Promise<Order>;
  findById(id: string): Promise<Order | null>;
  findByCustomerId(customerId: string): Promise<Order[]>;
}

export interface ProductService {
  getPrice(productId: string): Promise<number>;
}

export class CreateOrderUseCase {
  constructor(
    private orderRepository: OrderRepository,
    private productService: ProductService
  ) {}

  async execute(input: CreateOrderInput): Promise<CreateOrderOutput> {
    const items = await this.buildOrderItems(input.items);
    const totalAmount = this.calculateTotal(items);

    const order: Order = {
      id: crypto.randomUUID(),
      items,
      status: 'pending',
      totalAmount,
      customerId: input.customerId,
      createdAt: new Date(),
    };

    const savedOrder = await this.orderRepository.save(order);
    return { order: savedOrder };
  }

  private async buildOrderItems(
    items: { productId: string; quantity: number }[]
  ): Promise<OrderItem[]> {
    return Promise.all(
      items.map(async (item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: await this.productService.getPrice(item.productId),
      }))
    );
  }

  private calculateTotal(items: OrderItem[]): number {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }
}
```

### Adapter Layer

```typescript
// adapters/hooks/useCreateOrder.ts
import { useState, useCallback } from 'react';
import { CreateOrderUseCase, CreateOrderInput, Order } from '@/domains/order/usecases/CreateOrder';
import { useOrderDependencies } from './useOrderDependencies';

interface UseCreateOrderResult {
  createOrder: (input: CreateOrderInput) => Promise<Order | null>;
  isLoading: boolean;
  error: string | null;
  createdOrder: Order | null;
  reset: () => void;
}

export function useCreateOrder(): UseCreateOrderResult {
  const { orderRepository, productService } = useOrderDependencies();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  const useCase = new CreateOrderUseCase(orderRepository, productService);

  const createOrder = useCallback(async (input: CreateOrderInput): Promise<Order | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await useCase.execute(input);
      setCreatedOrder(result.order);
      return result.order;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create order';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [orderRepository, productService]);

  const reset = useCallback(() => {
    setError(null);
    setCreatedOrder(null);
  }, []);

  return { createOrder, isLoading, error, createdOrder, reset };
}

// adapters/hooks/useOrderDependencies.ts
import { useMemo } from 'react';
import { OrderRepositoryImpl } from '@/infrastructure/repositories/OrderRepositoryImpl';
import { ProductServiceImpl } from '@/infrastructure/services/ProductServiceImpl';

export function useOrderDependencies() {
  return useMemo(() => ({
    orderRepository: new OrderRepositoryImpl(),
    productService: new ProductServiceImpl(),
  }), []);
}

// adapters/presenters/useOrderPresenter.ts
import { useMemo } from 'react';
import { Order, OrderStatus } from '@/domains/order/entities/Order';

export interface OrderViewModel {
  id: string;
  displayStatus: string;
  statusColor: 'yellow' | 'blue' | 'purple' | 'green' | 'red';
  formattedTotal: string;
  formattedDate: string;
  itemCount: number;
  itemSummary: string;
  canCancel: boolean;
  canEdit: boolean;
  isComplete: boolean;
}

export function useOrderPresenter(order: Order | null): OrderViewModel | null {
  return useMemo(() => {
    if (!order) return null;

    const statusInfo = getStatusInfo(order.status);

    return {
      id: order.id,
      displayStatus: statusInfo.label,
      statusColor: statusInfo.color,
      formattedTotal: formatCurrency(order.totalAmount),
      formattedDate: formatDate(order.createdAt),
      itemCount: order.items.length,
      itemSummary: `${order.items.length} item${order.items.length !== 1 ? 's' : ''}`,
      canCancel: order.status === 'pending',
      canEdit: order.status === 'pending',
      isComplete: order.status === 'delivered',
    };
  }, [order]);
}

// Pure helper functions
function getStatusInfo(status: OrderStatus): { label: string; color: OrderViewModel['statusColor'] } {
  const statusMap: Record<OrderStatus, { label: string; color: OrderViewModel['statusColor'] }> = {
    pending: { label: 'Pending', color: 'yellow' },
    confirmed: { label: 'Confirmed', color: 'blue' },
    shipped: { label: 'Shipped', color: 'purple' },
    delivered: { label: 'Delivered', color: 'green' },
    cancelled: { label: 'Cancelled', color: 'red' },
  };
  return statusMap[status];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
```

### Framework Layer

```typescript
// frameworks/react/components/CreateOrderForm.tsx
import { useState } from 'react';
import { useCreateOrder } from '@/adapters/hooks/useCreateOrder';
import { useOrderValidation } from '@/adapters/hooks/useOrderValidation';

interface OrderItemInput {
  productId: string;
  quantity: number;
}

export function CreateOrderForm({ customerId }: { customerId: string }) {
  const { createOrder, isLoading, error, createdOrder } = useCreateOrder();
  const { validation, validate } = useOrderValidation();
  const [items, setItems] = useState<OrderItemInput[]>([]);

  const handleAddItem = () => {
    setItems([...items, { productId: '', quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof OrderItemInput, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = validate(items);
    if (result.isValid) {
      await createOrder({ customerId, items });
    }
  };

  if (createdOrder) {
    return <OrderSuccess orderId={createdOrder.id} />;
  }

  return (
    <form onSubmit={handleSubmit} className="create-order-form">
      <h2>Create New Order</h2>

      {error && <div className="error-banner">{error}</div>}

      {validation.errors.map((validationError, index) => (
        <div key={index} className="validation-error">{validationError}</div>
      ))}

      <div className="items-list">
        {items.map((item, index) => (
          <div key={index} className="item-row">
            <input
              type="text"
              placeholder="Product ID"
              value={item.productId}
              onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
            />
            <input
              type="number"
              min="1"
              value={item.quantity}
              onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value, 10))}
            />
            <button type="button" onClick={() => handleRemoveItem(index)}>
              Remove
            </button>
          </div>
        ))}
      </div>

      <button type="button" onClick={handleAddItem}>Add Item</button>

      <button type="submit" disabled={isLoading || items.length === 0}>
        {isLoading ? 'Creating...' : 'Create Order'}
      </button>
    </form>
  );
}

// frameworks/react/components/OrderDetails.tsx
import { useOrderDetails } from '@/adapters/hooks/useOrderDetails';
import { useOrderPresenter } from '@/adapters/presenters/useOrderPresenter';

export function OrderDetails({ orderId }: { orderId: string }) {
  const { order, isLoading, error } = useOrderDetails(orderId);
  const viewModel = useOrderPresenter(order);

  if (isLoading) {
    return <div className="loading">Loading order...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (!viewModel) {
    return <div className="not-found">Order not found</div>;
  }

  return (
    <div className="order-details">
      <header>
        <h1>Order #{viewModel.id.slice(0, 8)}</h1>
        <span className={`status-badge status-${viewModel.statusColor}`}>
          {viewModel.displayStatus}
        </span>
      </header>

      <section className="order-info">
        <p><strong>Created:</strong> {viewModel.formattedDate}</p>
        <p><strong>Items:</strong> {viewModel.itemSummary}</p>
        <p><strong>Total:</strong> {viewModel.formattedTotal}</p>
      </section>

      <footer className="order-actions">
        {viewModel.canEdit && (
          <button className="btn-secondary">Edit Order</button>
        )}
        {viewModel.canCancel && (
          <button className="btn-danger">Cancel Order</button>
        )}
        {viewModel.isComplete && (
          <button className="btn-primary">Reorder</button>
        )}
      </footer>
    </div>
  );
}
```

## Testing Strategy

### Domain Layer Tests (Unit Tests)

```typescript
// domains/order/usecases/__tests__/CreateOrder.test.ts
import { CreateOrderUseCase } from '../CreateOrder';

describe('CreateOrderUseCase', () => {
  it('should create an order with calculated total', async () => {
    const mockOrderRepository = {
      save: jest.fn().mockImplementation((order) => Promise.resolve(order)),
      findById: jest.fn(),
    };
    const mockProductService = {
      getPrice: jest.fn().mockResolvedValue(10.00),
    };

    const useCase = new CreateOrderUseCase(mockOrderRepository, mockProductService);
    const result = await useCase.execute({
      customerId: 'customer-1',
      items: [{ productId: 'product-1', quantity: 2 }],
    });

    expect(result.order.totalAmount).toBe(20.00);
    expect(result.order.status).toBe('pending');
  });
});
```

### Adapter Layer Tests (Integration Tests)

```typescript
// adapters/hooks/__tests__/useCreateOrder.test.tsx
import { renderHook, act } from '@testing-library/react-hooks';
import { useCreateOrder } from '../useCreateOrder';

// Mock dependencies
jest.mock('@/infrastructure/repositories/OrderRepositoryImpl');

describe('useCreateOrder', () => {
  it('should handle successful order creation', async () => {
    const { result } = renderHook(() => useCreateOrder());

    await act(async () => {
      await result.current.createOrder({
        customerId: 'customer-1',
        items: [{ productId: 'product-1', quantity: 1 }],
      });
    });

    expect(result.current.createdOrder).not.toBeNull();
    expect(result.current.error).toBeNull();
  });
});
```

## Summary

1. **Domain Layer**: Pure TypeScript/JavaScript, no framework imports
2. **Adapter Layer**: Hooks serve as DI mechanism and presenters
3. **Infrastructure Layer**: API calls, repository implementations
4. **Framework Layer**: React components that compose hooks

This architecture ensures:
- Domain logic is testable without React
- React components remain simple and focused on UI
- Dependencies flow inward (Dependency Rule)
- Framework changes don't affect business logic
- Clear separation of concerns
