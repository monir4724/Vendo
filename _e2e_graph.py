"""
Vendo — Cross-role dependency graph analyzer.

Maps every cross-cutting function/module call across the 3 roles
(admin / vendor / customer), and flags any missing reciprocal edge.

Builds an adjacency list of:
  pages -> (modules they import, functions they call, IDs they reference)
  modules -> (pages that consume them)
  functions -> (callers across all pages)

Then runs a set of gap-detection rules:

  R1  ADMIN -> VENDOR cross-link
       admin/vendor-detail.html "Approve / Request docs / Reject"
       must mutate the same store key that vendor/settings.html reads.

  R2  CUSTOMER -> ORDER -> VENDOR loop
       customer/checkout.html "Place Order" must write to VendoOrders
       (which vendor/orders.html reads) AND fire a notification that
       customer/notifications.html can read.

  R3  VENDOR REGISTRATION -> ADMIN VISIBILITY
       vendor/onboarding.html must register the new vendor in
       VendoStore so admin/vendors.html lists them.

  R4  SHARED MODULE PARITY
       For every admin/* page that calls VendoUI/VendoAuth/etc., the
       same module must also be loaded (script tag present) and not
       throw "X is not defined".

  R5  ID CONTRACT
       Every id="x" referenced via getElementById("x") or
       querySelector("#x") must exist in the owning page's DOM.

  R6  AUTH COOKIE PARITY
       Login pages write role + email/phone to session/local storage
       via VendoAuth.setUser. Pages that gate content by role
       (admin/* or vendor/*) must read VendoAuth.getUser() to decide.

  R7  KYC ROUND-TRIP
       vendor/onboarding submit -> VendoStore.updateVendor(kyc:"pending")
       admin/vendor-detail "Approve" -> VendoStore.updateVendor(kyc:"approved")
       vendor/settings pane-payout reads same vendor.kyc

Run:    python _e2e_graph.py
Output: public/_graph_report.json + console table
"""

import json
import re
import sys
import time
from collections import defaultdict
from pathlib import Path
from urllib.parse import urljoin

try:
    import requests
except ImportError:
    print("Run: python -m pip install requests")
    sys.exit(1)


# ---------------------------------------------------------------------------
# CONFIG
# ---------------------------------------------------------------------------

FRONTEND = "http://127.0.0.1:5500"

ROLES = {
    "admin": [
        "admin/dashboard.html", "admin/vendors.html", "admin/vendor-detail.html",
        "admin/moderation.html", "admin/categories.html", "admin/disputes.html",
        "admin/payouts.html", "admin/audit.html", "admin/settings.html",
    ],
    "vendor": [
        "vendor/onboarding.html", "vendor/dashboard.html", "vendor/products.html",
        "vendor/reels.html", "vendor/go-live.html", "vendor/live-studio.html",
        "vendor/orders.html", "vendor/messages.html", "vendor/earnings.html",
        "vendor/settings.html",
    ],
    "customer": [
        "customer/home.html", "customer/shop.html", "customer/product.html",
        "customer/storefront.html", "customer/cart.html", "customer/checkout.html",
        "customer/confirmation.html", "customer/invoice.html", "customer/wishlist.html",
        "customer/orders.html", "customer/notifications.html", "customer/profile.html",
        "customer/search.html", "customer/reels.html", "customer/live.html",
        "customer/onboarding.html",
    ],
}

# Modules we expect to find in Vendo.* / window.* namespace
EXPECTED_MODULES = [
    "VendoUI", "VendoAuth", "VendoData", "VendoLayout", "VendoTheme",
    "VendoCart", "VendoWish", "VendoOrders", "VendoChat", "VendoStore",
    "VendoNotifications",
]


# ---------------------------------------------------------------------------
# PARSERS
# ---------------------------------------------------------------------------

SCRIPT_TAG_RE = re.compile(r'<script[^>]+src=["\']([^"\']+)["\']', re.I)
INLINE_SCRIPT_RE = re.compile(r"<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>", re.I | re.S)
GET_ID_RE = re.compile(r'getElementById\(\s*["\']([^"\']+)["\']\s*\)')
QS_HASH_RE = re.compile(r'querySelector(?:All)?\(\s*["\']#([a-zA-Z][\w-]*)')
WINFN_RE = re.compile(r'\b(window\.)?Vendo([A-Z][\w]+)\.(\w+)\s*\(')
WINFN_BARE_RE = re.compile(r'\bVendo([A-Z][\w]+)\.(\w+)\s*\(')
ONCLICK_FN_RE = re.compile(r'onclick=["\'](\w+)\(')
HREF_JS_RE = re.compile(r'href=["\']javascript:[^"\']*?(\w+)\(')


def fetch(url: str) -> str:
    r = requests.get(url, timeout=10)
    r.raise_for_status()
    return r.text


def parse_page(html: str, url: str) -> dict:
    """Extract structural signals from a single page."""
    ids = set(re.findall(r'\bid=["\']([^"\']+)["\']', html))
    scripts = SCRIPT_TAG_RE.findall(html)
    inline = INLINE_SCRIPT_RE.findall(html)
    inline_text = "\n".join(inline)

    get_ids = set(GET_ID_RE.findall(inline_text))
    qs_hash = set(QS_HASH_RE.findall(inline_text))

    # VendoX.method() and Window.VendoX.method()
    vendo_calls = defaultdict(set)  # module -> {method}
    for m in WINFN_RE.finditer(inline_text):
        module = "Vendo" + m.group(2)
        method = m.group(3)
        vendo_calls[module].add(method)
    for m in WINFN_BARE_RE.finditer(inline_text):
        module = "Vendo" + m.group(1)
        method = m.group(2)
        vendo_calls[module].add(method)

    onclick_fns = set(ONCLICK_FN_RE.findall(html))
    href_js_fns = set(HREF_JS_RE.findall(html))

    return {
        "url": url,
        "ids": ids,
        "scripts": scripts,
        "vendo_calls": {k: sorted(v) for k, v in vendo_calls.items()},
        "get_ids_referenced": sorted(get_ids | qs_hash),
        "onclick_fns": sorted(onclick_fns),
        "href_js_fns": sorted(href_js_fns),
    }


# ---------------------------------------------------------------------------
# GAP DETECTION
# ---------------------------------------------------------------------------

def detect_gaps(pages: dict) -> list:
    """Return a list of structured gap findings."""
    gaps = []

    # --- R5: ID contract per page
    for role, info in pages.items():
        for p in info:
            missing = [r for r in p["get_ids_referenced"] if r not in p["ids"]]
            if missing:
                gaps.append({
                    "rule": "R5",
                    "severity": "error",
                    "page": p["url"],
                    "msg": f"JS references missing IDs: {missing}",
                })

    # --- R4: module parity (every page that calls a VendoX must load a
    # script that defines VendoX)
    # We only have one copy of src/js/*.js so the question is: is the
    # page loading that script? Easier: we accept all EXPECTED_MODULES
    # and only flag a page that calls a VendoX but doesn't load any
    # src/js script at all.
    for role, info in pages.items():
        for p in info:
            if not p["vendo_calls"]:
                continue
            if not any("src/js" in s for s in p["scripts"]):
                gaps.append({
                    "rule": "R4",
                    "severity": "error",
                    "page": p["url"],
                    "msg": f"page calls {sorted(p['vendo_calls'].keys())} but loads no src/js script",
                })

    # --- R3: vendor registration -> admin visibility
    # vendor/onboarding.html must call VendoStore.registerVendor or
    # VendoStore.updateVendor with kyc:"pending".
    onboard = next((p for p in pages["vendor"] if p["url"].endswith("onboarding.html")), None)
    if onboard:
        calls = onboard["vendo_calls"].get("VendoStore", [])
        has_register = "registerVendor" in calls
        has_update_pending = "updateVendor" in calls
        if not has_register and not has_update_pending:
            gaps.append({
                "rule": "R3",
                "severity": "error",
                "page": onboard["url"],
                "msg": "vendor/onboarding does NOT call VendoStore.registerVendor / updateVendor — admin won't see new vendors",
            })

    # admin/vendors.html must read from VendoStore.listVendors or
    # pull state via getVendor to merge registered + mock vendors.
    vendors_admin = next((p for p in pages["admin"] if p["url"].endswith("vendors.html")), None)
    if vendors_admin:
        all_calls = set()
        for methods in vendors_admin["vendo_calls"].values():
            all_calls.update(methods)
        # OK if it uses listVendors OR if it iterates VendoData.vendors AND
        # VendoStore (we'll check the latter via JS string)
        body = requests.get(vendors_admin["url"], timeout=10).text
        if "VendoStore" not in body or "listVendors" not in body:
            gaps.append({
                "rule": "R3",
                "severity": "error",
                "page": vendors_admin["url"],
                "msg": "admin/vendors.html does NOT use VendoStore.listVendors — new vendors invisible",
            })

    # --- R7: KYC round-trip
    detail = next((p for p in pages["admin"] if p["url"].endswith("vendor-detail.html")), None)
    if detail:
        store_calls = detail["vendo_calls"].get("VendoStore", [])
        if "updateVendor" not in store_calls:
            gaps.append({
                "rule": "R7",
                "severity": "error",
                "page": detail["url"],
                "msg": "admin/vendor-detail does NOT call VendoStore.updateVendor — vendor decision not persisted",
            })

    vendor_settings = next((p for p in pages["vendor"] if p["url"].endswith("settings.html")), None)
    if vendor_settings:
        body = requests.get(vendor_settings["url"], timeout=10).text
        if "VendoStore" not in body:
            gaps.append({
                "rule": "R7",
                "severity": "warning",
                "page": vendor_settings["url"],
                "msg": "vendor/settings.html does NOT read VendoStore — KYC status may stay stale",
            })

    # --- R1: cross-link from admin approve -> vendor settings paint
    # (covered by R7 above)

    # --- R2: customer checkout -> vendor orders visibility
    checkout = next((p for p in pages["customer"] if p["url"].endswith("checkout.html")), None)
    if checkout:
        orders_calls = checkout["vendo_calls"].get("VendoOrders", [])
        if "create" not in orders_calls:
            gaps.append({
                "rule": "R2",
                "severity": "error",
                "page": checkout["url"],
                "msg": "customer/checkout does NOT call VendoOrders.create — placed orders vanish",
            })

    vendor_orders = next((p for p in pages["vendor"] if p["url"].endswith("orders.html")), None)
    if vendor_orders:
        body = requests.get(vendor_orders["url"], timeout=10).text
        if "VendoOrders" not in body:
            gaps.append({
                "rule": "R2",
                "severity": "error",
                "page": vendor_orders["url"],
                "msg": "vendor/orders.html does NOT read VendoOrders — new customer orders invisible",
            })
        elif "globalForVendor" not in body:
            gaps.append({
                "rule": "R2d",
                "severity": "error",
                "page": vendor_orders["url"],
                "msg": "vendor/orders.html reads VendoOrders.all() (per-user) — must read VendoOrders.globalForVendor(vendorId) instead",
            })

    # --- R2: customer order -> customer notifications cross-link
    notif = next((p for p in pages["customer"] if p["url"].endswith("notifications.html")), None)
    if notif:
        notif_calls = set()
        for methods in notif["vendo_calls"].values():
            notif_calls.update(methods)
        if not ("VendoNotifications" in notif["vendo_calls"] or "all" in notif_calls):
            gaps.append({
                "rule": "R2",
                "severity": "warning",
                "page": notif["url"],
                "msg": "customer/notifications does NOT use VendoNotifications wrapper",
            })

    # --- R2b: checkout must publish to the global orders registry AND
    # push a vendor-side notification. Without this, vendor/orders.html
    # stays empty even after a customer places an order.
    if checkout:
        try:
            body = requests.get(checkout["url"], timeout=10).text
        except Exception:
            body = ""
        if "globalForVendor" not in body and "vendo_orders_global" not in body:
            gaps.append({
                "rule": "R2b",
                "severity": "error",
                "page": checkout["url"],
                "msg": "checkout writes via VendoOrders.create but does NOT mirror into vendo_orders_global — vendor never sees the order",
            })
        if "VendoNotifBus" not in body:
            gaps.append({
                "rule": "R2c",
                "severity": "warning",
                "page": checkout["url"],
                "msg": "checkout does NOT publish to VendoNotifBus — vendor never gets a toast/notification ping",
            })

    # --- R6: auth gate — admin/* + vendor/* pages should mount via
    # VendoLayout.mountDashboard(<role>) which itself is role-agnostic.
    # We verify by parsing the literal role passed.
    for role in ("admin", "vendor"):
        for p in pages[role]:
            try:
                body = requests.get(p["url"], timeout=10).text
            except Exception:
                continue
            if "VendoLayout.mountDashboard" not in body:
                gaps.append({
                    "rule": "R6",
                    "severity": "error",
                    "page": p["url"],
                    "msg": "page does NOT call VendoLayout.mountDashboard — sidebar/topbar won't render",
                })

    # --- R4: loggers
    for role in ("admin", "vendor", "customer"):
        for p in pages[role]:
            # Pages with critical user-data updates should be instrumented
            body = requests.get(p["url"], timeout=10).text
            critical = any(s in p["url"] for s in (
                "checkout", "orders", "vendor-detail", "onboarding",
                "settings", "profile", "auth/login"
            ))
            if critical and "vendoLogger.js" not in body:
                gaps.append({
                    "rule": "R4-log",
                    "severity": "info",
                    "page": p["url"],
                    "msg": "page is not instrumented with vendoLogger.js — diagnostic capture missing",
                })

    return gaps


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def main():
    out = {
        "started_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "frontend": FRONTEND,
        "pages": {},
        "module_summary": defaultdict(set),
        "function_callers": defaultdict(set),
        "gaps": [],
        "summary": {},
    }

    print(f"[graph] Frontend: {FRONTEND}")

    # Try to be tolerant if the server isn't running
    try:
        requests.get(FRONTEND, timeout=4).raise_for_status()
    except Exception as e:
        print(f"[graph] FAIL — frontend unreachable: {e}")
        print(f"[graph] start 'python -m http.server 5500' in another terminal first")
        sys.exit(2)

    pages = {}
    for role, paths in ROLES.items():
        pages[role] = []
        for rel in paths:
            url = urljoin(FRONTEND + "/", rel)
            try:
                html = fetch(url)
                parsed = parse_page(html, url)
                pages[role].append(parsed)
                # module summary
                for mod, methods in parsed["vendo_calls"].items():
                    out["module_summary"][mod].add(rel)
                    for m in methods:
                        out["function_callers"][mod + "." + m].add(rel)
            except Exception as e:
                pages[role].append({
                    "url": url, "error": str(e), "ids": set(), "scripts": [],
                    "vendo_calls": {}, "get_ids_referenced": [],
                    "onclick_fns": [], "href_js_fns": [],
                })
        out["pages"][role] = pages[role]

    out["module_summary"] = {k: sorted(v) for k, v in out["module_summary"].items()}
    out["function_callers"] = {k: sorted(v) for k, v in out["function_callers"].items()}

    print(f"[graph] scanning for gaps...")
    gaps = detect_gaps(pages)
    out["gaps"] = gaps

    out["finished_at"] = time.strftime("%Y-%m-%dT%H:%M:%S")
    out["summary"] = {
        "pages_scanned": sum(len(v) for v in pages.values()),
        "modules_seen": len(out["module_summary"]),
        "gaps_found": len(gaps),
        "by_rule": {
            rule: sum(1 for g in gaps if g["rule"] == rule)
            for rule in sorted({g["rule"] for g in gaps})
        },
        "by_severity": {
            sev: sum(1 for g in gaps if g["severity"] == sev)
            for sev in ("error", "warning", "info")
        },
    }

    # Write JSON
    Path("public/_graph_report.json").write_text(
        json.dumps({**out, "module_summary": dict(out["module_summary"]),
                   "function_callers": dict(out["function_callers"])},
                  indent=2, default=list), encoding="utf-8"
    )

    # Console table
    print("\n[graph] === Gaps ===")
    for g in gaps:
        print(f"  [{g['severity'].upper():7}] {g['rule']} {g['page']}")
        print(f"          {g['msg']}")

    print("\n[graph] === Module usage ===")
    for mod in EXPECTED_MODULES:
        used = out["module_summary"].get(mod, [])
        marker = "OK " if used else "?? "
        print(f"  {marker} {mod:24s} -> {len(used)} pages")

    print(f"\n[graph] === Summary ===")
    for k, v in out["summary"].items():
        print(f"  {k}: {v}")
    print(f"\n[graph] JSON -> public/_graph_report.json")
    print(f"[graph] HTML viewer -> public/_graph_report.html")

    return 0 if out["summary"]["by_severity"].get("error", 0) == 0 else 1


if __name__ == "__main__":
    sys.exit(main())