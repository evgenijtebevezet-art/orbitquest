import { readdir, mkdir, stat } from "node:fs/promises";
import { resolve, basename } from "node:path";
import sharp from "sharp";

const src = resolve(import.meta.dirname, "../assets/prologue-scenes");
const out = resolve(import.meta.dirname, "../apps/web/src/assets/prologue");
await mkdir(out, { recursive: true });

for (const file of (await readdir(src)).filter((f) => f.endsWith(".png"))) {
  const target = resolve(out, `${basename(file, ".png")}.webp`);
  await sharp(resolve(src, file))
    .resize({ width: 1280, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(target);
  const { size } = await stat(target);
  console.log(`${basename(target)} ${(size / 1024).toFixed(0)}KB`);
  if (size > 300 * 1024) throw new Error(`${basename(target)} exceeds 300KB`);
}

// портреты персонажей: assets/characters/*.png → 320px webp
const charSrc = resolve(import.meta.dirname, "../assets/characters");
const charOut = resolve(import.meta.dirname, "../apps/web/src/assets/characters");
try {
  const files = (await readdir(charSrc)).filter((f) => f.endsWith(".png"));
  await mkdir(charOut, { recursive: true });
  for (const file of files) {
    const target = resolve(charOut, `${basename(file, ".png")}.webp`);
    await sharp(resolve(charSrc, file))
      .resize({ width: 320, height: 320, fit: "cover" })
      .webp({ quality: 85 })
      .toFile(target);
    const { size } = await stat(target);
    console.log(`${basename(target)} ${(size / 1024).toFixed(0)}KB`);
    if (size > 120 * 1024) throw new Error(`${basename(target)} exceeds 120KB`);
  }
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
  console.warn("assets/characters: none yet, skipped");
}

// карта путешествия: assets/journey-map.png → 1080px webp (лимит 350KB)
try {
  const journeyOut = resolve(import.meta.dirname, "../apps/web/src/assets/journey");
  await mkdir(journeyOut, { recursive: true });
  const journeyTarget = resolve(journeyOut, "journey-map.webp");
  await sharp(resolve(import.meta.dirname, "../assets/journey-map.png"))
    .resize({ width: 1080, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(journeyTarget);
  const { size } = await stat(journeyTarget);
  console.log(`journey-map.webp ${(size / 1024).toFixed(0)}KB`);
  if (size > 350 * 1024) throw new Error("journey-map.webp exceeds 350KB");
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
  console.warn("assets/journey-map.png: missing, skipped");
}
console.log("art optimized");
