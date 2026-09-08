import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function asPlayerId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Bytes(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return new Uint8Array(digest);
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function deriveAuthPassword(playerId: number, rawPassword: string) {
  const digest = await sha256Bytes(`patx-auth-v1|${playerId}|${rawPassword}`);
  return `Patx1!${base64Url(digest)}`;
}

function getRequesterIp(req: Request) {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function randomCode() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String(values[0] % 1_000_000).padStart(6, "0");
}

function internalEmail(playerId: number) {
  return `player-${playerId}@cuentas.patxanguillesantifeixistes.es`;
}

async function sendTelegram(text: string) {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
  if (!token || !chatId) throw new Error("Faltan secretos de Telegram");

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.ok !== true) {
    throw new Error(data?.description || "Telegram no aceptó el mensaje");
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Método no permitido" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return json({ ok: false, error: "Configuración de autenticación incompleta" }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "").trim();
    const requesterHash = await sha256Hex(`patx-ip-v1|${getRequesterIp(req)}`);

    if (action === "available_players") {
      const [{ data: players, error: playersError }, { data: profiles, error: profilesError }] = await Promise.all([
        admin.from("players").select("id,nickname,photo_url").order("nickname", { ascending: true }),
        admin.from("profiles").select("player_id").not("player_id", "is", null),
      ]);
      if (playersError || profilesError) throw playersError || profilesError;

      const linked = new Set((profiles || []).map((p) => String(p.player_id)));
      const available = (players || []).filter((p) => !linked.has(String(p.id)));
      return json({ ok: true, players: available });
    }

    if (action === "registered_players") {
      const [{ data: players, error: playersError }, { data: profiles, error: profilesError }] = await Promise.all([
        admin.from("players").select("id,nickname,photo_url").order("nickname", { ascending: true }),
        admin.from("profiles").select("player_id").not("player_id", "is", null),
      ]);
      if (playersError || profilesError) throw playersError || profilesError;

      const linked = new Set((profiles || []).map((p) => String(p.player_id)));
      const registered = (players || []).filter((p) => linked.has(String(p.id)));
      return json({ ok: true, players: registered });
    }

    if (action === "request_registration") {
      const playerId = asPlayerId(body?.player_id);
      if (!playerId) return json({ ok: false, error: "Jugador no válido" }, 400);

      const { data: player, error: playerError } = await admin
        .from("players")
        .select("id,nickname")
        .eq("id", playerId)
        .maybeSingle();
      if (playerError || !player) return json({ ok: false, error: "Jugador no encontrado" }, 404);

      const { data: linkedProfile } = await admin
        .from("profiles")
        .select("id")
        .eq("player_id", playerId)
        .maybeSingle();
      if (linkedProfile) return json({ ok: false, error: "Este jugador ya tiene una cuenta" }, 409);

      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { count: requestCount, error: countError } = await admin
        .from("player_registration_requests")
        .select("id", { count: "exact", head: true })
        .eq("requester_hash", requesterHash)
        .gte("created_at", tenMinutesAgo);
      if (countError) throw countError;
      if ((requestCount || 0) >= 5) {
        return json({ ok: false, error: "Demasiadas solicitudes. Espera unos minutos y vuelve a intentarlo." }, 429);
      }

      const nowIso = new Date().toISOString();
      const { data: existing, error: existingError } = await admin
        .from("player_registration_requests")
        .select("id,expires_at")
        .eq("player_id", playerId)
        .eq("status", "pending")
        .gt("expires_at", nowIso)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existingError) throw existingError;

      if (existing) {
        return json({
          ok: true,
          request_id: existing.id,
          expires_at: existing.expires_at,
          already_pending: true,
          message: "Ya hay una solicitud pendiente para este jugador. Pide el código al administrador.",
        });
      }

      await admin
        .from("player_registration_requests")
        .update({ status: "expired" })
        .eq("player_id", playerId)
        .eq("status", "pending")
        .lte("expires_at", nowIso);

      const code = randomCode();
      const codeHash = await sha256Hex(code);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { data: registration, error: insertError } = await admin
        .from("player_registration_requests")
        .insert({
          player_id: playerId,
          code_hash: codeHash,
          requester_hash: requesterHash,
          expires_at: expiresAt,
        })
        .select("id,expires_at")
        .single();
      if (insertError) throw insertError;

      try {
        await sendTelegram(
          `🔐 Solicitud de registro en Patxanguilles\n\n` +
          `Jugador: ${player.nickname}\n` +
          `Código: ${code}\n\n` +
          `Alguien está intentando crear la cuenta de ${player.nickname}. ` +
          `Si es la persona correcta, pásale este código.\n\n` +
          `El código caduca en 24 horas. La cuenta todavía NO se ha creado.`
        );
      } catch (telegramError) {
        await admin.from("player_registration_requests").delete().eq("id", registration.id);
        throw telegramError;
      }

      await admin
        .from("player_registration_requests")
        .update({ telegram_sent_at: new Date().toISOString() })
        .eq("id", registration.id);

      return json({
        ok: true,
        request_id: registration.id,
        expires_at: registration.expires_at,
        already_pending: false,
        message: "Solicitud enviada. Pide el código al administrador.",
      });
    }

    if (action === "complete_registration") {
      const playerId = asPlayerId(body?.player_id);
      const requestId = String(body?.request_id || "").trim();
      const code = String(body?.code || "").trim();
      const rawPassword = String(body?.password ?? "");

      if (!playerId || !requestId) return json({ ok: false, error: "Solicitud no válida" }, 400);
      if (!/^\d{6}$/.test(code)) return json({ ok: false, error: "El código debe tener 6 cifras" }, 400);
      if (rawPassword.length === 0) return json({ ok: false, error: "Escribe una contraseña" }, 400);
      if (rawPassword.length > 256) return json({ ok: false, error: "La contraseña es demasiado larga" }, 400);

      const { data: registration, error: requestError } = await admin
        .from("player_registration_requests")
        .select("id,player_id,code_hash,status,code_attempts,expires_at")
        .eq("id", requestId)
        .eq("player_id", playerId)
        .maybeSingle();
      if (requestError || !registration) return json({ ok: false, error: "Solicitud no encontrada" }, 404);

      if (registration.status !== "pending") {
        return json({ ok: false, error: "Esta solicitud ya no está activa" }, 409);
      }
      if (new Date(registration.expires_at).getTime() <= Date.now()) {
        await admin.from("player_registration_requests").update({ status: "expired" }).eq("id", requestId);
        return json({ ok: false, error: "El código ha caducado. Solicita uno nuevo." }, 410);
      }
      if ((registration.code_attempts || 0) >= 5) {
        return json({ ok: false, error: "Se han agotado los intentos de este código. Solicita uno nuevo." }, 429);
      }

      const suppliedHash = await sha256Hex(code);
      if (suppliedHash !== registration.code_hash) {
        const attempts = (registration.code_attempts || 0) + 1;
        await admin
          .from("player_registration_requests")
          .update({
            code_attempts: attempts,
            status: attempts >= 5 ? "cancelled" : "pending",
          })
          .eq("id", requestId);
        return json({
          ok: false,
          error: attempts >= 5
            ? "Código incorrecto. Se han agotado los intentos; solicita uno nuevo."
            : `Código incorrecto. Quedan ${5 - attempts} intentos.`,
        }, 401);
      }

      const { data: linkedProfile } = await admin
        .from("profiles")
        .select("id")
        .eq("player_id", playerId)
        .maybeSingle();
      if (linkedProfile) return json({ ok: false, error: "Este jugador ya tiene una cuenta" }, 409);

      const { data: player, error: playerError } = await admin
        .from("players")
        .select("id,nickname")
        .eq("id", playerId)
        .maybeSingle();
      if (playerError || !player) return json({ ok: false, error: "Jugador no encontrado" }, 404);

      const authPassword = await deriveAuthPassword(playerId, rawPassword);
      const email = internalEmail(playerId);
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password: authPassword,
        email_confirm: true,
        user_metadata: { display_name: player.nickname, player_id: playerId },
      });
      if (createError || !created?.user) {
        return json({ ok: false, error: createError?.message || "No se pudo crear la cuenta" }, 400);
      }

      const userId = created.user.id;
      const { error: profileError } = await admin
        .from("profiles")
        .update({
          player_id: playerId,
          display_name: player.nickname,
          credential_scheme: "patx_v1",
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (profileError) {
        await admin.auth.admin.deleteUser(userId).catch(() => undefined);
        return json({ ok: false, error: "No se pudo vincular la cuenta al jugador" }, 409);
      }

      const { error: markError } = await admin
        .from("player_registration_requests")
        .update({
          status: "completed",
          auth_user_id: userId,
          completed_at: new Date().toISOString(),
        })
        .eq("id", requestId);
      if (markError) console.error("No se pudo cerrar la solicitud", markError);

      sendTelegram(`✅ Registro completado en Patxanguilles\n\n${player.nickname} ya tiene su cuenta vinculada.`)
        .catch((error) => console.error("Telegram completion notice failed", error));

      const { data: loginData, error: loginError } = await authClient.auth.signInWithPassword({
        email,
        password: authPassword,
      });
      if (loginError || !loginData?.session) {
        return json({ ok: true, registered: true, signed_in: false });
      }

      return json({
        ok: true,
        registered: true,
        signed_in: true,
        session: {
          access_token: loginData.session.access_token,
          refresh_token: loginData.session.refresh_token,
          expires_at: loginData.session.expires_at,
        },
      });
    }

    if (action === "login") {
      const playerId = asPlayerId(body?.player_id);
      const rawPassword = String(body?.password ?? "");
      if (!playerId || rawPassword.length === 0) {
        return json({ ok: false, error: "Jugador o contraseña incorrectos" }, 400);
      }
      if (rawPassword.length > 256) return json({ ok: false, error: "Jugador o contraseña incorrectos" }, 400);

      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const [{ count: ipFailures, error: ipCountError }, { count: playerFailures, error: playerCountError }] = await Promise.all([
        admin
          .from("account_login_attempts")
          .select("id", { count: "exact", head: true })
          .eq("requester_hash", requesterHash)
          .eq("success", false)
          .gte("attempted_at", fifteenMinutesAgo),
        admin
          .from("account_login_attempts")
          .select("id", { count: "exact", head: true })
          .eq("player_id", playerId)
          .eq("success", false)
          .gte("attempted_at", fifteenMinutesAgo),
      ]);
      if (ipCountError || playerCountError) throw ipCountError || playerCountError;
      if ((ipFailures || 0) >= 10 || (playerFailures || 0) >= 20) {
        return json({ ok: false, error: "Demasiados intentos. Espera unos minutos antes de volver a probar." }, 429);
      }

      const { data: profile, error: profileError } = await admin
        .from("profiles")
        .select("id,player_id,credential_scheme")
        .eq("player_id", playerId)
        .maybeSingle();

      if (profileError || !profile) {
        await admin.from("account_login_attempts").insert({ player_id: playerId, requester_hash: requesterHash, success: false });
        return json({ ok: false, error: "Jugador o contraseña incorrectos" }, 401);
      }

      const { data: userResult, error: userError } = await admin.auth.admin.getUserById(profile.id);
      const email = userResult?.user?.email;
      if (userError || !email) {
        await admin.from("account_login_attempts").insert({ player_id: playerId, requester_hash: requesterHash, success: false });
        return json({ ok: false, error: "Jugador o contraseña incorrectos" }, 401);
      }

      const authPassword = profile.credential_scheme === "patx_v1"
        ? await deriveAuthPassword(playerId, rawPassword)
        : rawPassword;

      const { data: loginData, error: loginError } = await authClient.auth.signInWithPassword({ email, password: authPassword });
      if (loginError || !loginData?.session) {
        await admin.from("account_login_attempts").insert({ player_id: playerId, requester_hash: requesterHash, success: false });
        return json({ ok: false, error: "Jugador o contraseña incorrectos" }, 401);
      }

      await admin.from("account_login_attempts").insert({ player_id: playerId, requester_hash: requesterHash, success: true });
      return json({
        ok: true,
        session: {
          access_token: loginData.session.access_token,
          refresh_token: loginData.session.refresh_token,
          expires_at: loginData.session.expires_at,
        },
      });
    }

    return json({ ok: false, error: "Acción no válida" }, 400);
  } catch (error) {
    console.error(error);
    return json({
      ok: false,
      error: error instanceof Error ? error.message : "Error interno",
    }, 500);
  }
});
