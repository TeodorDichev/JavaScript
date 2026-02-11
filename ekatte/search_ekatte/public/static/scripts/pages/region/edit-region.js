import { setupAutocomplete } from "../../utils/autocomplete.js";
import { RegionService } from "../../services/region-service.js";
import { ErrorHandler } from "../../utils/error-handler.js";
import { ApiResponse } from "../../utils/api-response.js";

const form = document.getElementById("update-region-form");
const centerInput = document.getElementById("center-input");
const centerList = document.getElementById("center-list");
const urlParams = new URLSearchParams(window.location.search);
const id = urlParams.get('id');

let originalNuts3;

setupAutocomplete({
    input: centerInput,
    listBox: centerList,
    endpoint: "region/center-candidates",
    getExtraParams: () => ({ id: id }),
    onClear: () => {
        centerInput.value = "";
        centerInput.dataset.id = "";
    },
    onSelect: item => {
        centerInput.value = item.name;
        centerInput.dataset.id = item.id;
    }
});

async function fetchAndFillData(id) {
    const response = await RegionService.getInfo(id);

    if (!response.ok) {
        ErrorHandler.handle(response);
        return;
    }

    const data = response.data;

    document.getElementById("old-id").value = data.region_id;
    document.getElementById("display-id").value = data.region_id;
    document.getElementById("old-name").value = data.name;
    document.getElementById("old-translit").value = data.transliteration;
    document.getElementById("old-nuts3").value = data.nuts3_id;
    document.getElementById("old-center-settlement").value = `${data.center_name || ""} (ЕКАТТЕ: ${data.settlement_ekatte || ""})`;
    
    document.getElementById("m-settlements-count").value = data.settlements_count ?? "0";
    document.getElementById("m-mayoralities-count").value = data.mayoralities_count ?? "0";
    document.getElementById("m-municipalities-count").value = data.municipalities_count ?? "0";

    document.getElementById("name").value = data.name;
    document.getElementById("translit").value = data.transliteration;
    document.getElementById("nuts3").value = data.nuts3_id;
    originalNuts3 = data.nuts3_id;

    centerInput.value = data.center_name;
    centerInput.dataset.id = data.settlement_ekatte;
}

document.addEventListener('DOMContentLoaded', () => {
    if (!id) {
        window.location.href = "/region/region.html";
        return;
    }
    fetchAndFillData(id);
});

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const body = {
        name: document.getElementById("name").value,
        transliteration: document.getElementById("translit").value,
        nuts3: document.getElementById("nuts3").value,
        center_id: centerInput.dataset.id,
        changed_nuts3: originalNuts3 != document.getElementById("nuts3").value
    };

    const response = await RegionService.update(id, body);

    if (response.ok) {
        alert("Областта е обновена успешно!");
        fetchAndFillData(id);
    } else {
        ErrorHandler.handle(response);
    }
});