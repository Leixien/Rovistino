(function () {
  var API = window.ROVISTINO_API;
  var STEP = 20;
  var NO_PHOTO = "../assets/nofoto.png";

  var form = document.querySelector(".search");
  var input = document.getElementById("q");
  var submit = form.querySelector("button");
  var status = document.getElementById("status");
  var welcome = document.getElementById("welcome");
  var results = document.getElementById("results");
  var more = document.getElementById("more");
  var siteButtons = [].slice.call(document.querySelectorAll(".sites button"));

  var listings = [];
  var shown = 0;

  function load(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function save(key, value) { try { localStorage.setItem(key, value); } catch (e) {} }

  // Sites: all on by default, at least one always on, choice remembered on this device.
  var savedSites = (load("sites") || "").split(",").filter(Boolean);
  if (savedSites.length) {
    siteButtons.forEach(function (b) { b.setAttribute("aria-pressed", String(savedSites.indexOf(b.dataset.site) >= 0)); });
  }
  function chosenSites() {
    return siteButtons.filter(function (b) { return b.getAttribute("aria-pressed") === "true"; }).map(function (b) { return b.dataset.site; });
  }
  siteButtons.forEach(function (b) {
    b.addEventListener("click", function () {
      var on = b.getAttribute("aria-pressed") === "true";
      if (on && chosenSites().length === 1) return;
      b.setAttribute("aria-pressed", String(!on));
      save("sites", chosenSites().join(","));
    });
  });

  function euro(price) {
    if (price === null || price === undefined) return null;
    return Math.round(price).toLocaleString("it-IT") + "€";
  }

  function ago(iso) {
    if (!iso) return "";
    var minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (minutes < 1) return "adesso";
    if (minutes < 60) return minutes + " min fa";
    if (minutes < 24 * 60) return Math.round(minutes / 60) + " h fa";
    if (minutes < 48 * 60) return "ieri";
    return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function card(item) {
    var li = el("li");
    var a = el("a", "card");
    a.href = item.url;
    a.target = "_blank";
    a.rel = "noopener";

    var photo = el("div", "photo");
    var img = el("img");
    img.src = item.photo || NO_PHOTO;
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
    img.onerror = function () { img.onerror = null; img.src = NO_PHOTO; };
    photo.appendChild(img);

    var price = euro(item.price);
    var sticker = el("span", "price" + (!price ? " none" : price.length > 5 ? " long" : ""), price || "prezzo n.d.");
    photo.appendChild(sticker);

    var body = el("div", "body");
    body.appendChild(el("h2", null, item.title));
    body.appendChild(el("p", "meta", [item.site, item.city, ago(item.date)].filter(Boolean).join(" · ")));

    a.appendChild(photo);
    a.appendChild(body);
    li.appendChild(a);
    return li;
  }

  function showMore() {
    listings.slice(shown, shown + STEP).forEach(function (item) { results.appendChild(card(item)); });
    shown = Math.min(shown + STEP, listings.length);
    var left = listings.length - shown;
    more.hidden = left <= 0;
    more.textContent = "Altri annunci (" + left + ")";
  }
  more.addEventListener("click", showMore);

  function setStatus(lines, error) {
    status.textContent = "";
    lines.forEach(function (line, i) {
      var warn = /non disponibile ora|Nessun annuncio/.test(line);
      status.appendChild(el("p", i === 0 && !warn ? "query" : warn ? "warn" : null, line));
    });
    if (error) status.appendChild(el("p", "warn", error));
  }

  function skeletons() {
    results.textContent = "";
    for (var i = 0; i < 4; i++) {
      var li = el("li");
      var box = el("div", "card skeleton");
      box.appendChild(el("div", "photo"));
      var body = el("div", "body");
      body.appendChild(el("h2"));
      body.appendChild(el("p", "meta"));
      box.appendChild(body);
      li.appendChild(box);
      results.appendChild(li);
    }
  }

  var current = null;
  function run(q) {
    q = q.trim();
    if (!q) return;
    input.value = q;
    input.blur(); // hide the phone keyboard to show results
    welcome.hidden = true;
    more.hidden = true;
    submit.disabled = true;
    submit.textContent = "Rovisto…";
    setStatus([]);
    skeletons();
    history.replaceState(null, "", "?q=" + encodeURIComponent(q));

    var controller = window.AbortController ? new AbortController() : null;
    if (current) current.abort();
    current = controller;
    var timer = setTimeout(function () { if (controller) controller.abort(); }, 45000);
    var url = API + "/api/search?q=" + encodeURIComponent(q) + "&sites=" + encodeURIComponent(chosenSites().join(","));

    fetch(url, controller ? { signal: controller.signal } : {})
      .then(function (r) { return r.json(); })
      .then(function (data) {
        results.textContent = "";
        listings = data.listings || [];
        shown = 0;
        setStatus(data.header || [], data.error);
        showMore();
      })
      .catch(function (e) {
        if (current !== controller) return; // a newer search replaced this one
        results.textContent = "";
        setStatus([], "Non riesco a raggiungere Rovistino: il servizio potrebbe essere spento. Riprova tra poco.");
      })
      .then(function () {
        clearTimeout(timer);
        if (current === controller) {
          submit.disabled = false;
          submit.textContent = "Cerca";
        }
      });
  }

  form.addEventListener("submit", function (e) { e.preventDefault(); run(input.value); });
  [].forEach.call(document.querySelectorAll(".examples button"), function (b) {
    b.addEventListener("click", function () { run(b.textContent); });
  });

  var initial = new URLSearchParams(location.search).get("q");
  if (initial) run(initial);

  // Install hint: Android offers a prompt, iOS needs Share → Add to Home Screen.
  var install = document.getElementById("install");
  var standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  function hint(text, action) {
    if (standalone || load("installHintClosed")) return;
    install.textContent = "";
    install.appendChild(el("span", null, text));
    var actions = el("span");
    if (action) actions.appendChild(action);
    var close = el("button", null, "Chiudi");
    close.type = "button";
    close.addEventListener("click", function () { install.hidden = true; save("installHintClosed", "1"); });
    actions.appendChild(close);
    install.appendChild(actions);
    install.hidden = false;
  }
  var isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIos) hint("Per averla come app: tocca Condividi, poi «Aggiungi alla schermata Home».");
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    var button = el("button", null, "Installa");
    button.type = "button";
    button.addEventListener("click", function () { install.hidden = true; e.prompt(); });
    hint("Installa Rovistino come app sul telefono.", button);
  });

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
})();
