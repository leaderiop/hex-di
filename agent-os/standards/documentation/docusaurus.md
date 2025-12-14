# Docusaurus Documentation Standards for HexDI

## Site Structure

### Main Sections
- **Getting Started**: Quick start, installation, basic usage
- **Concepts**: Core concepts (ports, adapters, graph, container)
- **Guides**: Step-by-step tutorials for common scenarios
- **API Reference**: Generated API documentation
- **Architecture**: Design decisions, patterns, philosophy

### Navigation
- Logical progression from simple to advanced
- Cross-links between related concepts
- Sidebar reflects learning path

## Content Guidelines

### Writing Style
- Clear, concise prose
- Active voice preferred
- Address reader directly ("you can...")
- Avoid jargon without explanation

### Code Examples (in docs, not in profile)
- Every concept has working example
- Examples are copy-paste ready
- Show both simple and realistic cases
- Highlight important lines

### Versioning
- Docs versioned with library
- Breaking changes documented in migration guides
- Maintain docs for supported versions

## API Documentation

### Generation
- Use TypeDoc or api-extractor
- Generate from TSDoc comments
- Integrate with Docusaurus

### TSDoc Standards
- All public APIs documented
- `@param` for parameters
- `@returns` for return values
- `@example` for usage examples
- `@throws` for error conditions

## Tutorials

### Structure
- Clear learning objective
- Prerequisites stated upfront
- Step-by-step instructions
- Complete working result

### Progressive Complexity
1. Basic port and adapter
2. Multiple dependencies
3. Lifetime management
4. Testing strategies
5. Advanced patterns

## Search & Discovery
- Algolia DocSearch integration
- Good SEO meta tags
- Clear page titles
- Searchable code blocks

## Maintenance
- Review docs with each release
- Test all code examples in CI
- User feedback integration
- Regular content audits
