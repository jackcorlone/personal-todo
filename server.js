import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(root, "public");
const dataDir = join(root, "data");
const dataFile = join(dataDir, "tasks.json");
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

async function ensureStore() {
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(dataFile)) {
    await writeFile(dataFile, "[]\n", "utf8");
  }
}

async function readTasks() {
  await ensureStore();
  const raw = await readFile(dataFile, "utf8");
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeTasks(tasks) {
  await ensureStore();
  await writeFile(dataFile, `${JSON.stringify(tasks, null, 2)}\n`, "utf8");
}

async function readBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 1_000_000) throw new Error("Request too large");
  }
  return body ? JSON.parse(body) : {};
}

function send(response, status, data, contentType = "application/json; charset=utf-8") {
  response.writeHead(status, {
    "Content-Type": contentType,
    "Cache-Control": "no-store"
  });
  response.end(typeof data === "string" ? data : JSON.stringify(data));
}

function cleanTask(input, existing = {}) {
  const text = String(input.text || existing.text || "").trim();
  if (!text) return null;
  return {
    id: existing.id || crypto.randomUUID(),
    type: input.type || existing.type || "task",
    text: text.slice(0, 300),
    dueAt: input.dueAt === undefined ? existing.dueAt || null : input.dueAt,
    reminderMinutes: Number(input.reminderMinutes ?? existing.reminderMinutes ?? 2),
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

async function handleApi(request, response, url) {
  const tasks = await readTasks();

  if (request.method === "GET" && url.pathname === "/api/tasks") {
    send(response, 200, tasks);
    return true;
  }

  if (request.method === "POST" && url.pathname === "/api/tasks") {
    const task = cleanTask(await readBody(request));
    if (!task) {
      send(response, 400, { error: "事情内容不能为空" });
      return true;
    }
    tasks.unshift(task);
    await writeTasks(tasks);
    send(response, 201, task);
    return true;
  }

  const taskMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)$/);
  if (!taskMatch) return false;

  const index = tasks.findIndex((task) => task.id === taskMatch[1]);
  if (index === -1) {
    send(response, 404, { error: "没有找到这条记录" });
    return true;
  }

  if (request.method === "PATCH") {
    const updated = cleanTask(await readBody(request), tasks[index]);
    if (!updated) {
      send(response, 400, { error: "事情内容不能为空" });
      return true;
    }
    tasks[index] = updated;
    await writeTasks(tasks);
    send(response, 200, updated);
    return true;
  }

  if (request.method === "DELETE") {
    const [removed] = tasks.splice(index, 1);
    await writeTasks(tasks);
    send(response, 200, removed);
    return true;
  }

  return false;
}

async function handleStatic(response, url) {
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const safePath = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(publicDir, safePath);
  if (!filePath.startsWith(publicDir)) {
    send(response, 403, "Forbidden", "text/plain; charset=utf-8");
    return;
  }
  try {
    const content = await readFile(filePath);
    send(response, 200, content, types[extname(filePath)] || "application/octet-stream");
  } catch {
    send(response, 404, "Not found", "text/plain; charset=utf-8");
  }
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host}`);
    if (url.pathname.startsWith("/api/") && await handleApi(request, response, url)) return;
    await handleStatic(response, url);
  } catch (error) {
    send(response, 500, { error: error.message || "服务器出错了" });
  }
});

server.listen(port, host, () => {
  console.log(`Personal Todo is running at http://${host}:${port}`);
});
