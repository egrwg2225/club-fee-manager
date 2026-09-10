const SUPABASE_URL = "https://ixyqbkraeexygmacooqq.supabase.co";
const SUPABASE_KEY = "sb_publishable_-LRZicRjb1NNTqFOKwH5zQ_uzinwx2J";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


// ==================================================
// ユーザー・権限
// ==================================================

let currentUser = null;
let currentRole = null;


// ==================================================
// 月
// ==================================================

let currentYear = 2026;
let currentMonth = 9;


// ==================================================
// 収支データ
// ==================================================

let transactions = [];


// ==================================================
// 分類
// ==================================================

let categories = [];


// ==================================================
// ログインユーザーの権限を読み込む
// ==================================================

async function loadUserRole() {

  const {
    data: { user }
  } = await supabaseClient.auth.getUser();

  if (!user) {
    return;
  }

  currentUser = user;

  // ログイン画面を隠す
  const loginSection =
    document.getElementById("loginSection");

  if (loginSection) {
    loginSection.style.display = "none";
  }

  // アプリ画面を表示
  const appContent =
    document.getElementById("appContent");

  if (appContent) {
    appContent.style.display = "block";
  }


  // 権限を取得
  const { data, error } =
    await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();


  if (error) {

    console.error(
      "ユーザー権限の取得に失敗しました:",
      error
    );

    alert(
      "ユーザー権限の取得に失敗しました。\n" +
      error.message
    );

    return;
  }


  currentRole = data.role;


  // 権限表示
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


  // 編集者・閲覧者の画面を調整
  updateEditorUI();


  // 分類読み込み
  await loadCategories();


  // 現在の月の収支読み込み
  await loadMonth();

}


// ==================================================
// ログイン
// ==================================================

document
  .getElementById("loginButton")
  .addEventListener("click", async function () {

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


    message.textContent =
      "ログイン中...";


    const { data, error } =
      await supabaseClient.auth.signInWithPassword({

        email: email,

        password: password

      });


    if (error) {

      console.error(error);

      message.textContent =
        "ログインに失敗しました: " +
        error.message;

      return;
    }


    message.textContent =
      "ログインしました。";


    currentUser = data.user;


    await loadUserRole();

  });


// ==================================================
// 月表示
// ==================================================

function updateMonthTitle() {

  document.getElementById("monthTitle").textContent =
    `${currentYear}年${currentMonth}月`;

}


// ==================================================
// 前月
// ==================================================

document
  .getElementById("prevMonth")
  .addEventListener("click", async function () {

    currentMonth--;

    if (currentMonth === 0) {

      currentMonth = 12;

      currentYear--;

    }


    updateMonthTitle();

    await loadMonth();

  });


// ==================================================
// 次月
// ==================================================

document
  .getElementById("nextMonth")
  .addEventListener("click", async function () {

    currentMonth++;

    if (currentMonth === 13) {

      currentMonth = 1;

      currentYear++;

    }


    updateMonthTitle();

    await loadMonth();

  });


// ==================================================
// 収支追加ボタン
// ==================================================

document
  .getElementById("addRowButton")
  .addEventListener("click", async function () {

    if (currentRole !== "editor") {

      alert("編集者のみ収支を追加できます。");

      return;
    }


    await addTransaction();

  });


// ==================================================
// 編集者・閲覧者の画面調整
// ==================================================

function updateEditorUI() {

  const addButton =
    document.getElementById("addRowButton");


  if (!addButton) {
    return;
  }


  if (currentRole === "editor") {

    addButton.style.display =
      "inline-block";

  } else {

    addButton.style.display =
      "none";

  }

}


// ==================================================
// 収支を1件追加
// ==================================================

async function addTransaction() {

  if (currentRole !== "editor") {
    return;
  }


  const yearMonth =
    `${currentYear}-${String(currentMonth).padStart(2, "0")}`;


  const transaction = {

    year_month: yearMonth,

    date:
      `${yearMonth}-01`,

    category: "",

    detail: "",

    income: 0,

    expense: 0,

    memo: ""

  };


  const { data, error } =
    await supabaseClient
      .from("transactions")
      .insert(transaction)
      .select()
      .single();


  if (error) {

    console.error(
      "収支追加エラー:",
      error
    );

    alert(
      "収支の追加に失敗しました。\n" +
      error.message
    );

    return;
  }


  transactions.push({

    id: data.idansactions,

    date: data.date,

    category: data.category || "",

    detail: data.detail || "",

    income: data.income || 0,

    expense: data.expense || 0,

    memo: data.memo || "",

    year_month: data.year_month

  });


  renderTransactions();

  calculateTotals();

}


// ==================================================
// 現在の月の収支をSupabaseから読み込む
// ==================================================

async function loadMonth() {

  if (!currentUser) {
    return;
  }


  const yearMonth =
    `${currentYear}-${String(currentMonth).padStart(2, "0")}`;


  const { data, error } =
    await supabaseClient
      .from("transactions")
      .select("*")
      .eq("year_month", yearMonth)
      .order("date", { ascending: true })
      .order("created_at", { ascending: true });


  if (error) {

    console.error(
      "収支データの読み込みに失敗しました:",
      error
    );

    alert(
      "収支データの読み込みに失敗しました。\n" +
      error.message
    );

    return;
  }


  transactions =
    data.map(function (item) {

      return {

        id: item.idansactions,

        date: item.date,

        category: item.category || "",

        detail: item.detail || "",

        income: item.income || 0,

        expense: item.expense || 0,

        memo: item.memo || "",

        year_month: item.year_month

      };

    });


  renderTransactions();

  calculateTotals();

}


// ==================================================
// 収支一覧を表示
// ==================================================

function renderTransactions() {

  const tbody =
    document.getElementById("transactionTable");


  if (!tbody) {
    return;
  }


  tbody.innerHTML = "";


  const isViewer =
    currentRole !== "editor";


  transactions.forEach(function (transaction) {

    const tr =
      document.createElement("tr");


    // ----------------------------------------------
    // 日付
    // ----------------------------------------------

    const dateTd =
      document.createElement("td");


    const dateInput =
      document.createElement("input");

    dateInput.type = "date";

    dateInput.value =
      transaction.date || "";

    dateInput.disabled =
      isViewer;

    dateInput.addEventListener(
      "change",
      function () {

        updateTransaction(
          transaction.id,
          "date",
          this.value
        );

      }
    );


    dateTd.appendChild(dateInput);


    // ----------------------------------------------
    // 分類
    // ----------------------------------------------

    const categoryTd =
      document.createElement("td");


    const categorySelect =
      document.createElement("select");


    categorySelect.disabled =
      isViewer;


    const emptyOption =
      document.createElement("option");

    emptyOption.value = "";

    emptyOption.textContent =
      "選択してください";


    categorySelect.appendChild(
      emptyOption
    );


    categories.forEach(function (category) {

      const option =
        document.createElement("option");

      option.value = category;

      option.textContent = category;

      if (
        transaction.category === category
      ) {

        option.selected = true;

      }


      categorySelect.appendChild(option);

    });


    categorySelect.addEventListener(
      "change",
      function () {

        updateTransaction(
          transaction.id,
          "category",
          this.value
        );

      }
    );


    categoryTd.appendChild(
      categorySelect
    );


    // ----------------------------------------------
    // 内訳
    // ----------------------------------------------

    const detailTd =
      document.createElement("td");


    const detailInput =
      document.createElement("input");

    detailInput.type = "text";

    detailInput.placeholder =
      "内訳";

    detailInput.value =
      transaction.detail || "";

    detailInput.disabled =
      isViewer;


    detailInput.addEventListener(
      "change",
      function () {

        updateTransaction(
          transaction.id,
          "detail",
          this.value
        );

      }
    );


    detailTd.appendChild(
      detailInput
    );


    // ----------------------------------------------
    // 収入
    // ----------------------------------------------

    const incomeTd =
      document.createElement("td");


    const incomeInput =
      document.createElement("input");

    incomeInput.type = "number";

    incomeInput.placeholder = "0";

    incomeInput.value =
      transaction.income || "";

    incomeInput.disabled =
      isViewer;


    incomeInput.addEventListener(
      "change",
      function () {

        updateTransaction(
          transaction.id,
          "income",
          this.value
        );

      }
    );


    incomeTd.appendChild(
      incomeInput
    );


    // ----------------------------------------------
    // 支出
    // ----------------------------------------------

    const expenseTd =
      document.createElement("td");


    const expenseInput =
      document.createElement("input");

    expenseInput.type = "number";

    expenseInput.placeholder = "0";

    expenseInput.value =
      transaction.expense || "";

    expenseInput.disabled =
      isViewer;


    expenseInput.addEventListener(
      "change",
      function () {

        updateTransaction(
          transaction.id,
          "expense",
          this.value
        );

      }
    );


    expenseTd.appendChild(
      expenseInput
    );


    // ----------------------------------------------
    // メモ
    // ----------------------------------------------

    const memoTd =
      document.createElement("td");


    const memoInput =
      document.createElement("input");

    memoInput.type = "text";

    memoInput.placeholder =
      "メモ";

    memoInput.value =
      transaction.memo || "";

    memoInput.disabled =
      isViewer;


    memoInput.addEventListener(
      "change",
      function () {

        updateTransaction(
          transaction.id,
          "memo",
          this.value
        );

      }
    );


    memoTd.appendChild(
      memoInput
    );


    // ----------------------------------------------
    // 削除
    // ----------------------------------------------

    const deleteTd =
      document.createElement("td");


    if (!isViewer) {

      const deleteButton =
        document.createElement("button");

      deleteButton.className =
        "delete-button";

      deleteButton.textContent =
        "削除";


      deleteButton.addEventListener(
        "click",
        function () {

          deleteTransaction(
            transaction.id
          );

        }
      );


      deleteTd.appendChild(
        deleteButton
      );

    }


    // ----------------------------------------------
    // 行に追加
    // ----------------------------------------------

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


// ==================================================
// 収支データ更新
// ==================================================

async function updateTransaction(
  id,
  key,
  value
) {

  if (currentRole !== "editor") {
    return;
  }


  const transaction =
    transactions.find(
      item => item.id === id
    );


  if (!transaction) {
    return;
  }


  let updateValue = value;


  // 金額は数値にする
  if (
    key === "income" ||
    key === "expense"
  ) {

    updateValue =
      Number(value) || 0;

  }


  const { error } =
    await supabaseClient
      .from("transactions")
      .update({

        [key]: updateValue

      })
      .eq("idansactions", id);


  if (error) {

    console.error(
      "収支更新エラー:",
      error
    );

    alert(
      "収支の更新に失敗しました。\n" +
      error.message
    );

    return;
  }


  transaction[key] =
    updateValue;


  calculateTotals();

}


// ==================================================
// 収支データ削除
// ==================================================

async function deleteTransaction(id) {

  if (currentRole !== "editor") {
    return;
  }


  const result =
    confirm(
      "この収支を削除しますか？"
    );


  if (!result) {
    return;
  }


  const { error } =
    await supabaseClient
      .from("transactions")
      .delete()
      .eq("idansactions", id);


  if (error) {

    console.error(
      "収支削除エラー:",
      error
    );

    alert(
      "収支の削除に失敗しました。\n" +
      error.message
    );

    return;
  }


  transactions =
    transactions.filter(
      item => item.id !== id
    );


  renderTransactions();

  calculateTotals();

}


// ==================================================
// 合計計算
// ==================================================

function calculateTotals() {

  let income = 0;

  let expense = 0;


  transactions.forEach(
    function (transaction) {

      income +=
        Number(transaction.income) || 0;

      expense +=
        Number(transaction.expense) || 0;

    }
  );


  // 現段階では前月繰越は0
  // 後でSupabaseから前月残高を取得する
  const carryOver = 0;


  const balance =
    carryOver +
    income -
    expense;


  document.getElementById(
    "incomeTotal"
  ).textContent =
    income.toLocaleString() +
    "円";


  document.getElementById(
    "expenseTotal"
  ).textContent =
    expense.toLocaleString() +
    "円";


  document.getElementById(
    "carryOver"
  ).textContent =
    carryOver.toLocaleString() +
    "円";


  document.getElementById(
    "currentBalance"
  ).textContent =
    balance.toLocaleString() +
    "円";

}


// ==================================================
// メニュー
// ==================================================

function showIncomeExpense() {

  document
    .getElementById("incomeExpenseSection")
    .scrollIntoView({

      behavior: "smooth"

    });

}


function showMembers() {

  alert(
    "部費管理機能はこれから作成します。"
  );

}


function showSummary() {

  alert(
    "月別集計機能はこれから作成します。"
  );

}


function exportPDF() {

  alert(
    "PDF出力機能はこれから作成します。"
  );

}


// ==================================================
// 分類管理
// ==================================================

document
  .getElementById("manageCategoryButton")
  .addEventListener(
    "click",
    function () {

      const area =
        document.getElementById(
          "categoryManagement"
        );


      if (
        area.style.display === "none"
      ) {

        area.style.display =
          "block";

        renderCategoryList();

      } else {

        area.style.display =
          "none";

      }

    }
  );


// ==================================================
// Supabaseから分類を読み込む
// ==================================================

async function loadCategories() {

  const { data, error } =
    await supabaseClient
      .from("categories")
      .select("namemename")
      .order(
        "created_at",
        {
          ascending: true
        }
      );


  if (error) {

    console.error(
      "分類の読み込みに失敗しました:",
      error
    );

    alert(
      "分類の読み込みに失敗しました。\n" +
      error.message
    );

    return;
  }


  categories =
    data.map(
      function (item) {

        return item.namemename;

      }
    );


  renderCategoryList();

}


// ==================================================
// 分類追加
// ==================================================

document
  .getElementById("addCategoryButton")
  .addEventListener(
    "click",
    async function () {

      if (currentRole !== "editor") {

        alert(
          "編集者のみ分類を追加できます。"
        );

        return;
      }


      const name =
        prompt(
          "追加する分類名を入力してください。"
        );


      if (!name) {
        return;
      }


      const category =
        name.trim();


      if (!category) {
        return;
      }


      if (
        categories.includes(category)
      ) {

        alert(
          "その分類はすでに登録されています。"
        );

        return;
      }


      const { error } =
        await supabaseClient
          .from("categories")
          .insert({

            namemename: category

          });


      if (error) {

        console.error(
          "分類追加エラー:",
          error
        );

        alert(
          "分類の追加に失敗しました。\n" +
          error.message
        );

        return;
      }


      await loadCategories();


      alert(
        "分類を追加しました。"
      );

    }
  );


// ==================================================
// 分類削除
// ==================================================

async function deleteCategory(category) {

  if (currentRole !== "editor") {
    return;
  }


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
      .eq(
        "namemename",
        category
      );


  if (error) {

    console.error(
      "分類削除エラー:",
      error
    );

    alert(
      "分類の削除に失敗しました。\n" +
      error.message
    );

    return;
  }


  await loadCategories();


  alert(
    "分類を削除しました。"
  );

}


// ==================================================
// 分類一覧表示
// ==================================================

function renderCategoryList() {

  const list =
    document.getElementById(
      "categoryList"
    );


  if (!list) {
    return;
  }


  list.innerHTML = "";


  categories.forEach(
    function (category) {

      const div =
        document.createElement(
          "div"
        );


      div.style.marginBottom =
        "8px";


      const span =
        document.createElement(
          "span"
        );


      span.textContent =
        category;


      const deleteButton =
        document.createElement(
          "button"
        );


      deleteButton.textContent =
        "削除";


      deleteButton.style.marginLeft =
        "10px";


      deleteButton.addEventListener(
        "click",
        function () {

          deleteCategory(
            category
          );

        }
      );


      div.appendChild(span);

      if (currentRole === "editor") {

        div.appendChild(
          deleteButton
        );

      }


      list.appendChild(div);

    }
  );

}


// ==================================================
// 初期処理
// ==================================================

updateMonthTitle();

loadUserRole();
