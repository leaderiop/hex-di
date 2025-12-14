# TypeScript Type-Level Programming

This guide covers advanced TypeScript type-level programming techniques for building robust, type-safe applications.

## Table of Contents

1. [Conditional Types](#conditional-types)
2. [Mapped Types](#mapped-types)
3. [Template Literal Types](#template-literal-types)
4. [The `infer` Keyword](#the-infer-keyword)
5. [Building Custom Utility Types](#building-custom-utility-types)
6. [Best Practices](#best-practices)
7. [Common Pitfalls](#common-pitfalls)

---

## Conditional Types

Conditional types allow you to express type-level logic using the syntax `T extends U ? X : Y`.

### Basic Syntax

```typescript
type IsString<T> = T extends string ? true : false;

type A = IsString<string>;  // true
type B = IsString<number>;  // false
```

### Distributive Conditional Types

When a conditional type acts on a union type, it distributes over each member of the union:

```typescript
type ToArray<T> = T extends unknown ? T[] : never;

// Distributes over the union
type Result = ToArray<string | number>;  // string[] | number[]
```

**Important:** Distribution only occurs when the type parameter appears naked (not wrapped in another type construct).

```typescript
// Non-distributive version (wrapped in tuple)
type ToArrayNonDistributive<T> = [T] extends [unknown] ? T[] : never;

type Result2 = ToArrayNonDistributive<string | number>;  // (string | number)[]
```

### Constraining with `extends`

Use `extends` to narrow types and enable type-safe property access:

```typescript
type GetLength<T> = T extends { length: number } ? T['length'] : never;

type A = GetLength<string>;    // number
type B = GetLength<number[]>;  // number
type C = GetLength<number>;    // never
```

---

## Mapped Types

Mapped types transform properties of an existing type systematically.

### Basic Mapped Types

```typescript
type Readonly<T> = {
  readonly [K in keyof T]: T[K];
};

type Optional<T> = {
  [K in keyof T]?: T[K];
};

interface User {
  id: number;
  name: string;
}

type ReadonlyUser = Readonly<User>;
// { readonly id: number; readonly name: string; }
```

### Key Remapping with `as`

Use `as` to transform keys during mapping:

```typescript
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface Person {
  name: string;
  age: number;
}

type PersonGetters = Getters<Person>;
// { getName: () => string; getAge: () => number; }
```

### Filtering Properties

Filter out properties by remapping keys to `never`:

```typescript
type OnlyStrings<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
};

interface Mixed {
  id: number;
  name: string;
  email: string;
}

type StringProps = OnlyStrings<Mixed>;
// { name: string; email: string; }
```

### Modifiers (`+`, `-`, `readonly`, `?`)

```typescript
type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};

type Required<T> = {
  [K in keyof T]-?: T[K];
};
```

---

## Template Literal Types

Template literal types allow string manipulation at the type level.

### Basic Template Literals

```typescript
type Greeting = `Hello, ${string}`;

const a: Greeting = "Hello, World";  // OK
const b: Greeting = "Hi, World";     // Error
```

### String Manipulation Utilities

TypeScript provides built-in string manipulation types:

```typescript
type Upper = Uppercase<'hello'>;      // 'HELLO'
type Lower = Lowercase<'HELLO'>;      // 'hello'
type Cap = Capitalize<'hello'>;       // 'Hello'
type Uncap = Uncapitalize<'Hello'>;   // 'hello'
```

### Building Event Handler Types

```typescript
type EventName<T extends string> = `on${Capitalize<T>}`;

type ClickEvent = EventName<'click'>;   // 'onClick'
type FocusEvent = EventName<'focus'>;   // 'onFocus'
```

### Parsing Strings

```typescript
type ParseRouteParams<T extends string> =
  T extends `${infer _Start}:${infer Param}/${infer Rest}`
    ? Param | ParseRouteParams<Rest>
    : T extends `${infer _Start}:${infer Param}`
      ? Param
      : never;

type Params = ParseRouteParams<'/users/:userId/posts/:postId'>;
// 'userId' | 'postId'
```

---

## The `infer` Keyword

The `infer` keyword extracts types from within conditional type checks.

### Extracting Function Return Types

```typescript
type ReturnType<T> = T extends (...args: unknown[]) => infer R ? R : never;

type Fn = () => string;
type Result = ReturnType<Fn>;  // string
```

### Extracting Function Parameters

```typescript
type Parameters<T> = T extends (...args: infer P) => unknown ? P : never;

type Fn = (a: string, b: number) => void;
type Params = Parameters<Fn>;  // [a: string, b: number]
```

### Extracting Array Element Types

```typescript
type ArrayElement<T> = T extends (infer E)[] ? E : never;

type Element = ArrayElement<string[]>;  // string
```

### Extracting Promise Value Types

```typescript
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;

type Result = Awaited<Promise<Promise<string>>>;  // string
```

### Multiple `infer` Positions

```typescript
type First<T> = T extends [infer F, ...unknown[]] ? F : never;
type Last<T> = T extends [...unknown[], infer L] ? L : never;
type Middle<T> = T extends [unknown, ...infer M, unknown] ? M : never;

type Tuple = [1, 2, 3, 4, 5];
type A = First<Tuple>;   // 1
type B = Last<Tuple>;    // 5
type C = Middle<Tuple>;  // [2, 3, 4]
```

---

## Building Custom Utility Types

### Deep Partial

```typescript
type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

interface Config {
  server: {
    host: string;
    port: number;
  };
  debug: boolean;
}

type PartialConfig = DeepPartial<Config>;
// All nested properties are optional
```

### Deep Readonly

```typescript
type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;
```

### Pick by Value Type

```typescript
type PickByType<T, ValueType> = {
  [K in keyof T as T[K] extends ValueType ? K : never]: T[K];
};

interface Example {
  id: number;
  name: string;
  active: boolean;
  count: number;
}

type NumberProps = PickByType<Example, number>;
// { id: number; count: number; }
```

### Paths Type (Dot Notation)

```typescript
type Paths<T, Prefix extends string = ''> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? Paths<T[K], `${Prefix}${K}.`> | `${Prefix}${K}`
        : `${Prefix}${K}`;
    }[keyof T & string]
  : never;

interface Nested {
  user: {
    name: string;
    address: {
      city: string;
    };
  };
}

type AllPaths = Paths<Nested>;
// 'user' | 'user.name' | 'user.address' | 'user.address.city'
```

### Union to Intersection

```typescript
type UnionToIntersection<U> =
  (U extends unknown ? (k: U) => void : never) extends (k: infer I) => void
    ? I
    : never;

type Union = { a: string } | { b: number };
type Intersection = UnionToIntersection<Union>;
// { a: string } & { b: number }
```

---

## Best Practices

### 1. Prefer `unknown` Over `any`

```typescript
// Bad - loses type safety
type BadExtract<T> = T extends any ? T : never;

// Good - maintains type safety
type GoodExtract<T> = T extends unknown ? T : never;
```

### 2. Keep Type Nesting Shallow

Deeply nested conditional types are hard to read and can hit recursion limits.

```typescript
// Bad - deeply nested
type Bad<T> = T extends A
  ? T extends B
    ? T extends C
      ? X
      : Y
    : Z
  : W;

// Good - use intermediate types
type IsA<T> = T extends A ? true : false;
type IsB<T> = T extends B ? true : false;
type IsC<T> = T extends C ? true : false;

type Good<T> = IsA<T> extends true
  ? IsB<T> extends true
    ? IsC<T> extends true ? X : Y
    : Z
  : W;
```

### 3. Be Intentional About Distribution

```typescript
// Distributive (processes each union member separately)
type Distributive<T> = T extends unknown ? T[] : never;

// Non-distributive (processes union as a whole)
type NonDistributive<T> = [T] extends [unknown] ? T[] : never;
```

### 4. Use Constraints to Improve Error Messages

```typescript
// Bad - confusing error
type GetName<T> = T['name'];

// Good - clear constraint
type GetName<T extends { name: unknown }> = T['name'];
```

### 5. Document Complex Types

```typescript
/**
 * Extracts the parameter types of an event handler.
 * @example
 * type Params = EventParams<(e: MouseEvent, data: string) => void>;
 * // [e: MouseEvent, data: string]
 */
type EventParams<T extends (...args: unknown[]) => unknown> =
  T extends (...args: infer P) => unknown ? P : never;
```

### 6. Use Type Aliases for Readability

```typescript
// Bad
type Bad<T> = T extends { data: { items: (infer U)[] } } ? U : never;

// Good
type ExtractItems<T> = T extends { data: { items: unknown[] } }
  ? T['data']['items']
  : never;
type ItemType<T> = ExtractItems<T> extends (infer U)[] ? U : never;
```

---

## Common Pitfalls

### 1. Forgetting About Distribution

```typescript
type IsNever<T> = T extends never ? true : false;

// Unexpected: never distributes to nothing
type A = IsNever<never>;  // never, not true!

// Fix: wrap in tuple
type IsNeverFixed<T> = [T] extends [never] ? true : false;
type B = IsNeverFixed<never>;  // true
```

### 2. Recursion Limits

TypeScript has a recursion depth limit. Avoid deeply recursive types:

```typescript
// May hit recursion limit with deep objects
type DeepKeyOf<T> = T extends object
  ? { [K in keyof T]: K | DeepKeyOf<T[K]> }[keyof T]
  : never;
```

### 3. Index Signature Conflicts

```typescript
interface WithIndex {
  [key: string]: string;
  id: string;  // OK
  count: number;  // Error! Must be string
}
```

### 4. Excess Property Checks Only Apply to Object Literals

```typescript
interface User {
  name: string;
}

const obj = { name: 'Alice', extra: true };
const user: User = obj;  // OK - no excess property check

const user2: User = { name: 'Bob', extra: true };  // Error!
```

### 5. `keyof` Returns String or Number

```typescript
type Keys = keyof { a: 1; 0: 2 };  // 'a' | 0

// Filter to only string keys
type StringKeys<T> = keyof T & string;
```

### 6. Circular Type References

```typescript
// Error: circular reference
type Bad = Bad[];

// OK: wrapped in object
type Good = { children: Good[] };
```

---

## Summary

Type-level programming in TypeScript enables powerful abstractions for type safety. Key techniques include:

- **Conditional types** for type-level branching
- **Mapped types** for systematic property transformation
- **Template literal types** for string manipulation
- **`infer`** for type extraction

Always prefer `unknown` over `any`, keep nesting shallow, and be intentional about distributive behavior. Document complex types and use intermediate type aliases for readability.
