import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import {
  ImageMagick,
  initializeImageMagick,
  MagickFormat,
} from "npm:@imagemagick/magick-wasm@0.0.30";

const wasmBytes = await Deno.readFile(
  new URL("magick.wasm", import.meta.resolve("npm:@imagemagick/magick-wasm@0.0.30")),
);
await initializeImageMagick(wasmBytes);

const GITHUB_OWNER = "bobruso";
const GITHUB_REPO = "Patxanguilles";
const GITHUB_BRANCH = "main";
const GITHUB_API_VERSION = "2026-03-10";
const PAGES_BASE_URL = "https://patxanguillesantifeixistes.es";
const CARD_PATH_PREFIX = "player-cards";
const STORAGE_BUCKET = "player-photos";
const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const MAX_LONG_EDGE = 1800;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isSupportedImage(bytes: Uint8Array) {
  const jpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  return jpeg || png;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value.replace(/\s/g, ""));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function sha256(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function optimizeImage(input: Uint8Array) {
  return ImageMagick.read(input, (image) => {
    if (!image.width || !image.height) throw new Error("La imagen no tiene dimensiones válidas");
    image.autoOrient();
    if (Math.max(image.width, image.height) > MAX_LONG_EDGE) {
      const ratio = MAX_LONG_EDGE / Math.max(image.width, image.height);
      image.resize(Math.max(1, Math.round(image.width * ratio)), Math.max(1, Math.round(image.height * ratio)));
    }
    const opaque = image.isOpaque;
    image.strip();
    if (opaque) {
      image.quality = 84;
      return image.write(MagickFormat.Jpeg, (data) => ({
        bytes: new Uint8Array(data),
        extension: "jpg",
        contentType: "image/jpeg",
        width: image.width,
        height: image.height,
      }));
    }
    return image.write(MagickFormat.Png, (data) => ({
      bytes: new Uint8Array(data),
      extension: "png",
      contentType: "image/png",
      width: image.width,
      height: image.height,
    }));
  });
}

function githubHeaders(token: string) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
    "User-Agent": "patxanguilles-card-publisher",
  };
}

async function githubRequest(token: string, path: string, init: RequestInit = {}) {
  return fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}${path}`, {
    ...init,
    headers: { ...githubHeaders(token), ...(init.headers ?? {}) },
  });
}

async function waitForPages(url: string, expectedSha256: string) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const response = await fetch(`${url}?v=${expectedSha256}`, { cache: "no-store" });
    if (response.ok) {
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (await sha256(bytes) === expectedSha256) return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
  }
  throw new Error("GitHub Pages no publicó todavía los bytes esperados");
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ ok: false, error: "Método no permitido" }, 405);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const githubToken = Deno.env.get("GITHUB_TOKEN");
  if (!supabaseUrl || !serviceRoleKey || !githubToken) return json({ ok: false, error: "Configuración del servidor incompleta" }, 500);
  if (req.headers.get("Authorization") !== `Bearer ${serviceRoleKey}`) return json({ ok: false, error: "No autorizado" }, 403);

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  let generationId: number | null = null;
  try {
    const body = await req.json();
    generationId = Number(body?.generation_id);
    if (!Number.isInteger(generationId) || generationId <= 0) return json({ ok: false, error: "Generación no válida" }, 400);

    const { data: existing, error: readError } = await supabase.from("card_generations")
      .select("id,player_id,status,image_url,publication_status,publication_url,publication_sha256,publication_started_at,publication_attempts")
      .eq("id", generationId).maybeSingle();
    if (readError || !existing || existing.status !== "completed" || !existing.image_url) return json({ ok: false, error: "Generación completada no encontrada" }, 404);
    if (existing.publication_status === "published" && existing.publication_url) {
      return json({ ok: true, idempotent: true, generation_id: generationId, card_url: existing.publication_url });
    }
    if (existing.publication_status === "publishing") {
      const started = Date.parse(existing.publication_started_at ?? "");
      if (Number.isFinite(started) && Date.now() - started < 10 * 60 * 1000) return json({ ok: false, error: "Publicación ya en curso" }, 409);
      await supabase.from("card_generations").update({ publication_status: "publication_error", publication_error: "Bloqueo de publicación caducado" }).eq("id", generationId).eq("publication_status", "publishing");
    }

    const { data: claimed, error: claimError } = await supabase.from("card_generations").update({
      publication_status: "publishing",
      publication_started_at: new Date().toISOString(),
      publication_error: null,
      publication_attempts: (existing.publication_attempts ?? 0) + 1,
    }).eq("id", generationId).in("publication_status", ["generated", "publication_error"]).select("id,player_id,image_url").maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) return json({ ok: false, error: "No se pudo adquirir el bloqueo de publicación" }, 409);

    const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
    const sourceUrl = new URL(claimed.image_url);
    const markerIndex = sourceUrl.pathname.indexOf(marker);
    if (sourceUrl.origin !== new URL(supabaseUrl).origin || markerIndex < 0) throw new Error("La URL temporal no pertenece al bucket esperado");
    const storagePath = decodeURIComponent(sourceUrl.pathname.slice(markerIndex + marker.length));
    const { data: blob, error: downloadError } = await supabase.storage.from(STORAGE_BUCKET).download(storagePath);
    if (downloadError || !blob) throw new Error("No se pudo descargar la carta temporal");
    if (blob.size <= 0 || blob.size > MAX_INPUT_BYTES) throw new Error("Tamaño de carta no permitido");
    const input = new Uint8Array(await blob.arrayBuffer());
    if (!isSupportedImage(input)) throw new Error("Firma de imagen no válida");

    const optimized = optimizeImage(input);
    const contentSha256 = await sha256(optimized.bytes);
    const publicationPath = `${CARD_PATH_PREFIX}/generation-${generationId}.${optimized.extension}`;
    const publicationUrl = `${PAGES_BASE_URL}/${publicationPath}`;
    const encodedPath = publicationPath.split("/").map(encodeURIComponent).join("/");
    const currentResponse = await githubRequest(githubToken, `/contents/${encodedPath}?ref=${encodeURIComponent(GITHUB_BRANCH)}`);
    let current: { sha?: string; content?: string } | null = null;
    if (currentResponse.ok) current = await currentResponse.json();
    else if (currentResponse.status !== 404) throw new Error(`GitHub no pudo consultar el destino (${currentResponse.status})`);

    let githubBlobSha = current?.sha ?? "";
    const currentSha256 = current?.content ? await sha256(base64ToBytes(current.content)) : null;
    if (current && currentSha256 !== contentSha256) {
      throw new Error("La ruta inmutable de GitHub ya contiene un contenido diferente");
    }
    if (currentSha256 !== contentSha256) {
      const uploadResponse = await githubRequest(githubToken, `/contents/${encodedPath}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Publish player card generation ${generationId}`,
          content: bytesToBase64(optimized.bytes),
          branch: GITHUB_BRANCH,
          ...(current?.sha ? { sha: current.sha } : {}),
        }),
      });
      const upload = await uploadResponse.json();
      if (!uploadResponse.ok || !upload?.content?.sha) throw new Error(`GitHub rechazó la publicación (${uploadResponse.status})`);
      githubBlobSha = upload.content.sha;
    }

    await waitForPages(publicationUrl, contentSha256);
    const { error: completeError } = await supabase.rpc("complete_card_publication", {
      p_generation_id: generationId,
      p_publication_path: publicationPath,
      p_publication_url: publicationUrl,
      p_publication_sha256: contentSha256,
      p_github_blob_sha: githubBlobSha,
    });
    if (completeError) throw completeError;
    return json({ ok: true, generation_id: generationId, player_id: claimed.player_id, card_url: publicationUrl, path: publicationPath, sha256: contentSha256, bytes: optimized.bytes.length, width: optimized.width, height: optimized.height });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Error interno";
    if (generationId) await supabase.from("card_generations").update({ publication_status: "publication_error", publication_error: message }).eq("id", generationId).eq("publication_status", "publishing");
    console.error("publish-player-card:", message);
    return json({ ok: false, error: message }, 500);
  }
});
