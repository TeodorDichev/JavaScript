import { setupAutocomplete } from "../../utils/autocomplete.js";
import { loadDropdown } from "../../utils/load-dropdown.js";
import { MayoralityService } from "../../services/mayorality-service.js";
import { ErrorHandler } from "../../utils/error-handler.js";

const ekatteInput = document.getElementById("ekatte");
const ekatteMessage = document.getElementById("ekatteMessage");
const mayoralityCode = document.getElementById("mayorality-code");
const mayoralityMessage = document.getElementById("mayoralityMessage");
const centerNameInput = document.getElementById("name");
const centerTranslitInput = document.getElementById("translit");
const centerTypeSelect = document.getElementById("type");
const centerCategoryInput = document.getElementById("category");
const centerAltitudeSelect = document.getElementById("altitude");
const centerMunicipalityInput = document.getElementById("municipality-input");
const centerMunicipalityList = document.getElementById("municipality-list");
const form = document.getElementById("mayorality-form");

setupAutocomplete({
    input: centerMunicipalityInput,
    listBox: centerMunicipalityList,
    endpoint: "municipality/search",
    onClear: () => {
        centerMunicipalityInput.value = "";
        centerMunicipalityInput.dataset.id = "";
    },
    onSelect: item => {
        centerMunicipalityInput.dataset.id = item.id;
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
    handleValidation(MayoralityService.validateEkatte(ekatteInput.value.trim()), ekatteMessage));

mayoralityCode.addEventListener("input", () => {
    const q = `${centerMunicipalityInput.dataset.id || ""}-${mayoralityCode.value.trim()}`;
    handleValidation(MayoralityService.validateMayoralityCode(q), mayoralityMessage);
});

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const mId = centerMunicipalityInput.dataset.id || "";
    const mayId = `${mId}-${mayoralityCode.value.trim()}`;

    const body = {
        center: {
            ekatte: ekatteInput.value.trim(),
            name: centerNameInput.value.trim(),
            transliteration: centerTranslitInput.value.trim(),
            settlement_type_id: centerTypeSelect.value,
            category: Number(centerCategoryInput.value),
            altitude_id: centerAltitudeSelect.value,
            mayorality_id: mayId,
            municipality_id: mId,
        },
        mayorality: {
            name: centerNameInput.value.trim(),
            transliteration: centerTranslitInput.value.trim(),
            mayorality_id: mayId,
            municipality_id: mId,
        }
    };

    const response = await MayoralityService.create(body);

    if (response.ok) {
        alert(response.message);
        window.location.href = "/mayorality/mayorality.html";
    } else {
        ErrorHandler.handle(response);
    }
});

document.addEventListener("DOMContentLoaded", () => {
    loadDropdown({ selectEl: centerAltitudeSelect, endpoint: "altitude/search" });
    loadDropdown({ selectEl: centerTypeSelect, endpoint: "settlement_type/search" });
});