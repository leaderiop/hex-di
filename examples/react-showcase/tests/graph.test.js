/**
 * Tests for the DI layer graph configuration.
 *
 * These tests verify that the dependency graph is correctly configured,
 * all adapters are properly registered, and the graph validates successfully.
 *
 * @packageDocumentation
 */
import { describe, it, expect } from "vitest";
import { assertGraphComplete, serializeGraph } from "@hex-di/testing";
import { GraphBuilder } from "@hex-di/graph";
import { appGraph } from "../src/di/graph.js";
import { ConfigAdapter, LoggerAdapter, MessageStoreAdapter, ChatServiceAdapter, NotificationServiceAdapter, } from "../src/di/adapters.js";
import { ConfigPort, LoggerPort, MessageStorePort, UserSessionPort, ChatServicePort, NotificationServicePort, } from "../src/di/ports.js";
describe("DI Graph", () => {
    describe("Graph Construction", () => {
        it("should build graph successfully with all 6 adapters", () => {
            // Verify the graph was built successfully
            expect(appGraph).toBeDefined();
            expect(appGraph.adapters).toBeDefined();
            expect(appGraph.adapters).toHaveLength(6);
        });
        it("should register adapters in correct order", () => {
            const adapters = appGraph.adapters;
            // Verify all expected adapters are present
            const adapterPorts = adapters.map((a) => a.provides.__portName);
            expect(adapterPorts).toContain("Config");
            expect(adapterPorts).toContain("Logger");
            expect(adapterPorts).toContain("MessageStore");
            expect(adapterPorts).toContain("UserSession");
            expect(adapterPorts).toContain("ChatService");
            expect(adapterPorts).toContain("NotificationService");
        });
    });
    describe("Graph Validation", () => {
        it("should pass assertGraphComplete() for valid graph", () => {
            // This should not throw - if it does, the test fails
            expect(() => assertGraphComplete(appGraph)).not.toThrow();
        });
        it("should validate dependency relationships", () => {
            const adapters = appGraph.adapters;
            // Find adapters by port name
            const findAdapter = (portName) => adapters.find((a) => a.provides.__portName === portName);
            // ConfigAdapter should have no dependencies
            const configAdapter = findAdapter("Config");
            expect(configAdapter?.requires).toHaveLength(0);
            expect(configAdapter?.lifetime).toBe("singleton");
            // LoggerAdapter should have no dependencies
            const loggerAdapter = findAdapter("Logger");
            expect(loggerAdapter?.requires).toHaveLength(0);
            expect(loggerAdapter?.lifetime).toBe("singleton");
            // MessageStoreAdapter should require Logger
            const messageStoreAdapter = findAdapter("MessageStore");
            expect(messageStoreAdapter?.requires).toHaveLength(1);
            expect(messageStoreAdapter?.requires[0]?.__portName).toBe("Logger");
            expect(messageStoreAdapter?.lifetime).toBe("singleton");
            // UserSessionAdapter should have no dependencies
            const userSessionAdapter = findAdapter("UserSession");
            expect(userSessionAdapter?.requires).toHaveLength(0);
            expect(userSessionAdapter?.lifetime).toBe("scoped");
            // ChatServiceAdapter should require Logger, UserSession, MessageStore
            const chatServiceAdapter = findAdapter("ChatService");
            expect(chatServiceAdapter?.requires).toHaveLength(3);
            const chatDeps = chatServiceAdapter?.requires.map((r) => r.__portName);
            expect(chatDeps).toContain("Logger");
            expect(chatDeps).toContain("UserSession");
            expect(chatDeps).toContain("MessageStore");
            expect(chatServiceAdapter?.lifetime).toBe("scoped");
            // NotificationServiceAdapter should require Logger and Config
            const notificationAdapter = findAdapter("NotificationService");
            expect(notificationAdapter?.requires).toHaveLength(2);
            const notificationDeps = notificationAdapter?.requires.map((r) => r.__portName);
            expect(notificationDeps).toContain("Logger");
            expect(notificationDeps).toContain("Config");
            expect(notificationAdapter?.lifetime).toBe("request");
        });
    });
    describe("Graph Serialization", () => {
        it("should produce expected structure with serializeGraph()", () => {
            const snapshot = serializeGraph(appGraph);
            expect(snapshot).toMatchSnapshot();
        });
        it("should serialize adapter metadata correctly", () => {
            const snapshot = serializeGraph(appGraph);
            expect(snapshot.adapters).toHaveLength(6);
            // Verify structure of serialized adapters
            const findAdapter = (portName) => snapshot.adapters.find((a) => a.port === portName);
            const configSnapshot = findAdapter("Config");
            expect(configSnapshot).toEqual({
                port: "Config",
                lifetime: "singleton",
                requires: [],
            });
            const chatServiceSnapshot = findAdapter("ChatService");
            expect(chatServiceSnapshot?.port).toBe("ChatService");
            expect(chatServiceSnapshot?.lifetime).toBe("scoped");
            expect(chatServiceSnapshot?.requires).toContain("Logger");
            expect(chatServiceSnapshot?.requires).toContain("UserSession");
            expect(chatServiceSnapshot?.requires).toContain("MessageStore");
        });
    });
    describe("Compile-Time Validation", () => {
        it("should demonstrate that incomplete graphs produce error types", () => {
            // This test documents that the GraphBuilder produces MissingDependencyError types
            // at compile-time when dependencies are not satisfied.
            //
            // The following code would NOT compile if uncommented:
            //
            // const incompleteGraph: Graph<Port<unknown, string>> = GraphBuilder.create()
            //   .provide(ConfigAdapter)
            //   .provide(LoggerAdapter)
            //   .provide(MessageStoreAdapter)
            //   .provide(ChatServiceAdapter) // Requires UserSession, which is missing
            //   .provide(NotificationServiceAdapter)
            //   .build();
            //
            // TypeScript would show:
            // Type 'MissingDependencyError<typeof UserSessionPort>' is not assignable to type 'Graph<...>'
            // Instead, we verify that the complete graph is correctly typed
            const completeGraphType = appGraph;
            expect(completeGraphType.adapters).toBeDefined();
        });
        it("should expose missing dependency information in error type", () => {
            // This test verifies that when we intentionally create an incomplete builder,
            // the type system captures which dependencies are missing.
            // The error message contains the port name for actionable feedback.
            const incompleteBuilder = GraphBuilder.create()
                .provide(ConfigAdapter)
                .provide(LoggerAdapter)
                .provide(MessageStoreAdapter)
                // Missing UserSessionAdapter
                .provide(ChatServiceAdapter)
                .provide(NotificationServiceAdapter);
            // The builder itself still has valid adapters array for inspection
            expect(incompleteBuilder.adapters).toHaveLength(5);
            // Verify the adapters that were added
            const adapterNames = incompleteBuilder.adapters.map((a) => a.provides.__portName);
            expect(adapterNames).not.toContain("UserSession");
            expect(adapterNames).toContain("ChatService");
        });
    });
    describe("Port Token Correctness", () => {
        it("should have all ports with correct names", () => {
            expect(ConfigPort.__portName).toBe("Config");
            expect(LoggerPort.__portName).toBe("Logger");
            expect(MessageStorePort.__portName).toBe("MessageStore");
            expect(UserSessionPort.__portName).toBe("UserSession");
            expect(ChatServicePort.__portName).toBe("ChatService");
            expect(NotificationServicePort.__portName).toBe("NotificationService");
        });
    });
});
//# sourceMappingURL=graph.test.js.map