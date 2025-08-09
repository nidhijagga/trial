(function () {
  "use strict";

  const STORAGE_KEY = "kanban.tasks.v1";
  const THEME_KEY = "todo.theme";
  const LEGACY_STORAGE_KEY = "todo.tasks.v1";

  /**
   * Task shape
   * id: string
   * title: string
   * description: string
   * status: 'backlog'|'in-progress'|'blocked'|'done'
   * priority: 'low'|'medium'|'high'
   * dueDate?: string (YYYY-MM-DD)
   * tags: string[]
   * order: number
   * createdAt: string (ISO)
   * updatedAt?: string (ISO)
   */
  /** @type {Array<any>} */
  let tasks = [];
  let editingTaskId = null;

  // Elements
  const titleInput = document.getElementById("titleInput");
  const descInput = document.getElementById("descInput");
  const statusInput = document.getElementById("statusInput");
  const priorityInput = document.getElementById("priorityInput");
  const dueInput = document.getElementById("dueInput");
  const tagsInput = document.getElementById("tagsInput");

  const taskForm = document.getElementById("taskForm");

  const backlogList = document.getElementById("backlogList");
  const inProgressList = document.getElementById("inProgressList");
  const blockedList = document.getElementById("blockedList");
  const doneList = document.getElementById("doneList");

  const backlogCount = document.getElementById("backlogCount");
  const inProgressCount = document.getElementById("inProgressCount");
  const blockedCount = document.getElementById("blockedCount");
  const doneCount = document.getElementById("doneCount");

  const clearDoneBtn = document.getElementById("clearDone");
  const themeToggle = document.getElementById("themeToggle");

  const searchInput = document.getElementById("searchInput");
  const priorityFilter = document.getElementById("priorityFilter");
  const statusFilter = document.getElementById("statusFilter");
  const dueFilter = document.getElementById("dueFilter");
  const tagsFilter = document.getElementById("tagsFilter");

  const listsByStatus = {
    "backlog": backlogList,
    "in-progress": inProgressList,
    "blocked": blockedList,
    "done": doneList,
  };

  const countsByStatus = {
    "backlog": backlogCount,
    "in-progress": inProgressCount,
    "blocked": blockedCount,
    "done": doneCount,
  };

  const allStatuses = ["backlog", "in-progress", "blocked", "done"];

  // Filters state
  const filters = {
    search: "",
    priority: "all",
    status: "all",
    due: "all",
    tags: [],
  };

  // Initialize
  loadTheme();
  loadTasks();
  setupDnD();
  render();

  // Theme toggle
  themeToggle?.addEventListener("click", () => {
    const isLight = document.documentElement.classList.toggle("light");
    localStorage.setItem(THEME_KEY, isLight ? "light" : "dark");
    themeToggle.querySelector("span").textContent = isLight ? "🌞" : "🌙";
  });

  // Create task
  taskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = titleInput.value.trim();
    const description = descInput.value.trim();
    const status = /** @type {any} */ (statusInput.value || "backlog");
    const priority = /** @type {any} */ (priorityInput.value || "medium");
    const dueDate = dueInput.value || "";
    const tags = parseTags(tagsInput.value);

    if (!title) return;

    const newTask = {
      id: generateId(),
      title,
      description,
      status,
      priority,
      dueDate,
      tags,
      order: 0,
      createdAt: new Date().toISOString(),
    };

    insertAtTopOfStatus(newTask, status);
    saveTasks();
    render();
    taskForm.reset();
    titleInput.focus();
  });

  // Clear done
  clearDoneBtn.addEventListener("click", () => {
    const hasDone = tasks.some((t) => t.status === "done");
    if (!hasDone) return;
    tasks = tasks.filter((t) => t.status !== "done");
    reindexAll();
    saveTasks();
    render();
  });

  // Filters
  searchInput?.addEventListener("input", () => {
    filters.search = searchInput.value.trim().toLowerCase();
    render();
  });
  priorityFilter?.addEventListener("change", () => {
    filters.priority = priorityFilter.value;
    render();
  });
  statusFilter?.addEventListener("change", () => {
    filters.status = statusFilter.value;
    render();
  });
  dueFilter?.addEventListener("change", () => {
    filters.due = dueFilter.value;
    render();
  });
  tagsFilter?.addEventListener("input", () => {
    filters.tags = parseTags(tagsFilter.value);
    render();
  });

  // Utils
  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        tasks = JSON.parse(raw);
      } else {
        // Try migrate from legacy
        const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacyRaw) {
          const legacy = JSON.parse(legacyRaw);
          if (Array.isArray(legacy)) {
            tasks = legacy.map((t, i) => ({
              id: t.id || generateId(),
              title: t.title || "",
              description: t.description || "",
              status: t.status === "completed" ? "done" : "backlog",
              priority: "medium",
              dueDate: "",
              tags: [],
              order: i,
              createdAt: t.createdAt || new Date().toISOString(),
              updatedAt: t.updatedAt,
            }));
            saveTasks();
          } else {
            tasks = [];
          }
        } else {
          tasks = [];
        }
      }

      // Ensure shape
      tasks = tasks.map((t, idx) => ({
        id: t.id || generateId(),
        title: t.title || "",
        description: t.description || "",
        status: isValidStatus(t.status) ? t.status : "backlog",
        priority: isValidPriority(t.priority) ? t.priority : "medium",
        dueDate: typeof t.dueDate === "string" ? t.dueDate : "",
        tags: Array.isArray(t.tags) ? t.tags : [],
        order: Number.isFinite(t.order) ? t.order : idx,
        createdAt: t.createdAt || new Date().toISOString(),
        updatedAt: t.updatedAt,
      }));

      reindexAll();
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
    return (
      Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
    );
  }

  function isValidStatus(s) {
    return allStatuses.includes(s);
  }

  function isValidPriority(p) {
    return ["low", "medium", "high"].includes(p);
  }

  function parseTags(input) {
    return (input || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s, i, arr) => s.length > 0 && arr.indexOf(s) === i);
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

  function formatDue(dateStr) {
    if (!dateStr) return "No due";
    try {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
    } catch {
      return dateStr;
    }
  }

  function isOverdue(task) {
    if (!task.dueDate) return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    const due = new Date(task.dueDate + "T00:00:00");
    return due < today && task.status !== "done";
  }

  function isDueSoon(task) {
    if (!task.dueDate) return false;
    if (task.status === "done") return false;
    const today = new Date(); today.setHours(0,0,0,0);
    const due = new Date(task.dueDate + "T00:00:00");
    const diffDays = Math.ceil((due - today) / (1000*60*60*24));
    return diffDays >= 0 && diffDays <= 2;
  }

  function taskMatchesFilters(task) {
    // Status filter (global)
    if (filters.status !== "all" && task.status !== filters.status) return false;

    // Priority
    if (filters.priority !== "all" && task.priority !== filters.priority) return false;

    // Due
    if (filters.due !== "all") {
      const today = new Date(); today.setHours(0,0,0,0);
      const due = task.dueDate ? new Date(task.dueDate + "T00:00:00") : null;
      if (filters.due === "none" && task.dueDate) return false;
      if (filters.due === "overdue" && !(due && due < today && task.status !== "done")) return false;
      if (filters.due === "today") {
        if (!(due && due.getTime() === today.getTime())) return false;
      }
      if (filters.due === "week") {
        if (!due) return false;
        const weekFromNow = new Date(today); weekFromNow.setDate(today.getDate() + 7);
        if (!(due >= today && due <= weekFromNow)) return false;
      }
    }

    // Search
    if (filters.search) {
      const hay = (task.title + " " + task.description + " " + task.tags.join(" ")).toLowerCase();
      if (!hay.includes(filters.search)) return false;
    }

    // Tags (all must be present)
    if (filters.tags.length > 0) {
      const tagSet = new Set(task.tags.map((t) => t.toLowerCase()));
      for (const tag of filters.tags) {
        if (!tagSet.has(tag)) return false;
      }
    }

    return true;
  }

  function insertAtTopOfStatus(task, status) {
    // Shift orders
    for (const t of tasks) {
      if (t.status === status) t.order += 1;
    }
    task.order = 0;
    tasks.push(task);
  }

  function reindexStatus(status) {
    const inStatus = tasks
      .filter((t) => t.status === status)
      .sort((a, b) => a.order - b.order);
    inStatus.forEach((t, i) => (t.order = i));
  }

  function reindexAll() {
    for (const s of allStatuses) reindexStatus(s);
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
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;
    tasks = tasks.filter((t) => t.id !== taskId);
    reindexStatus(target.status);
    saveTasks();
    render();
  }

  // Drag & Drop
  function setupDnD() {
    for (const list of Object.values(listsByStatus)) {
      list.addEventListener("dragover", onDragOver);
      list.addEventListener("drop", onDrop);
      list.addEventListener("dragleave", onDragLeave);
    }
  }

  function onDragOver(e) {
    e.preventDefault();
    const list = /** @type {HTMLElement} */ (e.currentTarget);
    list.classList.add("drag-over");

    const afterElement = getDragAfterElement(list, e.clientY);
    const dragging = document.querySelector(".task-card.dragging");
    if (!dragging) return;
    if (afterElement == null) {
      list.appendChild(dragging);
    } else {
      list.insertBefore(dragging, afterElement);
    }
  }

  function onDragLeave(e) {
    const list = /** @type {HTMLElement} */ (e.currentTarget);
    list.classList.remove("drag-over");
  }

  function onDrop(e) {
    e.preventDefault();
    const list = /** @type {HTMLElement} */ (e.currentTarget);
    list.classList.remove("drag-over");

    const column = list.closest(".kanban-col");
    const targetStatus = column?.getAttribute("data-status") || "backlog";

    // Compute new order by DOM
    const idsInOrder = Array.from(list.querySelectorAll(".task-card")).map((el) => el.getAttribute("data-id"));

    // Update tasks
    for (let i = 0; i < idsInOrder.length; i++) {
      const id = idsInOrder[i];
      const task = tasks.find((t) => t.id === id);
      if (!task) continue;
      task.status = targetStatus;
      task.order = i;
      task.updatedAt = new Date().toISOString();
    }

    saveTasks();
    render();
  }

  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.task-card:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  // Rendering
  function render() {
    const byStatus = {
      "backlog": tasks.filter((t) => t.status === "backlog").sort((a,b)=>a.order-b.order),
      "in-progress": tasks.filter((t) => t.status === "in-progress").sort((a,b)=>a.order-b.order),
      "blocked": tasks.filter((t) => t.status === "blocked").sort((a,b)=>a.order-b.order),
      "done": tasks.filter((t) => t.status === "done").sort((a,b)=>a.order-b.order),
    };

    // Counts reflect post-filter visible items
    for (const status of allStatuses) {
      const count = byStatus[status].filter(taskMatchesFilters).length;
      countsByStatus[status].textContent = String(count);
    }

    renderList(backlogList, byStatus["backlog"].filter(taskMatchesFilters));
    renderList(inProgressList, byStatus["in-progress"].filter(taskMatchesFilters));
    renderList(blockedList, byStatus["blocked"].filter(taskMatchesFilters));
    renderList(doneList, byStatus["done"].filter(taskMatchesFilters));
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
      li.draggable = true;

      li.addEventListener("dragstart", () => li.classList.add("dragging"));
      li.addEventListener("dragend", () => li.classList.remove("dragging"));

      if (editingTaskId === task.id) {
        li.appendChild(renderEditForm(task));
      } else {
        li.appendChild(renderPriority(task));
        li.appendChild(renderMain(task));
        li.appendChild(renderActions(task));
      }

      container.appendChild(li);
    }
  }

  function renderPriority(task) {
    const wrap = document.createElement("div");
    const badge = document.createElement("span");
    badge.className = `badge ${task.priority}`;
    badge.textContent = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
    wrap.appendChild(badge);
    return wrap;
  }

  function renderMain(task) {
    const main = document.createElement("div");
    main.className = "task-main";

    const title = document.createElement("div");
    title.className = "task-title";
    title.textContent = task.title;

    const desc = document.createElement("p");
    desc.className = "task-desc";
    desc.textContent = task.description || "";
    if (!task.description) desc.style.display = "none";

    const meta = document.createElement("div");
    meta.className = "meta";

    const created = document.createElement("span");
    created.textContent = `Created ${formatDate(task.createdAt)}`;

    const due = document.createElement("span");
    due.className = "due";
    due.textContent = `Due ${formatDue(task.dueDate)}`;
    if (isOverdue(task)) due.classList.add("overdue");
    else if (isDueSoon(task)) due.classList.add("due-soon");

    const tagsWrap = document.createElement("div");
    tagsWrap.className = "tags";
    for (const tag of task.tags) {
      const chip = document.createElement("span");
      chip.className = "tag";
      chip.textContent = tag;
      tagsWrap.appendChild(chip);
    }

    meta.appendChild(created);
    meta.appendChild(due);

    main.appendChild(title);
    main.appendChild(desc);
    if (task.tags.length > 0) main.appendChild(tagsWrap);
    main.appendChild(meta);

    return main;
  }

  function renderActions(task) {
    const actions = document.createElement("div");
    actions.className = "task-actions";

    const moveNext = document.createElement("button");
    moveNext.className = "action success";
    moveNext.textContent = nextStatusLabel(task.status);
    moveNext.title = "Move to next status";
    moveNext.addEventListener("click", () => moveToNext(task.id));

    const editBtn = document.createElement("button");
    editBtn.className = "action";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => startEditing(task.id));

    const delBtn = document.createElement("button");
    delBtn.className = "action danger";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => deleteTask(task.id));

    if (task.status !== "done") actions.appendChild(moveNext);
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    return actions;
  }

  function nextStatusLabel(status) {
    if (status === "backlog") return "Start";
    if (status === "in-progress") return "Block/Done";
    if (status === "blocked") return "Unblock";
    return "";
  }

  function moveToNext(taskId) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    let target = task.status;
    if (task.status === "backlog") target = "in-progress";
    else if (task.status === "in-progress") target = "done"; // fast-path to done
    else if (task.status === "blocked") target = "in-progress";

    if (target !== task.status) {
      task.status = target;
      task.updatedAt = new Date().toISOString();
      reindexAll();
      saveTasks();
      render();
    }
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
    row.style.display = "grid";
    row.style.gridTemplateColumns = "repeat(4, 1fr)";
    row.style.gap = "8px";

    const statusSel = document.createElement("select");
    for (const s of allStatuses) {
      const opt = document.createElement("option");
      opt.value = s; opt.textContent = labelForStatus(s);
      if (s === task.status) opt.selected = true;
      statusSel.appendChild(opt);
    }

    const prioritySel = document.createElement("select");
    for (const p of ["low","medium","high"]) {
      const opt = document.createElement("option");
      opt.value = p; opt.textContent = p.charAt(0).toUpperCase()+p.slice(1);
      if (p === task.priority) opt.selected = true;
      prioritySel.appendChild(opt);
    }

    const due = document.createElement("input");
    due.type = "date";
    due.value = task.dueDate || "";

    const tagIn = document.createElement("input");
    tagIn.type = "text";
    tagIn.placeholder = "Tags (comma separated)";
    tagIn.value = task.tags.join(", ");

    row.appendChild(statusSel);
    row.appendChild(prioritySel);
    row.appendChild(due);
    row.appendChild(tagIn);

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
      if (!newTitle) { title.focus(); return; }
      updateTask(task.id, {
        title: newTitle,
        description: desc.value.trim(),
        status: statusSel.value,
        priority: prioritySel.value,
        dueDate: due.value,
        tags: parseTags(tagIn.value),
      });
      editingTaskId = null;
      reindexAll();
      saveTasks();
      render();
    });

    cancel.addEventListener("click", () => { cancelEditing(); });

    wrapper.appendChild(title);
    wrapper.appendChild(desc);
    wrapper.appendChild(row);
    actions.appendChild(save);
    actions.appendChild(cancel);
    wrapper.appendChild(actions);

    queueMicrotask(() => title.focus());

    return wrapper;
  }

  function labelForStatus(status) {
    if (status === "backlog") return "Backlog";
    if (status === "in-progress") return "In Progress";
    if (status === "blocked") return "Blocked";
    if (status === "done") return "Done";
    return status;
  }
})();