import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const project = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distribution = join(project, "dist");
const manifest = JSON.parse(await readFile(join(distribution, "caraliom.manifest.json"), "utf8"));
const release = join(project, "release");
await mkdir(release, { recursive: true });
const archive = join(release, `${manifest.id}-${manifest.version}.tgz`);
const result = spawnSync("pnpm", ["exec", "caraliom-plugin", "pack", distribution, archive], {
  stdio: "inherit",
});
if (result.status !== 0) process.exit(result.status ?? 1);
const digest = createHash("sha256").update(await readFile(archive)).digest("hex");
await writeFile(join(release, "SHA256SUMS"), `${digest}  ${manifest.id}-${manifest.version}.tgz\n`);
process.stdout.write(`${archive}\nSHA-256: ${digest}\n`);
