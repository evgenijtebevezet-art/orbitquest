import assert from "node:assert/strict";
import test from "node:test";
import { createProfile, type Journey, type Mission, type Profile } from "@orbitquest/contracts";
import { journeyNodeStates, recommendJourneyMission, shipNodeIndex } from "./progress.ts";

const journey: Journey = {
  stages: [{ id: "earth-iss", title: "Земля → МКС", from: "Земля", to: "МКС" }],
  nodes: [
    { missionId: "code-01", stage: "earth-iss", x: 50, y: 90, kind: "mission" },
    { missionId: "code-02", stage: "earth-iss", x: 48, y: 80, kind: "mission" },
    { missionId: "sos-01", stage: "earth-iss", x: 46, y: 70, kind: "emergency" },
    { missionId: "code-03", stage: "earth-iss", x: 44, y: 60, kind: "mission" },
  ],
};

function missionFixture(id: string): Mission {
  return {
    id,
    code: id.toUpperCase(),
    sector: "code",
    satelliteId: id.toUpperCase(),
    skillId: `skill.${id}`,
    title: id,
    why: "why",
    briefing: ["brief"],
    durationMinutes: 10,
    contextTag: "familiar",
    koraFallback: "fallback",
    tasks: [
      {
        id: "t1",
        type: "choose-explanation",
        prompt: "?",
        options: [
          { id: "a", label: "a" },
          { id: "b", label: "b" },
        ],
        answer: "a",
        hints: ["1", "2", "3"],
        redTest: "red",
        explain: "explain",
        proof: true,
      },
    ],
  };
}

const missionsById = Object.fromEntries(
  journey.nodes.map((n) => [n.missionId, missionFixture(n.missionId)]),
);

const today = new Date("2026-07-11T12:00:00.000Z");

function profileWith(completed: string[], skips: string[] = [], skipsOverridden = false): Profile {
  const profile = createProfile("test");
  profile.calibration.done = true;
  profile.calibration.skipsOverridden = skipsOverridden;
  profile.calibration.result = {
    capabilities: {},
    recommendedSector: "code",
    skipMissionIds: skips,
  };
  for (const id of completed) {
    profile.missions[id] = {
      missionId: id,
      status: "completed",
      attempts: [],
      completedAt: today.toISOString(),
      nextReviewAt: new Date(today.getTime() + 7 * 24 * 3600 * 1000).toISOString(),
    };
  }
  return profile;
}

test("fresh profile: first node active, rest locked", () => {
  const views = journeyNodeStates(profileWith([]), journey.nodes, today);
  assert.deepEqual(
    views.map((v) => v.state),
    ["active", "locked", "locked", "locked"],
  );
});

test("completed prefix unlocks the next node", () => {
  const views = journeyNodeStates(profileWith(["code-01"]), journey.nodes, today);
  assert.deepEqual(
    views.map((v) => v.state),
    ["completed", "active", "locked", "locked"],
  );
});

test("skipped node counts as passed for the unlock chain", () => {
  const views = journeyNodeStates(profileWith(["code-01"], ["code-02"]), journey.nodes, today);
  assert.deepEqual(
    views.map((v) => v.state),
    ["completed", "skipped", "active", "locked"],
  );
});

test("skipsOverridden: skips no longer count as passed", () => {
  const views = journeyNodeStates(
    profileWith(["code-01"], ["code-02"], true),
    journey.nodes,
    today,
  );
  assert.deepEqual(
    views.map((v) => v.state),
    ["completed", "active", "locked", "locked"],
  );
});

test("mission completed out of order stays completed, chain still blocks", () => {
  const views = journeyNodeStates(profileWith(["sos-01"]), journey.nodes, today);
  assert.deepEqual(
    views.map((v) => v.state),
    ["active", "locked", "completed", "locked"],
  );
});

test("recommendation is the active node", () => {
  assert.equal(
    recommendJourneyMission(profileWith(["code-01"]), journey, missionsById, today),
    "code-02",
  );
});

test("all passed: recommendation falls back to due review", () => {
  const all = journey.nodes.map((n) => n.missionId);
  const profile = profileWith(all);
  assert.equal(recommendJourneyMission(profile, journey, missionsById, today), null);
  // созревшее повторение первого узла
  profile.missions["code-01"]!.nextReviewAt = new Date(today.getTime() - 1000).toISOString();
  assert.equal(recommendJourneyMission(profile, journey, missionsById, today), "code-01");
});

test("ship stands at the end of the passed prefix", () => {
  assert.equal(shipNodeIndex(journeyNodeStates(profileWith([]), journey.nodes, today)), -1);
  assert.equal(shipNodeIndex(journeyNodeStates(profileWith(["code-01"]), journey.nodes, today)), 0);
  assert.equal(
    shipNodeIndex(journeyNodeStates(profileWith(["code-01"], ["code-02"]), journey.nodes, today)),
    1,
  );
  const all = journey.nodes.map((n) => n.missionId);
  assert.equal(shipNodeIndex(journeyNodeStates(profileWith(all), journey.nodes, today)), 3);
});
