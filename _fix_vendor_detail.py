p = r"E:\Project\Vendo\public\admin\vendor-detail.html"
s = open(p, encoding="utf-8").read()

OLD = '''<script src="../../src/js/data.js"></script>
  <script src="../../src/js/layout.js"></script>
  <script>
    VendoLayout.mountDashboard("admin");

    // Dynamic ID lookup
    var params = new URLSearchParams(window.location.search);
    var vId = params.get("id") || "v2";
    var vendor = (VendoData.vendors && VendoData.vendors.find(function(v) { return v.id === vId; })) || {
      name: "Kiln & Co",
      category: "Home & Living (Handmade Ceramics)",
      kyc: "pending",
      location: "Dhaka, Bangladesh"
    };

    document.getElementById("v-title").textContent = vendor.name;
    document.getElementById("v-trade-name").textContent = vendor.name + " Artisanal Studio";
    document.getElementById("v-category").textContent = vendor.category || "Artisanal Goods";

    // Approve Action
    document.getElementById("btn-approve").addEventListener("click", function() {
      var badge = document.getElementById("kyc-badge");
      badge.className = "badge badge-success";
      badge.textContent = "KYC Approved & Active";
      VendoUI.toast("KYC Approved", "Vendor " + vendor.name + " approved. Live Studio and Payout gateways unlocked.", "success");
    });

    // Request Docs Action
    document.getElementById("btn-request-docs").addEventListener("click", function() {
      var note = document.getElementById("admin-note").value.trim();
      if (!note) {
        VendoUI.toast("Note Required", "Please enter a specific note explaining which document needs resubmission.", "warning");
        return;
      }
      VendoUI.toast("Resubmission Requested", "Email sent to vendor requesting re-upload of highlighted documents.", "info");
    });

    // Reject Action
    document.getElementById("btn-reject").addEventListener("click", function() {
      var note = document.getElementById("admin-note").value.trim() || "Application suspended due to regulatory compliance check.";
      VendoUI.modal({
        title: "Suspend & Reject Vendor?",
        body: "Are you sure you want to suspend " + vendor.name + "? Storefront will be unlisted and live broadcasting disabled. Reason: '" + note + "'",
        danger: true,
        ok: "Confirm Rejection",
        onOk: function() {
          var badge = document.getElementById("kyc-badge");
          badge.className = "badge badge-danger";
          badge.textContent = "KYC Suspended";
          VendoUI.toast("Vendor Suspended", "Store suspended and rejection logged in compliance audit.", "danger");
        }
      });
    });

    lucide.createIcons();
  </script>'''

NEW = '''<script src="../../src/js/data.js"></script>
  <script src="../../src/js/store.js"></script>
  <script src="../../src/js/layout.js"></script>
  <script src="../../src/js/vendoLogger.js"></script>
  <script>
    VendoLayout.mountDashboard("admin");

    // Dynamic ID lookup (merge base mock data + persisted store overrides)
    var params = new URLSearchParams(window.location.search);
    var vId = params.get("id") || "v2";
    function loadVendor() {
      var base = (VendoData.vendors && VendoData.vendors.find(function(v) { return v.id === vId; })) || {
        id: vId,
        name: "Kiln & Co",
        category: "Home & Living (Handmade Ceramics)",
        kyc: "pending",
        location: "Dhaka, Bangladesh"
      };
      var merged = VendoStore.getVendor(vId);
      return merged ? Object.assign({}, base, merged) : base;
    }
    var vendor = loadVendor();

    function paintHeader() {
      var badge = document.getElementById("kyc-badge");
      if (!badge) return;
      var kyc = (vendor.kyc || "pending").toLowerCase();
      if (kyc === "approved") {
        badge.className = "badge badge-success";
        badge.textContent = "KYC Approved & Active";
      } else if (kyc === "suspended" || kyc === "rejected") {
        badge.className = "badge badge-danger";
        badge.textContent = "KYC Suspended";
      } else if (kyc === "docs-requested") {
        badge.className = "badge badge-warning";
        badge.textContent = "Documents Re-Requested";
      } else {
        badge.className = "badge badge-warning";
        badge.textContent = "KYC Review Pending";
      }
    }

    document.getElementById("v-title").textContent = vendor.name;
    document.getElementById("v-trade-name").textContent = vendor.name + " Artisanal Studio";
    document.getElementById("v-category").textContent = vendor.category || "Artisanal Goods";
    paintHeader();

    // ---- Approve ----
    document.getElementById("btn-approve").addEventListener("click", function() {
      VendoStore.updateVendor(vId, { kyc: "approved", kycApprovedAt: new Date().toISOString() });
      vendor = loadVendor();
      paintHeader();
      VendoUI.toast("KYC Approved", "Vendor " + vendor.name + " approved. Live Studio and Payout gateways unlocked.", "success");
    });

    // ---- Request Docs ----
    document.getElementById("btn-request-docs").addEventListener("click", function() {
      var note = document.getElementById("admin-note").value.trim();
      if (!note) {
        VendoUI.toast("Note Required", "Please enter a specific note explaining which document needs resubmission.", "warning");
        return;
      }
      VendoStore.updateVendor(vId, { kyc: "docs-requested", adminNote: note });
      vendor = loadVendor();
      paintHeader();
      VendoUI.toast("Resubmission Requested", "Email sent to vendor requesting re-upload of highlighted documents.", "info");
    });

    // ---- Reject / Suspend ----
    document.getElementById("btn-reject").addEventListener("click", function() {
      var note = document.getElementById("admin-note").value.trim() || "Application suspended due to regulatory compliance check.";
      VendoUI.modal({
        title: "Suspend & Reject Vendor?",
        body: "Are you sure you want to suspend " + vendor.name + "? Storefront will be unlisted and live broadcasting disabled. Reason: '" + note + "'",
        danger: true,
        ok: "Confirm Rejection",
        onOk: function() {
          VendoStore.updateVendor(vId, { kyc: "suspended", adminNote: note });
          vendor = loadVendor();
          paintHeader();
          VendoUI.toast("Vendor Suspended", "Store suspended and rejection logged in compliance audit.", "danger");
        }
      });
    });

    // React to changes from other tabs (vendors list page or another admin window)
    VendoStore.subscribe(function (action) {
      if (action && action.type === "update-vendor" && action.id === vId) {
        vendor = loadVendor();
        paintHeader();
      }
    });

    lucide.createIcons();
  </script>'''

if OLD in s:
    s = s.replace(OLD, NEW)
    open(p, "w", encoding="utf-8").write(s)
    print("OK")
else:
    print("OLD NOT FOUND")