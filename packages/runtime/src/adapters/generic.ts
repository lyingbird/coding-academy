import type { RawEvent } from "@academy/shared";

export interface GenericCliInput {
  events?: RawEvent[];
}

export function mapGenericInputToRawEvents(input: GenericCliInput): RawEvent[] {
  return Array.isArray(input.events) ? input.events : [];
}
