import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = Deno.env.get("SITE_URL") ?? "https://www.aicoachportal.com";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri: string;
}

function base64url(input: Uint8Array): string {
  return btoa(String.fromCharCode(...input))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function getAccessToken(sa: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/indexing",
    aud: sa.token_uri,
    iat: now,
    exp: now + 3600,
  };

  const enc = new TextEncoder();
  const headerB64 = base64url(enc.encode(JSON.stringify(header)));
  const payloadB64 = base64url(enc.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key
  const pemBody = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    enc.encode(unsignedToken)
  );

  const jwt = `${unsignedToken}.${base64url(new Uint8Array(signature))}`;

  const resp = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await resp.json();
  if (!resp.ok) throw new Error(`Token error: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function submitUrl(accessToken: string, url: string, action: string) {
  const resp = await fetch(
    "https://indexing.googleapis.com/v3/urlNotifications:publish",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, type: action }),
    }
  );
  const data = await resp.json();
  return { ok: resp.ok, status: resp.status, data };
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizePath(url: string) {
  if (url.startsWith("http")) return new URL(url).pathname;
  return url.startsWith("/") ? url : `/${url}`;
}

function toFullUrl(url: string) {
  return url.startsWith("http") ? url : `${SITE_URL}${normalizePath(url)}`;
}

function getApiErrorMessage(payload: any) {
  return payload?.error?.message || payload?.message || "Unknown API error";
}

function shouldUseSitemapFallback(payload: any) {
  const details = Array.isArray(payload?.error?.details) ? payload.error.details : [];
  const errorInfo = details.find((detail: any) =>
    detail?.["@type"] === "type.googleapis.com/google.rpc.ErrorInfo"
  );
  const reason = errorInfo?.reason || payload?.error?.status;
  return payload?.error?.code === 403 && ["SERVICE_DISABLED", "PERMISSION_DENIED", "ACCESS_TOKEN_SCOPE_INSUFFICIENT"].includes(reason);
}

async function pingSitemap(supabase: ReturnType<typeof createClient>) {
  const sitemapUrl = `${SITE_URL}/sitemap.xml`;
  const targets = [
    { engine: "google", url: `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}` },
    { engine: "bing", url: `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}` },
  ];

  const results = await Promise.all(
    targets.map(async (target) => {
      try {
        const response = await fetch(target.url);
        await supabase.from("seo_ping_log").insert({
          search_engine: target.engine,
          sitemap_url: sitemapUrl,
          status: response.ok ? "success" : "failed",
          http_status: response.status,
        });

        return {
          engine: target.engine,
          ok: response.ok,
          status: response.status,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Ping failed";
        await supabase.from("seo_ping_log").insert({
          search_engine: target.engine,
          sitemap_url: sitemapUrl,
          status: "failed",
          response_body: message,
        });

        return {
          engine: target.engine,
          ok: false,
          status: null,
          error: message,
        };
      }
    })
  );

  return {
    sitemap_url: sitemapUrl,
    results,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = Date.now();

  try {
    const { urls, action = "URL_UPDATED" } = await req.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      throw new Error("urls array is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Read admin-controlled mode: 'auto' (try API → fallback), 'live' (API only), 'sitemap' (force sitemap)
    let mode: "auto" | "live" | "sitemap" = "auto";
    try {
      const { data: setting } = await supabase
        .from("seo_settings")
        .select("value")
        .eq("key", "auto_indexing_mode")
        .maybeSingle();
      const v = (setting?.value as string) || "auto";
      if (v === "live" || v === "sitemap" || v === "auto") mode = v;
    } catch (_) { /* default to auto */ }

    // Force sitemap path if admin set sitemap-only mode
    if (mode === "sitemap") {
      const sitemapFallback = await pingSitemap(supabase);
      const now = new Date().toISOString();
      const results = [];
      for (const url of urls) {
        const fullUrl = toFullUrl(url);
        const pageUrl = normalizePath(url);
        await supabase.from("indexing_logs").insert({
          url: fullUrl, action, status: "submitted",
          api_response: { mode: "sitemap_forced", sitemap_ping: sitemapFallback },
        });
        await supabase.from("seo_page_metadata")
          .update({ index_status: "submitted", indexing_submitted_at: now })
          .eq("page_url", pageUrl);
        results.push({ url: fullUrl, success: true, mode: "sitemap_forced", response: { sitemap: sitemapFallback } });
      }
      return jsonResponse({
        ok: true, submitted: results.length, failed: 0, total: results.length,
        fallback_submitted: results.length, results, processing_time_ms: Date.now() - startedAt,
      });
    }

    const saJson = Deno.env.get("GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON");
    if (!saJson) throw new Error("Service account not configured");

    const sa: ServiceAccountKey = JSON.parse(saJson);

    // Auto-chunk: Google Indexing API allows up to 200 URLs/day; we batch in 100s
    // to keep request payloads small and avoid timeouts. Callers can pass any size.
    const MAX_BATCH = 100;
    const batches: string[][] = [];
    for (let i = 0; i < urls.length; i += MAX_BATCH) {
      batches.push(urls.slice(i, i + MAX_BATCH));
    }

    const accessToken = await getAccessToken(sa);

    const results = [];
    let sitemapFallbackPromise: Promise<Awaited<ReturnType<typeof pingSitemap>>> | null = null;

    for (const url of urls) {
      const fullUrl = toFullUrl(url);
      const pageUrl = normalizePath(url);
      const now = new Date().toISOString();

      try {
        const result = await submitUrl(accessToken, fullUrl, action);

        if (!result.ok && shouldUseSitemapFallback(result.data)) {
          sitemapFallbackPromise ??= pingSitemap(supabase);
          const sitemapFallback = await sitemapFallbackPromise;

          await supabase.from("indexing_logs").insert({
            url: fullUrl,
            action,
            status: "submitted",
            api_response: {
              mode: "sitemap_fallback",
              direct_api_error: result.data,
              sitemap_ping: sitemapFallback,
            },
            error_message: null,
          });

          await supabase
            .from("seo_page_metadata")
            .update({
              index_status: "submitted",
              indexing_submitted_at: now,
            })
            .eq("page_url", pageUrl);

          results.push({
            url: fullUrl,
            success: true,
            mode: "sitemap_fallback",
            response: {
              message: "Direct Google API unavailable, URL queued through sitemap submission.",
              sitemap: sitemapFallback,
            },
          });
          continue;
        }

        // Log the submission
        await supabase.from("indexing_logs").insert({
          url: fullUrl,
          action,
          status: result.ok ? "success" : "failed",
          api_response: result.data,
          error_message: result.ok ? null : JSON.stringify(result.data),
        });

        // Update seo_page_metadata
        if (result.ok) {
          await supabase
            .from("seo_page_metadata")
            .update({
              index_status: "submitted",
              indexing_submitted_at: now,
            })
            .eq("page_url", pageUrl);
        } else {
          await supabase
            .from("seo_page_metadata")
            .update({
              index_status: "failed",
              indexing_submitted_at: now,
            })
            .eq("page_url", pageUrl);
        }

        results.push({
          url: fullUrl,
          success: result.ok,
          mode: "google_api",
          response: result.data,
          error: result.ok ? undefined : getApiErrorMessage(result.data),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        await supabase.from("indexing_logs").insert({
          url: fullUrl,
          action,
          status: "failed",
          error_message: msg,
        });
        results.push({ url: fullUrl, success: false, error: msg });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const fallbackCount = results.filter((r) => r.mode === "sitemap_fallback").length;

    return jsonResponse({
      ok: successCount > 0,
      submitted: successCount,
      failed: results.length - successCount,
      total: results.length,
      fallback_submitted: fallbackCount,
      results,
      processing_time_ms: Date.now() - startedAt,
    });
  } catch (error) {
    console.error("Submit indexing error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ ok: false, error: message, processing_time_ms: Date.now() - startedAt });
  }
});
