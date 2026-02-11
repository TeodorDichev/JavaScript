export class TableManager {
constructor(config = {}) {
        this.tableSelector = config.tableSelector || ".result-table";
        this.onParamsChange = config.onParamsChange || (() => {});
        this.searchTimeout = null;

        this.state = {
            q: "",
            page: 1,
            limit: parseInt(document.getElementById("page-limit")?.value) || 20,
            sort: [],
            fromDate: document.getElementById("filter-from-date")?.value || "",
            toDate: document.getElementById("filter-to-date")?.value || "",
            filters: {}
        };
        
        this.setupListeners();
    }

    get sortString() {
        return this.state.sort.map(s => `${s.col}:${s.dir}`).join(',');
    }

    get queryParams() {
        return {
            q: this.state.q,
            page: this.state.page,
            limit: this.state.limit,
            sort: this.sortString,
            fromDate: this.state.fromDate,
            toDate: this.state.toDate,
            ...this.state.filters
        };
    }

    renderPagination(paging) {
        const container = document.getElementById("pagination-bottom");
        if (!container || !paging) return;

        container.innerHTML = `
            <button ${paging.page <= 1 ? 'disabled' : ''} data-page="${paging.page - 1}">Previous</button>
            <span class="page-info">Page <b>${paging.page}</b> of <b>${paging.totalPages}</b></span>
            <button ${paging.page >= paging.totalPages ? 'disabled' : ''} data-page="${paging.page + 1}">Next</button>
        `;

        container.onclick = (e) => {
            const btn = e.target.closest('button');
            if (!btn || btn.disabled) return;
            
            this.state.page = parseInt(btn.dataset.page);
            this.onParamsChange();
            document.querySelector(this.tableSelector)?.scrollIntoView({ behavior: 'smooth' });
        };
    }

    setupListeners() {
        const table = document.querySelector(this.tableSelector);
        if (!table) return;

        table.querySelector("thead")?.addEventListener("click", (e) => {
            const th = e.target.closest(".sortable");
            if (!th) return;

            const col = th.dataset.col;
            const index = this.state.sort.findIndex(s => s.col === col);

            if (!e.shiftKey) {
                if (index !== -1 && this.state.sort.length === 1) {
                    this.state.sort[0].dir = this.state.sort[0].dir === 'asc' ? 'desc' : 'asc';
                } else {
                    this.state.sort = [{ col, dir: 'asc' }];
                }
            } else {
                if (index !== -1) {
                    this.state.sort[index].dir = this.state.sort[index].dir === 'asc' ? 'desc' : 'asc';
                } else {
                    this.state.sort.push({ col, dir: 'asc' });
                }
            }

            this.state.page = 1;
            this.updateSortIcons();
            this.onParamsChange();
        });
    }

    updateSortIcons() {
        const table = document.querySelector(this.tableSelector);
        if (!table) {
            console.warn(`Table with selector "${this.tableSelector}" not found.`);
            return;
        }

        table.querySelectorAll(".sortable").forEach(th => {
            const col = th.dataset.col;
            const icon = th.querySelector(".sort-icon");
            if (!icon) return;

            const sortIndex = this.state.sort.findIndex(s => s.col === col);
            
            if (sortIndex !== -1) {
                const item = this.state.sort[sortIndex];
                const priority = this.state.sort.length > 1 ? `<sup>${sortIndex + 1}</sup>` : "";
                icon.innerHTML = (item.dir === 'asc' ? ' ▲' : ' ▼') + priority;
                th.classList.add("active-sort");
            } else {
                icon.innerHTML = "";
                th.classList.remove("active-sort");
            }
        });
    }
}
