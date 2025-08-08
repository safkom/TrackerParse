import { test } from "node:test";
import assert from "node:assert";
import { ImprovedParser } from "./improvedParser";

test("extracts document id from google sheets url", () => {
  const url = "https://docs.google.com/spreadsheets/d/12345abc/edit#gid=0";
  assert.strictEqual(ImprovedParser.getDocumentId(url), "12345abc");
});

test("parses era names and alternate titles", () => {
  const input = "My Era (Alt1) [Alt2]";
  const { mainName, alternateNames } = ImprovedParser.cleanEraName(input);
  assert.strictEqual(mainName, "My Era");
  assert.deepStrictEqual(alternateNames, ["Alt1", "Alt2"]);
});

test("categorizes youtube links", () => {
  const info = ImprovedParser.categorizeLink("https://youtube.com/watch?v=abc");
  assert.strictEqual(info.platform, "youtube");
  assert.ok(info.isValid);
});
