import net from "node:net";

export function isBlockedHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");

  return normalized === "localhost" || normalized === "0.0.0.0" || normalized === "::1";
}

export function isBlockedIpAddress(address: string) {
  if (net.isIPv4(address)) {
    return isBlockedIpv4(address);
  }

  if (net.isIPv6(address)) {
    return isBlockedIpv6(address);
  }

  return true;
}

function isBlockedIpv4(address: string) {
  const parts = address.split(".").map((part) => Number(part));

  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }

  const [first, second] = parts;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254)
  );
}

function isBlockedIpv6(address: string) {
  const normalized = address.toLowerCase();

  if (normalized === "::1" || normalized === "::") {
    return true;
  }

  if (normalized.startsWith("::ffff:")) {
    return isBlockedIpv4(normalized.replace("::ffff:", ""));
  }

  const firstSegment = Number.parseInt(normalized.split(":")[0] || "0", 16);

  if (!Number.isFinite(firstSegment)) {
    return true;
  }

  return (firstSegment & 0xfe00) === 0xfc00 || (firstSegment & 0xffc0) === 0xfe80;
}
