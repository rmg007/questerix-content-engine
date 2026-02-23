import { describe, expect, it } from 'vitest';
import { corsPreflightResponse, errorResponse, getCorsHeaders, jsonResponse } from './http';

function makeRequest(origin?: string): Request {
  const headers = new Headers();
  if (origin) headers.set('Origin', origin);
  return new Request('https://example.com/test', { headers });
}

describe('getCorsHeaders', () => {
  it('returns matching origin for allowed origins', () => {
    const headers = getCorsHeaders(makeRequest('http://localhost:3000'));
    expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
  });

  it('returns matching origin for production domain', () => {
    const headers = getCorsHeaders(makeRequest('https://admin.questerix.com'));
    expect(headers['Access-Control-Allow-Origin']).toBe('https://admin.questerix.com');
  });

  it('falls back to first allowed origin for unknown origins', () => {
    const headers = getCorsHeaders(makeRequest('https://evil.com'));
    expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
  });

  it('falls back when no Origin header', () => {
    const headers = getCorsHeaders(makeRequest());
    expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
  });

  it('includes required CORS headers', () => {
    const headers = getCorsHeaders(makeRequest());
    expect(headers['Access-Control-Allow-Methods']).toContain('POST');
    expect(headers['Access-Control-Allow-Headers']).toContain('authorization');
    expect(headers['Access-Control-Allow-Headers']).toContain('x-webhook-secret');
  });
});

describe('corsPreflightResponse', () => {
  it('returns 204 with CORS headers', () => {
    const response = corsPreflightResponse(makeRequest('http://localhost:3000'));
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
  });
});

describe('jsonResponse', () => {
  it('returns JSON body with correct status', async () => {
    const response = jsonResponse({ foo: 'bar' }, 200, makeRequest());
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    const body = await response.json();
    expect(body).toEqual({ foo: 'bar' });
  });

  it('includes CORS headers', () => {
    const response = jsonResponse({}, 200, makeRequest('https://app.questerix.com'));
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://app.questerix.com');
  });

  it('supports extra headers', () => {
    const response = jsonResponse({}, 200, makeRequest(), { 'X-Custom': 'test' });
    expect(response.headers.get('X-Custom')).toBe('test');
  });
});

describe('errorResponse', () => {
  it('returns error JSON with correct status', async () => {
    const response = errorResponse('Not found', 404, makeRequest());
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ error: 'Not found' });
  });
});
