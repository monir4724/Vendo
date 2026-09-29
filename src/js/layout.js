window.VendoLayout = (function () {
  var adminNav = [
    ["dashboard.html", "layout-dashboard", "Dashboard"],
    ["vendors.html", "store", "Vendors"],
    ["moderation.html", "shield", "Moderation"],
    ["categories.html", "folder-tree", "Categories"],
    ["disputes.html", "scale", "Disputes"],
    ["payouts.html", "banknote", "Payouts"],
    ["audit.html", "scroll-text", "Audit log"],
    ["settings.html", "settings", "Settings"]
  ];

  var vendorNav = [
    ["dashboard.html", "layout-dashboard", "Dashboard"],
    ["products.html", "package", "Products"],
    ["reels.html", "clapperboard", "Reels"],
    ["go-live.html", "radio", "Go Live"],
    ["orders.html", "shopping-bag", "Orders"],
    ["messages.html", "message-circle", "Messages"],
    ["earnings.html", "wallet", "Earnings"],
    ["settings.html", "settings", "Store Settings"]
  ];

  function file() {
    var parts = location.pathname.split("/");
    return parts[parts.length - 1] || "dashboard.html";
  }

  function mountDashboard(role) {
    var nav = role === "admin" ? adminNav : vendorNav;
    var current = file();
    var aside = document.getElementById("app-sidebar");
    if (aside) {
      aside.innerHTML =
        '<div class="sidebar-brand">' +
          '<a href="../index.html" style="display:flex;align-items:center;gap:10px;color:inherit;text-decoration:none">' +
            '<img src="../assets/icon.jpg" class="brand-icon-img" alt="Vendo" style="width:34px;height:34px;border-radius:8px">' +
            '<div><img src="../assets/logo.png" class="brand-logo-img" alt="Vendo" style="height:22px;width:auto;display:block"><div class="caption" style="text-transform:capitalize;font-size:10px;margin-top:2px">' + role + ' Studio</div></div>' +
          '</a>' +
        '</div>' +
        '<nav class="sidebar-nav" style="display:flex;flex-direction:column;gap:2px">' +
          nav.map(function (item) {
            var active = item[0] === current ? " is-active" : "";
            return '<a class="nav-link' + active + '" href="' + item[0] + '"><i data-lucide="' + item[1] + '"></i><span>' + item[2] + '</span></a>';
          }).join("") +
        '</nav>' +
        '<div style="margin-top:auto;padding:16px 20px;border-top:1px solid var(--color-border-default)" class="stack gap-2">' +
          '<a href="../customer/home.html" class="btn btn-sm btn-ghost flex gap-2" style="justify-content:flex-start;padding:8px 12px;font-size:12px"><i data-lucide="store"></i> View Storefront</a>' +
          '<div class="caption flex-between" style="font-size:11px"><span>Role: <strong style="text-transform:capitalize">' + role + '</strong></span><span class="badge badge-success">Online</span></div>' +
        '</div>';
    }

    var tools = document.getElementById("topbar-tools");
    if (tools) {
      tools.style.marginLeft = "auto";
      tools.style.display = "flex";
      tools.style.alignItems = "center";
      tools.style.gap = "var(--space-2)";
      var isDark = document.documentElement.getAttribute("data-theme") === "dark";
      var initials = (role === "admin" ? "AD" : "VN");
      var displayName = "Admin Demo";
      try {
        if (window.VendoAuth && VendoAuth.getUser) {
          var u = VendoAuth.getUser();
          if (u && (u.full_name || u.name || u.email)) {
            displayName = u.full_name || u.name || u.email.split("@")[0];
            if (u.full_name || u.name) {
              var parts = String(u.full_name || u.name).trim().split(/\s+/);
              initials = (parts[0] ? parts[0][0] : "") + (parts[1] ? parts[1][0] : "");
              initials = initials.toUpperCase() || initials;
            }
          }
        }
      } catch (e) {}
      tools.innerHTML =
        '<button class="icon-btn" id="theme-toggle" type="button" aria-label="Toggle color theme" title="Toggle dark mode"><i data-lucide="' + (isDark ? "sun" : "moon") + '"></i></button>' +
        '<button class="icon-btn" style="position:relative" type="button" aria-label="Notifications" id="btn-bell" title="Notifications">' +
          '<i data-lucide="bell"></i>' +
          '<span class="unread-dot" style="position:absolute;top:10px;right:10px"></span>' +
        '</button>' +
        '<div class="user-menu" id="user-menu">' +
          '<button class="user-menu-trigger" id="user-menu-trigger" type="button" aria-haspopup="menu" aria-expanded="false" title="' + displayName + '">' +
            '<span class="avatar" style="font-size:13px;width:40px;height:40px">' + initials + '</span>' +
            '<span class="user-menu-caret"><i data-lucide="chevron-down"></i></span>' +
          '</button>' +
          '<div class="user-menu-pop" id="user-menu-pop" role="menu" hidden>' +
            '<div class="user-menu-head">' +
              '<div class="user-menu-name">' + displayName + '</div>' +
              '<div class="user-menu-role">' + (role === "admin" ? "Administrator" : "Vendor") + '</div>' +
            '</div>' +
            '<a class="user-menu-item" role="menuitem" href="settings.html"><i data-lucide="user"></i> My Profile</a>' +
            '<a class="user-menu-item" role="menuitem" href="settings.html#pane-account"><i data-lucide="settings"></i> Settings</a>' +
            (role === "admin"
              ? '<a class="user-menu-item" role="menuitem" href="vendors.html"><i data-lucide="store"></i> Vendors</a>'
              : '<a class="user-menu-item" role="menuitem" href="products.html"><i data-lucide="package"></i> My Products</a>') +
            '<div class="user-menu-sep"></div>' +
            '<button class="user-menu-item user-menu-danger" id="user-menu-signout" role="menuitem" type="button"><i data-lucide="log-out"></i> Sign out</button>' +
          '</div>' +
        '</div>';
    }

    var toggle = document.getElementById("theme-toggle");
    if (toggle) {
      toggle.addEventListener("click", function () {
        var mode = window.VendoTheme.toggle();
        if (window.VendoUI) window.VendoUI.toast({ title: mode === "dark" ? "Dark mode active" : "Light mode active", desc: "Token-based high contrast theme." });
        if (window.lucide) window.lucide.createIcons();
      });
    }

    var bell = document.getElementById("btn-bell");
    if (bell) {
      bell.addEventListener("click", function () {
        if (role === "admin") {
          if (window.VendoUI) window.VendoUI.toast({ title: "3 Admin Alerts", desc: "1 Payout queue ready, 1 pending dispute, 1 new KYC submitted.", type: "info" });
        } else {
          if (window.VendoUI) window.VendoUI.toast({ title: "2 Store Updates", desc: "New order received for Linen Resort Shirt!", type: "success" });
        }
      });
    }

    // ---- User menu dropdown ----
    var trigger = document.getElementById("user-menu-trigger");
    var pop = document.getElementById("user-menu-pop");
    function closeUserMenu() {
      if (!pop || !trigger) return;
      pop.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
    }
    function toggleUserMenu() {
      if (!pop || !trigger) return;
      var open = !pop.hidden;
if (trigger) trigger.addEventListener("click", function (e) { e.stopPropagation(); toggleUserMenu(); });
    if (pop) {
      pop.addEventListener("click", function (e) {
        var t = e.target.closest("a, button");
        if (t && pop.contains(t)) closeUserMenu();
      });
    }
      if (open) closeUserMenu();
      else {
        pop.hidden = false;
        trigger.setAttribute("aria-expanded", "true");
        if (window.lucide) window.lucide.createIcons();
      }
    }
    if (trigger) trigger.addEventListener("click", function (e) { e.stopPropagation(); toggleUserMenu(); });
    document.addEventListener("click", function (e) {
      if (!pop || pop.hidden) return;
      if (e.target === trigger || (trigger && trigger.contains(e.target))) return;
      if (!pop.contains(e.target)) closeUserMenu();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeUserMenu();
    });
    var signout = document.getElementById("user-menu-signout");
// Defensive cleanup: remove orphan modal scrim/modal boxes left from a prior page
    document.querySelectorAll(".scrim").forEach(function (n) { n.remove(); });
    document.querySelectorAll(".modal").forEach(function (n) { n.remove(); });

    var burger = document.getElementById("nav-toggle");
    if (signout) signout.addEventListener("click", function () {
      try { if (window.VendoAuth && VendoAuth.signOut) VendoAuth.signOut(); } catch (e) {}
      closeUserMenu();
      if (window.VendoUI) window.VendoUI.toast({ title: "Signed out", desc: "You have been signed out safely.", type: "info" });
      setTimeout(function () { location.href = role === "admin" ? "../login.html" : "../customer/login.html"; }, 600);
    });

    var burger = document.getElementById("nav-toggle");
    if (burger && aside) {
      burger.addEventListener("click", function () { aside.classList.toggle("is-open"); });
    }

    if (!document.querySelector(".skip-link")) {
      var skip = document.createElement("a");
      skip.className = "skip-link";
      skip.href = "#main";
      skip.textContent = "Skip to content";
      document.body.prepend(skip);
    }

    if (window.lucide) window.lucide.createIcons();
  }

  function mountCustomer() {
    var current = file();
    var nav = document.getElementById("store-nav-actions");
    var cartCount = window.VendoCart ? window.VendoCart.count() : 0;
    var wishCount = window.VendoWish ? window.VendoWish.ids().length : 0;
    var isDark = document.documentElement.getAttribute("data-theme") === "dark";

    if (nav) {
      nav.innerHTML =
        '<a class="icon-btn" href="wishlist.html" aria-label="Wishlist" title="Wishlist" style="position:relative">' +
          '<i data-lucide="heart"></i>' +
          (wishCount > 0 ? '<span class="badge badge-cta" id="nav-wish-badge" style="position:absolute;top:6px;right:6px;padding:1px 5px;font-size:10px;min-width:16px;height:16px;border-radius:999px;justify-content:center">' + wishCount + '</span>' : '') +
        '</a>' +
        '<a class="icon-btn" href="notifications.html" aria-label="Notifications" title="Notifications" style="position:relative">' +
          '<i data-lucide="bell"></i>' +
          '<span class="unread-dot" style="position:absolute;top:10px;right:10px"></span>' +
        '</a>' +
        '<a class="icon-btn" href="cart.html" aria-label="Cart" title="Cart" style="position:relative">' +
          '<i data-lucide="shopping-bag"></i>' +
          '<span class="badge badge-cta cart-count-badge ' + (cartCount === 0 ? "hidden" : "") + '" style="position:absolute;top:6px;right:6px;padding:1px 5px;font-size:10px;min-width:16px;height:16px;border-radius:999px;justify-content:center">' + cartCount + '</span>' +
        '</a>' +
        '<button class="icon-btn" id="theme-toggle" type="button" aria-label="Toggle color theme" title="Toggle theme"><i data-lucide="' + (isDark ? "sun" : "moon") + '"></i></button>' +
        '<a class="icon-btn" href="profile.html" aria-label="Account" title="My Account"><i data-lucide="user"></i></a>';
    }

    var tabbar = document.getElementById("tabbar");
    if (tabbar) {
      var tabs = [
        ["home.html", "house", "Home"],
        ["reels.html", "clapperboard", "Reels"],
        ["live.html", "radio", "Live"],
        ["cart.html", "shopping-bag", "Bag"],
        ["profile.html", "user", "Account"]
      ];
      tabbar.innerHTML = tabs.map(function (t) {
        var active = t[0] === current ? " is-active" : "";
        var badgeHtml = "";
        if (t[0] === "cart.html" && cartCount > 0) {
          badgeHtml = '<span class="badge badge-cta cart-count-badge" style="position:absolute;top:4px;right:24%;padding:0 4px;font-size:9px;min-width:14px;height:14px;border-radius:999px">' + cartCount + '</span>';
        }
        return '<a href="' + t[0] + '" class="' + active + '" style="position:relative"><i data-lucide="' + t[1] + '"></i><span>' + t[2] + '</span>' + badgeHtml + '</a>';
      }).join("");
    }

    var t = document.getElementById("theme-toggle");
    if (t) {
      t.addEventListener("click", function () {
        var mode = window.VendoTheme.toggle();
        if (window.VendoUI) window.VendoUI.toast({ title: mode === "dark" ? "Dark mode active" : "Light mode active", desc: "Token-based theme." });
        if (window.lucide) window.lucide.createIcons();
      });
    }

    window.addEventListener("vendo-cart-updated", function (e) {
      var count = e.detail ? e.detail.count : (window.VendoCart ? window.VendoCart.count() : 0);
      document.querySelectorAll(".cart-count-badge").forEach(function (badge) {
        badge.textContent = count;
        badge.classList.toggle("hidden", count === 0);
      });
    });

    window.addEventListener("vendo-wish-updated", function (e) {
      var count = e.detail ? e.detail.count : (window.VendoWish ? window.VendoWish.ids().length : 0);
      var badge = document.getElementById("nav-wish-badge");
      if (badge) {
        badge.textContent = count;
        badge.classList.toggle("hidden", count === 0);
      }
    });

    if (!document.querySelector(".skip-link")) {
      var skip = document.createElement("a");
      skip.className = "skip-link";
      skip.href = "#main";
      skip.textContent = "Skip to content";
      document.body.prepend(skip);
    }

    if (window.lucide) window.lucide.createIcons();
  }

  return { mountDashboard: mountDashboard, mountCustomer: mountCustomer };
})();
