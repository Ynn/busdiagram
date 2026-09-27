// Documentation: example tabs, copy buttons, and offline search.
(function () {
  document.querySelectorAll(".tabs").forEach((bar) => {
    bar.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-tab]");
      if (!btn) return;
      bar.querySelectorAll("button[data-tab]").forEach((b) => {
        const on = b === btn;
        b.setAttribute("aria-selected", String(on));
        document.getElementById(b.dataset.tab).hidden = !on;
      });
    });
  });

  document.querySelectorAll("pre.code").forEach((pre) => {
    const b = document.createElement("button");
    b.className = "copy";
    b.type = "button";
    b.textContent = "Copy";
    b.addEventListener("click", async () => {
      const text = pre.querySelector("code").textContent;
      try {
        await navigator.clipboard.writeText(text);
        b.textContent = "Copied";
      } catch {
        const r = document.createRange();
        r.selectNodeContents(pre.querySelector("code"));
        getSelection().removeAllRanges();
        getSelection().addRange(r);
        b.textContent = "Ctrl+C";
      }
      setTimeout(() => (b.textContent = "Copy"), 1500);
    });
    pre.append(b);
  });

  const base = document.currentScript?.dataset.base ?? "";
  const input = document.querySelector(".search input");
  const list = document.querySelector(".search .results");
  if (!input || !list) return;
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  let sel = -1;
  const render = () => {
    const q = norm(input.value.trim());
    list.replaceChildren();
    sel = -1;
    if (q.length < 2 || !window.BUSDIAGRAM_SEARCH) return (list.hidden = true);
    const hits = [];
    window.BUSDIAGRAM_SEARCH.forEach((p) => {
      if (norm(p.t).includes(q))
        hits.push({ t: p.t, u: p.u, s: p.s, score: 0 });
      p.h.forEach(
        ([t, id]) =>
          norm(t).includes(q) &&
          hits.push({ t, u: `${p.u}#${id}`, s: p.t, score: 1 }),
      );
    });
    hits.sort((a, b) => a.score - b.score);
    hits.slice(0, 14).forEach((h) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = base + h.u;
      a.textContent = h.t;
      const sm = document.createElement("small");
      sm.textContent = h.s;
      a.append(sm);
      li.append(a);
      list.append(li);
    });
    list.hidden = !hits.length;
  };
  input.addEventListener("input", render);
  input.addEventListener("keydown", (e) => {
    const links = [...list.querySelectorAll("a")];
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      sel = Math.max(
        0,
        Math.min(links.length - 1, sel + (e.key === "ArrowDown" ? 1 : -1)),
      );
      links.forEach((l, i) => l.classList.toggle("sel", i === sel));
    } else if (e.key === "Enter" && links.length)
      location.href = links[Math.max(0, sel)].href;
    else if (e.key === "Escape") list.hidden = true;
  });
  document.addEventListener("keydown", (e) => {
    if (
      e.key === "/" &&
      document.activeElement !== input &&
      !e.target.closest("input,textarea,bus-diagram")
    ) {
      e.preventDefault();
      input.focus();
    }
  });
  document.addEventListener(
    "click",
    (e) => !e.target.closest(".search") && (list.hidden = true),
  );
})();
