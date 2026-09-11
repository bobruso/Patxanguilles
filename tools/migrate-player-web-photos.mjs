import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const supabaseUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !publishableKey) {
  throw new Error("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required");
}

const root = process.cwd();
const manifestPath = path.join(root, "tmp", "storage-migration", "prepared", "manifest.json");
const resultPath = path.join(root, "tmp", "storage-migration", "photo-migration-results.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const photos = manifest.items.filter((item) => item.outputPath.startsWith("player-photos/"));
const results = [];

for (const item of photos) {
  const filePath = path.join(root, "tmp", "storage-migration", "prepared", ...item.outputPath.split("/"));
  const bytes = await readFile(filePath);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (sha256 !== item.outputSha256 || bytes.length !== item.outputBytes) {
    throw new Error(`Prepared file verification failed for player ${item.playerId}`);
  }

  const form = new FormData();
  form.set("player_id", String(item.playerId));
  form.set("photo", new Blob([bytes], { type: "image/jpeg" }), `player-${item.playerId}.jpg`);

  const response = await fetch(`${supabaseUrl}/functions/v1/update-player-profile`, {
    method: "POST",
    headers: {
      apikey: publishableKey,
      authorization: `Bearer ${publishableKey}`,
    },
    body: form,
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok || !payload.photo_url) {
    throw new Error(`Player ${item.playerId}: ${payload.error || `HTTP ${response.status}`}`);
  }

  const verification = await fetch(`${payload.photo_url}?verify=${Date.now()}`, { cache: "no-store" });
  const published = Buffer.from(await verification.arrayBuffer());
  const publishedSha256 = createHash("sha256").update(published).digest("hex");
  if (!verification.ok || published.length !== item.outputBytes || publishedSha256 !== item.outputSha256) {
    throw new Error(`Published file verification failed for player ${item.playerId}`);
  }

  results.push({
    playerId: item.playerId,
    sourcePath: item.sourcePath,
    photoUrl: payload.photo_url,
    bytes: published.length,
    sha256: publishedSha256,
  });
  await writeFile(resultPath, `${JSON.stringify({ completedAt: new Date().toISOString(), results }, null, 2)}\n`);
  console.log(`OK player ${item.playerId}: ${published.length} bytes`);
}

console.log(JSON.stringify({ migrated: results.length, resultPath }, null, 2));
