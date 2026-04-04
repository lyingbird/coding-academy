import type { AdapterPlatform, RawEvent } from "@academy/shared";

export interface AdapterMapper<TInput = unknown> {
  platform: AdapterPlatform;
  map(input: TInput): RawEvent[];
}
