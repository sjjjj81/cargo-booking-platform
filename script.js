const KEY = "cargoBookings";
const $ = (id) => document.getElementById(id);

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; }
  catch { return []; }
}
function save(list) { localStorage.setItem(KEY, JSON.stringify(list)); }

const VIEW = { book: "book-view", list: "list-view" };
function show(which) {
  Object.keys(VIEW).forEach((k) => $(VIEW[k]).classList.toggle("hidden", k !== which));
  document.querySelectorAll(".navbtn").forEach((b) =>
    b.classList.toggle("active", b.id === which));
  if (which === "list") renderList();
}

// --- quotation ---
function quote() {
  const L = +$("L").value || 0, W = +$("W").value || 0, H = +$("H").value || 0;
  const w = +$("weight").value || 0;
  const svc = $("service").value;
  const vol = (L * W * H) / 5000;
  const cw = Math.max(w, vol);
  const rate = svc === "Air" ? 8 : 2;
  const flat = svc === "Air" ? 150 : 50;
  const sub = cw * rate + flat;
  const ins = $("insurance").checked ? 10 : 0;
  const total = sub + ins;
  $("qW").textContent = cw.toFixed(2);
  $("qR").textContent = rate.toFixed(2);
  $("qF").textContent = flat;
  $("qI").textContent = ins;
  $("qT").textContent = total.toFixed(2);
  return total;
}
["L", "W", "H", "weight", "service", "insurance"].forEach((id) =>
  $(id).addEventListener("input", quote));

// --- submit ---
function submitBooking(e) {
  e.preventDefault();
  const f = (id) => $(id).value.trim();
  const total = quote();
  const list = load();
  const b = {
    id: Date.now().toString(36),
    name: f("name"), phone: f("phone"), email: f("email"),
    cargoName: f("cargoName"), desc: f("desc"),
    L: +$("L").value, W: +$("W").value, H: +$("H").value,
    weight: +$("weight").value, service: $("service").value,
    pickup: f("pickup"), delivery: f("delivery"),
    insurance: $("insurance").checked, total, status: "Pending",
    created: new Date().toLocaleString()
  };
  if (!b.name || !b.cargoName || !b.pickup || !b.delivery) {
    $("msg").textContent = "✗ FILL ALL REQUIRED FIELDS"; return;
  }
  list.push(b);
  save(list);
  $("cargoForm").reset();
  $("msg").textContent = "✓ BOOKING SAVED — VIEW IN MY BOOKINGS";
  quote();
  setTimeout(() => show("list"), 700);
}

// --- dashboard ---
function renderList() {
  const list = load();
  const box = $("bookings");
  if (!list.length) { box.innerHTML = '<div class="empty">NO BOOKINGS YET</div>'; return; }
  box.innerHTML = list.map((b) => `
    <div class="book">
      <div class="info">
        <b>${b.cargoName}</b> · ${b.service} · ${b.weight}kg / ${b.L}×${b.W}×${b.H}cm
        → ${b.delivery}<br>
        ${b.name} · ${b.phone} · ${b.total.toFixed(2)}
        <div class="status ${b.status === "Confirmed" ? "confirmed" : ""}">${b.status.toUpperCase()}</div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="act" onclick="toggleStatus('${b.id}')">
          ${b.status === "Pending" ? "► CONFIRM" : "↺ PENDING"}
        </button>
        <button class="act" onclick="deleteBooking('${b.id}')">✕</button>
      </div>
    </div>`).join("");
}

function toggleStatus(id) {
  const list = load().map((b) =>
    b.id === id ? { ...b, status: b.status === "Pending" ? "Confirmed" : "Pending" } : b);
  save(list); renderList();
}
function deleteBooking(id) {
  save(load().filter((b) => b.id !== id)); renderList();
}
function clearAll() {
  if (confirm("DELETE ALL BOOKINGS?")) { save([]); renderList(); }
}

quote();