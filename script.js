const SUPABASE_URL = "https://ixyqbkraeexygmacooqq.supabase.co";
const SUPABASE_KEY = "sb_publishable_-LRZicRjb1NNTqFOKwH5zQ_uzinwx2J";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// ==============================
// ユーザー権限
// ==============================

let currentUser = null;
let currentRole = null;

async function loadUserRole() {

  const {
    data: { user }
  } = await supabaseClient.auth.getUser();

  if (!user) {
    return;
  }

  currentUser = user;

  const { data, error } =
    await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

  if (error) {

    console.error("権限の取得に失敗しました:", error);

    alert(
      "ユーザー権限の取得に失敗しました。\n" +
      error.message
    );

    return;
  }

  currentRole = data.role;

  console.log("現在の権限:", currentRole);
const roleElement =
  document.getElementById("userRole");

if (roleElement) {

  if (currentRole === "editor") {

    roleElement.textContent =
      "権限：編集者";

  } else if (currentRole === "viewer") {

    roleElement.textContent =
      "権限：閲覧者";

  }

}
}

// ==============================
// ログイン処理
// ==============================

document.getElementById("loginButton")
  .addEventListener("click", async function () {

    const email =
      document.getElementById("loginEmail").value;

    const password =
      document.getElementById("loginPassword").value;

    const message =
      document.getElementById("loginMessage");

    message.textContent = "ログイン中...";

    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

    if (error) {

      console.error(error);

      message.textContent =
        "ログインに失敗しました: " + error.message;

      return;

    }

    message.textContent =
      "ログインしました！";

    console.log("ログインユーザー:", data.user);

  });

let currentYear = 2026;
let currentMonth = 9;

let transactions = [];

// ==============================
// 分類リスト
// ==============================

let categories = [];

// ==============================
// Supabaseから分類を読み込む
// ==============================

async function loadCategories() {

  const { data, error } = await supabaseClient
    .from("categories")
    .select("namemename")
    .order("created_at", { ascending: true });

  if (error) {

    console.error("分類の読み込みに失敗しました:", error);

    alert("分類の読み込みに失敗しました。\n" + error.message);

    return;

  }

  categories = data.map(function(item) {
    return item.namemename;
  });

  renderCategoryList();
  renderTransactions();

}


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
  .addEventListener("click", async function () {

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

    const { error } =
      await supabaseClient
        .from("categories")
        .insert({
          namemename: category
        });

    if (error) {

      console.error("分類追加エラー:", error);

      alert(
        "分類の追加に失敗しました。\n" +
        error.message
      );

      return;

    }

    await loadCategories();

    alert("分類を追加しました。");

  });


// ==============================
// 分類削除
// ==============================

async function deleteCategory(category) {

  const result =
    confirm(
      `「${category}」を分類リストから削除しますか？`
    );

  if (!result) {
    return;
  }

  const { error } =
    await supabaseClient
      .from("categories")
      .delete()
      .eq("namemename", category);

  if (error) {

    console.error("分類削除エラー:", error);

    alert(
      "分類の削除に失敗しました。\n" +
      error.message
    );

    return;

  }

  await loadCategories();

  alert("分類を削除しました。");

}


// ==============================
// 分類保存
// ==============================


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
loadCategories();

loadUserRole();
