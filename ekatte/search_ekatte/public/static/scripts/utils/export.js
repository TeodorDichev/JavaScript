export async function handleExport(apiResponse) {
  const statsPanel = document.getElementById("export-stats");
  
  if (!apiResponse || !apiResponse.data || !apiResponse.data.payload) {
    throw new Error("Липсват на данните от сървъра");
  }

  const { payload, filename } = apiResponse.data;
  const { blob: base64Data, performance } = payload;

  if (statsPanel && performance) {
    statsPanel.style.display = "block";
    
    const timeEl = document.getElementById("stat-time");
    const memEl = document.getElementById("stat-mem");
    const cpuEl = document.getElementById("stat-cpu");

    if (timeEl) timeEl.textContent = `${performance.time || 0}`;
    if (memEl) memEl.textContent = `${performance.memory || 0}`;
    if (cpuEl) cpuEl.textContent = `${performance.cpu || 0}`;
  }

  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/MIME_types/Common_types
  const mimeType = filename.endsWith('.xlsx') 
    ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
    : "text/csv";

  const fileBlob = new Blob([byteArray], { type: mimeType });

  const url = window.URL.createObjectURL(fileBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "export";
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    window.URL.revokeObjectURL(url);
    a.remove();
  }, 100);
}