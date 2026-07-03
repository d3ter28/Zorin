import { describe, expect, it } from "vitest";
import { isPrivateIp } from "./urlGuard";

describe("isPrivateIp", () => {
  it.each([
    "127.0.0.1", "127.255.255.255",      // loopback
    "10.0.0.1", "10.255.255.255",        // RFC1918
    "172.16.0.1", "172.31.255.255",      // RFC1918
    "192.168.1.1",                       // RFC1918
    "169.254.169.254",                   // link-local / cloud metadata
    "100.64.0.1",                        // CGNAT
    "0.0.0.0",                           // "this" network
    "::1",                               // v6 loopback
    "fc00::1", "fdff::1",                // v6 ULA
    "fe80::1",                           // v6 link-local
    "::ffff:127.0.0.1", "::ffff:10.0.0.1", // v4-mapped v6
    "::ffff:7f00:1",    // hex-form ::ffff:127.0.0.1 — private
    "::ffff:0a00:0001", // hex-form ::ffff:10.0.0.1 — private
    "::",                                // unspecified
  ])("classifies %s as private", (ip) => {
    expect(isPrivateIp(ip)).toBe(true);
  });

  it.each([
    "8.8.8.8", "1.1.1.1", "93.184.216.34", // public v4
    "172.15.255.255", "172.32.0.1",        // just outside 172.16/12
    "2606:4700::1111",                      // public v6
    "::ffff:8.8.8.8",                       // v4-mapped public
    "::ffff:0808:0808", // hex-form ::ffff:8.8.8.8 — public
  ])("classifies %s as public", (ip) => {
    expect(isPrivateIp(ip)).toBe(false);
  });
});
