const fullProcessBtn = document.getElementById("full-process-btn");
const reprocessBtn = document.getElementById("reprocess-btn");
const importCountInput = document.getElementById("import-count");

const scraperBar = document.getElementById("scraper-bar");
const processorBar = document.getElementById("processor-bar");
const progressContainer = document.getElementById("progress-container");

let pollInterval;

async function loadStatistics() {
    try {
        const res = await fetch("/index");
        const data = await res.json();

        document.getElementById("total-texts").textContent = data.totalTexts || 0;
        document.getElementById("total-unique-words").textContent = data.totalUniqueWords || 0;
        document.getElementById("total-countries").textContent = data.totalCountries || 0;
        document.getElementById("total-authors").textContent = data.totalAuthors || 0;

        renderTable("texts-table", data.texts, (t) => `
            <td>${t.text_id}</td>
            <td>${t.title}</td>
            <td>${t.unique_words_count || 0}</td>
            <td>${t.author_name || 'Unknown'}</td>
        `);

        renderTable("authors-table", data.authors, (a) => `
            <td class="clickable-id" data-id="${a.author_id}">${a.author_id}</td>
            <td>${a.author_name}</td>
            <td>${a.author_original_name || '-'}</td>
            <td>${a.unique_words_count || 0}</td>
            <td>${(Number(a.words_per_sentence_count) || 0).toFixed(2)}</td>
        `);

        return data;
    } catch (e) { 
        console.error("Stats load failed", e); 
    }
}

function renderTable(id, items, rowHtmlFn) {
    const tbody = document.querySelector(`#${id} tbody`);
    if (!tbody) return;
    tbody.innerHTML = (items || []).map(item => `<tr>${rowHtmlFn(item)}</tr>`).join('');
}

async function startPolling(targetNewFiles, isOnlyProcessing = false) {
    const startData = await loadStatistics();
    const startTextCount = Number(startData.totalTexts || 0);

    progressContainer.style.display = "block";
    toggleButtons(true);
    
    document.getElementById('scraper-progress-wrapper').style.display = isOnlyProcessing ? 'none' : 'block';
    scraperBar.style.width = "0%";
    processorBar.style.width = "0%";

    pollInterval = setInterval(async () => {
        const currentData = await loadStatistics();
        
        if (!isOnlyProcessing) {
            const newlySaved = currentData.totalTexts - startTextCount;
            const scraperPercent = Math.min((newlySaved / targetNewFiles) * 100, 100);
            scraperBar.style.width = scraperPercent + "%";
            document.getElementById("scraper-status").textContent = `${newlySaved} / ${targetNewFiles} файлове`;
        }

        const totalAuthors = currentData.totalAuthors || 1;
        const processedCount = currentData.processedAuthorsCount || 0;
        const procPercent = Math.min((processedCount / totalAuthors) * 100, 100);
        
        processorBar.style.width = procPercent + "%";
        document.getElementById("processor-status").textContent = `${processedCount} / ${totalAuthors} автори`;

        if (procPercent >= 100) {
            if (isOnlyProcessing || (currentData.totalTexts - startTextCount >= targetNewFiles)) {
                stopPolling();
            }
        }
    }, 2000);
}

function toggleButtons(disabled) {
    fullProcessBtn.disabled = disabled;
    reprocessBtn.disabled = disabled;
    fullProcessBtn.textContent = disabled ? "Работи..." : "Импорт + Обработка";
}

function stopPolling() {
    clearInterval(pollInterval);
    toggleButtons(false);
    alert("Процесът приключи успешно!");
}

async function openAuthorModal(authorId) {
    const modal = document.getElementById("author-modal");
    modal.style.display = "block";
    
    document.getElementById("modal-author-name").textContent = "Зареждане...";

    try {
        const res = await fetch(`/authors?id=${encodeURIComponent(authorId)}`);
        const a = await res.json();

        if (!a || a.error) throw new Error("Авторът не е намерен");

        document.getElementById("modal-author-name").textContent = a.author_name;
        document.getElementById("modal-id").textContent = a.author_id;
        document.getElementById("modal-original").textContent = a.author_original_name;
        document.getElementById("modal-country").textContent = a.country_name || "Неизвестна";
        document.getElementById("modal-unique-words").textContent = a.unique_words_count || 0;
        document.getElementById("modal-avg-sentence").textContent = Number(a.words_per_sentence_count || 0).toFixed(2);
        document.getElementById("modal-longest-sentence").textContent = a.longest_sentense_words_count || 0;
        
        const date = a.last_date_of_update ? new Date(a.last_date_of_update).toLocaleDateString('bg-BG') : 'Никога';
        document.getElementById("modal-last-update").textContent = date;

    } catch (e) {
        console.error("Error displaying the author:", e);
        document.getElementById("modal-author-name").textContent = "Грешка при зареждане.";
    }
}

document.querySelector(".close-modal").onclick = () => {
    document.getElementById("author-modal").style.display = "none";
};

window.onclick = (event) => {
    const modal = document.getElementById("author-modal");
    if (event.target == modal) modal.style.display = "none";
};

document.getElementById("authors-table").addEventListener("click", (e) => {
    const target = e.target;
    if (target.classList.contains("clickable-id")) {
        const id = target.getAttribute("data-id");
        if (id) openAuthorModal(id);
    }
});

fullProcessBtn.addEventListener("click", async () => {
    const count = Number(importCountInput.value || 100);
    const res = await fetch(`/api-fetch?count=${count}`, { method: "POST" });
    if (res.ok) {
        startPolling(count);
    } else {
        alert("Грешка при стартиране. Вероятно вече тече друг процес.");
    }
});

reprocessBtn.addEventListener("click", async () => {
    const res = await fetch("/process", { method: "POST" });
    if (res.ok) {
        startPolling(0, true);
    } else {
        alert("Грешка при стартиране на преобработката.");
    }
});

loadStatistics();