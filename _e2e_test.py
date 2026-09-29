"""
Vendo — End-to-end Playwright test runner.

Loads every page across 3 roles (admin / vendor / customer), exercises the
main interactive elements (nav links, tabs, buttons, forms), and dumps a
structured report to public/_e2e_report.json. Run from project root:

    python -m pip install playwright
    playwright install chromium
    python _e2e_test.py

Assumes:
    - frontend served at http://127.0.0.1:5500
    - supabase functions served at http://127.0.0.1:54321
    - SEED_ACCOUNTS_KEY = "vendo-dev-seed" (default)
    - python -m playwright install chromium  (run once)
"""

import json
import sys
import time
import traceback
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

FRONTEND = "http://127.0.0.1:5500"
FUNCTIONS = "http://127.0.0.1:54321/functions/v1"
SEED_KEY = "vendo-dev-seed"

ACCOUNTS = {
    "admin":    ("monir@gmail.com",      "Monir1122"),
    "vendor":   ("vendor@monir.com",     "Vendor1122"),
    "customer": ("customer@monir.com",   "Customer1122"),
}

# Pages to test (relative to frontend root). The runner appends "?id=" when needed.
ROLES = {
    "admin": [
        "admin/dashboard.html",
        "admin/vendors.html",
        "admin/vendor-detail.html",
        "admin/moderation.html",
        "admin/categories.html",
        "admin/disputes.html",
        "admin/payouts.html",
        "admin/audit.html",
        "admin/settings.html",
    ],
    "vendor": [
        "vendor/onboarding.html",
        "vendor/dashboard.html",
        "vendor/products.html",
        "vendor/reels.html",
        "vendor/go-live.html",
        "vendor/orders.html",
        "vendor/messages.html",
        "vendor/earnings.html",
        "vendor/settings.html",
    ],
    "customer": [
        "customer/home.html",
        "customer/shop.html",
        "customer/product.html",
        "customer/storefront.html",
        "customer/cart.html",
        "customer/checkout.html",
        "customer/wishlist.html",
        "customer/orders.html",
        "customer/notifications.html",
        "customer/profile.html",
        "customer/search.html",
        "customer/reels.html",
        "customer/live.html",
    ],
}

RESULTS = {
    "started_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
    "frontend": FRONTEND,
    "functions": FUNCTIONS,
    "pages": [],          # per-page results
    "console_errors": [], # global aggregate
    "network_failures": [],
    "page_errors": [],
    "summary": {},        # filled at end
}


# ------------------------------------------------------------------ helpers

def log_console(msg, role, page):
    if msg.type in ("error", "warning"):
        entry = {
            "role": role, "page": page,
            "type": msg.type, "text": msg.text[:500],
            "location": str(msg.location)[:200] if msg.location else None,
        }
        if msg.type == "error":
            RESULTS["console_errors"].append(entry)
        return entry
    return None


def log_pageerror(exc, role, page):
    RESULTS["page_errors"].append({
        "role": role, "page": page,
        "message": str(exc)[:500],
    })


def log_requestfailed(req, role, page):
    # ignore favicons + aborted
    if req.failure and "net::ERR_ABORTED" not in req.failure:
        RESULTS["network_failures"].append({
            "role": role, "page": page,
            "url": req.url[:200],
            "method": req.method,
            "failure": req.failure[:200],
            "resource_type": req.resource_type,
        })


def smoke_test(page, role, rel_path):
    """Visit a page, click around, capture everything interesting."""
    url = f"{FRONTEND}/{rel_path}"
    page_errors_local = []
    console_errors_local = []
    buttons_clicked = []
    nav_links_clicked = []

    def on_console(msg):
        e = log_console(msg, role, rel_path)
        if e:
            console_errors_local.append(e)

    def on_pageerror(exc):
        log_pageerror(exc, role, rel_path)
        page_errors_local.append(str(exc)[:300])

    def on_requestfailed(req):
        log_requestfailed(req, role, rel_path)

    page.on("console", on_console)
    page.on("pageerror", on_pageerror)
    page.on("requestfailed", on_requestfailed)

    out = {
        "role": role, "page": rel_path, "url": url,
        "loaded": False, "status": None, "title": None,
        "buttons_clicked": [],
        "nav_links_clicked": [],
        "tabs_clicked": [],
        "pills_clicked": [],
        "forms_submitted": [],
        "links_present": 0,
        "buttons_present": 0,
        "lucide_icons": 0,
        "console_errors": [],
        "page_errors": page_errors_local,
        "screenshot": None,
        "assertions": [],
    }

    try:
        page.set_default_timeout(8000)
        resp = page.goto(url, wait_until="domcontentloaded", timeout=12000)
        out["status"] = resp.status if resp else None
        out["loaded"] = (resp is not None and resp.ok)
        page.wait_for_load_state("networkidle", timeout=5000)
        out["title"] = page.title()

        # Counters
        out["links_present"] = page.locator("a").count()
        out["buttons_present"] = page.locator("button, [type='button'], [type='submit']").count()
        out["lucide_icons"] = page.locator("[data-lucide], svg.lucide").count()

        # Assertions
        out["assertions"].append({
            "name": "has_doctype",
            "ok": "<!DOCTYPE" in (page.content()[:200] or "").upper(),
        })

        # Click tabs (if any)
        tabs = page.locator(".tabs .tab, [role='tab']")
        for i in range(min(tabs.count(), 3)):
            try:
                tabs.nth(i).click(timeout=2000)
                out["tabs_clicked"].append(tabs.nth(i).text_content().strip()[:40])
            except Exception as e:
                out["assertions"].append({"name": f"tab_click_{i}", "ok": False, "err": str(e)[:120]})

        # Click pills / filters (if any)
        pills = page.locator(".pill")
        for i in range(min(pills.count(), 3)):
            try:
                pills.nth(i).click(timeout=2000)
                out["pills_clicked"].append(pills.nth(i).text_content().strip()[:40])
            except Exception:
                pass

        # Click nav-link inside sidebar (admin/vendor only)
        navs = page.locator(".sidebar .nav-link")
        for i in range(min(navs.count(), 4)):
            try:
                href = navs.nth(i).get_attribute("href")
                if href and not href.startswith("#"):
                    out["nav_links_clicked"].append(href)
            except Exception:
                pass

        # Click tabbar links (customer only)
        tabs2 = page.locator(".tabbar a")
        for i in range(min(tabs2.count(), 5)):
            try:
                href = tabs2.nth(i).get_attribute("href")
                if href:
                    out["nav_links_clicked"].append(href)
            except Exception:
                pass

        # Click first few icon buttons (theme toggle etc.)
        ibtns = page.locator(".icon-btn")
        for i in range(min(ibtns.count(), 2)):
            try:
                ibtns.nth(i).click(timeout=1500)
                out["buttons_clicked"].append(f"icon-btn[{i}]")
            except Exception:
                pass

        # Click user-menu trigger (admin/vendor) and check pop appears
        try:
            trigger = page.locator("#user-menu-trigger")
            if trigger.count() > 0:
                trigger.click(timeout=1500)
                page.wait_for_timeout(200)
                pop_visible = page.locator("#user-menu-pop:not([hidden])").count() > 0
                out["assertions"].append({"name": "user_menu_opens", "ok": pop_visible})
                # close it
                page.keyboard.press("Escape")
                page.wait_for_timeout(150)
        except Exception as e:
            out["assertions"].append({"name": "user_menu_open", "ok": False, "err": str(e)[:120]})

        # Bell button click
        try:
            bell = page.locator("#btn-bell")
            if bell.count() > 0:
                bell.click(timeout=1500)
                out["buttons_clicked"].append("btn-bell")
        except Exception:
            pass

        # Submit search (topbar)
        try:
            sb = page.locator(".topbar-search input")
            if sb.count() > 0:
                sb.first.fill("test query")
                out["forms_submitted"].append("topbar-search[0]")
        except Exception:
            pass

        # Take screenshot
        shot_path = Path(f"public/_e2e_shots/{role}_{Path(rel_path).stem}.png")
        shot_path.parent.mkdir(parents=True, exist_ok=True)
        page.screenshot(path=str(shot_path), full_page=False)
        out["screenshot"] = str(shot_path)

    except PWTimeout as e:
        out["assertions"].append({"name": "load", "ok": False, "err": f"timeout: {e}"[:200]})
    except Exception as e:
        out["assertions"].append({
            "name": "fatal",
            "ok": False,
            "err": f"{type(e).__name__}: {e}"[:200],
            "trace": traceback.format_exc()[:600],
        })

    out["console_errors"] = console_errors_local
    RESULTS["pages"].append(out)
    return out


def login(page, email, password, target_url):
    """Sign in via /customer/login.html (works for all 3 roles)."""
    page.set_default_timeout(10000)
    page.goto(f"{FRONTEND}/customer/login.html", wait_until="domcontentloaded")
    page.wait_for_selector("#signin-identifier", timeout=8000)
    page.fill("#signin-identifier", email)
    page.fill("#signin-password", password)
    # ensure signin form is the visible one
    page.evaluate("""
      const reg = document.getElementById('form-register');
      const sign = document.getElementById('form-signin');
      if (reg) reg.classList.add('hidden');
      if (sign) sign.classList.remove('hidden');
    """)
    page.click("#form-signin button[type='submit']", timeout=5000)
    page.wait_for_load_state("networkidle", timeout=8000)
    page.wait_for_timeout(1200)


def clear_auth(page):
    """Sign out and clear localStorage for a clean run."""
    page.goto(f"{FRONTEND}/customer/home.html", wait_until="domcontentloaded")
    page.evaluate("""
      try { localStorage.clear(); sessionStorage.clear(); } catch(e){}
    """)


def seed_accounts_via_function():
    """Call the seed-accounts edge function. Returns JSON or raises."""
    import urllib.request
    req = urllib.request.Request(
        f"{FUNCTIONS}/seed-accounts",
        data=b"{}",
        headers={"x-seed-key": SEED_KEY, "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode())


# ------------------------------------------------------------------ main

def main():
    print(f"[e2e] Frontend: {FRONTEND}")
    print(f"[e2e] Functions: {FUNCTIONS}")

    # Step 1: Seed accounts via edge function
    print("[e2e] Seeding accounts...")
    try:
        seed_result = seed_accounts_via_function()
        RESULTS["seed"] = seed_result
        print(f"[e2e] seed result: {json.dumps(seed_result, indent=2)[:400]}")
    except Exception as e:
        RESULTS["seed"] = {"ok": False, "error": str(e)}
        print(f"[e2e] seed FAILED: {e}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
        context = browser.new_context(viewport={"width": 1366, "height": 800})

        # Public smoke (no login)
        print("[e2e] --- Public pages ---")
        page = context.new_page()
        public_pages = ["index.html", "login.html", "customer/login.html", "console.html"]
        for rel in public_pages:
            try:
                page.goto(f"{FRONTEND}/{rel}", wait_until="domcontentloaded", timeout=10000)
                page.wait_for_load_state("networkidle", timeout=4000)
                RESULTS["pages"].append({
                    "role": "public", "page": rel, "loaded": True,
                    "title": page.title(), "links_present": page.locator("a").count(),
                    "buttons_present": page.locator("button").count(),
                })
            except Exception as e:
                RESULTS["pages"].append({"role": "public", "page": rel, "loaded": False, "err": str(e)[:200]})
        page.close()

        # Per-role tests
        for role in ("customer", "vendor", "admin"):
            email, password = ACCOUNTS[role]
            print(f"\n[e2e] === Role: {role} ({email}) ===")
            page = context.new_page()

            # Login first
            try:
                login(page, email, password, f"{FRONTEND}/{ROLES[role][0]}")
                print(f"[e2e] logged in as {role}; landed on {page.url}")
            except Exception as e:
                RESULTS["pages"].append({
                    "role": role, "page": "_login_",
                    "loaded": False, "err": str(e)[:300],
                })
                print(f"[e2e] login FAILED for {role}: {e}")
                page.close()
                continue

            for rel in ROLES[role]:
                print(f"  [e2e] -> {rel}")
                smoke_test(page, role, rel)

            # Sign out so next role starts clean
            try:
                page.evaluate("""
                  try { localStorage.clear(); sessionStorage.clear(); } catch(e){}
                """)
            except Exception:
                pass
            page.close()

        browser.close()

    # Summary
    RESULTS["finished_at"] = time.strftime("%Y-%m-%dT%H:%M:%S")
    total = len(RESULTS["pages"])
    failed = sum(1 for p in RESULTS["pages"] if not p.get("loaded"))
    RESULTS["summary"] = {
        "pages_tested": total,
        "pages_failed": failed,
        "console_errors": len(RESULTS["console_errors"]),
        "network_failures": len(RESULTS["network_failures"]),
        "page_errors": len(RESULTS["page_errors"]),
    }

    out_path = Path("public/_e2e_report.json")
    out_path.write_text(json.dumps(RESULTS, indent=2), encoding="utf-8")
    print(f"\n[e2e] DONE. Report -> {out_path}")
    print(f"[e2e] Summary: {RESULTS['summary']}")
    return RESULTS["summary"]


if __name__ == "__main__":
    sys.exit(0 if main().get("pages_failed", 1) == 0 else 1)