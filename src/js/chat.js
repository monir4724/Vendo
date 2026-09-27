window.VendoChat = (function () {
  function el(html) {
    var d = document.createElement("div");
    d.innerHTML = html.trim();
    return d.firstElementChild;
  }

  function mount() {
    if (document.getElementById("ai-fab")) return;
    var fab = el('<button class="ai-fab" id="ai-fab" type="button" aria-label="Open Vendo AI Shopping Assistant" title="Vendo AI Assistant"><i data-lucide="sparkles"></i></button>');
    var panel = el(
      '<section class="ai-panel" id="ai-panel" hidden aria-label="Vendo AI Assistant">' +
        '<div class="flex-between" style="padding:16px 20px;border-bottom:1px solid var(--color-border-default);background:var(--color-bg-subtle)">' +
          '<div class="flex gap-2" style="align-items:center">' +
            '<span class="brand-mark" style="width:28px;height:28px;font-size:14px">V</span>' +
            '<div><strong style="font-size:15px">Vendo Assistant</strong><div class="caption">24/7 AI shopping & order concierge</div></div>' +
          '</div>' +
          '<div class="flex gap-1">' +
            '<button class="btn btn-outline btn-sm" type="button" id="ai-escalate" style="font-size:11px;padding:0 8px;min-height:30px">Escalate</button>' +
            '<button class="icon-btn" type="button" id="ai-close" aria-label="Close" style="width:32px;height:32px"><i data-lucide="x"></i></button>' +
          '</div>' +
        '</div>' +
        '<div class="ai-log" id="ai-log"></div>' +
        '<div class="chips" id="ai-chips"></div>' +
        '<form class="ai-composer" id="ai-form">' +
          '<label class="sr-only" for="ai-input" style="position:absolute;left:-999px">Message</label>' +
          '<textarea class="field" id="ai-input" rows="1" placeholder="Ask about orders, delivery, live shops…" autocomplete="off" style="resize:none;min-height:42px;padding-top:10px;font-size:13px"></textarea>' +
          '<button class="btn btn-cta" type="submit" id="ai-send" style="padding:0 14px"><i data-lucide="send" style="width:16px;height:16px"></i></button>' +
        '</form>' +
      '</section>'
    );

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    var log = panel.querySelector("#ai-log");
    var chips = panel.querySelector("#ai-chips");
    var busy = false;
    var suggestions = ["Track my order", "Find in live shops", "Return policy", "Recommend linen"];

    suggestions.forEach(function (s) {
      var c = el('<button class="chip" type="button"></button>');
      c.textContent = s;
      c.addEventListener("click", function () { send(s); });
      chips.appendChild(c);
    });

    log.innerHTML =
      '<div class="state" style="padding:40px 16px">' +
        '<i data-lucide="sparkles" style="color:var(--color-cta);margin-bottom:12px"></i>' +
        '<p class="h4" style="margin-bottom:6px">Welcome to Vendo AI</p>' +
        '<p class="caption">I can track your parcels, recommend products, or take you into ongoing live streams.</p>' +
      '</div>';

    fab.addEventListener("click", function () {
      panel.hidden = !panel.hidden;
      fab.setAttribute("aria-expanded", String(!panel.hidden));
      if (!panel.hidden) {
        var inp = panel.querySelector("#ai-input");
        if (inp) inp.focus();
        if (window.lucide) window.lucide.createIcons({ root: panel });
      }
    });

    panel.querySelector("#ai-close").addEventListener("click", function () {
      panel.hidden = true;
      fab.setAttribute("aria-expanded", "false");
    });

    panel.querySelector("#ai-escalate").addEventListener("click", function () {
      window.VendoUI.toast({ title: "Human Specialist Alerted", desc: "A support agent is joining your chat session.", type: "info" });
      var b = el('<div class="bubble bubble-ai" style="border-left:3px solid var(--color-brand)"><strong>Support Escalate:</strong> A human concierge has been notified and will respond here within 3 minutes. Your conversation context remains attached.</div>');
      if (log.querySelector(".state")) log.innerHTML = "";
      log.appendChild(b);
      log.scrollTop = log.scrollHeight;
    });

    var input = panel.querySelector("#ai-input");
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        panel.querySelector("#ai-form").requestSubmit();
      }
    });

    panel.querySelector("#ai-form").addEventListener("submit", function (e) {
      e.preventDefault();
      send(input.value.trim());
      input.value = "";
    });

    function send(text) {
      if (!text || busy) return;
      if (log.querySelector(".state")) log.innerHTML = "";

      var userBubble = el('<div class="bubble bubble-user"></div>');
      userBubble.textContent = text;
      log.appendChild(userBubble);

      busy = true;
      var sendBtn = panel.querySelector("#ai-send");
      if (sendBtn) sendBtn.disabled = true;

      var skel = el(
        '<div class="bubble bubble-ai" aria-busy="true">' +
          '<div class="skel skel-line" style="width:80%"></div>' +
          '<div class="skel skel-line" style="width:60%"></div>' +
          '<div class="skel skel-line" style="width:40%;margin:0"></div>' +
        '</div>'
      );
      log.appendChild(skel);
      log.scrollTop = log.scrollHeight;

      var result = replyFor(text);
      var reply = result.text;
      var card = result.card;

    function sanitizeHtml(str) {
      return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function renderAIMarkdown(raw) {
      var clean = sanitizeHtml(raw);
      clean = clean.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      clean = clean.replace(/\*(.+?)\*/g, '<em>$1</em>');
      clean = clean.replace(/`(.+?)`/g, '<code class="mono" style="background:var(--color-bg-subtle);padding:2px 4px;border-radius:4px;font-size:12px">$1</code>');
      clean = clean.replace(/\n/g, '<br>');
      return clean;
    }

      var i = 0;
      var bubble;
      var timer = setInterval(function () {
        if (i === 0) {
          skel.remove();
          bubble = el('<div class="bubble bubble-ai"></div>');
          log.appendChild(bubble);
        }
        i += 3;
        bubble.textContent = reply.slice(0, i);
        log.scrollTop = log.scrollHeight;

        if (i >= reply.length) {
          clearInterval(timer);
          bubble.innerHTML = renderAIMarkdown(reply);
          if (card) {
            var cardEl = el(card);
            log.appendChild(cardEl);
            log.scrollTop = log.scrollHeight;
            if (window.lucide) window.lucide.createIcons({ root: cardEl });
          }
          busy = false;
          if (sendBtn) sendBtn.disabled = false;
        }
      }, 16);
    }

    function replyFor(q) {
      q = q.toLowerCase();
      if (q.indexOf("track") !== -1 || q.indexOf("order") !== -1) {
        return {
          text: "I checked your account! Order VD-10418 (Linen Resort Shirt) shipped earlier today via USPS Priority. Estimated delivery is this Wednesday.",
          card: '<div class="card" style="padding:12px;margin-top:4px;border:1px solid var(--color-border-default);font-size:13px">' +
                  '<div class="flex-between"><strong>Order VD-10418</strong><span class="badge badge-info">Shipped</span></div>' +
                  '<p class="caption" style="margin:4px 0 8px">Carrier: USPS Priority · TRK-881920</p>' +
                  '<a class="btn btn-sm btn-outline btn-block" href="orders.html">Open Full Tracking</a>' +
                '</div>'
        };
      }
      if (q.indexOf("live") !== -1) {
        return {
          text: "Kiln & Co is currently broadcasting live! They are demonstrating pottery wheel-throwing with the Ceramic Pour-Over & Carafe pinned.",
          card: '<div class="card" style="padding:12px;margin-top:4px;border:1px solid var(--color-border-default);font-size:13px">' +
                  '<div class="flex-between"><strong>Kiln & Co Live</strong><span class="badge badge-live"><span class="pulse-dot"></span> 1.2k Live</span></div>' +
                  '<p class="caption" style="margin:4px 0 8px">Ceramic Pour-Over pinned · $32</p>' +
                  '<a class="btn btn-sm btn-cta btn-block" href="live.html">Join Live Stream</a>' +
                '</div>'
        };
      }
      if (q.indexOf("linen") !== -1 || q.indexOf("shirt") !== -1) {
        return {
          text: "Here is Atelier North's best-selling 100% European Flax Linen Resort Shirt. Breathable, relaxed fit, and sustainably crafted.",
          card: '<div class="card" style="padding:12px;margin-top:4px;border:1px solid var(--color-border-default);font-size:13px;display:flex;gap:12px;align-items:center">' +
                  '<img src="https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=160&q=80&auto=format" style="width:52px;height:52px;border-radius:8px;object-fit:cover" alt="">' +
                  '<div style="flex:1"><strong style="display:block">Linen Resort Shirt</strong><span class="price">$48</span></div>' +
                  '<a class="btn btn-sm btn-cta" href="product.html?id=p1">View</a>' +
                '</div>'
        };
      }
      if (q.indexOf("return") !== -1 || q.indexOf("refund") !== -1) {
        return {
          text: "Vendo provides hassle-free 14-day returns on all verified vendor products! Items bought through live streams or reels enjoy the exact same return and buyer protection guarantee."
        };
      }
      return {
        text: "I can help you browse artisanal creators, track active orders, inspect return policies, or join live streams. Try typing 'track my order' or asking about linen shirts."
      };
    }

    if (window.lucide) window.lucide.createIcons();
  }

  return { mount: mount };
})();
