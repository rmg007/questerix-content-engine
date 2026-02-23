/**
 * Mock for cloudflare:email — only used in tests.
 * The real EmailMessage is provided by the Cloudflare Workers runtime.
 */
export class EmailMessage {
  from: string;
  to: string;
  raw: string;

  constructor(from: string, to: string, raw: string) {
    this.from = from;
    this.to = to;
    this.raw = raw;
  }
}
