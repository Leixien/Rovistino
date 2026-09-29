// View switch: phone layout or desktop layout, whatever the screen.
// Loaded in <head> without defer so the saved view applies before first paint.
(function () {
  var DESKTOP_WIDTH = 1100;
  var root = document.documentElement;
  var viewport = document.querySelector('meta[name="viewport"]');

  function load(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
  }

  function current() {
    return root.dataset.view || (matchMedia("(max-width: 52rem)").matches ? "mobile" : "desktop");
  }

  function apply(view) {
    root.dataset.view = view;
    // On a phone, a wider layout viewport is how "desktop site" works: the browser zooms out.
    viewport.content = view === "desktop"
      ? "width=" + DESKTOP_WIDTH
      : "width=device-width, initial-scale=1";
  }

  var saved = load("view");
  if (saved === "mobile" || saved === "desktop") apply(saved);

  document.addEventListener("DOMContentLoaded", function () {
    var actions = document.querySelector("header.top .actions");
    var button = document.createElement("button");
    button.type = "button";
    button.className = "view-switch";
    actions.append(button);

    function label() {
      button.textContent = current() === "mobile" ? "Vista computer" : "Vista telefono";
    }
    label();

    var tip = null;
    function closeTip() {
      if (!tip) return;
      tip.remove();
      tip = null;
      save("tipSeen", "1");
    }

    button.addEventListener("click", function () {
      var next = current() === "mobile" ? "desktop" : "mobile";
      apply(next);
      save("view", next);
      label();
      closeTip();
    });

    if (!load("tipSeen")) {
      tip = document.createElement("div");
      tip.className = "tip";
      tip.setAttribute("role", "note");
      tip.innerHTML =
        "<p>Con questo pulsante scegli come vedere il sito: stretto come su un telefono " +
        "o largo come su un computer. Il sito ricorda la tua scelta.</p>" +
        '<button type="button">Ho capito</button>';
      tip.querySelector("button").addEventListener("click", function () {
        closeTip();
        button.focus();
      });
      actions.append(tip);
    }
  });
})();
