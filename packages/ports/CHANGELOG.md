# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-12-13

### Added

- **Port Type** - Branded type `Port<T, TName>` for nominal typing of service interfaces
  - Phantom type parameter `T` carries service interface at compile time
  - Literal string type parameter `TName` for unique port identification
  - Internal brand symbol ensures nominal typing (ports with different names are type-incompatible)
  - Zero runtime overhead - brand exists only at type level

- **createPort Function** - Factory function for creating typed port tokens
  - Signature: `createPort<const TName, TService>(name: TName): Port<TService, TName>`
  - Uses TypeScript 5.0+ `const` type parameter for automatic literal type preservation
  - Returns frozen, immutable port object
  - Minimal runtime footprint (only `__portName` property)

- **Type Utilities**
  - `InferService<P>` - Extracts service interface type from a Port type
  - `InferPortName<P>` - Extracts port name literal type from a Port type
  - Both utilities return `never` for non-Port types

- **Package Infrastructure**
  - Zero runtime dependencies
  - ESM and CommonJS dual-package support
  - TypeScript declaration files with source maps
  - Comprehensive JSDoc documentation with examples
  - Full test coverage (unit tests and type tests)

### Technical Details

- Requires TypeScript 5.0+ for `const` type parameter modifier
- Requires Node.js 18.0+
- Uses `unique symbol` for brand to guarantee nominal typing
- Port objects are frozen via `Object.freeze()` for immutability
