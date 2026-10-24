const STORAGE_KEY = "countdowns_v1";

const RING_RADIUS = 42;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const form      = document.getElementById("addForm");
const nameInput = document.getElementById("nameInput");
const dateInput = document.getElementById("dateInput");
const listEl    = document.getElementById("list");

let countdowns = load();

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    return raw.map((c) => ({
      ...c,
      createdAt: c.createdAt || Date.now(),
    }));
  } catch {
    return [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(countdowns));
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  const date = dateInput.value;
  if (!name || !date) return;

  const target = new Date(date + "T23:59:59").getTime();
  const now = Date.now();

  if (target <= now) {
    alert("Pick a future date ⏰");
    return;
  }

  countdowns.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name,
    target,
    createdAt: now,
  });

  save();
  nameInput.value = "";
  dateInput.value = "";
  nameInput.focus();
  render();
});
function remove(id) {
  countdowns = countdowns.filter((c) => c.id !== id);
  save();
  render();
}

function daysLeft(target) {
  const ms = target - Date.now();
  return {
    ms,
    days: Math.floor(Math.abs(ms) / 86_400_000),
  };
}

function stateClass(ms) {
  if (ms <= 0) return "expired";
  if (ms < 24 * 3_600_000) return "soon";
  return "far";
}

function progressFraction(createdAt, target) {
  const total = target - createdAt;
  if (total <= 0) return 1;
  const elapsed = Date.now() - createdAt;
  return Math.min(1, Math.max(0, elapsed / total));
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}
function render() {
    const sorted = [...countdowns].sort((a, b) => {
    const aExp = a.target - Date.now() <= 0;
    const bExp = b.target - Date.now() <= 0;
    if (aExp !== bExp) return aExp ? 1 : -1;
    return a.target - b.target;
  });

  listEl.innerHTML = sorted
    .map((c) => {
      const t = daysLeft(c.target);
      const cls = stateClass(t.ms);
      const expired = t.ms <= 0;

      const fraction = progressFraction(c.createdAt, c.target);
      const pct = Math.round(fraction * 100);
      const dashOffset = RING_CIRCUMFERENCE * (1 - fraction);

      // Date only — no time, no AM/PM
      const displayDate = new Date(c.target).toLocaleDateString(undefined, {
        dateStyle: "medium",
      });

      const daysBlock = expired
        ? `<span class="expired-label">⏰ Time's up!</span>`
        : `
          <div class="unit">
            <span class="num">${t.days}</span>
            <span class="label">${t.days === 1 ? "day" : "days"} left</span>
          </div>
        `;

      return `
        <div class="countdown ${cls}" data-id="${c.id}">
          <div class="ring-wrap">
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <circle class="ring-track" cx="50" cy="50" r="${RING_RADIUS}" />
              <circle
                class="ring-progress"
                cx="50" cy="50" r="${RING_RADIUS}"
                stroke-dasharray="${RING_CIRCUMFERENCE}"
                stroke-dashoffset="${dashOffset}"
              />
            </svg>
            <div class="ring-label">
              <span class="pct">${pct}%</span>
              <span class="sub">done</span>
            </div>
          </div>

          <div class="info">
          <div class="name">${escapeHtml(c.name)}</div>
          <div class="date">${displayDate}</div>
          <div class="time">${daysBlock}</div>
          </div>

          <button class="delete-btn" data-del="${c.id}" title="Delete">✕</button>
        </div>
      `;
    })
    .join("");
}

listEl.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-del]");
  if (btn) remove(btn.dataset.del);
});

setInterval(render, 1000);
render();