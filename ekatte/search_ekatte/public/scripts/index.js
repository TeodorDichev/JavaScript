const API_URL = "http://localhost:3000/api";

export async function fetchData(query) {
  const res = await fetch(
    `${API_URL}/search?q=${encodeURIComponent(query.trim())}`
  );
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return res.json();
}

export function renderTable(data) {
  const tableBody = document.querySelector(".result-table tbody");
  tableBody.innerHTML = data.rows
    .map(
      (item) => `
    <tr>
      <td>${item.id}</td>
      <td>${item.settlement}</td>
      <td>${item.mayorality || `(общ.) ${item.municipality}`}</td>
      <td>${item.municipality}</td>
      <td>${item.region}</td>
    </tr>
  `
    )
    .join("");


  const resHead = document.getElementById("res-header");
  resHead.innerHTML = "";
  resHead.innerHTML = `Резултати (${data.rowsCount})`;

  const resultCount = document.getElementById("result-count");
  resultCount.innerHTML = "";
  resultCount.appendChild(
    document.createTextNode(
      `Намерени селища: ${data.filteredSettlementsCount}/${data.settlementsCount} | `
    )
  );
  resultCount.appendChild(
    document.createTextNode(
      `Намерени кметства: ${data.filteredMayoralitiesCount}/${data.mayoralitiesCount} | `
    )
  );
  resultCount.appendChild(
    document.createTextNode(
      `Намерени общини: ${data.filteredMunicipalitiesCount}/${data.municipalitiesCount} | `
    )
  );
  resultCount.appendChild(
    document.createTextNode(
      `Намерени области: ${data.filteredRegionsCount}/${data.regionsCount} | `
    )
  );
}

export function setupSearchInput(input) {
  let timeout;
  input.addEventListener("input", () => {
    clearTimeout(timeout);
    timeout = setTimeout(async () => {
      try {
        const data = await fetchData(input.value);
        renderTable(data);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    }, 500);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("search-data");
  setupSearchInput(input);

  fetchData("")
    .then((data) => renderTable(data))
    .catch((err) => console.error(err));
});
