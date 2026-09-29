// src/js/store.js
//
// Tiny cross-page reactive store. Mutations persist to
// localStorage under "vendo_store_v1" and broadcast via
// the "storage" event so other open tabs pick up changes
// automatically. Pages can subscribe via store.subscribe().
//
// Shape (mutable):
//   {
//     vendors: { [vendorId]: { ...vendorPatch } },     // overlays for known mock vendors
//     registry: [ { id, name, email, category, location, kyc, joined } ]   // newly registered vendors
//   }

(function () {
  var KEY = "vendo_store_v1";

  function defaultState() {
    return { vendors: {}, registry: [] };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return defaultState();
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : defaultState();
    } catch (e) { return defaultState(); }
  }

  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { /* quota */ }
  }

  var state = load();
  var listeners = [];

  function emit(action) {
    save(state);
    try { window.dispatchEvent(new CustomEvent("vendo:store", { detail: { action: action, state: state } })); } catch (e) {}
    listeners.slice().forEach(function (fn) {
      try { fn(action, state); } catch (e) {}
    });
  }

  // Re-read state from localStorage and notify subscribers. Used when a
  // page is restored from bfcache or becomes visible again so the in-memory
  // closure doesn't keep showing stale vendor decisions made on another
  // page. Without this, navigating from vendor-detail.html (approve)
  // back to admin/vendors.html via the browser back button can render
  // a stale list because the JS closure wasn't re-initialised.
  function reloadFromStorage(reason) {
    var fresh = load();
    // Cheap shallow compare so we only emit if something actually changed.
    var changed = JSON.stringify(fresh) !== JSON.stringify(state);
    state = fresh;
    if (changed) {
      listeners.slice().forEach(function (fn) {
        try { fn({ type: "reload", reason: reason || "manual" }, state); } catch (e) {}
      });
    }
  }

  window.addEventListener("storage", function (e) {
    if (e.key !== KEY) return;
    reloadFromStorage("storage");
  });

  // bfcache restore fires "pageshow" with persisted=true. Without this
  // hook the in-memory `state` would be the snapshot taken when the page
  // was first loaded, missing any writes made on another tab/page.
  window.addEventListener("pageshow", function (e) {
    if (e && e.persisted) reloadFromStorage("bfcache");
  });

  // Tab visibility: when the user comes back to the tab, re-read.
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) reloadFromStorage("visibility");
  });

  window.VendoStore = {
    getState: function () { return state; },
    // Forces a re-read from localStorage and notifies subscribers.
    // Pages should call this on mount if they suspect the user may
    // have navigated via bfcache or in another tab.
    forceReload: function () { reloadFromStorage("manual"); },

    // Read merged vendor (mock defaults + persisted overrides)
    getVendor: function (id) {
      if (!window.VendoData || !window.VendoData.vendors) return null;
      var base = window.VendoData.vendors.find(function (v) { return v.id === id; });
      var patch = state.vendors[id];
      if (base) return patch ? Object.assign({}, base, patch) : base;
      // fall back to registry (newly registered vendors)
      var reg = (state.registry || []).find(function (v) { return v.id === id; });
      if (reg) return reg;
      return null;
    },

    // Full merged list (mock + registered)
    listVendors: function () {
      var list = [];
      if (window.VendoData && window.VendoData.vendors) {
        list = list.concat(window.VendoData.vendors.map(function (v) {
          var patch = state.vendors[v.id];
          return patch ? Object.assign({}, v, patch) : v;
        }));
      }
      if (state.registry && state.registry.length) {
        list = list.concat(state.registry);
      }
      return list;
    },

    // Register a brand-new vendor (admin visibility)
    registerVendor: function (vendor) {
      if (!vendor || !vendor.id) return null;
      // ensure no duplicate
      state.registry = (state.registry || []).filter(function (v) { return v.id !== vendor.id; });
      state.registry.push(vendor);
      emit({ type: "register-vendor", vendor: vendor });
      return vendor;
    },

    // Patch a vendor (partial update, merge)
    updateVendor: function (id, patch) {
      if (!id || !patch) return null;
      state.vendors[id] = Object.assign({}, state.vendors[id] || {}, patch);
      // also propagate to registry entry so newly registered vendors persist KYC state
      if (state.registry && state.registry.length) {
        state.registry = state.registry.map(function (v) {
          return v.id === id ? Object.assign({}, v, patch) : v;
        });
      }
      emit({ type: "update-vendor", id: id, patch: patch });
      return state.vendors[id];
    },

    // Reset (admin tooling)
    reset: function () {
      state = defaultState();
      emit({ type: "reset" });
    },

    subscribe: function (fn) {
      if (typeof fn !== "function") return function () {};
      listeners.push(fn);
      return function () {
        var i = listeners.indexOf(fn);
        if (i >= 0) listeners.splice(i, 1);
      };
    }
  };
})();