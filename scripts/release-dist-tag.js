import semver from "semver";

function validDistTag(tag) {
  return (
    tag.length > 0 &&
    encodeURIComponent(tag) === tag &&
    semver.validRange(tag, true) === null
  );
}

export function releaseDistTag(version, override = "") {
  const parsed = semver.parse(version);
  if (!parsed) throw new Error(`Invalid semantic version "${version}"`);

  if (override) {
    if (!validDistTag(override)) {
      throw new Error(`Invalid npm dist-tag "${override}"`);
    }
    return override;
  }

  if (parsed.prerelease.length === 0) return "latest";
  const channel = String(parsed.prerelease[0]);
  return channel === "latest" || !validDistTag(channel)
    ? `prerelease-${channel}`
    : channel;
}

if (import.meta.main) {
  try {
    process.stdout.write(`${releaseDistTag(process.argv[2], process.argv[3])}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
