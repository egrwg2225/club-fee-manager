let currentYear = 2026;
let currentMonth = 9;

let transactions = [];

// ==============================
// 分類リスト
// ==============================

let categories = JSON.parse(
  localStorage.getItem("clubFeeCategories")
) || [
  "部費",
  "大会費",
  "備品",
  "交通費",
  "施設費",
  "その他"
];


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

  <select
    onchange="updateTransaction(${transaction.id}, 'category', this.value)"
  >

    <option value="">選択してください</option>

    ${categories.map(function(category) {

      return `
        <option
          value="${category}"
          ${transaction.category === category ? "selected" : ""}
        >
          ${category}
        </option>
      `;

    }).join("")}

  </select>

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

// ==============================
// 分類管理画面
// ==============================

document.getElementById("manageCategoryButton")
  .addEventListener("click", function () {

    const area =
      document.getElementById("categoryManagement");

    if (area.style.display === "none") {

      area.style.display = "block";

      renderCategoryList();

    } else {

      area.style.display = "none";

    }

  });


// ==============================
// 分類追加
// ==============================

document.getElementById("addCategoryButton")
  .addEventListener("click", function () {

    const name =
      prompt("追加する分類名を入力してください。");

    if (!name) {
      return;
    }

    const category =
      name.trim();

    if (!category) {
      return;
    }

    if (categories.includes(category)) {

      alert("その分類はすでに登録されています。");

      return;

    }

    categories.push(category);

    saveCategories();

    renderCategoryList();

    renderTransactions();

  });


// ==============================
// 分類削除
// ==============================

function deleteCategory(category) {

  const result =
    confirm(
      `「${category}」を分類リストから削除しますか？`
    );

  if (!result) {
    return;
  }

  categories =
    categories.filter(function(item) {

      return item !== category;

    });

  saveCategories();

  renderCategoryList();

  renderTransactions();

}


// ==============================
// 分類保存
// ==============================

function saveCategories() {

  localStorage.setItem(
    "clubFeeCategories",
    JSON.stringify(categories)
  );

}


// ==============================
// 分類一覧表示
// ==============================

function renderCategoryList() {

  const list =
    document.getElementById("categoryList");

  list.innerHTML = "";

  categories.forEach(function(category) {

    const div =
      document.createElement("div");

    div.style.marginBottom = "8px";

    div.innerHTML = `

      <span>
        ${category}
      </span>

      <button
        onclick="deleteCategory('${category}')"
        style="margin-left:10px;"
      >
        削除
      </button>

    `;

    list.appendChild(div);

  });

}
