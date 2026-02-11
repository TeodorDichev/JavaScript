import { apiRequest } from './api-client.js';
import { ApiResponse } from './api-response.js';
import { ErrorHandler } from './error-handler.js';

export async function loadDropdown({
    selectEl,
    endpoint,
    valueKey = "id",
    labelKey = "name",
    placeholder = null,
    errorContainerId = "error-container"
}) {
    if (!selectEl) return;

    // loading state
    selectEl.disabled = true;
    try {
        const response = await apiRequest(`/${endpoint}`);
        
        if (!response.ok) {
            ErrorHandler.handle(response, errorContainerId);
            selectEl.innerHTML = `<option value=""></option>`;
            return;
        }

        const items = response.data || [];
        selectEl.innerHTML = "";

        if (placeholder) {
            const opt = document.createElement("option");
            opt.value = "";
            opt.textContent = placeholder;
            selectEl.appendChild(opt);
        }

        items.forEach(item => {
            const opt = document.createElement("option");
            opt.value = item[valueKey];
            opt.textContent = item[labelKey];
            selectEl.appendChild(opt);
        });

    } catch (err) {
        ErrorHandler.handle(ApiResponse.error("Проблем при зареждане на данни", [err.message]), errorContainerId);
        selectEl.innerHTML = `<option value=""></option>`;
    } finally {
        selectEl.disabled = false;
    }
}