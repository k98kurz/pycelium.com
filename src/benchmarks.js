import "./input.css";
import "chart.js/auto";
import { Chart } from "chart.js";
import MarkdownWorker from "./markdown-renderer.mjs?worker";

const filterFields = [
  { key: "model", label: "Model", numeric: false },
  { key: "devices", label: "Device", numeric: false },
  { key: "n_gpu_layers", label: "GPU Layers", numeric: true },
  { key: "n_cpu_moe", label: "CPU MoE", numeric: true },
  { key: "split_mode", label: "Split Mode", numeric: false },
  { key: "n_threads", label: "Threads", numeric: true },
  { key: "type_k", label: "K Quant", numeric: false },
  { key: "type_v", label: "V Quant", numeric: false },
  { key: "no_kv_offload", label: "NKVO", numeric: false },
  { key: "n_depth", label: "Depth", numeric: true },
];

const resultColumnKeys = ["pp_ts", "tg_ts", "pp_ts_stddev", "tg_ts_stddev"];

const columns = [
  { key: "__select__", label: "Select", numeric: false, toggleable: false },
  { key: "model", label: "Model", numeric: false, defaultVisible: true },
  { key: "devices", label: "Device", numeric: false, defaultVisible: true },
  {
    key: "n_gpu_layers",
    label: "GPU Layers",
    numeric: true,
    defaultVisible: true,
  },
  { key: "n_cpu_moe", label: "CPU MoE", numeric: true, defaultVisible: true },
  {
    key: "split_mode",
    label: "Split Mode",
    numeric: false,
    defaultVisible: true,
  },
  { key: "n_threads", label: "Threads", numeric: true, defaultVisible: true },
  { key: "type_k", label: "K Quant", numeric: false, defaultVisible: true },
  { key: "type_v", label: "V Quant", numeric: false, defaultVisible: true },
  { key: "no_kv_offload", label: "NKVO", numeric: false, defaultVisible: true },
  { key: "n_depth", label: "Depth", numeric: true, defaultVisible: true },
  { key: "pp_ts", label: "PP t/s", numeric: true, defaultVisible: true },
  { key: "tg_ts", label: "TG t/s", numeric: true, defaultVisible: true },
  {
    key: "pp_ts_stddev",
    label: "PP t/s σ",
    numeric: true,
    defaultVisible: false,
  },
  {
    key: "tg_ts_stddev",
    label: "TG t/s σ",
    numeric: true,
    defaultVisible: false,
  },
];

const COLUMN_VISIBILITY_KEY = "pycelium:benchmarks-column-visibility";

function defaultColumnVisibility() {
  const visibility = {};
  columns.forEach((col) => {
    visibility[col.key] = col.defaultVisible !== false;
  });
  return visibility;
}

function loadColumnVisibility() {
  try {
    const stored = JSON.parse(localStorage.getItem(COLUMN_VISIBILITY_KEY));
    if (stored && typeof stored === "object") {
      const visibility = defaultColumnVisibility();
      for (const key of Object.keys(visibility)) {
        if (key in stored) {
          visibility[key] = !!stored[key];
        }
      }
      return visibility;
    }
  } catch (error) {
    // ignore malformed storage
  }
  return defaultColumnVisibility();
}

function saveColumnVisibility(visibility) {
  try {
    localStorage.setItem(COLUMN_VISIBILITY_KEY, JSON.stringify(visibility));
  } catch (error) {
    // ignore storage failures
  }
}

let globalFilterIdCounter = 0;

function $(selector) {
  return document.querySelectorAll(selector);
}

function $new(element, options) {
  const e = document.createElement(element);
  for (const key in options) {
    if (key === "classList") {
      e.className = options[key];
    } else {
      e[key] = options[key];
    }
  }
  return e;
}

function isNumericField(field) {
  if (
    field === "pp_ts" ||
    field === "tg_ts" ||
    field === "pp_ts_stddev" ||
    field === "tg_ts_stddev"
  ) {
    return true;
  }
  const found = filterFields.find((item) => item.key === field);
  return found ? found.numeric : false;
}

function fieldLabel(field) {
  const found = filterFields.find((item) => item.key === field);
  return found ? found.label : field;
}

function normalizeRow(row, index) {
  return {
    _id: index,
    model: row.model ?? row.model_filename ?? "",
    devices: row.devices ?? row.device ?? "",
    n_gpu_layers: row.n_gpu_layers ?? "",
    n_cpu_moe: row.n_cpu_moe ?? "",
    split_mode: row.split_mode ?? "",
    n_threads: row.n_threads ?? "",
    type_k: row.type_k ?? row.k_quant ?? "",
    type_v: row.type_v ?? row.v_quant ?? "",
    no_kv_offload: row.no_kv_offload ?? row.nkvo ?? "",
    n_depth: row.n_depth ?? row.depth ?? "",
    pp_ts: row.pp_ts ?? "",
    tg_ts: row.tg_ts ?? "",
    pp_ts_stddev: row.pp_ts_stddev ?? "",
    tg_ts_stddev: row.tg_ts_stddev ?? "",
  };
}

function createTableManager(config) {
  let allRowsData = [];
  let rowOrderIndices = {};
  let activeFilters = [];
  let currentSortColumn = -1;
  let currentSortDirection = "none";
  let selectedRowIds = new Set();

  function setControlsEnabled(enabled) {
    const ids = [
      config.selectAllId,
      config.filterInputId,
      config.filterFieldId,
      config.addFilterId,
      config.resetFiltersId,
    ];
    if (config.makeChartsId) {
      ids.push(config.makeChartsId);
    }
    ids.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        element.disabled = !enabled;
      }
    });
  }

  function showEmptyState() {
    const emptyState = document.getElementById(config.emptyStateId);
    const table = document.getElementById(config.tableId);
    if (emptyState) {
      emptyState.classList.remove("hidden");
    }
    if (table) {
      table.classList.add("hidden");
    }
  }

  function hideEmptyState() {
    const emptyState = document.getElementById(config.emptyStateId);
    const table = document.getElementById(config.tableId);
    if (emptyState) {
      emptyState.classList.add("hidden");
    }
    if (table) {
      table.classList.remove("hidden");
    }
  }

  function populateFieldDropdown() {
    const select = document.getElementById(config.filterFieldId);
    if (!select) {
      return;
    }
    select.innerHTML = "";
    filterFields.forEach((field) => {
      const option = document.createElement("option");
      option.value = field.key;
      option.textContent = field.label;
      select.appendChild(option);
    });
  }

  function createFilterTag(filter) {
    const container = document.getElementById(config.tagsId);
    const tag = document.createElement("div");
    tag.className = "filter-tag";
    tag.setAttribute("data-filter-id", filter.id);

    const label = document.createElement("span");
    label.textContent = `${fieldLabel(filter.field)}:${filter.value}`;

    const removeButton = document.createElement("button");
    removeButton.className = "remove-filter";
    removeButton.innerHTML = "×";
    removeButton.setAttribute(
      "aria-label",
      `Remove filter: ${fieldLabel(filter.field)}:${filter.value}`,
    );
    removeButton.addEventListener("click", () => removeFilter(filter.id));

    tag.appendChild(label);
    tag.appendChild(removeButton);
    if (container) {
      container.appendChild(tag);
    }
  }

  function clearAllFilterTags() {
    const container = document.getElementById(config.tagsId);
    if (container) {
      container.innerHTML = "";
    }
  }

  function matchesFilter(row, filter) {
    const actual = String(row[filter.field] ?? "").trim();
    const expected = String(filter.value).trim();
    if (filter.field === "model") {
      return actual.toLowerCase().includes(expected.toLowerCase());
    }
    return actual.toLowerCase() === expected.toLowerCase();
  }

  function fieldValues(field) {
    const values = new Set();
    for (const row of allRowsData) {
      const value = row[field];
      if (value !== undefined && value !== null && value !== "") {
        values.add(String(value));
      }
    }
    const sorted = [...values];
    if (isNumericField(field)) {
      return sorted.sort((a, b) => Number(a) - Number(b));
    }
    return sorted.sort((a, b) => a.localeCompare(b));
  }

  function populateValueSuggestions(field) {
    const list = document.getElementById(config.filterValueListId);
    if (!list) {
      return;
    }
    list.innerHTML = "";
    for (const value of fieldValues(field)) {
      const option = $new("option", { value });
      list.appendChild(option);
    }
  }

  function updateSelectAllState() {
    const checkbox = document.getElementById(config.selectAllId);
    if (!checkbox) {
      return;
    }
    const visibleRows = Array.from(
      document.querySelectorAll(`#${config.tableId} tbody tr.benchmark-row`),
    ).filter((row) => !row.classList.contains("row-hidden"));

    if (visibleRows.length === 0) {
      checkbox.checked = false;
      checkbox.indeterminate = false;
      return;
    }

    const selectedVisibleCount = visibleRows.filter((row) =>
      selectedRowIds.has(Number(row.dataset.rowId)),
    ).length;
    checkbox.checked = selectedVisibleCount === visibleRows.length;
    checkbox.indeterminate =
      selectedVisibleCount > 0 && selectedVisibleCount < visibleRows.length;
  }

  function toggleRow(rowId, checked) {
    if (checked) {
      selectedRowIds.add(rowId);
    } else {
      selectedRowIds.delete(rowId);
    }
    updateSelectAllState();
  }

  function applyFilterAndSort() {
    const tbody = document.querySelector(`#${config.tableId} > tbody`);
    if (!tbody) {
      return;
    }
    const rows = tbody.querySelectorAll("tr.benchmark-row");

    rows.forEach((row) => {
      const rowId = Number(row.dataset.rowId);
      const dataRow = allRowsData.find((item) => item._id === rowId);
      let shouldShow = true;

      if (activeFilters.length > 0) {
        shouldShow = activeFilters.every((filter) =>
          matchesFilter(dataRow, filter),
        );
      }

      row.classList.toggle("row-hidden", !shouldShow);
    });

    const visibleRows = Array.from(rows).filter(
      (row) => !row.classList.contains("row-hidden"),
    );

    if (currentSortColumn >= 0 && currentSortDirection !== "none") {
      const header = document.querySelectorAll(`#${config.tableId} thead th`)[
        currentSortColumn
      ];
      const field = header ? header.dataset.field : null;
      if (field) {
        visibleRows.sort((rowA, rowB) => {
          const idA = Number(rowA.dataset.rowId);
          const idB = Number(rowB.dataset.rowId);
          const dataA = allRowsData.find((item) => item._id === idA);
          const dataB = allRowsData.find((item) => item._id === idB);
          const valueA = dataA[field];
          const valueB = dataB[field];
          const numeric = isNumericField(field);

          let comparison = 0;
          if (numeric) {
            const numberA = Number(valueA);
            const numberB = Number(valueB);
            comparison =
              (Number.isNaN(numberA) ? 0 : numberA) -
              (Number.isNaN(numberB) ? 0 : numberB);
          } else {
            comparison = String(valueA ?? "").localeCompare(
              String(valueB ?? ""),
            );
          }

          return currentSortDirection === "asc" ? comparison : -comparison;
        });
      }
    } else {
      visibleRows.sort((rowA, rowB) => {
        const indexA = rowOrderIndices[Number(rowA.dataset.rowId)];
        const indexB = rowOrderIndices[Number(rowB.dataset.rowId)];
        return indexA - indexB;
      });
    }

    visibleRows.forEach((row) => tbody.appendChild(row));
    updateSelectAllState();
  }

  function updateSortIndicators() {
    const headers = document.querySelectorAll(`#${config.tableId} thead th`);
    headers.forEach((header, index) => {
      const indicator = header.querySelector(".sort-indicator");
      if (!indicator) {
        return;
      }
      indicator.className = "sort-indicator";
      if (index === currentSortColumn) {
        if (currentSortDirection === "asc") {
          indicator.classList.add("sort-asc");
        } else if (currentSortDirection === "desc") {
          indicator.classList.add("sort-desc");
        }
      }
    });
  }

  function handleHeaderClick(columnIndex) {
    const headers = document.querySelectorAll(`#${config.tableId} thead th`);
    const header = headers[columnIndex];
    if (!header || !header.dataset.field) {
      return;
    }

    if (currentSortColumn === columnIndex) {
      if (currentSortDirection === "none") {
        currentSortDirection = "asc";
      } else if (currentSortDirection === "asc") {
        currentSortDirection = "desc";
      } else {
        currentSortDirection = "none";
      }
    } else {
      currentSortColumn = columnIndex;
      currentSortDirection = "asc";
    }

    updateSortIndicators();
    applyFilterAndSort();

    if (currentSortDirection === "none") {
      currentSortColumn = -1;
    }
  }

  function columnValues(row) {
    return columns
      .filter((col) => col.key !== "__select__")
      .filter((col) => !resultColumnKeys.includes(col.key) || config.hasResults)
      .map((col) => ({ field: col.key, value: row[col.key] ?? "" }));
  }

  function applyColumnVisibility() {
    const visible = loadColumnVisibility();
    const cells = document.querySelectorAll(
      `#${config.tableId} thead th, #${config.tableId} tbody td`,
    );
    cells.forEach((cell) => {
      const field = cell.dataset.field;
      if (field && Object.prototype.hasOwnProperty.call(visible, field)) {
        cell.classList.toggle("column-hidden", !visible[field]);
      }
    });
  }

  function renderTable() {
    const tbody = document.querySelector(`#${config.tableId} > tbody`);
    if (!tbody) {
      return;
    }
    tbody.innerHTML = "";
    rowOrderIndices = {};
    let orderIndex = 0;

    allRowsData.forEach((row) => {
      const tr = $new("tr", { className: "benchmark-row" });
      tr.dataset.rowId = row._id;

      if (config.hasSelection === false) {
        columnValues(row).forEach(({ field, value }) => {
          const cell = document.createElement("td");
          cell.className =
            "px-2 text-left border border-gray-300 dark:border-gray-700 bg-gray-900 bg-opacity-30";
          cell.dataset.field = field;
          cell.textContent = value ?? "";
          tr.appendChild(cell);
        });

        tbody.appendChild(tr);
        rowOrderIndices[row._id] = orderIndex;
        orderIndex++;
        return;
      }

      const checkboxCell = document.createElement("td");
      checkboxCell.dataset.field = "__select__";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = selectedRowIds.has(row._id);
      checkbox.addEventListener("change", () =>
        toggleRow(row._id, checkbox.checked),
      );
      checkboxCell.appendChild(checkbox);
      tr.appendChild(checkboxCell);

      columnValues(row).forEach(({ field, value }) => {
        const cell = document.createElement("td");
        cell.className =
          "px-2 text-left border border-gray-300 dark:border-gray-700 bg-gray-900 bg-opacity-30";
        cell.dataset.field = field;
        cell.textContent = value ?? "";
        tr.appendChild(cell);
      });

      tbody.appendChild(tr);
      rowOrderIndices[row._id] = orderIndex;
      orderIndex++;
    });

    const headers = document.querySelectorAll(`#${config.tableId} thead th`);
    headers.forEach((header, index) => {
      if (
        header.dataset.field &&
        header.dataset.field !== "__select__" &&
        !header.dataset.bound
      ) {
        header.dataset.bound = "true";
        header.addEventListener("click", () => handleHeaderClick(index));
      }
    });

    applyFilterAndSort();
    applyColumnVisibility();
  }

  function addFilter() {
    const input = document.getElementById(config.filterInputId);
    const fieldSelect = document.getElementById(config.filterFieldId);
    if (!input || !fieldSelect) {
      return;
    }

    const value = input.value.trim();
    const field = fieldSelect.value;
    if (value === "") {
      return;
    }

    const duplicate = activeFilters.find(
      (filter) =>
        filter.field === field &&
        filter.value.toLowerCase() === value.toLowerCase(),
    );
    if (duplicate) {
      input.value = "";
      return;
    }

    const newFilter = {
      id: ++globalFilterIdCounter,
      field,
      value,
      numeric: isNumericField(field),
    };

    activeFilters.push(newFilter);
    createFilterTag(newFilter);
    input.value = "";
    applyFilterAndSort();
  }

  function removeFilter(filterId) {
    activeFilters = activeFilters.filter((filter) => filter.id !== filterId);
    const tag = document.querySelector(`[data-filter-id="${filterId}"]`);
    if (tag) {
      tag.remove();
    }
    applyFilterAndSort();
  }

  function resetFilters() {
    const input = document.getElementById(config.filterInputId);
    if (input) {
      input.value = "";
    }
    activeFilters = [];
    clearAllFilterTags();
    currentSortColumn = -1;
    currentSortDirection = "none";
    updateSortIndicators();
    applyFilterAndSort();
  }

  async function loadData() {
    try {
      const response = await fetch(config.dataUrl);
      if (!response.ok) {
        throw new Error("Failed to load benchmark data");
      }
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("No benchmark data");
      }

      allRowsData = data.map((row, index) => normalizeRow(row, index));

      hideEmptyState();
      setControlsEnabled(true);
      renderTable();

      const filterFieldSelect = document.getElementById(config.filterFieldId);
      if (filterFieldSelect) {
        populateValueSuggestions(filterFieldSelect.value);
      }
    } catch (error) {
      showEmptyState();
      setControlsEnabled(true);
    }
  }

  function bindEvents() {
    populateFieldDropdown();

    const filterFieldSelect = document.getElementById(config.filterFieldId);
    if (filterFieldSelect) {
      populateValueSuggestions(filterFieldSelect.value);
      filterFieldSelect.addEventListener("change", () => {
        populateValueSuggestions(filterFieldSelect.value);
      });
    }

    const selectAll = document.getElementById(config.selectAllId);
    if (selectAll) {
      selectAll.addEventListener("change", () => {
        const visibleRows = Array.from(
          document.querySelectorAll(
            `#${config.tableId} tbody tr.benchmark-row`,
          ),
        ).filter((row) => !row.classList.contains("row-hidden"));

        visibleRows.forEach((row) => {
          const rowId = Number(row.dataset.rowId);
          const checkbox = row.querySelector('input[type="checkbox"]');
          if (checkbox) {
            checkbox.checked = selectAll.checked;
          }
          if (selectAll.checked) {
            selectedRowIds.add(rowId);
          } else {
            selectedRowIds.delete(rowId);
          }
        });

        updateSelectAllState();
      });
    }

    const addFilterButton = document.getElementById(config.addFilterId);
    if (addFilterButton) {
      addFilterButton.addEventListener("click", addFilter);
    }

    const resetFiltersButton = document.getElementById(config.resetFiltersId);
    if (resetFiltersButton) {
      resetFiltersButton.addEventListener("click", resetFilters);
    }

    if (config.makeChartsId) {
      const makeChartsButton = document.getElementById(config.makeChartsId);
      if (makeChartsButton) {
        makeChartsButton.addEventListener("click", () => {
          if (config.onOpenChartsConfig) {
            const selected = allRowsData.filter((r) =>
              selectedRowIds.has(r._id),
            );
            config.onOpenChartsConfig(selected);
          }
        });
      }
    }

    const filterInput = document.getElementById(config.filterInputId);
    if (filterInput) {
      filterInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          addFilter();
        }
      });
    }
  }

  return {
    bindEvents,
    loadData,
    config,
  };
}

function initScriptModal() {
  const modal = document.getElementById("scriptModal");
  const modalTitle = document.getElementById("scriptModalTitle");
  const modalContent = document.getElementById("scriptModalContent");
  const closeModalButton = document.getElementById("closeScriptModal");
  let lastFocusedElement = null;

  if (!modal || !modalTitle || !modalContent || !closeModalButton) {
    return;
  }

  function getFocusableElements() {
    return Array.from(
      modal.querySelectorAll(
        'button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
  }

  function trapFocus(event) {
    if (event.key !== "Tab") return;
    const focusable = getFocusableElements();
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey) {
      if (document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    } else if (document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function closeModal() {
    modal.classList.add("hidden");
    if (lastFocusedElement) {
      lastFocusedElement.focus();
      lastFocusedElement = null;
    }
  }

  function openModal(scriptKey, title) {
    lastFocusedElement = document.activeElement;
    const templateId = `${scriptKey}-script-template`;
    const template = document.getElementById(templateId);
    if (!template) {
      return;
    }

    modalTitle.textContent =
      title ||
      scriptKey.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
    modalContent.replaceChildren(template.content.cloneNode(true));
    modal.classList.remove("hidden");
    closeModalButton.focus();
  }

  document.querySelectorAll("[data-script]").forEach((button) => {
    button.addEventListener("click", () =>
      openModal(button.dataset.script, button.dataset.scriptTitle),
    );
  });

  closeModalButton.addEventListener("click", closeModal);

  modal.addEventListener("click", (event) => {
    if (
      event.target === modal ||
      event.target.classList.contains("bg-gray-500")
    ) {
      closeModal();
    }
  });

  modal.addEventListener("keydown", trapFocus);

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.classList.contains("hidden")) {
      closeModal();
    }
  });
}

function initMarkdownModal() {
  const modal = document.getElementById("mdModal");
  const modalTitle = document.getElementById("mdModalTitle");
  const modalContent = document.getElementById("mdModalContent");
  const closeModalButton = document.getElementById("closeMdModal");
  let lastFocusedElement = null;

  // Find all open-md-modal buttons (one per markdown doc)
  const buttons = document.querySelectorAll(".open-md-modal");

  if (
    !modal ||
    !modalTitle ||
    !modalContent ||
    !closeModalButton ||
    buttons.length === 0
  ) {
    return;
  }

  function getFocusableElements() {
    return Array.from(
      modal.querySelectorAll(
        'button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
  }

  function trapFocus(event) {
    if (event.key !== "Tab") return;
    const focusable = getFocusableElements();
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey) {
      if (document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    } else if (document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function closeModal() {
    modal.classList.add("hidden");
    if (lastFocusedElement) {
      lastFocusedElement.focus();
      lastFocusedElement = null;
    }
  }

  async function openModal(path, title) {
    lastFocusedElement = document.activeElement;
    modalTitle.textContent = title;
    modalContent.innerHTML = '<div class="spinner"></div>';
    modalContent.classList.remove("markdown-body");
    modal.classList.remove("hidden");
    closeModalButton.focus();

    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error("Failed to load");
      const md = await response.text();

      const worker = MarkdownWorker();

      worker.onmessage = (e) => {
        if (e.data.type === "done") {
          modalContent.innerHTML =
            '<div class="markdown-content">' + e.data.html + "</div>";
          modalContent.classList.add("markdown-body");
          worker.terminate();
        }
      };

      worker.onerror = () => {
        modalContent.innerHTML =
          '<p class="text-red-400">Failed to load content.</p>';
        worker.terminate();
      };

      worker.postMessage({ type: "render", md });
    } catch {
      modalContent.innerHTML =
        '<p class="text-red-400">Failed to load content.</p>';
    }
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () =>
      openModal(button.dataset.md, button.dataset.mdTitle),
    );
  });

  closeModalButton.addEventListener("click", closeModal);

  modal.addEventListener("click", (event) => {
    if (
      event.target === modal ||
      event.target.classList.contains("bg-gray-500")
    ) {
      closeModal();
    }
  });

  modal.addEventListener("keydown", trapFocus);

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.classList.contains("hidden")) {
      closeModal();
    }
  });
}

function initColumnToggle(config) {
  let visibility = loadColumnVisibility();
  let lastFocusedElement = null;

  function setColumnVisible(field, visible) {
    visibility[field] = visible;
    saveColumnVisibility(visibility);
    const cells = document.querySelectorAll(
      `#${config.tableId} thead th[data-field="${field}"], #${config.tableId} tbody td[data-field="${field}"]`,
    );
    cells.forEach((cell) => {
      cell.classList.toggle("column-hidden", !visible);
    });
  }

  const openButton = document.getElementById(config.openColumnsId);
  const modal = document.getElementById(config.columnsModalId);
  const content = document.getElementById(config.columnsModalContentId);
  const closeButton = document.getElementById(config.closeColumnsModalId);

  if (!openButton || !modal || !content || !closeButton) {
    return;
  }

  function getFocusableElements() {
    return Array.from(
      modal.querySelectorAll(
        'button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
  }

  function trapFocus(event) {
    if (event.key !== "Tab") return;
    const focusable = getFocusableElements();
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey) {
      if (document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    } else if (document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function buildModal() {
    lastFocusedElement = document.activeElement;
    content.innerHTML = "";
    const grid = document.createElement("div");
    grid.className = "grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2";
    columns.forEach((col) => {
      if (col.toggleable === false) {
        return;
      }
      const label = document.createElement("label");
      label.className =
        "flex items-center gap-2 text-light-text cursor-pointer hover:bg-dark-background hover-opacity-20 rounded px-2 py-1";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = visibility[col.key] !== false;
      input.addEventListener("change", () => {
        setColumnVisible(col.key, input.checked);
      });
      const text = document.createElement("span");
      text.className = "text-sm";
      text.textContent = col.label;
      label.appendChild(input);
      label.appendChild(text);
      grid.appendChild(label);
    });
    content.appendChild(grid);
    modal.classList.remove("hidden");
    closeButton.focus();
  }

  function closeModal() {
    modal.classList.add("hidden");
    if (lastFocusedElement) {
      lastFocusedElement.focus();
      lastFocusedElement = null;
    }
  }

  openButton.addEventListener("click", buildModal);
  closeButton.addEventListener("click", closeModal);
  modal.addEventListener("click", (event) => {
    if (
      event.target === modal ||
      event.target.classList.contains("bg-gray-500")
    ) {
      closeModal();
    }
  });
  modal.addEventListener("keydown", trapFocus);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.classList.contains("hidden")) {
      closeModal();
    }
  });
}

function initChartsConfigModal(config) {
  const modal = document.getElementById("chartsConfigModal");
  const modalTitle = document.getElementById("chartsConfigModalTitle");
  const modalContent = document.getElementById("chartsConfigModalContent");
  const includeLegendCheckbox = document.getElementById("chartsIncludeLegend");
  const xAxisSelect = document.getElementById("chartsXAxis");
  const doItButton = document.getElementById("chartsDoIt");
  const closeModalButton = document.getElementById("closeChartsConfigModal");
  let lastFocusedElement = null;
  let currentSelectedRows = [];

  if (
    !modal ||
    !modalTitle ||
    !modalContent ||
    !closeModalButton ||
    !includeLegendCheckbox ||
    !xAxisSelect ||
    !doItButton
  ) {
    return;
  }

  function getFocusableElements() {
    return Array.from(
      modal.querySelectorAll(
        'button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
  }

  function trapFocus(event) {
    if (event.key !== "Tab") return;
    const focusable = getFocusableElements();
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey) {
      if (document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    } else if (document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function closeModal() {
    modal.classList.add("hidden");
    if (lastFocusedElement) {
      lastFocusedElement.focus();
      lastFocusedElement = null;
    }
  }

  function uniqueValuesForAxis(rows, axisKey) {
    const values = new Set();
    for (const row of rows) {
      const v = row[axisKey];
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        values.add(String(v));
      }
    }
    return values;
  }

  function openModal(selectedRows) {
    currentSelectedRows = selectedRows;
    lastFocusedElement = document.activeElement;
    includeLegendCheckbox.checked =
      localStorage.getItem("chartsIncludeLegend") !== "false";

    let selectedKey = "n_depth";
    let firstEnabled = null;

    Array.from(xAxisSelect.options).forEach((opt) => {
      const uniqueCount = uniqueValuesForAxis(selectedRows, opt.value).size;
      if (uniqueCount > 1) {
        opt.disabled = false;
        if (!firstEnabled) firstEnabled = opt.value;
      } else {
        opt.disabled = true;
      }
    });

    const depthOpt = xAxisSelect.querySelector('option[value="n_depth"]');
    const persistedAxis = localStorage.getItem("chartsXAxis");
    const persistedOpt = persistedAxis
      ? xAxisSelect.querySelector(`option[value="${persistedAxis}"]`)
      : null;

    if (persistedOpt && !persistedOpt.disabled) {
      selectedKey = persistedAxis;
    } else if (depthOpt && !depthOpt.disabled) {
      selectedKey = "n_depth";
    } else if (firstEnabled) {
      selectedKey = firstEnabled;
    } else {
      selectedKey = null;
    }

    if (selectedKey) {
      xAxisSelect.value = selectedKey;
    }

    modal.classList.remove("hidden");
    closeModalButton.focus();
  }

  doItButton.addEventListener("click", () => {
    localStorage.setItem(
      "chartsIncludeLegend",
      String(includeLegendCheckbox.checked),
    );
    localStorage.setItem("chartsXAxis", xAxisSelect.value);
    closeModal();
    renderMainCharts(currentSelectedRows, {
      includeLegend: includeLegendCheckbox.checked,
      axisKey: xAxisSelect.value,
    });
    const chartsContainer = document.getElementById("charts-container");
    if (chartsContainer) {
      chartsContainer.scrollIntoView({ behavior: "smooth" });
    }
  });

  closeModalButton.addEventListener("click", closeModal);

  modal.addEventListener("click", (event) => {
    if (
      event.target === modal ||
      event.target.classList.contains("bg-gray-500")
    ) {
      closeModal();
    }
  });

  modal.addEventListener("keydown", trapFocus);

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.classList.contains("hidden")) {
      closeModal();
    }
  });

  config.onOpenChartsConfig = (selectedRows) => openModal(selectedRows);
}

const CHART_COLORS = [
  "rgba(59, 130, 246, 1)",
  "rgba(147, 112, 187, 1)",
  "rgba(16, 185, 141, 1)",
  "rgba(234, 89, 77, 1)",
  "rgba(234, 179, 16, 1)",
  "rgba(93, 175, 166, 1)",
];

function bandColor(c) {
  const m = c.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*\d+\)/);
  if (m) {
    const r = Math.min(255, parseInt(m[1], 10) + 50);
    const g = Math.min(255, parseInt(m[2], 10) + 40);
    const b = Math.min(255, parseInt(m[3], 10) + 30);
    return `rgba(${r}, ${g}, ${b}, 0.1)`;
  }
  return c;
}

function makeComboKey(row) {
  const parts = [`${row.type_k ?? "null"}/${row.type_v ?? "null"}`];
  parts.push(`nkvo=${row.no_kv_offload}`);
  parts.push(row.devices === "none" || !row.devices ? "CPU" : row.devices);
  if (row.n_cpu_moe && Number(row.n_cpu_moe) > 0) {
    parts.push(`cmoe=${row.n_cpu_moe}`);
  }
  return parts.join(" | ");
}

const AXIS_CONFIG = {
  n_depth: { label: "Context Depth", numeric: true },
  no_kv_offload: { label: "NKVO", numeric: false },
  n_gpu_layers: { label: "NGL", numeric: true },
  n_cpu_moe: { label: "NCMOE", numeric: true },
};

function makeSeriesKey(row, axisKey, hasMultipleModels) {
  const modelPrefix = hasMultipleModels ? `${row.model} | ` : "";
  const parts = [`${row.type_k ?? "null"}/${row.type_v ?? "null"}`];
  if (axisKey !== "no_kv_offload") {
    parts.push(`nkvo=${row.no_kv_offload ?? "null"}`);
  }
  parts.push(row.devices === "none" || !row.devices ? "CPU" : row.devices);
  if (axisKey !== "n_cpu_moe" && row.n_cpu_moe && Number(row.n_cpu_moe) > 0) {
    parts.push(`cmoe=${row.n_cpu_moe}`);
  }
  return modelPrefix + parts.join(" | ");
}

function axisValues(rows, axisKey) {
  const values = new Set();
  for (const row of rows) {
    const v = row[axisKey];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      values.add(String(v));
    }
  }
  const arr = [...values];
  const cfg = AXIS_CONFIG[axisKey];
  if (cfg && cfg.numeric) {
    return arr.sort((a, b) => Number(a) - Number(b));
  }
  return arr.sort();
}

function renderMainCharts(selectedRows, config) {
  const includeLegend = config && config.includeLegend !== false;
  const axisKey = config && config.axisKey ? config.axisKey : "n_depth";
  const container = document.getElementById("charts-container");
  if (!container) return;
  container.innerHTML = "";

  if (!selectedRows || selectedRows.length === 0) {
    const msg = $new("div", { className: "text-dark-text text-center py-8" });
    msg.textContent = "Select rows first, then click Make Charts.";
    container.appendChild(msg);
    return;
  }

  const models = [
    ...new Set(selectedRows.map((r) => r.model).filter(Boolean)),
  ].sort();

  const metrics = [
    { key: "pp_ts", title: "Prompt Processing" },
    { key: "tg_ts", title: "Text Generation" },
  ];

  models.forEach((model) => {
    const modelRows = selectedRows.filter((r) => r.model === model);
    const combos = [
      ...new Set(modelRows.map((r) => makeSeriesKey(r, axisKey, false))),
    ];
    const minHeight = 540 + combos.length * 20 * (includeLegend ? 1.2 : 0.2);

    metrics.forEach((metric) => {
      const card = $new("div", {
        className: "bg-dark-secondary rounded-lg p-6",
      });
      card.style.height = `${minHeight}px`;
      const canvas = $new("canvas", {
        id: `chart-${metric.key}-${model.replace(/[^a-zA-Z0-9]/g, "-")}`,
      });
      card.appendChild(canvas);
      container.appendChild(card);

      renderChartForMetric(
        canvas,
        modelRows,
        metric.key,
        model,
        includeLegend,
        axisKey,
      );
    });
  });
}

function renderChartForMetric(
  canvas,
  selectedRows,
  metricKey,
  modelName,
  includeLegend,
  axisKey,
) {
  axisKey = axisKey || "n_depth";

  if (canvas._chart) {
    canvas._chart.destroy();
    canvas._chart = null;
  }

  const axisValuesList = axisValues(selectedRows, axisKey);
  const combos = [
    ...new Set(selectedRows.map((r) => makeSeriesKey(r, axisKey, false))),
  ];

  const labels = axisValuesList.map((v) => String(v));

  const seriesData = combos.map((combo) => {
    const pts = selectedRows
      .filter((r) => makeSeriesKey(r, axisKey, false) === combo)
      .map((r) => ({
        axisVal: String(r[axisKey]),
        value: Number(r[metricKey]) || 0,
        std: Number(r[`${metricKey}_stddev`]) || 0,
      }));
    const yVals = axisValuesList.map((av) => {
      const found = pts.find((p) => p.axisVal === av);
      return found ? found.value : null;
    });
    const yStd = axisValuesList.map((av) => {
      const found = pts.find((p) => p.axisVal === av);
      return found ? found.std : 0;
    });
    const yUpper = yVals.map((v, i) => (v === null ? null : v + yStd[i]));
    const yLower = yVals.map((v, i) =>
      v === null ? null : Math.max(0, v - yStd[i]),
    );
    return {
      label: combo,
      x: axisValuesList.map((av) => String(av)),
      y: yVals,
      upper: yUpper,
      lower: yLower,
    };
  });

  const finalDatasets = [];

  seriesData.forEach((s, i) => {
    const color = CHART_COLORS[i % CHART_COLORS.length];
    finalDatasets.push({
      label: s.label,
      data: s.x.map((x, j) => ({ x, y: s.y[j] })),
      type: "line",
      borderColor: color,
      backgroundColor: color,
      fill: "none",
      borderWidth: 2,
      pointRadius: 4,
      pointBackgroundColor: color,
    });
    finalDatasets.push({
      label: `${s.label} (max)`,
      data: s.x.map((x, j) => ({ x, y: s.upper[j] })),
      type: "line",
      borderColor: "transparent",
      backgroundColor: bandColor(color),
      fill: "+1",
      borderWidth: 0,
      pointRadius: 0,
      showInLegend: false,
    });
    finalDatasets.push({
      label: `${s.label} (min)`,
      data: s.x.map((x, j) => ({ x, y: s.lower[j] })),
      type: "line",
      borderColor: "transparent",
      backgroundColor: "transparent",
      fill: false,
      borderWidth: 0,
      pointRadius: 0,
      showInLegend: false,
    });
  });

  canvas._chart = new Chart(canvas, {
    data: {
      labels,
      datasets: finalDatasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: { top: 24, bottom: 44, left: 56, right: 24 },
      },
      plugins: {
        title: {
          display: true,
          text: modelName,
          color: "#fff",
          font: { size: 14, weight: "bold" },
          align: "start",
        },
        subtitle: {
          display: true,
          text:
            metricKey === "pp_ts"
              ? "Prefill (Prompt Processing)"
              : "Decode (Token Generation)",
          color: "#fff",
          font: { size: 12 },
          align: "start",
          padding: { bottom: 24 },
        },
        legend: {
          display: includeLegend !== false,
          position: "bottom",
          align: "start",
          labels: {
            color: "#fff",
            filter: (item) =>
              !item.text.includes(" (max)") && !item.text.includes(" (min)"),
          },
          boxWidth: 12,
          boxHeight: 12,
        },
      },
      scales: {
        x: {
          type: "category",
          title: {
            display: true,
            text: AXIS_CONFIG[axisKey].label,
            color: "#fff",
            font: { size: 12 },
          },
          ticks: {
            color: "#fff",
            font: { size: 12 },
          },
          border: { color: "#4b545e" },
        },
        y: {
          title: {
            display: true,
            text: metricKey === "pp_ts" ? "Prefill t/s" : "Decode t/s",
            color: "#fff",
            font: { size: 12 },
          },
          ticks: {
            color: "#fff",
            font: { size: 12 },
          },
          border: { color: "#4b545e" },
        },
      },
      tooltip: {
        enabled: true,
      },
    },
  });
}

const mainTable = createTableManager({
  tableId: "benchmarks-table",
  dataUrl: "assets/benchmarks.json",
  emptyStateId: "empty-state",
  selectAllId: "select-all-visible",
  filterInputId: "filter-input",
  filterFieldId: "filter-field",
  filterValueListId: "filter-values",
  addFilterId: "add-filter",
  resetFiltersId: "reset-filters",
  makeChartsId: "make-charts",
  tagsId: "filter-tags",
  hasResults: true,
  hasSelection: true,
  showColumnToggle: true,
  openColumnsId: "open-columns",
  columnsModalId: "columnsModal",
  columnsModalContentId: "columnsModalContent",
  closeColumnsModalId: "closeColumnsModal",
  onOpenChartsConfig: null,
});

const failedTable = createTableManager({
  tableId: "failed-benchmarks-table",
  dataUrl: "assets/failed-benchmarks.json",
  emptyStateId: "failed-empty-state",
  selectAllId: "failed-select-all-visible",
  filterInputId: "failed-filter-input",
  filterFieldId: "failed-filter-field",
  filterValueListId: "failed-filter-values",
  addFilterId: "failed-add-filter",
  resetFiltersId: "failed-reset-filters",
  tagsId: "failed-filter-tags",
  hasResults: false,
  hasSelection: false,
  showColumnToggle: false,
});

document.addEventListener("DOMContentLoaded", () => {
  initScriptModal();
  initMarkdownModal();
  if (mainTable.config.showColumnToggle) {
    initColumnToggle(mainTable.config);
  }
  initChartsConfigModal(mainTable.config);
  mainTable.bindEvents();
  failedTable.bindEvents();
  mainTable.loadData();
  failedTable.loadData();
});
