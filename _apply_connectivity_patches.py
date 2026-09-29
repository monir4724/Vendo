"""
Vendo — Apply connectivity-fix patches (data layer only).

This script writes the missing cross-role links:

  1. VendoOrders.create() now also writes to a global, non-user-scoped
     registry (`vendo_orders_global`) so vendor pages can see customer
     orders placed on a different account.

  2. VendoOrders.updateStatus() mirrors the status change into the global
     registry so vendor-side reflects admin/customer status flips.

  3. VendoOrders gains `globalAll()` + `globalForVendor(vendorId)`
     helpers used by vendor/orders.html and admin/disputes.html.

  4. customer/checkout.html now fires TWO notifications on order creation:
       - customer-side "Order confirmed" notification (their own feed)
       - vendor-side "New incoming order" notification (vendor feed)

  5. vendor/orders.html now reads from the GLOBAL registry instead of
     the per-user one, and filters by the signed-in vendor id.

  6. admin/disputes.html + admin/payouts.html now read the GLOBAL
     registry so admin sees all orders, all customers, all vendors.

Run with:   python _apply_connectivity_patches.py
Idempotent — re-running is safe.
"""

import re
import sys
from pathlib import Path

ROOT = Path("E:/Project/Vendo") if Path("E:/Project/Vendo").exists() else Path(".")
DATA_JS = ROOT / "src" / "js" / "data.js"


# ---------------------------------------------------------------------------
# PATCH 1 — src/js/data.js: VendoOrders
# ---------------------------------------------------------------------------

def patch_data_js():
    if not DATA_JS.exists():
        print(f"[FAIL] {DATA_JS} not found")
        return False

    src = DATA_JS.read_text(encoding="utf-8")

    # Guard: skip if already patched
    if "vendo_orders_global" in src:
        print("[skip] src/js/data.js already has global registry")
        return True

    # --- Patch 1a: declare GLOBAL_KEY inside the IIFE
    src2 = src.replace(
        'window.VendoOrders = (function () {\n  var KEY = "vendo_orders_v2";',
        'window.VendoOrders = (function () {\n'
        '  var KEY = "vendo_orders_v2";\n'
        '  // Global, NON-user-scoped registry so vendor pages can see\n'
        '  // customer orders placed under a different account. Each entry\n'
        '  // carries a vendorId derived from the first cart item so vendor\n'
        '  // pages can filter by their own id.\n'
        '  var GLOBAL_KEY = "vendo_orders_global";'
    )
    if src2 == src:
        print("[FAIL] could not find VendoOrders IIFE opener")
        return False
    src = src2

    # --- Patch 1b: create() mirrors to global
    old = '    list.unshift(newOrder);\n    try { localStorage.setItem(scopedKey(), JSON.stringify(list)); } catch (e) {}\n    return newOrder;\n  }'
    new = (
        '    list.unshift(newOrder);\n'
        '    try { localStorage.setItem(scopedKey(), JSON.stringify(list)); } catch (e) {}\n'
        '\n'
        '    // Mirror into the GLOBAL, non-user-scoped registry so vendors\n'
        '    // can see orders from customers on a different account.\n'
        '    try {\n'
        '      var items = (newOrder.items || []);\n'
        '      if (items.length && !newOrder.vendorId) {\n'
        '        var firstPid = items[0].id;\n'
        '        var prod = (window.VendoData && window.VendoData.products || []).find(function (p) { return p.id === firstPid; });\n'
        '        newOrder.vendorId = (prod && prod.vendorId) || (items[0].vendorId) || "v_new";\n'
        '      }\n'
        '      var global = JSON.parse(localStorage.getItem(GLOBAL_KEY) || "[]");\n'
        '      if (!Array.isArray(global)) global = [];\n'
        '      global.unshift(newOrder);\n'
        '      if (global.length > 200) global = global.slice(0, 200);\n'
        '      localStorage.setItem(GLOBAL_KEY, JSON.stringify(global));\n'
        '      window.dispatchEvent(new CustomEvent("vendo-orders-global-updated", { detail: { order: newOrder } }));\n'
        '    } catch (e) {}\n'
        '    return newOrder;\n  }'
    )
    src2 = src.replace(old, new)
    if src2 == src:
        print("[FAIL] could not find create() body")
        return False
    src = src2

    # --- Patch 1c: updateStatus() mirrors to global
    old = (
        '  function updateStatus(id, newStatus) {\n'
        '    var list = all();\n'
        '    var found = list.find(function (o) { return o.id === id; });\n'
        '    if (found) {\n'
        '      found.status = newStatus;\n'
        '      try { localStorage.setItem(scopedKey(), JSON.stringify(list)); } catch (e) {}\n'
        '    }\n'
        '  }'
    )
    new = (
        '  function updateStatus(id, newStatus) {\n'
        '    var list = all();\n'
        '    var found = list.find(function (o) { return o.id === id; });\n'
        '    if (found) {\n'
        '      found.status = newStatus;\n'
        '      try { localStorage.setItem(scopedKey(), JSON.stringify(list)); } catch (e) {}\n'
        '    }\n'
        '    // Mirror to global registry so vendor-side reflects status flips.\n'
        '    try {\n'
        '      var global = JSON.parse(localStorage.getItem(GLOBAL_KEY) || "[]");\n'
        '      if (Array.isArray(global)) {\n'
        '        var g = global.find(function (o) { return o.id === id; });\n'
        '        if (g) {\n'
        '          g.status = newStatus;\n'
        '          localStorage.setItem(GLOBAL_KEY, JSON.stringify(global));\n'
        '          window.dispatchEvent(new CustomEvent("vendo-orders-global-updated", { detail: { id: id, status: newStatus } }));\n'
        '        }\n'
        '      }\n'
        '    } catch (e) {}\n'
        '  }\n'
        '\n'
        '  // Vendor-side: read all customer orders across ALL customers,\n'
        '  // optionally filtered to those that include this vendor\'s products.\n'
        '  function globalAll() {\n'
        '    try {\n'
        '      var saved = JSON.parse(localStorage.getItem(GLOBAL_KEY) || "[]");\n'
        '      if (saved && Array.isArray(saved)) return saved;\n'
        '    } catch (e) {}\n'
        '    return [];\n'
        '  }\n'
        '\n'
        '  function globalForVendor(vendorId) {\n'
        '    if (!vendorId) return globalAll();\n'
        '    return globalAll().filter(function (o) {\n'
        '      if (o.vendorId === vendorId) return true;\n'
        '      var items = (o.items || []);\n'
        '      for (var i = 0; i < items.length; i++) {\n'
        '        var pid = items[i].id;\n'
        '        var prod = (window.VendoData && window.VendoData.products || []).find(function (p) { return p.id === pid; });\n'
        '        if (prod && prod.vendorId === vendorId) return true;\n'
        '      }\n'
        '      return false;\n'
        '    });\n'
        '  }'
    )
    src2 = src.replace(old, new)
    if src2 == src:
        print("[FAIL] could not find updateStatus() body")
        return False
    src = src2

    # --- Patch 1d: export globalAll + globalForVendor
    old = "  return {\n    all: all,\n    get: get,\n    create: create,\n    updateStatus: updateStatus\n  };\n})();\n\nwindow.VendoKYC"
    new = (
        "  return {\n"
        "    all: all,\n"
        "    get: get,\n"
        "    create: create,\n"
        "    updateStatus: updateStatus,\n"
        "    globalAll: globalAll,\n"
        "    globalForVendor: globalForVendor\n"
        "  };\n"
        "})();\n"
        "\n"
        "// -------------------------------------------------------------------\n"
        "// VendoNotifBus — a global bus that fans out notifications to other\n"
        "// users' feeds when an order is placed (vendor-side \"incoming order\"\n"
        "// notification is published here even when the vendor isn't logged in).\n"
        "// -------------------------------------------------------------------\n"
        "window.VendoNotifBus = (function () {\n"
        "  var KEY = \"vendo_notif_bus_v1\";\n"
        "  function read() {\n"
        "    try {\n"
        "      var v = JSON.parse(localStorage.getItem(KEY) || \"[]\");\n"
        "      return Array.isArray(v) ? v : [];\n"
        "    } catch (e) { return []; }\n"
        "  }\n"
        "  function write(arr) {\n"
        "    try {\n"
        "      if (arr.length > 200) arr = arr.slice(0, 200);\n"
        "      localStorage.setItem(KEY, JSON.stringify(arr));\n"
        "    } catch (e) {}\n"
        "  }\n"
        "  function publish(notif, audienceUserId) {\n"
        "    audienceUserId = audienceUserId || null;\n"
        "    var arr = read();\n"
        "    arr.unshift(Object.assign({ time: \"Just now\", group: \"Today\", audience: audienceUserId }, notif));\n"
        "    write(arr);\n"
        "    window.dispatchEvent(new CustomEvent(\"vendo-notif-bus\", { detail: { notif: notif } }));\n"
        "  }\n"
        "  function forAudience(audienceUserId) {\n"
        "    return read().filter(function (n) {\n"
        "      return !n.audience || n.audience === audienceUserId;\n"
        "    });\n"
        "  }\n"
        "  function clear() {\n"
        "    write([]);\n"
        "  }\n"
        "  return { publish: publish, forAudience: forAudience, clear: clear, read: read };\n"
        "})();\n"
        "\n"
        "window.VendoKYC"
    )
    src2 = src.replace(old, new)
    if src2 == src:
        print("[FAIL] could not find VendoOrders return block")
        return False
    src = src2

    DATA_JS.write_text(src, encoding="utf-8")
    print(f"[OK]  src/js/data.js patched (global orders registry + notif bus)")
    return True


# ---------------------------------------------------------------------------
# PATCH 2 — public/customer/checkout.html
# Add: customer notification + vendor-side notif bus fire on order placement
# ---------------------------------------------------------------------------

def patch_checkout():
    p = ROOT / "public" / "customer" / "checkout.html"
    if not p.exists():
        return False
    src = p.read_text(encoding="utf-8")
    if "VendoNotifBus" in src and "vendo-orders-global-updated" in src:
        print("[skip] checkout.html already wired")
        return True

    # After VendoOrders.create(created) push a customer notification AND a
    # vendor-side notif-bus publish so vendor pages see it without sharing
    # localStorage scope.
    old = (
        '        var created = VendoOrders.create(orderPayload);\n'
        '        VendoCart.clear();'
    )
    new = (
        '        var created = VendoOrders.create(orderPayload);\n'
        '\n'
        '        // Customer-side confirmation notification\n'
        '        try {\n'
        '          if (window.VendoNotifications && VendoNotifications.push) {\n'
        '            VendoNotifications.push({\n'
        '              icon: "package",\n'
        '              title: "Order " + created.id + " confirmed",\n'
        '              desc: "Your order is being prepared by the vendor.",\n'
        '              time: "Just now",\n'
        '              unread: true\n'
        '            });\n'
        '          }\n'
        '        } catch (e) {}\n'
        '\n'
        '        // Vendor-side "incoming order" notification\n'
        '        try {\n'
        '          if (window.VendoNotifBus && VendoNotifBus.publish) {\n'
        '            VendoNotifBus.publish({\n'
        '              icon: "inbox",\n'
        '              title: "New order " + created.id,\n'
        '              desc: (created.customer || "Customer") + " — " + (created.items && created.items.length || 1) + " item(s)",\n'
        '              unread: true,\n'
        '              vendorId: created.vendorId || null\n'
        '            }, created.vendorId || null);\n'
        '          }\n'
        '        } catch (e) {}\n'
        '\n'
        '        VendoCart.clear();'
    )
    src2 = src.replace(old, new)
    if src2 == src:
        print("[FAIL] could not find checkout.html order creation")
        return False
    p.write_text(src2, encoding="utf-8")
    print(f"[OK]  customer/checkout.html patched (customer+vendor notifs on order)")
    return True


# ---------------------------------------------------------------------------
# PATCH 3 — public/vendor/orders.html
# Read from GLOBAL registry, filter by vendor id of signed-in user
# ---------------------------------------------------------------------------

def patch_vendor_orders():
    p = ROOT / "public" / "vendor" / "orders.html"
    if not p.exists():
        return False
    src = p.read_text(encoding="utf-8")
    if "globalForVendor" in src:
        print("[skip] vendor/orders.html already reads global registry")
        return True

    old = 'var allOrders = VendoOrders.all();'
    new = (
        '// Cross-role link: read from the global registry so vendor pages\n'
        '// see orders placed by ANY customer, then filter to this vendor.\n'
        'var _signedInVendorId = (window.VendoAuth && VendoAuth.getUser && (VendoAuth.getUser().vendorId || VendoAuth.getUser().id)) || "v_new";\n'
        'var allOrders = (VendoOrders.globalForVendor ? VendoOrders.globalForVendor(_signedInVendorId) : VendoOrders.all());'
    )
    src2 = src.replace(old, new)
    if src2 == src:
        print("[FAIL] could not find vendor/orders.html body")
        return False

    # Also listen for global updates so the table refreshes when customer
    # checkout fires its CustomEvent.
    if 'vendo-orders-global-updated' not in src2:
        # Insert subscribe before the final </script>
        src2 = src2.replace(
            '</script>',
            '    window.addEventListener("vendo-orders-global-updated", renderOrders);\n'
            '    window.addEventListener("vendo-notif-bus", renderOrders);\n'
            '  </script>',
            1,
        )
        if '</script>' in src2:
            src2 = src2.replace('</script>\n</body>', '  </script>\n</body>', 1)

    p.write_text(src2, encoding="utf-8")
    print(f"[OK]  vendor/orders.html patched (reads global + subscribes)")
    return True


# ---------------------------------------------------------------------------
# PATCH 4 — public/vendor/messages.html
# Render the notif bus so vendor sees incoming-order pings as toast
# ---------------------------------------------------------------------------

def patch_vendor_messages():
    p = ROOT / "public" / "vendor" / "messages.html"
    if not p.exists():
        return False
    src = p.read_text(encoding="utf-8")
    if "vendo-notif-bus" in src:
        print("[skip] vendor/messages.html already listens to bus")
        return True

    # Inject a listener that turns incoming bus notifs into toast + log
    insert = (
        "\n    // Cross-role: incoming customer-order notification bus\n"
        "    if (window.VendoNotifBus) {\n"
        "      window.addEventListener(\"vendo-notif-bus\", function (e) {\n"
        "        var n = (e && e.detail && e.detail.notif) || {};\n"
        "        if (window.VendoUI && VendoUI.toast) {\n"
        "          VendoUI.toast({ title: n.title || \"New order\", desc: n.desc || \"\", type: \"info\" });\n"
        "        }\n"
        "      });\n"
        "    }\n"
    )
    # Insert just before closing </script>
    src2 = src.replace("</script>", insert + "  </script>", 1)
    if src2 == src:
        print("[FAIL] could not find vendor/messages.html </script>")
        return False
    p.write_text(src2, encoding="utf-8")
    print(f"[OK]  vendor/messages.html patched (notif bus listener)")
    return True


# ---------------------------------------------------------------------------
# PATCH 5 — public/admin/disputes.html + admin/payouts.html
# Read global registry so admin sees ALL orders from ALL customers
# ---------------------------------------------------------------------------

def patch_admin_admin_views():
    targets = [
        ("public/admin/disputes.html", "VendoOrders.all"),
        ("public/admin/payouts.html", "VendoOrders.all"),
        ("public/admin/dashboard.html", None),  # dashboard uses summary counters
    ]
    for rel, needle in targets:
        p = ROOT / rel
        if not p.exists():
            continue
        src = p.read_text(encoding="utf-8")
        if "globalAll" in src:
            print(f"[skip] {rel} already reads globalAll")
            continue

        if needle:
            new = src.replace(needle, "VendoOrders.globalAll ? VendoOrders.globalAll() : VendoOrders.all()")
            if new != src:
                p.write_text(new, encoding="utf-8")
                print(f"[OK]  {rel} now reads globalAll")


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def main():
    ok = True
    for fn in (
        patch_data_js,
        patch_checkout,
        patch_vendor_orders,
        patch_vendor_messages,
        patch_admin_admin_views,
    ):
        try:
            if not fn():
                ok = False
        except Exception as e:
            print(f"[FAIL] {fn.__name__}: {e}")
            ok = False

    print()
    print("=== Summary ===")
    print("Connectivity patches applied." if ok else "Some patches failed — check above.")
    print()
    print("What was wired up:")
    print("  R2 customer-checkout  -> vendor-orders via vendo_orders_global")
    print("  R2 customer-checkout  -> customer-notifications (VendoNotifications.push)")
    print("  R2 customer-checkout  -> vendor-toast via VendoNotifBus")
    print("  R7 vendor orders.html subscribes to global updates")
    print("  Admin disputes/payouts now read all-customer global registry")
    print()
    print("Next steps:")
    print("  1. python _e2e_graph.py        # confirms 0 R2/R3/R7 errors")
    print("  2. open http://127.0.0.1:5500/_graph_report.html")
    print("  3. sign in as customer -> place order -> check vendor /orders page")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
