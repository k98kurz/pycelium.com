import './input.css';

const filterFields = [
    { key: 'model', label: 'Model', numeric: false },
    { key: 'devices', label: 'Device', numeric: false },
    { key: 'n_gpu_layers', label: 'GPU Layers', numeric: true },
    { key: 'n_cpu_moe', label: 'CPU MoE', numeric: true },
    { key: 'split_mode', label: 'Split Mode', numeric: false },
    { key: 'n_threads', label: 'Threads', numeric: true },
    { key: 'type_k', label: 'K Quant', numeric: false },
    { key: 'type_v', label: 'V Quant', numeric: false },
    { key: 'no_kv_offload', label: 'NKVO', numeric: false },
    { key: 'n_depth', label: 'Depth', numeric: true },
];

let globalFilterIdCounter = 0;

function $(selector) {
    return document.querySelectorAll(selector);
}

function $new(element, options) {
    const e = document.createElement(element);
    for (const key in options) {
        if (key === 'classList') {
            e.className = options[key];
        } else {
            e[key] = options[key];
        }
    }
    return e;
}

function isNumericField(field) {
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
        model: row.model ?? row.model_filename ?? '',
        devices: row.devices ?? row.device ?? '',
        n_gpu_layers: row.n_gpu_layers ?? '',
        n_cpu_moe: row.n_cpu_moe ?? '',
        split_mode: row.split_mode ?? '',
        n_threads: row.n_threads ?? '',
        type_k: row.type_k ?? row.k_quant ?? '',
        type_v: row.type_v ?? row.v_quant ?? '',
        no_kv_offload: row.no_kv_offload ?? row.nkvo ?? '',
        n_depth: row.n_depth ?? row.depth ?? '',
        pp_ts: row.pp_ts ?? '',
        tg_ts: row.tg_ts ?? '',
    };
}

function createTableManager(config) {
    let allRowsData = [];
    let originalRowOrder = [];
    let activeFilters = [];
    let currentSortColumn = -1;
    let currentSortDirection = 'none';
    let selectedRowIds = new Set();

    function setControlsEnabled(enabled) {
        const ids = [config.selectAllId, config.filterInputId, config.filterFieldId, config.addFilterId, config.resetFiltersId];
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
            emptyState.classList.remove('hidden');
        }
        if (table) {
            table.classList.add('hidden');
        }
    }

    function hideEmptyState() {
        const emptyState = document.getElementById(config.emptyStateId);
        const table = document.getElementById(config.tableId);
        if (emptyState) {
            emptyState.classList.add('hidden');
        }
        if (table) {
            table.classList.remove('hidden');
        }
    }

    function populateFieldDropdown() {
        const select = document.getElementById(config.filterFieldId);
        if (!select) {
            return;
        }
        select.innerHTML = '';
        filterFields.forEach((field) => {
            const option = document.createElement('option');
            option.value = field.key;
            option.textContent = field.label;
            select.appendChild(option);
        });
    }

    function createFilterTag(filter) {
        const container = document.getElementById(config.tagsId);
        const tag = document.createElement('div');
        tag.className = 'filter-tag';
        tag.setAttribute('data-filter-id', filter.id);

        const label = document.createElement('span');
        label.textContent = `${fieldLabel(filter.field)}:${filter.value}`;

        const removeButton = document.createElement('button');
        removeButton.className = 'remove-filter';
        removeButton.innerHTML = '×';
        removeButton.setAttribute('aria-label', `Remove filter: ${fieldLabel(filter.field)}:${filter.value}`);
        removeButton.addEventListener('click', () => removeFilter(filter.id));

        tag.appendChild(label);
        tag.appendChild(removeButton);
        if (container) {
            container.appendChild(tag);
        }
    }

    function clearAllFilterTags() {
        const container = document.getElementById(config.tagsId);
        if (container) {
            container.innerHTML = '';
        }
    }

    function matchesFilter(row, filter) {
        const actual = row[filter.field];
        const expected = String(filter.value).trim();
        if (filter.numeric) {
            return String(actual).trim() === expected;
        }
        return String(actual ?? '').toLowerCase().includes(expected.toLowerCase());
    }

    function updateSelectAllState() {
        const checkbox = document.getElementById(config.selectAllId);
        if (!checkbox) {
            return;
        }
        const visibleRows = Array.from(document.querySelectorAll(`#${config.tableId} tbody tr.benchmark-row`))
            .filter((row) => !row.classList.contains('row-hidden'));

        if (visibleRows.length === 0) {
            checkbox.checked = false;
            checkbox.indeterminate = false;
            return;
        }

        const selectedVisibleCount = visibleRows.filter((row) => selectedRowIds.has(Number(row.dataset.rowId))).length;
        checkbox.checked = selectedVisibleCount === visibleRows.length;
        checkbox.indeterminate = selectedVisibleCount > 0 && selectedVisibleCount < visibleRows.length;
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
        const rows = tbody.querySelectorAll('tr.benchmark-row');

        rows.forEach((row) => {
            const rowId = Number(row.dataset.rowId);
            const dataRow = allRowsData.find((item) => item._id === rowId);
            let shouldShow = true;

            if (activeFilters.length > 0) {
                shouldShow = activeFilters.every((filter) => matchesFilter(dataRow, filter));
            }

            row.classList.toggle('row-hidden', !shouldShow);
        });

        const visibleRows = Array.from(rows).filter((row) => !row.classList.contains('row-hidden'));

        if (currentSortColumn >= 0 && currentSortDirection !== 'none') {
            const header = document.querySelectorAll(`#${config.tableId} thead th`)[currentSortColumn];
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
                        comparison = (Number.isNaN(numberA) ? 0 : numberA) - (Number.isNaN(numberB) ? 0 : numberB);
                    } else {
                        comparison = String(valueA ?? '').localeCompare(String(valueB ?? ''));
                    }

                    return currentSortDirection === 'asc' ? comparison : -comparison;
                });
            }
        } else {
            visibleRows.sort((rowA, rowB) => {
                const indexA = originalRowOrder.indexOf(rowA);
                const indexB = originalRowOrder.indexOf(rowB);
                return indexA - indexB;
            });
        }

        visibleRows.forEach((row) => tbody.appendChild(row));
        updateSelectAllState();
    }

    function updateSortIndicators() {
        const headers = document.querySelectorAll(`#${config.tableId} thead th`);
        headers.forEach((header, index) => {
            const indicator = header.querySelector('.sort-indicator');
            if (!indicator) {
                return;
            }
            indicator.className = 'sort-indicator';
            if (index === currentSortColumn) {
                if (currentSortDirection === 'asc') {
                    indicator.classList.add('sort-asc');
                } else if (currentSortDirection === 'desc') {
                    indicator.classList.add('sort-desc');
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
            if (currentSortDirection === 'none') {
                currentSortDirection = 'asc';
            } else if (currentSortDirection === 'asc') {
                currentSortDirection = 'desc';
            } else {
                currentSortDirection = 'none';
            }
        } else {
            currentSortColumn = columnIndex;
            currentSortDirection = 'asc';
        }

        updateSortIndicators();
        applyFilterAndSort();

        if (currentSortDirection === 'none') {
            currentSortColumn = -1;
        }
    }

    function renderTable() {
        const tbody = document.querySelector(`#${config.tableId} > tbody`);
        if (!tbody) {
            return;
        }
        tbody.innerHTML = '';
        originalRowOrder = [];

        allRowsData.forEach((row) => {
            const tr = $new('tr', { className: 'benchmark-row' });
            tr.dataset.rowId = row._id;

            const checkboxCell = document.createElement('td');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = selectedRowIds.has(row._id);
            checkbox.addEventListener('change', () => toggleRow(row._id, checkbox.checked));
            checkboxCell.appendChild(checkbox);
            tr.appendChild(checkboxCell);

            const values = [
                row.model,
                row.devices,
                row.n_gpu_layers,
                row.n_cpu_moe,
                row.split_mode,
                row.n_threads,
                row.type_k,
                row.type_v,
                row.no_kv_offload,
                row.n_depth,
            ];

            if (config.hasResults) {
                values.push(row.pp_ts, row.tg_ts);
            }

            values.forEach((value) => {
                const cell = document.createElement('td');
                cell.className = 'px-2 text-left border border-gray-300 dark:border-gray-700 bg-gray-900 bg-opacity-30';
                cell.textContent = value ?? '';
                tr.appendChild(cell);
            });

            tbody.appendChild(tr);
            originalRowOrder.push(tr);
        });

        const headers = document.querySelectorAll(`#${config.tableId} thead th`);
        headers.forEach((header, index) => {
            if (header.dataset.field && !header.dataset.bound) {
                header.dataset.bound = 'true';
                header.addEventListener('click', () => handleHeaderClick(index));
            }
        });

        applyFilterAndSort();
    }

    function addFilter() {
        const input = document.getElementById(config.filterInputId);
        const fieldSelect = document.getElementById(config.filterFieldId);
        if (!input || !fieldSelect) {
            return;
        }

        const value = input.value.trim();
        const field = fieldSelect.value;
        if (value === '') {
            return;
        }

        const duplicate = activeFilters.find((filter) => filter.field === field && filter.value.toLowerCase() === value.toLowerCase());
        if (duplicate) {
            input.value = '';
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
        input.value = '';
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
            input.value = '';
        }
        activeFilters = [];
        clearAllFilterTags();
        currentSortColumn = -1;
        currentSortDirection = 'none';
        updateSortIndicators();
        applyFilterAndSort();
    }

    async function loadData() {
        try {
            const response = await fetch(config.dataUrl);
            if (!response.ok) {
                throw new Error('Failed to load benchmark data');
            }
            const data = await response.json();
            if (!Array.isArray(data) || data.length === 0) {
                throw new Error('No benchmark data');
            }

            allRowsData = data.map((row, index) => normalizeRow(row, index));

            hideEmptyState();
            setControlsEnabled(true);
            renderTable();
        } catch (error) {
            showEmptyState();
            setControlsEnabled(true);
        }
    }

    function bindEvents() {
        populateFieldDropdown();

        const selectAll = document.getElementById(config.selectAllId);
        if (selectAll) {
            selectAll.addEventListener('change', () => {
                const visibleRows = Array.from(document.querySelectorAll(`#${config.tableId} tbody tr.benchmark-row`))
                    .filter((row) => !row.classList.contains('row-hidden'));

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
            addFilterButton.addEventListener('click', addFilter);
        }

        const resetFiltersButton = document.getElementById(config.resetFiltersId);
        if (resetFiltersButton) {
            resetFiltersButton.addEventListener('click', resetFilters);
        }

        if (config.makeChartsId) {
            const makeChartsButton = document.getElementById(config.makeChartsId);
            if (makeChartsButton) {
                makeChartsButton.addEventListener('click', () => {
                    alert('Coming soon');
                });
            }
        }

        const filterInput = document.getElementById(config.filterInputId);
        if (filterInput) {
            filterInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    addFilter();
                }
            });
        }
    }

    return {
        bindEvents,
        loadData,
    };
}

const mainTable = createTableManager({
    tableId: 'benchmarks-table',
    dataUrl: 'assets/benchmarks.json',
    emptyStateId: 'empty-state',
    selectAllId: 'select-all-visible',
    filterInputId: 'filter-input',
    filterFieldId: 'filter-field',
    addFilterId: 'add-filter',
    resetFiltersId: 'reset-filters',
    makeChartsId: 'make-charts',
    tagsId: 'filter-tags',
    hasResults: true,
});

const failedTable = createTableManager({
    tableId: 'failed-benchmarks-table',
    dataUrl: 'assets/failed-benchmarks.json',
    emptyStateId: 'failed-empty-state',
    selectAllId: 'failed-select-all-visible',
    filterInputId: 'failed-filter-input',
    filterFieldId: 'failed-filter-field',
    addFilterId: 'failed-add-filter',
    resetFiltersId: 'failed-reset-filters',
    tagsId: 'failed-filter-tags',
    hasResults: false,
});

document.addEventListener('DOMContentLoaded', () => {
    mainTable.bindEvents();
    failedTable.bindEvents();
    mainTable.loadData();
    failedTable.loadData();
});
