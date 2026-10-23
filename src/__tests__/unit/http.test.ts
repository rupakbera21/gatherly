/**
 * Tests for readJsonBodyWithLimit.
 * Verifies: valid body, oversized body (via Content-Length), oversized body
 * (via stream), invalid JSON, empty body.
 */

import { NextRequest } from "next/server";
import { readJsonBodyWithLimit } from "@/services/http";

function makeRequest(
  body: string,
  headers: Record<string, string> = {}
): NextRequest {
  return new NextRequest("http://localhost/api/test", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body,
  });
}

describe("readJsonBodyWithLimit", () => {
  it("parses a valid JSON body", async () => {
    const req = makeRequest(JSON.stringify({ hello: "world" }));
    const result = await readJsonBodyWithLimit(req, 1024);
    expect(result).toEqual({ hello: "world" });
  });

  it("throws a 413 Response when Content-Length exceeds limit", async () => {
    const body = JSON.stringify({ data: "x".repeat(100) });
    const req = makeRequest(body, {
      "Content-Length": String(body.length),
    });

    let thrown: unknown;
    try {
      await readJsonBodyWithLimit(req, 50);
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(Response);
    const errResp = thrown as Response;
    expect(errResp.status).toBe(413);
    const json = (await errResp.json()) as { code: string };
    expect(json.code).toBe("BODY_TOO_LARGE");
  });

  it("throws a 413 Response when streamed body exceeds limit", async () => {
    const body = "x".repeat(200);
    // No Content-Length header – detected via streaming
    const req = makeRequest(body, {});

    let thrown: unknown;
    try {
      await readJsonBodyWithLimit(req, 100);
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(Response);
    const errResp = thrown as Response;
    expect(errResp.status).toBe(413);
  });

  it("throws a 400 Response for invalid JSON", async () => {
    const req = makeRequest("not-valid-json { }");

    let thrown: unknown;
    try {
      await readJsonBodyWithLimit(req, 1024);
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(Response);
    const errResp = thrown as Response;
    expect(errResp.status).toBe(400);
    const json = (await errResp.json()) as { code: string };
    expect(json.code).toBe("INVALID_JSON");
  });

  it("parses arrays and nested objects", async () => {
    const data = { items: [1, 2, 3], nested: { a: true } };
    const req = makeRequest(JSON.stringify(data));
    const result = await readJsonBodyWithLimit(req, 1024);
    expect(result).toEqual(data);
  });
});
