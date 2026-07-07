import assert from "node:assert/strict";
import test from "node:test";
import { isBootstrapResponse } from "@orbitquest/contracts";
import { bootstrapResponse } from "./bootstrap.js";

test("bootstrap fixture satisfies the shared contract", () => {
  assert.equal(isBootstrapResponse(bootstrapResponse), true);
  assert.equal(bootstrapResponse.activeMission.satelliteId, "TOOLS-03");
});
