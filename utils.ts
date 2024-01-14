import { type Listen } from "./listen.ts";
import { parseJson, parseJsonLines } from "./parser/json.ts";
import { assert } from "https://deno.land/std@0.210.0/assert/assert.ts";
import { extname } from "https://deno.land/std@0.210.0/path/extname.ts";

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

/** Logger which writes JSON messages into a JSONL file. */
export class JsonLogger {
  #encoder: TextEncoder;
  #output: WritableStreamDefaultWriter<Uint8Array> | undefined;

  /**
   * @param path Path to the output file. Content will be appended if it exists.
   */
  constructor(readonly path: string | URL) {
    this.#encoder = new TextEncoder();
  }

  /** Opens the output file. Logger is a no-op without calling this. */
  async open() {
    const outputFile = await Deno.open(this.path, {
      create: true,
      append: true,
    });
    this.#output = outputFile.writable.getWriter();
    await this.#output.ready;
  }

  /** Writes a line of stringified JSON into the output file. */
  async log(json: any) {
    const line = JSON.stringify(json) + "\n";
    await this.#output?.write(this.#encoder.encode(line));
  }

  /** Closes the output file. */
  async close() {
    await this.#output?.close();
  }
}

/** Reads listens from a JSON or JSONL file at the given path. */
export async function* readListensFile(path: string): AsyncGenerator<Listen> {
  const extension = extname(path);
  if (extension === ".jsonl") {
    const inputFile = await Deno.open(path);
    const input = inputFile.readable.pipeThrough(new TextDecoderStream());

    for await (const listen of parseJsonLines(input)) {
      yield listen;
    }
  } else if (extension === ".json") {
    const input = await Deno.readTextFile(path);

    for (const listen of parseJson(input)) {
      yield listen;
    }
  }
}
