import { describe, expect, it } from "vitest";
import { ACCENTS, resolveAccent, resolveTheme } from "@/lib/theme";

describe("resolveTheme", () => {
  it("honors an explicit stored choice regardless of the system", () => {
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
  });

  it("falls back to the system preference when nothing is stored", () => {
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme(null, false)).toBe("light");
  });

  it("treats unknown stored values as unset", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("", false)).toBe("light");
    expect(resolveTheme(undefined, true)).toBe("dark");
  });
});

describe("resolveAccent", () => {
  it("keeps every known accent", () => {
    for (const { value } of ACCENTS) expect(resolveAccent(value)).toBe(value);
  });

  it("falls back to blue for missing or unknown values", () => {
    expect(resolveAccent(null)).toBe("blue");
    expect(resolveAccent("magenta")).toBe("blue");
  });
});
