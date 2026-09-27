(function () {
  var KEY = "vendo-theme";
  function systemDark() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function resolve(pref) {
    if (pref === "dark" || pref === "light") return pref;
    return systemDark() ? "dark" : "light";
  }
  window.VendoTheme = {
    getPref: function () { return localStorage.getItem(KEY) || "system"; },
    apply: function (pref) {
      var resolved = resolve(pref);
      document.documentElement.setAttribute("data-theme", resolved);
      localStorage.setItem(KEY, pref);
    },
    toggle: function () {
      var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      this.apply(next);
      return next;
    }
  };
  window.VendoTheme.apply(window.VendoTheme.getPref());
})();
