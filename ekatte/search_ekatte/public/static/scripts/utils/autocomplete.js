import { apiRequest } from './api-client.js';
import { ErrorHandler } from './error-handler.js';

export function setupAutocomplete({
    input,
    listBox,
    endpoint,
    minChars = 1,
    debounce = 300,
    getExtraParams = () => ({}),
    onSelect = () => {},
    onClear = () => {}
}) {
    let timeout;

    const renderItems = (items) => {
        listBox.innerHTML = "";
        const results = Array.isArray(items) ? items : (items.data || []);
        
        if (results.length === 0 && input.value.trim().length >= minChars) {
            listBox.innerHTML = '<div class="autocomplete-no-results">Няма намерени резултати</div>';
            return;
        }

        results.forEach((item, index) => {
            const div = document.createElement("div");
            div.className = "autocomplete-item";
            div.role = "option";
            div.textContent = item.name;
            div.dataset.index = index;

            div.onclick = () => selectItem(item);
            listBox.appendChild(div);
        });
    };

    const selectItem = (item) => {
        input.value = item.name;
        input.dataset.id = item.id ?? null;
        listBox.innerHTML = "";
        onSelect(item);
    };

    input.addEventListener("input", () => {
        clearTimeout(timeout);

        timeout = setTimeout(async () => {
            const q = input.value.trim();

            if (!q) {
                listBox.innerHTML = "";
                input.dataset.id = "";
                onClear();
                return;
            }

            const queryParams = new URLSearchParams({ q, ...getExtraParams() });
            
            // Filter out empty params
            [...queryParams.entries()].forEach(([key, val]) => {
                if (!val) queryParams.delete(key);
            });
            
            if (q.length < minChars) {
                listBox.innerHTML = "";
                return;
            }

            const response = await apiRequest(`/${endpoint}?${queryParams.toString()}`);
            
            if (response.ok) {
                renderItems(response.data);
            } else {
                ErrorHandler.handle(response);
            }
        }, debounce);
    });

    document.addEventListener("click", e => {
        if (!input.contains(e.target) && !listBox.contains(e.target)) {
            listBox.innerHTML = "";
        }
    });
}