import { setupAutocomplete } from "../../utils/autocomplete.js";
import { MayoralityService } from "../../services/mayorality-service.js";
import { ErrorHandler } from "../../utils/error-handler.js";
import { ApiResponse } from "../../utils/api-response.js";

const form = document.getElementById("update-mayorality-form");
const municipalityInput = document.getElementById("municipality-input");
const municipalityList = document.getElementById("municipality-list");
const centerInput = document.getElementById("center-input");
const centerList = document.getElementById("center-list");
const urlParams = new URLSearchParams(window.location.search);
const id = urlParams.get('id');

setupAutocomplete({
    input: municipalityInput,
    listBox: municipalityList,
    endpoint: "municipality/search",
    onClear: () => {
        municipalityInput.value = "";
        municipalityInput.dataset.id = "";
        centerInput.value = "";
        centerInput.dataset.id = "";
    },
    onSelect: item => {
        municipalityInput.value = item.name;
        municipalityInput.dataset.id = item.id;
        centerInput.value = "";
        centerInput.dataset.id = "";
    }
});

setupAutocomplete({
    input: centerInput,
    listBox: centerList,
    endpoint: "mayorality/center-candidates",
    getExtraParams: () => ({ id: id }),
    onSelect: item => {
        centerInput.value = item.name;
        centerInput.dataset.id = item.id;
    }
});

async function fetchAndFillData(id) {
    const response = await MayoralityService.getInfo(id);

    if (!response.ok) {
        ErrorHandler.handle(response);
        return;
    }

    const data = response.data;

    document.getElementById("old-id").value = data.mayorality_id;
    document.getElementById("display-id").value = data.mayorality_id;
    document.getElementById("old-name").value = data.name;
    document.getElementById("old-translit").value = data.transliteration;
    document.getElementById("old-municipality").value = data.municipality_name;
    document.getElementById("old-center").value = `${data.center_name} (${data.center_ekatte})`;
    document.getElementById("m-settlements-count").value = data.settlements_count ?? "0";

    document.getElementById("name").value = data.name;
    document.getElementById("translit").value = data.transliteration;
    municipalityInput.value = data.municipality_name;
    municipalityInput.dataset.id = data.municipality_id;
    centerInput.value = data.center_name;
    centerInput.dataset.id = data.center_ekatte;
}

document.addEventListener('DOMContentLoaded', () => {
    if (!id) {
        window.location.href = "/mayorality/mayorality.html";
        return;
    }
    fetchAndFillData(id);
});

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const body = {
        name: document.getElementById("name").value,
        transliteration: document.getElementById("translit")?.value || "",
        municipality_id: municipalityInput.dataset.id || null,
        center_id: centerInput.dataset.id || null
    };

    const response = await MayoralityService.update(id, body);

    if (response.ok) {
        alert("Кметството и неговите селища бяха обновени!");
        fetchAndFillData(id);
    } else {
        ErrorHandler.handle(response);
    }
});