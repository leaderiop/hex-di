---
title: Patterns
description: Best practices and common patterns for project structure, graph composition, scoped services, and resource cleanup in HexDI.
sidebar_position: 3
---

# Patterns

Best practices and common patterns for using HexDI effectively.

## Available Patterns

### [Project Structure](./project-structure.md)

How to organize your HexDI code:
- Recommended directory structure
- File organization patterns
- Module boundaries
- Monorepo patterns

### [Composing Graphs](./composing-graphs.md)

Advanced graph composition techniques:
- Base graphs for shared infrastructure
- Feature module patterns
- Environment-specific graphs
- Graph branching

### [Scoped Services](./scoped-services.md)

Patterns for request-scoped and user-scoped services:
- HTTP request contexts
- User sessions
- Multi-tenancy
- Scope isolation

### [Finalizers and Cleanup](./finalizers-and-cleanup.md)

Resource cleanup patterns:
- Database connections
- File handles
- Event listeners
- Graceful shutdown

## Quick Reference

| Pattern | Use When |
|---------|----------|
| Feature modules | App has distinct feature areas |
| Base graphs | Sharing infrastructure between apps |
| Environment graphs | Different adapters for dev/prod |
| Request scopes | Web servers, API handlers |
| User scopes | Multi-user applications |
| Finalizers | Managing external resources |
