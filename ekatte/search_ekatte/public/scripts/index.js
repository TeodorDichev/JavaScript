document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("search-data");
  const tableBody = document.querySelector(".result-table tbody");
  const API_URL = "http://localhost:3000/api";

  function renderTable(data) {
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
    resultDiv.innerHTML = `Намерени резултати: ${data.length}`;
  }

  async function fetchData(query) {
    try {
      const q = query.trim();
      const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(q)}`);

      if (res.ok) {
        const data = await res.json();
        renderTable(data.rows);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  }

  let timeout;
  searchInput.addEventListener("input", () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fetchData(searchInput.value), 500);
  });

  fetchData("");
});
