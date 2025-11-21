const API_URL = "http://localhost:3000/api";

async function fetchData(query) {
  const q = query.trim();
  const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return res.json();
}

function renderTable(data) {
  const tableBody = document.querySelector(".result-table tbody");
  tableBody.innerHTML = "";

  data.forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.id}</td>
      <td>${item.settlement}</td>
      <td>${item.mayorality || ""}</td>
      <td>${item.municipality}</td>
      <td>${item.region}</td>
    `;
    tableBody.appendChild(row);
  });

  const resultDiv = document.getElementById("result-count");
  resultDiv.textContent = `Намерени резултати: ${data.length}`;
}

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("search-data");

  let timeout;
  searchInput.addEventListener("input", () => {
    clearTimeout(timeout);
    timeout = setTimeout(async () => {
      try {
        const data = await fetchData(searchInput.value);
        renderTable(data.rows);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    }, 500);
  });

  (async () => {
    try {
      const data = await fetchData("");
      renderTable(data.rows);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  })();
});
