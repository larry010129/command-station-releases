// Release files are served as static assets. Only /api/* runs this code.
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", "access-control-allow-origin": "*" },
  });

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === "/api/health") {
      try {
        await env.DB.prepare("SELECT 1").first();
      } catch (e) {
        return json({ ok: false, db: "unreachable", error: String(e) }, 500);
      }
      let players = null;
      try {
        players = (await env.DB.prepare("SELECT COUNT(*) AS n FROM players").first()).n;
      } catch {
        /* migration not applied yet */
      }
      return json({ ok: true, db: "connected", tables: players === null ? "not created yet" : "ready", players });
    }

    return json({ ok: false, error: "not found" }, 404);
  },
};
