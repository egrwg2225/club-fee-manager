// ==============================
// Supabase
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
// 状態
// ==============================

let currentUser = null;
let currentRole = null;

let currentYear = 2026;
let currentMonth = 9;

let transactions = [];
let categories = [];

let members = [];
let memberFees = [];

let monthLoadNumber = 0;


// ==============================
// 初期処理
// ==============================

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    updateMonthTitle();

    let {
      data: { session }
    } = await supabaseClient.auth.getSession();

    // 古いメールログインが残っていた場合は解除
    if (
      session &&
      !session.user.is_anonymous
    ) {
      await supabaseClient.auth.signOut();
      session = null;
    }

    // 匿名ログイン
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

      session = data.session;
    }

    currentUser = session.user;

    setupEditorModeButton();
setupMonthButtons();
setupAddRowButton();
setupCategoryManagement();
setupMemberManagement();
setupAutoMemberFeeIncome();

await loadUserRole();
  }
);


// ==============================
// 編集者モード
// ==============================

function setupEditorModeButton() {

  const button =
    document.getElementById(
      "editorModeButton"
    );

  if (!button) return;

  button.addEventListener(
    "click",
    async () => {

      if (currentRole === "editor") {
        await lockEditor();
      } else {
        await unlockEditor();
      }

    }
  );

  const changePasswordButton =
    document.getElementById(
      "changePasswordButton"
    );

  if (changePasswordButton) {

    changePasswordButton.addEventListener(
      "click",
      changeEditorPassword
    );

  }

}


// ==============================
// パスワード変更
// ==============================

async function changeEditorPassword() {

  if (currentRole !== "editor") {

    alert(
      "編集者モードで実行してください。"
    );

    return;
  }

  const currentPassword =
    prompt(
      "現在のパスワードを入力してください。"
    );

  if (currentPassword === null) return;

  const newPassword =
    prompt(
      "新しいパスワードを入力してください。"
    );

  if (newPassword === null) return;

  if (!newPassword) {

    alert(
      "新しいパスワードを入力してください。"
    );

    return;
  }

  const confirmPassword =
    prompt(
      "新しいパスワードをもう一度入力してください。"
    );

  if (confirmPassword === null) return;

  if (newPassword !== confirmPassword) {

    alert(
      "新しいパスワードが一致しません。"
    );

    return;
  }

  if (newPassword.length < 6) {

    alert(
      "パスワードは6文字以上にしてください。"
    );

    return;
  }

  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "change_editor_password",
      {
        current_password:
          currentPassword,
        new_password:
          newPassword
      }
    );

  if (error) {

    console.error(error);

    alert(
      "パスワード変更に失敗しました。\n\n" +
      "エラー内容：\n" +
      error.message
    );

    return;
  }

  if (!data) {

    alert(
      "現在のパスワードが違います。"
    );

    return;
  }

  alert(
    "編集パスワードを変更しました。"
  );

}


// ==============================
// 編集者解除
// ==============================

async function lockEditor() {

  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "lock_editor"
    );

  if (error) {

    console.error(error);

    alert(
      "編集者モードを解除できませんでした。\n\n" +
      "エラー内容：\n" +
      error.message
    );

    return;
  }

  if (!data) {

    alert(
      "編集者モードを解除できませんでした。"
    );

    return;
  }

  await loadUserRole();

  alert(
    "編集者モードを解除しました。"
  );

}


// ==============================
// 編集者解除
// ==============================

async function unlockEditor() {

  const password =
    prompt(
      "編集者パスワードを入力してください。"
    );

  if (password === null) return;

  if (!password) {

    alert(
      "パスワードを入力してください。"
    );

    return;
  }

  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "unlock_editor",
      {
        input_password:
          password
      }
    );

  if (error) {

    console.error(error);

    alert(
      "編集者モードへの切り替えに失敗しました。\n\n" +
      "エラー内容：\n" +
      error.message
    );

    return;
  }

  if (!data) {

    alert(
      "パスワードが違います。"
    );

    return;
  }

  await loadUserRole();

  alert(
    "編集者モードになりました。"
  );

}


// ==============================
// 権限取得
// ==============================

async function loadUserRole() {

  if (!currentUser) return;

  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "is_editor"
    );

  if (error) {

    console.error(error);

    currentRole = "viewer";

  } else {

    currentRole =
      data === true
        ? "editor"
        : "viewer";

  }

  const appContent =
    document.getElementById(
      "appContent"
    );

  const userRole =
    document.getElementById(
      "userRole"
    );

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

  const editorModeButton =
    document.getElementById(
      "editorModeButton"
    );

  if (editorModeButton) {

    editorModeButton.textContent =
      currentRole === "editor"
        ? "🔓 編集者モード解除"
        : "🔒 編集者モード";

  }

  const changePasswordButton =
    document.getElementById(
      "changePasswordButton"
    );

  if (changePasswordButton) {

    changePasswordButton.style.display =
      currentRole === "editor"
        ? "inline-block"
        : "none";

  }

  // ここは必ず実行する
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

  return checkbox
    ? checkbox.checked
    : false;

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
      () => changeMonth(-1)
    );

  }

  if (next) {

    next.addEventListener(
      "click",
      () => changeMonth(1)
    );

  }

}


async function changeMonth(direction) {

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

  return (
    `${year}-${String(month).padStart(2, "0")}`
  );

}


// ==============================
// 月データ
// ==============================

async function loadMembers() {

  if (!currentUser) return;

  const {
    data,
    error
  } =
    await supabaseClient
      .from("members")
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

  const displayYearMonth =
    getYearMonth();

  members =
    (data || []).filter(
      member => {

        // 入部年月が設定されている場合
        // 入部月より前は表示しない
        if (
          member.joined_year_month &&
          displayYearMonth <
          member.joined_year_month
        ) {
          return false;
        }

        // 退部年月が設定されている場合
        // 退部月以降は表示しない
        if (
          member.left_year_month &&
          displayYearMonth >=
          member.left_year_month
        ) {
          return false;
        }

        // 入部・退部の履歴情報がない
        // 旧データは active を使用
        return (
          member.active === true
        );

      }
    );

  await prepareMemberFees();

  renderMembers();

}

// ==============================
// 支払済部費合計
// ==============================

async function getPaidMemberFeesTotal(
  yearMonth
) {

  // 実際の現在年月を取得
  const now = new Date();

  const actualYear =
    now.getFullYear();

  const actualMonth =
    now.getMonth() + 1;

  const actualYearMonth =
    `${actualYear}-${String(actualMonth).padStart(2, "0")}`;

  // 実際の今月の場合
  // 現在有効な部員だけを対象にする
  if (
    yearMonth ===
    actualYearMonth
  ) {

    const activeMemberIds =
      new Set(
        members.map(
          member =>
            member.id
        )
      );

    return memberFees
      .filter(
        fee =>
          fee.paid === true &&
          activeMemberIds.has(
            fee.member_id
          )
      )
      .reduce(
        (total, fee) =>
          total +
          (Number(fee.amount) || 0),
        0
      );

  }

  // 過去月は保存されている
  // 部費履歴をそのまま使用
  const {
    data,
    error
  } =
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

  return (data || []).reduce(
    (total, row) =>
      total +
      (Number(row.amount) || 0),
    0
  );

}
// ==============================
// 月残高計算
// ==============================

async function calculateMonthBalance(
  year,
  month
) {

  if (
    year < 2026 ||
    (
      year === 2026 &&
      month < 1
    )
  ) {
    return 0;
  }

  let previousYear = year;
  let previousMonth = month - 1;

  if (previousMonth === 0) {

    previousMonth = 12;
    previousYear--;

  }

  const yearMonth =
    getYearMonth(
      year,
      month
    );

  const {
    data,
    error
  } =
    await supabaseClient
      .from("transactions")
      .select(
        "income, expense"
      )
      .eq(
        "year_month",
        yearMonth
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

  let memberFeeIncome = 0;

  if (
    isAutoMemberFeeIncome()
  ) {

    memberFeeIncome =
      await getPaidMemberFeesTotal(
        yearMonth
      );

  }

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
// 合計
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

  return (
    `${Math.round(value).toLocaleString()}円`
  );

}


// ==============================
// 収支追加
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

  const {
    data,
    error
  } =
    await supabaseClient
      .from("transactions")
      .insert({
        year_month:
          yearMonth,
        date:
          `${yearMonth}-01`,
        category:
          "",
        detail:
          "",
        income:
          0,
        expense:
          0,
        memo:
          ""
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
        document.createElement(
          "tr"
        );

      // 日付
      const dateTd =
        document.createElement(
          "td"
        );

      const dateInput =
        document.createElement(
          "input"
        );

      dateInput.type = "date";
      dateInput.value =
        row.date || "";

      dateInput.disabled =
        !isEditor();

      dateInput.addEventListener(
        "change",
        () =>
          updateTransaction(
            row.idansactions,
            "date",
            dateInput.value
          )
      );

      dateTd.appendChild(
        dateInput
      );

      // 分類
      const categoryTd =
        document.createElement(
          "td"
        );

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
        () =>
          updateTransaction(
            row.idansactions,
            "category",
            categorySelect.value
          )
      );

      categoryTd.appendChild(
        categorySelect
      );

      // 内訳
      const detailTd =
        document.createElement(
          "td"
        );

      const detailInput =
        document.createElement(
          "input"
        );

      detailInput.type = "text";
      detailInput.value =
        row.detail || "";

      detailInput.disabled =
        !isEditor();

      detailInput.addEventListener(
        "change",
        () =>
          updateTransaction(
            row.idansactions,
            "detail",
            detailInput.value
          )
      );

      detailTd.appendChild(
        detailInput
      );

      // 収入
      const incomeTd =
        document.createElement(
          "td"
        );

      const incomeInput =
        document.createElement(
          "input"
        );

      incomeInput.type = "number";
incomeInput.inputMode =
  "numeric";

incomeInput.placeholder = "0";

incomeInput.value =
  Number(row.income) || "";
      incomeInput.disabled =
        !isEditor();

      incomeInput.addEventListener(
        "change",
        () =>
          updateTransaction(
            row.idansactions,
            "income",
            Number(
              incomeInput.value
            ) || 0
          )
      );

      incomeTd.appendChild(
        incomeInput
      );

      // 支出
      const expenseTd =
        document.createElement(
          "td"
        );

      const expenseInput =
        document.createElement(
          "input"
        );

      expenseInput.type =
  "number";

expenseInput.inputMode =
  "numeric";

expenseInput.placeholder = "0";

expenseInput.value =
  Number(row.expense) || "";
      expenseInput.disabled =
        !isEditor();

      expenseInput.addEventListener(
        "change",
        () =>
          updateTransaction(
            row.idansactions,
            "expense",
            Number(
              expenseInput.value
            ) || 0
          )
      );

      expenseTd.appendChild(
        expenseInput
      );

      // メモ
      const memoTd =
        document.createElement(
          "td"
        );

      const memoInput =
        document.createElement(
          "input"
        );

      memoInput.type = "text";
      memoInput.value =
        row.memo || "";

      memoInput.disabled =
        !isEditor();

      memoInput.addEventListener(
        "change",
        () =>
          updateTransaction(
            row.idansactions,
            "memo",
            memoInput.value
          )
      );

      memoTd.appendChild(
        memoInput
      );

      // 削除
      const deleteTd =
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
        option.selected = true;
      }

      select.appendChild(
        option
      );

    }
  );

}


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


async function deleteTransaction(id) {

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

  const {
    data,
    error
  } =
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

      div.style.display = "flex";
      div.style.alignItems =
        "center";
      div.style.gap = "8px";
      div.style.marginBottom =
        "8px";

      const text =
        document.createElement(
          "span"
        );

      text.textContent =
        category.namemename;

      text.style.flex = "1";

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
      div.appendChild(
        deleteButton
      );

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

  const {
    data,
    error
  } =
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


// ==============================
// 部費管理
// ==============================

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



  async function loadMembers() {

  if (!currentUser) return;

  const {
    data,
    error
  } =
    await supabaseClient
      .from("members")
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

  const displayYearMonth =
    getYearMonth();

  members =
    (data || []).filter(
      member => {

        // 退部年月が設定されている部員
        if (
          member.left_year_month
        ) {

          // 表示月が退部月より前なら表示
          return (
            displayYearMonth <
            member.left_year_month
          );

        }

        // 退部年月がない場合は、
        // 現在も有効な部員だけ表示
        return (
          member.active === true
        );

      }
    );

  await prepareMemberFees();

  renderMembers();

}


async function prepareMemberFees() {

  const yearMonth =
    getYearMonth();

  const {
    data,
    error
  } =
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

      const {
        data: newFee,
        error: insertError
      } =
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
            paid:
              false
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

      // 部員名
      const nameTd =
        document.createElement(
          "td"
        );

      const nameInput =
        document.createElement(
          "input"
        );

      nameInput.type = "text";
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

      // 月額部費
      const feeTd =
        document.createElement(
          "td"
        );

      const feeInput =
        document.createElement(
          "input"
        );

      feeInput.type = "number";
      feeInput.inputMode =
        "numeric";

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

      // 支払い
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

      // 削除
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

      expected += amount;

      if (fee?.paid) {
        paid += amount;
      } else {
        unpaid += amount;
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

  const {
  data,
  error
} =
  await supabaseClient
    .from("members")
    .insert({
      name:
        memberName,
      monthly_fee:
        monthlyFee,
      active:
        true,
      joined_year_month:
        getYearMonth()
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

  const {
    data: feeData,
    error: feeError
  } =
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
// 部員名変更
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
        [key]: value
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
    member[key] = value;
  }

}


// ==============================
// 部費変更
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
    .eq(
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

  const member =
    members.find(
      item =>
        item.id ===
        memberId
    );

  if (member) {

    const {
      error: memberError
    } =
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
// 支払済 / 未払い
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
// 部員削除
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

  const currentYearMonth =
    getYearMonth();

  // 今月の部費データだけ削除
  // 過去月の履歴は残す
  const {
    error: feeDeleteError
  } =
    await supabaseClient
      .from("member_fees")
      .delete()
      .eq(
        "member_id",
        id
      )
      .eq(
        "year_month",
        currentYearMonth
      );

  if (feeDeleteError) {

    console.error(
      feeDeleteError
    );

    alert(
      "今月の部費データの削除に失敗しました。\n\n" +
      "エラー内容：\n" +
      feeDeleteError.message
    );

    return;
  }

  // 部員を退部扱いにする
  // 削除した月を記録する
  const {
    error
  } =
    await supabaseClient
      .from("members")
      .update({
        active:
          false,
        left_year_month:
          currentYearMonth
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

  // 画面上のデータを更新
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

  // Supabaseから最新状態を再取得
  await loadMembers();

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


// ==============================
// 月別集計
// ==============================

async function renderSummary() {

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
        feePaid += amount;
      } else {
        feeUnpaid += amount;
      }

    }
  );

  const autoMemberFee =
    isAutoMemberFeeIncome();

  if (autoMemberFee) {
    incomeTotal += feePaid;
  }

  const carryOver =
    await getPreviousMonthBalance();

  const currentBalance =
    carryOver +
    incomeTotal -
    expenseTotal;

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

  // 収入分類
  const incomeMap = {};

  transactions.forEach(
    row => {

      const amount =
        Number(row.income) || 0;

      if (amount <= 0) return;

      const category =
        row.category?.trim() ||
        "未分類";

      incomeMap[category] =
        (incomeMap[category] || 0) +
        amount;

    }
  );

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

  // 支出分類
  const expenseMap = {};

  transactions.forEach(
    row => {

      const amount =
        Number(row.expense) || 0;

      if (amount <= 0) return;

      const category =
        row.category?.trim() ||
        "未分類";

      expenseMap[category] =
        (expenseMap[category] || 0) +
        amount;

    }
  );

  renderSummaryBreakdown(
    "summaryExpenseBreakdown",
    expenseMap,
    "支出はありません。"
  );

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
      formatYen(feeExpected);
  }

  if (paidElement) {
    paidElement.textContent =
      formatYen(feePaid);
  }

  if (unpaidElement) {
    unpaidElement.textContent =
      formatYen(feeUnpaid);
  }

}


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

  if (!entries.length) {

    area.textContent =
      emptyMessage;

    return;
  }

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
        formatYen(amount);

      row.appendChild(name);
      row.appendChild(value);

      area.appendChild(row);

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


// ==============================
// A4 PDF
// ==============================

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

  createPDFTransactionTable();

  await renderSummary();

  setTimeout(
    () => {
      window.print();
    },
    300
  );

}


// ==============================
// PDF収支明細
// ==============================

function createPDFTransactionTable() {

  const summarySection =
    document.getElementById(
      "summarySection"
    );

  if (!summarySection) return;

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

  section.appendChild(title);

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

        headerRow.appendChild(th);

      }
    );

    thead.appendChild(
      headerRow
    );

    table.appendChild(
      thead
    );

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

        const dateTd =
          document.createElement(
            "td"
          );

        dateTd.textContent =
          formatPDFDate(
            row.date
          );

        const categoryTd =
          document.createElement(
            "td"
          );

        categoryTd.textContent =
          row.category?.trim() ||
          "未分類";

        const detailTd =
          document.createElement(
            "td"
          );

        detailTd.textContent =
          row.detail?.trim() ||
          "";

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


// ==============================
// PDF日付
// ==============================

function formatPDFDate(date) {

  if (!date) return "";

  const parts =
    date.split("-");

  if (parts.length !== 3) {
    return date;
  }

  return (
    `${Number(parts[1])}/${Number(parts[2])}`
  );

}
