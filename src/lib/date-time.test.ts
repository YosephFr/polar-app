import { describe, expect, it } from "vitest";
import { polarDateKey, polarTimeZone } from "./date-time";

describe("Polar date and time", () => {
  it("uses the monitored person's default time zone", () => {
    expect(polarTimeZone).toBe("America/Santiago");
  });

  it("groups records by the Polar calendar day", () => {
    expect(polarDateKey("2026-01-01T02:30:00.000Z")).toBe("2025-12-31");
  });
});
