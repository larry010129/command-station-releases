// Public, read-only release host. Serves what the CMS Worker published into D1, plus /api/health.
// Players' games fetch /releases/*; nothing here writes.
const CORS = { "access-control-allow-origin": "*" };

const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...CORS, ...extra },
  });

const bytesOf = (v) => (v instanceof ArrayBuffer ? new Uint8Array(v) : Uint8Array.from(v));

async function currentInfo(db) {
  const cur = await db.prepare("SELECT number, published_at, effective_at FROM release_current WHERE id = 1").first();
  const number = Number(cur?.number) || 0;
  return {
    number,
    publishedAt: cur?.published_at ?? null,
    effectiveAt: cur?.effective_at ?? null,
    manifestPath: number > 0 ? `/releases/${number}/manifest.json` : null,
  };
}

async function releases(request, env, pathname) {
  const db = env.DB;
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { ...CORS, "access-control-allow-methods": "GET,OPTIONS", "access-control-allow-headers": "Content-Type" } });
  }
  if (request.method !== "GET" && request.method !== "HEAD") return json({ error: "method not allowed" }, 405);

  if (pathname === "/releases/current") return json(await currentInfo(db));

  if (pathname === "/releases/public-key") {
    if (!env.PUBLIC_KEY) return json({ error: "public key not configured" }, 404);
    return new Response(env.PUBLIC_KEY, { headers: { "content-type": "application/x-pem-file", ...CORS } });
  }

  let m = pathname.match(/^\/releases\/blobs\/([a-fA-F0-9]{64})$/);
  if (m) {
    const row = await db.prepare("SELECT data FROM blobs WHERE hash = ?").bind(m[1].toLowerCase()).first();
    if (!row) return json({ error: "blob not found" }, 404);
    // Named by its hash, so it can never change.
    return new Response(bytesOf(row.data), { headers: { "content-type": "application/octet-stream", "cache-control": "public, max-age=31536000, immutable", ...CORS } });
  }

  m = pathname.match(/^\/releases\/(\d+)\/manifest\.json$/);
  if (m) {
    const row = await db.prepare("SELECT manifest FROM releases WHERE number = ?").bind(Number(m[1])).first();
    if (!row) return json({ error: "release not found" }, 404);
    return new Response(row.manifest, { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-cache", ...CORS } });
  }

  m = pathname.match(/^\/releases\/(\d+)\/content\.json$/);
  if (m) {
    const rel = await db.prepare("SELECT content_hash FROM releases WHERE number = ?").bind(Number(m[1])).first();
    const row = rel ? await db.prepare("SELECT data FROM blobs WHERE hash = ?").bind(rel.content_hash).first() : null;
    if (!row) return json({ error: "release not found" }, 404);
    return new Response(bytesOf(row.data), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-cache", ...CORS } });
  }

  return json({ error: "not found" }, 404);
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname.startsWith("/releases/") || pathname === "/releases") {
      try {
        return await releases(request, env, pathname);
      } catch (err) {
        return json({ error: "release host error" }, 500);
      }
    }

    if (pathname === "/api/health") {
      try {
        await env.DB.prepare("SELECT 1").first();
      } catch (e) {
        return json({ ok: false, db: "unreachable" }, 500);
      }
      const cur = await currentInfo(env.DB).catch(() => null);
      return json({ ok: true, db: "connected", release: cur ? cur.number : null });
    }

    return json({ ok: false, error: "not found" }, 404);
  },
};
