import { setupAutocomplete } from "../../utils/autocomplete.js";
import { loadDropdown } from "../../utils/load-dropdown.js";
import { SettlementService } from "../../services/settlement-service.js";
import { ErrorHandler } from "../../utils/error-handler.js";
import { ApiResponse } from "../../utils/api-response.js";

const form = document.getElementById("update-settlement-form");
const altitudeSelect = document.getElementById("altitude");
const typeSelect = document.getElementById("type");
const mayoralityInput = document.getElementById("mayorality-input");
const mayoralityList = document.getElementById("mayorality-list");
const municipalityInput = document.getElementById("municipality-input");
const municipalityList = document.getElementById("municipality-list");

let originalMunId;
let originalMayId;

setupAutocomplete({
    input: mayoralityInput,
    listBox: mayoralityList,
    endpoint: "mayorality/search",
    onClear: () => {
        mayoralityInput.value = "";
        mayoralityInput.dataset.id = "";
    },
    getExtraParams: () => {
        const mId = municipalityInput.dataset.id;
        return (mId && mId !== "null") ? { municipalityId: mId } : {};
    },
    onSelect: item => {
        mayoralityInput.dataset.id = item.id;
        if (item.municipalityId) {
            municipalityInput.value = item.municipalityName;
            municipalityInput.dataset.id = item.municipalityId;
        }
    }
});

setupAutocomplete({
    input: municipalityInput,
    listBox: municipalityList,
    endpoint: "municipality/search",
    onClear: () => {
        mayoralityInput.value = "";
        mayoralityInput.dataset.id = "";
        municipalityInput.value = "";
        municipalityInput.dataset.id = "";
    },
    onSelect: item => {
        municipalityInput.dataset.id = item.id;
        mayoralityInput.value = "";
        mayoralityInput.dataset.id = "";
    }
});

async function fetchAndFillData(id) {
    const response = await SettlementService.getInfo(id);

    if (!response.ok) {
        ErrorHandler.handle(response);
        return;
    }

    const row = response.data;

    document.getElementById("old-ekatte").value = row.ekatte;
    document.getElementById("display-ekatte").value = row.ekatte;
    document.getElementById("old-name").value = row.name;
    document.getElementById("old-translit").value = row.transliteration;
    document.getElementById("old-category").value = row.settlement_category;
    document.getElementById("old-altitude").value = row.belongs_altitude;
    document.getElementById("old-type").value = row.belongs_type_description;
    document.getElementById("old-municipality").value = row.belongs_municipality_name;
    document.getElementById("old-mayorality").value = row.belongs_mayorality_name || `(общ.) ${row.belongs_municipality_name}`;
    
    document.getElementById("mayorality-center-info").textContent = row.center_mayorality_name || "Няма";
    document.getElementById("municipality-center-info").textContent = row.center_municipality_name || "Няма";
    document.getElementById("region-center-info").textContent = row.center_region_name || "Няма";

    document.getElementById("name").value = row.name;
    document.getElementById("translit").value = row.transliteration;
    document.getElementById("category").value = row.settlement_category;

    mayoralityInput.value = row.belongs_mayorality_name || "";
    mayoralityInput.dataset.id = row.mayorality_id || "";
    municipalityInput.value = row.belongs_municipality_name || "";
    municipalityInput.dataset.id = row.municipality_id || "";
    
    originalMayId = row.mayorality_id || "";
    originalMunId = row.municipality_id || "";

    await Promise.all([
        loadDropdown({ selectEl: altitudeSelect, endpoint: "altitude/search" }),
        loadDropdown({ selectEl: typeSelect, endpoint: "settlement_type/search" })
    ]);
    
    altitudeSelect.value = row.altitude_id;
    typeSelect.value = row.settlement_type_id;
}

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (!id) {
        window.location.href = "/settlement/settlement.html";
        return;
    }

    fetchAndFillData(id);
});

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    const body = {
        name: document.getElementById("name").value,
        transliteration: document.getElementById("translit").value,
        category: document.getElementById("category").value,
        altitude_id: altitudeSelect.value,
        type_id: typeSelect.value,
        municipality_id: municipalityInput.dataset.id,
        mayorality_id: mayoralityInput.dataset.id || "",

        changed_territorial_affiliation: 
            mayoralityInput.dataset.id != originalMayId || 
            municipalityInput.dataset.id != originalMunId
    };

    const response = await SettlementService.update(id, body);

    if (response.ok) {
        alert("Промените са записани успешно!");
        fetchAndFillData(id);
    } else {
        ErrorHandler.handle(response);
    }
});