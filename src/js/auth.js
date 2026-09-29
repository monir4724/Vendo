// src/js/auth.js
//
// Frontend-only auth state for Vendo. Persists logged-in user
// (name, email/phone, role, profile fields) to localStorage so
// profile/checkout/invoice pages render with the current user's
// data instead of the static demo placeholder.
//
// In production this would be backed by Supabase Auth + a
// `profiles` table. The shape mirrors what the backend would
// return so swapping in real data is a single-file change.

(function () {
  var STORAGE_KEY = "vendo_auth_user";

  function defaultUser() {
    return {
      role: "customer",
      name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      joinedAt: null,
      orderCount: 0
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function save(user) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
      // ignore quota / private mode errors
    }
  }

  function deriveNameFromEmail(emailOrPhone) {
    if (!emailOrPhone) return "";
    var s = String(emailOrPhone);
    if (s.indexOf("@") !== -1) {
      var local = s.split("@")[0];
      return local
        .replace(/[._-]+/g, " ")
        .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    }
    return "";
  }

  function isEmail(s) {
    return typeof s === "string" && /\S+@\S+\.\S+/.test(s);
  }

  function initials(name) {
    if (!name) return "?";
    var parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  window.VendoAuth = {
    // Read the current user, falling back to sessionStorage values
    // written by login/register forms when no profile row exists yet.
    getUser: function () {
      var stored = load();
      if (stored && stored.name) return stored;

      // Backfill from sessionStorage so login/register flows show
      // the new user's data on first render.
      var sessionName = sessionStorage.getItem("vendo_name");
      var sessionUser = sessionStorage.getItem("vendo_user");
      if (!sessionName && !sessionUser) return defaultUser();

      var name = sessionName || deriveNameFromEmail(sessionUser);
      var user = defaultUser();
      user.role = sessionStorage.getItem("vendo_role") || "customer";
      user.name = name;
      if (isEmail(sessionUser)) {
        user.email = sessionUser;
      } else {
        user.phone = sessionUser;
      }
      user.joinedAt = new Date().toISOString();
      save(user);
      return user;
    },

    // Used by login/register when we know the inputs.
    setUser: function (data) {
      var current = load() || defaultUser();
      var next = Object.assign({}, current, data || {});
      if (!next.joinedAt) next.joinedAt = new Date().toISOString();
      save(next);
      // Mirror to sessionStorage for code paths that still read it.
      if (next.role) sessionStorage.setItem("vendo_role", next.role);
      if (next.email) sessionStorage.setItem("vendo_user", next.email);
      else if (next.phone) sessionStorage.setItem("vendo_user", next.phone);
      if (next.name) sessionStorage.setItem("vendo_name", next.name);
      return next;
    },

    updateProfile: function (patch) {
      return this.setUser(patch || {});
    },

    signOut: function () {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      try {
        sessionStorage.removeItem("vendo_role");
        sessionStorage.removeItem("vendo_user");
        sessionStorage.removeItem("vendo_name");
      } catch (e) {}
    },

    initials: initials
  };
})();
