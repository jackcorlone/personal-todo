const form = document.querySelector("#taskForm");
const textInput = document.querySelector("#taskText");
const list = document.querySelector("#taskList");
const template = document.querySelector("#taskTemplate");
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
  if (!iso) return "没有时间";
  const date = new Date(iso);
  return new Intl.DateTimeFormat("zh-CN", {
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

async function api(path, options = {}) {
  if (!hasServer) return localApi(path, options);

  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!response.ok) throw new Error("保存失败");
  return response.json();
}

function localReadTasks() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function localWriteTasks(nextTasks) {
  localStorage.setItem(storageKey, JSON.stringify(nextTasks));
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
  const current = localReadTasks();
  const body = options.body ? JSON.parse(options.body) : {};

  if (method === "GET" && path === "/api/tasks") return current;

  if (method === "POST" && path === "/api/tasks") {
    const task = localCleanTask(body);
    localWriteTasks([task, ...current]);
    return task;
  }

  const match = path.match(/^\/api\/tasks\/([^/]+)$/);
  if (!match) throw new Error("无效操作");

  const index = current.findIndex((task) => task.id === match[1]);
  if (index === -1) throw new Error("没有找到这条记录");

  if (method === "PATCH") {
    const updated = localCleanTask(body, current[index]);
    current[index] = updated;
    localWriteTasks(current);
    return updated;
  }

  if (method === "DELETE") {
    const [removed] = current.splice(index, 1);
    localWriteTasks(current);
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
  conflicts.textContent = `有 ${pairs.length} 组事情时间接近，可能会冲突。`;
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
    calendarTitle.textContent = "今天";
  } else if (calendarMode === "week") {
    const start = addDays(startOfDay(now), -((now.getDay() + 6) % 7));
    days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
    calendarTitle.textContent = "本周";
  } else {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const offset = (monthStart.getDay() + 6) % 7;
    const gridStart = addDays(monthStart, -offset);
    days = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
    calendarTitle.textContent = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long" }).format(now);
  }

  calendarGrid.innerHTML = "";
  ["一", "二", "三", "四", "五", "六", "日"].forEach((label) => {
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
      count.textContent = overdue ? `${dayTasks.length} / ${overdue}过期` : `${dayTasks.length} 件`;
      button.append(count);
    }

    button.addEventListener("click", () => {
      selectedDateKey = selectedDateKey === key ? "" : key;
      filter = selectedDateKey ? "active" : filter;
      render();
    });
    calendarGrid.append(button);
  });

  selectedDayLabel.textContent = selectedDateKey ? `${selectedDateKey} 的待办` : "选择日期查看事项";
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
    list.innerHTML = '<p class="empty">这里暂时没有事情。</p>';
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
      pill.textContent = task.type === "expense" ? "记账" : formatDue(task.dueAt);
      meta.append(pill);

      if (task.type === "expense") {
        const moneyPill = document.createElement("span");
        moneyPill.className = "pill money";
        moneyPill.textContent = `${task.category || "未分类"} ${Number(task.amount || 0).toFixed(2)} 元`;
        meta.append(moneyPill);
      }

      if (task.dueAt && !task.done) {
        const remindPill = document.createElement("span");
        remindPill.className = "pill remindSoon";
        remindPill.textContent = `提前 ${task.reminderMinutes ?? defaultReminderMinutes} 分钟提醒`;
        meta.append(remindPill);
      }

      if (task.repeat && task.repeat !== "none") {
        const repeatPill = document.createElement("span");
        repeatPill.className = "pill";
        const repeatName = { daily: "每天", weekly: "每周", monthly: "每月" }[task.repeat];
        const weekdayNames = ["日", "一", "二", "三", "四", "五", "六"];
        const weekdays = task.weekdays?.length ? ` ${task.weekdays.map((day) => weekdayNames[day]).join("")}` : "";
        const limit = task.repeatCount ? `，共 ${task.repeatCount} 次` : "";
        repeatPill.textContent = `${repeatName}${weekdays}重复${limit}`;
        meta.append(repeatPill);
      }

      if (task.reminderHistory?.length) {
        const historyPill = document.createElement("span");
        historyPill.className = "pill";
        historyPill.textContent = `已提醒 ${task.reminderHistory.length} 次`;
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
  modeStatus.textContent = mode === "expense" ? "当前是记账模式，填写金额和分类后会计入本月支出。" : "当前是待办模式，可以记录提醒、重复事项和临时想法。";
  textInput.placeholder = mode === "expense" ? "例如：买菜、咖啡、交通" : "例如：明天上午 10 点交电费；周五前回复老王；有空整理桌面";
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
  saveTask.textContent = "记下来";
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
  saveTask.textContent = "保存修改";
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
  const message = `提醒：${task.text}（${formatDue(task.dueAt)}）`;
  reminderNotice.hidden = false;
  reminderMessage.textContent = message;
  activeReminderTaskId = task.id;
  playReminderSound();

  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("个人待办提醒助手", { body: message });
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
    calculatorResult.textContent = "结果";
    return;
  }
  if (!/^[\d+\-*/().\s]+$/.test(expression)) {
    calculatorResult.textContent = "只能计算数字";
    return;
  }
  try {
    const value = Function(`"use strict"; return (${expression})`)();
    calculatorResult.textContent = Number.isFinite(value) ? String(Math.round(value * 100) / 100) : "算不出";
  } catch {
    calculatorResult.textContent = "格式不对";
  }
}

function exportBackup() {
  const backup = {
    app: "personal-todo",
    version: "0.4.0",
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
  dataStatus.textContent = `已导出 ${tasks.length} 条记录。`;
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
      localWriteTasks(tasks);
    }
    dataStatus.textContent = `已导入 ${tasks.length} 条记录。`;
    render();
  } catch {
    dataStatus.textContent = "导入失败，请确认是 JSON 备份文件。";
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
  if (!text) return;

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
  render();
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
    reminderStatus.textContent = "已关闭。不会响铃，也不会弹出系统通知。";
    enableReminders.textContent = "开启声音和弹窗";
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
  enableReminders.textContent = "关闭声音和弹窗";
  enableReminders.classList.add("active");
  reminderStatus.textContent = "已开启。保持这个网页打开，到提醒时间会响一声并弹出提示。";
  checkReminders();
});
canvas.addEventListener("mousedown", beginDraw);
canvas.addEventListener("mousemove", draw);
window.addEventListener("mouseup", endDraw);
canvas.addEventListener("touchstart", beginDraw, { passive: false });
canvas.addEventListener("touchmove", draw, { passive: false });
window.addEventListener("touchend", endDraw);

loadTasks();
setInterval(checkReminders, 10000);
