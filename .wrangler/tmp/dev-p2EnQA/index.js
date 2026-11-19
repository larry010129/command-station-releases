var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
var CORS = { "access-control-allow-origin": "*" };
var json = /* @__PURE__ */ __name((body, status = 200, extra = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...CORS, ...extra }
}), "json");
var bytesOf = /* @__PURE__ */ __name((v) => v instanceof ArrayBuffer ? new Uint8Array(v) : Uint8Array.from(v), "bytesOf");
async function currentInfo(db) {
  const cur = await db.prepare("SELECT number, published_at, effective_at FROM release_current WHERE id = 1").first();
  const number = Number(cur?.number) || 0;
  return {
    number,
    publishedAt: cur?.published_at ?? null,
    effectiveAt: cur?.effective_at ?? null,
    manifestPath: number > 0 ? `/releases/${number}/manifest.json` : null
  };
}
__name(currentInfo, "currentInfo");
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
__name(releases, "releases");
var src_default = {
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
  }
};

// ../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-RhtGOf/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-RhtGOf/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
