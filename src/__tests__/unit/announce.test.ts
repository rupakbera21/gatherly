/**
 * @jest-environment jsdom
 * @module announce.test
 * @purpose Unit test for accessible screen-reader announce utility.
 */

import { announce } from "@/services/announce";

describe("announce utility", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="announcer" aria-live="polite"></div>';
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("updates #announcer text content after timeout", () => {
    announce("Generation started");
    expect(document.getElementById("announcer")?.textContent).toBe("");

    jest.advanceTimersByTime(60);
    expect(document.getElementById("announcer")?.textContent).toBe("Generation started");
  });

  it("handles missing announcer element gracefully without throwing", () => {
    document.body.innerHTML = "";
    expect(() => announce("Testing fallback")).not.toThrow();
  });
});
