// Global test setup
import { jest } from '@jest/globals';
// Set longer timeout for integration tests
jest.setTimeout(30000);
// Global test utilities
global.beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
});
// Suppress console logs during tests unless explicitly needed
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
beforeAll(() => {
    // Override console methods to reduce noise during tests
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
});
afterAll(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
});
// Export test utilities
export const restoreConsole = () => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
};
export const silenceConsole = () => {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
};
//# sourceMappingURL=setup.js.map