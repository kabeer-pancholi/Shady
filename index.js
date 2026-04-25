const SHADE_KEYS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
const MIX = {
  50: { dir: "light", t: 0.85 },
  100: { dir: "light", t: 0.7 },
  200: { dir: "light", t: 0.55 },
  300: { dir: "light", t: 0.38 },
  400: { dir: "light", t: 0.2 },
  500: { dir: "base", t: 0 },
  600: { dir: "dark", t: 0.15 },
  700: { dir: "dark", t: 0.35 },
  800: { dir: "dark", t: 0.55 },
  900: { dir: "dark", t: 0.68 },
};

let selectedShades = new Set(SHADE_KEYS);
let lastSwatches = [];

/* ── Build dropdown items ── */
const dropMenu = document.getElementById("dropdownMenu");
document.getElementById("allItem").addEventListener("click", toggleAll);

SHADE_KEYS.forEach((shade) => {
  const item = document.createElement("div");
  item.className = "dropdown-item";
  item.dataset.value = shade;
  item.innerHTML = `<div class="checkbox checked" id="cb-${shade}"></div><span>${shade}</span>`;
  item.addEventListener("click", () => {
    if (selectedShades.has(shade)) selectedShades.delete(shade);
    else selectedShades.add(shade);
    syncCheckboxes();
    updateLabel();
  });
  dropMenu.appendChild(item);
});

/* ── Dropdown toggle ── */
const trigger = document.getElementById("dropdownTrigger");
trigger.addEventListener("click", (e) => {
  e.stopPropagation();
  trigger.classList.toggle("open");
  dropMenu.classList.toggle("open");
});
document.addEventListener("click", () => {
  trigger.classList.remove("open");
  dropMenu.classList.remove("open");
});
dropMenu.addEventListener("click", (e) => e.stopPropagation());

function toggleAll() {
  if (selectedShades.size === SHADE_KEYS.length) selectedShades.clear();
  else SHADE_KEYS.forEach((s) => selectedShades.add(s));
  syncCheckboxes();
  updateLabel();
}
function syncCheckboxes() {
  SHADE_KEYS.forEach((s) =>
    document
      .getElementById("cb-" + s)
      .classList.toggle("checked", selectedShades.has(s)),
  );
  document
    .getElementById("cb-all")
    .classList.toggle("checked", selectedShades.size === SHADE_KEYS.length);
}
function updateLabel() {
  const lbl = document.getElementById("triggerLabel");
  if (!selectedShades.size) {
    lbl.textContent = "Select shades";
    return;
  }
  if (selectedShades.size === SHADE_KEYS.length) {
    lbl.textContent = "All shades";
    return;
  }
  lbl.textContent = SHADE_KEYS.filter((s) => selectedShades.has(s)).join(", ");
}

/* ── Colour math ── */
function hexToRgb(hex) {
  hex = hex.replace("#", "");
  if (hex.length === 3)
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ];
}
function rgbToHex([r, g, b]) {
  return (
    "#" +
    [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")
  );
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function shadeRgb(base, shade) {
  const { dir, t } = MIX[shade];
  if (dir === "base") return [...base];
  if (dir === "light") return base.map((c) => lerp(c, 255, t));
  return base.map((c) => lerp(c, 0, t));
}
function contrast(hex) {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55
    ? "rgba(0,0,0,0.65)"
    : "rgba(255,255,255,0.82)";
}

/* ── Generate ── */
function generate() {
  const raw = document.getElementById("hexInput").value.trim();
  const hex = raw.startsWith("#") ? raw : "#" + raw;
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    showToast("Enter a valid 6-digit hex colour");
    return;
  }
  if (!selectedShades.size) {
    showToast("Select at least one shade");
    return;
  }

  const base = hexToRgb(hex);
  const keys = SHADE_KEYS.filter((s) => selectedShades.has(s));
  lastSwatches = keys.map((shade) => {
    const rgb = shadeRgb(base, shade).map(Math.round);
    return {
      shade,
      hex: rgbToHex(rgb),
      rgb: `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`,
    };
  });

  renderSwatches();
}

function renderSwatches() {
  const wrap = document.getElementById("swatchesWrap");
  wrap.innerHTML = "";

  lastSwatches.forEach(({ shade, hex, rgb }) => {
    const fg = contrast(hex);
    const col = document.createElement("div");
    col.className = "swatch-col";
    col.style.background = hex;
    col.innerHTML = `
            <div class="copied-flash" style="color:${fg}">Copied!</div>
            <div class="swatch-shade" style="color:${fg}">${shade}</div>
            <div class="swatch-hex"   style="color:${fg}">${hex.toUpperCase()}</div>
        `;
    col.addEventListener("click", () => {
      navigator.clipboard.writeText(hex.toUpperCase()).then(() => {
        col.classList.add("copied");
        showToast("Copied " + hex.toUpperCase());
        setTimeout(() => col.classList.remove("copied"), 1100);
      });
    });
    wrap.appendChild(col);
  });

  document.getElementById("paletteCard").classList.add("visible");
}

/* ── Export ── */
function exportCss() {
  const vars = lastSwatches
    .map(({ shade, hex }) => `  --color-${shade}: ${hex.toUpperCase()};`)
    .join("\n");
  navigator.clipboard
    .writeText(`:root {\n${vars}\n}`)
    .then(() => showToast("CSS variables copied"));
}
function exportJson() {
  const obj = {};
  lastSwatches.forEach(({ shade, hex, rgb }) => {
    obj[shade] = { hex: hex.toUpperCase(), rgb };
  });
  navigator.clipboard
    .writeText(JSON.stringify(obj, null, 2))
    .then(() => showToast("JSON copied"));
}

/* ── Colour inputs sync ── */
const picker = document.getElementById("colorPicker");
const hexInp = document.getElementById("hexInput");
picker.addEventListener("input", (e) => {
  hexInp.value = e.target.value;
});
hexInp.addEventListener("input", (e) => {
  const v = e.target.value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) picker.value = v;
});
hexInp.addEventListener("keydown", (e) => {
  if (e.key === "Enter") generate();
});

/* ── Toast ── */
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.style.opacity = "1";
  setTimeout(() => {
    t.style.opacity = "0";
  }, 1800);
}

generate();
