import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FilterManager } from '../../../../../public/static/scripts/utils/filter-manager.js';

describe('FilterManager', () => {
    let containerSelector, onFilterChange;

    beforeEach(() => {
        document.body.innerHTML = '<div id="filter-container"></div>';
        containerSelector = '#filter-container';
        onFilterChange = vi.fn();
        vi.useFakeTimers();
    });

    it('should add a new filter tag and focus the input', () => {
        const manager = new FilterManager({ containerSelector, onFilterChange });
        manager.addFilter('city', 'City');

        const tag = document.querySelector('.filter-tag');
        const input = tag.querySelector('input');

        expect(tag).not.toBeNull();
        expect(tag.textContent).toContain('City:');
        expect(document.activeElement).toBe(input);
    });

    it('should prevent adding duplicate filters for the same column', () => {
        const manager = new FilterManager({ containerSelector, onFilterChange });
        manager.addFilter('name', 'Name');
        manager.addFilter('name', 'Name');

        const tags = document.querySelectorAll('.filter-tag');
        expect(tags.length).toBe(1);
    });

    it('should trigger onFilterChange with debounce when typing', () => {
        const manager = new FilterManager({ containerSelector, onFilterChange });
        manager.addFilter('code', 'Code');
        
        const input = document.querySelector('input');
        input.value = '1000';
        input.dispatchEvent(new Event('input'));

        expect(onFilterChange).not.toHaveBeenCalled();

        vi.advanceTimersByTime(300);
        expect(onFilterChange).toHaveBeenCalledWith({ code: '1000' });
    });

    it('should remove filter and update active filters state on click', () => {
        const manager = new FilterManager({ containerSelector, onFilterChange });
        manager.addFilter('status', 'Status');
        
        const removeBtn = document.querySelector('.remove-filter');
        removeBtn.click();

        expect(document.querySelector('.filter-tag')).toBeNull();
        expect(onFilterChange).toHaveBeenCalledWith({});
        expect(manager.activeFilters).toEqual({});
    });

    it('should trigger onFilterChange immediately when Enter key is pressed', () => {
        const manager = new FilterManager({ containerSelector, onFilterChange });
        manager.addFilter('region', 'Region');
        
        const input = document.querySelector('input');
        input.value = 'Plovdiv';
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

        expect(onFilterChange).toHaveBeenCalledWith({ region: 'Plovdiv' });
    });

    it('should trim whitespace from input values', () => {
        const manager = new FilterManager({ containerSelector, onFilterChange });
        manager.addFilter('search', 'Search');
        
        const input = document.querySelector('input');
        input.value = '  Sofia  ';
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

        expect(onFilterChange).toHaveBeenCalledWith({ search: 'Sofia' });
    });
});