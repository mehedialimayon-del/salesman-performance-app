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
  month =
