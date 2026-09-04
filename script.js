let currentYear = 2026;
let currentMonth = 9;

let transactions = [];


// ==============================
// 月表示
// ==============================

function updateMonthTitle() {

  document.getElementById("monthTitle").textContent =
    `${currentYear}年${currentMonth}月`;

}


// ==============================
// 前月
// ==============================

document.getElementById("prevMonth").addEventListener("click", function () {

  currentMonth--;

  if (currentMonth === 0) {
    currentMonth = 12;
    currentYear--;
  }

  updateMonthTitle();

  loadMonth();

});


// ==============================
// 次月
// ==============================

document.getElementById("nextMonth").addEventListener("click", function () {

  currentMonth++;

  if (currentMonth === 13) {
    currentMonth = 1;
    currentYear++;
  }

  updateMonthTitle();

  loadMonth();

});


// ==============================
// 収支追加
// ==============================

document.getElementById("addRowButton").addEventListener("click", function () {

  addTransaction();

});


// ==============================
// 収支1行追加
// ==============================

function addTransaction() {

  const transaction = {

    id: Date.now(),

    date:
      `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`,

    category: "",

    detail: "",

    income: "",

    expense: "",

    memo: ""

  };

  transactions.push(transaction);

  renderTransactions();

  calculateTotals();

}


// ==============================
// 収支一覧表示
// ==============================

function renderTransactions() {

  const tbody =
    document.getElementById("transactionTable");

  tbody.innerHTML = "";

  transactions.forEach(function (transaction) {

    const tr = document.createElement("tr");

    tr.innerHTML = `

      <td>
        <input
          type="date"
          value="${transaction.date}"
          onchange="updateTransaction(${transaction.id}, 'date', this.value)"
        >
      </td>

      <td>
        <input
          type="text"
          placeholder="分類"
          value="${transaction.category}"
          onchange="updateTransaction(${transaction.id}, 'category', this.value)"
        >
      </td>

      <td>
        <input
          type="text"
          placeholder="内訳"
          value="${transaction.detail}"
          onchange="updateTransaction(${transaction.id}, 'detail', this.value)"
        >
      </td>

      <td>
        <input
          type="number"
          placeholder="0"
          value="${transaction.income}"
          onchange="updateTransaction(${transaction.id}, 'income', this.value)"
        >
      </td>

      <td>
        <input
          type="number"
          placeholder="0"
          value="${transaction.expense}"
          onchange="updateTransaction(${transaction.id}, 'expense', this.value)"
        >
      </td>

      <td>
        <input
          type="text"
          placeholder="メモ"
          value="${transaction.memo}"
          onchange="updateTransaction(${transaction.id}, 'memo', this.value)"
        >
      </td>

      <td>

        <button
          class="delete-button"
          onclick="deleteTransaction(${transaction.id})"
        >
          削除
        </button>

      </td>

    `;

    tbody.appendChild(tr);

  });

}


// ==============================
// データ更新
// ==============================

function updateTransaction(id, key, value) {

  const transaction =
    transactions.find(item => item.id === id);

  if (!transaction) {
    return;
  }

  transaction[key] = value;

  calculateTotals();

}


// ==============================
// データ削除
// ==============================

function deleteTransaction(id) {

  transactions =
    transactions.filter(item => item.id !== id);

  renderTransactions();

  calculateTotals();

}


// ==============================
// 合計計算
// ==============================

function calculateTotals() {

  let income = 0;

  let expense = 0;

  transactions.forEach(function (transaction) {

    income += Number(transaction.income) || 0;

    expense += Number(transaction.expense) || 0;

  });


  const carryOver = 0;

  const balance =
    carryOver + income - expense;


  document.getElementById("incomeTotal").textContent =
    income.toLocaleString() + "円";

  document.getElementById("expenseTotal").textContent =
    expense.toLocaleString() + "円";

  document.getElementById("carryOver").textContent =
    carryOver.toLocaleString() + "円";

  document.getElementById("currentBalance").textContent =
    balance.toLocaleString() + "円";

}


// ==============================
// 月読み込み
// ==============================

function loadMonth() {

  transactions = [];

  renderTransactions();

  calculateTotals();

}


// ==============================
// メニュー
// ==============================

function showIncomeExpense() {

  document.getElementById("incomeExpenseSection")
    .scrollIntoView({
      behavior: "smooth"
    });

}


function showMembers() {

  alert("部費管理機能はこれから作成します。");

}


function showSummary() {

  alert("月別集計機能はこれから作成します。");

}


function exportPDF() {

  alert("PDF出力機能はこれから作成します。");

}


// 初期表示

updateMonthTitle();

loadMonth();
