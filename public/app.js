const form = document.querySelector("#taskForm");
const textInput = document.querySelector("#taskText");
const list = document.querySelector("#taskList");
const template = document.querySelector("#taskTemplate");
const tabs = document.querySelectorAll(".tab");
const conflicts = document.querySelector("#conflicts");
const todayCount = document.querySelector("#todayCount");
const laterCount = document.querySelector("#laterCount");
const overdueCount = document.querySelector("#overdueCount");
const sketchToggle = document.querySelector("#sketchToggle");
const sketchPanel = document.querySelector("#sketchPanel");
const clearSketch = document.querySelector("#clearSketch");
const canvas = document.querySelector("#sketchCanvas");
const context = canvas.getContext("2d");
const enableReminders = document.querySelector("#enableReminders");
const reminderStatus = document.querySelector("#reminderStatus");
const reminderNotice = document.querySelector("#reminderNotice");
const storageKey = "personal-todo.tasks";
const reminderStorageKey = "personal-todo.reminded";
const hasServer = location.protocol !== "file:";
const defaultReminderMinutes = 2;

let tasks = [];
let filter = "active";
let drawing = false;
let hasSketch = false;
let audioReady = false;
let audioContext = null;

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

function parseTime(text) {
  const now = new Date();
  let day = null;

  if (/今天/.test(text)) day = startOfDay(now);
  if (/明天/.test(text)) day = addDays(startOfDay(now), 1);
  if (/后天/.test(text)) day = addDays(startOfDay(now), 2);

  const dateMatch = text.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]?/);
  if (dateMatch) {
    day = new Date(now.getFullYear(), Number(dateMatch[1]) - 1, Number(dateMatch[2]));
  }

  const weekMatch = text.match(/周([一二三四五六日天])/);
  if (weekMatch) {
    const map = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0 };
    const target = map[weekMatch[1]];
    const current = now.getDay();
    let offset = (target - current + 7) % 7;
    if (offset === 0) offset = 7;
    day = addDays(startOfDay(now), offset);
  }

  if (!day) return null;

  let hour = 9;
  let minute = 0;
  const timeMatch = text.match(/(\d{1,2})(?:[:：点](\d{1,2})?)?\s*(?:分)?/);
  if (timeMatch && !dateMatch?.[0].includes(timeMatch[0])) {
    hour = Number(timeMatch[1]);
    minute = Number(timeMatch[2] || 0);
  } else if (/晚上|夜里/.test(text)) {
    hour = 20;
  } else if (/下午/.test(text)) {
    hour = 15;
  } else if (/中午/.test(text)) {
    hour = 12;
  } else if (/早上|上午/.test(text)) {
    hour = 9;
  }

  if ((/下午|晚上|夜里/.test(text)) && hour < 12) hour += 12;
  day.setHours(Math.min(hour, 23), Math.min(minute, 59), 0, 0);
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
  if (task.done) return "done";
  if (!task.dueAt) return "later";
  const due = new Date(task.dueAt);
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  if (due < new Date()) return "overdue";
  if (due >= today && due < tomorrow) return "today";
  return "later";
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
    text: text.slice(0, 300),
    dueAt: input.dueAt === undefined ? existing.dueAt || null : input.dueAt,
    reminderMinutes: Number(input.reminderMinutes ?? existing.reminderMinutes ?? defaultReminderMinutes),
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
  if (filter === "active") return tasks.filter((task) => !task.done);
  return tasks.filter((task) => bucket(task) === filter);
}

function renderSummary() {
  todayCount.textContent = tasks.filter((task) => bucket(task) === "today").length;
  laterCount.textContent = tasks.filter((task) => bucket(task) === "later").length;
  overdueCount.textContent = tasks.filter((task) => bucket(task) === "overdue").length;
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

function render() {
  renderSummary();
  renderConflicts();
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

      const meta = node.querySelector(".meta");
      const pill = document.createElement("span");
      pill.className = `pill ${bucket(task) === "overdue" ? "warn" : ""}`;
      pill.textContent = formatDue(task.dueAt);
      meta.append(pill);

      if (task.dueAt && !task.done) {
        const remindPill = document.createElement("span");
        remindPill.className = "pill remindSoon";
        remindPill.textContent = `提前 ${task.reminderMinutes ?? defaultReminderMinutes} 分钟提醒`;
        meta.append(remindPill);
      }

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
  reminderNotice.textContent = message;
  playReminderSound();

  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("个人待办提醒助手", { body: message });
  }

  setTimeout(() => {
    if (reminderNotice.textContent === message) reminderNotice.hidden = true;
  }, 30000);
}

function checkReminders() {
  const now = new Date();
  const ids = remindedIds();
  let changed = false;

  tasks.forEach((task) => {
    if (task.done || !task.dueAt || ids.has(task.id)) return;
    const remindAt = reminderTime(task);
    const dueAt = new Date(task.dueAt);
    if (remindAt && now >= remindAt && now <= dueAt) {
      ids.add(task.id);
      changed = true;
      showReminder(task);
    }
  });

  if (changed) saveRemindedIds(ids);
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

  const task = await api("/api/tasks", {
    method: "POST",
    body: JSON.stringify({
      text,
      dueAt: parseTime(text),
      reminderMinutes: parseReminderMinutes(text),
      sketch: hasSketch ? canvas.toDataURL("image/png") : ""
    })
  });

  tasks.unshift(task);
  textInput.value = "";
  resetCanvas();
  sketchPanel.hidden = true;
  render();
});

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    filter = tab.dataset.filter;
    render();
  });
});

sketchToggle.addEventListener("click", () => {
  sketchPanel.hidden = !sketchPanel.hidden;
});

clearSketch.addEventListener("click", resetCanvas);
enableReminders.addEventListener("click", async () => {
  audioReady = true;
  audioContext ||= new AudioContext();
  await audioContext.resume();
  if ("Notification" in window && Notification.permission === "default") {
    await Notification.requestPermission();
  }
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
