/* Arcade structure demo — tab pills + sliding stage.
   Pill mechanics follow the Transitions.dev pattern: on change, write the
   active tab's offsetLeft/offsetWidth onto the pill; on first paint and
   resize, write the same values with transitions suspended. */

(function () {
  "use strict";

  var SECTIONS = ["create", "projects", "library", "channel", "community", "settings"];
  var stage = document.getElementById("stage");

  function movePill(tabs, tab, instant) {
    var pill = tabs.querySelector(".t-tabs-pill");
    if (!pill || !tab) return;
    if (instant) {
      pill.style.transition = "none";
      // force reflow so the suspended transition takes effect before writing
      void pill.offsetWidth;
    }
    pill.style.transform = "translateX(" + tab.offsetLeft + "px)";
    pill.style.width = tab.offsetWidth + "px";
    if (instant) {
      void pill.offsetWidth;
      pill.style.transition = "";
    }
  }

  function selectTab(tabs, tab, instant) {
    tabs.querySelectorAll(".t-tab").forEach(function (t) {
      t.setAttribute("aria-selected", t === tab ? "true" : "false");
      t.setAttribute("tabindex", t === tab ? "0" : "-1");
    });
    movePill(tabs, tab, instant);
  }

  function activeTab(tabs) {
    return tabs.querySelector('.t-tab[aria-selected="true"]');
  }

  /* ---------- content tab groups (mini pills swap tabpanels) ---------- */
  function initContentTabs(tabs) {
    tabs.querySelectorAll(".t-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        selectTab(tabs, tab, false);
        var panelId = tab.getAttribute("data-panel");
        if (!panelId) return;
        tabs.closest(".panel").querySelectorAll(".tabpanel").forEach(function (p) {
          p.hidden = p.id !== panelId;
        });
      });
    });
  }

  /* ---------- main dock: slides the stage ---------- */
  var dock = document.querySelector('[data-tabs="main"]');

  function goTo(section, instant, fromHash) {
    var idx = SECTIONS.indexOf(section);
    if (idx < 0) return;
    if (instant) {
      stage.style.transition = "none";
      void stage.offsetWidth;
    }
    stage.style.transform = "translateX(" + (idx * -100) + "vw)";
    if (instant) {
      void stage.offsetWidth;
      stage.style.transition = "";
    }
    var tab = dock.querySelector('[data-section="' + section + '"]');
    selectTab(dock, tab, instant);
    if (!fromHash && "#" + section !== location.hash) {
      history.replaceState(null, "", "#" + section);
    }
  }

  dock.querySelectorAll(".t-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      goTo(tab.getAttribute("data-section"), false);
    });
  });

  /* keyboard: arrows move between sections when focus isn't in a mini group */
  document.addEventListener("keydown", function (e) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    if (e.target.closest && e.target.closest('.t-tabs--mini')) return;
    var current = SECTIONS.indexOf((location.hash || "#create").slice(1));
    if (current < 0) current = 0;
    var next = e.key === "ArrowRight" ? current + 1 : current - 1;
    if (next < 0 || next >= SECTIONS.length) return;
    goTo(SECTIONS[next], false);
  });

  /* in-page links (#create etc.) and back/forward */
  window.addEventListener("hashchange", function () {
    var section = location.hash.slice(1);
    if (SECTIONS.indexOf(section) >= 0) goTo(section, false, true);
  });

  /* resize: re-measure every pill without animating */
  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      document.querySelectorAll(".t-tabs").forEach(function (tabs) {
        movePill(tabs, activeTab(tabs), true);
      });
      goTo((location.hash || "#create").slice(1) || "create", true, true);
    }, 80);
  });

  /* ---------- first paint ---------- */
  document.querySelectorAll(".t-tabs").forEach(function (tabs) {
    if (tabs !== dock) initContentTabs(tabs);
  });

  function boot() {
    var start = location.hash.slice(1);
    if (SECTIONS.indexOf(start) < 0) start = "create";
    goTo(start, true, true);
    document.querySelectorAll(".t-tabs").forEach(function (tabs) {
      movePill(tabs, activeTab(tabs), true);
    });
  }

  if (document.fonts && document.fonts.ready) {
    // measure after fonts load so pill widths match final metrics
    document.fonts.ready.then(boot);
  }
  boot();
})();
