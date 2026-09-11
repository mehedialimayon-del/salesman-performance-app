/* =========================================================
   SALES PERFORMANCE HUB
   Version 2
   ========================================================= */

const USERS = {
  manager: {
    username: "manager",
    pin: "2468",
    name: "Manager",
    role: "manager",
    staffId: ""
  },

  emon: {
    username: "emon",
    pin: "1111",
    name: "Badruddoza Emon",
    role: "salesman",
    staffId: "22075"
  },

  limon: {
    username: "limon",
    pin: "2222",
    name: "Limon Majumdar",
    role: "salesman",
    staffId: ""
  },

  manna: {
    username: "manna",
    pin: "3333",
    name: "Manna Hossain",
    role: "salesman",
    staffId: ""
  },

  ayon: {
    username: "ayon",
    pin: "4444",
    name: "Mehedi Alim Ayon",
    role: "salesman",
    staffId: ""
  }
};


/* =========================================================
   STORAGE
   New key means old demo data will NOT show.
   Everyone starts from ZERO.
   ========================================================= */

const STORAGE_KEY = "salesPerformanceHub_v2";

let state = loadState();
let currentUser = null;
let currentPage = "dashboard";
let managerViewing = "emon";


function emptyState() {
  return {
    entries: [],
    plans: [],
    incentives: {},
    tasks: []
  };
}


function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return emptyState();
    }

    return {
      ...emptyState(),
      ...JSON.parse(saved)
    };

  } catch (error) {
    return emptyState();
  }
}


function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(state)
  );
}


/* =========================================================
   BASIC HELPERS
   ========================================================= */

function todayISO() {
  const d = new Date();

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${y}-${m}-${day}`;
}


function currentMonthISO() {
  return todayISO().slice(0, 7);
}


function monthFromDate(date) {
  if (!date) return currentMonthISO();

  return date.slice(0, 7);
}


function money(value) {
  return `RM ${Number(value || 0).toLocaleString(
    "en-MY",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  )}`;
}


function number(value) {
  return Number(value || 0);
}


function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function salesmanKeys() {
  return Object.keys(USERS)
    .filter(key => USERS[key].role === "salesman");
}


function viewedUserKey() {
  if (!currentUser) return null;

  if (currentUser.role === "manager") {
    return managerViewing;
  }

  return currentUser.username;
}


function viewedUser() {
  return USERS[viewedUserKey()];
}


function showToast(message) {
  const toast = document.getElementById("toast");

  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}


/* =========================================================
   LOGIN
   User can login by USERNAME or STAFF ID
   ========================================================= */

function findLoginUser(loginValue) {
  const value = String(loginValue)
    .trim()
    .toLowerCase();

  return Object.values(USERS).find(user => {

    const usernameMatch =
      user.username.toLowerCase() === value;

    const staffMatch =
      user.staffId &&
      user.staffId.toLowerCase() === value;

    return usernameMatch || staffMatch;
  });
}


document
  .getElementById("loginForm")
  .addEventListener("submit", function (event) {

    event.preventDefault();

    const loginValue =
      document.getElementById("loginUser").value.trim();

    const pin =
      document.getElementById("loginPin").value.trim();

    const user = findLoginUser(loginValue);

    if (!user || user.pin !== pin) {
      showToast("Wrong username / Staff ID / PIN");
      return;
    }

    currentUser = user;

    document
      .getElementById("loginView")
      .classList.add("hidden");

    document
      .getElementById("appView")
      .classList.remove("hidden");

    document.getElementById("welcomeName").textContent =
      currentUser.name;

    document.getElementById("roleLabel").textContent =
      currentUser.role === "manager"
        ? "MANAGER ACCESS"
        : `SALES REPRESENTATIVE • STAFF ID ${
            currentUser.staffId || "NOT SET"
          }`;

    currentPage = "dashboard";

    updateNotificationBadge();
    renderPage();
  });


/* =========================================================
   LOGOUT
   ========================================================= */

document
  .getElementById("logoutBtn")
  .addEventListener("click", function () {

    currentUser = null;

    document
      .getElementById("appView")
      .classList.add("hidden");

    document
      .getElementById("loginView")
      .classList.remove("hidden");

    document.getElementById("loginForm").reset();
  });


/* =========================================================
   BOTTOM NAVIGATION
   ========================================================= */

document
  .querySelectorAll("#bottomNav button")
  .forEach(button => {

    button.addEventListener("click", function () {

      currentPage = this.dataset.page;

      document
        .querySelectorAll("#bottomNav button")
        .forEach(btn => btn.classList.remove("active"));

      this.classList.add("active");

      renderPage();
    });

  });


/* =========================================================
   NOTIFICATION BUTTON
   ========================================================= */

document
  .getElementById("notifBtn")
  .addEventListener("click", function () {

    renderTasks();
  });


function updateNotificationBadge() {

  if (!currentUser) return;

  const badge = document.getElementById("notifBadge");

  if (currentUser.role === "manager") {
    badge.classList.add("hidden");
    return;
  }

  const count = state.tasks.filter(task =>
    task.user === currentUser.username &&
    !task.completed
  ).length;

  if (count > 0) {
    badge.textContent = count;
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
}


/* =========================================================
   PAGE ROUTER
   ========================================================= */

function renderPage() {

  if (!currentUser) return;

  switch (currentPage) {

    case "daily":
      renderDaily();
      break;

    case "planning":
      renderPlanning();
      break;

    case "incentive":
      renderIncentive();
      break;

    case "summary":
      renderSummary();
      break;

    default:
      renderDashboard();
  }
}


/* =========================================================
   GET DATA
   ========================================================= */

function getEntries(userKey, month = currentMonthISO()) {

  return state.entries.filter(entry =>
    entry.user === userKey &&
    monthFromDate(entry.date) === month
  );
}


function getPlans(userKey, month = currentMonthISO()) {

  return state.plans.filter(plan =>
    plan.user === userKey &&
    plan.month === month
  );
}


function totalSales(userKey, month = currentMonthISO()) {

  return getEntries(userKey, month)
    .reduce(
      (sum, entry) =>
        sum + number(entry.todaySales),
      0
    );
}


function totalTarget(userKey, month = currentMonthISO()) {

  return getPlans(userKey, month)
    .reduce(
      (sum, plan) =>
        sum + number(plan.target),
      0
    );
}


function comparableLastMonth(userKey, month = currentMonthISO()) {

  return getEntries(userKey, month)
    .reduce(
      (sum, entry) =>
        sum + number(entry.lastMonthSameDay),
      0
    );
}


function calculateGrowth(current, previous) {

  if (previous <= 0) {
    return 0;
  }

  return (
    ((current - previous) / previous) * 100
  );
}


function latestReportDate(userKey, month = currentMonthISO()) {

  const dates = getEntries(userKey, month)
    .map(entry => entry.date)
    .sort();

  return dates.length
    ? dates[dates.length - 1]
    : null;
}


function latestDayValue(
  userKey,
  field,
  month = currentMonthISO()
) {

  const latest = latestReportDate(userKey, month);

  if (!latest) return 0;

  return getEntries(userKey, month)
    .filter(entry => entry.date === latest)
    .reduce(
      (sum, entry) =>
        sum + number(entry[field]),
      0
    );
}


/* =========================================================
   MANAGER USER SELECTOR
   ========================================================= */

function managerSelectorHTML() {

  if (
    !currentUser ||
    currentUser.role !== "manager"
  ) {
    return "";
  }

  const options = salesmanKeys()
    .map(key => `
      <option
        value="${key}"
        ${key === managerViewing ? "selected" : ""}
      >
        ${escapeHTML(USERS[key].name)}
      </option>
    `)
    .join("");

  return `
    <div class="card">
      <label>
        Which Salesman do you want to view?

        <select id="managerUserSelect">
          ${options}
        </select>
      </label>
    </div>
  `;
}


function bindManagerSelector() {

  const select =
    document.getElementById("managerUserSelect");

  if (!select) return;

  select.addEventListener("change", function () {
    managerViewing = this.value;
    renderPage();
  });
}


/* =========================================================
   DASHBOARD
   ========================================================= */

function renderDashboard() {

  const userKey = viewedUserKey();
  const user = USERS[userKey];
  const month = currentMonthISO();

  const achievement =
    totalSales(userKey, month);

  const target =
    totalTarget(userKey, month);

  const shortfall =
    Math.max(target - achievement, 0);

  const lastMonth =
    comparableLastMonth(userKey, month);

  const growth =
    calculateGrowth(
      achievement,
      lastMonth
    );

  const activeOrder =
    latestDayValue(
      userKey,
      "activeOrder",
      month
    );

  const pprTrip =
    latestDayValue(
      userKey,
      "pprTrip",
      month
    );

  const incentiveKey =
    `${userKey}_${month}`;

  const incentive =
    number(state.incentives[incentiveKey]);

  const growthText =
    lastMonth <= 0
      ? "0.00%"
      : `${growth >= 0 ? "+" : ""}${growth.toFixed(2)}%`;

  const growthClass =
    growth >= 0 ? "positive" : "negative";

  const main =
    document.getElementById("mainContent");

  main.innerHTML = `

    ${managerSelectorHTML()}

    <div class="card">

      <p class="eyebrow">
        ${escapeHTML(month)} PERFORMANCE
      </p>

      <h2>
        ${escapeHTML(user.name)}
      </h2>

      <p class="muted">
        Staff ID:
        ${escapeHTML(user.staffId || "Not set yet")}
      </p>

    </div>


    <div class="stats-grid">

      <div class="stat-card">
        <small>
          Monthly Target
        </small>

        <strong>
          ${money(target)}
        </strong>
      </div>


      <div class="stat-card">
        <small>
          Achievement
        </small>

        <strong>
          ${money(achievement)}
        </strong>
      </div>


      <div class="stat-card">

        <small>
          Shortfall
        </small>

        <strong class="${shortfall > 0 ? "negative" : "positive"}">
          ${money(shortfall)}
        </strong>

      </div>


      <div class="stat-card">

        <small>
          Growth / Degrowth
        </small>

        <strong class="${growthClass}">
          ${growthText}
        </strong>

      </div>


      <div class="stat-card">

        <small>
          Active Order
        </small>

        <strong>
          ${money(activeOrder)}
        </strong>

      </div>


      <div class="stat-card">

        <small>
          PPR for Trip
        </small>

        <strong>
          ${money(pprTrip)}
        </strong>

      </div>


      <div class="stat-card">

        <small>
          Monthly Incentive
        </small>

        <strong>
          ${money(incentive)}
        </strong>

      </div>

    </div>


    ${renderOutletPerformanceHTML(userKey, month)}


    ${
      currentUser.role === "manager"
        ? renderManagerTaskBox(userKey)
        : ""
    }

  `;

  bindManagerSelector();
  bindManagerTaskForm();
}


/* =========================================================
   OUTLET PERFORMANCE
   ========================================================= */

function renderOutletPerformanceHTML(
  userKey,
  month
) {

  const plans =
    getPlans(userKey, month);

  if (!plans.length) {

    return `
      <div class="card">

        <h3>
          Outlet Performance
        </h3>

        <p class="muted">
          No monthly outlet plan has been added yet.
        </p>

      </div>
    `;
  }

  const rows = plans
    .map(plan => {

      const achievement =
        getEntries(userKey, month)
          .filter(
            entry =>
              entry.outlet
                .trim()
                .toLowerCase() ===
              plan.outlet
                .trim()
                .toLowerCase()
          )
          .reduce(
            (sum, entry) =>
              sum + number(entry.todaySales),
            0
          );

      const shortfall =
        Math.max(
          number(plan.target) - achievement,
          0
        );

      return `

        <div class="performance-row">

          <div>

            <strong>
              ${escapeHTML(plan.outlet)}
            </strong>

            <small>
              Target SKUs:
              ${escapeHTML(plan.skus || "Not selected")}
            </small>

          </div>

          <div>

            <span>
              Target:
              ${money(plan.target)}
            </span>

            <span>
              Achievement:
              ${money(achievement)}
            </span>

            <span class="${shortfall > 0 ? "negative" : "positive"}">
              Shortfall:
              ${money(shortfall)}
            </span>

          </div>

        </div>
      `;
    })
    .join("");

  return `

    <div class="card">

      <h3>
        Outlet Performance
      </h3>

      ${rows}

    </div>
  `;
}


/* =========================================================
   DAILY UPDATE
   ========================================================= */

function renderDaily() {

  const main =
    document.getElementById("mainContent");

  main.innerHTML = `

    ${managerSelectorHTML()}

    <div class="card">

      <p class="eyebrow">
        DAILY SALES UPDATE
      </p>

      <h2>
        Enter Today's Report
      </h2>

      <p class="muted">
        Only enter the figures. The app will calculate the summary automatically.
      </p>

      <form
        id="dailyForm"
        class="stack"
      >

        <label>
          1. Which date are you reporting?

          <input
            id="reportDate"
            type="date"
            value="${todayISO()}"
            required
          />
        </label>


        <label>
          2. Which outlet did you work in?

          <input
            id="outletName"
            type="text"
            placeholder="Outlet name"
            required
          />
        </label>


        <label>
          3. What is today's total sales value (RM)?

          <input
            id="todaySales"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            required
          />
        </label>


        <label>
          4. What was the sales value on the same day last month (RM)?

          <input
            id="lastMonthSameDay"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
          />
        </label>


        <label>
          5. How much Active Order is currently available (RM)?

          <input
            id="activeOrder"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
          />
        </label>


        <label>
          6. How much PPR for Trip is currently available (RM)?

          <input
            id="pprTrip"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
          />
        </label>


        <label>
          7. Which SKU / Product did you sell?

          <input
            id="productName"
            type="text"
            placeholder="Product / SKU name"
          />
        </label>


        <label>
          8. How many cartons of this SKU did you sell?

          <input
            id="cartons"
            type="number"
            step="1"
            min="0"
            placeholder="0"
          />
        </label>


        <label>
          9. How much TOTAL incentive have you earned this month so far (RM)?

          <input
            id="monthlyIncentive"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
          />

          <small class="muted">
            Enter the total current monthly incentive amount, not only today's incentive.
          </small>
        </label>


        <button
          class="btn primary"
          type="submit"
        >
          Save Daily Update
        </button>

      </form>

    </div>
  `;

  bindManagerSelector();

  document
    .getElementById("dailyForm")
    .addEventListener(
      "submit",
      saveDailyUpdate
    );
}


function saveDailyUpdate(event) {

  event.preventDefault();

  const userKey = viewedUserKey();

  if (
    currentUser.role === "manager"
  ) {
    showToast(
      "Manager view only. Daily sales should be submitted by the salesman."
    );
    return;
  }

  const date =
    document.getElementById("reportDate").value;

  const outlet =
    document.getElementById("outletName").value.trim();

  const todaySales =
    number(
      document.getElementById("todaySales").value
    );

  const lastMonthSameDay =
    number(
      document.getElementById("lastMonthSameDay").value
    );

  const activeOrder =
    number(
      document.getElementById("activeOrder").value
    );

  const pprTrip =
    number(
      document.getElementById("pprTrip").value
    );

  const product =
    document.getElementById("productName").value.trim();

  const cartons =
    number(
      document.getElementById("cartons").value
    );

  const monthlyIncentiveInput =
    document.getElementById("monthlyIncentive").value;

  state.entries.push({
    id: Date.now(),
    user: userKey,
    date,
    outlet,
    todaySales,
    lastMonthSameDay,
    activeOrder,
    pprTrip,
    product,
    cartons,
    createdAt: new Date().toISOString()
  });

  if (
    monthlyIncentiveInput !== ""
  ) {

    const key =
      `${userKey}_${monthFromDate(date)}`;

    state.incentives[key] =
      number(monthlyIncentiveInput);
  }

  saveState();

  showToast("Daily report saved successfully");

  currentPage = "dashboard";

  setActiveNav("dashboard");

  renderDashboard();
}


/* =========================================================
   MONTHLY PLANNING
   ========================================================= */

function renderPlanning() {

  const month =
    currentMonthISO();

  const userKey =
    viewedUserKey();

  const plans =
    getPlans(userKey, month);

  const main =
    document.getElementById("mainContent");

  main.innerHTML = `

    ${managerSelectorHTML()}

    <div class="card">

      <p class="eyebrow">
        MONTHLY PLANNING
      </p>

      <h2>
        Outlet & SKU Plan
      </h2>

      <form
        id="planningForm"
        class="stack"
      >

        <label>
          1. Which month is this plan for?

          <input
            id="planMonth"
            type="month"
            value="${month}"
            required
          />
        </label>


        <label>
          2. Which outlet will you focus on?

          <input
            id="planOutlet"
            type="text"
            placeholder="Outlet name"
            required
          />
        </label>


        <label>
          3. What is the monthly target for this outlet (RM)?

          <input
            id="planTarget"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            required
          />
        </label>


        <label>
          4. Which targeted SKUs will you work on?

          <textarea
            id="planSkus"
            rows="3"
            placeholder="Example: Mango Juice, Basil Seed, Potato Crackers"
          ></textarea>
        </label>


        <label>
          5. What sales value do you expect from these targeted SKUs (RM)?

          <input
            id="expectedSkuValue"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
          />
        </label>


        <button
          class="btn primary"
          type="submit"
        >
          Save Monthly Plan
        </button>

      </form>

    </div>


    <div class="card">

      <h3>
        Current Plans
      </h3>

      ${
        plans.length
          ? plans.map(plan => `
              <div class="performance-row">

                <div>
                  <strong>
                    ${escapeHTML(plan.outlet)}
                  </strong>

                  <small>
                    ${escapeHTML(plan.skus || "No targeted SKU")}
                  </small>
                </div>

                <div>
                  ${money(plan.target)}
                </div>

              </div>
            `).join("")
          : `
              <p class="muted">
                No plan added yet.
              </p>
            `
      }

    </div>
  `;

  bindManagerSelector();

  document
    .getElementById("planningForm")
    .addEventListener(
      "submit",
      savePlanning
    );
}


function savePlanning(event) {

  event.preventDefault();

  if (
    currentUser.role === "manager"
  ) {
    showToast(
      "Monthly planning should be entered from the Salesman account."
    );
    return;
  }

  const userKey =
    viewedUserKey();

  const month =
    document.getElementById("planMonth").value;

  const outlet =
    document.getElementById("planOutlet").value.trim();

  const target =
    number(
      document.getElementById("planTarget").value
    );

  const skus =
    document.getElementById("planSkus").value.trim();

  const expectedSkuValue =
    number(
      document.getElementById("expectedSkuValue").value
    );

  const existing =
    state.plans.find(
      plan =>
        plan.user === userKey &&
        plan.month === month &&
        plan.outlet
          .toLowerCase() ===
        outlet.toLowerCase()
    );

  if (existing) {

    existing.target = target;
    existing.skus = skus;
    existing.expectedSkuValue =
      expectedSkuValue;

  } else {

    state.plans.push({
      id: Date.now(),
      user: userKey,
      month,
      outlet,
      target,
      skus,
      expectedSkuValue
    });
  }

  saveState();

  showToast("Monthly plan saved");

  renderPlanning();
}


/* =========================================================
   INCENTIVE PAGE
   ========================================================= */

function renderIncentive() {

  const userKey =
    viewedUserKey();

  const month =
    currentMonthISO();

  const incentiveKey =
    `${userKey}_${month}`;

  const incentive =
    number(
      state.incentives[incentiveKey]
    );

  const entries =
    getEntries(userKey, month);

  const productTotals = {};

  entries.forEach(entry => {

    if (!entry.product) return;

    const product =
      entry.product.trim();

    if (!productTotals[product]) {
      productTotals[product] = 0;
    }

    productTotals[product] +=
      number(entry.cartons);
  });

  const products =
    Object.entries(productTotals);

  const main =
    document.getElementById("mainContent");

  main.innerHTML = `

    ${managerSelectorHTML()}

    <div class="card">

      <p class="eyebrow">
        INCENTIVE
      </p>

      <h2>
        Monthly Incentive
      </h2>

      <div class="big-number">
        ${money(incentive)}
      </div>

      <p class="muted">
        Total incentive entered for ${escapeHTML(month)}
      </p>

    </div>


    <div class="card">

      <h3>
        SKU Carton Summary
      </h3>

      ${
        products.length
          ? products.map(
              ([product, cartons]) => `
                <div class="performance-row">

                  <strong>
                    ${escapeHTML(product)}
                  </strong>

                  <span>
                    ${cartons} CTN
                  </span>

                </div>
              `
            ).join("")
          : `
            <p class="muted">
              No SKU carton data entered yet.
            </p>
          `
      }

    </div>

  `;

  bindManagerSelector();
}


/* =========================================================
   SUMMARY PAGE
   ========================================================= */

function renderSummary() {

  const userKey =
    viewedUserKey();

  const month =
    currentMonthISO();

  const entries =
    getEntries(userKey, month)
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date)
      );

  const main =
    document.getElementById("mainContent");

  main.innerHTML = `

    ${managerSelectorHTML()}

    <div class="card">

      <p class="eyebrow">
        SUMMARY BOARD
      </p>

      <h2>
        ${escapeHTML(USERS[userKey].name)}
      </h2>

      <button
        class="btn primary"
        id="downloadCSV"
      >
        Download Excel-Compatible CSV
      </button>

    </div>


    <div class="card table-wrap">

      ${
        entries.length
          ? `
            <table>

              <thead>

                <tr>
                  <th>Date</th>
                  <th>Outlet</th>
                  <th>Sales</th>
                  <th>Last Month</th>
                  <th>Active Order</th>
                  <th>PPR Trip</th>
                  <th>SKU</th>
                  <th>CTN</th>
                </tr>

              </thead>

              <tbody>

                ${entries.map(entry => `

                  <tr>

                    <td>
                      ${escapeHTML(entry.date)}
                    </td>

                    <td>
                      ${escapeHTML(entry.outlet)}
                    </td>

                    <td>
                      ${money(entry.todaySales)}
                    </td>

                    <td>
                      ${money(entry.lastMonthSameDay)}
                    </td>

                    <td>
                      ${money(entry.activeOrder)}
                    </td>

                    <td>
                      ${money(entry.pprTrip)}
                    </td>

                    <td>
                      ${escapeHTML(entry.product || "-")}
                    </td>

                    <td>
                      ${number(entry.cartons)}
                    </td>

                  </tr>

                `).join("")}

              </tbody>

            </table>
          `
          : `
            <p class="muted">
              No data entered yet.
            </p>
          `
      }

    </div>
  `;

  bindManagerSelector();

  const downloadBtn =
    document.getElementById("downloadCSV");

  if (downloadBtn) {

    downloadBtn.addEventListener(
      "click",
      () => downloadCSV(userKey, month)
    );
  }
}


/* =========================================================
   CSV / EXCEL DOWNLOAD
   ========================================================= */

function downloadCSV(userKey, month) {

  const entries =
    getEntries(userKey, month);

  if (!entries.length) {
    showToast("No data available");
    return;
  }

  const rows = [
    [
      "Date",
      "Salesman",
      "Staff ID",
      "Outlet",
      "Today Sales RM",
      "Last Month Same Day RM",
      "Active Order RM",
      "PPR for Trip RM",
      "Product",
      "Cartons"
    ]
  ];

  entries.forEach(entry => {

    rows.push([
      entry.date,
      USERS[userKey].name,
      USERS[userKey].staffId,
      entry.outlet,
      entry.todaySales,
      entry.lastMonthSameDay,
      entry.activeOrder,
      entry.pprTrip,
      entry.product,
      entry.cartons
    ]);
  });

  const csv =
    rows.map(row =>
      row.map(cell =>
        `"${String(cell ?? "")
          .replaceAll('"', '""')}"`
      ).join(",")
    ).join("\n");

  const blob =
    new Blob(
      [csv],
      {
        type:
          "text/csv;charset=utf-8;"
      }
    );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;

  link.download =
    `${USERS[userKey].name}-${month}-sales-report.csv`;

  link.click();

  URL.revokeObjectURL(url);
}


/* =========================================================
   MANAGER TASKS
   ========================================================= */

function renderManagerTaskBox(userKey) {

  return `

    <div class="card">

      <p class="eyebrow">
        MANAGER TASK
      </p>

      <h3>
        Send Special Task to ${escapeHTML(USERS[userKey].name)}
      </h3>

      <form
        id="managerTaskForm"
        class="stack"
      >

        <label>
          What special task do you want to assign?

          <input
            id="taskTitle"
            type="text"
            placeholder="Example: Close Mango Juice 20 CTN"
            required
          />
        </label>


        <label>
          What instruction do you want to give?

          <textarea
            id="taskInstruction"
            rows="3"
            placeholder="Write instruction..."
          ></textarea>
        </label>


        <button
          class="btn primary"
          type="submit"
        >
          Send Task
        </button>

      </form>

    </div>
  `;
}


function bindManagerTaskForm() {

  const form =
    document.getElementById("managerTaskForm");

  if (!form) return;

  form.addEventListener(
    "submit",
    function (event) {

      event.preventDefault();

      state.tasks.push({
        id: Date.now(),
        user: managerViewing,
        title:
          document
            .getElementById("taskTitle")
            .value.trim(),

        instruction:
          document
            .getElementById("taskInstruction")
            .value.trim(),

        completed: false,

        createdAt:
          new Date().toISOString()
      });

      saveState();

      form.reset();

      showToast("Task saved");
    }
  );
}


/* =========================================================
   SALESMAN TASK VIEW
   ========================================================= */

function renderTasks() {

  const main =
    document.getElementById("mainContent");

  if (
    currentUser.role === "manager"
  ) {

    main.innerHTML = `

      <div class="card">

        <h2>
          Manager Tasks
        </h2>

        <p class="muted">
          Select a salesman from Home to assign a new task.
        </p>

      </div>
    `;

    return;
  }

  const tasks =
    state.tasks
      .filter(
        task =>
          task.user === currentUser.username
      )
      .sort(
        (a, b) =>
          b.createdAt.localeCompare(a.createdAt)
      );

  main.innerHTML = `

    <div class="card">

      <p class="eyebrow">
        SPECIAL TASKS
      </p>

      <h2>
        Manager Instructions
      </h2>

    </div>

    ${
      tasks.length
        ? tasks.map(task => `

            <div class="card">

              <h3>
                ${escapeHTML(task.title)}
              </h3>

              <p>
                ${escapeHTML(task.instruction)}
              </p>

              <p class="muted">
                ${
                  task.completed
                    ? "Completed"
                    : "Pending"
                }
              </p>

              ${
                task.completed
                  ? ""
                  : `
                    <button
                      class="btn primary completeTaskBtn"
                      data-id="${task.id}"
                    >
                      Mark as Completed
                    </button>
                  `
              }

            </div>

          `).join("")
        : `
          <div class="card">

            <p class="muted">
              No special task assigned.
            </p>

          </div>
        `
    }
  `;

  document
    .querySelectorAll(".completeTaskBtn")
    .forEach(button => {

      button.addEventListener(
        "click",
        function () {

          const id =
            Number(this.dataset.id);

          const task =
            state.tasks.find(
              item => item.id === id
            );

          if (task) {
            task.completed = true;
          }

          saveState();

          updateNotificationBadge();

          renderTasks();
        }
      );

    });
}


/* =========================================================
   NAV HELPER
   ========================================================= */

function setActiveNav(page) {

  document
    .querySelectorAll("#bottomNav button")
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.page === page
      );
    });
}


/* =========================================================
   SERVICE WORKER
   ========================================================= */

if ("serviceWorker" in navigator) {

  window.addEventListener(
    "load",
    function () {

      navigator.serviceWorker
        .register("sw.js")
        .catch(() => {});
    }
  );
}
