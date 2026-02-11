import { MayoralityService } from "../../services/mayorality-service.js";
import { TableManager } from "../../utils/table-manager.js";
import { FilterManager } from "../../utils/filter-manager.js";
import { handleExport } from "../../utils/export.js";
import { ErrorHandler } from "../../utils/error-handler.js";
import { ApiResponse } from "../../utils/api-response.js";

let tableManager;
let filterManager;

async function loadData() {
  const { q, page, limit, fromDate, toDate, filters } = tableManager.state;
  const sort = tableManager.sortString;

  const res = await MayoralityService.getHome(
    q,
    sort,
    page,
    limit,
    fromDate,
    toDate,
    filters,
  );

  if (res.ok) {
    renderRows(res.data.rows);
    updateCounters(res.data);

    tableManager.renderPagination(res.data.pagination);
    tableManager.updateSortIcons();
  } else {
    ErrorHandler.handle(res);
  }
}

function renderRows(rows) {
  const tableBody = document.querySelector(".result-table tbody");
  if (!tableBody) return;

  tableBody.innerHTML = rows
    .map(
      (item) => `
        <tr>
            <td>${item.center_ekatte || "-"}</td>
            <td>${item.center_name || "-"}</td>
            <td>${item.mayorality_id}</td>
            <td>${item.mayorality_name}</td>
            <td>${item.municipality_name}</td>
            <td>${item.region_name}</td>
            <td>${new Date(item.mayorality_last_change).toLocaleDateString(
              "bg-BG",
            )}</td>
            <td>
                <button class="action-btn btn-info" data-id="${
                  item.mayorality_id
                }" data-action="info">Инфо</button>
                <button class="action-btn btn-edit" data-id="${
                  item.mayorality_id
                }" data-action="edit">Редакция</button>
                <button class="action-btn btn-delete" data-id="${
                  item.mayorality_id
                }" data-action="delete">Изтриване</button>
            </td>
        </tr>
    `,
    )
    .join("");
}

function updateCounters(data) {
  const resHead = document.getElementById("res-header");
  if (resHead) resHead.innerHTML = `Резултати (${data.pagination.total})`;

  const resultCount = document.getElementById("result-count");
  if (resultCount) {
    resultCount.innerHTML = `Намерени кметства: ${data.filteredCount}/${data.totalCount}`;
  }
}

async function showInfo(id) {
  const response = await MayoralityService.getInfo(id);
  if (!response.ok) {
    ErrorHandler.handle(response);
    return;
  }

  const data = response.data;
  const modal = document.getElementById("infoModal");

  document.getElementById("modalTitle").textContent =
    `${data.name} (${data.mayorality_id})`;
  document.getElementById("m-name").textContent = data.name;
  document.getElementById("m-ekatte").textContent = data.center_ekatte;
  document.getElementById("m-center-name").textContent = data.center_name;
  document.getElementById("m-region").textContent =
    `${data.region_name} (${data.region_id})`;
  document.getElementById("m-municipality").textContent =
    `${data.municipality_name} (${data.municipality_id})`;
  document.getElementById("m-id").textContent = data.mayorality_id;
  document.getElementById("m-settlements-count").textContent =
    data.settlements_count ?? "0";
  const dateObj = new Date(data.last_changed_on);

  const formattedDate = dateObj.toLocaleString("bg-BG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  document.getElementById("m-last-change").textContent = formattedDate;
  modal.classList.add("active");
}

async function handleDelete(id, mayoralityName) {
  const confirmed = confirm(
    `ВНИМАНИЕ: Ще изтриете кметството "${mayoralityName}" и всички свързани с него селища! Сигурни ли сте?`,
  );

  if (!confirmed) return;

  const check = await MayoralityService.checkDependencies(id);
  if (check.ok && check.data.valid) {
    const proceed = confirm(
      `${check.data.message}\nСигурни ли сте, че искате да продължите?`,
    );
    if (!proceed) return;
  }

  const response = await MayoralityService.delete(id);
  if (response.ok) {
    alert("Кметството беше изтрито успешно.");
    loadData();
  } else {
    ErrorHandler.handle(response);
  }
}

export async function handleExportClick(type) {
  const excelBtn = document.getElementById("export-excel-btn");
  const csvBtn = document.getElementById("export-csv-btn");

  if (excelBtn) excelBtn.disabled = true;
  if (csvBtn) csvBtn.disabled = true;

  try {
    const response = type === "excel"
      ? await MayoralityService.getExcelExport(tableManager.state)
      : await MayoralityService.getCsvExport(tableManager.state);

    await handleExport(response);

  } catch (err) {
    ErrorHandler.handle(ApiResponse.error("Грешка при експортиране", [err.message]));
  } finally {
    if (excelBtn) excelBtn.disabled = false;
    if (csvBtn) csvBtn.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initTable();
  initFilterManager();
  setupEventListeners();
  loadData();
});

function initTable() {
  tableManager = new TableManager({
    tableSelector: ".result-table",
    onParamsChange: loadData,
  });
}

function initFilterManager() {
  filterManager = new FilterManager({
    containerSelector: "#active-filters-container",
    onFilterChange: (newFilters) => {
      tableManager.state.filters = newFilters;
      tableManager.state.page = 1;
      loadData();
    },
  });
}

function setupEventListeners() {
  const searchInput = document.getElementById("search-data");
  let timeout;
  searchInput?.addEventListener("input", (e) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      tableManager.state.q = e.target.value;
      tableManager.state.page = 1;
      loadData();
    }, 300);
  });

  const addFilterBtn = document.getElementById("add-filter-btn");
  const filterSelect = document.getElementById("filter-type");
  addFilterBtn?.addEventListener("click", () => {
    const col = filterSelect.value;
    const label = filterSelect.options[filterSelect.selectedIndex].text;
    if (col) {
      filterManager.addFilter(col, label);
      filterSelect.value = "";
    }
  });

  document
    .getElementById("export-excel-btn")
    ?.addEventListener("click", () => handleExportClick("excel"));
  document
    .getElementById("export-csv-btn")
    ?.addEventListener("click", () => handleExportClick("csv"));

  document
    .getElementById("filter-from-date")
    ?.addEventListener("change", (e) => {
      tableManager.state.fromDate = e.target.value;
      loadData();
    });
  document.getElementById("filter-to-date")?.addEventListener("change", (e) => {
    tableManager.state.toDate = e.target.value;
    loadData();
  });

  document.addEventListener("click", handleGlobalClicks);
}

async function handleGlobalClicks(e) {
  const target = e.target;

  const action = target.dataset.action;
  const id = target.dataset.id;

  if (action) {
    if (action === "info") showInfo(id);
    if (action === "edit")
      window.location.href = `edit-mayorality.html?id=${id}`;
    if (action === "delete") {
      const name = target
        .closest("tr")
        .querySelector("td:nth-child(4)").textContent;
      handleDelete(id, name);
    }
  }

  const modal = document.getElementById("infoModal");
  if (target === modal) modal?.classList.remove("active");
}
