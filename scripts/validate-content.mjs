// запуск: node --experimental-strip-types scripts/validate-content.mjs [--strict]
import { readFile, access } from "node:fs/promises";
import { resolve } from "node:path";
import {
  validateContentIndex,
  validatePrologueScenes,
  validateCalibrationItems,
  validateJourney,
  validateMission,
} from "../packages/contracts/src/content.ts";

const root = resolve(import.meta.dirname, "..");
const strict = process.argv.includes("--strict");
const failures = [];

async function check(path, validate) {
  const raw = JSON.parse(await readFile(resolve(root, path), "utf8"));
  const errors = validate(raw);
  if (errors.length) failures.push(`${path}:\n  ${errors.join("\n  ")}`);
  return raw;
}

const index = await check("content/index.json", validateContentIndex);
await check("content/prologue/scenes.json", validatePrologueScenes);

try {
  await access(resolve(root, "content/calibration/items.json"));
  await check("content/calibration/items.json", validateCalibrationItems);
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
  if (strict) failures.push("content/calibration/items.json: MISSING");
  else console.warn("content/calibration/items.json: MISSING (pending)");
}

const missionIds = [...index.missionOrder.code, ...index.missionOrder.agent];
for (const id of missionIds) {
  const path = `content/missions/${id}.json`;
  try {
    await access(resolve(root, path));
    const mission = await check(path, validateMission);
    if (mission.id !== id) failures.push(`${path}: id "${mission.id}" != filename "${id}"`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    if (strict) failures.push(`${path}: MISSING`);
    else console.warn(`${path}: MISSING (pending)`);
  }
}

try {
  await access(resolve(root, "content/journey.json"));
  await check("content/journey.json", (raw) => validateJourney(raw, missionIds));
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
  if (strict) failures.push("content/journey.json: MISSING");
  else console.warn("content/journey.json: MISSING (pending)");
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("content valid");
