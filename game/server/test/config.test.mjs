import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEVELOPMENT_EVENT_CLIENT_SECRET,
  eventConfigContents,
  loadConfig,
} from "../dist/app/config.mjs";

test("uses matching local event-ingestion defaults", () => {
  const config = loadConfig({}, []);

  assert.equal(config.masterBaseUrl, "http://localhost:8080/");
  assert.equal(config.eventIngestionUrl, "http://localhost:8080/api/events");
  assert.equal(config.eventClientSecret, DEVELOPMENT_EVENT_CLIENT_SECRET);
});

test("allows event ingestion URL and secret overrides", () => {
  const secret = "production-secret-0123456789abcdef";
  const config = loadConfig({
    Q3JS_MASTER_URL: "https://master.example.com/root",
    Q3JS_EVENT_URL: "https://events.example.com/v1/q3",
    Q3JS_EVENT_CLIENT_SECRET: secret,
  }, []);

  assert.equal(config.masterBaseUrl, "https://master.example.com/root");
  assert.equal(config.eventIngestionUrl, "https://events.example.com/v1/q3");
  assert.equal(config.eventClientSecret, secret);
});

test("rejects weak event client secrets", () => {
  assert.throws(
    () => loadConfig({ Q3JS_EVENT_CLIENT_SECRET: "too-short" }, []),
    /32 to 512 URL-safe characters/,
  );
});

test("requires an explicit event secret for remote ingestion endpoints", () => {
  assert.throws(
    () => loadConfig({ Q3JS_MASTER_URL: "https://master.example.com" }, []),
    /required when Q3JS_EVENT_URL is not local/,
  );
  assert.throws(
    () => loadConfig({ Q3JS_EVENT_URL: "https://events.example.com/api/events" }, []),
    /required when Q3JS_EVENT_URL is not local/,
  );
});

test("writes the ioq3 event endpoint and secret cvars", () => {
  assert.equal(eventConfigContents({
    eventIngestionUrl: "https://master.example.com/api/events",
    eventClientSecret: "production-secret-0123456789abcdef",
  }), [
    "set sv_killpost_url \"https://master.example.com/api/events\"",
    "set sv_killpost_client_secret \"production-secret-0123456789abcdef\"",
    "",
  ].join("\n"));
});
