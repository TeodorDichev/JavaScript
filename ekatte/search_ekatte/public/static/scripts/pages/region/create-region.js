import { loadDropdown } from "../../utils/load-dropdown.js";
import { RegionService } from "../../services/region-service.js";
import { ErrorHandler } from "../../utils/error-handler.js";

const ekatteInput = document.getElementById("ekatte");
const ekatteMessage = document.getElementById("ekatteMessage");
const municipalityCode = document.getElementById("municipality-code");
const municipalityMessage = document.getElementById("municipality-code-msg");
const mayoralityCode = document.getElementById("mayorality-code");
const mayoralityMessage = document.getElementById("mayorality-code-msg");
const regionCode = document.getElementById("region-code");
const regionMessage = document.getElementById("region-code-msg");
const nuts3Input = document.getElementById("nuts3");
const nuts3Message = document.getElementById("nuts-msg");

const centerNameInput = document.getElementById("name");
const centerTranslitInput = document.getElementById("translit");
const centerTypeSelect = document.getElementById("type");
const centerCategoryInput = document.getElementById("category");
const centerAltitudeSelect = document.getElementById("altitude");

const form = document.getElementById("region-form");

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
    handleValidation(RegionService.validateEkatte(ekatteInput.value), ekatteMessage));

regionCode.addEventListener("input", () => 
    handleValidation(RegionService.validateRegionCode(regionCode.value), regionMessage));

municipalityCode.addEventListener("input", () => {
    const q = regionCode.value + municipalityCode.value;
    handleValidation(RegionService.validateMunicipalityCode(q), municipalityMessage);
});

mayoralityCode.addEventListener("input", () => {
    const q = `${regionCode.value}${municipalityCode.value}-${mayoralityCode.value}`;
    handleValidation(RegionService.validateMayoralityCode(q), mayoralityMessage);
});

nuts3Input.addEventListener("input", () => 
    handleValidation(RegionService.validateNuts(nuts3Input.value), nuts3Message));

form.addEventListener("submit", async e => {
    e.preventDefault();

    const mId = regionCode.value + municipalityCode.value;
    const mayId = `${regionCode.value}${municipalityCode.value}-${mayoralityCode.value}`;

    const body = {
        region: {
            region_id: regionCode.value,
            name: centerNameInput.value,
            transliteration: centerTranslitInput.value,
            nuts3_id: nuts3Input.value,
        },
        municipality: {
            municipality_id: mId,
            name: centerNameInput.value,
            transliteration: centerTranslitInput.value,
            region_id: regionCode.value,
        },
        mayorality: {
            mayorality_id: mayId,
            name: centerNameInput.value,
            transliteration: centerTranslitInput.value,
            municipality_id: mId,
        },
        center: {
            ekatte: ekatteInput.value,
            name: centerNameInput.value,
            transliteration: centerTranslitInput.value,
            settlement_type_id: centerTypeSelect.value,
            category: Number(centerCategoryInput.value),
            altitude_id: centerAltitudeSelect.value,
            municipality_id: mId,
            mayorality_id: mayId
        }
    };

    const response = await RegionService.create(body);

    if (response.ok) {
        alert(response.message);
        window.location.href = "/region/region.html";
    } else {
        ErrorHandler.handle(response);
    }
});

document.addEventListener("DOMContentLoaded", async () => {
    loadDropdown({ selectEl: centerAltitudeSelect, endpoint: "altitude/search" });
    loadDropdown({ selectEl: centerTypeSelect, endpoint: "settlement_type/search" });
});