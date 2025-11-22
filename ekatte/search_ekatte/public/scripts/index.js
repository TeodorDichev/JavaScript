const API_URL = "http://localhost:3000/api";

async function fetchData(query) {
  const res = await fetch(
    `${API_URL}/search?q=${encodeURIComponent(query.trim())}`
  );
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return res.json();
}

function renderTable(data) {
  const tableBody = document.querySelector(".result-table tbody");
  tableBody.innerHTML = data
    .map(
      (item) => `
    <tr>
      <td>${item.id}</td>
      <td>${item.settlement}</td>
      <td>${item.mayorality || ""}</td>
      <td>${item.municipality}</td>
      <td>${item.region}</td>
    </tr>
  `
    )
    .join("");

  document.getElementById(
    "result-count"
  ).textContent = `Намерени резултати: ${data.length}`;
}

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("search-data");
  let timeout;

  input.addEventListener("input", () => {
    clearTimeout(timeout);
    timeout = setTimeout(async () => {
      try {
        const data = await fetchData(input.value);
        renderTable(data.rows);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    }, 500);
  });

  fetchData("")
    .then((data) => renderTable(data.rows))
    .catch((err) => console.error(err));
});
