import { EventEmitter } from "events";

/**
 * Type-safe wrapper around Node.js EventEmitter that provides TypeScript autocomplete and validation.
 *
 * @template T - An object type where keys are event names and values are the expected data types for each event
 *
 * @example
 * ```typescript
 * interface MyEvents {
 *   userLogin: { userId: string; timestamp: number };
 *   userLogout: { userId: string };
 *   error: { message: string; code: number };
 * }
 *
 * const emitter = createTypedEventEmitter<MyEvents>();
 *
 * // ✅ Type-safe - TypeScript knows the data structure
 * emitter.emit('userLogin', { userId: '123', timestamp: Date.now() });
 *
 * // ❌ TypeScript error - wrong data type
 * emitter.emit('userLogin', { wrongField: 'value' });
 *
 * // ❌ TypeScript error - event doesn't exist
 * emitter.emit('nonExistentEvent', {});
 *
 * // ✅ Type-safe listener with autocomplete
 * emitter.on('userLogin', (data) => {
 *   console.log(data.userId); // TypeScript knows this exists
 *   console.log(data.timestamp); // TypeScript knows this exists
 * });
 * ```
 */
export interface TypedEventEmitter<T extends Record<string, any>> {
  /**
   * Register an event listener for a specific event type
   * @param event - The event name (must be a key from T)
   * @param listener - Function that receives the typed data for this event
   */
  on<K extends keyof T>(event: K, listener: (data: T[K]) => void): void;

  /**
   * Remove an event listener for a specific event type
   * @param event - The event name (must be a key from T)
   * @param listener - The exact listener function to remove
   */
  off<K extends keyof T>(event: K, listener: (data: T[K]) => void): void;

  /**
   * Emit an event with typed data
   * @param event - The event name (must be a key from T)
   * @param data - The data payload (must match the type defined in T for this event)
   */
  emit<K extends keyof T>(event: K, data: T[K]): void;
}

/**
 * Creates a type-safe event emitter that wraps Node.js EventEmitter with TypeScript type checking.
 * This ensures you can only emit events that are defined in your event interface, and that
 * the data you emit matches the expected structure.
 *
 * @template T - An object type defining the event names and their data structures
 * @returns A typed event emitter with type-safe on/off/emit methods
 *
 * @example
 * ```typescript
 * interface BatchEvents {
 *   started: { count: number };
 *   completed: { results: string[] };
 *   failed: { error: string };
 * }
 *
 * const events = createTypedEventEmitter<BatchEvents>();
 *
 * // All of these are type-checked at compile time
 * events.emit('started', { count: 5 });
 * events.on('completed', (data) => console.log(data.results));
 * events.off('failed', errorHandler);
 * ```
 */
export function createTypedEventEmitter<
  T extends Record<string, any>
>(): TypedEventEmitter<T> {
  const emitter = new EventEmitter();

  return {
    on: <K extends keyof T>(event: K, listener: (data: T[K]) => void) => {
      emitter.on(event as string, listener);
    },
    off: <K extends keyof T>(event: K, listener: (data: T[K]) => void) => {
      emitter.off(event as string, listener);
    },
    emit: <K extends keyof T>(event: K, data: T[K]) => {
      emitter.emit(event as string, data);
    },
  };
}
