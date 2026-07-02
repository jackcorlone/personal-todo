const form = document.querySelector("#taskForm");
const textInput = document.querySelector("#taskText");
const list = document.querySelector("#taskList");
const template = document.querySelector("#taskTemplate");
const languageSelect = document.querySelector("#languageSelect");
const tabs = document.querySelectorAll(".tab");
const conflicts = document.querySelector("#conflicts");
const todayCount = document.querySelector("#todayCount");
const laterCount = document.querySelector("#laterCount");
const overdueCount = document.querySelector("#overdueCount");
const expenseTotal = document.querySelector("#expenseTotal");
const sketchToggle = document.querySelector("#sketchToggle");
const sketchPanel = document.querySelector("#sketchPanel");
const clearSketch = document.querySelector("#clearSketch");
const modeButtons = document.querySelectorAll(".modeButton");
const modeStatus = document.querySelector("#modeStatus");
const expenseFields = document.querySelector("#expenseFields");
const expenseAmount = document.querySelector("#expenseAmount");
const expenseCategory = document.querySelector("#expenseCategory");
const taskTags = document.querySelector("#taskTags");
const reminderMinutesInput = document.querySelector("#reminderMinutesInput");
const repeatRule = document.querySelector("#repeatRule");
const repeatCount = document.querySelector("#repeatCount");
const saveTask = document.querySelector("#saveTask");
const cancelEdit = document.querySelector("#cancelEdit");
const calculatorForm = document.querySelector("#calculatorForm");
const calculatorInput = document.querySelector("#calculatorInput");
const calculatorResult = document.querySelector("#calculatorResult");
const exportData = document.querySelector("#exportData");
const importData = document.querySelector("#importData");
const importFile = document.querySelector("#importFile");
const dataStatus = document.querySelector("#dataStatus");
const pwaStatus = document.querySelector("#pwaStatus");
const installApp = document.querySelector("#installApp");
const searchInput = document.querySelector("#searchInput");
const clearSearch = document.querySelector("#clearSearch");
const canvas = document.querySelector("#sketchCanvas");
const context = canvas.getContext("2d");
const enableReminders = document.querySelector("#enableReminders");
const reminderStatus = document.querySelector("#reminderStatus");
const reminderNotice = document.querySelector("#reminderNotice");
const reminderMessage = document.querySelector("#reminderMessage");
const reminderActions = document.querySelectorAll("[data-reminder-action]");
const calendarTitle = document.querySelector("#calendarTitle");
const selectedDayLabel = document.querySelector("#selectedDayLabel");
const calendarGrid = document.querySelector("#calendarGrid");
const calendarToday = document.querySelector("#calendarToday");
const calendarWeek = document.querySelector("#calendarWeek");
const calendarMonth = document.querySelector("#calendarMonth");
const storageKey = "personal-todo.tasks";
const reminderStorageKey = "personal-todo.reminded";
const languageStorageKey = "personal-todo.language";
const databaseName = "personal-todo";
const databaseStore = "kv";
const hasServer = location.protocol !== "file:";
const defaultReminderMinutes = 2;

let tasks = [];
let filter = "active";
let mode = "task";
let drawing = false;
let hasSketch = false;
let audioReady = false;
let remindersEnabled = false;
let audioContext = null;
let selectedDateKey = "";
let calendarMode = "month";
let activeReminderTaskId = null;
let editingTaskId = null;
let searchTerm = "";
let installPrompt = null;
let language = localStorage.getItem(languageStorageKey) || "zh";
let pwaMessageKey = "pwaDefault";

const messages = {
  zh: {
    appTitle: "个人待办提醒助手",
    hero: "想到什么，先放进这里。",
    modeTask: "待办",
    modeExpense: "记账",
    modeTaskStatus: "当前是待办模式，可以记录提醒、重复事项和临时想法。",
    modeExpenseStatus: "当前是记账模式，填写金额和分类后会计入本月支出。",
    taskPlaceholder: "例如：明天上午 10 点交电费；周五前回复老王；有空整理桌面",
    expensePlaceholder: "例如：买菜、咖啡、交通",
    labels: {
      tags: "标签",
      reminderLead: "提前提醒",
      amount: "金额",
      category: "分类",
      repeat: "重复",
      repeatCount: "次数",
      calculator: "计算器"
    },
    placeholders: {
      tags: "工作, 股票, 家庭",
      reminderLead: "默认2分钟",
      category: "买菜、交通、咖啡",
      repeatCount: "不限",
      calculator: "例如：38.5 + 12 * 2",
      search: "搜索内容或标签，例如：股票、家庭、账单"
    },
    repeatOptions: { none: "不重复", daily: "每天", weekly: "每周", monthly: "每月" },
    sketch: "画个草图",
    cancelEdit: "取消编辑",
    save: "记下来",
    saveEdit: "保存修改",
    clearSketch: "清空草图",
    sketchHint: "鼠标或手指都可以画",
    parseHint: "会识别：今晚、明早、半小时后、下周一、每周一三五、月底、提前30分钟提醒。",
    calculate: "计算",
    result: "结果",
    dataTitle: "本地数据",
    dataStatusDefault: "数据保存在这个设备里，可以导出备份，也可以导入之前的备份文件。",
    exportData: "导出备份",
    importData: "导入备份",
    pwaTitle: "安装到桌面",
    pwaDefault: "正在检查是否可以安装，安装后仍然使用本机数据。",
    install: "安装",
    reminderTitle: "提醒",
    reminderDefault: "默认提前 2 分钟，网页开着时生效。",
    enableReminders: "开启声音和弹窗",
    disableReminders: "关闭声音和弹窗",
    summary: { today: "今天", later: "以后", overdue: "过期", expenseTotal: "本月支出" },
    tabs: { active: "要做", today: "今天", later: "以后", expense: "记账", history: "历史", done: "已完成" },
    clear: "清空",
    calendar: { titleToday: "今天", titleWeek: "本周", selectedDefault: "选择日期查看事项", selected: "的待办", monthView: "月历", weekdays: ["一", "二", "三", "四", "五", "六", "日"], item: "件", overdue: "过期" },
    reminderActions: { complete: "完成", snooze: "延后10分钟", tomorrow: "明天再提醒", skip: "跳过本次" },
    taskLabels: { noTime: "没有时间", expense: "记账", uncategorized: "未分类", currency: "元", remindPrefix: "提前", remindSuffix: "分钟提醒", repeatSuffix: "重复", repeatLimit: "共", times: "次", reminded: "已提醒" },
    buttons: { delete: "删除", edit: "编辑" },
    empty: "这里暂时没有事情。",
    conflict: (count) => `有 ${count} 组事情时间接近，可能会冲突。`,
    reminderMessage: (text, due) => `提醒：${text}（${due}）`,
    calcNumberOnly: "只能计算数字",
    calcBadFormat: "格式不对",
    calcUnknown: "算不出",
    exported: (count) => `已导出 ${count} 条记录。`,
    imported: (count) => `已导入 ${count} 条记录。`,
    importFailed: "导入失败，请确认是 JSON 备份文件。",
    emptyText: "请先写下要保存的内容。",
    saved: "已保存。",
    saveFailed: "保存失败，请刷新页面后再试。",
    reminderOff: "已关闭。不会响铃，也不会弹出系统通知。",
    reminderOn: "已开启。保持这个网页打开，到提醒时间会响一声并弹出提示。",
    pwaReady: "可以安装到桌面。安装后像 App 一样打开，数据仍然只在本机。",
    pwaInstalled: "已安装。可以从桌面图标打开，数据仍然只在本机。",
    pwaInstallAccepted: "已开始安装。",
    pwaInstallDismissed: "已取消安装，可以稍后再装。",
    pwaFile: "直接打开文件时可以使用本地数据；如需安装和离线缓存，请用本地服务或 GitHub Pages 打开。",
    pwaUnsupported: "这个浏览器暂不支持安装缓存，但网页功能可以正常使用。",
    pwaOfflineReady: "已支持离线打开。安装入口会在浏览器菜单或地址栏出现。",
    pwaOfflineFailed: "离线缓存暂时没有启用，但网页功能可以正常使用。"
  },
  en: {
    appTitle: "Personal Reminder Assistant",
    hero: "Capture it first. Sort it out later.",
    modeTask: "To-do",
    modeExpense: "Expense",
    modeTaskStatus: "To-do mode: save reminders, repeating tasks, and quick thoughts.",
    modeExpenseStatus: "Expense mode: enter an amount and category to include it in this month's total.",
    taskPlaceholder: "Example: pay electricity tomorrow at 10; reply before Friday; tidy the desk",
    expensePlaceholder: "Example: groceries, coffee, transit",
    labels: {
      tags: "Tags",
      reminderLead: "Remind before",
      amount: "Amount",
      category: "Category",
      repeat: "Repeat",
      repeatCount: "Times",
      calculator: "Calculator"
    },
    placeholders: {
      tags: "work, stocks, home",
      reminderLead: "Default 2 min",
      category: "groceries, transit, coffee",
      repeatCount: "Unlimited",
      calculator: "Example: 38.5 + 12 * 2",
      search: "Search text or tags, e.g. stocks, home, bills"
    },
    repeatOptions: { none: "No repeat", daily: "Daily", weekly: "Weekly", monthly: "Monthly" },
    sketch: "Sketch",
    cancelEdit: "Cancel",
    save: "Save",
    saveEdit: "Save changes",
    clearSketch: "Clear sketch",
    sketchHint: "Draw with mouse or finger",
    parseHint: "Time parsing currently works best with Chinese phrases like 今天, 明天, 下周一, 提前30分钟提醒.",
    calculate: "Calculate",
    result: "Result",
    dataTitle: "Local data",
    dataStatusDefault: "Data stays on this device. You can export or import a backup file.",
    exportData: "Export backup",
    importData: "Import backup",
    pwaTitle: "Install",
    pwaDefault: "Checking install support. Installed mode still uses local data.",
    install: "Install",
    reminderTitle: "Reminder",
    reminderDefault: "Default is 2 minutes before. Works while this page is open.",
    enableReminders: "Enable sound and popup",
    disableReminders: "Disable sound and popup",
    summary: { today: "Today", later: "Later", overdue: "Overdue", expenseTotal: "This month" },
    tabs: { active: "To-do", today: "Today", later: "Later", expense: "Expenses", history: "History", done: "Done" },
    clear: "Clear",
    calendar: { titleToday: "Today", titleWeek: "This week", selectedDefault: "Pick a date to view tasks", selected: "tasks", monthView: "Month", weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], item: "items", overdue: "overdue" },
    reminderActions: { complete: "Done", snooze: "Snooze 10 min", tomorrow: "Tomorrow", skip: "Skip this time" },
    taskLabels: { noTime: "No time", expense: "Expense", uncategorized: "Uncategorized", currency: "CNY", remindPrefix: "", remindSuffix: "min before", repeatSuffix: "repeat", repeatLimit: "total", times: "times", reminded: "Reminded" },
    buttons: { delete: "Delete", edit: "Edit" },
    empty: "Nothing here yet.",
    conflict: (count) => `${count} task groups are close in time and may conflict.`,
    reminderMessage: (text, due) => `Reminder: ${text} (${due})`,
    calcNumberOnly: "Numbers only",
    calcBadFormat: "Invalid format",
    calcUnknown: "Cannot calculate",
    exported: (count) => `Exported ${count} records.`,
    imported: (count) => `Imported ${count} records.`,
    importFailed: "Import failed. Please choose a JSON backup file.",
    emptyText: "Write something before saving.",
    saved: "Saved.",
    saveFailed: "Save failed. Refresh and try again.",
    reminderOff: "Disabled. No sound or system notification will appear.",
    reminderOn: "Enabled. Keep this page open to hear a sound and see a notification.",
    pwaReady: "Ready to install. Installed mode still keeps data on this device.",
    pwaInstalled: "Installed. Open it from the desktop icon; data still stays local.",
    pwaInstallAccepted: "Installation started.",
    pwaInstallDismissed: "Installation cancelled. You can install later.",
    pwaFile: "Local file mode can use local data. Use local server or GitHub Pages for install and offline cache.",
    pwaUnsupported: "This browser does not support install cache, but the page still works.",
    pwaOfflineReady: "Offline support is ready. Install may appear in the browser menu or address bar.",
    pwaOfflineFailed: "Offline cache is not enabled yet, but the page still works."
  }
};

function t(key) {
  return key.split(".").reduce((value, part) => value?.[part], messages[language]) ?? key;
}

function setPwaStatus(key) {
  pwaMessageKey = key;
  pwaStatus.textContent = t(key);
}

function setLabelText(control, text) {
  const label = control.closest("label");
  if (label?.firstChild) label.firstChild.textContent = `\n              ${text}\n              `;
}

function applyLanguage() {
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  document.title = t("appTitle");
  languageSelect.value = language;

  document.querySelector(".eyebrow").textContent = t("appTitle");
  document.querySelector("h1").textContent = t("hero");
  modeButtons.forEach((button) => {
    button.textContent = button.dataset.mode === "expense" ? t("modeExpense") : t("modeTask");
  });
  setMode(mode);

  setLabelText(taskTags, t("labels.tags"));
  setLabelText(reminderMinutesInput, t("labels.reminderLead"));
  setLabelText(expenseAmount, t("labels.amount"));
  setLabelText(expenseCategory, t("labels.category"));
  setLabelText(repeatRule, t("labels.repeat"));
  setLabelText(repeatCount, t("labels.repeatCount"));
  document.querySelector('label[for="calculatorInput"]').textContent = t("labels.calculator");

  taskTags.placeholder = t("placeholders.tags");
  reminderMinutesInput.placeholder = t("placeholders.reminderLead");
  expenseCategory.placeholder = t("placeholders.category");
  repeatCount.placeholder = t("placeholders.repeatCount");
  calculatorInput.placeholder = t("placeholders.calculator");
  searchInput.placeholder = t("placeholders.search");

  [...repeatRule.options].forEach((option) => {
    option.textContent = t(`repeatOptions.${option.value}`);
  });

  sketchToggle.textContent = t("sketch");
  cancelEdit.textContent = t("cancelEdit");
  saveTask.textContent = editingTaskId ? t("saveEdit") : t("save");
  clearSketch.textContent = t("clearSketch");
  document.querySelector("#sketchPanel .hint").textContent = t("sketchHint");
  document.querySelector("#parseHint").textContent = t("parseHint");

  calculatorForm.querySelector("button").textContent = t("calculate");
  if ([messages.zh.result, messages.en.result].includes(calculatorResult.textContent)) {
    calculatorResult.textContent = t("result");
  }

  document.querySelector(".dataBar strong").textContent = t("dataTitle");
  if ([messages.zh.dataStatusDefault, messages.en.dataStatusDefault].includes(dataStatus.textContent)) {
    dataStatus.textContent = t("dataStatusDefault");
  }
  exportData.textContent = t("exportData");
  importData.textContent = t("importData");

  document.querySelector(".pwaBar strong").textContent = t("pwaTitle");
  pwaStatus.textContent = t(pwaMessageKey);
  installApp.textContent = t("install");

  document.querySelector(".reminderBar strong").textContent = t("reminderTitle");
  reminderStatus.textContent = remindersEnabled ? t("reminderOn") : t("reminderDefault");
  enableReminders.textContent = remindersEnabled ? t("disableReminders") : t("enableReminders");

  document.querySelector("#todayCount + span").textContent = t("summary.today");
  document.querySelector("#laterCount + span").textContent = t("summary.later");
  document.querySelector("#overdueCount + span").textContent = t("summary.overdue");
  document.querySelector("#expenseTotal + span").textContent = t("summary.expenseTotal");
  tabs.forEach((tab) => {
    tab.textContent = t(`tabs.${tab.dataset.filter}`);
  });
  clearSearch.textContent = t("clear");

  calendarToday.textContent = t("calendar.titleToday");
  calendarWeek.textContent = t("calendar.titleWeek");
  calendarMonth.textContent = t("calendar.monthView");
  reminderActions.forEach((button) => {
    button.textContent = t(`reminderActions.${button.dataset.reminderAction}`);
  });

  template.content.querySelector(".checkButton").setAttribute("aria-label", t("reminderActions.complete"));
  template.content.querySelector(".sketchPreview").alt = language === "zh" ? "草图预览" : "Sketch preview";
  template.content.querySelector(".deleteButton").textContent = t("buttons.delete");
  template.content.querySelector(".deleteButton").setAttribute("aria-label", t("buttons.delete"));
  template.content.querySelector(".editButton").textContent = t("buttons.edit");
  template.content.querySelector(".editButton").setAttribute("aria-label", t("buttons.edit"));

  render();
}

context.lineCap = "round";
context.lineJoin = "round";
context.lineWidth = 4;
context.strokeStyle = "#232323";

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseClock(text, fallbackHour = 9) {
  let hour = fallbackHour;
  let minute = 0;
  const timeMatch = text.match(/(\d{1,2})(?:[:：点](\d{1,2})?)\s*(?:分)?/);
  if (timeMatch) {
    hour = Number(timeMatch[1]);
    minute = Number(timeMatch[2] || 0);
  } else if (/晚上|夜里/.test(text)) {
    hour = 20;
  } else if (/下午/.test(text)) {
    hour = 15;
  } else if (/中午/.test(text)) {
    hour = 12;
  } else if (/明早|明天早上/.test(text)) {
    hour = 9;
  } else if (/今晚|睡前/.test(text)) {
    hour = 21;
  } else if (/早上|上午/.test(text)) {
    hour = 9;
  }

  if ((/下午|晚上|夜里/.test(text)) && hour < 12) hour += 12;
  return {
    hour: Math.min(hour, 23),
    minute: Math.min(minute, 59)
  };
}

function nextWeekday(target, from = new Date(), forceNextWeek = false) {
  if (forceNextWeek) {
    const startNextWeek = addDays(startOfDay(from), 7 - ((from.getDay() + 6) % 7));
    return addDays(startNextWeek, target === 0 ? 6 : target - 1);
  }
  const current = from.getDay();
  let offset = (target - current + 7) % 7;
  if (offset === 0) offset = 7;
  return addDays(startOfDay(from), offset);
}

function parseTime(text) {
  const now = new Date();
  let day = null;

  const afterMatch = text.match(/(半个?小时|\d{1,3})\s*(分钟|分|小时|个?小时)\s*后/);
  if (afterMatch) {
    const amount = afterMatch[1].includes("半") ? 30 : Number(afterMatch[1]);
    const minutes = /小时/.test(afterMatch[2]) ? amount * 60 : amount;
    return new Date(now.getTime() + minutes * 60 * 1000).toISOString();
  }

  if (/今天/.test(text)) day = startOfDay(now);
  if (/明天/.test(text)) day = addDays(startOfDay(now), 1);
  if (/明早|明天早上/.test(text)) day = addDays(startOfDay(now), 1);
  if (/后天/.test(text)) day = addDays(startOfDay(now), 2);
  if (/今晚|睡前/.test(text)) day = startOfDay(now);

  const dateMatch = text.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]?/);
  if (dateMatch) {
    day = new Date(now.getFullYear(), Number(dateMatch[1]) - 1, Number(dateMatch[2]));
  }

  const monthlyMatch = text.match(/每个?月\s*(\d{1,2})\s*[日号]/);
  if (monthlyMatch) {
    day = new Date(now.getFullYear(), now.getMonth(), Number(monthlyMatch[1]));
    if (day < now) day.setMonth(day.getMonth() + 1);
  }

  const nextMonthMatch = text.match(/下个?月\s*(\d{1,2})\s*[日号]?/);
  if (nextMonthMatch) {
    day = new Date(now.getFullYear(), now.getMonth() + 1, Number(nextMonthMatch[1]));
  }

  if (/月底|月末/.test(text)) {
    day = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    if (day < now) day = new Date(now.getFullYear(), now.getMonth() + 2, 0);
  }

  const weekMatch = text.match(/周([一二三四五六日天])/);
  if (weekMatch) {
    const map = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0 };
    const target = map[weekMatch[1]];
    day = nextWeekday(target, now, /下周/.test(text));
  }

  if (/工作日/.test(text)) {
    const clock = parseClock(text);
    const candidate = startOfDay(now);
    candidate.setHours(clock.hour, clock.minute, 0, 0);
    day = candidate > now && ![0, 6].includes(candidate.getDay()) ? startOfDay(now) : addDays(startOfDay(now), 1);
    while ([0, 6].includes(day.getDay())) {
      day = addDays(day, 1);
    }
  }

  if (!day) return null;

  const { hour, minute } = parseClock(text);
  day.setHours(hour, minute, 0, 0);
  return day.toISOString();
}

function parseReminderMinutes(text) {
  const match = text.match(/提前\s*(半个?小时|\d{1,3}|[一二两三四五六七八九十]{1,3})\s*(小时|分钟|分)?/);
  if (!match) return defaultReminderMinutes;
  if (match[1].includes("半")) return 30;

  const value = /^\d+$/.test(match[1]) ? Number(match[1]) : chineseNumber(match[1]);
  if (!value) return defaultReminderMinutes;
  return match[2] === "小时" ? value * 60 : value;
}

function parseRepeat(text) {
  if (/每天|每日/.test(text)) return "daily";
  if (/每周|每星期/.test(text)) return "weekly";
  if (/每月|每个月/.test(text)) return "monthly";
  return "none";
}

function parseWeekdays(text) {
  const match = text.match(/每周([一二三四五六日天]+)|每星期([一二三四五六日天]+)/);
  if (!match) return [];
  const chars = (match[1] || match[2] || "").split("");
  const map = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0 };
  return [...new Set(chars.map((char) => map[char]).filter((day) => day !== undefined))];
}

function parseAmount(text) {
  const match = text.match(/(?:花了|支出|收入|记账)?\s*(-?\d+(?:\.\d{1,2})?)\s*(?:元|块)?/);
  return match ? Number(match[1]) : null;
}

function parseTags(value) {
  return String(value || "")
    .split(/[,，\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function chineseNumber(text) {
  const map = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  if (text === "十") return 10;
  if (text.startsWith("十")) return 10 + (map[text[1]] || 0);
  if (text.endsWith("十")) return (map[text[0]] || 0) * 10;
  if (text.includes("十")) return (map[text[0]] || 0) * 10 + (map[text[2]] || 0);
  return map[text] || 0;
}

function formatDue(iso) {
  if (!iso) return t("taskLabels.noTime");
  const date = new Date(iso);
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function bucket(task) {
  if (task.type === "expense") return "expense";
  if (task.done) return "done";
  if (!task.dueAt) return "later";
  const due = new Date(task.dueAt);
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  if (due < new Date()) return "overdue";
  if (due >= today && due < tomorrow) return "today";
  return "later";
}

function hasHistory(task) {
  return task.done || Boolean(task.remindedAt) || Boolean(task.reminderHistory?.length);
}

function nextRepeatDate(iso, rule) {
  const date = new Date(iso);
  if (rule === "daily") date.setDate(date.getDate() + 1);
  if (rule === "weekly") date.setDate(date.getDate() + 7);
  if (rule === "monthly") date.setMonth(date.getMonth() + 1);
  return date.toISOString();
}

function nextWeekdayRepeat(iso, weekdays) {
  if (!weekdays?.length) return null;
  const current = new Date(iso);
  for (let offset = 1; offset <= 14; offset += 1) {
    const candidate = addDays(current, offset);
    if (weekdays.includes(candidate.getDay())) return candidate.toISOString();
  }
  return null;
}

function reminderTime(task) {
  if (!task.dueAt) return null;
  return new Date(new Date(task.dueAt).getTime() - (task.reminderMinutes ?? defaultReminderMinutes) * 60 * 1000);
}

function openDatabase() {
  if (!("indexedDB" in window)) return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(databaseStore);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

async function localDatabaseRead(key) {
  const database = await openDatabase();
  if (!database) return null;
  return new Promise((resolve) => {
    const transaction = database.transaction(databaseStore, "readonly");
    const request = transaction.objectStore(databaseStore).get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => resolve(null);
  });
}

async function localDatabaseWrite(key, value) {
  const database = await openDatabase();
  if (!database) return false;
  return new Promise((resolve) => {
    const transaction = database.transaction(databaseStore, "readwrite");
    transaction.objectStore(databaseStore).put(value, key);
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => resolve(false);
  });
}

async function api(path, options = {}) {
  if (!hasServer) return localApi(path, options);

  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!response.ok) throw new Error("保存失败");
  return response.json();
}

function localReadTasksSync() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

async function localReadTasks() {
  const stored = await localDatabaseRead(storageKey);
  if (Array.isArray(stored)) return stored;

  const legacyTasks = localReadTasksSync();
  if (legacyTasks.length) await localDatabaseWrite(storageKey, legacyTasks);
  return legacyTasks;
}

async function localWriteTasks(nextTasks) {
  const saved = await localDatabaseWrite(storageKey, nextTasks);
  localStorage.setItem(storageKey, JSON.stringify(nextTasks));
  return saved;
}

function localCleanTask(input, existing = {}) {
  const text = String(input.text || existing.text || "").trim();
  if (!text) throw new Error("事情内容不能为空");
  return {
    id: existing.id || crypto.randomUUID(),
    type: input.type || existing.type || "task",
    text: text.slice(0, 300),
    dueAt: input.dueAt === undefined ? existing.dueAt || null : input.dueAt,
    reminderMinutes: Number(input.reminderMinutes ?? existing.reminderMinutes ?? defaultReminderMinutes),
    tags: Array.isArray(input.tags) ? input.tags.slice(0, 12) : existing.tags || [],
    weekdays: Array.isArray(input.weekdays) ? input.weekdays.slice(0, 7) : existing.weekdays || [],
    amount: input.amount === undefined ? existing.amount ?? null : input.amount,
    category: String(input.category || existing.category || "").slice(0, 40),
    repeat: input.repeat || existing.repeat || "none",
    repeatCount: input.repeatCount === undefined || input.repeatCount === "" ? existing.repeatCount ?? null : Number(input.repeatCount),
    reminderRuns: Number(input.reminderRuns ?? existing.reminderRuns ?? 0),
    reminderHistory: Array.isArray(input.reminderHistory) ? input.reminderHistory : existing.reminderHistory || [],
    remindedAt: input.remindedAt === undefined ? existing.remindedAt || null : input.remindedAt,
    note: String(input.note || existing.note || "").slice(0, 1000),
    sketch: input.sketch === undefined ? existing.sketch || "" : String(input.sketch || ""),
    done: Boolean(input.done ?? existing.done ?? false),
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

async function localApi(path, options = {}) {
  const method = options.method || "GET";
  const current = await localReadTasks();
  const body = options.body ? JSON.parse(options.body) : {};

  if (method === "GET" && path === "/api/tasks") return current;

  if (method === "POST" && path === "/api/tasks") {
    const task = localCleanTask(body);
    await localWriteTasks([task, ...current]);
    return task;
  }

  if (method === "PUT" && path === "/api/tasks") {
    const imported = Array.isArray(body.tasks) ? body.tasks : [];
    await localWriteTasks(imported);
    return imported;
  }

  const match = path.match(/^\/api\/tasks\/([^/]+)$/);
  if (!match) throw new Error("无效操作");

  const index = current.findIndex((task) => task.id === match[1]);
  if (index === -1) throw new Error("没有找到这条记录");

  if (method === "PATCH") {
    const updated = localCleanTask(body, current[index]);
    current[index] = updated;
    await localWriteTasks(current);
    return updated;
  }

  if (method === "DELETE") {
    const [removed] = current.splice(index, 1);
    await localWriteTasks(current);
    return removed;
  }

  throw new Error("无效操作");
}

async function loadTasks() {
  tasks = await api("/api/tasks");
  render();
}

function matchingTasks() {
  let visible;
  if (selectedDateKey) {
    visible = tasksForDate(selectedDateKey).filter((task) => !task.done);
  } else if (filter === "active") {
    visible = tasks.filter((task) => task.type !== "expense" && !task.done);
  } else if (filter === "history") {
    visible = tasks.filter(hasHistory);
  } else {
    visible = tasks.filter((task) => bucket(task) === filter);
  }

  if (!searchTerm) return visible;
  const needle = searchTerm.toLowerCase();
  return visible.filter((task) => {
    const haystack = [task.text, task.category, ...(task.tags || [])].join(" ").toLowerCase();
    return haystack.includes(needle);
  });
}

function renderSummary() {
  todayCount.textContent = tasks.filter((task) => bucket(task) === "today").length;
  laterCount.textContent = tasks.filter((task) => bucket(task) === "later").length;
  overdueCount.textContent = tasks.filter((task) => bucket(task) === "overdue").length;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const total = tasks
    .filter((task) => task.type === "expense" && new Date(task.createdAt) >= monthStart)
    .reduce((sum, task) => sum + Number(task.amount || 0), 0);
  expenseTotal.textContent = total.toFixed(total % 1 ? 2 : 0);
}

function renderConflicts() {
  const dated = tasks.filter((task) => !task.done && task.dueAt);
  const pairs = [];
  for (let i = 0; i < dated.length; i += 1) {
    for (let j = i + 1; j < dated.length; j += 1) {
      const gap = Math.abs(new Date(dated[i].dueAt) - new Date(dated[j].dueAt));
      if (gap < 30 * 60 * 1000) pairs.push([dated[i], dated[j]]);
    }
  }
  if (!pairs.length) {
    conflicts.hidden = true;
    conflicts.textContent = "";
    return;
  }
  conflicts.hidden = false;
  conflicts.textContent = t("conflict")(pairs.length);
}

function tasksForDate(key) {
  return tasks.filter((task) => task.type !== "expense" && task.dueAt && dateKey(new Date(task.dueAt)) === key);
}

function renderCalendar() {
  const now = new Date();
  const todayKey = dateKey(now);
  let days = [];

  if (calendarMode === "today") {
    days = [startOfDay(now)];
    calendarTitle.textContent = t("calendar.titleToday");
  } else if (calendarMode === "week") {
    const start = addDays(startOfDay(now), -((now.getDay() + 6) % 7));
    days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
    calendarTitle.textContent = t("calendar.titleWeek");
  } else {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const offset = (monthStart.getDay() + 6) % 7;
    const gridStart = addDays(monthStart, -offset);
    days = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
    calendarTitle.textContent = new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", { year: "numeric", month: "long" }).format(now);
  }

  calendarGrid.innerHTML = "";
  t("calendar.weekdays").forEach((label) => {
    const weekday = document.createElement("div");
    weekday.className = "calendarWeekday";
    weekday.textContent = label;
    calendarGrid.append(weekday);
  });

  days.forEach((day) => {
    const key = dateKey(day);
    const dayTasks = tasksForDate(key).filter((task) => !task.done);
    const overdue = dayTasks.filter((task) => new Date(task.dueAt) < now).length;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendarDay";
    button.classList.toggle("today", key === todayKey);
    button.classList.toggle("selected", key === selectedDateKey);
    button.classList.toggle("muted", calendarMode === "month" && day.getMonth() !== now.getMonth());
    button.innerHTML = `<span class="calendarDate">${day.getDate()}</span>`;

    if (dayTasks.length) {
      const count = document.createElement("span");
      count.className = `calendarCount ${overdue ? "warn" : ""}`;
      count.textContent = overdue ? `${dayTasks.length} / ${overdue} ${t("calendar.overdue")}` : `${dayTasks.length} ${t("calendar.item")}`;
      button.append(count);
    }

    button.addEventListener("click", () => {
      selectedDateKey = selectedDateKey === key ? "" : key;
      filter = selectedDateKey ? "active" : filter;
      render();
    });
    calendarGrid.append(button);
  });

  selectedDayLabel.textContent = selectedDateKey
    ? language === "zh" ? `${selectedDateKey} ${t("calendar.selected")}` : `${selectedDateKey} ${t("calendar.selected")}`
    : t("calendar.selectedDefault");
  calendarToday.classList.toggle("active", calendarMode === "today");
  calendarWeek.classList.toggle("active", calendarMode === "week");
  calendarMonth.classList.toggle("active", calendarMode === "month");
}

function render() {
  renderSummary();
  renderConflicts();
  renderCalendar();
  list.innerHTML = "";
  const visible = matchingTasks();

  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.filter === filter));

  if (!visible.length) {
    list.innerHTML = `<p class="empty">${t("empty")}</p>`;
    return;
  }

  visible
    .sort((a, b) => {
      if (!a.dueAt && !b.dueAt) return new Date(b.createdAt) - new Date(a.createdAt);
      if (!a.dueAt) return 1;
      if (!b.dueAt) return -1;
      return new Date(a.dueAt) - new Date(b.dueAt);
    })
    .forEach((task) => {
      const node = template.content.firstElementChild.cloneNode(true);
      node.classList.toggle("done", task.done);
      node.querySelector(".taskText").textContent = task.text;
      node.querySelector(".checkButton").addEventListener("click", () => updateTask(task, { done: !task.done }));
      node.querySelector(".deleteButton").addEventListener("click", () => deleteTask(task));
      node.querySelector(".editButton").addEventListener("click", () => startEdit(task));

      const meta = node.querySelector(".meta");
      const pill = document.createElement("span");
      pill.className = `pill ${bucket(task) === "overdue" ? "warn" : ""}`;
      pill.textContent = task.type === "expense" ? t("taskLabels.expense") : formatDue(task.dueAt);
      meta.append(pill);

      if (task.type === "expense") {
        const moneyPill = document.createElement("span");
        moneyPill.className = "pill money";
        moneyPill.textContent = `${task.category || t("taskLabels.uncategorized")} ${Number(task.amount || 0).toFixed(2)} ${t("taskLabels.currency")}`;
        meta.append(moneyPill);
      }

      if (task.dueAt && !task.done) {
        const remindPill = document.createElement("span");
        remindPill.className = "pill remindSoon";
        remindPill.textContent = language === "zh"
          ? `${t("taskLabels.remindPrefix")} ${task.reminderMinutes ?? defaultReminderMinutes} ${t("taskLabels.remindSuffix")}`
          : `${task.reminderMinutes ?? defaultReminderMinutes} ${t("taskLabels.remindSuffix")}`;
        meta.append(remindPill);
      }

      if (task.repeat && task.repeat !== "none") {
        const repeatPill = document.createElement("span");
        repeatPill.className = "pill";
        const repeatName = t(`repeatOptions.${task.repeat}`);
        const weekdayNames = language === "zh" ? ["日", "一", "二", "三", "四", "五", "六"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const weekdays = task.weekdays?.length ? ` ${task.weekdays.map((day) => weekdayNames[day]).join("")}` : "";
        const limit = task.repeatCount ? `, ${t("taskLabels.repeatLimit")} ${task.repeatCount} ${t("taskLabels.times")}` : "";
        repeatPill.textContent = `${repeatName}${weekdays} ${t("taskLabels.repeatSuffix")}${limit}`;
        meta.append(repeatPill);
      }

      if (task.reminderHistory?.length) {
        const historyPill = document.createElement("span");
        historyPill.className = "pill";
        historyPill.textContent = `${t("taskLabels.reminded")} ${task.reminderHistory.length} ${t("taskLabels.times")}`;
        meta.append(historyPill);
      }

      (task.tags || []).forEach((tag) => {
        const tagPill = document.createElement("span");
        tagPill.className = "pill";
        tagPill.textContent = `#${tag}`;
        meta.append(tagPill);
      });

      if (task.sketch) {
        const image = node.querySelector(".sketchPreview");
        image.src = task.sketch;
        image.hidden = false;
      }

      list.append(node);
    });
}

async function updateTask(task, patch) {
  const updated = await api(`/api/tasks/${task.id}`, {
    method: "PATCH",
    body: JSON.stringify({ ...task, ...patch })
  });
  tasks = tasks.map((item) => item.id === task.id ? updated : item);
  render();
}

function setMode(nextMode) {
  mode = nextMode;
  modeButtons.forEach((item) => item.classList.toggle("active", item.dataset.mode === mode));
  expenseFields.hidden = mode !== "expense";
  modeStatus.textContent = mode === "expense" ? t("modeExpenseStatus") : t("modeTaskStatus");
  textInput.placeholder = mode === "expense" ? t("expensePlaceholder") : t("taskPlaceholder");
}

function resetForm() {
  editingTaskId = null;
  textInput.value = "";
  expenseAmount.value = "";
  expenseCategory.value = "";
  taskTags.value = "";
  reminderMinutesInput.value = "";
  repeatRule.value = "none";
  repeatCount.value = "";
  saveTask.textContent = t("save");
  cancelEdit.hidden = true;
  setMode("task");
}

function startEdit(task) {
  editingTaskId = task.id;
  setMode(task.type === "expense" ? "expense" : "task");
  textInput.value = task.text || "";
  expenseAmount.value = task.amount ?? "";
  expenseCategory.value = task.category || "";
  taskTags.value = (task.tags || []).join(", ");
  reminderMinutesInput.value = task.reminderMinutes ?? "";
  repeatRule.value = task.repeat || "none";
  repeatCount.value = task.repeatCount ?? "";
  saveTask.textContent = t("saveEdit");
  cancelEdit.hidden = false;
  textInput.focus();
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function remindedIds() {
  try {
    const stored = JSON.parse(localStorage.getItem(reminderStorageKey) || "[]");
    return new Set(Array.isArray(stored) ? stored : []);
  } catch {
    return new Set();
  }
}

function saveRemindedIds(ids) {
  localStorage.setItem(reminderStorageKey, JSON.stringify([...ids].slice(-200)));
}

function playReminderSound() {
  if (!audioReady) return;
  audioContext ||= new AudioContext();
  if (audioContext.state === "suspended") audioContext.resume();
  const gain = audioContext.createGain();
  gain.gain.setValueAtTime(0.001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.6);
  gain.connect(audioContext.destination);

  [0, 0.24].forEach((offset) => {
    const oscillator = audioContext.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime + offset);
    oscillator.connect(gain);
    oscillator.start(audioContext.currentTime + offset);
    oscillator.stop(audioContext.currentTime + offset + 0.18);
  });
}

function showReminder(task) {
  const message = t("reminderMessage")(task.text, formatDue(task.dueAt));
  reminderNotice.hidden = false;
  reminderMessage.textContent = message;
  activeReminderTaskId = task.id;
  playReminderSound();

  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(t("appTitle"), { body: message });
  }

  setTimeout(() => {
    if (reminderMessage.textContent === message) reminderNotice.hidden = true;
  }, 30000);
}

function hideReminder() {
  reminderNotice.hidden = true;
  activeReminderTaskId = null;
}

function moveTaskDue(task, nextDueAt) {
  return updateTask(task, {
    dueAt: nextDueAt,
    remindedAt: null
  });
}

async function handleReminderAction(action) {
  const task = tasks.find((item) => item.id === activeReminderTaskId);
  if (!task) {
    hideReminder();
    return;
  }

  if (action === "complete") {
    await updateTask(task, { done: true });
  }

  if (action === "snooze") {
    await moveTaskDue(task, new Date(Date.now() + 10 * 60 * 1000).toISOString());
  }

  if (action === "tomorrow") {
    const next = addDays(new Date(), 1);
    next.setSeconds(0, 0);
    await moveTaskDue(task, next.toISOString());
  }

  if (action === "skip") {
    if (task.repeat && task.repeat !== "none" && task.dueAt) {
      await moveTaskDue(task, nextWeekdayRepeat(task.dueAt, task.weekdays) || nextRepeatDate(task.dueAt, task.repeat));
    }
  }

  hideReminder();
}

async function applyReminder(task) {
  const history = [...(task.reminderHistory || []), new Date().toISOString()];
  const nextRuns = Number(task.reminderRuns || 0) + 1;
  const shouldRepeat = task.repeat && task.repeat !== "none" && (!task.repeatCount || nextRuns < task.repeatCount);
  const patch = {
    remindedAt: new Date().toISOString(),
    reminderHistory: history,
    reminderRuns: nextRuns
  };

  if (shouldRepeat) {
    patch.dueAt = nextWeekdayRepeat(task.dueAt, task.weekdays) || nextRepeatDate(task.dueAt, task.repeat);
  }

  await updateTask(task, patch);
}

async function checkReminders() {
  if (!remindersEnabled) return;
  const now = new Date();
  const ids = remindedIds();
  let changed = false;

  for (const task of tasks) {
    const reminderKey = `${task.id}:${task.dueAt}`;
    if (task.done || task.type === "expense" || !task.dueAt || ids.has(reminderKey)) continue;
    const remindAt = reminderTime(task);
    const dueAt = new Date(task.dueAt);
    if (remindAt && now >= remindAt && now <= dueAt) {
      ids.add(reminderKey);
      changed = true;
      showReminder(task);
      await applyReminder(task);
    }
  }

  if (changed) saveRemindedIds(ids);
}

function calculateExpression() {
  const expression = calculatorInput.value.trim();
  if (!expression) {
    calculatorResult.textContent = t("result");
    return;
  }
  if (!/^[\d+\-*/().\s]+$/.test(expression)) {
    calculatorResult.textContent = t("calcNumberOnly");
    return;
  }
  try {
    const value = Function(`"use strict"; return (${expression})`)();
    calculatorResult.textContent = Number.isFinite(value) ? String(Math.round(value * 100) / 100) : t("calcUnknown");
  } catch {
    calculatorResult.textContent = t("calcBadFormat");
  }
}

function exportBackup() {
  const backup = {
    app: "personal-todo",
    version: "0.5.1",
    exportedAt: new Date().toISOString(),
    tasks
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `personal-todo-backup-${dateKey(new Date())}.json`;
  link.click();
  URL.revokeObjectURL(url);
  dataStatus.textContent = t("exported")(tasks.length);
}

async function importBackup(file) {
  try {
    const raw = await file.text();
    const parsed = JSON.parse(raw);
    const imported = Array.isArray(parsed) ? parsed : parsed.tasks;
    if (!Array.isArray(imported)) throw new Error("备份格式不对");
    const cleaned = [];
    imported.forEach((task) => {
      try {
        cleaned.push(localCleanTask(task, task));
      } catch {
        // Ignore malformed rows in user-provided backup files.
      }
    });
    if (hasServer) {
      tasks = await api("/api/tasks", {
        method: "PUT",
        body: JSON.stringify({ tasks: cleaned })
      });
    } else {
      tasks = cleaned;
      await localWriteTasks(tasks);
    }
    dataStatus.textContent = t("imported")(tasks.length);
    render();
  } catch {
    dataStatus.textContent = t("importFailed");
  } finally {
    importFile.value = "";
  }
}

async function deleteTask(task) {
  await api(`/api/tasks/${task.id}`, { method: "DELETE" });
  tasks = tasks.filter((item) => item.id !== task.id);
  render();
}

function resetCanvas() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  hasSketch = false;
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const point = event.touches?.[0] || event;
  return {
    x: (point.clientX - rect.left) * (canvas.width / rect.width),
    y: (point.clientY - rect.top) * (canvas.height / rect.height)
  };
}

function beginDraw(event) {
  drawing = true;
  hasSketch = true;
  const point = canvasPoint(event);
  context.beginPath();
  context.moveTo(point.x, point.y);
}

function draw(event) {
  if (!drawing) return;
  event.preventDefault();
  const point = canvasPoint(event);
  context.lineTo(point.x, point.y);
  context.stroke();
}

function endDraw() {
  drawing = false;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = textInput.value.trim();
  if (!text) {
    dataStatus.textContent = t("emptyText");
    return;
  }

  try {
    const selectedMode = mode === "expense" || /^记账/.test(text) ? "expense" : "task";
    const dueAt = parseTime(text);
    const amount = selectedMode === "expense" ? Number(expenseAmount.value || parseAmount(text) || 0) : null;
    const existing = editingTaskId ? tasks.find((task) => task.id === editingTaskId) : null;
    const reminderMinutes = reminderMinutesInput.value === "" ? parseReminderMinutes(text) : Number(reminderMinutesInput.value);
    const weekdays = parseWeekdays(text);

    const payload = {
      type: selectedMode,
      text,
      dueAt: selectedMode === "expense" ? null : dueAt || existing?.dueAt || null,
      reminderMinutes,
      tags: parseTags(taskTags.value),
      weekdays: weekdays.length ? weekdays : existing?.weekdays || [],
      amount,
      category: selectedMode === "expense" ? expenseCategory.value.trim() : "",
      repeat: repeatRule.value !== "none" ? repeatRule.value : parseRepeat(text),
      repeatCount: repeatCount.value,
      sketch: hasSketch ? canvas.toDataURL("image/png") : existing?.sketch || ""
    };

    if (existing) {
      await updateTask(existing, payload);
    } else {
      const task = await api("/api/tasks", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      tasks.unshift(task);
    }

    resetForm();
    resetCanvas();
    sketchPanel.hidden = true;
    selectedDateKey = "";
    searchInput.value = "";
    searchTerm = "";
    filter = selectedMode === "expense" ? "expense" : "active";
    dataStatus.textContent = t("saved");
    render();
  } catch {
    dataStatus.textContent = t("saveFailed");
  }
});

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    selectedDateKey = "";
    filter = tab.dataset.filter;
    render();
  });
});

calendarToday.addEventListener("click", () => {
  calendarMode = "today";
  selectedDateKey = dateKey(new Date());
  render();
});

calendarWeek.addEventListener("click", () => {
  calendarMode = "week";
  selectedDateKey = "";
  render();
});

calendarMonth.addEventListener("click", () => {
  calendarMode = "month";
  selectedDateKey = "";
  render();
});

reminderActions.forEach((button) => {
  button.addEventListener("click", () => handleReminderAction(button.dataset.reminderAction));
});

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setMode(button.dataset.mode);
    if (mode === "expense") expenseAmount.focus();
  });
});

cancelEdit.addEventListener("click", () => {
  resetForm();
  resetCanvas();
  sketchPanel.hidden = true;
});

calculatorForm.addEventListener("submit", (event) => {
  event.preventDefault();
  calculateExpression();
});

calculatorInput.addEventListener("input", calculateExpression);
exportData.addEventListener("click", exportBackup);
importData.addEventListener("click", () => importFile.click());
importFile.addEventListener("change", () => {
  const [file] = importFile.files;
  if (file) importBackup(file);
});
searchInput.addEventListener("input", () => {
  searchTerm = searchInput.value.trim();
  render();
});
clearSearch.addEventListener("click", () => {
  searchInput.value = "";
  searchTerm = "";
  render();
});

sketchToggle.addEventListener("click", () => {
  sketchPanel.hidden = !sketchPanel.hidden;
});

clearSketch.addEventListener("click", resetCanvas);
enableReminders.addEventListener("click", async () => {
  if (remindersEnabled) {
    remindersEnabled = false;
    audioReady = false;
    reminderStatus.textContent = t("reminderOff");
    enableReminders.textContent = t("enableReminders");
    enableReminders.classList.remove("active");
    return;
  }

  remindersEnabled = true;
  audioReady = true;
  audioContext ||= new AudioContext();
  await audioContext.resume();
  if ("Notification" in window && Notification.permission === "default") {
    await Notification.requestPermission();
  }
  enableReminders.textContent = t("disableReminders");
  enableReminders.classList.add("active");
  reminderStatus.textContent = t("reminderOn");
  checkReminders();
});
canvas.addEventListener("mousedown", beginDraw);
canvas.addEventListener("mousemove", draw);
window.addEventListener("mouseup", endDraw);
canvas.addEventListener("touchstart", beginDraw, { passive: false });
canvas.addEventListener("touchmove", draw, { passive: false });
window.addEventListener("touchend", endDraw);

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  installApp.hidden = false;
  setPwaStatus("pwaReady");
});

window.addEventListener("appinstalled", () => {
  installPrompt = null;
  installApp.hidden = true;
  setPwaStatus("pwaInstalled");
});

installApp.addEventListener("click", async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  const result = await installPrompt.userChoice;
  setPwaStatus(result.outcome === "accepted" ? "pwaInstallAccepted" : "pwaInstallDismissed");
  installPrompt = null;
  installApp.hidden = true;
});

async function registerPwa() {
  if (location.protocol === "file:") {
    setPwaStatus("pwaFile");
    return;
  }

  if (!("serviceWorker" in navigator)) {
    setPwaStatus("pwaUnsupported");
    return;
  }

  try {
    await navigator.serviceWorker.register("./sw.js?v=0.5.1");
    setPwaStatus("pwaOfflineReady");
  } catch {
    setPwaStatus("pwaOfflineFailed");
  }
}

languageSelect.addEventListener("change", () => {
  language = languageSelect.value;
  localStorage.setItem(languageStorageKey, language);
  applyLanguage();
});

applyLanguage();
loadTasks();
registerPwa();
setInterval(checkReminders, 10000);
