import { describe, expect, test } from "bun:test";
import { releaseDistTag } from "../scripts/release-dist-tag.js";

describe("releaseDistTag", () => {
  test("stable versions, including build metadata, update latest", () => {
    expect(releaseDistTag("1.2.3")).toBe("latest");
    expect(releaseDistTag("1.2.3+build-5")).toBe("latest");
  });

  test("named prerelease channels keep their established tags", () => {
    expect(releaseDistTag("1.3.0-beta.1")).toBe("beta");
    expect(releaseDistTag("2.0.0-rc.2+build-5")).toBe("rc");
  });

  test("prerelease channels that parse as ranges get a safe prefix", () => {
    expect(releaseDistTag("1.3.0-1")).toBe("prerelease-1");
    expect(releaseDistTag("1.3.0-x.1")).toBe("prerelease-x");
  });

  test("a prerelease channel cannot implicitly promote itself to latest", () => {
    expect(releaseDistTag("1.3.0-latest")).toBe("prerelease-latest");
  });

  test("a valid manual override wins", () => {
    expect(releaseDistTag("1.3.0-1", "next")).toBe("next");
    expect(releaseDistTag("1.3.0-beta.1", "preview-1")).toBe("preview-1");
  });

  test("manual overrides npm would reject fail before publishing", () => {
    for (const tag of ["1", "v1.4", "*", "bad tag", "beta/one", "beta\nnext"]) {
      expect(() => releaseDistTag("1.2.3", tag)).toThrow(
        `Invalid npm dist-tag "${tag}"`,
      );
    }
  });

  test("invalid package versions are rejected", () => {
    expect(() => releaseDistTag("1.2.3-01")).toThrow(
      "Invalid semantic version",
    );
  });
});
