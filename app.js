(function () {
  "use strict";

  const STORAGE_KEY = "todo.tasks.v1";
  const THEME_KEY = "todo.theme";

  /** @type {Array<{id:string,title:string,description:string,status:'pending'|'completed',createdAt:string,updatedAt?:string}>} */
  let tasks = [];
  let editingTaskId = null;

  // Elements
  const titleInput = document.getElementById("titleInput");
  const descInput = document.getElementById("descInput");
  const taskForm = document.getElementById("taskForm");
  const pendingList = document.getElementById("pendingList");
  const completedList = document.getElementById("completedList");
  const pendingCount = document.getElementById("pendingCount");
  const completedCount = document.getElementById("completedCount");
  const clearCompletedBtn = document.getElementById("clearCompleted");
  const themeToggle = document.getElementById("themeToggle");

  // Initialize
  loadTheme();
  loadTasks();
  render();

  // Theme toggle
  themeToggle?.addEventListener("click", () => {
    const isLight = document.documentElement.classList.toggle("light");
    localStorage.setItem(THEME_KEY, isLight ? "light" : "dark");
    themeToggle.querySelector("span").textContent = isLight ? "🌞" : "🌙";
  });

  // Create
  taskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = titleInput.value.trim();
    const description = descInput.value.trim();
    if (!title) return;

    const newTask = {
      id: generateId(),
      title,
      description,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    tasks.unshift(newTask);
    saveTasks();
    render();
    taskForm.reset();
    titleInput.focus();
  });

  // Clear completed
  clearCompletedBtn.addEventListener("click", () => {
    const hasCompleted = tasks.some((t) => t.status === "completed");
    if (!hasCompleted) return;
    tasks = tasks.filter((t) => t.status !== "completed");
    saveTasks();
    render();
  });

  // Utils
  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      tasks = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(tasks)) tasks = [];
    } catch {
      tasks = [];
    }
  }

  function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  function loadTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    const light = saved ? saved === "light" : prefersLight;
    document.documentElement.classList.toggle("light", light);
    const span = themeToggle?.querySelector("span");
    if (span) span.textContent = light ? "🌞" : "🌙";
  }

  function generateId() {
    // Simple unique-ish id
    return (
      Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
    );
  }

  function formatDate(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  function startEditing(taskId) {
    editingTaskId = taskId;
    render();
  }

  function cancelEditing() {
    editingTaskId = null;
    render();
  }

  function updateTask(taskId, updates) {
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return;
    tasks[idx] = { ...tasks[idx], ...updates, updatedAt: new Date().toISOString() };
    saveTasks();
    render();
  }

  function deleteTask(taskId) {
    tasks = tasks.filter((t) => t.id !== taskId);
    saveTasks();
    render();
  }

  function toggleStatus(taskId) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const newStatus = task.status === "pending" ? "completed" : "pending";
    updateTask(taskId, { status: newStatus });
  }

  // Rendering
  function render() {
    const pending = tasks.filter((t) => t.status === "pending");
    const completed = tasks.filter((t) => t.status === "completed");

    pendingCount.textContent = pending.length.toString();
    completedCount.textContent = completed.length.toString();

    renderList(pendingList, pending);
    renderList(completedList, completed);
  }

  function renderList(container, list) {
    container.innerHTML = "";
    if (list.length === 0) {
      const empty = document.createElement("li");
      empty.className = "card";
      empty.textContent = "No tasks";
      container.appendChild(empty);
      return;
    }

    for (const task of list) {
      const li = document.createElement("li");
      li.className = "task-card";
      li.dataset.id = task.id;

      if (editingTaskId === task.id) {
        li.appendChild(renderEditForm(task));
      } else {
        li.appendChild(renderCheckbox(task));
        li.appendChild(renderMain(task));
        li.appendChild(renderActions(task));
      }

      container.appendChild(li);
    }
  }

  function renderCheckbox(task) {
    const wrapper = document.createElement("div");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "checkbox";
    checkbox.checked = task.status === "completed";
    checkbox.ariaLabel = checkbox.checked ? "Mark as pending" : "Mark as completed";
    checkbox.addEventListener("change", () => toggleStatus(task.id));
    wrapper.appendChild(checkbox);
    return wrapper;
  }

  function renderMain(task) {
    const main = document.createElement("div");
    main.className = "task-main";

    const title = document.createElement("div");
    title.className = "task-title" + (task.status === "completed" ? " completed" : "");
    title.textContent = task.title;

    const desc = document.createElement("p");
    desc.className = "task-desc";
    desc.textContent = task.description || "";
    if (!task.description) desc.style.display = "none";

    const meta = document.createElement("div");
    meta.className = "meta";
    const created = document.createElement("span");
    created.textContent = `Created ${formatDate(task.createdAt)}`;
    meta.appendChild(created);

    main.appendChild(title);
    main.appendChild(desc);
    main.appendChild(meta);

    return main;
  }

  function renderActions(task) {
    const actions = document.createElement("div");
    actions.className = "task-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "action";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => startEditing(task.id));

    const delBtn = document.createElement("button");
    delBtn.className = "action danger";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => deleteTask(task.id));

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    return actions;
  }

  function renderEditForm(task) {
    const wrapper = document.createElement("div");
    wrapper.className = "editing";

    const title = document.createElement("input");
    title.type = "text";
    title.value = task.title;
    title.required = true;

    const desc = document.createElement("textarea");
    desc.rows = 3;
    desc.value = task.description || "";

    const actions = document.createElement("div");
    actions.className = "edit-actions";

    const save = document.createElement("button");
    save.className = "btn btn-primary";
    save.textContent = "Save";

    const cancel = document.createElement("button");
    cancel.className = "btn btn-muted";
    cancel.textContent = "Cancel";

    save.addEventListener("click", () => {
      const newTitle = title.value.trim();
      const newDesc = desc.value.trim();
      if (!newTitle) {
        title.focus();
        return;
      }
      updateTask(task.id, { title: newTitle, description: newDesc });
      editingTaskId = null;
      render();
    });

    cancel.addEventListener("click", () => {
      cancelEditing();
    });

    wrapper.appendChild(title);
    wrapper.appendChild(desc);
    actions.appendChild(save);
    actions.appendChild(cancel);
    wrapper.appendChild(actions);

    // Accessibility: submit on Enter inside title input
    title.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        save.click();
      }
    });

    // Focus the title on edit start
    queueMicrotask(() => title.focus());

    return wrapper;
  }
})();