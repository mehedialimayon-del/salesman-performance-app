/* =========================================================
   SALES PERFORMANCE HUB
   FINAL BUILD - PHASE 1
   USERS + ZERO START + MANAGER/SR ACCESS
   ========================================================= */


/* =========================================================
   USERS
   Password = Staff ID
   ========================================================= */

const USERS = {

  manager: {
    username: "manager",
    password: "M21954",
    name: "MEHEDI ALIM AYON",
    role: "manager",
    staffId: "M21954"
  },

  emon: {
    username: "emon",
    password: "M22075",
    name: "MOHAMMAD BODRUDDAZA EMON",
    role: "salesman",
    staffId: "M22075"
  },

  limon: {
    username: "limon",
    password: "M22268",
    name: "MD LIMON MAJUMDER",
    role: "salesman",
    staffId: "M22268"
  },

  munnaf: {
    username: "munnaf",
    password: "M22328",
    name: "MD MUNNAF ALI",
    role: "salesman",
    staffId: "M22328"
  },

  ayon: {
    username: "ayon",
    password: "M21954",
    name: "MEHEDI ALIM AYON",
    role: "salesman",
    staffId: "M21954"
  }

};


/* =========================================================
   EMPTY OUTLET MASTER
   Outlet list will be added in next phase
   ========================================================= */

const OUTLET_MASTER = {

  emon: [],

  limon: [],

  munnaf: [],

  ayon: []

};


/* =========================================================
   STORAGE
   New storage key = Everyone starts ZERO
   ========================================================= */

const STORAGE_KEY =
  "salesPerformanceHub_FINAL_ZERO_v1";


let state = loadState();

let currentUser = null;

let currentPage = "dashboard";

let managerViewing = "emon";


/* =========================================================
   EMPTY STATE
   ========================================================= */

function emptyState() {

  return {

    entries: [],

    plans: [],

    incentives: {},

    tasks: []

  };

}


/* =========================================================
   LOAD STATE
   ========================================================= */

function loadState() {

  try {

    const saved =
      localStorage.getItem(STORAGE_KEY);

    if (!saved) {

      return emptyState();

    }

    return {

      ...emptyState(),

      ...JSON.parse(saved)

    };

  }

  catch (error) {

    return emptyState();

  }

}


/* =========================================================
   SAVE STATE
   ========================================================= */

function saveState() {

  localStorage.setItem(

    STORAGE_KEY,

    JSON.stringify(state)

  );

}


/* =========================================================
   DATE HELPERS
   ========================================================= */

function todayISO() {

  const date =
    new Date();

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;

}


function currentMonthISO() {

  return todayISO().slice(0, 7);

}


function monthFromDate(date) {

  if (!date) {

    return currentMonthISO();

  }

  return date.slice(0, 7);

}


/* =========================================================
   MONEY
   ========================================================= */

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


/* =========================================================
   SAFE HTML
   ========================================================= */

function escapeHTML(value) {

  return String(value ?? "")

    .replaceAll("&", "&amp;")

    .replaceAll("<", "&lt;")

    .replaceAll(">", "&gt;")

    .replaceAll('"', "&quot;")

    .replaceAll("'", "&#039;");

}


/* =========================================================
   SALESMAN LIST
   ========================================================= */

function salesmanKeys() {

  return Object.keys(USERS)

    .filter(

      key =>
        USERS[key].role === "salesman"

    );

}


/* =========================================================
   CURRENT VIEW USER
   ========================================================= */

function viewedUserKey() {

  if (!currentUser) {

    return null;

  }

  if (
    currentUser.role === "manager"
  ) {

    return managerViewing;

  }

  return currentUser.username;

}


/* =========================================================
   TOAST
   ========================================================= */

function showToast(message) {

  const toast =
    document.getElementById("toast");

  if (!toast) {

    return;

  }

  toast.textContent =
    message;

  toast.classList.add("show");

  setTimeout(
    function () {

      toast.classList.remove("show");

    },
    2200
  );

}


/* =========================================================
   LOGIN USER FINDER
   Manager = manager / M21954

   SR:
   Emon   = M22075 / M22075
   Limon  = M22268 / M22268
   Munnaf = M22328 / M22328

   Ayon SR:
   ayon / M21954
   ========================================================= */

function findLoginUser(loginValue) {

  const value =
    String(loginValue)
      .trim()
      .toLowerCase();


  if (value === "manager") {

    return USERS.manager;

  }


  const salesmen =
    Object.values(USERS)
      .filter(
        user =>
          user.role === "salesman"
      );


  return salesmen.find(

    user =>

      user.username.toLowerCase() === value

      ||

      user.staffId.toLowerCase() === value

  );

}


/* =========================================================
   LOGIN
   ========================================================= */

document
  .getElementById("loginForm")
  .addEventListener(
    "submit",
    function (event) {

      event.preventDefault();


      const loginValue =
        document
          .getElementById("loginUser")
          .value
          .trim();


      const password =
        document
          .getElementById("loginPin")
          .value
          .trim();


      const user =
        findLoginUser(loginValue);


      if (
        !user
        ||
        user.password !== password
      ) {

        showToast(
          "Wrong Staff ID / Username / Password"
        );

        return;

      }


      currentUser =
        user;


      document
        .getElementById("loginView")
        .classList
        .add("hidden");


      document
        .getElementById("appView")
        .classList
        .remove("hidden");


      document
        .getElementById("welcomeName")
        .textContent =
          currentUser.name;


      document
        .getElementById("roleLabel")
        .textContent =

          currentUser.role === "manager"

            ? "MANAGER ACCESS"

            : `SALES REPRESENTATIVE • ${currentUser.staffId}`;


      currentPage =
        "dashboard";


      updateNotificationBadge();

      setActiveNav("dashboard");

      renderPage();

    }
  );


/* =========================================================
   LOGOUT
   ========================================================= */

document
  .getElementById("logoutBtn")
  .addEventListener(
    "click",
    function () {

      currentUser =
        null;


      document
        .getElementById("appView")
        .classList
        .add("hidden");


      document
        .getElementById("loginView")
        .classList
        .remove("hidden");


      document
        .getElementById("loginForm")
        .reset();

    }
  );


/* =========================================================
   BOTTOM NAVIGATION
   ========================================================= */

document
  .querySelectorAll(
    "#bottomNav button"
  )
  .forEach(
    function (button) {

      button.addEventListener(
        "click",
        function () {

          currentPage =
            this.dataset.page;


          setActiveNav(
            currentPage
          );


          renderPage();

        }
      );

    }
  );


function setActiveNav(page) {

  document
    .querySelectorAll(
      "#bottomNav button"
    )
    .forEach(
      function (button) {

        button.classList.toggle(

          "active",

          button.dataset.page === page

        );

      }
    );

}


/* =========================================================
   NOTIFICATION
   ========================================================= */

document
  .getElementById("notifBtn")
  .addEventListener(
    "click",
    function () {

      renderTasks();

    }
  );


function updateNotificationBadge() {

  if (!currentUser) {

    return;

  }


  const badge =
    document.getElementById(
      "notifBadge"
    );


  if (
    currentUser.role === "manager"
  ) {

    badge
      .classList
      .add("hidden");

    return;

  }


  const count =
    state.tasks.filter(

      task =>

        task.user ===
          currentUser.username

        &&

        !task.completed

    ).length;


  if (count > 0) {

    badge.textContent =
      count;

    badge
      .classList
      .remove("hidden");

  }

  else {

    badge
      .classList
      .add("hidden");

  }

}


/* =========================================================
   PAGE ROUTER
   ========================================================= */

function renderPage() {

  if (!currentUser) {

    return;

  }


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
   DATA FILTERS
   ========================================================= */

function getEntries(
  userKey,
  month = currentMonthISO()
) {

  return state.entries.filter(

    entry =>

      entry.user === userKey

      &&

      monthFromDate(entry.date)
      === month

  );

}


function getPlans(
  userKey,
  month = currentMonthISO()
) {

  return state.plans.filter(

    plan =>

      plan.user === userKey

      &&

      plan.month === month

  );

}


/* =========================================================
   CALCULATIONS
   ========================================================= */

function totalSales(
  userKey,
  month = currentMonthISO()
) {

  return getEntries(
    userKey,
    month
  ).reduce(

    (sum, entry) =>

      sum
      +
      number(entry.todaySales),

    0

  );

}


function totalTarget(
  userKey,
  month = currentMonthISO()
) {

  return getPlans(
    userKey,
    month
  ).reduce(

    (sum, plan) =>

      sum
      +
      number(plan.target),

    0

  );

}


function comparableLastMonth(
  userKey,
  month = currentMonthISO()
) {

  return getEntries(
    userKey,
    month
  ).reduce(

    (sum, entry) =>

      sum
      +
      number(
        entry.lastMonthSameDay
      ),

    0

  );

}


function calculateGrowth(
  current,
  previous
) {

  if (previous <= 0) {

    return 0;

  }


  return (

    (
      current - previous
    )

    /

    previous

  ) * 100;

}


function latestReportDate(
  userKey,
  month = currentMonthISO()
) {

  const dates =
    getEntries(
      userKey,
      month
    )
      .map(
        entry =>
          entry.date
      )
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

  const latest =
    latestReportDate(
      userKey,
      month
    );


  if (!latest) {

    return 0;

  }


  return getEntries(
    userKey,
    month
  )
    .filter(
      entry =>
        entry.date === latest
    )
    .reduce(

      (sum, entry) =>

        sum
        +
        number(entry[field]),

      0

    );

}


/* =========================================================
   MANAGER SALESMAN SELECTOR
   ========================================================= */

function managerSelectorHTML() {

  if (
    !currentUser
    ||
    currentUser.role !== "manager"
  ) {

    return "";

  }


  const options =
    salesmanKeys()

      .map(
        key => `

          <option
            value="${key}"
            ${
              key === managerViewing
                ? "selected"
                : ""
            }
          >
            ${escapeHTML(
              USERS[key].name
            )}
          </option>

        `
      )

      .join("");


  return `

    <div class="card">

      <label>

        Select Sales Representative

        <select
          id="managerUserSelect"
        >

          ${options}

        </select>

      </label>

    </div>

  `;

}


function bindManagerSelector() {

  const select =
    document.getElementById(
      "managerUserSelect"
    );


  if (!select) {

    return;

  }


  select.addEventListener(
    "change",
    function () {

      managerViewing =
        this.value;

      renderPage();

    }
  );

}


/* =========================================================
   DASHBOARD
   ========================================================= */

function renderDashboard() {

  const userKey =
    viewedUserKey();


  const user =
    USERS[userKey];


  const month =
    currentMonthISO();


  const achievement =
    totalSales(
      userKey,
      month
    );


  const target =
    totalTarget(
      userKey,
      month
    );


  const shortfall =
    Math.max(
      target - achievement,
      0
    );


  const previous =
    comparableLastMonth(
      userKey,
      month
    );


  const growth =
    calculateGrowth(
      achievement,
      previous
    );


  const active =
    latestDayValue(
      userKey,
      "activeOrder",
      month
    );


  const prepareForTrip =
    latestDayValue(
      userKey,
      "pprTrip",
      month
    );


  const incentiveKey =
    `${userKey}_${month}`;


  const incentive =
    number(
      state.incentives[
        incentiveKey
      ]
    );


  const growthText =

    previous <= 0

      ? "0.00%"

      : `${
          growth >= 0
            ? "+"
            : ""
        }${growth.toFixed(2)}%`;


  const growthClass =

    growth >= 0

      ? "positive"

      : "negative";


  const main =
    document.getElementById(
      "mainContent"
    );


  main.innerHTML = `

    ${managerSelectorHTML()}


    <div class="card">

      <p class="eyebrow">

        ${escapeHTML(month)}
        PERFORMANCE

      </p>


      <h2>

        ${escapeHTML(
          user.name
        )}

      </h2>


      <p class="muted">

        Staff ID:
        ${escapeHTML(
          user.staffId
        )}

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

        <strong
          class="${
            shortfall > 0
              ? "negative"
              : "positive"
          }"
        >

          ${money(shortfall)}

        </strong>

      </div>


      <div class="stat-card">

        <small>
          Growth / Degrowth
        </small>

        <strong
          class="${growthClass}"
        >

          ${growthText}

        </strong>

      </div>


      <div class="stat-card">

        <small>
          Active
        </small>

        <strong>
          ${money(active)}
        </strong>

      </div>


      <div class="stat-card">

        <small>
          Prepare for Trip
        </small>

        <strong>
          ${money(
            prepareForTrip
          )}
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


    <div class="card">

      <h3>
        Outlet Performance
      </h3>

      <p class="muted">

        No data yet.

        Everything starts from zero.

      </p>

    </div>


    ${
      currentUser.role === "manager"

        ? renderManagerTaskBox(
            userKey
          )

        : ""
    }

  `;


  bindManagerSelector();

  bindManagerTaskForm();

}


/* =========================================================
   OUTLET OPTIONS
   Empty for now
   ========================================================= */

function getOutletOptionsForUser(
  userKey
) {

  const outlets =
    OUTLET_MASTER[userKey]
    || [];


  if (!outlets.length) {

    return `

      <option value="">

        Outlet list will be added next

      </option>

    `;

  }


  return outlets
    .map(
      outlet => `

        <option
          value="${escapeHTML(outlet)}"
        >

          ${escapeHTML(outlet)}

        </option>

      `
    )
    .join("");

}


/* =========================================================
   DAILY UPDATE
   ========================================================= */

function renderDaily() {

  const userKey =
    viewedUserKey();


  const main =
    document.getElementById(
      "mainContent"
    );


  main.innerHTML = `

    ${managerSelectorHTML()}


    <div class="card">


      <p class="eyebrow">

        DAILY SALES UPDATE

      </p>


      <h2>

        Daily Report

      </h2>


      <p class="muted">

        All values start from zero.

      </p>


      <form
        id="dailyForm"
        class="stack"
      >


        <label>

          Which date are you reporting?

          <input
            id="reportDate"
            type="date"
            value="${todayISO()}"
            required
          />

        </label>


        <label>

          Which outlet did you work in?

          <select
            id="outletName"
            required
          >

            ${getOutletOptionsForUser(
              userKey
            )}

          </select>

        </label>


        <label>

          What is today's sales value?

          <input
            id="todaySales"
            type="number"
            step="0.01"
            min="0"
            value="0"
            required
          />

        </label>


        <label>

          What was the sales value on the same date last month?

          <input
            id="lastMonthSameDay"
            type="number"
            step="0.01"
            min="0"
            value="0"
          />

        </label>


        <label>

          How much Active value do you currently have?

          <input
            id="activeOrder"
            type="number"
            step="0.01"
            min="0"
            value="0"
          />

        </label>


        <label>

          How much Prepare for Trip value do you currently have?

          <input
            id="pprTrip"
            type="number"
            step="0.01"
            min="0"
            value="0"
          />

        </label>


        <label>

          Which SKU did you sell?

          <input
            id="productName"
            type="text"
            placeholder="SKU name"
          />

        </label>


        <label>

          How many cartons did you sell?

          <input
            id="cartons"
            type="number"
            min="0"
            step="1"
            value="0"
          />

        </label>


        <label>

          How much total incentive have you earned this month?

          <input
            id="monthlyIncentive"
            type="number"
            min="0"
            step="0.01"
            value="0"
          />

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
    .getElementById(
      "dailyForm"
    )
    .addEventListener(
      "submit",
      saveDailyUpdate
    );

}


/* =========================================================
   SAVE DAILY UPDATE
   ========================================================= */

function saveDailyUpdate(event) {

  event.preventDefault();


  if (
    currentUser.role === "manager"
  ) {

    showToast(
      "Use your SR login to submit sales."
    );

    return;

  }


  const userKey =
    viewedUserKey();


  const date =
    document
      .getElementById(
        "reportDate"
      )
      .value;


  const outlet =
    document
      .getElementById(
        "outletName"
      )
      .value;


  if (!outlet) {

    showToast(
      "Outlet list will be added in next step."
    );

    return;

  }


  const todaySales =
    number(
      document
        .getElementById(
          "todaySales"
        )
        .value
    );


  const lastMonthSameDay =
    number(
      document
        .getElementById(
          "lastMonthSameDay"
        )
        .value
    );


  const activeOrder =
    number(
      document
        .getElementById(
          "activeOrder"
        )
        .value
    );


  const pprTrip =
    number(
      document
        .getElementById(
          "pprTrip"
        )
        .value
    );


  const product =
    document
      .getElementById(
        "productName"
      )
      .value
      .trim();


  const cartons =
    number(
      document
        .getElementById(
          "cartons"
        )
        .value
    );


  const incentive =
    number(
      document
        .getElementById(
          "monthlyIncentive"
        )
        .value
    );


  state.entries.push({

    id:
      Date.now(),

    user:
      userKey,

    date:
      date,

    outlet:
      outlet,

    todaySales:
      todaySales,

    lastMonthSameDay:
      lastMonthSameDay,

    activeOrder:
      activeOrder,

    pprTrip:
      pprTrip,

    product:
      product,

    cartons:
      cartons,

    createdAt:
      new Date().toISOString()

  });


  const incentiveKey =
    `${userKey}_${monthFromDate(date)}`;


  state.incentives[
    incentiveKey
  ] = incentive;


  saveState();


  showToast(
    "Daily report saved"
  );


  currentPage =
    "dashboard";


  setActiveNav(
    "dashboard"
  );


  renderDashboard();

}


/* =========================================================
   MONTHLY PLANNING
   ========================================================= */

function renderPlanning() {

  const userKey =
    viewedUserKey();


  const month =
    currentMonthISO();


  const plans =
    getPlans(
      userKey,
      month
    );


  const main =
    document.getElementById(
      "mainContent"
    );


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

          Which month is this plan for?

          <input
            id="planMonth"
            type="month"
            value="${month}"
            required
          />

        </label>


        <label>

          Which outlet will you focus on?

          <select
            id="planOutlet"
            required
          >

            ${getOutletOptionsForUser(
              userKey
            )}

          </select>

        </label>


        <label>

          What is your monthly target for this outlet?

          <input
            id="planTarget"
            type="number"
            min="0"
            step="0.01"
            value="0"
            required
          />

        </label>


        <label>

          Which SKUs will you target?

          <textarea
            id="planSkus"
            rows="3"
            placeholder="SKU list will be upgraded later"
          ></textarea>

        </label>


        <label>

          What sales value do you expect from these SKUs?

          <input
            id="expectedSkuValue"
            type="number"
            min="0"
            step="0.01"
            value="0"
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

          ?

          plans
            .map(
              plan => `

                <div class="performance-row">

                  <div>

                    <strong>

                      ${escapeHTML(
                        plan.outlet
                      )}

                    </strong>

                    <small>

                      ${escapeHTML(
                        plan.skus
                        ||
                        "No SKU selected"
                      )}

                    </small>

                  </div>


                  <div>

                    ${money(
                      plan.target
                    )}

                  </div>

                </div>

              `
            )
            .join("")

          :

          `

            <p class="muted">

              No monthly plan yet.

            </p>

          `
      }


    </div>

  `;


  bindManagerSelector();


  document
    .getElementById(
      "planningForm"
    )
    .addEventListener(
      "submit",
      savePlanning
    );

}


/* =========================================================
   SAVE PLANNING
   ========================================================= */

function savePlanning(event) {

  event.preventDefault();


  if (
    currentUser.role === "manager"
  ) {

    showToast(
      "Use salesman access for monthly planning."
    );

    return;

  }


  const userKey =
    viewedUserKey();


  const month =
    document
      .getElementById(
        "planMonth"
      )
      .value;


  const outlet =
    document
      .getElementById(
        "planOutlet"
      )
      .value;


  if (!outlet) {

    showToast(
      "Outlet list will be added next."
    );

    return;

  }


  const target =
    number(
      document
        .getElementById(
          "planTarget"
        )
        .value
    );


  const skus =
    document
      .getElementById(
        "planSkus"
      )
      .value
      .trim();


  const expectedSkuValue =
    number(
      document
        .getElementById(
          "expectedSkuValue"
        )
        .value
    );


  const existing =
    state.plans.find(

      plan =>

        plan.user === userKey

        &&

        plan.month === month

        &&

        plan.outlet
          .toLowerCase()

        ===

        outlet
          .toLowerCase()

    );


  if (existing) {

    existing.target =
      target;

    existing.skus =
      skus;

    existing.expectedSkuValue =
      expectedSkuValue;

  }

  else {

    state.plans.push({

      id:
        Date.now(),

      user:
        userKey,

      month:
        month,

      outlet:
        outlet,

      target:
        target,

      skus:
        skus,

      expectedSkuValue:
        expectedSkuValue

    });

  }


  saveState();


  showToast(
    "Monthly plan saved"
  );


  renderPlanning();

}


/* =========================================================
   INCENTIVE
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
      state.incentives[
        incentiveKey
      ]
    );


  const entries =
    getEntries(
      userKey,
      month
    );


  const productTotals =
    {};


  entries.forEach(
    function (entry) {

      if (!entry.product) {

        return;

      }


      const product =
        entry.product.trim();


      if (
        !productTotals[product]
      ) {

        productTotals[product] =
          0;

      }


      productTotals[product]
        +=
        number(entry.cartons);

    }
  );


  const products =
    Object.entries(
      productTotals
    );


  const main =
    document.getElementById(
      "mainContent"
    );


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

        Starts from zero.

      </p>


    </div>


    <div class="card">


      <h3>

        SKU Carton Summary

      </h3>


      ${
        products.length

          ?

          products
            .map(
              ([product, cartons]) => `

                <div class="performance-row">

                  <strong>

                    ${escapeHTML(
                      product
                    )}

                  </strong>

                  <span>

                    ${cartons} CTN

                  </span>

                </div>

              `
            )
            .join("")

          :

          `

            <p class="muted">

              No SKU sales yet.

            </p>

          `
      }


    </div>

  `;


  bindManagerSelector();

}


/* =========================================================
   SUMMARY
   ========================================================= */

function renderSummary() {

  const userKey =
    viewedUserKey();


  const month =
    currentMonthISO();


  const entries =
    getEntries(
      userKey,
      month
    )
      .sort(
        (a, b) =>
          b.date.localeCompare(
            a.date
          )
      );


  const main =
    document.getElementById(
      "mainContent"
    );


  main.innerHTML = `

    ${managerSelectorHTML()}


    <div class="card">


      <p class="eyebrow">

        SUMMARY BOARD

      </p>


      <h2>

        ${escapeHTML(
          USERS[userKey].name
        )}

      </h2>


      <button
        class="btn primary"
        id="downloadCSV"
      >

        Download Excel Report

      </button>


    </div>


    <div class="card table-wrap">


      ${
        entries.length

          ?

          `

            <table>


              <thead>

                <tr>

                  <th>Date</th>

                  <th>Outlet</th>

                  <th>Sales</th>

                  <th>Last Month</th>

                  <th>Active</th>

                  <th>Prepare for Trip</th>

                  <th>SKU</th>

                  <th>CTN</th>

                </tr>

              </thead>


              <tbody>


                ${entries
                  .map(
                    entry => `

                      <tr>

                        <td>
                          ${escapeHTML(
                            entry.date
                          )}
                        </td>

                        <td>
                          ${escapeHTML(
                            entry.outlet
                          )}
                        </td>

                        <td>
                          ${money(
                            entry.todaySales
                          )}
                        </td>

                        <td>
                          ${money(
                            entry.lastMonthSameDay
                          )}
                        </td>

                        <td>
                          ${money(
                            entry.activeOrder
                          )}
                        </td>

                        <td>
                          ${money(
                            entry.pprTrip
                          )}
                        </td>

                        <td>
                          ${escapeHTML(
                            entry.product || "-"
                          )}
                        </td>

                        <td>
                          ${number(
                            entry.cartons
                          )}
                        </td>

                      </tr>

                    `
                  )
                  .join("")}


              </tbody>


            </table>

          `

          :

          `

            <p class="muted">

              No data yet.

            </p>

          `
      }


    </div>

  `;


  bindManagerSelector();


  const downloadButton =
    document.getElementById(
      "downloadCSV"
    );


  if (downloadButton) {

    downloadButton.addEventListener(

      "click",

      function () {

        downloadCSV(
          userKey,
          month
        );

      }

    );

  }

}


/* =========================================================
   DOWNLOAD CSV
   ========================================================= */

function downloadCSV(
  userKey,
  month
) {

  const entries =
    getEntries(
      userKey,
      month
    );


  if (!entries.length) {

    showToast(
      "No data available"
    );

    return;

  }


  const rows = [

    [

      "Date",

      "Salesman",

      "Staff ID",

      "Outlet",

      "Today Sales",

      "Last Month Same Day",

      "Active",

      "Prepare for Trip",

      "SKU",

      "Cartons"

    ]

  ];


  entries.forEach(
    function (entry) {

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

    }
  );


  const csv =
    rows
      .map(
        row =>

          row
            .map(
              cell =>

                `"${String(
                  cell ?? ""
                )
                  .replaceAll(
                    '"',
                    '""'
                  )}"`

            )
            .join(",")

      )
      .join("\n");


  const blob =
    new Blob(

      [csv],

      {
        type:
          "text/csv;charset=utf-8;"
      }

    );


  const url =
    URL.createObjectURL(
      blob
    );


  const link =
    document.createElement(
      "a"
    );


  link.href =
    url;


  link.download =
    `${USERS[userKey].name}-${month}-report.csv`;


  link.click();


  URL.revokeObjectURL(
    url
  );

}


/* =========================================================
   MANAGER TASK
   ========================================================= */

function renderManagerTaskBox(
  userKey
) {

  return `

    <div class="card">


      <p class="eyebrow">

        MANAGER TASK

      </p>


      <h3>

        Send Task to

        ${escapeHTML(
          USERS[userKey].name
        )}

      </h3>


      <form
        id="managerTaskForm"
        class="stack"
      >


        <label>

          What task do you want to assign?

          <input
            id="taskTitle"
            type="text"
            placeholder="Example: Close 20 CTN Mango Juice"
            required
          />

        </label>


        <label>

          Instruction

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


/* =========================================================
   SAVE MANAGER TASK
   ========================================================= */

function bindManagerTaskForm() {

  const form =
    document.getElementById(
      "managerTaskForm"
    );


  if (!form) {

    return;

  }


  form.addEventListener(
    "submit",
    function (event) {

      event.preventDefault();


      state.tasks.push({

        id:
          Date.now(),

        user:
          managerViewing,

        title:
          document
            .getElementById(
              "taskTitle"
            )
            .value
            .trim(),

        instruction:
          document
            .getElementById(
              "taskInstruction"
            )
            .value
            .trim(),

        completed:
          false,

        createdAt:
          new Date()
            .toISOString()

      });


      saveState();


      form.reset();


      showToast(
        "Task saved"
      );

    }
  );

}


/* =========================================================
   TASK PAGE
   ========================================================= */

function renderTasks() {

  const main =
    document.getElementById(
      "mainContent"
    );


  if (
    currentUser.role === "manager"
  ) {

    main.innerHTML = `

      <div class="card">

        <h2>
          Manager Tasks
        </h2>

        <p class="muted">

          Select an SR from Home
          to send a task.

        </p>

      </div>

    `;

    return;

  }


  const tasks =
    state.tasks

      .filter(
        task =>
          task.user
          ===
          currentUser.username
      )

      .sort(
        (a, b) =>
          b.createdAt.localeCompare(
            a.createdAt
          )
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

        ?

        tasks
          .map(
            task => `

              <div class="card">


                <h3>

                  ${escapeHTML(
                    task.title
                  )}

                </h3>


                <p>

                  ${escapeHTML(
                    task.instruction
                  )}

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

                    ?

                    ""

                    :

                    `

                      <button
                        class="btn primary completeTaskBtn"
                        data-id="${task.id}"
                      >

                        Mark as Completed

                      </button>

                    `
                }


              </div>

            `
          )
          .join("")

        :

        `

          <div class="card">

            <p class="muted">

              No special task.

            </p>

          </div>

        `
    }

  `;


  document
    .querySelectorAll(
      ".completeTaskBtn"
    )
    .forEach(
      function (button) {

        button.addEventListener(
          "click",
          function () {

            const id =
              Number(
                this.dataset.id
              );


            const task =
              state.tasks.find(
                item =>
                  item.id === id
              );


            if (task) {

              task.completed =
                true;

            }


            saveState();

            updateNotificationBadge();

            renderTasks();

          }
        );

      }
    );

}


/* =========================================================
   SERVICE WORKER
   ========================================================= */

if (
  "serviceWorker"
  in navigator
) {

  window.addEventListener(
    "load",
    function () {

      navigator
        .serviceWorker
        .register("sw.js")
        .catch(
          function () {}
        );

    }
  );

}
