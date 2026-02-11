import { RegionService } from "../../services/region-service.js";
import { TableManager } from "../../utils/table-manager.js";
import { handleExport } from "../../utils/export.js";
import { FilterManager } from "../../utils/filter-manager.js";
import { ErrorHandler } from "../../utils/error-handler.js";

let tableManager;
let filterManager;

async function loadData() {
  const { q, page, limit, fromDate, toDate, filters } = tableManager.state;
  const sort = tableManager.sortString;

  const res = await RegionService.getHome(
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
            <td>${item.region_id}</td>
            <td>${item.region_name}</td>
            <td>${item.nuts3_id}</td>
            <td>${new Date(item.region_last_change).toLocaleDateString(
              "bg-BG",
            )}</td>
            <td>
                <button class="action-btn btn-info" data-id="${
                  item.region_id
                }" data-action="info">Инфо</button>
                <button class="action-btn btn-edit" data-id="${
                  item.region_id
                }" data-action="edit">Редакция</button>
                <button class="action-btn btn-delete" data-id="${
                  item.region_id
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
  const response = await RegionService.getInfo(id);
  if (!response.ok) {
    ErrorHandler.handle(response);
    return;
  }

  const data = response.data;
  const modal = document.getElementById("infoModal");

  document.getElementById("modalTitle").textContent =
    `${data.name} (${data.region_id})`;
  document.getElementById("m-name").textContent = data.name;
  document.getElementById("m-ekatte").textContent = data.settlement_ekatte;
  document.getElementById("m-center-name").textContent = data.center_name;
  document.getElementById("m-id").textContent = data.region_id;
  document.getElementById("m-nuts3").textContent = data.nuts3_id;
  document.getElementById("m-settlements-count").textContent =
    data.settlements_count ?? "0";
  document.getElementById("m-mayoralities-count").textContent =
    data.mayoralities_count ?? "0";
  document.getElementById("m-municipalities-count").textContent =
    data.municipalities_count ?? "0";
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

async function handleDelete(id, regionName) {
  const confirmed = confirm(
    `ВНИМАНИЕ: Ще изтриете област "${regionName}" и всички свързани с нея общини, кметства и селища! Сигурни ли сте?`,
  );
  if (!confirmed) return;

  const response = await RegionService.delete(id);
  // no dependecies to check here

  if (response.ok) {
    alert("Областта беше изтрита успешно.");
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
      ? await RegionService.getExcelExport(q, sort, fromDate, toDate, filters)
      : await RegionService.getCsvExport(q, sort, fromDate, toDate, filters);

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
    window.location.href = `edit-region.html?id=${id}`;
  }

  if (action === "delete") {
    const name = target
      .closest("tr")
      .querySelector("td:nth-child(4)").textContent;
    handleDelete(id, name);
  }

  const modal = document.getElementById("infoModal");
  if (target === modal) modal.classList.remove("active");
}
