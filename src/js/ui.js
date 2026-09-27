window.VendoUI = (function () {
  function el(html) {
    var d = document.createElement("div");
    d.innerHTML = html.trim();
    return d.firstElementChild;
  }

  function toast(opts, desc, type) {
    if (typeof opts === "string") {
      opts = { title: opts, desc: desc, type: type || "info" };
    }
    opts = opts || {};
    var root = document.getElementById("toast-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "toast-root";
      document.body.appendChild(root);
    }
    while (root.children.length >= 3) root.firstChild.remove();
    var type = opts.type || "info";

    var iconName = "info";
    if (type === "success") iconName = "check-circle-2";
    if (type === "warning") iconName = "alert-triangle";
    if (type === "danger") iconName = "alert-circle";

    var node = el(
      '<div class="toast is-' + type + '">' +
        '<i data-lucide="' + iconName + '" style="flex-shrink:0;margin-top:2px;width:18px;height:18px"></i>' +
        '<div style="flex:1">' +
          '<div class="toast-title"></div>' +
          '<div class="toast-desc"></div>' +
        '</div>' +
        '<button class="icon-btn" style="width:28px;height:28px;margin:-4px -6px 0 0;color:var(--color-text-muted)" aria-label="Dismiss"><i data-lucide="x" style="width:14px;height:14px"></i></button>' +
      '</div>'
    );
    node.setAttribute("role", type === "danger" ? "alert" : "status");
    node.querySelector(".toast-title").textContent = opts.title || "Notification";
    node.querySelector(".toast-desc").textContent = opts.desc || "";
    root.appendChild(node);

    if (window.lucide) window.lucide.createIcons({ root: node });

    var ms = type === "danger" ? 10000 : type === "warning" ? 6000 : 4000;
    if (opts.sticky) ms = 1e9;
    var t = setTimeout(dismiss, ms);

    node.addEventListener("mouseenter", function () { clearTimeout(t); });
    node.addEventListener("mouseleave", function () { t = setTimeout(dismiss, 1500); });
    node.querySelector("button").addEventListener("click", dismiss);

    function dismiss() {
      node.classList.add("is-out");
      setTimeout(function () { node.remove(); }, 240);
    }
    return { dismiss: dismiss };
  }

  function setBusy(btn, busy, label) {
    if (!btn) return;
    if (busy) {
      if (!btn.dataset.minw) btn.dataset.minw = btn.offsetWidth + "px";
      btn.style.minWidth = btn.dataset.minw;
      btn.dataset.label = btn.innerHTML;
      btn.disabled = true;
      btn.setAttribute("aria-busy", "true");
      btn.innerHTML = '<span class="spin"></span>' + (label || "Please wait…");
    } else {
      btn.disabled = false;
      btn.removeAttribute("aria-busy");
      btn.style.minWidth = "";
      btn.innerHTML = btn.dataset.label || label || "Submit";
    }
  }

  function modal(opts) {
    opts = opts || {};
    var prev = document.activeElement;
    var scrim = el('<div class="scrim" tabindex="-1"></div>');
    var isDanger = opts.danger || false;
    var box = el(
      '<div class="modal" role="dialog" aria-modal="true">' +
        '<div class="flex-between mb-2">' +
          '<h2 class="h3" id="modal-title"></h2>' +
          '<button class="icon-btn" type="button" data-cancel aria-label="Close modal" style="margin:-8px -8px 0 0"><i data-lucide="x"></i></button>' +
        '</div>' +
        '<div class="secondary" id="modal-body" style="margin:12px 0 24px"></div>' +
        '<div class="flex gap-3" style="justify-content:flex-end">' +
          '<button class="btn btn-outline" type="button" data-cancel>Cancel</button>' +
          '<button class="btn ' + (isDanger ? "btn-danger" : "btn-cta") + '" type="button" data-ok></button>' +
        '</div>' +
      '</div>'
    );

    box.querySelector("#modal-title").textContent = opts.title || "Confirm Action";
    if (opts.htmlBody) {
      box.querySelector("#modal-body").innerHTML = opts.htmlBody;
    } else {
      box.querySelector("#modal-body").textContent = opts.body || "";
    }
    box.querySelector("[data-ok]").textContent = opts.ok || "Confirm";
    box.setAttribute("aria-labelledby", "modal-title");

    function close() {
      scrim.remove();
      box.remove();
      document.removeEventListener("keydown", onKey);
      if (prev && prev.focus) prev.focus();
    }

    function onKey(e) {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        var f = box.querySelectorAll("button, input, select, textarea");
        if (f.length < 2) return;
        if (e.shiftKey && document.activeElement === f[0]) {
          e.preventDefault();
          f[f.length - 1].focus();
        } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
          e.preventDefault();
          f[0].focus();
        }
      }
    }

    scrim.addEventListener("click", close);
    box.querySelectorAll("[data-cancel]").forEach(function (btn) {
      btn.addEventListener("click", close);
    });
    box.querySelector("[data-ok]").addEventListener("click", function () {
      if (opts.onOk) opts.onOk(box);
      close();
    });

    document.body.appendChild(scrim);
    document.body.appendChild(box);
    document.addEventListener("keydown", onKey);
    if (window.lucide) window.lucide.createIcons({ root: box });
    box.querySelector("[data-ok]").focus();
    return { close: close, el: box };
  }

  function dropzone(node, onFile) {
    if (!node) return;
    node.setAttribute("tabindex", "0");
    node.addEventListener("dragover", function (e) {
      e.preventDefault();
      node.classList.add("is-over");
    });
    node.addEventListener("dragleave", function () { node.classList.remove("is-over"); });
    node.addEventListener("drop", function (e) {
      e.preventDefault();
      node.classList.remove("is-over");
      var f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f && onFile) onFile(f);
    });
    node.addEventListener("click", function () {
      var input = document.createElement("input");
      input.type = "file";
      input.onchange = function () { if (input.files[0] && onFile) onFile(input.files[0]); };
      input.click();
    });
    node.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        node.click();
      }
    });
  }

  function productCard(p) {
    var hasWish = window.VendoWish && window.VendoWish.has(p.id);
    var wishClass = hasWish ? "is-active text-coral" : "";
    var original = p.originalPrice ? '<span class="caption" style="text-decoration:line-through;margin-left:6px;color:var(--color-text-muted)">$' + p.originalPrice + '</span>' : '';
    var ratingBadge = p.rating ? '<span class="caption" style="display:inline-flex;align-items:center;gap:3px"><i data-lucide="star" style="width:12px;height:12px;fill:currentColor;color:var(--p-amber-500)"></i> ' + p.rating + '</span>' : '';

    return (
      '<div class="card card-hover product-card" data-product-id="' + p.id + '">' +
        '<div class="thumb" style="position:relative">' +
          '<a href="product.html?id=' + p.id + '" style="display:block;width:100%;height:100%" aria-label="' + p.name + '">' +
            '<img src="' + p.img + '" alt="' + p.name + '" width="640" height="640" loading="lazy">' +
          '</a>' +
          '<button class="icon-btn wish-btn ' + wishClass + '" type="button" aria-label="Save to wishlist" data-wish-id="' + p.id + '" style="position:absolute;top:10px;right:10px;background:var(--glass-bg-heavy);backdrop-filter:blur(12px);border-radius:50%;width:36px;height:36px;color:#fff;border:1px solid rgba(255,255,255,0.15)">' +
            '<i data-lucide="heart" style="width:18px;height:18px;' + (hasWish ? 'fill:#f97316;color:#f97316' : '') + '"></i>' +
          '</button>' +
        '</div>' +
        '<div class="meta stack gap-1">' +
          '<div class="flex-between caption">' +
            '<span>' + p.vendor + '</span>' +
            ratingBadge +
          '</div>' +
          '<a href="product.html?id=' + p.id + '" style="color:inherit;text-decoration:none"><strong style="font-size:15px;line-height:20px;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden">' + p.name + '</strong></a>' +
          '<div class="flex-between" style="align-items:center;margin-top:6px">' +
            '<div class="price" style="font-size:18px">$' + p.price + original + '</div>' +
            '<button class="btn btn-sm btn-cta quick-buy-btn" data-buy-id="' + p.id + '" type="button" style="padding:0 12px;font-size:12px">Buy Now</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  // Global event delegation for product card buttons
  document.addEventListener("click", function (e) {
    var wishBtn = e.target.closest("[data-wish-id]");
    if (wishBtn) {
      e.preventDefault();
      var id = wishBtn.dataset.wishId;
      var added = window.VendoWish.toggle(id);
      var icon = wishBtn.querySelector("i, svg");
      if (icon) {
        icon.style.fill = added ? "#f97316" : "none";
        icon.style.color = added ? "#f97316" : "currentColor";
      }
      toast({
        title: added ? "Added to wishlist" : "Removed from wishlist",
        desc: "Manage your saved items anytime.",
        type: added ? "success" : "info"
      });
      return;
    }

    var buyBtn = e.target.closest("[data-buy-id]");
    if (buyBtn) {
      e.preventDefault();
      var pid = buyBtn.dataset.buyId;
      var prod = (window.VendoData.products || []).find(function (x) { return x.id === pid; });
      if (prod) {
        window.VendoCart.add(prod, 1);
        toast({
          title: "Added to Cart!",
          desc: prod.name + " · Redirecting to Checkout…",
          type: "success"
        });
        setTimeout(function () {
          location.href = "checkout.html";
        }, 350);
      }
      return;
    }
  });

  function mountIcons() {
    if (window.lucide) window.lucide.createIcons();
  }

  return {
    toast: toast,
    setBusy: setBusy,
    modal: modal,
    dropzone: dropzone,
    productCard: productCard,
    mountIcons: mountIcons
  };
})();
