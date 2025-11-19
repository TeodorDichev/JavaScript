const searchInput = document.getElementById("search-data");
const tableBody = document.querySelector(".result-table tbody");

function renderTable(data) {
  tableBody.innerHTML = "";

  data.forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.ekatte}</td>
      <td>${item.name}</td>
      <td>${item.municipality}</td>
      <td>${item.region}</td>
      <td>${item.province}</td>
    `;
    tableBody.appendChild(row);
  });

  const resultDiv = document.getElementById("result-count");
  // resultDiv.innerHTML = "";
  const p = document.createElement('p');
  p.appendChild(document.createTextNode(`Намерени резултати: ${data.rowCount}`));
  resultDiv.appendChild(p);
}

async function fetchData(query) {
  try {
    const res = await fetch(`/search?q=${encodeURIComponent(query)}`);
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
