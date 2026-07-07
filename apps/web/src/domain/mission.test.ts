import assert from "node:assert/strict";
import test from "node:test";
import { initialMissionState, missionReducer } from "./mission.ts";

test("mission follows the deterministic learning path", () => {
  const briefing = missionReducer(initialMissionState, { type: "advance" });
  const repair = missionReducer(briefing, { type: "advance" });
  const simulation = missionReducer(repair, { type: "advance" });
  const complete = missionReducer(simulation, { type: "pass_simulation" });

  assert.equal(briefing.phase, "briefing");
  assert.equal(repair.phase, "repair");
  assert.equal(simulation.phase, "simulation");
  assert.deepEqual(complete, {
    phase: "complete",
    hintsUsed: 0,
    simulationPassed: true,
  });
});

test("hints are tracked without skipping the mission", () => {
  const result = missionReducer(initialMissionState, { type: "use_hint" });
  assert.equal(result.hintsUsed, 1);
  assert.equal(result.phase, "signal");
});
