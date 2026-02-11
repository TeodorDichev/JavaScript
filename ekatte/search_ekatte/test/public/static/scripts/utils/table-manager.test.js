import { describe, it, expect, vi, beforeEach } from "vitest";
import { TableManager } from "../../../../../public/static/scripts/utils/table-manager.js";

describe("TableManager", () => {
    let onParamsChange;

    beforeEach(() => {
        document.body.innerHTML = `
            <table class="result-table">
                <thead>
                    <tr class="sort-row">
                        <th class="sortable" data-col="name">Name <span class="sort-icon"></span></th>
                        <th class="sortable" data-col="date">Date <span class="sort-icon"></span></th>
                    </tr>
                </thead>
            </table>
            <div id="pagination-bottom"></div>
            <select id="page-limit"><option value="20">20</option></select>
        `;
        onParamsChange = vi.fn();
        Element.prototype.scrollIntoView = vi.fn();
    });

    it("should initialize with default state", () => {
        const tm = new TableManager({ onParamsChange });
        expect(tm.state.page).toBe(1);
        expect(tm.state.limit).toBe(20);
    });

    it("should handle single column sort", () => {
        const tm = new TableManager({ onParamsChange });
        const nameTh = document.querySelector('[data-col="name"]');
        
        nameTh.click();
        expect(tm.state.sort).toEqual([{ col: "name", dir: "asc" }]);
        expect(onParamsChange).toHaveBeenCalled();

        nameTh.click();
        expect(tm.state.sort).toEqual([{ col: "name", dir: "desc" }]);
    });

    it("should handle multi-column sort with shift key", () => {
        const tm = new TableManager({ onParamsChange });
        const nameTh = document.querySelector('[data-col="name"]');
        const dateTh = document.querySelector('[data-col="date"]');

        nameTh.click();
        dateTh.dispatchEvent(new MouseEvent("click", { shiftKey: true, bubbles: true }));

        expect(tm.state.sort.length).toBe(2);
        expect(tm.sortString).toBe("name:asc,date:asc");
    });

    it("should reset to page 1 when sort changes", () => {
        const tm = new TableManager({ onParamsChange });
        tm.state.page = 5;
        
        document.querySelector('[data-col="name"]').click();
        expect(tm.state.page).toBe(1);
    });

    it("should update pagination DOM and handle clicks", () => {
        const tm = new TableManager({ onParamsChange });
        tm.renderPagination({ page: 2, totalPages: 5 });

        const nextBtn = document.querySelector('button[data-page="3"]');
        expect(nextBtn).toBeTruthy();
        
        nextBtn.click();
        expect(tm.state.page).toBe(3);
        expect(onParamsChange).toHaveBeenCalled();
    });
});