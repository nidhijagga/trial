(function () {
  "use strict";

  const STORAGE_KEY_V1 = "todo.tasks.v1";
  const STORAGE_KEY_V2 = "kanban.tasks.v2";
  const THEME_KEY = "todo.theme";

  /**
   * @typedef {"backlog"|"inProgress"|"review"|"blocked"|"done"} KanbanStatus
   * @typedef {"low"|"medium"|"high"|"urgent"} Priority
   * @typedef {{
   *   id: string,
   *   title: string,
   *   description?: string,
   *   status: KanbanStatus,
   *   priority: Priority,
   *   tags: string[],
   *   dueDate?: string, // ISO date (yyyy-mm-dd)
   *   createdAt: string, // ISO datetime
   *   updatedAt?: string,
   *   order?: number
   * }} Task
   */

  /** @type {Task[]} */
  let tasks = [];
  /** @type {string | null} */
  let editingTaskId = null;
  /** @type {string | null} */
  let draggingTaskId = null;

  const columnStatuses = /** @type {KanbanStatus[]} */([
    "backlog",
    "inProgress",
    "review",
    "blocked",
    "done",
  ]);

  // Elements
  const titleInput = document.getElementById("titleInput");
  const descInput = document.getElementById("descInput");
  const priorityInput = document.getElementById("priorityInput");
  const dueInput = document.getElementById("dueInput");
  const statusInput = document.getElementById("statusInput");
  const tagsInput = document.getElementById("tagsInput");
  const taskForm = document.getElementById("taskForm");

  const searchInput = document.getElementById("searchInput");
  const priorityFilter = document.getElementById("priorityFilter");
  const tagFilter = document.getElementById("tagFilter");
  const sortSelect = document.getElementById("sortSelect");

  const clearDoneBtn = document.getElementById("clearDone");
  const themeToggle = document.getElementById("themeToggle");

  /** Lists and counts by status */
  /** @type {Record<KanbanStatus, HTMLUListElement>} */
  const listByStatus = {
    backlog: /** @type {HTMLUListElement} */ (document.getElementById("backlogList")),
    inProgress: /** @type {HTMLUListElement} */ (document.getElementById("inProgressList")),
    review: /** @type {HTMLUListElement} */ (document.getElementById("reviewList")),
    blocked: /** @type {HTMLUListElement} */ (document.getElementById("blockedList")),
    done: /** @type {HTMLUListElement} */ (document.getElementById("doneList")),
  };

  /** @type {Record<KanbanStatus, HTMLElement>} */
  const countByStatus = {
    backlog: document.getElementById("backlogCount"),
    inProgress: document.getElementById("inProgressCount"),
    review: document.getElementById("reviewCount"),
    blocked: document.getElementById("blockedCount"),
    done: document.getElementById("doneCount"),
  };

  // Filters state
  const filters = {
    search: "",
    priority: /** @type {"all"|Priority} */ ("all"),
    tags: /** @type {string[]} */ ([]),
    sort: /** @type {"manual"|"priority"|"dueDate"|"createdAt"|"title"} */ ("manual"),
  };

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

  // Create new task
  taskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = (/** @type {HTMLInputElement} */(titleInput)).value.trim();
    const description = (/** @type {HTMLTextAreaElement} */(descInput)).value.trim();
    const priority = /** @type {Priority} */ ((/** @type {HTMLSelectElement} */(priorityInput)).value || "medium");
    const dueDate = (/** @type {HTMLInputElement} */(dueInput)).value || undefined;
    const status = /** @type {KanbanStatus} */ ((/** @type {HTMLSelectElement} */(statusInput)).value || "backlog");
    const tags = parseTags((/** @type {HTMLInputElement} */(tagsInput)).value);

    if (!title) return;

    const newTask = /** @type {Task} */({
      id: generateId(),
      title,
      description,
      status,
      priority,
      tags,
      dueDate,
      createdAt: new Date().toISOString(),
      order: nextOrderForStatus(status),
    });

    tasks.push(newTask);
    saveTasks();
    taskForm.reset();
    (/** @type {HTMLSelectElement} */(priorityInput)).value = "medium";
    (/** @type {HTMLSelectElement} */(statusInput)).value = "backlog";
    render();
    (/** @type {HTMLInputElement} */(titleInput)).focus();
  });

  // Clear done
  clearDoneBtn?.addEventListener("click", () => {
    const hasDone = tasks.some((t) => t.status === "done");
    if (!hasDone) return;
    tasks = tasks.filter((t) => t.status !== "done");
    saveTasks();
    render();
  });

  // Toolbar events
  searchInput?.addEventListener("input", () => {
    filters.search = (/** @type {HTMLInputElement} */(searchInput)).value.trim().toLowerCase();
    render();
  });
  priorityFilter?.addEventListener("change", () => {
    const val = (/** @type {HTMLSelectElement} */(priorityFilter)).value;
    filters.priority = /** @type {any} */ (val);
    render();
  });
  tagFilter?.addEventListener("input", () => {
    filters.tags = parseTags((/** @type {HTMLInputElement} */(tagFilter)).value);
    render();
  });
  sortSelect?.addEventListener("change", () => {
    filters.sort = /** @type {any} */ ((/** @type {HTMLSelectElement} */(sortSelect)).value);
    render();
  });

  // Drag and drop handlers on columns
  for (const status of columnStatuses) {
    const list = listByStatus[status];
    // Allow drop
    list.addEventListener("dragover", (e) => {
      e.preventDefault();
      const afterElement = getDragAfterElement(list, e.clientY);
      showDropIndicator(list, afterElement);
    });
    list.addEventListener("dragleave", () => clearDropIndicators(list));
    list.addEventListener("drop", (e) => {
      e.preventDefault();
      clearDropIndicators(list);
      if (!draggingTaskId) return;
      moveTaskToList(draggingTaskId, status, getDropIndex(list, e.clientY));
      draggingTaskId = null;
    });
  }

  // Utils
  function parseTags(raw) {
    return raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => t.toLowerCase());
  }

  function loadTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    const light = saved ? saved === "light" : prefersLight;
    document.documentElement.classList.toggle("light", light);
    const span = themeToggle?.querySelector("span");
    if (span) span.textContent = light ? "🌞" : "🌙";
  }

  function loadTasks() {
    // Prefer v2
    try {
      const raw = localStorage.getItem(STORAGE_KEY_V2);
      if (raw) {
        tasks = JSON.parse(raw) || [];
        if (!Array.isArray(tasks)) tasks = [];
        return;
      }
    } catch {}

    // Migrate from v1 if present
    try {
      const rawV1 = localStorage.getItem(STORAGE_KEY_V1);
      /** @type {any[]} */
      const oldTasks = rawV1 ? JSON.parse(rawV1) : [];
      if (Array.isArray(oldTasks) && oldTasks.length) {
        tasks = oldTasks.map((t, idx) => /** @type {Task} */({
          id: t.id || generateId(),
          title: t.title || "Untitled",
          description: t.description || "",
          status: t.status === "completed" ? "done" : "backlog",
          priority: "medium",
          tags: [],
          dueDate: undefined,
          createdAt: t.createdAt || new Date().toISOString(),
          updatedAt: t.updatedAt,
          order: idx + 1,
        }));
        saveTasks();
      } else {
        tasks = [];
      }
    } catch {
      tasks = [];
    }
  }

  function saveTasks() {
    localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(tasks));
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  }

  function nextOrderForStatus(status) {
    const max = tasks
      .filter((t) => t.status === status)
      .reduce((m, t) => Math.max(m, t.order || 0), 0);
    return max + 1;
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

  function moveTaskToList(taskId, newStatus, targetIndex) {
    const moving = tasks.find((t) => t.id === taskId);
    if (!moving) return;
    const oldStatus = moving.status;

    // Collect tasks in target status after filters are applied? For order, use full list in that status
    const targetTasks = tasks.filter((t) => t.status === newStatus && t.id !== taskId);

    // Clamp index
    const index = Math.max(0, Math.min(targetIndex ?? targetTasks.length, targetTasks.length));

    // Reassign orders to make space
    targetTasks.sort((a, b) => (a.order || 0) - (b.order || 0));
    targetTasks.splice(index, 0, moving);
    targetTasks.forEach((t, i) => { t.order = i + 1; });

    // Update status
    moving.status = newStatus;
    moving.order = index + 1;

    // Normalize old column orders as well
    const oldColumn = tasks.filter((t) => t.status === oldStatus && t.id !== taskId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    oldColumn.forEach((t, i) => { t.order = i + 1; });

    saveTasks();
    render();
  }

  function getDragAfterElement(container, mouseY) {
    const elements = [...container.querySelectorAll("li.kanban-card:not(.dragging)")];
    let closest = { offset: Number.NEGATIVE_INFINITY, element: null };
    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      const offset = mouseY - rect.top - rect.height / 2;
      if (offset < 0 && offset > closest.offset) {
        closest = { offset, element: el };
      }
    }
    return /** @type {HTMLElement|null} */ (closest.element);
  }

  function getDropIndex(container, mouseY) {
    const after = getDragAfterElement(container, mouseY);
    if (!after) return container.children.length;
    let idx = 0;
    for (const child of container.children) {
      if (child === after) break;
      idx++;
    }
    return idx;
  }

  function showDropIndicator(list, afterElement) {
    clearDropIndicators(list);
    const indicator = document.createElement("li");
    indicator.className = "drop-indicator";
    if (afterElement) list.insertBefore(indicator, afterElement);
    else list.appendChild(indicator);
  }

  function clearDropIndicators(list) {
    list.querySelectorAll(".drop-indicator").forEach((el) => el.remove());
  }

  // Rendering
  function render() {
    // Compute filtered tasks
    const filtered = tasks.filter((t) => {
      if (filters.priority !== "all" && t.priority !== filters.priority) return false;
      if (filters.search) {
        const hay = (t.title + "\n" + (t.description || "") + "\n" + t.tags.join(",")).toLowerCase();
        if (!hay.includes(filters.search)) return false;
      }
      if (filters.tags.length) {
        const hasAll = filters.tags.every((ft) => t.tags.includes(ft));
        if (!hasAll) return false;
      }
      return true;
    });

    // Group by status
    /** @type {Record<KanbanStatus, Task[]>} */
    const byStatus = {
      backlog: [], inProgress: [], review: [], blocked: [], done: [],
    };
    for (const t of filtered) byStatus[t.status].push(t);

    // Sort within status
    for (const status of columnStatuses) {
      const list = byStatus[status];
      list.sort(getComparator(filters.sort));
    }

    // Render columns
    for (const status of columnStatuses) {
      const listEl = listByStatus[status];
      listEl.innerHTML = "";
      const list = byStatus[status];

      countByStatus[status].textContent = String(list.length);

      if (list.length === 0) {
        const empty = document.createElement("li");
        empty.className = "card empty-card";
        empty.textContent = "No cards";
        listEl.appendChild(empty);
        continue;
      }

      for (const task of list) {
        listEl.appendChild(renderCard(task));
      }
    }
  }

  function getComparator(mode) {
    switch (mode) {
      case "priority":
        return (a, b) => priorityRank(b.priority) - priorityRank(a.priority) || cmpDate(a.createdAt, b.createdAt);
      case "dueDate":
        return (a, b) => cmpDate(a.dueDate, b.dueDate) || cmpDate(a.createdAt, b.createdAt);
      case "createdAt":
        return (a, b) => cmpDate(a.createdAt, b.createdAt);
      case "title":
        return (a, b) => a.title.localeCompare(b.title);
      case "manual":
      default:
        return (a, b) => (a.order || 0) - (b.order || 0) || cmpDate(a.createdAt, b.createdAt);
    }
  }

  function priorityRank(p) {
    switch (p) {
      case "urgent": return 4;
      case "high": return 3;
      case "medium": return 2;
      case "low": return 1;
      default: return 0;
    }
  }

  function cmpDate(a, b) {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    return new Date(a).getTime() - new Date(b).getTime();
  }

  function renderCard(task) {
    const li = document.createElement("li");
    li.className = "task-card kanban-card";
    li.dataset.id = task.id;
    li.draggable = true;

    // Drag events
    li.addEventListener("dragstart", () => {
      draggingTaskId = task.id;
      li.classList.add("dragging");
    });
    li.addEventListener("dragend", () => {
      li.classList.remove("dragging");
      draggingTaskId = null;
    });

    if (editingTaskId === task.id) {
      li.appendChild(renderEditForm(task));
      return li;
    }

    // Left: drag handle + priority
    const left = document.createElement("div");
    left.className = "card-left";

    const pr = document.createElement("span");
    pr.className = `chip chip-priority ${task.priority}`;
    pr.textContent = task.priority;
    left.appendChild(pr);

    // Main
    const main = document.createElement("div");
    main.className = "task-main";

    const title = document.createElement("div");
    title.className = "task-title" + (task.status === "done" ? " completed" : "");
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

    if (task.dueDate) {
      const due = document.createElement("span");
      const overdue = isOverdue(task.dueDate) && task.status !== "done";
      due.className = overdue ? "overdue" : "";
      due.textContent = `Due ${formatDate(task.dueDate)}`;
      meta.appendChild(due);
    }

    if (task.tags.length) {
      const tagsWrap = document.createElement("div");
      tagsWrap.className = "tags";
      for (const t of task.tags) {
        const chip = document.createElement("span");
        chip.className = "chip chip-tag";
        chip.textContent = t;
        tagsWrap.appendChild(chip);
      }
      meta.appendChild(tagsWrap);
    }

    main.appendChild(title);
    main.appendChild(desc);
    main.appendChild(meta);

    // Actions
    const actions = document.createElement("div");
    actions.className = "task-actions";

    const moveDone = document.createElement("button");
    moveDone.className = "action success";
    moveDone.textContent = task.status === "done" ? "Backlog" : "Done";
    moveDone.title = task.status === "done" ? "Move to Backlog" : "Mark as Done";
    moveDone.addEventListener("click", () => {
      if (task.status === "done") {
        updateTask(task.id, { status: "backlog", order: nextOrderForStatus("backlog") });
      } else {
        updateTask(task.id, { status: "done", order: nextOrderForStatus("done") });
      }
    });

    const editBtn = document.createElement("button");
    editBtn.className = "action";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => startEditing(task.id));

    const delBtn = document.createElement("button");
    delBtn.className = "action danger";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => deleteTask(task.id));

    actions.appendChild(moveDone);
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    li.appendChild(left);
    li.appendChild(main);
    li.appendChild(actions);

    return li;
  }

  function formatDate(iso) {
    try {
      const d = new Date(iso);
      const today = new Date(iso).toString() === 'Invalid Date' ? new Date() : new Date(iso);
      const opts = iso.length <= 10
        ? { year: "numeric", month: "short", day: "2-digit" }
        : { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" };
      return new Date(iso).toLocaleString(undefined, /** @type {any} */(opts));
    } catch {
      return iso;
    }
  }

  function isOverdue(yyyyMmDd) {
    try {
      const end = new Date(yyyyMmDd);
      const now = new Date();
      // Compare by date only
      end.setHours(23, 59, 59, 999);
      return now.getTime() > end.getTime();
    } catch { return false; }
  }

  function startEditing(taskId) {
    editingTaskId = taskId;
    render();
  }

  function cancelEditing() {
    editingTaskId = null;
    render();
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

    const row = document.createElement("div");
    row.className = "edit-grid";

    const prSel = document.createElement("select");
    prSel.innerHTML = `
      <option value="low">Low</option>
      <option value="medium">Medium</option>
      <option value="high">High</option>
      <option value="urgent">Urgent</option>
    `;
    prSel.value = task.priority;

    const due = document.createElement("input");
    due.type = "date";
    if (task.dueDate) due.value = task.dueDate;

    const stSel = document.createElement("select");
    stSel.innerHTML = `
      <option value="backlog">Backlog</option>
      <option value="inProgress">In Progress</option>
      <option value="review">Review</option>
      <option value="blocked">Blocked</option>
      <option value="done">Done</option>
    `;
    stSel.value = task.status;

    const tags = document.createElement("input");
    tags.type = "text";
    tags.placeholder = "tags, comma separated";
    tags.value = task.tags.join(", ");

    row.appendChild(prSel);
    row.appendChild(due);
    row.appendChild(stSel);
    row.appendChild(tags);

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
      if (!newTitle) { title.focus(); return; }
      const newPr = /** @type {Priority} */(prSel.value);
      const newDue = due.value || undefined;
      const newStatus = /** @type {KanbanStatus} */(stSel.value);
      const newTags = parseTags(tags.value);

      const statusChanged = newStatus !== task.status;

      updateTask(task.id, {
        title: newTitle,
        description: newDesc,
        priority: newPr,
        dueDate: newDue,
        status: newStatus,
        tags: newTags,
        order: statusChanged ? nextOrderForStatus(newStatus) : task.order,
      });
      editingTaskId = null;
      render();
    });

    cancel.addEventListener("click", () => { cancelEditing(); });

    wrapper.appendChild(title);
    wrapper.appendChild(desc);
    wrapper.appendChild(row);
    actions.appendChild(save);
    actions.appendChild(cancel);
    wrapper.appendChild(actions);

    // Accessibility: submit on Enter inside title input
    title.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); save.click(); }
    });

    queueMicrotask(() => title.focus());

    return wrapper;
  }
})();