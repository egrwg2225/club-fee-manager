// ==============================
// Supabase設定
// ==============================

const SUPABASE_URL = "https://ixyqbkraeexygmacooqq.supabase.co";

const SUPABASE_KEY = "sb_publishable_-LRZicRjb1NNTqFOKwH5zQ_uzinwx2J";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


// ==============================
// 現在の状態
// ==============================

let currentUser = null;
let currentRole = null;

let currentYear = 2026;
let currentMonth = 9;

let transactions = [];
let categories = [];


// ==============================
// 初期処理
// ==============================

document.addEventListener("DOMContentLoaded", async () => {

  updateMonthTitle();

  // ログイン状態を確認
  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (session) {
    currentUser = session.user;
    await loadUserRole();
  }

  setupLoginButton();
  setupMonthButtons();
  setupAddRowButton();
  setupCategoryManagement();

});


// ==============================
// ログイン
// ==============================

function setupLoginButton() {

  const button = document.getElementById("loginButton");

  if (!button) return;

  button.addEventListener("click", login);

}


async function login() {

  const email =
    document.getElementById("loginEmail").value.trim();

  const password =
    document.getElementById("loginPassword").value;

  const message =
    document.getElementById("loginMessage");

  if (!email || !password) {

    message.textContent =
      "メールアドレスとパスワードを入力してください。";

    return;
  }

  message.textContent = "ログイン中…";

  const { data, error } =
    await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

  if (error) {

    console.error(error);

    message.textContent =
      "ログインできませんでした。";

    return;
  }

  currentUser = data.user;

  await loadUserRole();

}


// ==============================
// ロール取得
// ==============================

async function loadUserRole() {

  if (!currentUser) return;

  const { data, error } =
    await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", currentUser.id)
      .maybeSingle();

  if (error) {

    console.error(error);

    return;
  }

  currentRole = data?.role || "viewer";

  const loginSection =
    document.getElementById("loginSection");

  const appContent =
    document.getElementById("appContent");

  const userRole =
    document.getElementById("userRole");

  if (loginSection) {
    loginSection.style.display = "none";
  }

  if (appContent) {
    appContent.style.display = "block";
  }

  if (userRole) {

    userRole.textContent =
      currentRole === "editor"
        ? "編集者"
        : "閲覧者";
  }

  await loadCategories();
  await loadMonth();

}


// ==============================
// 編集権限
// ==============================

function isEditor() {

  return currentRole === "editor";

}


// ==============================
// 月変更
// ==============================

function setupMonthButtons() {

  const prev =
    document.getElementById("prevMonth");

  const next =
    document.getElementById("nextMonth");

  if (prev) {

    prev.addEventListener("click", async () => {

      currentMonth--;

      if (currentMonth < 1) {

        currentMonth = 12;
        currentYear--;

      }

      updateMonthTitle();

      await loadMonth();

    });

  }


  if (next) {

    next.addEventListener("click", async () => {

      currentMonth++;

      if (currentMonth > 12) {

        currentMonth = 1;
        currentYear++;

      }

      updateMonthTitle();

      await loadMonth();

    });

  }

}


function updateMonthTitle() {

  const title =
    document.getElementById("monthTitle");

  if (!title) return;

  title.textContent =
    `${currentYear}年${currentMonth}月`;

}


function getYearMonth(year = currentYear, month = currentMonth) {

  return `${year}-${String(month).padStart(2, "0")}`;

}


// ==============================
// 月データ読み込み
// ==============================

async function loadMonth() {

  if (!currentUser) return;

  const yearMonth =
    getYearMonth();

  const { data, error } =
    await supabaseClient
      .from("transactions")
      .select("*")
      .eq("year_month", yearMonth)
      .order("date", { ascending: true })
      .order("created_at", { ascending: true });

  if (error) {

    console.error(error);

    return;
  }

  transactions = data || [];

  renderTransactions();

  await calculateTotals();

}


// ==============================
// 前月繰越計算
// ==============================

async function getPreviousMonthBalance() {

  // 2026年1月より前にはデータがないため0円
  if (
    currentYear === 2026 &&
    currentMonth === 1
  ) {

    return 0;
  }

  let year = currentYear;
  let month = currentMonth - 1;

  if (month === 0) {

    month = 12;
    year--;

  }

  const previousYearMonth =
    getYearMonth(year, month);

  const { data, error } =
    await supabaseClient
      .from("transactions")
      .select("income, expense")
      .eq("year_month", previousYearMonth);

  if (error) {

    console.error(error);

    return 0;
  }

  let income = 0;
  let expense = 0;

  (data || []).forEach(row => {

    income += Number(row.income) || 0;
    expense += Number(row.expense) || 0;

  });

  // 前月のさらに前の繰越も取得
  const savedYear = currentYear;
  const savedMonth = currentMonth;

  currentYear = year;
  currentMonth = month;

  const carryOver =
    await getPreviousMonthBalance();

  currentYear = savedYear;
  currentMonth = savedMonth;

  return carryOver + income - expense;

}


// ==============================
// 合計計算
// ==============================

async function calculateTotals() {

  let incomeTotal = 0;
  let expenseTotal = 0;

  transactions.forEach(row => {

    incomeTotal += Number(row.income) || 0;
    expenseTotal += Number(row.expense) || 0;

  });

  const carryOver =
    await getPreviousMonthBalance();

  const currentBalance =
    carryOver + incomeTotal - expenseTotal;


  const carryElement =
    document.getElementById("carryOver");

  const incomeElement =
    document.getElementById("incomeTotal");

  const expenseElement =
    document.getElementById("expenseTotal");

  const balanceElement =
    document.getElementById("currentBalance");


  if (carryElement) {

    carryElement.textContent =
      formatYen(carryOver);

  }

  if (incomeElement) {

    incomeElement.textContent =
      formatYen(incomeTotal);

  }

  if (expenseElement) {

    expenseElement.textContent =
      formatYen(expenseTotal);

  }

  if (balanceElement) {

    balanceElement.textContent =
      formatYen(currentBalance);

  }

}


function formatYen(value) {

  return `${Math.round(value).toLocaleString()}円`;

}


// ==============================
// 収支入力行追加
// ==============================

function setupAddRowButton() {

  const button =
    document.getElementById("addRowButton");

  if (!button) return;

  button.addEventListener("click", addTransaction);

}


async function addTransaction() {

  if (!isEditor()) {

    alert("編集権限がありません。");

    return;
  }

  const yearMonth =
    getYearMonth();

  const firstDate =
    `${yearMonth}-01`;

  const { data, error } =
    await supabaseClient
      .from("transactions")
      .insert({
        year_month: yearMonth,
        date: firstDate,
        category: "",
        detail: "",
        income: 0,
        expense: 0,
        memo: ""
      })
      .select()
      .single();

  if (error) {

    console.error(error);

    alert("収支の追加に失敗しました。");

    return;
  }

  transactions.push(data);

  renderTransactions();

  await calculateTotals();

}


// ==============================
// 収支一覧表示
// ==============================

function renderTransactions() {

  const tbody =
    document.getElementById("transactionTable");

  if (!tbody) return;

  tbody.innerHTML = "";

  transactions.forEach(row => {

    const tr =
      document.createElement("tr");

    // --------------------------
    // 日付
    // --------------------------

    const dateTd =
      document.createElement("td");

    const dateInput =
      document.createElement("input");

    dateInput.type = "date";
    dateInput.value = row.date || "";
    dateInput.disabled = !isEditor();

    dateInput.addEventListener("change", () => {

      updateTransaction(
        row.idansactions,
        "date",
        dateInput.value
      );

    });

    dateTd.appendChild(dateInput);


    // --------------------------
    // 分類
    // --------------------------

    const categoryTd =
      document.createElement("td");

    const categorySelect =
      document.createElement("select");

    createCategoryOptions(
      categorySelect,
      row.category
    );

    categorySelect.disabled = !isEditor();

    categorySelect.addEventListener("change", () => {

      updateTransaction(
        row.idansactions,
        "category",
        categorySelect.value
      );

    });

    categoryTd.appendChild(categorySelect);


    // --------------------------
    // 内訳
    // --------------------------

    const detailTd =
      document.createElement("td");

    const detailInput =
      document.createElement("input");

    detailInput.type = "text";
    detailInput.value = row.detail || "";
    detailInput.disabled = !isEditor();

    detailInput.addEventListener("change", () => {

      updateTransaction(
        row.idansactions,
        "detail",
        detailInput.value
      );

    });

    detailTd.appendChild(detailInput);


    // --------------------------
    // 収入
    // --------------------------

    const incomeTd =
      document.createElement("td");

    const incomeInput =
      document.createElement("input");

    incomeInput.type = "number";
    incomeInput.inputMode = "numeric";
    incomeInput.value =
      Number(row.income) || 0;

    incomeInput.disabled = !isEditor();

    incomeInput.addEventListener("change", () => {

      const value =
        Number(incomeInput.value) || 0;

      updateTransaction(
        row.idansactions,
        "income",
        value
      );

    });

    incomeTd.appendChild(incomeInput);


    // --------------------------
    // 支出
    // --------------------------

    const expenseTd =
      document.createElement("td");

    const expenseInput =
      document.createElement("input");

    expenseInput.type = "number";
    expenseInput.inputMode = "numeric";
    expenseInput.value =
      Number(row.expense) || 0;

    expenseInput.disabled = !isEditor();

    expenseInput.addEventListener("change", () => {

      const value =
        Number(expenseInput.value) || 0;

      updateTransaction(
        row.idansactions,
        "expense",
        value
      );

    });

    expenseTd.appendChild(expenseInput);


    // --------------------------
    // メモ
    // --------------------------

    const memoTd =
      document.createElement("td");

    const memoInput =
      document.createElement("input");

    memoInput.type = "text";
    memoInput.value = row.memo || "";
    memoInput.disabled = !isEditor();

    memoInput.addEventListener("change", () => {

      updateTransaction(
        row.idansactions,
        "memo",
        memoInput.value
      );

    });

    memoTd.appendChild(memoInput);


    // --------------------------
    // 削除
    // --------------------------

    const deleteTd =
      document.createElement("td");

    if (isEditor()) {

      const deleteButton =
        document.createElement("button");

      deleteButton.textContent = "削除";
      deleteButton.className =
        "delete-button";

      deleteButton.addEventListener("click", () => {

        deleteTransaction(row.idansactions);

      });

      deleteTd.appendChild(deleteButton);

    }


    tr.appendChild(dateTd);
    tr.appendChild(categoryTd);
    tr.appendChild(detailTd);
    tr.appendChild(incomeTd);
    tr.appendChild(expenseTd);
    tr.appendChild(memoTd);
    tr.appendChild(deleteTd);

    tbody.appendChild(tr);

  });

}


// ==============================
// 分類プルダウン
// ==============================

function createCategoryOptions(select, selectedValue) {

  select.innerHTML = "";

  const emptyOption =
    document.createElement("option");

  emptyOption.value = "";
  emptyOption.textContent = "選択";

  select.appendChild(emptyOption);


  categories.forEach(category => {

    const option =
      document.createElement("option");

    option.value =
      category.namemename;

    option.textContent =
      category.namemename;

    if (
      category.namemename === selectedValue
    ) {

      option.selected = true;

    }

    select.appendChild(option);

  });

}


// ==============================
// 収支更新
// ==============================

async function updateTransaction(
  id,
  key,
  value
) {

  if (!isEditor()) return;

  const { error } =
    await supabaseClient
      .from("transactions")
      .update({
        [key]: value
      })
      .eq("idansactions", id);

  if (error) {

    console.error(error);

    alert("保存に失敗しました。");

    return;
  }


  const row =
    transactions.find(
      item => item.idansactions === id
    );

  if (row) {

    row[key] = value;

  }


  await calculateTotals();

}


// ==============================
// 収支削除
// ==============================

async function deleteTransaction(id) {

  if (!isEditor()) return;

  if (
    !confirm("この収支を削除しますか？")
  ) {

    return;
  }

  const { error } =
    await supabaseClient
      .from("transactions")
      .delete()
      .eq("idansactions", id);

  if (error) {

    console.error(error);

    alert("削除に失敗しました。");

    return;
  }

  transactions =
    transactions.filter(
      row => row.idansactions !== id
    );

  renderTransactions();

  await calculateTotals();

}


// ==============================
// 分類管理
// ==============================

function setupCategoryManagement() {

  const manageButton =
    document.getElementById(
      "manageCategoryButton"
    );

  const addButton =
    document.getElementById(
      "addCategoryButton"
    );

  if (manageButton) {

    manageButton.addEventListener(
      "click",
      () => {

        const area =
          document.getElementById(
            "categoryManagement"
          );

        if (!area) return;

        area.style.display =
          area.style.display === "none"
            ? "block"
            : "none";

      }
    );

  }


  if (addButton) {

    addButton.addEventListener(
      "click",
      addCategory
    );

  }

}


// ==============================
// 分類読み込み
// ==============================

async function loadCategories() {

  const { data, error } =
    await supabaseClient
      .from("categories")
      .select("*")
      .order("created_at", {
        ascending: true
      });

  if (error) {

    console.error(error);

    return;
  }

  categories = data || [];

  renderCategoryList();

}


// ==============================
// 分類一覧表示
// ==============================

function renderCategoryList() {

  const list =
    document.getElementById(
      "categoryList"
    );

  if (!list) return;

  list.innerHTML = "";

  categories.forEach(category => {

    const div =
      document.createElement("div");

    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.gap = "8px";
    div.style.marginBottom = "8px";


    const text =
      document.createElement("span");

    text.textContent =
      category.namemename;

    text.style.flex = "1";


    const deleteButton =
      document.createElement("button");

    deleteButton.textContent = "削除";
    deleteButton.className =
      "delete-button";

    deleteButton.disabled =
      !isEditor();

    deleteButton.addEventListener(
      "click",
      () => deleteCategory(category.idid)
    );


    div.appendChild(text);
    div.appendChild(deleteButton);

    list.appendChild(div);

  });

}


// ==============================
// 分類追加
// ==============================

async function addCategory() {

  if (!isEditor()) {

    alert("編集権限がありません。");

    return;
  }

  const name =
    prompt("追加する分類名を入力してください。");

  if (!name) return;

  const categoryName =
    name.trim();

  if (!categoryName) return;


  // 重複チェック
  const exists =
    categories.some(
      category =>
        category.namemename === categoryName
    );

  if (exists) {

    alert("同じ分類がすでにあります。");

    return;
  }


  const { data, error } =
    await supabaseClient
      .from("categories")
      .insert({
        namemename: categoryName
      })
      .select()
      .single();

  if (error) {

    console.error(error);

    alert("分類の追加に失敗しました。");

    return;
  }

  categories.push(data);

  renderCategoryList();

  renderTransactions();

}


// ==============================
// 分類削除
// ==============================

async function deleteCategory(id) {

  if (!isEditor()) return;

  if (
    !confirm(
      "この分類を削除しますか？\n既存の収支データは削除されません。"
    )
  ) {

    return;
  }


  const { error } =
    await supabaseClient
      .from("categories")
      .delete()
      .eq("idid", id);

  if (error) {

    console.error(error);

    alert("分類の削除に失敗しました。");

    return;
  }


  categories =
    categories.filter(
      category => category.idid !== id
    );

  renderCategoryList();

  renderTransactions();

}


// ==============================
// 今後追加する機能
// ==============================

function showIncomeExpense() {

  document
    .getElementById("incomeExpenseSection")
    ?.scrollIntoView({
      behavior: "smooth"
    });

}


function showMembers() {

  alert("部費管理機能はこれから実装します。");

}


function showSummary() {

  alert("月別集計機能はこれから実装します。");

}


function exportPDF() {

  alert("A4 PDF出力機能はこれから実装します。");

}
