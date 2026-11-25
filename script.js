/* =========================================================
   Personal Ledger – JavaScript
   What this file does:
   1. Keeps all expenses in an array and saves it in localStorage
   2. Validates the form (title, amount, category, date)
   3. Shows the expenses in a table with a category filter
   4. Calculates the total and category-wise totals
   ========================================================= */

// ---------- 1. Basic data ----------
/* ===== SPLASH SCREEN (put at the very top of script.js) ===== */
(function runSplash() {
  const splash = document.getElementById("splash");
  if (!splash) return;

  const amountEl = document.getElementById("splashAmount");
  const statusEl = document.getElementById("splashStatus");
  const skipBtn = document.getElementById("splashSkip");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const TOTAL_TIME = reduceMotion ? 1500 : 6500; // how long the splash stays (ms)
  let closed = false;

  document.body.classList.add("splash-active");

  // Status messages that change while loading
  const messages = [
    { at: 0, text: "Opening your ledger..." },
    { at: 1800, text: "Sorting your categories..." },
    { at: 3600, text: "Counting every rupee..." },
    { at: 5200, text: "All set. Welcome!" }
  ];
  messages.forEach(function (m) {
    setTimeout(function () {
      statusEl.textContent = m.text;
    }, m.at);
  });

  // Rupee counter that counts up
  const target = 24580;
  const countStart = 1200;
  const countTime = 4500;
  const startedAt = performance.now();

  function tick(now) {
    if (closed) return;
    const elapsed = now - startedAt - countStart;
    if (elapsed < 0) {
      requestAnimationFrame(tick);
      return;
    }
    const progress = Math.min(elapsed / countTime, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // slows down near the end
    amountEl.textContent = "₹" + Math.round(target * eased).toLocaleString("en-IN");
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  function closeSplash() {
    if (closed) return;
    closed = true;
    splash.classList.add("hide");
    document.body.classList.remove("splash-active");
    setTimeout(function () {
      splash.remove();
    }, 900);
  }

  setTimeout(closeSplash, TOTAL_TIME);
  skipBtn.addEventListener("click", closeSplash);
})();

const STORAGE_KEY = "personalLedgerExpenses";

const CATEGORIES = [
  "Food",
  "Transport",
  "Books & Study",
  "Entertainment",
  "Shopping",
  "Bills",
  "Health",
  "Other"
];

// The main array. Each expense looks like:
// { id: "abc123", title: "Lunch", amount: 120, category: "Food", date: "2026-11-25" }
let expenses = loadExpenses();

// ---------- 2. Grab elements from the page ----------
const form = document.getElementById("expenseForm");
const titleInput = document.getElementById("title");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");
const formMessage = document.getElementById("formMessage");

const filterSelect = document.getElementById("filterCategory");
const expenseBody = document.getElementById("expenseBody");
const emptyState = document.getElementById("emptyState");
const emptyTitle = document.getElementById("emptyTitle");
const emptyText = document.getElementById("emptyText");
const sampleBtn = document.getElementById("sampleBtn");
const clearAllBtn = document.getElementById("clearAllBtn");

const totalSpentEl = document.getElementById("totalSpent");
const statCountEl = document.getElementById("statCount");
const statLargestEl = document.getElementById("statLargest");
const statTopCategoryEl = document.getElementById("statTopCategory");
const breakdownEl = document.getElementById("breakdown");
const footLabel = document.getElementById("footLabel");
const footTotal = document.getElementById("footTotal");

// ---------- 3. localStorage helpers ----------
function loadExpenses() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    // If the saved data is broken, start fresh instead of crashing
    return [];
  }
}

function saveExpenses() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

// ---------- 4. Small helper functions ----------

// Turns 1234.5 into "₹1,234.50"
function formatMoney(value) {
  return "₹" + value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Turns "2026-11-25" into "25 Nov 2026"
function formatDate(dateString) {
  const d = new Date(dateString + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

// Today's date in YYYY-MM-DD format (used for the date box)
function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return now.getFullYear() + "-" + month + "-" + day;
}

// Date that was `n` days ago, as YYYY-MM-DD (used for sample data)
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + month + "-" + day;
}

// Stops user text from being treated as HTML (basic safety)
function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ---------- 5. Fill the dropdowns ----------
function fillDropdowns() {
  // Category dropdown in the form
  categoryInput.innerHTML = '<option value="">Choose a category</option>';
  CATEGORIES.forEach(function (cat) {
    categoryInput.innerHTML += '<option value="' + escapeHTML(cat) + '">' + escapeHTML(cat) + "</option>";
  });

  // Filter dropdown above the table
  filterSelect.innerHTML = '<option value="All">All categories</option>';
  CATEGORIES.forEach(function (cat) {
    filterSelect.innerHTML += '<option value="' + escapeHTML(cat) + '">' + escapeHTML(cat) + "</option>";
  });
}

// ---------- 6. Form validation ----------
function showError(input, errorId, message) {
  input.classList.add("is-invalid");
  document.getElementById(errorId).textContent = message;
}

function clearErrors() {
  [titleInput, amountInput, categoryInput, dateInput].forEach(function (input) {
    input.classList.remove("is-invalid");
  });
}

// Returns true only if everything is valid
function validateForm() {
  clearErrors();
  let isValid = true;

  const title = titleInput.value.trim();
  const amountText = amountInput.value.trim();
  const amount = Number(amountText);

  if (title === "") {
    showError(titleInput, "titleError", "Please enter a title for this expense.");
    isValid = false;
  }

  if (amountText === "" || isNaN(amount)) {
    showError(amountInput, "amountError", "Please enter the amount as a number.");
    isValid = false;
  } else if (amount <= 0) {
    showError(amountInput, "amountError", "Amount must be greater than zero.");
    isValid = false;
  } else if (amount > 10000000) {
    showError(amountInput, "amountError", "Amount is too large. Enter a value below ₹1,00,00,000.");
    isValid = false;
  }

  if (categoryInput.value === "") {
    showError(categoryInput, "categoryError", "Please choose a category.");
    isValid = false;
  }

  if (dateInput.value === "") {
    showError(dateInput, "dateError", "Please pick the date of the expense.");
    isValid = false;
  } else if (dateInput.value > todayString()) {
    showError(dateInput, "dateError", "The date cannot be in the future.");
    isValid = false;
  }

  return isValid;
}

// ---------- 7. Add, delete, clear ----------
function addExpense(event) {
  event.preventDefault(); // stop the page from reloading

  if (!validateForm()) {
    formMessage.textContent = "";
    return;
  }

  const newExpense = {
    id: makeId(),
    title: titleInput.value.trim(),
    amount: Math.round(Number(amountInput.value) * 100) / 100, // keep 2 decimals
    category: categoryInput.value,
    date: dateInput.value
  };

  expenses.push(newExpense);
  saveExpenses();
  renderAll();

  form.reset();
  dateInput.value = todayString();
  titleInput.focus();

  formMessage.textContent = "Expense added to your ledger.";
  setTimeout(function () {
    formMessage.textContent = "";
  }, 3000);
}

function deleteExpense(id) {
  // keep every expense except the one with this id
  expenses = expenses.filter(function (exp) {
    return exp.id !== id;
  });
  saveExpenses();
  renderAll();
}

function clearAll() {
  if (expenses.length === 0) return;
  if (confirm("Remove all expenses from your ledger? This cannot be undone.")) {
    expenses = [];
    saveExpenses();
    renderAll();
  }
}

function loadSampleData() {
  // Fictional data for demonstration only
  expenses = [
    { id: makeId(), title: "Canteen lunch", amount: 120, category: "Food", date: daysAgo(0) },
    { id: makeId(), title: "Metro card recharge", amount: 300, category: "Transport", date: daysAgo(1) },
    { id: makeId(), title: "Data structures textbook", amount: 650, category: "Books & Study", date: daysAgo(2) },
    { id: makeId(), title: "Movie with friends", amount: 400, category: "Entertainment", date: daysAgo(3) },
    { id: makeId(), title: "Mobile recharge", amount: 299, category: "Bills", date: daysAgo(4) },
    { id: makeId(), title: "Evening snacks", amount: 85.5, category: "Food", date: daysAgo(5) },
    { id: makeId(), title: "Notebook and pens", amount: 180, category: "Shopping", date: daysAgo(6) },
    { id: makeId(), title: "Pharmacy", amount: 140, category: "Health", date: daysAgo(8) }
  ];
  saveExpenses();
  renderAll();
}

// ---------- 8. Calculations ----------

// Total of any list of expenses
function sumOf(list) {
  let total = 0;
  list.forEach(function (exp) {
    total += exp.amount;
  });
  return total;
}

// Returns an object like { Food: 205.5, Transport: 300, ... }
function totalsByCategory() {
  const totals = {};
  expenses.forEach(function (exp) {
    totals[exp.category] = (totals[exp.category] || 0) + exp.amount;
  });
  return totals;
}

// The expenses that match the current filter, newest first
function getVisibleExpenses() {
  const chosen = filterSelect.value;
  let list = expenses.filter(function (exp) {
    return chosen === "All" || exp.category === chosen;
  });

  list.sort(function (a, b) {
    if (a.date < b.date) return 1;
    if (a.date > b.date) return -1;
    return 0;
  });

  return list;
}

// ---------- 9. Drawing things on the page ----------
function renderSummary() {
  totalSpentEl.textContent = formatMoney(sumOf(expenses));
  statCountEl.textContent = expenses.length;

  if (expenses.length === 0) {
    statLargestEl.textContent = "–";
    statTopCategoryEl.textContent = "–";
    return;
  }

  // Largest single expense
  let largest = expenses[0];
  expenses.forEach(function (exp) {
    if (exp.amount > largest.amount) largest = exp;
  });
  statLargestEl.textContent = formatMoney(largest.amount);

  // Category with the highest total
  const totals = totalsByCategory();
  let topName = "";
  let topValue = 0;
  for (const name in totals) {
    if (totals[name] > topValue) {
      topValue = totals[name];
      topName = name;
    }
  }
  statTopCategoryEl.textContent = topName;
}

function renderBreakdown() {
  if (expenses.length === 0) {
    breakdownEl.innerHTML = '<p class="text-muted mb-0">Category totals will appear here once you add an expense.</p>';
    return;
  }

  const totals = totalsByCategory();
  const grandTotal = sumOf(expenses);

  // Turn the object into an array so we can sort it (biggest first)
  const rows = Object.keys(totals).map(function (name) {
    return { name: name, value: totals[name] };
  });
  rows.sort(function (a, b) {
    return b.value - a.value;
  });

  let html = "";
  rows.forEach(function (row) {
    const percent = (row.value / grandTotal) * 100;
    html +=
      '<div class="break-row">' +
        '<div class="break-head">' +
          '<span class="break-name">' + escapeHTML(row.name) + "</span>" +
          '<span class="break-amount">' + formatMoney(row.value) +
            '<span class="break-percent">' + percent.toFixed(0) + "%</span></span>" +
        "</div>" +
        '<div class="break-track"><div class="break-fill" style="width:' + percent.toFixed(1) + '%"></div></div>' +
      "</div>";
  });

  breakdownEl.innerHTML = html;
}

function renderTable() {
  const list = getVisibleExpenses();
  const chosen = filterSelect.value;

  let rowsHtml = "";
  list.forEach(function (exp) {
    rowsHtml +=
      "<tr>" +
        '<td class="cell-date">' + formatDate(exp.date) + "</td>" +
        "<td>" + escapeHTML(exp.title) + "</td>" +
        '<td><span class="badge-cat">' + escapeHTML(exp.category) + "</span></td>" +
        '<td class="text-end cell-amount">' + formatMoney(exp.amount) + "</td>" +
        '<td class="text-end">' +
          '<button type="button" class="btn-delete" data-id="' + exp.id + '" ' +
          'aria-label="Delete ' + escapeHTML(exp.title) + '">Delete</button>' +
        "</td>" +
      "</tr>";
  });
  expenseBody.innerHTML = rowsHtml;

  // Footer total follows the filter
  footLabel.textContent = chosen === "All" ? "Total (all categories)" : "Total (" + chosen + ")";
  footTotal.textContent = formatMoney(sumOf(list));

  // Empty states: nothing saved at all, or nothing matches the filter
  if (list.length === 0) {
    emptyState.hidden = false;
    if (expenses.length === 0) {
      emptyTitle.textContent = "Your ledger is empty.";
      emptyText.textContent = "Record your first expense using the form, or load a few sample entries to see how it works.";
      sampleBtn.hidden = false;
    } else {
      emptyTitle.textContent = "No expenses in this category.";
      emptyText.textContent = "Choose another category from the list above, or add a new expense.";
      sampleBtn.hidden = true;
    }
  } else {
    emptyState.hidden = true;
  }
}

// Redraw everything
function renderAll() {
  renderSummary();
  renderBreakdown();
  renderTable();
}

// ---------- 10. Connect events ----------
form.addEventListener("submit", addExpense);
filterSelect.addEventListener("change", renderTable);
clearAllBtn.addEventListener("click", clearAll);
sampleBtn.addEventListener("click", loadSampleData);

// One listener for all Delete buttons (event delegation)
expenseBody.addEventListener("click", function (event) {
  const button = event.target.closest(".btn-delete");
  if (button) {
    deleteExpense(button.dataset.id);
  }
});

// ---------- 11. Start the app ----------
fillDropdowns();
dateInput.value = todayString();
dateInput.max = todayString();
renderAll();