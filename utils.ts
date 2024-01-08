import { assert } from "https://deno.land/std@0.210.0/assert/assert.ts";

/** Splits the given asynchronous iterable into chunks of the given size. */
export async function* chunk<T>(
  input: AsyncIterable<T>,
  size: number,
): AsyncGenerator<T[]> {
  assert(
    Number.isInteger(size) && size >= 1,
    `Expected size to be an integer greater than 0 but found ${size}`,
  );

  let buffer = [];
  for await (const element of input) {
    if (buffer.push(element) === size) {
      yield buffer;
      buffer = [];
    }
  }

  if (buffer.length) {
    yield buffer;
  }
}
