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

// --- Dropdown Options Data ---
const courierOptions = {
  domestic: [
    { value: "local", text: "Local" },
    { value: "regional", text: "Regional/Neighbouring State" },
    { value: "national", text: "National/All Over India" }
  ],
  international: [
    { value: "uk", text: "United Kingdom" },
    { value: "usa", text: "United States Of America" },
    { value: "singapore", text: "Singapore" },
    { value: "uae", text: "United Arab Emirates" }
  ]
};

// --- Indian & International Market Rates (in INR) ---
const marketRates = {
  local:     { baseFee: 60,   extraPerKg: 50 },
  regional:  { baseFee: 90,   extraPerKg: 80 },
  national:  { baseFee: 140,  extraPerKg: 120 },
  uae:       { baseFee: 1500, extraPerKg: 450 },
  singapore: { baseFee: 1500, extraPerKg: 400 },
  uk:        { baseFee: 1900, extraPerKg: 600 },
  usa:       { baseFee: 2550, extraPerKg: 865 }
};

const insuranceRates = {
  low: 0.0025,
  medium: 0.005,
  high: 0.05
};

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR"
});

// --- Populate 2nd Dropdown based on Category ---
function updateCourierOptions() {
  const category = $("couriercategory")?.value || "domestic";
  const typeSelect = $("couriertype");
  const serviceSelect = $("service");
  if (!typeSelect) return;

  typeSelect.innerHTML = courierOptions[category]
    .map((opt) => `<option value="${opt.value}">${opt.text}</option>`)
    .join("");

  // Disable "Road" for International shipments (only Air & Ship allowed overseas)
  if (serviceSelect) {
    const roadOption = serviceSelect.querySelector('option[value="Road"]');
    if (category === "international") {
      if (roadOption) roadOption.disabled = true;
      if (serviceSelect.value === "Road") serviceSelect.value = "Air";
    } else {
      if (roadOption) roadOption.disabled = false;
    }
  }

  quote();
}

// --- quotation ---
function quote() {
  const L = +$("L").value || 0, W = +$("W").value || 0, H = +$("H").value || 0;
  const w = +$("weight").value || 0;
  const svc = $("service").value; // "Road", "Air", or "Ship"
  const courier = ($("couriertype")?.value || "local").toLowerCase();

  // Volumetric weight vs Actual weight
  const vol = (L * W * H) / 5000;
  const cw = Math.max(w, vol);

  // Get base rates for selected destination
  const baseRates = marketRates[courier] || marketRates.local;
  const isDomestic = ["local", "regional", "national"].includes(courier);

  // Mode multiplier: Ship is economical (0.7x), Domestic Air is express (1.5x), Road is 1.0x
  let serviceMultiplier = 1;
  if (svc === "Ship") {
    serviceMultiplier = 0.7;
  } else if (svc === "Air" && isDomestic) {
    serviceMultiplier = 1.5;
  }

  const flat = Math.round(baseRates.baseFee * serviceMultiplier);      // Base fee (covers first 1 kg)
  const rate = Math.round(baseRates.extraPerKg * serviceMultiplier);   // Rate per extra kg above 1 kg

  // Calculate shipping subtotal (0 if weight is 0)
  let sub = 0;
  if (cw > 0) {
    sub = flat + (cw > 1 ? (cw - 1) * rate : 0);
  }

  const parcelValue = +$("cargoValue").value || 0;
  const insuranceRisk = $("insuranceRisk").value;
  const insuranceRate = insuranceRates[insuranceRisk] || insuranceRates.low;
  const ins = $("insurance").checked
    ? Math.round((parcelValue * insuranceRate + Number.EPSILON) * 100) / 100
    : 0;
  const total = sub + ins;

  // Update DOM elements
  $("qW").textContent = cw.toFixed(2);
  $("qR").textContent = inrFormatter.format(rate);
  $("qF").textContent = inrFormatter.format(flat);
  $("qI").textContent = inrFormatter.format(ins);
  $("qT").textContent = inrFormatter.format(total);

  return total;
}

function updateInsuranceFields() {
  $("insuranceDetails").hidden = !$("insurance").checked;
}

// --- Event Listeners ---
if ($("couriercategory")) {
  $("couriercategory").addEventListener("change", updateCourierOptions);
}

["L", "W", "H", "weight"].forEach((id) => {
  if ($(id)) $(id).addEventListener("input", quote);
});

["cargoValue"].forEach((id) => {
  if ($(id)) $(id).addEventListener("input", quote);
});

["service", "couriertype", "insuranceRisk"].forEach((id) => {
  if ($(id)) $(id).addEventListener("change", quote);
});
if ($("insurance")) {
  $("insurance").addEventListener("change", () => {
    updateInsuranceFields();
    quote();
  });
}

// --- submit ---
function submitBooking(e) {
  e.preventDefault();
  const f = (id) => $(id).value.trim();
  const total = quote();
  const list = load();
  const courierSelect = $("couriertype");
  const courierText = courierSelect ? courierSelect.options[courierSelect.selectedIndex].text : "Local";
  const parcelValue = +$("cargoValue").value || 0;

  const b = {
    id: Date.now().toString(36),
    name: f("name"), phone: f("phone"), email: f("email"),
    cargoName: f("cargoName"), desc: f("desc"),
    L: +$("L").value, W: +$("W").value, H: +$("H").value,
    weight: +$("weight").value, service: $("service").value,
    courier: courierText,
    pickup: f("pickup"), delivery: f("delivery"),
    insurance: $("insurance").checked,
    parcelValue,
    insuranceRisk: $("insuranceRisk").value,
    total, status: "Pending",
    created: new Date().toLocaleString()
  };
  if (!b.name || !b.cargoName || !b.pickup || !b.delivery) {
    $("msg").textContent = "✗ FILL ALL REQUIRED FIELDS"; return;
  }
  if (b.insurance && parcelValue <= 0) {
    $("msg").textContent = "✗ ENTER A PARCEL VALUE FOR INSURANCE"; return;
  }
  list.push(b);
  save(list);
  $("cargoForm").reset();
  updateInsuranceFields();
  updateCourierOptions();
  $("msg").textContent = "✓ BOOKING SAVED — VIEW IN MY BOOKINGS";
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
        <b>${b.cargoName}</b> · ${b.service} (${b.courier || "Local"}) · ${b.weight}kg / ${b.L}×${b.W}×${b.H}cm
        → ${b.delivery}<br>
        ${b.name} · ${b.phone} · <b>${inrFormatter.format(b.total)}</b>
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

// Initialize options on load
updateCourierOptions();
