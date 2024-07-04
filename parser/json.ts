/**
 * Listen parsers for ListenBrainz JSON and JSONL formats.
 *
 * @module
 */

import { type InsertedListen, isListen, type Listen } from "../listen.ts";
import { TextLineStream } from "@std/streams/text-line-stream";

/**
 * Parses a readable text stream from a JSONL file into listens.
 *
 * Each line has to contain a serialized listen object.
 */
export async function* parseJsonLines(
  input: ReadableStream<string>,
): AsyncGenerator<Listen | InsertedListen> {
  const lineStream = input.pipeThrough(new TextLineStream());

  let lineNumber = 0;
  for await (const line of lineStream) {
    lineNumber++;
    const json = JSON.parse(line);

    if (isListen(json)) {
      yield json;
    } else {
      throw new TypeError(`Line ${lineNumber} contains no listen`);
    }
  }
}

/**
 * Parses a JSON string into one or multiple listens.
 *
 * Accepts a serialized listen object or an array of listen objects as input.
 */
export function* parseJson(input: string): Generator<Listen | InsertedListen> {
  const json = JSON.parse(input);

  if (isListen(json)) {
    yield json;
  } else if (Array.isArray(json)) {
    let index = 0;
    for (const item of json) {
      if (isListen(item)) {
        yield item;
      } else {
        throw new TypeError(`Item at index ${index} is no listen`);
      }
      index++;
    }
  } else {
    throw new TypeError("JSON contains no listens");
  }
}
