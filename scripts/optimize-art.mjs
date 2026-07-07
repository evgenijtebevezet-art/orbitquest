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
console.log("art optimized");
