import { SettlementService } from "../../services/settlement-service.js";
import { TableManager } from "../../utils/table-manager.js";
import { handleExport } from "../../utils/export.js";
import { FilterManager } from "../../utils/filter-manager.js";
import { ErrorHandler } from "../../utils/error-handler.js";
import { ApiResponse } from "../../utils/api-response.js";

let tableManager;
let filterManager;

async function loadData() {
  const { q, page, limit, fromDate, toDate, filters } = tableManager.state;
  const sort = tableManager.sortString;

  const res = await SettlementService.getHome(
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
            <td>${item.ekatte}</td>
            <td>${item.settlement_name}</td>
            <td>${item.mayorality_name || `(общ.) ${item.municipality_name}`}</td>
            <td>${item.municipality_name}</td>
            <td>${item.region_name}</td>
            <td>${new Date(item.settlement_last_change).toLocaleDateString("bg-BG")}</td>
            <td>
                <button class="action-btn btn-info" data-id="${item.ekatte}" data-action="info">Инфо</button>
                <button class="action-btn btn-edit" data-id="${item.ekatte}" data-action="edit">Редакция</button>
                <button class="action-btn btn-delete" data-id="${item.ekatte}" data-action="delete">Изтриване</button>
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
  const response = await SettlementService.getInfo(id);
  if (!response.ok) {
    ErrorHandler.handle(response);
    return;
  }

  const data = response.data;
  const modal = document.getElementById("infoModal");

  document.getElementById("modalTitle").textContent =
    `${data.name} (${data.ekatte})`;
  document.getElementById("m-ekatte").textContent = data.ekatte;
  document.getElementById("m-name").textContent = data.name;
  document.getElementById("m-translit").textContent = data.transliteration;
  document.getElementById("m-category").textContent = data.settlement_category;
  document.getElementById("m-type").textContent = data.belongs_type_description;
  document.getElementById("m-altitude").textContent = data.belongs_altitude;
  const dateObj = new Date(data.last_changed_on);

  const formattedDate = dateObj.toLocaleString("bg-BG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  document.getElementById("m-last-change").textContent = formattedDate;

  document.getElementById("m-belongs-region").textContent =
    `${data.belongs_region_name} (${data.belongs_region_id})`;
  document.getElementById("m-belongs-municipality").textContent =
    `${data.belongs_municipality_name} (${data.belongs_municipality_id})`;
  document.getElementById("m-belongs-mayorality").textContent =
    data.belongs_mayorality_name
      ? `${data.belongs_mayorality_name} (${data.belongs_mayorality_id})`
      : `(общ) ${data.belongs_municipality_name} (${data.belongs_municipality_id})`;

  const fillCenter = (elId, name, id) => {
    document.getElementById(elId).textContent = name ? `${name} (${id})` : "—";
  };
  fillCenter("m-center-region", data.center_region_name, data.center_region_id);
  fillCenter(
    "m-center-municipality",
    data.center_municipality_name,
    data.center_municipality_id,
  );
  fillCenter(
    "m-center-mayorality",
    data.center_mayorality_name,
    data.center_mayorality_id,
  );

  modal.classList.add("active");
}

async function handleDelete(id, settlementName) {
  const confirmed = confirm(
    `ВНИМАНИЕ: Ще изтриете селището "${settlementName}"! Сигурни ли сте?`,
  );
  if (!confirmed) return;

  const check = await SettlementService.checkDependencies(id);
  if (check.ok && check.data.valid) {
    const proceed = confirm(
      `${check.data.message}\nСигурни ли сте, че искате да продължите?`,
    );
    if (!proceed) return;
  }

  const response = await SettlementService.delete(id);
  if (response.ok) {
    alert("Селището беше изтрито успешно.");
    loadData();
  } else {
    ErrorHandler.handle(response);
  }
}

async function handleExportClick(type) {
  const excelBtn = document.getElementById("export-excel-btn");
  const csvBtn = document.getElementById("export-csv-btn");

  if (excelBtn) excelBtn.disabled = true;
  if (csvBtn) csvBtn.disabled = true;

  const { q, fromDate, toDate, filters } = tableManager.state;
  const sort = tableManager.sortString;

  const res =
    type === "excel"
      ? await SettlementService.getExcelExport(
          q,
          sort,
          fromDate,
          toDate,
          filters,
        )
      : await SettlementService.getCsvExport(
          q,
          sort,
          fromDate,
          toDate,
          filters,
        );

  await handleExport(res);

  if (excelBtn) excelBtn.disabled = false;
  if (csvBtn) csvBtn.disabled = false;
}

document.addEventListener("DOMContentLoaded", () => {
  initTableManager();
  initFilterManager();
  setupEventListeners();
  loadData();
});

function initTableManager() {
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

  document.getElementById("add-filter-btn")?.addEventListener("click", () => {
    const filterSelect = document.getElementById("filter-type");
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

  document.addEventListener("click", handleGlobalActions);
}

async function handleGlobalActions(e) {
  const target = e.target;
  const action = target.dataset.action;
  const id = target.dataset.id;

  if (action === "info") showInfo(id);

  if (action === "edit") {
    window.location.href = `edit-settlement.html?id=${id}`;
  }

  if (action === "delete") {
    const name = target
      .closest("tr")
      .querySelector("td:nth-child(2)").textContent;
    handleDelete(id, name);
  }

  const modal = document.getElementById("infoModal");
  if (target === modal) modal.classList.remove("active");
}
