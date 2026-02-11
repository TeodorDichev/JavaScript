import { setupAutocomplete } from "../../utils/autocomplete.js";
import { MunicipalityService } from "../../services/municipality-service.js";
import { ErrorHandler } from "../../utils/error-handler.js";
import { ApiResponse } from "../../utils/api-response.js";

const form = document.getElementById("update-municipality-form");
const regionInput = document.getElementById("region-input");
const regionList = document.getElementById("region-list");
const centerInput = document.getElementById("center-input");
const centerList = document.getElementById("center-list");
const urlParams = new URLSearchParams(window.location.search);
const id = urlParams.get('id');

setupAutocomplete({
    input: regionInput,
    listBox: regionList,
    endpoint: "region/search",
    onClear: () => {
        regionInput.value = "";
        regionInput.dataset.id = "";
        centerInput.value = "";
        centerInput.dataset.id = "";
    },
    onSelect: item => {
        regionInput.value = item.name;
        regionInput.dataset.id = item.id;
        centerInput.value = "";
        centerInput.dataset.id = "";
    }
});

setupAutocomplete({
    input: centerInput,
    listBox: centerList,
    endpoint: "municipality/center-candidates",
    onClear: () => {
        centerInput.value = "";
        centerInput.dataset.id = "";
    },
    getExtraParams: () => ({ id: id }),
    onSelect: item => {
        centerInput.value = item.name;
        centerInput.dataset.id = item.id;
    }
});

async function fetchAndFillData(id) {
    const response = await MunicipalityService.getInfo(id);

    if (!response.ok) {
        ErrorHandler.handle(response);
        return;
    }

    const data = response.data;

    document.getElementById("old-id").value = data.municipality_id;
    document.getElementById("display-id").value = data.municipality_id;
    document.getElementById("old-name").value = data.name;
    document.getElementById("old-translit").value = data.transliteration || "—";
    document.getElementById("old-region").value = data.region_name;
    document.getElementById("old-center-settlement").value = `${data.center_name} (ЕКАТТЕ: ${data.center_ekatte})`;
    
    document.getElementById("m-settlements-count").value = data.settlements_count ?? "0";
    document.getElementById("m-mayoralities-count").value = data.mayoralities_count ?? "0";

    document.getElementById("name").value = data.name;
    document.getElementById("translit").value = data.transliteration;
    regionInput.value = data.region_name;
    regionInput.dataset.id = data.region_id;
    centerInput.value = data.center_name;
    centerInput.dataset.id = data.center_ekatte;
}

document.addEventListener('DOMContentLoaded', () => {
    if (!id) {
        window.location.href = "/municipality/municipality.html";
        return;
    }
    fetchAndFillData(id);
});

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const body = {
        name: document.getElementById("name").value,
        transliteration: document.getElementById("translit").value,
        region_id: regionInput.dataset.id,
        center_id: centerInput.dataset.id
    };

    const response = await MunicipalityService.update(id, body);

    if (response.ok) {
        alert("Общината е обновена успешно!");
        fetchAndFillData(id);
    } else {
        ErrorHandler.handle(response);
    }
});