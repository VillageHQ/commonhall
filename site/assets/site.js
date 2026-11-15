// Common Hall by Village: every behaviour on the landing page, with no library. The theme toggle, the set-up dialog,
// the copy buttons and the sign-up form always work. The hover field (plan-view doors), the walking faces,
// the deal cards and the swinging doors move only when the visitor has not asked for reduced motion; without it the
// page is still and whole (the field is drawn once, doors closed).
(function () {
  const html = document.documentElement;
  const reduceQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  const motionOn = () => !(reduceQuery && reduceQuery.matches);

  /* ---------- theme ---------- */
  function setUpTheme() {
    const button = document.getElementById("theme-toggle");
    const meta = document.querySelector('meta[name="theme-color"]');
    function apply(theme, save) {
      html.setAttribute("data-theme", theme);
      button.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
      if (meta) meta.setAttribute("content", theme === "dark" ? "#0E0E0D" : "#FAFAF7");
      if (save) {
        try { localStorage.setItem("ch-theme", theme); } catch (e) { /* private mode: it just is not remembered */ }
      }
      window.dispatchEvent(new Event("themechange"));
    }
    button.hidden = false;
    apply(html.getAttribute("data-theme") === "dark" ? "dark" : "light", false);
    button.addEventListener("click", () => apply(html.getAttribute("data-theme") === "dark" ? "light" : "dark", true));
  }

  /* ---------- copying ---------- */
  function copyText(text) {
    function fallback() {
      const buffer = document.createElement("textarea");
      buffer.value = text;
      buffer.className = "sr";
      buffer.setAttribute("readonly", "");
      document.body.appendChild(buffer);
      buffer.select();
      let copied = false;
      try { copied = document.execCommand("copy"); } catch (e) { copied = false; }
      buffer.remove();
      return copied ? Promise.resolve() : Promise.reject(new Error("copy failed"));
    }
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).catch(fallback);
    return fallback();
  }

  // One copy button: its label turns to "Copied" for a moment and the status line says what was copied.
  function wireCopy(button, getText, status, doneMessage) {
    let timer;
    const label = button.textContent;
    button.addEventListener("click", async () => {
      clearTimeout(timer);
      try {
        await copyText(getText());
        button.textContent = "Copied";
        status.textContent = doneMessage;
      } catch (e) {
        status.textContent = "Select the text to copy it.";
      }
      timer = setTimeout(() => { button.textContent = label; status.textContent = ""; }, 2200);
    });
  }

  function setUpCopy() {
    const button = document.querySelector("[data-copy]");
    const command = document.querySelector("[data-command]");
    const status = document.querySelector("[data-copy-status]");
    if (!button || !command || !status) return;
    button.hidden = false;
    wireCopy(button, () => command.dataset.full, status, "Install line copied. Paste it on your own server.");
  }

  /* ---------- set-up with Claude or OpenAI: split button, menu and dialog ---------- */
  const INSTALL_LINE = "curl -fsSL https://raw.githubusercontent.com/VillageHQ/community/main/install.sh | sudo bash";
  const AI = {
    claude: { name: "Claude", app: "Claude or Claude Code" },
    openai: { name: "OpenAI", app: "ChatGPT or Codex" },
  };
  const PROMPT = [
    "Set up Common Hall, the open-source founder community portal, on a server I own.",
    "",
    "1. Clone https://github.com/VillageHQ/community and read docs/self-host-vps.md in it.",
    "2. Ask me for my server's address and the domain I want to use. Tell me before you run anything that costs money or changes my domain's DNS.",
    "3. On the server, run the install line:",
    "   " + INSTALL_LINE,
    "4. When it finishes, tell me the address to open and how to finish setup.",
  ].join("\n");

  function setUpSetup() {
    const main = document.getElementById("setup-main");
    const caret = document.getElementById("setup-caret");
    const menu = document.getElementById("setup-menu");
    const dialog = document.getElementById("setup-dialog");
    if (!main || !caret || !menu || !dialog) return;
    const items = Array.from(menu.querySelectorAll('[role="menuitem"]'));
    const label = document.getElementById("setup-label");
    const mainGlyph = main.querySelector(".ai");
    const prompt = document.getElementById("setup-prompt");
    const promptStatus = dialog.querySelector("[data-prompt-status]");
    let opener = main;
    prompt.value = PROMPT;

    function choose(ai) {
      main.dataset.ai = ai;
      label.textContent = "Set up with " + AI[ai].name;
      const source = menu.querySelector('[data-ai="' + ai + '"] .ai');
      if (source) mainGlyph.innerHTML = source.innerHTML;
      dialog.querySelector("[data-ai-name]").textContent = AI[ai].name;
      dialog.querySelector("[data-ai-app]").textContent = AI[ai].app;
    }

    function openDialog(from) {
      opener = from || main;
      promptStatus.textContent = "";
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      prompt.focus();
      prompt.select();
    }
    function closeDialog() {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
    dialog.addEventListener("close", () => { setTimeout(() => { if (opener && document.contains(opener)) opener.focus(); }, 0); });
    dialog.querySelector("[data-close]").addEventListener("click", closeDialog);
    // a click on the backdrop (the dialog element itself, outside its content) closes it
    dialog.addEventListener("click", (event) => { if (event.target === dialog) closeDialog(); });
    // the native dialog traps Tab and closes on Escape; this keeps Tab inside where showModal is missing
    dialog.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") return;
      const focusable = Array.from(dialog.querySelectorAll("button, a[href], textarea")).filter((el) => !el.disabled && el.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    wireCopy(dialog.querySelector("[data-copy-prompt]"), () => PROMPT, promptStatus, "Prompt copied. Paste it into your assistant.");

    main.addEventListener("click", () => openDialog(main));
    document.querySelectorAll("[data-open-setup]").forEach((button) => button.addEventListener("click", () => openDialog(button)));

    function openMenu(focusIndex) {
      menu.hidden = false;
      caret.setAttribute("aria-expanded", "true");
      if (focusIndex !== undefined) items[focusIndex].focus();
    }
    function closeMenu(returnFocus) {
      if (menu.hidden) return;
      menu.hidden = true;
      caret.setAttribute("aria-expanded", "false");
      if (returnFocus) caret.focus();
    }
    caret.addEventListener("click", () => (menu.hidden ? openMenu(0) : closeMenu(false)));
    caret.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        openMenu(event.key === "ArrowUp" ? items.length - 1 : 0);
      }
    });
    items.forEach((item, index) => {
      item.addEventListener("click", () => {
        choose(item.dataset.ai);
        closeMenu(false);
        openDialog(main);
      });
      item.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown") { event.preventDefault(); items[(index + 1) % items.length].focus(); }
        else if (event.key === "ArrowUp") { event.preventDefault(); items[(index - 1 + items.length) % items.length].focus(); }
        else if (event.key === "Home") { event.preventDefault(); items[0].focus(); }
        else if (event.key === "End") { event.preventDefault(); items[items.length - 1].focus(); }
        else if (event.key === "Escape") { event.preventDefault(); closeMenu(true); }
        else if (event.key === "Tab") closeMenu(false);
      });
    });
    document.addEventListener("click", (event) => { if (!menu.hidden && !menu.contains(event.target) && !caret.contains(event.target)) closeMenu(false); });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !menu.hidden) closeMenu(true); });
  }

  /* ---------- the sign-up form: "Schedule a call" ---------- */
  // Four fields checked in the browser, then posted as JSON to the form's data-endpoint (201 { ok, emailSent, next }
  // or 400 { errors }). With no endpoint set (this folder has no server), nothing leaves the browser and the page
  // says so.
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const MAXIMUM_MEMBERS = 1000000;
  const ENTERPRISE_UP_TO_MEMBERS = 500;
  const REPLY_LINE = "Village replies from a person within 1 business day.";
  const NEXT_STEPS = [
    `${REPLY_LINE} You get a date for your 45-minute kickoff call.`,
    "Week 1, done with you: your domain and mail records, your portfolio's domains in and every profile filled in.",
    "Your first 20 to 50 founders get one email with one thing to do.",
  ];
  const FIELDS = { name: "f-name", email: "f-email", community: "f-fund", members: "f-members" };

  // The price line follows the member count: Enterprise up to 500 members, a quote above.
  function readPlanPrice(members) {
    if (members > ENTERPRISE_UP_TO_MEMBERS) return "above 500 members, Village quotes a plan with you";
    return "$10,000 a year, 7,500 credits a month";
  }

  function setUpSignup() {
    const form = document.getElementById("signup-form");
    const confirmBox = document.getElementById("signup-confirm");
    const formError = document.getElementById("form-error");
    if (!form || !confirmBox || !formError) return;
    form.hidden = false;
    const input = (id) => document.getElementById(id);

    function readValues() {
      const plan = form.querySelector('input[name="plan"]');
      return {
        name: input(FIELDS.name).value.trim(),
        email: input(FIELDS.email).value.trim(),
        community: input(FIELDS.community).value.trim(),
        members: input(FIELDS.members).value.trim(),
        plan: plan ? plan.value : "managed",
        website: input("f-website").value,
      };
    }

    function mark(id, isValid) {
      const field = input(id).closest(".field");
      field.classList.toggle("is-invalid", !isValid);
      input(id).setAttribute("aria-invalid", String(!isValid));
      if (isValid) input(id).removeAttribute("aria-describedby");
      else input(id).setAttribute("aria-describedby", `e-${id.slice(2)}`);
      return isValid;
    }

    function check(only) {
      const values = readValues();
      const members = Number(values.members);
      const rules = {
        [FIELDS.name]: values.name.length > 1,
        [FIELDS.email]: EMAIL_PATTERN.test(values.email),
        [FIELDS.community]: values.community.length > 1,
        [FIELDS.members]: /^\d+$/.test(values.members) && members >= 1 && members <= MAXIMUM_MEMBERS,
      };
      const checked = Object.keys(rules).filter((id) => !only || only === id);
      const isValid = checked.map((id) => mark(id, rules[id])).every(Boolean);
      return { isValid, values };
    }

    Object.values(FIELDS).forEach((id) => {
      input(id).addEventListener("input", () => {
        if (input(id).closest(".field").classList.contains("is-invalid")) check(id);
      });
    });

    const planPrice = document.querySelector("[data-plan-price]");
    input(FIELDS.members).addEventListener("input", () => {
      if (planPrice) planPrice.textContent = readPlanPrice(Number(input(FIELDS.members).value));
    });

    function showError(message) {
      formError.textContent = message;
      formError.hidden = !message;
    }

    function showConfirm(title, bodyParts, steps) {
      confirmBox.querySelector("[data-confirm-title]").textContent = title;
      const body = confirmBox.querySelector("[data-confirm-body]");
      body.replaceChildren(...bodyParts);
      body.hidden = bodyParts.length === 0;
      const list = confirmBox.querySelector("[data-confirm-steps]");
      list.replaceChildren(
        ...steps.map((step) => {
          const item = document.createElement("li");
          item.textContent = step;
          return item;
        }),
      );
      list.hidden = steps.length === 0;
      form.hidden = true;
      confirmBox.hidden = false;
      confirmBox.focus({ preventScroll: true });
      confirmBox.scrollIntoView({ block: "center" });
    }

    function bold(text) {
      const element = document.createElement("b");
      element.textContent = text;
      return element;
    }

    async function send(values) {
      const endpoint = form.dataset.endpoint;
      const first = values.name.split(/\s+/)[0];
      if (!endpoint) {
        showConfirm(`Thanks, ${first}. Nothing was sent.`, ["This copy of the page has no sign-up address yet, so your details stayed in your browser. Nobody will write to ", bold(values.email), "."], []);
        return;
      }
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      try {
        const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(values) });
        const answer = await response.json().catch(() => ({}));
        if (response.status === 201 && answer.ok) {
          const steps = Array.isArray(answer.next) && answer.next.length > 0 ? answer.next : NEXT_STEPS;
          showConfirm(`Thanks, ${first}. Request received for ${values.community}.`, [answer.emailSent ? "A confirmation is on its way to " : "We saved your request and will write to ", bold(values.email), ". What happens next:"], steps);
          return;
        }
        if (response.status === 400 && answer.errors) {
          Object.entries(answer.errors).forEach(([key, message]) => {
            if (!FIELDS[key]) return;
            mark(FIELDS[key], false);
            document.getElementById(`e-${FIELDS[key].slice(2)}`).textContent = message;
          });
          form.querySelector(".is-invalid input")?.focus();
          return;
        }
        showError(answer.error || "Something went wrong on our side. Please try again in a minute.");
      } catch (e) {
        showError("We could not reach the server. Check your connection and try again.");
      } finally {
        button.disabled = false;
      }
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      showError("");
      const { isValid, values } = check();
      if (!isValid) {
        form.querySelector(".is-invalid input")?.focus();
        return;
      }
      // The hidden field only a robot fills in: thank it and send nothing.
      if (values.website.trim()) {
        showConfirm("Request received.", [], []);
        return;
      }
      send(values);
    });

    document.getElementById("signup-again").addEventListener("click", () => {
      confirmBox.hidden = true;
      form.hidden = false;
      input(FIELDS.name).focus();
    });
  }

  /* ---------- the house: faces, tooltips, walks, deals, doors ---------- */
  // The plan is 360 by 300 units. A face stands on a "spot" in a room; a walk goes spot -> the room's door -> along the
  // corridor lanes inside the big room -> the other room's door -> spot, along the shortest route through this graph.
  const NODES = {
    dAsks: [60, 95], a1: [60, 108], dIntros: [160, 95], i1: [160, 108], t1: [235, 108], j: [235, 142],
    dNet: [270, 95], m1: [270, 110], mj: [270, 142], dMM: [250, 142], mc: [270, 184], ma: [322, 184],
    b1: [235, 184], p1: [205, 184], jb1: [125, 184], f1: [45, 184],
    dPerks: [205, 195], dJobs: [125, 195], dFeed: [45, 195], dChat: [267, 195], dAdmin: [322, 195],
  };
  const EDGES = [["dAsks", "a1"], ["a1", "i1"], ["dIntros", "i1"], ["i1", "t1"], ["t1", "j"], ["j", "b1"], ["b1", "p1"], ["p1", "jb1"], ["jb1", "f1"],
    ["dPerks", "p1"], ["dJobs", "jb1"], ["dFeed", "f1"], ["dNet", "m1"], ["m1", "mj"], ["mj", "dMM"], ["dMM", "j"], ["mj", "mc"], ["mc", "ma"], ["dChat", "mc"], ["dAdmin", "ma"]];
  const ADJ = {};
  EDGES.forEach(([a, b]) => { (ADJ[a] = ADJ[a] || []).push(b); (ADJ[b] = ADJ[b] || []).push(a); });
  // each room: its door node (members: the lane node nearest each spot) and its spots; the first two spots of a room
  // are where two people stand to meet.
  const ROOMS = {
    asks: { entry: "dAsks", spots: [[45, 70], [75, 70]] },
    intros: { entry: "dIntros", spots: [[145, 70], [175, 70]] },
    net: { entry: "dNet", spots: [[262, 70], [292, 70], [325, 70]] },
    members: { entry: null, spots: [[100, 128], [130, 128], [190, 128], [60, 128]] },
    msgs: { entry: "mj", spots: [[312, 128], [312, 158]] },
    feed: { entry: "dFeed", spots: [[30, 256], [60, 256]] },
    jobs: { entry: "dJobs", spots: [[105, 256], [135, 256]] },
    perks: { entry: "dPerks", spots: [[190, 256], [220, 256]] },
    chat: { entry: "dChat", spots: [[267, 256]] },
    admin: { entry: "dAdmin", spots: [[322, 256]] },
  };
  const START = { ada: ["asks", 0], priya: ["net", 1], marcus: ["intros", 0], maya: ["msgs", 0], lena: ["jobs", 0], oliver: ["jobs", 1], elena: ["feed", 0], sam: ["chat", 0] };
  const DEALS = [
    { title: "New hire: head of sales", rooms: ["jobs", "intros", "members"] },
    { title: "Raised $10M Series A", rooms: ["members", "intros", "net"] },
    { title: "Closed a Fortune 100 client", rooms: ["perks", "intros", "jobs", "net"] },
    { title: "Found a co-founder coach", rooms: ["asks", "members", "feed", "intros"] },
  ];
  const PLAN_W = 360;
  const PLAN_H = 300;
  const WALK_PX_PER_SECOND = 44;

  function nearestLaneNode(point) {
    return ["a1", "i1", "t1"].reduce((best, key) => (Math.hypot(NODES[key][0] - point[0], NODES[key][1] - point[1]) < Math.hypot(NODES[best][0] - point[0], NODES[best][1] - point[1]) ? key : best));
  }
  function entryOf(spot) { return spot.room.entry || nearestLaneNode(spot.pos); }
  function shortestNodes(from, to) {
    const seen = { [from]: null };
    const queue = [from];
    while (queue.length) {
      const here = queue.shift();
      if (here === to) break;
      (ADJ[here] || []).forEach((next) => { if (!(next in seen)) { seen[next] = here; queue.push(next); } });
    }
    const path = [];
    for (let at = to; at !== null && at !== undefined; at = seen[at]) path.unshift(at);
    return path;
  }
  function routeBetween(a, b) {
    if (a === b) return [a.pos];
    const nodes = shortestNodes(entryOf(a), entryOf(b));
    const points = [a.pos, ...nodes.map((n) => NODES[n]), b.pos];
    return points.filter((p, i) => i === 0 || p[0] !== points[i - 1][0] || p[1] !== points[i - 1][1]);
  }

  function setUpPlan() {
    const plan = document.getElementById("plan");
    if (!plan) return;
    const people = Array.from(plan.querySelectorAll(".p"));
    const staticDeal = document.getElementById("deal");

    /* labels: hover and focus are CSS; a tap toggles, a click elsewhere or Escape hides */
    function placeTip(person) {
      const tip = person.querySelector(".tip");
      const x = parseFloat(person.dataset.x || "0") / PLAN_W;
      const y = parseFloat(person.dataset.y || "0") / PLAN_H;
      tip.classList.toggle("down", y < 0.34);
      const shift = x > 0.72 ? "-82%" : x < 0.22 ? "-18%" : "-50%";
      tip.style.setProperty("--tx", shift);
      tip.style.setProperty("--ax", shift === "-82%" ? "82%" : shift === "-18%" ? "18%" : "50%");
    }
    people.forEach((person) => {
      person.addEventListener("pointerenter", () => placeTip(person));
      person.addEventListener("focus", () => placeTip(person));
      person.addEventListener("pointerdown", () => { person.dataset.wasOn = person.classList.contains("on") ? "1" : ""; });
      person.addEventListener("click", () => {
        const wasOn = person.dataset.wasOn === "1";
        people.forEach((other) => other.classList.remove("on"));
        if (!wasOn) { placeTip(person); person.classList.add("on"); }
      });
    });
    document.addEventListener("click", (event) => { if (!plan.contains(event.target)) people.forEach((p) => p.classList.remove("on")); });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") people.forEach((p) => p.classList.remove("on")); });

    /* the spots, and each person's resting place */
    const spots = [];
    Object.entries(ROOMS).forEach(([key, room]) => {
      room.key = key;
      room.spots = room.spots.map((pos, i) => { const spot = { room, pos, index: i, who: null }; spots.push(spot); return spot; });
    });
    const cast = people.map((el) => {
      const id = Array.from(el.classList).find((c) => c.startsWith("pos-")).slice(4);
      const [roomKey, index] = START[id];
      const spot = ROOMS[roomKey].spots[index];
      const person = { el, id, spot, x: spot.pos[0], y: spot.pos[1], route: null, leg: 0, legT: 0, busy: false, restUntil: 0, deal: null };
      spot.who = person;
      return person;
    });
    function put(person) {
      person.el.dataset.x = String(person.x);
      person.el.dataset.y = String(person.y);
      person.el.style.left = (person.x / PLAN_W) * 100 + "%";
      person.el.style.top = (person.y / PLAN_H) * 100 + "%";
    }

    /* doors: a leaf per door, swung by script (drawn open when nothing moves) */
    const doors = Array.from(plan.querySelectorAll(".door")).map((g) => {
      const leaf = g.querySelector(".leaf");
      const hx = Number(leaf.dataset.hx);
      const hy = Number(leaf.dataset.hy);
      const x2 = Number(leaf.getAttribute("x2"));
      const y2 = Number(leaf.getAttribute("y2"));
      const sweep = Number(g.dataset.sweep);
      // the middle of the gap: the hinge plus half the way to the closed end
      const closed = [hx + Math.cos(Math.atan2(y2 - hy, x2 - hx) + (sweep * Math.PI) / 180) * Math.hypot(x2 - hx, y2 - hy), hy + Math.sin(Math.atan2(y2 - hy, x2 - hx) + (sweep * Math.PI) / 180) * Math.hypot(x2 - hx, y2 - hy)];
      return { leaf, hx, hy, sweep, mid: [(hx + closed[0]) / 2, (hy + closed[1]) / 2], shut: 1, rest: 0.82 };
    });
    function setDoor(door, shut) {
      door.shut = shut;
      door.leaf.setAttribute("transform", `rotate(${(door.sweep * shut).toFixed(1)} ${door.hx} ${door.hy})`);
    }
    function stillHouse() {
      doors.forEach((d) => d.leaf.removeAttribute("transform"));
    }

    /* the loop */
    const state = { alive: false, raf: 0, last: 0, now: 0, nextDealAt: 0, deal: null, visible: true, hovered: null };
    const timers = [];
    function later(ms, fn) { const t = { at: state.now + ms / 1000, fn }; timers.push(t); }

    function scale() { return plan.getBoundingClientRect().width / PLAN_W || 1; }
    function freeSpot(roomKey, near) {
      const room = ROOMS[roomKey];
      const list = room.spots.filter((s) => !s.who);
      if (!list.length) return null;
      return near ? list.reduce((a, b) => (Math.hypot(a.pos[0] - near.x, a.pos[1] - near.y) < Math.hypot(b.pos[0] - near.x, b.pos[1] - near.y) ? a : b)) : list[Math.floor(Math.random() * list.length)];
    }
    function startWalk(person, spot, onArrive) {
      const route = routeBetween(person.spot, spot);
      // leave the old spot free, take the new one now so nobody else walks to it
      if (person.spot) person.spot.who = null;
      spot.who = person;
      person.spot = spot;
      person.route = route;
      person.leg = 0;
      person.legT = 0;
      person.busy = true;
      person.onArrive = onArrive || null;
      person.el.classList.add("walking");
    }
    function stepWalk(person, dt) {
      if (!person.route || state.hovered === person) return;
      let travel = (WALK_PX_PER_SECOND / scale()) * dt;
      while (travel > 0 && person.route && person.leg < person.route.length - 1) {
        const a = person.route[person.leg];
        const b = person.route[person.leg + 1];
        const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const left = length * (1 - person.legT);
        if (travel >= left) { travel -= left; person.leg += 1; person.legT = 0; person.x = b[0]; person.y = b[1]; }
        else { person.legT += travel / length; person.x = a[0] + (b[0] - a[0]) * person.legT; person.y = a[1] + (b[1] - a[1]) * person.legT; travel = 0; }
      }
      if (person.leg >= person.route.length - 1) {
        person.route = null;
        person.busy = false;
        person.el.classList.remove("walking");
        person.restUntil = state.now + 4 + Math.random() * 4;
        const done = person.onArrive;
        person.onArrive = null;
        if (done) done(person);
      }
      put(person);
    }

    function pickIdleWalker() {
      const walkers = cast.filter((p) => p.busy && !p.deal).length;
      if (walkers >= 2) return;
      const ready = cast.filter((p) => !p.busy && !p.deal && state.now >= p.restUntil && state.hovered !== p);
      if (!ready.length) return;
      const person = ready[Math.floor(Math.random() * ready.length)];
      const keys = Object.keys(ROOMS).filter((k) => k !== person.spot.room.key);
      const options = keys.map((k) => freeSpot(k)).filter(Boolean);
      if (!options.length) return;
      startWalk(person, options[Math.floor(Math.random() * options.length)]);
    }

    /* a deal: two people meet in a room, a card pops over their faces, then fades */
    const dealCard = (() => {
      const el = document.createElement("div");
      el.className = "deal live";
      el.setAttribute("aria-hidden", "true");
      el.innerHTML = '<p class="k"><span class="chk"><svg viewBox="0 0 8 8"><path d="M1.2 4.2l1.8 1.8 3.8-4.2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span>Example moment</span></p><h3></h3>';
      return el;
    })();
    function showDeal(deal, a, b) {
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      const w = plan.getBoundingClientRect().width;
      const px = cx * (w / PLAN_W);
      if (dealCard.parentNode !== plan) plan.appendChild(dealCard);
      const half = dealCard.offsetWidth ? dealCard.offsetWidth / 2 : 95;
      const left = Math.min(Math.max(px, half + 4), w - half - 4);
      const above = cy > 120;
      dealCard.querySelector("h3").textContent = deal.title;
      dealCard.className = "deal live " + (above ? "above" : "below");
      dealCard.style.left = left + "px";
      dealCard.style.setProperty("--ax", ((px - left) / (half * 2)) * 100 + 50 + "%");
      const faceHalf = (a.el.offsetWidth || 36) / 2;
      const py = (cy / PLAN_H) * plan.getBoundingClientRect().height;
      dealCard.style.top = above ? "auto" : py + faceHalf + 12 + "px";
      dealCard.style.bottom = above ? plan.getBoundingClientRect().height - py + faceHalf + 12 + "px" : "auto";
      void dealCard.offsetWidth;
      dealCard.classList.add("show");
    }
    function hideDeal() { dealCard.classList.remove("show"); }

    function startDeal() {
      const deal = DEALS[state.dealIndex++ % DEALS.length];
      const free = cast.filter((p) => !p.deal && state.hovered !== p);
      for (const roomKey of deal.rooms) {
        const room = ROOMS[roomKey];
        const [s0, s1] = room.spots;
        // who may take the two meeting spots: the people already standing there, else anyone free
        const there = [s0.who, s1.who].filter(Boolean);
        if (there.some((p) => p.busy || p.deal)) continue;
        const picked = [...there];
        const need = 2 - picked.length;
        const others = free.filter((p) => !picked.includes(p) && !p.busy);
        if (others.length < need) continue;
        // the closest idle people to the room
        others.sort((p, q) => Math.hypot(p.x - s0.pos[0], p.y - s0.pos[1]) - Math.hypot(q.x - s0.pos[0], q.y - s0.pos[1]));
        picked.push(...others.slice(0, need));
        const targets = [s0, s1];
        // people already on a meeting spot keep it
        const placed = picked.map((p) => (p.spot === s0 || p.spot === s1 ? p.spot : null));
        const open = targets.filter((t) => !placed.includes(t));
        const plans = picked.map((p, i) => placed[i] || open.shift());
        const state2 = { arrived: 0, deal };
        picked.forEach((p, i) => {
          p.deal = state2;
          const target = plans[i];
          if (p.spot === target && !p.busy) { state2.arrived += 1; return; }
          startWalk(p, target, () => { state2.arrived += 1; });
        });
        state.deal = { info: state2, people: picked, phase: "walk", at: state.now };
        return true;
      }
      return false;
    }
    function stepDeal() {
      const d = state.deal;
      if (!d) return;
      if (d.phase === "walk" && d.people.every((p) => !p.busy)) {
        d.phase = "show";
        d.at = state.now;
        showDeal(d.info.deal, d.people[0], d.people[1]);
      } else if (d.phase === "show" && state.now - d.at > 3.8) {
        d.phase = "fade";
        d.at = state.now;
        hideDeal();
      } else if (d.phase === "fade" && state.now - d.at > 0.5) {
        d.people.forEach((p) => { p.deal = null; p.restUntil = state.now + 3; });
        state.deal = null;
        state.nextDealAt = state.now + 5.5 + Math.random() * 3;
      }
    }

    /* doors swing open when someone is near and settle most of the way shut after */
    function stepDoors(dt) {
      doors.forEach((door) => {
        let near = false;
        for (const p of cast) if (Math.hypot(p.x - door.mid[0], p.y - door.mid[1]) < 24) { near = true; break; }
        const target = near ? 0.04 : door.rest;
        const next = door.shut + (target - door.shut) * Math.min(1, dt * 7);
        if (Math.abs(next - door.shut) > 0.002) setDoor(door, next);
      });
    }

    function frame(timestamp) {
      if (!state.alive) return;
      const dt = Math.min(0.1, (timestamp - (state.last || timestamp)) / 1000);
      state.last = timestamp;
      state.now += dt;
      for (let i = timers.length - 1; i >= 0; i--) if (state.now >= timers[i].at) { const t = timers.splice(i, 1)[0]; t.fn(); }
      cast.forEach((p) => stepWalk(p, dt));
      stepDeal();
      if (!state.deal && state.now >= state.nextDealAt) { if (!startDeal()) state.nextDealAt = state.now + 2; }
      if (Math.random() < dt * 0.35) pickIdleWalker();
      stepDoors(dt);
      state.raf = requestAnimationFrame(frame);
    }

    function start() {
      if (state.alive) return;
      state.alive = true;
      state.last = 0;
      state.raf = requestAnimationFrame(frame);
    }
    function stop() {
      state.alive = false;
      cancelAnimationFrame(state.raf);
    }
    function settle() {
      // reduced motion, or the script stopped: everyone back in their first room, doors open, the one still card
      stop();
      hideDeal();
      if (dealCard.parentNode) dealCard.remove();
      state.deal = null;
      timers.length = 0;
      cast.forEach((p) => {
        if (p.spot) p.spot.who = null;
        const [roomKey, index] = START[p.id];
        p.spot = ROOMS[roomKey].spots[index];
        p.spot.who = p;
        p.x = p.spot.pos[0]; p.y = p.spot.pos[1];
        p.route = null; p.busy = false; p.deal = null;
        p.el.style.left = ""; p.el.style.top = "";
        p.el.dataset.x = String(p.x); p.el.dataset.y = String(p.y);
        p.el.classList.remove("walking");
      });
      stillHouse();
      if (staticDeal) staticDeal.hidden = false;
    }
    function go() {
      cast.forEach((p) => put(p));
      doors.forEach((d) => setDoor(d, d.rest));
      if (staticDeal) staticDeal.hidden = true;
      state.dealIndex = 0;
      state.nextDealAt = state.now + 1.6;
      start();
    }

    cast.forEach((p) => {
      p.el.addEventListener("pointerenter", () => { state.hovered = p; });
      p.el.addEventListener("pointerleave", () => { if (state.hovered === p) state.hovered = null; });
      p.el.addEventListener("focus", () => { state.hovered = p; });
      p.el.addEventListener("blur", () => { if (state.hovered === p) state.hovered = null; });
    });

    function sync() { if (motionOn()) { if (!state.alive) go(); } else settle(); }
    if (reduceQuery && reduceQuery.addEventListener) reduceQuery.addEventListener("change", sync);
    // nothing walks off-screen or in a hidden tab
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => {
        state.visible = entries[0].isIntersecting;
        if (!motionOn()) return;
        if (state.visible && !document.hidden) start(); else stop();
      }).observe(plan);
    }
    document.addEventListener("visibilitychange", () => { if (!motionOn()) return; if (document.hidden) stop(); else if (state.visible) start(); });
    sync();
  }

  /* ---------- the hover field: plan-view doors that open in circular waves from the pointer ---------- */
  // A grid of doors (72 px cells) behind the first screen, each drawn as on a floor plan: a wall with a gap and jamb
  // ticks, the leaf closed across the gap, in one of four orientations. Moving the pointer (or a finger) starts a
  // circular wave (560 px/s; a new one every 110 ms and 36 px of travel, up to 8 at once). A door whose centre the
  // wavefront passes swings its leaf open 90 degrees in 400 ms while its quarter-circle arc inks in, holds 900 ms and
  // swings shut in 400 ms. Doors whose drawing touches a button, the GitHub card, the plan or a line of the eyebrow,
  // headline or sub-line (plus about 8 px) stay shut and never trigger. Reduced motion: drawn once, closed, no listeners.
  function setUpField() {
    const canvas = document.getElementById("field");
    const hero = document.getElementById("top");
    if (!canvas || !hero || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");
    const CELL = 72;
    const HALF_GAP = 14;      // half of the door opening; the leaf is 28 px long
    const WALL_END = 31;      // the wall runs 31 px each side of the cell centre
    const JAMB = 3.5;         // the tick across the wall at each side of the opening
    const OPEN_MS = 400;
    const HOLD_MS = 900;
    const SHUT_MS = 400;
    const SPEED = 560;        // wavefront, px per second
    const REACH = 560;        // a wave ends when its circle is this wide
    const MAX_WAVES = 8;
    const PAD = 8;            // keep-out margin beyond the door's own footprint
    const LEAF = 2 * HALF_GAP;
    const doors = [];
    const waves = [];
    const box = { left: 0, top: 0 };   // the one cached hero rect, refreshed on build and on scroll
    let width = 0;
    let height = 0;
    let dpr = 1;
    let ink = "17, 17, 16";
    let dark = false;
    let running = false;
    let last = 0;
    let spawnAt = -1e9;
    let spawnX = -1e9;
    let spawnY = -1e9;
    let listening = false;
    let scrollPending = false;

    function readTheme() {
      ink = getComputedStyle(html).getPropertyValue("--ink-rgb").trim() || ink;
      dark = html.getAttribute("data-theme") === "dark";
    }
    function readBox() { const r = hero.getBoundingClientRect(); box.left = r.left; box.top = r.top; }

    // The foreground a door must stay clear of: the buttons, the GitHub card and the plan (data-skip) and the lines of text
    // of the eyebrow, the H1 and the sub-line (data-skip-text), in hero coordinates.
    function keepOut() {
      const b = hero.getBoundingClientRect();
      const zones = [];
      const add = (r) => { if (r.width >= 1 && r.height >= 1) zones.push({ x0: r.left - b.left - 6, y0: r.top - b.top - 6, x1: r.right - b.left + 6, y1: r.bottom - b.top + 6 }); };
      hero.querySelectorAll("[data-skip]").forEach((el) => add(el.getBoundingClientRect()));
      hero.querySelectorAll("[data-skip-text]").forEach((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        Array.from(range.getClientRects()).forEach(add);
      });
      return zones;
    }
    // World bounding box of a door's wall run and swing quarter, for its orientation.
    function footprint(d) {
      const xs = [];
      const ys = [];
      [[-WALL_END, -JAMB, WALL_END, JAMB], [-HALF_GAP, -LEAF, HALF_GAP, 0]].forEach((q) => {
        [[q[0], q[1]], [q[2], q[1]], [q[0], q[3]], [q[2], q[3]]].forEach((p) => {
          xs.push(d.x + p[0] * d.c - p[1] * d.s);
          ys.push(d.y + p[0] * d.s + p[1] * d.c);
        });
      });
      return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
    }
    function build() {
      readTheme();
      readBox();
      const r = hero.getBoundingClientRect();
      width = Math.max(1, Math.round(r.width));
      height = Math.max(1, Math.round(r.height));
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      const zones = keepOut();
      const cols = Math.max(1, Math.floor(width / CELL));
      const rows = Math.max(1, Math.floor(height / CELL));
      const ox = (width - cols * CELL) / 2 + CELL / 2;
      const oy = (height - rows * CELL) / 2 + CELL / 2;
      let seed = 11;
      const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      doors.length = 0;
      waves.length = 0;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          // four orientations: the wall runs along x or y, and the hinge sits at either end of it
          const angle = Math.floor(rand() * 4) * Math.PI / 2;
          const d = { x: ox + i * CELL, y: oy + j * CELL, c: Math.round(Math.cos(angle)), s: Math.round(Math.sin(angle)), p: 0, phase: 0, hold: 0, locked: false };
          const f = footprint(d);
          d.locked = zones.some((q) => f.x1 > q.x0 - PAD && f.x0 < q.x1 + PAD && f.y1 > q.y0 - PAD && f.y0 < q.y1 + PAD);
          doors.push(d);
        }
      }
      draw();
    }

    // Door space: the wall along x through the origin, the hinge at (-HALF_GAP, 0), the leaf swinging toward -y.
    function toWorld(d) { ctx.setTransform(dpr * d.c, dpr * d.s, -dpr * d.s, dpr * d.c, dpr * d.x, dpr * d.y); }
    function base() { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    function wallPath(d) {
      toWorld(d);
      ctx.moveTo(-WALL_END, 0); ctx.lineTo(-HALF_GAP, 0);
      ctx.moveTo(HALF_GAP, 0); ctx.lineTo(WALL_END, 0);
      ctx.moveTo(-HALF_GAP, -JAMB); ctx.lineTo(-HALF_GAP, JAMB);
      ctx.moveTo(HALF_GAP, -JAMB); ctx.lineTo(HALF_GAP, JAMB);
    }
    const ease = (p) => p * p * (3 - 2 * p);
    const rgba = (a) => "rgba(" + ink + "," + a.toFixed(3) + ")";

    function draw() {
      base();
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      const rest = dark ? 0.07 : 0.05;   // strokes overlap at the jambs, so the drawn peak at rest is about 1.6x this: ~8% light, ~11% dark
      // all shut doors in two strokes: the walls, then the closed leaves
      ctx.beginPath();
      for (const d of doors) if (d.phase === 0) wallPath(d);
      base(); ctx.lineWidth = 2; ctx.strokeStyle = rgba(rest); ctx.stroke();
      ctx.beginPath();
      for (const d of doors) if (d.phase === 0) { toWorld(d); ctx.moveTo(-HALF_GAP, 0); ctx.lineTo(HALF_GAP, 0); }
      base(); ctx.lineWidth = 1.2; ctx.strokeStyle = rgba(rest); ctx.stroke();
      // doors in motion, one by one
      for (const d of doors) {
        if (d.phase === 0) continue;
        const e = ease(d.p);
        const theta = e * Math.PI / 2;
        ctx.beginPath(); wallPath(d); base();
        ctx.lineWidth = 2; ctx.strokeStyle = rgba(rest + (0.22 - rest) * e); ctx.stroke();
        // the arc inks in while the leaf opens, stays full while it holds, and fades with the leaf as it shuts
        const sweep = d.phase === 1 ? theta : Math.PI / 2;
        const arcAlpha = 0.32 * (d.phase === 3 ? e : 1);
        if (sweep > 0.01 && arcAlpha > 0.004) {
          ctx.beginPath(); toWorld(d);
          ctx.arc(-HALF_GAP, 0, LEAF, 0, -sweep, true);
          base(); ctx.lineWidth = 1; ctx.strokeStyle = rgba(arcAlpha); ctx.stroke();
        }
        ctx.beginPath(); toWorld(d);
        ctx.moveTo(-HALF_GAP, 0); ctx.lineTo(-HALF_GAP + LEAF * Math.cos(theta), -LEAF * Math.sin(theta));
        base(); ctx.lineWidth = 1.2 + 0.5 * e; ctx.strokeStyle = rgba(rest + (0.55 - rest) * e); ctx.stroke();
      }
    }

    function trigger(d) {
      if (d.phase === 0 || d.phase === 3) { d.phase = 1; d.p = d.p || 0; }   // idle or shutting: (re)open from where it is
      else if (d.phase === 2) d.hold = HOLD_MS;                                // already open: keep it open longer
    }
    function frame(time) {
      const dt = Math.min(100, last ? time - last : 16);
      last = time;
      for (let w = waves.length - 1; w >= 0; w--) {
        const wave = waves[w];
        const before = wave.r * wave.r;
        wave.r += SPEED * dt / 1000;
        const after = wave.r * wave.r;
        for (const d of doors) {
          if (d.locked) continue;
          const dx = d.x - wave.x;
          const dy = d.y - wave.y;
          const q = dx * dx + dy * dy;
          if (q <= after && (q > before || wave.first)) trigger(d);
        }
        wave.first = false;
        if (wave.r > REACH) waves.splice(w, 1);
      }
      let busy = waves.length > 0;
      for (const d of doors) {
        if (d.phase === 0) continue;
        busy = true;
        if (d.phase === 1) { d.p += dt / OPEN_MS; if (d.p >= 1) { d.p = 1; d.phase = 2; d.hold = HOLD_MS; } }
        else if (d.phase === 2) { d.hold -= dt; if (d.hold <= 0) d.phase = 3; }
        else { d.p -= dt / SHUT_MS; if (d.p <= 0) { d.p = 0; d.phase = 0; } }
      }
      draw();
      if (busy) requestAnimationFrame(frame);
      else { running = false; last = 0; }
    }
    function wake() { if (!running) { running = true; last = 0; requestAnimationFrame(frame); } }

    function spawn(clientX, clientY) {
      const x = clientX - box.left;
      const y = clientY - box.top;
      if (y < -80 || y > height + 80 || x < -80 || x > width + 80) return;
      const now = performance.now();
      if (now - spawnAt < 110 || Math.hypot(x - spawnX, y - spawnY) < 36) return;
      spawnAt = now; spawnX = x; spawnY = y;
      if (waves.length >= MAX_WAVES) waves.shift();
      waves.push({ x, y, r: 0, first: true });
      wake();
    }
    function onMouse(event) { spawn(event.clientX, event.clientY); }
    function onTouch(event) { if (event.touches[0]) spawn(event.touches[0].clientX, event.touches[0].clientY); }
    function onScroll() {
      if (scrollPending) return;
      scrollPending = true;
      requestAnimationFrame(() => { scrollPending = false; readBox(); });
    }
    // Listeners exist only while motion is allowed.
    function listen(on) {
      if (on === listening) return;
      listening = on;
      const act = on ? "addEventListener" : "removeEventListener";
      document[act]("mousemove", onMouse, { passive: true });
      document[act]("touchmove", onTouch, { passive: true });
      document[act]("touchstart", onTouch, { passive: true });
      window[act]("scroll", onScroll, { passive: true });
    }

    function refresh() {
      listen(motionOn());
      build();
    }
    let resizeTimer;
    function rebuild() { clearTimeout(resizeTimer); resizeTimer = setTimeout(refresh, 120); }
    window.addEventListener("resize", rebuild);
    if (window.ResizeObserver) new ResizeObserver(rebuild).observe(hero);
    window.addEventListener("themechange", () => { readTheme(); draw(); });
    if (reduceQuery && reduceQuery.addEventListener) reduceQuery.addEventListener("change", refresh);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
    refresh();
  }

  function init() {
    setUpTheme();
    setUpCopy();
    setUpSetup();
    setUpSignup();
    setUpPlan();
    setUpField();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
