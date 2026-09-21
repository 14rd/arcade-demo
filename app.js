/* Arcade structure demo — pills, sliding stage, and a working model of the loop:
   brief → plan → approve → generate → release → watch. All state is local. */

(function () {
  "use strict";

  var SECTIONS = ["create", "projects", "library", "channel", "community", "settings"];
  var stage = document.getElementById("stage");
  var dock = document.querySelector('[data-tabs="main"]');
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- toast ---------------- */
  var toastEl = document.getElementById("toast");
  var toastTimer;
  function toast(text) {
    toastEl.textContent = text;
    toastEl.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("is-on"); }, 2600);
  }
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-toast]");
    if (t) toast(t.getAttribute("data-toast"));
  });

  /* ---------------- pill tabs ---------------- */
  function movePill(tabs, tab, instant) {
    var pill = tabs.querySelector(".t-tabs-pill");
    if (!pill || !tab) return;
    if (instant) { pill.style.transition = "none"; void pill.offsetWidth; }
    pill.style.transform = "translateX(" + tab.offsetLeft + "px)";
    pill.style.width = tab.offsetWidth + "px";
    if (instant) { void pill.offsetWidth; pill.style.transition = ""; }
  }
  function selectTab(tabs, tab, instant) {
    tabs.querySelectorAll(".t-tab").forEach(function (t) {
      t.setAttribute("aria-selected", t === tab ? "true" : "false");
      t.setAttribute("tabindex", t === tab ? "0" : "-1");
    });
    movePill(tabs, tab, instant);
    if (!instant && tab.scrollIntoView) tab.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
  function activeTab(tabs) {
    return tabs.querySelector('.t-tab[aria-selected="true"], .t-tab[aria-pressed="true"]');
  }
  function selectPressed(tabs, btn, instant) {
    tabs.querySelectorAll(".t-tab").forEach(function (t) {
      t.setAttribute("aria-pressed", t === btn ? "true" : "false");
    });
    movePill(tabs, btn, instant);
  }

  function activateContentTab(tabs, tab) {
    selectTab(tabs, tab, false);
    var panelId = tab.getAttribute("data-panel");
    if (!panelId) return;
    var prefix = panelId.slice(0, panelId.indexOf("-") + 1);
    var scope = tabs.closest(".panel") || document;
    scope.querySelectorAll('.tabpanel[id^="' + prefix + '"]').forEach(function (p) {
      p.hidden = p.id !== panelId;
    });
  }
  function initContentTabs(tabs) {
    var all = Array.prototype.slice.call(tabs.querySelectorAll(".t-tab"));
    all.forEach(function (tab) {
      tab.addEventListener("click", function () { activateContentTab(tabs, tab); });
    });
    tabs.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      var idx = all.indexOf(activeTab(tabs));
      var next = e.key === "ArrowRight" ? idx + 1 : idx - 1;
      if (next < 0 || next >= all.length) return;
      e.preventDefault();
      activateContentTab(tabs, all[next]);
      all[next].focus();
    });
  }

  /* ---------------- stage / dock ---------------- */
  function goTo(section, instant, fromHash) {
    var idx = SECTIONS.indexOf(section);
    if (idx < 0) return;
    if (instant) { stage.style.transition = "none"; void stage.offsetWidth; }
    stage.style.transform = "translateX(" + (idx * -100) + "vw)";
    if (instant) { void stage.offsetWidth; stage.style.transition = ""; }
    selectTab(dock, dock.querySelector('[data-section="' + section + '"]'), instant);
    syncGooey(section);
    if (!fromHash && "#" + section !== location.hash) history.replaceState(null, "", "#" + section);
  }
  dock.querySelectorAll(".t-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      setMode("studio");
      goTo(tab.getAttribute("data-section"), false);
    });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    if (e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (e.target.closest && e.target.closest(".t-tabs--mini, input, textarea, select")) return;
    if (watchOn) return;
    var current = SECTIONS.indexOf((location.hash || "#create").slice(1));
    if (current < 0) current = 0;
    var next = e.key === "ArrowRight" ? current + 1 : current - 1;
    if (next < 0 || next >= SECTIONS.length) return;
    goTo(SECTIONS[next], false);
    if (document.activeElement && document.activeElement.closest &&
        document.activeElement.closest(".t-tabs--dock")) {
      dock.querySelector('[data-section="' + SECTIONS[next] + '"]').focus();
    }
  });

  window.addEventListener("hashchange", function () {
    var section = location.hash.slice(1);
    if (section === "watch") { setMode("watch", true); return; }
    if (SECTIONS.indexOf(section) >= 0) {
      lastStudioSection = section;
      setMode("studio", true);
      goTo(section, false, true);
    }
  });

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      document.querySelectorAll(".t-tabs").forEach(function (tabs) {
        movePill(tabs, activeTab(tabs), true);
      });
      if (!watchOn) goTo(currentSection(), true, true);
    }, 80);
  });
  function currentSection() {
    var s = (location.hash || "#create").slice(1);
    return SECTIONS.indexOf(s) >= 0 ? s : "create";
  }

  /* ---------------- studio | watch mode ---------------- */
  var watchOn = false;
  var watchEl = document.getElementById("watch");
  var dockNav = document.getElementById("dock-nav");
  var gooeyNav = document.getElementById("gooey");
  var modeTabs = document.querySelector('[data-tabs="mode"]');
  var modeBtns = modeTabs.querySelectorAll(".t-tab");
  var lastStudioSection = "create";

  function setMode(mode, viaHistory) {
    var toWatch = mode === "watch";
    if (toWatch === watchOn) {
      selectPressed(modeTabs, modeBtns[toWatch ? 1 : 0], false);
      return;
    }
    watchOn = toWatch;
    watchEl.hidden = !watchOn;
    dockNav.classList.toggle("is-hidden", watchOn);
    gooeyNav.classList.toggle("is-hidden", watchOn);
    stage.toggleAttribute("inert", watchOn);
    dockNav.toggleAttribute("inert", watchOn);
    gooeyNav.toggleAttribute("inert", watchOn);
    selectPressed(modeTabs, modeBtns[watchOn ? 1 : 0], false);
    if (watchOn) {
      lastStudioSection = currentSection();
      closeGooey();
      renderWatch();
      if (!viaHistory) history.pushState(null, "", "#watch");
      watchEl.setAttribute("tabindex", "-1");
      watchEl.focus({ preventScroll: true });
    } else {
      if (!viaHistory) history.replaceState(null, "", "#" + lastStudioSection);
      goTo(lastStudioSection, true, true);
    }
  }
  modeBtns[0].addEventListener("click", function () { setMode("studio"); });
  modeBtns[1].addEventListener("click", function () { setMode("watch"); });

  /* ---------------- shared release state ---------------- */
  var RELEASES = [
    { id: "evergreen", title: "Evergreen", kind: "Browser game", monet: "free", label: "Free", status: "published", thumb: "th-evergreen" },
    { id: "after-hours", title: "After hours", kind: "Film", monet: "free", label: "Free", status: "published", thumb: "th-hours" },
    { id: "night-train", title: "Night train", kind: "Film", monet: "premium", label: "$4.99", status: "draft", thumb: "th-night" },
    { id: "dune-country", title: "Dune country", kind: "Browser game", monet: "ads", label: "Free with ads", status: "draft", thumb: "th-dune" }
  ];

  function pillFor(r) {
    if (r.status === "published") return '<span class="pill pill--live">Live · ' + r.label + "</span>";
    if (r.monet !== "free") return '<span class="pill">Draft · ' + (r.monet === "premium" ? "Premium" : "Ads") + "</span>";
    return '<span class="pill">Draft</span>';
  }

  function renderReleases() {
    var host = document.getElementById("release-rows");
    host.innerHTML = RELEASES.map(function (r) {
      var action = r.status === "published" ? "Unpublish"
        : (r.monet === "free" ? "Publish" : "Draft only");
      var cls = r.status !== "published" && r.monet === "free" ? " row-act--strong" : "";
      return '<div class="row">' +
        '<span class="thumb thumb--row ' + r.thumb + '"></span>' +
        '<span class="row-name">' + r.title + "</span>" +
        '<span class="row-meta mono">' + r.kind + "</span>" +
        pillFor(r) +
        '<button class="row-act' + cls + '" type="button" data-release="' + r.id + '">' + action + "</button>" +
        "</div>";
    }).join("");
    var live = RELEASES.filter(function (r) { return r.status === "published"; }).length;
    var word = live === 1 ? "release" : "releases";
    document.getElementById("pub-count").textContent = live + " live " + word;
    document.getElementById("watch-aurora-count").textContent = live + " " + word + " · Short film / Exploration";
    renderPublicGrid();
    if (watchOn) renderWatch();
  }

  document.getElementById("release-rows").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-release]");
    if (!btn) return;
    var r = RELEASES.find(function (x) { return x.id === btn.getAttribute("data-release"); });
    if (!r) return;
    if (r.status === "published") {
      r.status = "draft";
      toast("Unpublished. Draft and history are preserved.");
    } else if (r.monet === "free") {
      r.status = "published";
      toast("Live. It's now on your page and in Watch.");
    } else {
      toast("Premium and ad-supported publishing unlock when payments connect. Saved as a draft.");
    }
    renderReleases();
  });

  function cardFor(r, withBadge) {
    return '<div class="' + (withBadge ? "watch-card" : "lib-card") + '">' +
      '<div class="thumb ' + r.thumb + '">' +
      (withBadge ? '<span class="badge">' + (r.kind === "Film" ? "Watch" : "Play") + "</span>" : "") +
      "</div>" +
      '<div class="lib-meta"><span class="mono">' + r.kind + " · " + r.label + "</span><b>" + r.title + "</b></div>" +
      "</div>";
  }

  function renderPublicGrid() {
    var live = RELEASES.filter(function (r) { return r.status === "published"; });
    document.getElementById("public-grid").innerHTML =
      live.length ? live.map(function (r) { return cardFor(r, false); }).join("")
      : '<p class="sub">Nothing live yet. Publish a release and it appears here.</p>';
  }

  var watchKind = "all";
  document.getElementById("watch-filter").addEventListener("click", function (e) {
    var chip = e.target.closest("[data-kind]");
    if (!chip) return;
    watchKind = chip.getAttribute("data-kind");
    this.querySelectorAll(".chip").forEach(function (c) { c.classList.toggle("is-on", c === chip); });
    renderWatch();
  });

  function renderWatch() {
    var live = RELEASES.filter(function (r) {
      return r.status === "published" && (watchKind === "all" || r.kind === watchKind);
    });
    document.getElementById("watch-grid").innerHTML =
      live.length ? live.map(function (r) { return cardFor(r, true); }).join("")
      : '<p class="sub">Nothing here yet — publish something in the Studio.</p>';
  }

  /* ---------------- create: elements ---------------- */
  var elems = document.getElementById("elems");
  elems.addEventListener("click", function (e) {
    var el = e.target.closest(".elem");
    if (!el) return;
    if (el.classList.contains("elem--add")) {
      toast("Faces and products come from your Library — up to 4 per brief.");
      return;
    }
    var on = elems.querySelectorAll(".elem.is-on").length;
    if (!el.classList.contains("is-on") && on >= 8) { toast("Choose up to 8 elements for this scene."); return; }
    el.classList.toggle("is-on");
    document.getElementById("elem-count").textContent =
      elems.querySelectorAll(".elem.is-on").length + " / 8";
  });

  /* ---------------- create: director chat script ---------------- */
  var msgs = document.getElementById("msgs");
  var chatForm = document.getElementById("chat-form");
  var chatInput = document.getElementById("chat-input");
  var veraStatus = document.getElementById("vera-status");
  var chatStep = 0;
  var busy = false;

  function nearBottom() {
    return msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight < 48;
  }
  function addMsg(html, cls) {
    var stick = nearBottom();
    var div = document.createElement("div");
    div.className = "msg" + (cls ? " " + cls : "");
    div.innerHTML = html;
    msgs.appendChild(div);
    if (stick) msgs.scrollTop = msgs.scrollHeight;
    return div;
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, reduced ? 60 : ms); }); }

  chatForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = chatInput.value.trim();
    if (!text || busy) return;
    chatInput.value = "";
    addMsg(text, "msg--user");
    busy = true;
    var run = chatStep === 0 ? scriptOne()
      : chatStep === 1 ? scriptTwo()
      : wait(700).then(function () {
          addMsg('<span class="who mono">Vera</span>Noted. In the full build I’d fold that into the next plan — every change reprices before you approve.');
        });
    run.then(function () { busy = false; });
    chatStep++;
  });

  function scriptOne() {
    veraStatus.textContent = "Director working…";
    var typing = addMsg("Vera is writing…", "msg--typing");
    return wait(900).then(function () {
      typing.remove();
      addMsg('<span class="who mono">Vera → Rafi · huddle</span>Start wide at waist height. Track with the courier, let the silver case catch the ticket-window light. Hold the face until the platform.');
      document.getElementById("crew-rafi").textContent = "Working";
      document.getElementById("crew-rafi").classList.add("is-hot");
      return wait(1300);
    }).then(function () {
      addMsg('<span class="who mono">Outcome</span>A low, restrained tracking shot with practical light. Locked as a look.', "msg--outcome");
      document.getElementById("crew-rafi").textContent = "Contributed";
      addMsg('<span class="who mono">Vera</span>We have the spine. Say the word and I’ll plan the opening sequence — you approve before anything generates.');
      veraStatus.textContent = "Ready for your brief.";
    });
  }

  function scriptTwo() {
    veraStatus.textContent = "Planning and pricing…";
    var typing = addMsg("Planning and pricing can take a minute…", "msg--typing");
    return wait(1200).then(function () {
      typing.remove();
      var stick = nearBottom();
      var card = document.createElement("div");
      card.className = "msg plan-card";
      card.innerHTML =
        '<span class="plan-eyebrow mono">Campaign plan ready · v1</span>' +
        '<div class="plan-stats"><span>2 videos</span><span>1 still</span><span>3.2% of monthly usage</span></div>' +
        '<div class="plan-models">video 1–2 · Veo 3.1 · 8s · 1080p · Sound · 16:9<br>still 1 · Seedream 4.5 · 2K</div>' +
        '<div class="plan-actions">' +
        '<button class="btn btn--small btn--primary" type="button" id="approve-btn">Approve generation</button>' +
        '<button class="btn btn--small" type="button" id="adjust-btn">Adjust</button></div>' +
        '<div class="plan-progress" hidden><i></i></div>' +
        '<span class="plan-note">Review the exact plan before generation.</span>';
      msgs.appendChild(card);
      if (stick) msgs.scrollTop = msgs.scrollHeight;
      veraStatus.textContent = "Awaiting your approval.";
      card.querySelector("#adjust-btn").addEventListener("click", function () {
        toast("Counts, models, length, aspect and sound are adjustable — the plan reprices.");
      });
      card.querySelector("#approve-btn").addEventListener("click", function () { approvePlan(card); });
    });
  }

  function approvePlan(card) {
    if (card.dataset.approved) return;
    card.dataset.approved = "1";
    busy = true;
    var actions = card.querySelector(".plan-actions");
    var note = card.querySelector(".plan-note");
    var prog = card.querySelector(".plan-progress");
    actions.hidden = true;
    prog.hidden = false;
    note.textContent = "Generating — the chat unlocks when results land.";
    veraStatus.textContent = "Generating…";
    var bar = prog.querySelector("i");
    var results = document.getElementById("director-results");
    var placeholders = [
      { name: "Opening tracking shot", thumb: "th-night" },
      { name: "Ticket-window light", thumb: "th-station" },
      { name: "The case, close", thumb: "th-case" }
    ].map(function (d) {
      var div = document.createElement("div");
      div.className = "result";
      div.innerHTML = '<div class="thumb is-rendering"></div>' +
        '<div class="result-meta"><b>Rendering…</b><span class="mono">' + "Queued" + "</span></div>";
      results.prepend(div);
      return { el: div, data: d };
    });
    var step = 0;
    function tick() {
      step++;
      bar.style.width = Math.min(100, step * 34) + "%";
      if (step <= 3) {
        var p = placeholders[step - 1];
        p.el.innerHTML = '<div class="thumb ' + p.data.thumb + '"></div>' +
          '<div class="result-meta"><b>' + p.data.name + '</b><span class="mono">Use as reference</span></div>';
        setTimeout(tick, reduced ? 80 : 1100);
      } else {
        note.textContent = "Generation complete — delivered to The work and Creations.";
        veraStatus.textContent = "Ready for your brief.";
        busy = false;
        toast("3 of 3 delivered. Keep the conversation going to iterate.");
      }
    }
    setTimeout(tick, reduced ? 80 : 900);
  }

  /* ---------------- create: generate lane ---------------- */
  var MODELS = [
    ["google/veo-3.1", "Veo 3.1 · $0.24/s · up to 4K · sound"],
    ["google/veo-3.1-fast", "Veo 3.1 Fast · $0.096/s"],
    ["kwaivgi/kling-v3.0-pro", "Kling 3.0 Pro · $0.134/s"],
    ["bytedance/seedance-1-5-pro", "Seedance 1.5 Pro · $0.031/s · needs face check"],
    ["minimax/hailuo-3", "Hailuo 3 · $0.156/s · 2K"],
    ["alibaba/wan-2.7", "Wan 2.7 · $0.12/s · audio in"],
    ["runway/gen-4.5", "Runway Gen-4.5 · $0.144/s · silent"],
    ["bytedance-seed/seedream-4.5", "Seedream 4.5 · $0.048/image"],
    ["recraft/recraft-v4.1", "Recraft v4.1 · $0.042/image"]
  ];
  var modelSelect = document.getElementById("model-select");
  modelSelect.innerHTML = MODELS.map(function (m) {
    return '<option value="' + m[0] + '">' + m[1] + "</option>";
  }).join("");

  document.querySelectorAll(".intent").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".intent").forEach(function (b) { b.classList.toggle("is-on", b === btn); });
      var isImage = btn.getAttribute("data-intent") === "image";
      modelSelect.value = isImage ? "bytedance-seed/seedream-4.5" : "google/veo-3.1";
      document.getElementById("gen-estimate").textContent =
        isImage ? "Estimated preview: up to 0.3% of monthly usage" : "Estimated preview: up to 3.2% of monthly usage";
    });
  });

  var genBtn = document.getElementById("gen-btn");
  genBtn.addEventListener("click", function () {
    if (genBtn.disabled) return;
    genBtn.disabled = true;
    genBtn.textContent = "Queuing…";
    var out = document.getElementById("gen-output");
    var grid = document.getElementById("gen-results");
    out.hidden = false;
    grid.innerHTML = "";
    var tiles = [
      { name: "video 1 · Veo 3.1 · 8s", thumb: "th-hours" },
      { name: "video 2 · Veo 3.1 · 8s", thumb: "th-night" }
    ].map(function (d) {
      var div = document.createElement("div");
      div.className = "result";
      div.innerHTML = '<div class="thumb is-rendering"></div>' +
        '<div class="result-meta"><b>Rendering…</b><span class="mono">Queued</span></div>';
      grid.appendChild(div);
      return { el: div, data: d };
    });
    var i = 0;
    function tick() {
      if (i < tiles.length) {
        var t = tiles[i++];
        t.el.innerHTML = '<div class="thumb ' + t.data.thumb + '"></div>' +
          '<div class="result-meta"><b>' + t.data.name + '</b><span class="mono">Keep · Use as source</span></div>';
        setTimeout(tick, reduced ? 80 : 1200);
      } else {
        genBtn.disabled = false;
        genBtn.textContent = "Generate";
        toast("Complete. Kept results also land in your Files.");
      }
    }
    setTimeout(tick, reduced ? 80 : 900);
  });

  /* ---------------- create: prompts lane ---------------- */
  var PROMPTS = [
    ["009", "Eye-Level Shot", "Camera", "Rafi", "A direct, proportionate encounter at the subject's level."],
    ["015", "Low Angle Shot", "Camera", "Rafi", "View from below to emphasize height, structure, presence."],
    ["020", "Pan Shot", "Camera", "Rafi", "A readable horizontal sweep that keeps geography honest."],
    ["033", "Over-the-Shoulder", "Camera", "Rafi", "Conversation framed through a second presence."],
    ["049", "Golden Hour", "Lighting", "Rafi", "Warm low light; long shadows carry the mood."],
    ["052", "Practical Light", "Lighting", "Rafi", "Let lamps, windows and signs do the lighting work."],
    ["073", "Symmetry", "Composition", "Vera", "A centered frame that makes order part of the story."],
    ["078", "Negative Space", "Composition", "Vera", "Give the subject room; let absence speak."],
    ["101", "Cold Open", "Story", "Jules", "Start inside the action; explain nothing yet."],
    ["112", "The MacGuffin", "Story", "Jules", "An object everyone wants; its contents never matter."],
    ["131", "Match Cut", "Editing", "Bones", "Two shots joined by shape or motion, not by logic."],
    ["140", "Smash Cut", "Editing", "Bones", "A hard cut across tone — loud to silent, calm to chaos."]
  ];
  var promptGrid = document.getElementById("prompt-grid");
  var promptCat = "all";
  var promptQuery = "";
  function renderPrompts() {
    var list = PROMPTS.filter(function (p) {
      var okCat = promptCat === "all" || p[2] === promptCat;
      var okQ = !promptQuery || (p[1] + " " + p[2] + " " + p[3] + " " + p[4]).toLowerCase().indexOf(promptQuery) >= 0;
      return okCat && okQ;
    });
    promptGrid.innerHTML = list.length ? list.map(function (p) {
      return '<button class="prompt-card" type="button" data-prompt="' + p[1] + '">' +
        '<span class="pnum mono">' + p[0] + " <span>" + p[2] + "</span></span>" +
        "<b>" + p[1] + "</b><p>" + p[4] + "</p>" +
        '<span class="pcrew">Opens a draft with ' + p[3] + " →</span></button>";
    }).join("") : '<p class="sub">A different angle, perhaps?</p>';
  }
  renderPrompts();
  document.getElementById("prompt-search").addEventListener("input", function () {
    promptQuery = this.value.trim().toLowerCase();
    renderPrompts();
  });
  document.getElementById("prompt-cats").addEventListener("click", function (e) {
    var chip = e.target.closest("[data-cat]");
    if (!chip) return;
    promptCat = chip.getAttribute("data-cat");
    this.querySelectorAll(".chip").forEach(function (c) { c.classList.toggle("is-on", c === chip); });
    renderPrompts();
  });
  promptGrid.addEventListener("click", function (e) {
    var card = e.target.closest("[data-prompt]");
    if (!card) return;
    var laneTabs = document.querySelector('[data-tabs="lane"]');
    activateContentTab(laneTabs, laneTabs.querySelector('[data-panel="lane-director"]'));
    chatInput.value = card.getAttribute("data-prompt") + " — on the Night train opening. ";
    chatInput.focus();
    toast("Draft ready. You decide when to send.");
  });

  /* ---------------- projects ---------------- */
  var PROJECTS = [
    {
      id: "night-train", name: "Night train", kind: "Film — Short", thumb: "th-night",
      meta: "Film · 3 creations · touched today", pill: "In progress", live: false,
      desc: "A courier, a silver case, and the last service out. Logline through key art, one binder.",
      cast: ["Face · The courier", "Face · Vera", "Product · Silver case"],
      sections: [["Logline", "1"], ["Script", "2"], ["Characters", "3"], ["World", "4"], ["Shots", "6"], ["Trailer", "—"], ["Key art", "1"]],
      pages: [["Look", "Tracking shot, practical light"], ["Shot list", "Platform sequence, 12 setups"], ["Treatment", "One night, three stations"], ["Still", "The last station"], ["Cast", "The courier — reference"], ["Cut", "Teaser v2, 0:41"]]
    },
    {
      id: "evergreen", name: "Evergreen", kind: "Game", thumb: "th-evergreen",
      meta: "Game · 1 creation · touched 2d ago", pill: "Released", live: true,
      desc: "Quiet woods. Room to explore. A collect-and-wander starter world.",
      cast: ["Product · Glass bottle"],
      sections: [["World", "1"], ["3D models", "4"], ["Gameplay", "1"], ["Playtest", "—"], ["Release", "1"]],
      pages: [["Notes", "Objective: collect every crystal"], ["Look", "Blue-hour lighting pass"]]
    },
    {
      id: "after-hours", name: "After hours", kind: "Film — Short", thumb: "th-hours",
      meta: "Film · 2 creations · touched 8d ago", pill: "Released", live: true,
      desc: "A world on the other side of dusk.",
      cast: ["Face · Vera"],
      sections: [["Logline", "1"], ["Script", "1"], ["Shots", "3"], ["Key art", "1"]],
      pages: [["Treatment", "Blue streets, no dialogue"], ["Still", "Street, blue"]]
    }
  ];
  var projectRows = document.getElementById("project-rows");
  projectRows.innerHTML = PROJECTS.map(function (p) {
    return '<button class="row" type="button" data-project="' + p.id + '">' +
      '<span class="thumb thumb--row ' + p.thumb + '"></span>' +
      '<span class="row-name">' + p.name + "</span>" +
      '<span class="row-meta mono">' + p.meta + "</span>" +
      '<span class="pill' + (p.live ? " pill--live" : "") + '">' + p.pill + "</span>" +
      '<span class="row-act">Open</span></button>';
  }).join("");
  projectRows.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-project]");
    if (!btn) return;
    var p = PROJECTS.find(function (x) { return x.id === btn.getAttribute("data-project"); });
    document.getElementById("pd-eyebrow").textContent = "Project · " + p.kind;
    document.getElementById("pd-title").textContent = p.name;
    document.getElementById("pd-desc").textContent = p.desc;
    document.getElementById("pd-cast").innerHTML = p.cast.map(function (c) {
      return '<span class="chip mono">' + c + "</span>";
    }).join("") + '<span class="chip chip--ghost mono">+ Add from Library</span>';
    document.getElementById("pd-sections").innerHTML = p.sections.map(function (s) {
      return '<div class="rail-item">' + s[0] + "<span>" + s[1] + "</span></div>";
    }).join("");
    document.getElementById("pd-pages").innerHTML = p.pages.map(function (pg) {
      return '<div class="page-card"><span>' + pg[0] + "</span><b>" + pg[1] + "</b></div>";
    }).join("");
    document.getElementById("project-list").hidden = true;
    document.getElementById("project-detail").hidden = false;
  });
  document.getElementById("project-back").addEventListener("click", function () {
    document.getElementById("project-detail").hidden = true;
    document.getElementById("project-list").hidden = false;
  });

  /* ---------------- library bits ---------------- */
  var seedanceBtn = document.getElementById("seedance-btn");
  seedanceBtn.addEventListener("click", function () {
    seedanceBtn.outerHTML = '<span class="ok mono">SeedDance ready · check complete</span>';
    toast("Liveness check complete. Every video model is available for this face.");
  });

  /* ---------------- settings ---------------- */
  var overage = document.getElementById("overage");
  overage.addEventListener("click", function () {
    var on = overage.getAttribute("aria-checked") === "true";
    overage.setAttribute("aria-checked", on ? "false" : "true");
    toast(on ? "Overage off. Generation pauses when the window is spent."
             : "Overage on. Usage past the window bills per use.");
  });

  /* ---------------- gooey menu (mobile) ---------------- */
  var gooeyLauncher = document.getElementById("gooey-launcher");
  var gooeyLabel = document.getElementById("gooey-label");
  var gooeyItems = gooeyNav.querySelectorAll(".gooey-item");

  function gooeyOpen() { return gooeyNav.getAttribute("data-open") === "true"; }
  function closeGooey() {
    gooeyNav.setAttribute("data-open", "false");
    gooeyLauncher.setAttribute("aria-expanded", "false");
    gooeyItems.forEach(function (b) { b.setAttribute("tabindex", "-1"); });
  }
  function openGooey() {
    gooeyNav.setAttribute("data-open", "true");
    gooeyLauncher.setAttribute("aria-expanded", "true");
    gooeyItems.forEach(function (b) { b.setAttribute("tabindex", "0"); });
  }
  gooeyLauncher.addEventListener("click", function () {
    gooeyOpen() ? closeGooey() : openGooey();
  });
  gooeyItems.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var section = btn.getAttribute("data-section");
      setMode("studio");
      goTo(section, false);
      closeGooey();
    });
  });
  document.addEventListener("click", function (e) {
    if (gooeyOpen() && !gooeyNav.contains(e.target)) closeGooey();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && gooeyOpen()) { closeGooey(); gooeyLauncher.focus(); }
  });
  function syncGooey(section) {
    gooeyLabel.textContent = section.charAt(0).toUpperCase() + section.slice(1);
    gooeyItems.forEach(function (b) {
      b.classList.toggle("is-now", b.getAttribute("data-section") === section);
    });
  }

  /* ---------------- boot ---------------- */
  document.querySelectorAll(".t-tabs").forEach(function (tabs) {
    if (tabs !== dock && tabs !== modeTabs) initContentTabs(tabs);
  });
  renderReleases();

  function boot() {
    if (location.hash === "#watch") {
      setMode("watch");
    } else {
      goTo(currentSection(), true, true);
    }
    document.querySelectorAll(".t-tabs").forEach(function (tabs) {
      movePill(tabs, activeTab(tabs), true);
    });
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      document.querySelectorAll(".t-tabs").forEach(function (tabs) {
        movePill(tabs, activeTab(tabs), true);
      });
    });
  }
  boot();
})();
