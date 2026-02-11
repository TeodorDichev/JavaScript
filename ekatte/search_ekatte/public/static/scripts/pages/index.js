import { IndexService } from "../services/index-service.js";
import { TableManager } from "../utils/table-manager.js";
import { ErrorHandler } from "../utils/error-handler.js";

let tableManager;

async function loadData() {
  const { q, page, limit } = tableManager.state;
  const sort = tableManager.sortString;

  const res = await IndexService.getHome(q, sort, page, limit);
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
    resultCount.innerHTML = `
            Намерени селища: ${data.filteredSettlementsCount}/${data.settlementsCount} |
            Намерени кметства: ${data.filteredMayoralitiesCount}/${data.mayoralitiesCount} |
            Намерени общини: ${data.filteredMunicipalitiesCount}/${data.municipalitiesCount} |
            Намерени области: ${data.filteredRegionsCount}/${data.regionsCount}
        `;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  tableManager = new TableManager({
    tableSelector: ".result-table",
    onParamsChange: loadData,
  });

  const input = document.getElementById("search-data");
  let timeout;
  input?.addEventListener("input", (e) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      tableManager.state.q = e.target.value;
      tableManager.state.page = 1;
      loadData();
    }, 300);
  });

  loadData();
});
