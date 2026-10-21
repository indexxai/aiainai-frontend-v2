import { describe, expect, it } from 'vitest';
import { readSse } from './sse';

const stream = (chunks: string[]) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      for (const ch of chunks) c.enqueue(new TextEncoder().encode(ch));
      c.close();
    },
  });

describe('readSse', () => {
  it('parses events split across chunks and skips heartbeats', async () => {
    const out = [];
    for await (const m of readSse(
      stream([
        'event: ready\nda',
        'ta: {"a":1}\n\n: ping\n\n',
        'event: delta\ndata: {"text":"Hi"}\n\nevent: done\ndata: {}\n\n',
      ]),
    ))
      out.push(m);
    expect(out).toEqual([
      { event: 'ready', data: '{"a":1}' },
      { event: 'delta', data: '{"text":"Hi"}' },
      { event: 'done', data: '{}' },
    ]);
  });

  it('handles CRLF line endings and a final block without a blank line', async () => {
    const out = [];
    for await (const m of readSse(stream(['event: a\r\ndata: 1\r\n\r\nevent: b\r\ndata: 2']))) out.push(m);
    expect(out).toEqual([
      { event: 'a', data: '1' },
      { event: 'b', data: '2' },
    ]);
  });
});
