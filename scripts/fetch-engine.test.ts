import { describe, expect, test } from "bun:test";
import { verifyAsset } from "./fetch-engine";

describe("verifyAsset", () => {
  test("accepts the pinned digest", () => {
    expect(() => verifyAsset("abc", "abc")).not.toThrow();
  });

  test("rejects a mutated release", () => {
    expect(() => verifyAsset("def", "abc")).toThrow("does not match its pinned hash");
  });

  test("only warns while bootstrapping an unpinned version", () => {
    expect(() => verifyAsset("abc", undefined)).not.toThrow();
  });
});
