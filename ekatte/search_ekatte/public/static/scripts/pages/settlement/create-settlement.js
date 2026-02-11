import { setupAutocomplete } from "../../utils/autocomplete.js";
import { loadDropdown } from "../../utils/load-dropdown.js";
import { SettlementService } from "../../services/settlement-service.js";
import { ErrorHandler } from "../../utils/error-handler.js";

const ekatteInput = document.getElementById("ekatte");
const ekatteMessage = document.getElementById("ekatteMessage");
const altitudeSelect = document.getElementById("altitude");
const typeSelect = document.getElementById("type");

const mayoralityInput = document.getElementById("mayorality-input");
const mayoralityList = document.getElementById("mayorality-list");
const municipalityInput = document.getElementById("municipality-input");
const municipalityList = document.getElementById("municipality-list");
const regionInput = document.getElementById("region");

const form = document.getElementById("settlement-form");

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
            regionInput.value = item.regionName;
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
        regionInput.value = "";
    },
    onSelect: item => {
        municipalityInput.dataset.id = item.id;
        regionInput.value = item.regionName;
        mayoralityInput.value = "";
        mayoralityInput.dataset.id = "";
    }
});

ekatteInput.addEventListener("input", async () => {
    const response = await SettlementService.validateEkatte(ekatteInput.value);
    
    if (response.ok) {
        ekatteMessage.textContent = response.data.message;
        ekatteMessage.style.color = response.data.valid ? "green" : "red";
    } else {
        ekatteMessage.textContent = response.message;
        ekatteMessage.style.color = "red";
    }
});

form.addEventListener("submit", async e => {
    e.preventDefault();

    const body = {
        ekatte: document.getElementById("ekatte").value.trim() || "",
        name: document.getElementById("name").value.trim() || "",
        transliteration: document.getElementById("translit").value.trim() || "",
        category: Number(document.getElementById("category").value),
        altitude_id: altitudeSelect.value,
        settlement_type_id: typeSelect.value,
        mayorality_id: mayoralityInput.dataset.id || "",
        municipality_id: municipalityInput.dataset.id
    };

    const response = await SettlementService.create(body);

    if (!response.ok) {
        alert(response.errors.join("\n"));
    } else {
        ErrorHandler.handle(response);
    }
});

document.addEventListener("DOMContentLoaded", () => {
    loadDropdown({
        selectEl: altitudeSelect,
        endpoint: "altitude/search"
    });

    loadDropdown({
        selectEl: typeSelect,
        endpoint: "settlement_type/search"
    });
});