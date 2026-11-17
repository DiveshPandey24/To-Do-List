
const STORAGE_KEY = "focusflow_tasks_v1";
const THEME_KEY = "focusflow_theme_v1";

const elements = {
  form: document.getElementById("taskForm"),
  input: document.getElementById("taskInput"),
  dueDate: document.getElementById("dueDate"),
  priority: document.getElementById("priority"),
  submitBtn: document.getElementById("submitBtn"),
  cancelEditBtn: document.getElementById("cancelEditBtn"),
  taskList: document.getElementById("taskList"),
  emptyState: document.getElementById("emptyState"),
  total: document.getElementById("total"),
  completed: document.getElementById("completed"),
  remaining: document.getElementById("remaining"),
  progress: document.getElementById("progress"),
  progressBar: document.getElementById("progressBar"),
  progressTrack: document.getElementById("progressTrack"),
  progressMessage: document.getElementById("progressMessage"),
  taskCountLabel: document.getElementById("taskCountLabel"),
  searchInput: document.getElementById("searchInput"),
  themeBtn: document.getElementById("themeBtn"),
  clearCompletedBtn: document.getElementById("clearCompletedBtn"),
  toast: document.getElementById("toast"),
  achievementText: document.getElementById("achievementText")
};

let tasks = loadTasks();
let currentFilter = "all";
let editingId = null;
let toastTimer;

function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

    return Array.isArray(saved) ? saved.filter(task =>
      task && typeof task.id === "string" &&
      typeof task.text === "string" &&
      typeof task.completed === "boolean"
    ) : [];

  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    elements.toast.classList.remove("show");
  }, 2200);
}

function updateStats() {
  const done = tasks.filter(task => task.completed).length;
  const remaining = tasks.length - done;

  const percentage = tasks.length
    ? Math.round((done / tasks.length) * 100)
    : 0;

  elements.total.textContent = tasks.length;
  elements.completed.textContent = done;
  elements.remaining.textContent = remaining;

  elements.progress.textContent = `${percentage}%`;
  elements.progressBar.style.width = `${percentage}%`;

  elements.progressTrack.setAttribute("aria-valuenow", percentage);

  elements.taskCountLabel.textContent =
    `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`;

  elements.progressMessage.textContent = tasks.length === 0
    ? "Start with one small task."
    : percentage === 100
      ? "Amazing! Everything is complete."
      : `${done} of ${tasks.length} tasks completed. Keep going!`;

  elements.achievementText.textContent =
    percentage === 100 && tasks.length
      ? "🏆 All done — excellent work!"
      : done >= 5
        ? "🔥 Great consistency. Keep the momentum going!"
        : "🌱 Every accomplishment starts with the decision to try.";
}

function formatDate(dateString) {
  if (!dateString) return "No due date";

  const date = new Date(`${dateString}T00:00:00`);

  return `Due ${date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  })}`;
}

function createTaskElement(task) {
  const item = document.createElement("li");

  item.className = `task-item${task.completed ? " is-complete" : ""}`;

  const check = document.createElement("button");

  check.type = "button";
  check.className = "check-button";

  check.setAttribute(
    "aria-label",
    task.completed ? "Mark task as active" : "Mark task as complete"
  );

  check.textContent = task.completed ? "✓" : "";

  check.addEventListener("click", () => toggleTask(task.id));

  const content = document.createElement("div");
  content.className = "task-content";

  const title = document.createElement("span");
  title.className = "task-text";
  title.textContent = task.text;

  const meta = document.createElement("div");
  meta.className = "task-meta";

  const priority = document.createElement("span");

  const safePriority = ["low", "medium", "high"].includes(task.priority)
    ? task.priority
    : "medium";

  priority.className = `priority ${safePriority}`;
  priority.textContent = `${safePriority} priority`;

  const date = document.createElement("span");
  date.textContent = formatDate(task.dueDate);

  meta.append(priority, date);
  content.append(title, meta);

  const actions = document.createElement("div");
  actions.className = "task-actions";

  const edit = document.createElement("button");

  edit.type = "button";
  edit.className = "action-button";
  edit.title = "Edit task";
  edit.setAttribute("aria-label", `Edit ${task.text}`);
  edit.textContent = "✎";

  edit.addEventListener("click", () => startEditing(task.id));

  const remove = document.createElement("button");

  remove.type = "button";
  remove.className = "action-button delete";
  remove.title = "Delete task";
  remove.setAttribute("aria-label", `Delete ${task.text}`);
  remove.textContent = "×";

  remove.addEventListener("click", () => deleteTask(task.id));

  actions.append(edit, remove);

  item.append(check, content, actions);

  return item;
}

function renderTasks() {
  const searchTerm = elements.searchInput.value.trim().toLowerCase();

  const visibleTasks = tasks.filter(task => {
    const matchesFilter =
      currentFilter === "all" ||
      (currentFilter === "active" && !task.completed) ||
      (currentFilter === "completed" && task.completed);

    return matchesFilter &&
      task.text.toLowerCase().includes(searchTerm);
  });

  elements.taskList.replaceChildren(
    ...visibleTasks.map(createTaskElement)
  );

  elements.emptyState.classList.toggle(
    "hidden",
    visibleTasks.length > 0
  );

  updateStats();
}

function resetForm() {
  elements.form.reset();

  elements.priority.value = "medium";

  editingId = null;

  elements.submitBtn.textContent = "＋ Add task";

  elements.cancelEditBtn.classList.add("hidden");
}

function addOrUpdateTask(event) {
  event.preventDefault();

  const text = elements.input.value.trim();

  if (!text) {
    showToast("Please enter a task name.");
    elements.input.focus();
    return;
  }

  if (editingId) {
    const task = tasks.find(item => item.id === editingId);

    if (task) {
      task.text = text;
      task.dueDate = elements.dueDate.value;
      task.priority = elements.priority.value;
    }

    showToast("Task updated.");

  } else {
    tasks.unshift({
      id: crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,

      text: text,
      completed: false,
      dueDate: elements.dueDate.value,
      priority: elements.priority.value,
      createdAt: new Date().toISOString()
    });

    showToast("Task added.");
  }

  saveTasks();

  resetForm();

  renderTasks();

  elements.input.focus();
}

function toggleTask(id) {
  const task = tasks.find(item => item.id === id);

  if (!task) return;

  task.completed = !task.completed;

  saveTasks();

  renderTasks();
}

function deleteTask(id) {
  tasks = tasks.filter(task => task.id !== id);

  if (editingId === id) {
    resetForm();
  }

  saveTasks();

  renderTasks();

  showToast("Task deleted.");
}

function startEditing(id) {
  const task = tasks.find(item => item.id === id);

  if (!task) return;

  editingId = id;

  elements.input.value = task.text;
  elements.dueDate.value = task.dueDate || "";
  elements.priority.value = task.priority || "medium";

  elements.submitBtn.textContent = "Save changes";

  elements.cancelEditBtn.classList.remove("hidden");

  elements.input.focus();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function setTheme(isDark) {
  document.body.classList.toggle("dark", isDark);

  elements.themeBtn.textContent = isDark ? "☀" : "☾";

  elements.themeBtn.setAttribute(
    "aria-label",
    isDark ? "Switch to light mode" : "Switch to dark mode"
  );

  localStorage.setItem(
    THEME_KEY,
    isDark ? "dark" : "light"
  );
}

// Form events

elements.form.addEventListener(
  "submit",
  addOrUpdateTask
);

elements.cancelEditBtn.addEventListener(
  "click",
  resetForm
);

elements.searchInput.addEventListener(
  "input",
  renderTasks
);

// Filter events

document.querySelectorAll(".filter-button").forEach(button => {
  button.addEventListener("click", () => {

    currentFilter = button.dataset.filter;

    document.querySelectorAll(".filter-button").forEach(item =>
      item.classList.toggle("active", item === button)
    );

    renderTasks();
  });
});

// Theme event

elements.themeBtn.addEventListener("click", () => {
  setTheme(!document.body.classList.contains("dark"));
});

// Clear completed tasks

elements.clearCompletedBtn.addEventListener("click", () => {

  const completedCount = tasks.filter(
    task => task.completed
  ).length;

  if (!completedCount) {
    showToast("There are no completed tasks to clear.");
    return;
  }

  tasks = tasks.filter(task => !task.completed);

  if (editingId && !tasks.some(task => task.id === editingId)) {
    resetForm();
  }

  saveTasks();

  renderTasks();

  showToast(
    `${completedCount} completed ${completedCount === 1 ? "task" : "tasks"} cleared.`
  );
});

// Load saved theme and tasks

setTheme(localStorage.getItem(THEME_KEY) === "dark");

renderTasks();
