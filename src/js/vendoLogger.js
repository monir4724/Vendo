// src/js/vendoLogger.js
//
// Lightweight client-side event logger for Vendo end-to-end testing.
// Install on every page (one tag) to mirror browser-console activity
// into a persistent store that /public/console.html reads.
//
// Storage shape:
//   localStorage["vendo_console_log"] = JSON.stringify([
//     { ts, level, source, message, meta }, ...
//   ])
// Capped at MAX entries (oldest dropped) to avoid quota issues.

(function () {
  var KEY = "vendo_console_log";
  var MAX = 500;

  function safeParse(raw) {
    try { var v = JSON.parse(raw); return Array.isArray(v) ? v : []; }
    catch (e) { return []; }
  }

  function load() {
    try { return safeParse(localStorage.getItem(KEY)); }
    catch (e) { return []; }
  }

  function save(entries) {
    try { localStorage.setItem(KEY, JSON.stringify(entries.slice(-MAX))); }
    catch (e) { /* quota */ }
  }

  function push(entry) {
    var entries = load();
    entries.push(entry);
    save(entries);
    // also broadcast so a live console.html can update without reload
    try {
      window.dispatchEvent(new CustomEvent("vendo:log", { detail: entry }));
    } catch (e) {}
  }

  function nowIso() { return new Date().toISOString(); }

  function describeArg(a) {
    if (a === null) return "null";
    if (a === undefined) return "undefined";
    if (typeof a === "string") return a;
    if (typeof a === "function") return "[Function]";
    try {
      return JSON.stringify(a, function (k, v) {
        if (typeof v === "function") return "[Function]";
        if (v instanceof Error) return v.toString();
        return v;
      }, 2);
    } catch (e) {
      try { return String(a); } catch (_) { return "[unserializable]"; }
    }
  }

  function joinArgs(args) {
    var out = [];
    for (var i = 0; i < args.length; i++) out.push(describeArg(args[i]));
    return out.join(" ");
  }

  // ----- Hook console.* -----
  var LEVELS = ["log", "info", "warn", "error", "debug"];
  LEVELS.forEach(function (lvl) {
    var orig = (console && console[lvl]) ? console[lvl].bind(console) : function () {};
    console[lvl] = function () {
      try {
        push({
          ts: nowIso(),
          level: lvl,
          source: location.pathname + (location.search || ""),
          message: joinArgs(Array.prototype.slice.call(arguments))
        });
      } catch (e) { /* never break the host page */ }
      orig.apply(null, arguments);
    };
  });

  // ----- Global errors -----
  window.addEventListener("error", function (e) {
    push({
      ts: nowIso(),
      level: "error",
      source: location.pathname,
      message: (e.message || "uncaught error") + " @ " + (e.filename || "?") + ":" + (e.lineno || "?") + ":" + (e.colno || "?"),
      meta: { stack: e.error && e.error.stack ? String(e.error.stack) : null }
    });
  });

  window.addEventListener("unhandledrejection", function (e) {
    var r = e.reason;
    push({
      ts: nowIso(),
      level: "error",
      source: location.pathname,
      message: "Unhandled promise rejection: " + (r && r.message ? r.message : describeArg(r)),
      meta: { stack: r && r.stack ? String(r.stack) : null }
    });
  });

  // ----- Supabase auth events -----
  function hookSupabaseAuth() {
    var tries = 0;
    function attempt() {
      tries++;
      var supa = window.supabaseClient || window.supabase;
      if (supa && supa.auth && typeof supa.auth.onAuthStateChange === "function") {
        try {
          supa.auth.onAuthStateChange(function (event, session) {
            push({
              ts: nowIso(),
              level: event === "SIGNED_OUT" ? "info" : "log",
              source: "supabase.auth",
              message: event + (session && session.user ? " user=" + session.user.email : ""),
              meta: { event: event, user: session && session.user ? session.user.email : null }
            });
          });
          console.info("[vendo-logger] Supabase auth state hooked");
          return;
        } catch (e) {
          // fall through to retry
        }
      }
      if (tries < 30) setTimeout(attempt, 300);
    }
    attempt();
  }
  hookSupabaseAuth();

  // ----- Fetch/XHR network logging -----
  var origFetch = window.fetch && window.fetch.bind(window);
  if (origFetch) {
    window.fetch = function (input, init) {
      var startedAt = Date.now();
      var url = (typeof input === "string") ? input : (input && input.url) || String(input);
      var method = (init && init.method) || (input && input.method) || "GET";
      var entry = {
        ts: nowIso(),
        level: "log",
        source: "fetch",
        message: method + " " + url,
        meta: { kind: "request", method: method, url: url }
      };
      push(entry);
      return origFetch(input, init).then(function (res) {
        var elapsed = Date.now() - startedAt;
        push({
          ts: nowIso(),
          level: res.ok ? "log" : "error",
          source: "fetch",
          message: method + " " + url + " -> " + res.status + " (" + elapsed + "ms)",
          meta: { kind: "response", method: method, url: url, status: res.status, elapsedMs: elapsed, ok: res.ok }
        });
        return res;
      }).catch(function (err) {
        var elapsed = Date.now() - startedAt;
        push({
          ts: nowIso(),
          level: "error",
          source: "fetch",
          message: method + " " + url + " -> NETWORK ERROR (" + elapsed + "ms) " + (err && err.message ? err.message : ""),
          meta: { kind: "network-error", method: method, url: url, elapsedMs: elapsed, error: err && err.message }
        });
        throw err;
      });
    };
  }

  // VendoUI.toast hook (visual toasts -> log)
  function hookToasts() {
    function attempt() {
      if (window.VendoUI && typeof window.VendoUI.toast === "function") {
        var orig = window.VendoUI.toast.bind(window.VendoUI);
        window.VendoUI.toast = function (cfg) {
          try {
            var title = (cfg && (cfg.title || cfg.desc)) || "toast";
            var level = cfg && cfg.type === "error" ? "error" :
                        cfg && cfg.type === "warn"  ? "warn"  :
                        cfg && cfg.type === "info"  ? "info"  : "log";
            push({
              ts: nowIso(),
              level: level,
              source: "ui.toast",
              message: title,
              meta: { cfg: cfg }
            });
          } catch (e) {}
          return orig(cfg);
        };
        console.info("[vendo-logger] VendoUI.toast hooked");
      } else {
        setTimeout(attempt, 300);
      }
    }
    attempt();
  }
  hookToasts();

  // VendoAuth hooks
  function hookAuth() {
    function attempt() {
      if (window.VendoAuth) {
        var orig = {
          getUser: window.VendoAuth.getUser,
          setUser: window.VendoAuth.setUser,
          updateProfile: window.VendoAuth.updateProfile,
          signOut: window.VendoAuth.signOut
        };
        window.VendoAuth.getUser = function () {
          var u = orig.getUser();
          push({ ts: nowIso(), level: "log", source: "VendoAuth.getUser", message: "read user: " + (u && (u.email || u.name || "(anonymous)")) , meta: { user: u } });
          return u;
        };
        window.VendoAuth.setUser = function (data) {
          push({ ts: nowIso(), level: "log", source: "VendoAuth.setUser", message: "write user", meta: { patch: data } });
          return orig.setUser(data);
        };
        window.VendoAuth.updateProfile = function (data) {
          push({ ts: nowIso(), level: "log", source: "VendoAuth.updateProfile", message: "update profile", meta: { patch: data } });
          return orig.updateProfile(data);
        };
        window.VendoAuth.signOut = function () {
          push({ ts: nowIso(), level: "info", source: "VendoAuth.signOut", message: "sign out" });
          return orig.signOut();
        };
        console.info("[vendo-logger] VendoAuth hooked");
      } else {
        setTimeout(attempt, 300);
      }
    }
    attempt();
  }
  hookAuth();

  // Page navigation log
  push({
    ts: nowIso(),
    level: "info",
    source: "page",
    message: "page open " + location.pathname + (location.search || ""),
    meta: { url: location.href, referrer: document.referrer || null }
  });

  // ----- Public API for the console page -----
  window.VendoLogger = {
    list: function () { return load(); },
    clear: function () { save([]); try { window.dispatchEvent(new CustomEvent("vendo:log:clear")); } catch (e) {} },
    subscribe: function (fn) {
      window.addEventListener("vendo:log", function (e) { try { fn(e.detail); } catch (_) {} });
    }
  };
})();
