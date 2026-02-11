import { setupAutocomplete } from "../../utils/autocomplete.js";
import { loadDropdown } from "../../utils/load-dropdown.js";
import { MunicipalityService } from "../../services/municipality-service.js";
import { ErrorHandler } from "../../utils/error-handler.js";

const ekatteInput = document.getElementById("ekatte");
const ekatteMessage = document.getElementById("ekatteMessage");
const municipalityCode = document.getElementById("municipality-code");
const municipalityMessage = document.getElementById("municipality-code-msg");
const mayoralityCode = document.getElementById("mayorality-code");
const mayoralityMessage = document.getElementById("mayorality-code-msg");
const centerNameInput = document.getElementById("name");
const centerTranslitInput = document.getElementById("translit");
const centerTypeSelect = document.getElementById("type");
const centerCategoryInput = document.getElementById("category");
const centerAltitudeSelect = document.getElementById("altitude");
const centerRegionInput = document.getElementById("region-input");
const centerRegionList = document.getElementById("region-list");
const form = document.getElementById("municipality-form");

setupAutocomplete({
    input: centerRegionInput,
    listBox: centerRegionList,
    endpoint: "region/search",
    onClear: () => {
        centerRegionInput.value = "";
        centerRegionInput.dataset.id = "";
    },
    onSelect: item => {
        centerRegionInput.dataset.id = item.id;
    }
});

const handleValidation = async (promise, messageElement) => {
    const response = await promise;
    if (response.ok) {
        messageElement.textContent = response.data.message;
        messageElement.style.color = response.data.valid ? "green" : "red";
    } else {
        messageElement.textContent = response.message;
        messageElement.style.color = "red";
    }
};

ekatteInput.addEventListener("input", () => 
    handleValidation(MunicipalityService.validateEkatte(ekatteInput.value), ekatteMessage));

municipalityCode.addEventListener("input", () => {
    const q = (centerRegionInput.dataset.id || "") + municipalityCode.value;
    handleValidation(MunicipalityService.validateMunicipalityCode(q), municipalityMessage);
});

mayoralityCode.addEventListener("input", () => {
    const q = `${centerRegionInput.dataset.id || ""}${municipalityCode.value}-${mayoralityCode.value}`;
    handleValidation(MunicipalityService.validateMayoralityCode(q), mayoralityMessage);
});

form.addEventListener("submit", async e => {
    e.preventDefault();

    const regId = centerRegionInput.dataset.id || "";
    const munId = regId + municipalityCode.value;
    const mayId = `${regId}${municipalityCode.value}-${mayoralityCode.value}`;

    const body = {
        municipality: {
            municipality_id: munId,
            name: centerNameInput.value,
            transliteration: centerTranslitInput.value,
            region_id: regId,
        },
        mayorality: {
            mayorality_id: mayId,
            name: centerNameInput.value,
            transliteration: centerTranslitInput.value,
            municipality_id: munId,
        },
        center: {
            ekatte: ekatteInput.value,
            name: centerNameInput.value,
            transliteration: centerTranslitInput.value,
            settlement_type_id: centerTypeSelect.value,
            category: Number(centerCategoryInput.value),
            altitude_id: centerAltitudeSelect.value,
            municipality_id: munId,
            mayorality_id: mayId
        }
    };

    const response = await MunicipalityService.create(body);

    if (response.ok) {
        alert(response.message);
        window.location.href = "/municipality/municipality.html";
    } else {
        ErrorHandler.handle(response);
    }
});

document.addEventListener("DOMContentLoaded", () => {
    loadDropdown({ selectEl: centerAltitudeSelect, endpoint: "altitude/search" });
    loadDropdown({ selectEl: centerTypeSelect, endpoint: "settlement_type/search" });
});