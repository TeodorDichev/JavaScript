export class FilterManager {
    constructor({ containerSelector, onFilterChange }) {
        this.container = document.querySelector(containerSelector);
        this.onFilterChange = onFilterChange;
        this.activeFilters = {};
    }

    addFilter(columnName, label) {
        if (Object.prototype.hasOwnProperty.call(this.activeFilters, columnName)) return;

        this.activeFilters[columnName] = "";

        const tag = document.createElement("div");
        tag.className = "filter-tag";
        tag.dataset.col = columnName;

        const labelSpan = document.createElement("span");
        labelSpan.textContent = `${label}: `;
        
        const input = document.createElement("input");
        input.type = "text";
        input.placeholder = "търси...";

        const removeBtn = document.createElement("span");
        removeBtn.className = "remove-filter";
        removeBtn.innerHTML = "&times;";

        tag.append(labelSpan, input, removeBtn);

        let timeout;
        const triggerChange = () => {
            clearTimeout(timeout);
            this.activeFilters[columnName] = input.value.trim();
            this.onFilterChange({ ...this.activeFilters });
        };

        input.addEventListener("input", () => {
            clearTimeout(timeout);
            timeout = setTimeout(triggerChange, 300);
        });

        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") triggerChange();
        });

        removeBtn.addEventListener("click", () => {
            clearTimeout(timeout);
            delete this.activeFilters[columnName];
            tag.remove();
            this.onFilterChange({ ...this.activeFilters });
        });

        this.container.appendChild(tag);
        input.focus();
    }
}