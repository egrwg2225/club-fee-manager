// ==============================
// Supabase設定
// ==============================

const SUPABASE_URL =
  "https://ixyqbkraeexygmacooqq.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_-LRZicRjb1NNTqFOKwH5zQ_uzinwx2J";

const supabaseClient =
  window.supabase.createClient(
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

let members = [];
let memberFees = [];


// 月読み込みの競合防止
let monthLoadNumber = 0;


// ==============================
// 初期処理
// ==============================

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    updateMonthTitle();

    // --------------------------------
    // 匿名ログイン
    // --------------------------------

    let {
      data: { session }
    } =
      await supabaseClient.auth.getSession();


    // 既存のメールログイン状態が残っている場合
    // 新しい匿名ログインへ切り替える
    if (
      session &&
      !session.user.is_anonymous
    ) {

      await supabaseClient.auth.signOut();

      session = null;

    }


    // セッションがなければ匿名ログイン
    if (!session) {

      const {
        data,
        error
      } =
        await supabaseClient.auth
          .signInAnonymously();


      if (error) {

        console.error(error);

        alert(
          "アプリへの接続に失敗しました。"
        );

        return;

      }


      session =
        data.session;

    }


    // 現在のユーザー
    currentUser =
      session.user;


    // 現在の権限を取得
    await loadUserRole();


    // 通常の画面機能
    setupLoginButton();
    setupMonthButtons();
    setupAddRowButton();
    setupCategoryManagement();
    setupMemberManagement();

    setupAutoMemberFeeIncome();

  }
);


// ==============================
// ログイン
// ==============================

function setupLoginButton() {

  const button =
    document.getElementById("loginButton");

  if (!button) return;

  button.addEventListener(
    "click",
    login
  );

}


async function login() {

  const email =
    document
      .getElementById("loginEmail")
      .value
      .trim();

  const password =
    document
      .getElementById("loginPassword")
      .value;

  const message =
    document.getElementById(
      "loginMessage"
    );


  if (!email || !password) {

    message.textContent =
      "メールアドレスとパスワードを入力してください。";

    return;

  }


  message.textContent =
    "ログイン中…";


  const { data, error } =
    await supabaseClient.auth
      .signInWithPassword({
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
      .eq(
        "user_id",
        currentUser.id
      )
      .maybeSingle();


  if (error) {

    console.error(error);

    return;

  }


  currentRole =
    data?.role || "viewer";


  const loginSection =
    document.getElementById(
      "loginSection"
    );

  const appContent =
    document.getElementById(
      "appContent"
    );

  const userRole =
    document.getElementById(
      "userRole"
    );


  if (loginSection) {

    loginSection.style.display =
      "none";

  }


  if (appContent) {

    appContent.style.display =
      "block";

  }


  if (userRole) {

    userRole.textContent =
      currentRole === "editor"
        ? "編集者"
        : "閲覧者";

  }


  await loadCategories();
  await loadMonth();
  await loadMembers();

}


// ==============================
// 編集権限
// ==============================

function isEditor() {

  return currentRole === "editor";

}


// ==============================
// 部費自動収入設定
// ==============================

function setupAutoMemberFeeIncome() {

  const checkbox =
    document.getElementById(
      "autoMemberFeeIncome"
    );

  if (!checkbox) return;


  const saved =
    localStorage.getItem(
      "autoMemberFeeIncome"
    );


  checkbox.checked =
    saved === "true";


  checkbox.addEventListener(
    "change",
    async () => {

      localStorage.setItem(
        "autoMemberFeeIncome",
        checkbox.checked
      );


      await calculateTotals();

    }
  );

}


function isAutoMemberFeeIncome() {

  const checkbox =
    document.getElementById(
      "autoMemberFeeIncome"
    );

  if (checkbox) {

    return checkbox.checked;

  }


  return false;

}


// ==============================
// 月変更
// ==============================

function setupMonthButtons() {

  const prev =
    document.getElementById(
      "prevMonth"
    );

  const next =
    document.getElementById(
      "nextMonth"
    );


  if (prev) {

    prev.addEventListener(
      "click",
      async () => {

        changeMonth(-1);

      }
    );

  }


  if (next) {

    next.addEventListener(
      "click",
      async () => {

        changeMonth(1);

      }
    );

  }

}


// 月変更を1か所で管理
async function changeMonth(
  direction
) {

  currentMonth += direction;


  if (currentMonth < 1) {

    currentMonth = 12;
    currentYear--;

  }


  if (currentMonth > 12) {

    currentMonth = 1;
    currentYear++;

  }


  updateMonthTitle();


  const loadNumber =
    ++monthLoadNumber;


  await loadMonth();


  // 古い月読み込み結果なら中断
  if (
    loadNumber !==
    monthLoadNumber
  ) {

    return;

  }


  await loadMembers();

}


function updateMonthTitle() {

  const title =
    document.getElementById(
      "monthTitle"
    );

  if (!title) return;


  title.textContent =
    `${currentYear}年${currentMonth}月`;

}


function getYearMonth(
  year = currentYear,
  month = currentMonth
) {

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
      .eq(
        "year_month",
        yearMonth
      )
      .order(
        "date",
        {
          ascending: true
        }
      )
      .order(
        "created_at",
        {
          ascending: true
        }
      );


  if (error) {

    console.error(error);

    return;

  }


  transactions =
    data || [];


  renderTransactions();


  await calculateTotals();

}


// ==============================
// 部費収入取得
// ==============================

async function getPaidMemberFeesTotal(
  yearMonth
) {

  const { data, error } =
    await supabaseClient
      .from("member_fees")
      .select("amount")
      .eq(
        "year_month",
        yearMonth
      )
      .eq(
        "paid",
        true
      );


  if (error) {

    console.error(error);

    return 0;

  }


  let total = 0;


  (data || []).forEach(
    row => {

      total +=
        Number(row.amount) || 0;

    }
  );


  return total;

}


// ==============================
// 前月繰越
// ==============================

// ★重要
// currentYear / currentMonthを変更せずに
// 指定された年月をそのまま計算する
// ==============================
// 前月繰越
// ==============================

async function calculateMonthBalance(
  year,
  month
) {

  // 2026年1月より前は0円
  if (
    year < 2026 ||
    (
      year === 2026 &&
      month < 1
    )
  ) {

    return 0;

  }


  // 前月
  let previousYear =
    year;

  let previousMonth =
    month - 1;


  if (previousMonth === 0) {

    previousMonth = 12;
    previousYear--;

  }


  const currentYearMonth =
    getYearMonth(
      year,
      month
    );


  const previousYearMonth =
    getYearMonth(
      previousYear,
      previousMonth
    );


  // 現在月の収支を取得
  const { data, error } =
    await supabaseClient
      .from("transactions")
      .select(
        "income, expense"
      )
      .eq(
        "year_month",
        currentYearMonth
      );


  if (error) {

    console.error(error);

    return 0;

  }


  let income = 0;
  let expense = 0;


  (data || []).forEach(
    row => {

      income +=
        Number(row.income) || 0;

      expense +=
        Number(row.expense) || 0;

    }
  );


  // 部費の自動収入
  let memberFeeIncome = 0;


  if (
    isAutoMemberFeeIncome()
  ) {

    memberFeeIncome =
      await getPaidMemberFeesTotal(
        currentYearMonth
      );

  }


  // 前月の残高
  const carryOver =
    await calculateMonthBalance(
      previousYear,
      previousMonth
    );


  return (
    carryOver +
    income +
    memberFeeIncome -
    expense
  );

}


async function getPreviousMonthBalance() {

  let year =
    currentYear;

  let month =
    currentMonth - 1;


  if (month === 0) {

    month = 12;
    year--;

  }


  return await calculateMonthBalance(
    year,
    month
  );

}





// ==============================
// 合計計算
// ==============================

async function calculateTotals() {

  let incomeTotal = 0;
  let expenseTotal = 0;


  transactions.forEach(
    row => {

      incomeTotal +=
        Number(row.income) || 0;

      expenseTotal +=
        Number(row.expense) || 0;

    }
  );


  let memberFeeIncome = 0;


  if (
    isAutoMemberFeeIncome()
  ) {

    memberFeeIncome =
      await getPaidMemberFeesTotal(
        getYearMonth()
      );

  }


  incomeTotal +=
    memberFeeIncome;


  const carryOver =
    await getPreviousMonthBalance();


  const currentBalance =
    carryOver +
    incomeTotal -
    expenseTotal;


  const carryElement =
    document.getElementById(
      "carryOver"
    );

  const incomeElement =
    document.getElementById(
      "incomeTotal"
    );

  const expenseElement =
    document.getElementById(
      "expenseTotal"
    );

  const balanceElement =
    document.getElementById(
      "currentBalance"
    );


  if (carryElement) {

    carryElement.textContent =
      formatYen(
        carryOver
      );

  }


  if (incomeElement) {

    incomeElement.textContent =
      formatYen(
        incomeTotal
      );

  }


  if (expenseElement) {

    expenseElement.textContent =
      formatYen(
        expenseTotal
      );

  }


  if (balanceElement) {

    balanceElement.textContent =
      formatYen(
        currentBalance
      );

  }

}


function formatYen(value) {

  return `${Math.round(value).toLocaleString()}円`;

}


// ==============================
// 収支入力
// ==============================

function setupAddRowButton() {

  const button =
    document.getElementById(
      "addRowButton"
    );

  if (!button) return;


  button.addEventListener(
    "click",
    addTransaction
  );

}


async function addTransaction() {

  if (!isEditor()) {

    alert(
      "編集権限がありません。"
    );

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

    alert(
      "収支の追加に失敗しました。"
    );

    return;

  }


  transactions.push(data);

  renderTransactions();

  await calculateTotals();

}


// ==============================
// 収支表示
// ==============================

function renderTransactions() {

  const tbody =
    document.getElementById(
      "transactionTable"
    );

  if (!tbody) return;


  tbody.innerHTML = "";


  transactions.forEach(
    row => {

      const tr =
        document.createElement("tr");


      // 日付
      const dateTd =
        document.createElement("td");

      const dateInput =
        document.createElement(
          "input"
        );

      dateInput.type =
        "date";

      dateInput.value =
        row.date || "";

      dateInput.disabled =
        !isEditor();


      dateInput.addEventListener(
        "change",
        () => {

          updateTransaction(
            row.idansactions,
            "date",
            dateInput.value
          );

        }
      );


      dateTd.appendChild(
        dateInput
      );


      // 分類
      const categoryTd =
        document.createElement("td");

      const categorySelect =
        document.createElement(
          "select"
        );


      createCategoryOptions(
        categorySelect,
        row.category
      );


      categorySelect.disabled =
        !isEditor();


      categorySelect.addEventListener(
        "change",
        () => {

          updateTransaction(
            row.idansactions,
            "category",
            categorySelect.value
          );

        }
      );


      categoryTd.appendChild(
        categorySelect
      );


      // 内訳
      const detailTd =
        document.createElement("td");

      const detailInput =
        document.createElement(
          "input"
        );

      detailInput.type =
        "text";

      detailInput.value =
        row.detail || "";

      detailInput.disabled =
        !isEditor();


      detailInput.addEventListener(
        "change",
        () => {

          updateTransaction(
            row.idansactions,
            "detail",
            detailInput.value
          );

        }
      );


      detailTd.appendChild(
        detailInput
      );


      // 収入
      const incomeTd =
        document.createElement("td");

      const incomeInput =
        document.createElement(
          "input"
        );

      incomeInput.type =
        "number";

      incomeInput.inputMode =
        "numeric";

      incomeInput.value =
        Number(row.income) || 0;

      incomeInput.disabled =
        !isEditor();


      incomeInput.addEventListener(
        "change",
        () => {

          updateTransaction(
            row.idansactions,
            "income",
            Number(incomeInput.value) || 0
          );

        }
      );


      incomeTd.appendChild(
        incomeInput
      );


      // 支出
      const expenseTd =
        document.createElement("td");

      const expenseInput =
        document.createElement(
          "input"
        );

      expenseInput.type =
        "number";

      expenseInput.inputMode =
        "numeric";

      expenseInput.value =
        Number(row.expense) || 0;

      expenseInput.disabled =
        !isEditor();


      expenseInput.addEventListener(
        "change",
        () => {

          updateTransaction(
            row.idansactions,
            "expense",
            Number(expenseInput.value) || 0
          );

        }
      );


      expenseTd.appendChild(
        expenseInput
      );


      // メモ
      const memoTd =
        document.createElement("td");

      const memoInput =
        document.createElement(
          "input"
        );

      memoInput.type =
        "text";

      memoInput.value =
        row.memo || "";

      memoInput.disabled =
        !isEditor();


      memoInput.addEventListener(
        "change",
        () => {

          updateTransaction(
            row.idansactions,
            "memo",
            memoInput.value
          );

        }
      );


      memoTd.appendChild(
        memoInput
      );


      // 削除
      const deleteTd =
        document.createElement("td");


      if (isEditor()) {

        const deleteButton =
          document.createElement(
            "button"
          );

        deleteButton.textContent =
          "削除";

        deleteButton.className =
          "delete-button";


        deleteButton.addEventListener(
          "click",
          () =>
            deleteTransaction(
              row.idansactions
            )
        );


        deleteTd.appendChild(
          deleteButton
        );

      }


      tr.appendChild(dateTd);
      tr.appendChild(categoryTd);
      tr.appendChild(detailTd);
      tr.appendChild(incomeTd);
      tr.appendChild(expenseTd);
      tr.appendChild(memoTd);
      tr.appendChild(deleteTd);


      tbody.appendChild(tr);

    }
  );

}


// ==============================
// 分類
// ==============================

function createCategoryOptions(
  select,
  selectedValue
) {

  select.innerHTML = "";


  const emptyOption =
    document.createElement(
      "option"
    );

  emptyOption.value = "";

  emptyOption.textContent =
    "選択";

  select.appendChild(
    emptyOption
  );


  categories.forEach(
    category => {

      const option =
        document.createElement(
          "option"
        );

      option.value =
        category.namemename;

      option.textContent =
        category.namemename;


      if (
        category.namemename ===
        selectedValue
      ) {

        option.selected =
          true;

      }


      select.appendChild(
        option
      );

    }
  );

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
      .eq(
        "idansactions",
        id
      );


  if (error) {

    console.error(error);

    alert(
      "保存に失敗しました。"
    );

    return;

  }


  const row =
    transactions.find(
      item =>
        item.idansactions === id
    );


  if (row) {

    row[key] = value;

  }


  await calculateTotals();

}


// ==============================
// 収支削除
// ==============================

async function deleteTransaction(
  id
) {

  if (!isEditor()) return;


  if (
    !confirm(
      "この収支を削除しますか？"
    )
  ) {

    return;

  }


  const { error } =
    await supabaseClient
      .from("transactions")
      .delete()
      .eq(
        "idansactions",
        id
      );


  if (error) {

    console.error(error);

    alert(
      "削除に失敗しました。"
    );

    return;

  }


  transactions =
    transactions.filter(
      row =>
        row.idansactions !== id
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
          area.style.display ===
          "none"
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


async function loadCategories() {

  const { data, error } =
    await supabaseClient
      .from("categories")
      .select("*")
      .order(
        "created_at",
        {
          ascending: true
        }
      );


  if (error) {

    console.error(error);

    return;

  }


  categories =
    data || [];


  renderCategoryList();

}


function renderCategoryList() {

  const list =
    document.getElementById(
      "categoryList"
    );

  if (!list) return;


  list.innerHTML = "";


  categories.forEach(
    category => {

      const div =
        document.createElement(
          "div"
        );


      div.style.display =
        "flex";

      div.style.alignItems =
        "center";

      div.style.gap =
        "8px";

      div.style.marginBottom =
        "8px";


      const text =
        document.createElement(
          "span"
        );

      text.textContent =
        category.namemename;

      text.style.flex =
        "1";


      const deleteButton =
        document.createElement(
          "button"
        );

      deleteButton.textContent =
        "削除";

      deleteButton.className =
        "delete-button";

      deleteButton.disabled =
        !isEditor();


      deleteButton.addEventListener(
        "click",
        () =>
          deleteCategory(
            category.idid
          )
      );


      div.appendChild(text);
      div.appendChild(deleteButton);

      list.appendChild(div);

    }
  );

}


async function addCategory() {

  if (!isEditor()) {

    alert(
      "編集権限がありません。"
    );

    return;

  }


  const name =
    prompt(
      "追加する分類名を入力してください。"
    );


  if (!name) return;


  const categoryName =
    name.trim();


  if (!categoryName) return;


  const exists =
    categories.some(
      category =>
        category.namemename ===
        categoryName
    );


  if (exists) {

    alert(
      "同じ分類がすでにあります。"
    );

    return;

  }


  const { data, error } =
    await supabaseClient
      .from("categories")
      .insert({
        namemename:
          categoryName
      })
      .select()
      .single();


  if (error) {

    console.error(error);

    alert(
      "分類の追加に失敗しました。"
    );

    return;

  }


  categories.push(data);

  renderCategoryList();

  renderTransactions();

}


async function deleteCategory(
  id
) {

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
      .eq(
        "idid",
        id
      );


  if (error) {

    console.error(error);

    alert(
      "分類の削除に失敗しました。"
    );

    return;

  }


  categories =
    categories.filter(
      category =>
        category.idid !== id
    );


  renderCategoryList();

  renderTransactions();

}


// ==================================================
// 部費管理
// ==================================================

function setupMemberManagement() {

  const addButton =
    document.getElementById(
      "addMemberButton"
    );


  if (addButton) {

    addButton.addEventListener(
      "click",
      addMember
    );

  }

}


// 部員読み込み
async function loadMembers() {

  if (!currentUser) return;


  const { data, error } =
    await supabaseClient
      .from("members")
      .select("*")
      .eq(
        "active",
        true
      )
      .order(
        "created_at",
        {
          ascending: true
        }
      );


  if (error) {

    console.error(error);

    return;

  }


  members =
    data || [];


  await prepareMemberFees();

  renderMembers();

}


// 月ごとの部費データ
async function prepareMemberFees() {

  const yearMonth =
    getYearMonth();


  const { data, error } =
    await supabaseClient
      .from("member_fees")
      .select("*")
      .eq(
        "year_month",
        yearMonth
      );


  if (error) {

    console.error(error);

    return;

  }


  memberFees =
    data || [];


  // 当月のデータが存在しない部員だけ作成
  if (isEditor()) {

    for (
      const member of members
    ) {

      const exists =
        memberFees.some(
          fee =>
            fee.member_id ===
            member.id
        );


      if (exists) continue;


      const { data: newFee,
              error: insertError } =
        await supabaseClient
          .from("member_fees")
          .insert({
            member_id:
              member.id,

            year_month:
              yearMonth,

            amount:
              Number(
                member.monthly_fee
              ) || 0,

            paid: false
          })
          .select()
          .single();


      if (insertError) {

        console.error(
          insertError
        );

        continue;

      }


      memberFees.push(
        newFee
      );

    }

  }

}


// 部員一覧表示
function renderMembers() {

  const tbody =
    document.getElementById(
      "membersTable"
    );

  if (!tbody) return;


  tbody.innerHTML = "";


  members.forEach(
    member => {

      const tr =
        document.createElement(
          "tr"
        );


      // ==========================
      // 部員名
      // ==========================

      const nameTd =
        document.createElement(
          "td"
        );

      const nameInput =
        document.createElement(
          "input"
        );

      nameInput.type =
        "text";

      nameInput.value =
        member.name || "";

      nameInput.disabled =
        !isEditor();


      nameInput.addEventListener(
        "change",
        () =>
          updateMember(
            member.id,
            "name",
            nameInput.value
          )
      );


      nameTd.appendChild(
        nameInput
      );


      // ==========================
      // 月ごとの部費
      // ==========================

      const feeTd =
        document.createElement(
          "td"
        );

      const feeInput =
        document.createElement(
          "input"
        );

      feeInput.type =
        "number";

      feeInput.inputMode =
        "numeric";


      // ★ここが重要
      // member.monthly_feeではなく
      // 現在月のmember_fees.amountを表示
      const currentFee =
        memberFees.find(
          fee =>
            fee.member_id ===
            member.id
        );


      feeInput.value =
        Number(
          currentFee?.amount ??
          member.monthly_fee
        ) || 0;


      feeInput.disabled =
        !isEditor();


      feeInput.addEventListener(
        "change",
        () =>
          updateMemberFee(
            member.id,
            Number(
              feeInput.value
            ) || 0
          )
      );


      feeTd.appendChild(
        feeInput
      );


      // ==========================
      // 支払い
      // ==========================

      const paymentTd =
        document.createElement(
          "td"
        );


      const fee =
        memberFees.find(
          item =>
            item.member_id ===
            member.id
        );


      const paymentButton =
        document.createElement(
          "button"
        );


      if (fee?.paid) {

        paymentButton.textContent =
          "支払済";

        paymentButton.style.background =
          "#4caf50";

        paymentButton.style.color =
          "white";

      } else {

        paymentButton.textContent =
          "未払い";

      }


      paymentButton.disabled =
        !isEditor();


      paymentButton.addEventListener(
        "click",
        () =>
          toggleMemberPayment(
            member.id
          )
      );


      paymentTd.appendChild(
        paymentButton
      );


      // ==========================
      // 削除
      // ==========================

      const actionTd =
        document.createElement(
          "td"
        );


      if (isEditor()) {

        const deleteButton =
          document.createElement(
            "button"
          );

        deleteButton.textContent =
          "削除";

        deleteButton.className =
          "delete-button";


        deleteButton.addEventListener(
          "click",
          () =>
            deactivateMember(
              member.id
            )
        );


        actionTd.appendChild(
          deleteButton
        );

      }


      tr.appendChild(nameTd);
      tr.appendChild(feeTd);
      tr.appendChild(paymentTd);
      tr.appendChild(actionTd);


      tbody.appendChild(tr);

    }
  );


  renderMemberSummary();

}


// ==============================
// 部費集計
// ==============================

function renderMemberSummary() {

  const area =
    document.getElementById(
      "memberSummary"
    );

  if (!area) return;


  let expected = 0;
  let paid = 0;
  let unpaid = 0;


  members.forEach(
    member => {

      const fee =
        memberFees.find(
          item =>
            item.member_id ===
            member.id
        );


      const amount =
        Number(
          fee?.amount ??
          member.monthly_fee
        ) || 0;


      expected +=
        amount;


      if (fee?.paid) {

        paid +=
          amount;

      } else {

        unpaid +=
          amount;

      }

    }
  );


  area.innerHTML = `
    <div style="margin-top:15px;padding:15px;background:white;border-radius:10px;">
      <strong>今月の部費</strong><br>
      請求予定：${formatYen(expected)}
     　
      支払済：${formatYen(paid)}
     　
      未払い：${formatYen(unpaid)}
    </div>
  `;

}


// ==============================
// 部員追加
// ==============================

async function addMember() {

  if (!isEditor()) {

    alert(
      "編集権限がありません。"
    );

    return;

  }


  const name =
    prompt(
      "部員名を入力してください。"
    );


  if (!name) return;


  const memberName =
    name.trim();


  if (!memberName) return;


  const feeText =
    prompt(
      "月額部費を入力してください。",
      "2000"
    );


  if (feeText === null) return;


  const monthlyFee =
    Number(feeText);


  if (
    !Number.isFinite(
      monthlyFee
    ) ||
    monthlyFee < 0
  ) {

    alert(
      "正しい金額を入力してください。"
    );

    return;

  }


  const { data, error } =
    await supabaseClient
      .from("members")
      .insert({
        name:
          memberName,

        monthly_fee:
          monthlyFee,

        active:
          true
      })
      .select()
      .single();


  if (error) {

    console.error(error);

    alert(
      "部員の追加に失敗しました。"
    );

    return;

  }


  members.push(data);


  // 今月分
  const { data: feeData,
          error: feeError } =
    await supabaseClient
      .from("member_fees")
      .insert({
        member_id:
          data.id,

        year_month:
          getYearMonth(),

        amount:
          monthlyFee,

        paid:
          false
      })
      .select()
      .single();


  if (feeError) {

    console.error(
      feeError
    );

  } else {

    memberFees.push(
      feeData
    );

  }


  renderMembers();

  await calculateTotals();

}


// ==============================
// 部員名更新
// ==============================

async function updateMember(
  id,
  key,
  value
) {

  if (!isEditor()) return;


  value =
    value.trim();


  if (!value) {

    alert(
      "部員名を入力してください。"
    );

    await loadMembers();

    return;

  }


  const { error } =
    await supabaseClient
      .from("members")
      .update({
        [key]:
          value
      })
      .eq(
        "id",
        id
      );


  if (error) {

    console.error(error);

    alert(
      "部員情報の保存に失敗しました。"
    );

    return;

  }


  const member =
    members.find(
      item =>
        item.id === id
    );


  if (member) {

    member[key] =
      value;

  }

}


// ==============================
// 現在月の部費変更
// ==============================

async function updateMemberFee(
  memberId,
  amount
) {

  if (!isEditor()) return;


  if (
    !Number.isFinite(amount) ||
    amount < 0
  ) {

    alert(
      "正しい金額を入力してください。"
    );

    await loadMembers();

    return;

  }


  const currentFee =
    memberFees.find(
      fee =>
        fee.member_id ===
        memberId
    );


  if (!currentFee) {

    alert(
      "今月の部費データが見つかりません。"
    );

    return;

  }


  // ★現在月の部費だけ変更
  const currentYearMonth =
  getYearMonth();

const { error } =
  await supabaseClient
    .from("member_fees")
    .update({
      amount:
        amount
    })
    .eq(
      "member_id",
      memberId
    )
    .gte(
      "year_month",
      currentYearMonth
    );


  if (error) {

    console.error(error);

    alert(
      "部費の保存に失敗しました。"
    );

    return;

  }


  currentFee.amount =
    amount;


  // 今後新しく作られる月の
  // 初期値としてマスターも変更
  const member =
    members.find(
      item =>
        item.id ===
        memberId
    );


  if (member) {

    const { error:
      memberError } =
      await supabaseClient
        .from("members")
        .update({
          monthly_fee:
            amount
        })
        .eq(
          "id",
          memberId
        );


    if (memberError) {

      console.error(
        memberError
      );

    } else {

      member.monthly_fee =
        amount;

    }

  }


  renderMembers();

  await calculateTotals();

}


// ==============================
// 支払済／未払い
// ==============================

async function toggleMemberPayment(
  memberId
) {

  if (!isEditor()) return;


  const fee =
    memberFees.find(
      item =>
        item.member_id ===
        memberId
    );


  if (!fee) {

    alert(
      "部費データが見つかりません。"
    );

    return;

  }


  const newPaid =
    !fee.paid;


  const { error } =
    await supabaseClient
      .from("member_fees")
      .update({
        paid:
          newPaid,

        paid_at:
          newPaid
            ? new Date().toISOString()
            : null
      })
      .eq(
        "id",
        fee.id
      );


  if (error) {

    console.error(error);

    alert(
      "支払い状態の保存に失敗しました。"
    );

    return;

  }


  fee.paid =
    newPaid;


  fee.paid_at =
    newPaid
      ? new Date().toISOString()
      : null;


  renderMembers();

  await calculateTotals();

}


// ==============================
// 部員を一覧から削除
// ==============================

async function deactivateMember(
  id
) {

  if (!isEditor()) return;


  if (
    !confirm(
      "この部員を一覧から削除しますか？\n過去の部費履歴は残ります。"
    )
  ) {

    return;

  }


  const { error } =
    await supabaseClient
      .from("members")
      .update({
        active:
          false
      })
      .eq(
        "id",
        id
      );


  if (error) {

    console.error(error);

    alert(
      "部員の削除に失敗しました。"
    );

    return;

  }


  members =
    members.filter(
      member =>
        member.id !== id
    );


  memberFees =
    memberFees.filter(
      fee =>
        fee.member_id !== id
    );


  renderMembers();

  await calculateTotals();

}


// ==============================
// メニュー
// ==============================

function showIncomeExpense() {

  const incomeSection =
    document.getElementById(
      "incomeExpenseSection"
    );

  const membersSection =
    document.getElementById(
      "membersSection"
    );

  const summarySection =
    document.getElementById(
      "summarySection"
    );


  if (incomeSection) {

    incomeSection.style.display =
      "block";

  }


  if (membersSection) {

    membersSection.style.display =
      "none";

  }


  if (summarySection) {

    summarySection.style.display =
      "none";

  }


  incomeSection?.scrollIntoView({
    behavior:
      "smooth"
  });

}


async function showMembers() {

  const incomeSection =
    document.getElementById(
      "incomeExpenseSection"
    );

  const membersSection =
    document.getElementById(
      "membersSection"
    );

  const summarySection =
    document.getElementById(
      "summarySection"
    );


  if (incomeSection) {

    incomeSection.style.display =
      "none";

  }


  if (summarySection) {

    summarySection.style.display =
      "none";

  }


  if (membersSection) {

    membersSection.style.display =
      "block";

  }


  await loadMembers();


  membersSection?.scrollIntoView({
    behavior:
      "smooth"
  });

}

// ==================================================
// 月別集計
// ==================================================

async function renderSummary() {

  // --------------------------
  // 基本データ
  // --------------------------

  let incomeTotal = 0;
  let expenseTotal = 0;


  transactions.forEach(
    row => {

      incomeTotal +=
        Number(row.income) || 0;

      expenseTotal +=
        Number(row.expense) || 0;

    }
  );


  // --------------------------
  // 部費
  // --------------------------

  let feeExpected = 0;
  let feePaid = 0;
  let feeUnpaid = 0;


  members.forEach(
    member => {

      const fee =
        memberFees.find(
          item =>
            item.member_id ===
            member.id
        );


      const amount =
        Number(
          fee?.amount ??
          member.monthly_fee
        ) || 0;


      feeExpected +=
        amount;


      if (fee?.paid) {

        feePaid +=
          amount;

      } else {

        feeUnpaid +=
          amount;

      }

    }
  );


  // --------------------------
  // 部費を収入に含めるか
  // --------------------------

  const autoMemberFee =
    isAutoMemberFeeIncome();


  if (autoMemberFee) {

    incomeTotal +=
      feePaid;

  }


  // --------------------------
  // 前月繰越
  // --------------------------

  const carryOver =
    await getPreviousMonthBalance();


  const currentBalance =
    carryOver +
    incomeTotal -
    expenseTotal;


  // --------------------------
  // 基本金額表示
  // --------------------------

  const carryElement =
    document.getElementById(
      "summaryCarryOver"
    );

  const incomeElement =
    document.getElementById(
      "summaryIncome"
    );

  const expenseElement =
    document.getElementById(
      "summaryExpense"
    );

  const balanceElement =
    document.getElementById(
      "summaryBalance"
    );


  if (carryElement) {

    carryElement.textContent =
      formatYen(
        carryOver
      );

  }


  if (incomeElement) {

    incomeElement.textContent =
      formatYen(
        incomeTotal
      );

  }


  if (expenseElement) {

    expenseElement.textContent =
      formatYen(
        expenseTotal
      );

  }


  if (balanceElement) {

    balanceElement.textContent =
      formatYen(
        currentBalance
      );

  }


  // --------------------------
  // 収入の分類別集計
  // --------------------------

  const incomeMap = {};


  transactions.forEach(
    row => {

      const amount =
        Number(row.income) || 0;


      if (amount <= 0) return;


      const category =
        row.category?.trim() ||
        "未分類";


      if (!incomeMap[category]) {

        incomeMap[category] = 0;

      }


      incomeMap[category] +=
        amount;

    }
  );


  // 部費を自動収入にしている場合
  if (
    autoMemberFee &&
    feePaid > 0
  ) {

    incomeMap["部費"] =
      (incomeMap["部費"] || 0) +
      feePaid;

  }


  renderSummaryBreakdown(
    "summaryIncomeBreakdown",
    incomeMap,
    "収入はありません。"
  );


  // --------------------------
  // 支出の分類別集計
  // --------------------------

  const expenseMap = {};


  transactions.forEach(
    row => {

      const amount =
        Number(row.expense) || 0;


      if (amount <= 0) return;


      const category =
        row.category?.trim() ||
        "未分類";


      if (!expenseMap[category]) {

        expenseMap[category] = 0;

      }


      expenseMap[category] +=
        amount;

    }
  );


  renderSummaryBreakdown(
    "summaryExpenseBreakdown",
    expenseMap,
    "支出はありません。"
  );


  // --------------------------
  // 部費状況
  // --------------------------

  const expectedElement =
    document.getElementById(
      "summaryFeeExpected"
    );

  const paidElement =
    document.getElementById(
      "summaryFeePaid"
    );

  const unpaidElement =
    document.getElementById(
      "summaryFeeUnpaid"
    );


  if (expectedElement) {

    expectedElement.textContent =
      formatYen(
        feeExpected
      );

  }


  if (paidElement) {

    paidElement.textContent =
      formatYen(
        feePaid
      );

  }


  if (unpaidElement) {

    unpaidElement.textContent =
      formatYen(
        feeUnpaid
      );

  }

}


// ==============================
// 集計内訳表示
// ==============================

function renderSummaryBreakdown(
  elementId,
  data,
  emptyMessage
) {

  const area =
    document.getElementById(
      elementId
    );


  if (!area) return;


  const entries =
    Object.entries(data);


  if (
    entries.length === 0
  ) {

    area.textContent =
      emptyMessage;

    return;

  }


  // 金額の大きい順
  entries.sort(
    (a, b) =>
      b[1] - a[1]
  );


  area.innerHTML = "";


  entries.forEach(
    ([category, amount]) => {

      const row =
        document.createElement(
          "div"
        );


      row.className =
        "summary-row";


      const name =
        document.createElement(
          "span"
        );

      name.textContent =
        category;


      const value =
        document.createElement(
          "strong"
        );

      value.textContent =
        formatYen(
          amount
        );


      row.appendChild(
        name
      );

      row.appendChild(
        value
      );


      area.appendChild(
        row
      );

    }
  );

}

async function showSummary() {

  const incomeSection =
    document.getElementById(
      "incomeExpenseSection"
    );

  const membersSection =
    document.getElementById(
      "membersSection"
    );

  const summarySection =
    document.getElementById(
      "summarySection"
    );


  if (incomeSection) {

    incomeSection.style.display =
      "none";

  }


  if (membersSection) {

    membersSection.style.display =
      "none";

  }


  if (summarySection) {

    summarySection.style.display =
      "block";

  }


  await renderSummary();


  summarySection?.scrollIntoView({
    behavior:
      "smooth"
  });

}

// ==================================================
// A4 PDF出力
// ==================================================

async function exportPDF() {

  const incomeSection =
    document.getElementById(
      "incomeExpenseSection"
    );

  const membersSection =
    document.getElementById(
      "membersSection"
    );

  const summarySection =
    document.getElementById(
      "summarySection"
    );


  if (incomeSection) {

    incomeSection.style.display =
      "none";

  }


  if (membersSection) {

    membersSection.style.display =
      "none";

  }


  if (summarySection) {

    summarySection.style.display =
      "block";

  }


  // --------------------------
  // PDF用の収支明細を作成
  // --------------------------

  createPDFTransactionTable();


  // --------------------------
  // 集計内容を最新状態にする
  // --------------------------

  await renderSummary();


  // --------------------------
  // 少し待ってから印刷
  // --------------------------

  setTimeout(
    () => {

      window.print();

    },
    300
  );

}


// ==================================================
// PDF用 収支明細
// ==================================================

function createPDFTransactionTable() {

  const summarySection =
    document.getElementById(
      "summarySection"
    );


  if (!summarySection) return;


  // 既に作成済みなら削除
  const oldTable =
    document.getElementById(
      "pdfTransactionSection"
    );


  if (oldTable) {

    oldTable.remove();

  }


  const section =
    document.createElement(
      "div"
    );


  section.id =
    "pdfTransactionSection";


  const title =
    document.createElement(
      "h3"
    );


  title.textContent =
    "収支明細";


  section.appendChild(
    title
  );


  // 明細がない場合
  if (
    !transactions ||
    transactions.length === 0
  ) {

    const empty =
      document.createElement(
        "div"
      );

    empty.textContent =
      "収支明細はありません。";

    empty.className =
      "pdf-empty";

    section.appendChild(
      empty
    );

  } else {

    const table =
      document.createElement(
        "table"
      );


    table.className =
      "pdf-transaction-table";


    // --------------------------
    // 見出し
    // --------------------------

    const thead =
      document.createElement(
        "thead"
      );


    const headerRow =
      document.createElement(
        "tr"
      );


    [
      "日付",
      "分類",
      "内訳",
      "収入",
      "支出",
      "メモ"
    ].forEach(
      text => {

        const th =
          document.createElement(
            "th"
          );

        th.textContent =
          text;

        headerRow.appendChild(
          th
        );

      }
    );


    thead.appendChild(
      headerRow
    );


    table.appendChild(
      thead
    );


    // --------------------------
    // 明細
    // --------------------------

    const tbody =
      document.createElement(
        "tbody"
      );


    transactions.forEach(
      row => {

        const tr =
          document.createElement(
            "tr"
          );


        // 日付
        const dateTd =
          document.createElement(
            "td"
          );

        dateTd.textContent =
          formatPDFDate(
            row.date
          );


        // 分類
        const categoryTd =
          document.createElement(
            "td"
          );

        categoryTd.textContent =
          row.category?.trim() ||
          "未分類";


        // 内訳
        const detailTd =
          document.createElement(
            "td"
          );

        detailTd.textContent =
          row.detail?.trim() ||
          "";


        // 収入
        const incomeTd =
          document.createElement(
            "td"
          );

        const income =
          Number(row.income) || 0;

        incomeTd.textContent =
          income > 0
            ? formatYen(income)
            : "";


        // 支出
        const expenseTd =
          document.createElement(
            "td"
          );

        const expense =
          Number(row.expense) || 0;

        expenseTd.textContent =
          expense > 0
            ? formatYen(expense)
            : "";


        // メモ
        const memoTd =
          document.createElement(
            "td"
          );

        memoTd.textContent =
          row.memo?.trim() ||
          "";


        tr.appendChild(
          dateTd
        );

        tr.appendChild(
          categoryTd
        );

        tr.appendChild(
          detailTd
        );

        tr.appendChild(
          incomeTd
        );

        tr.appendChild(
          expenseTd
        );

        tr.appendChild(
          memoTd
        );


        tbody.appendChild(
          tr
        );

      }
    );


    table.appendChild(
      tbody
    );


    section.appendChild(
      table
    );

  }


  // summaryContentの後ろに追加
  const summaryContent =
    document.getElementById(
      "summaryContent"
    );


  if (summaryContent) {

    summaryContent.after(
      section
    );

  } else {

    summarySection.appendChild(
      section
    );

  }

}


// ==================================================
// PDF用 日付表示
// ==================================================

function formatPDFDate(
  date
) {

  if (!date) return "";

  const parts =
    date.split("-");


  if (parts.length !== 3) {

    return date;

  }


  return `${Number(parts[1])}/${Number(parts[2])}`;

}
