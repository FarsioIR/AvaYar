import test from "node:test";
import assert from "node:assert/strict";
import {
  isPublicIpAddress,
  parsePublicHttpsUrl,
  resolvePublicHttpsTarget
} from "../server/extraction/url-policy.mjs";
import {
  createPinnedLookup
} from "../server/extraction/fetch-public-html.mjs";

test(
  "public IP classifier blocks local and private ranges",
  () => {
    assert.equal(
      isPublicIpAddress("127.0.0.1"),
      false
    );

    assert.equal(
      isPublicIpAddress("10.10.10.10"),
      false
    );

    assert.equal(
      isPublicIpAddress("192.168.1.2"),
      false
    );

    assert.equal(
      isPublicIpAddress("169.254.169.254"),
      false
    );

    assert.equal(
      isPublicIpAddress("8.8.8.8"),
      true
    );
  }
);

test(
  "IPv6 policy blocks mapped, compatible, translation, and special-use ranges",
  () => {
    const blocked = [
      "::1",
      "::ffff:192.168.1.2",
      "::ffff:c0a8:102",
      "0:0:0:0:0:ffff:c0a8:102",
      "::c0a8:102",
      "64:ff9b::c0a8:101",
      "64:ff9b:1::c0a8:101",
      "100::1",
      "100:0:0:1::1",
      "2001::1",
      "2001:2::1",
      "2001:10::1",
      "2001:db8::1",
      "2002:c0a8:101::",
      "3fff::1",
      "5f00::1",
      "fc00::1",
      "fd00::1",
      "fe80::1",
      "fec0::1",
      "ff02::1"
    ];

    for (const address of blocked) {
      assert.equal(
        isPublicIpAddress(address),
        false,
        `${address} must be blocked`
      );
    }

    assert.equal(
      isPublicIpAddress(
        "2606:4700:4700::1111"
      ),
      true
    );
  }
);

test(
  "URL policy rejects IPv4-mapped IPv6 literals before request",
  async () => {
    await assert.rejects(
      () =>
        resolvePublicHttpsTarget(
          "https://[::ffff:c0a8:101]/"
        ),
      /private, local, reserved/i
    );
  }
);

test(
  "URL policy accepts public HTTPS shape only",
  () => {
    assert.equal(
      parsePublicHttpsUrl(
        "https://example.com/article"
      ).hostname,
      "example.com"
    );

    assert.throws(
      () =>
        parsePublicHttpsUrl(
          "http://example.com/"
        ),
      /HTTPS URLs only/
    );

    assert.throws(
      () =>
        parsePublicHttpsUrl(
          "https://localhost/"
        ),
      /Localhost/
    );

    assert.throws(
      () =>
        parsePublicHttpsUrl(
          "https://user:pass@example.com/"
        ),
      /embedded credentials/
    );
  }
);

test(
  "DNS policy rejects hostnames with any private resolution",
  async () => {
    await assert.rejects(
      () =>
        resolvePublicHttpsTarget(
          "https://example.com/",
          {
            lookup: async () => [
              {
                address: "93.184.216.34",
                family: 4
              },
              {
                address: "127.0.0.1",
                family: 4
              }
            ]
          }
        ),
      /private, local, reserved/i
    );
  }
);

test(
  "DNS policy rejects hostnames with mapped-private IPv6 resolution",
  async () => {
    await assert.rejects(
      () =>
        resolvePublicHttpsTarget(
          "https://example.com/",
          {
            lookup: async () => [
              {
                address:
                  "::ffff:c0a8:101",
                family: 6
              }
            ]
          }
        ),
      /private, local, reserved/i
    );
  }
);

test(
  "DNS policy pins a verified public address",
  async () => {
    const target =
      await resolvePublicHttpsTarget(
        "https://example.com/",
        {
          lookup: async () => [
            {
              address: "93.184.216.34",
              family: 4
            }
          ]
        }
      );

    assert.equal(
      target.address,
      "93.184.216.34"
    );

    assert.equal(
      target.family,
      4
    );
  }
);

test(
  "pinned lookup supports the single-address callback contract",
  async () => {
    const lookup =
      createPinnedLookup({
        address: "93.184.216.34",
        family: 4
      });

    const result =
      await new Promise(
        (resolve, reject) => {
          lookup(
            "example.com",
            { all: false },
            (error, address, family) => {
              if (error) {
                reject(error);
                return;
              }

              resolve({
                address,
                family
              });
            }
          );
        }
      );

    assert.deepEqual(
      result,
      {
        address: "93.184.216.34",
        family: 4
      }
    );
  }
);

test(
  "pinned lookup supports Node all:true callback contract",
  async () => {
    const lookup =
      createPinnedLookup({
        address: "93.184.216.34",
        family: 4
      });

    const addresses =
      await new Promise(
        (resolve, reject) => {
          lookup(
            "example.com",
            { all: true },
            (error, values) => {
              if (error) {
                reject(error);
                return;
              }

              resolve(values);
            }
          );
        }
      );

    assert.deepEqual(
      addresses,
      [
        {
          address: "93.184.216.34",
          family: 4
        }
      ]
    );
  }
);
