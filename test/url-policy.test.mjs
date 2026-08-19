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
      /private, local, reserved/
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
