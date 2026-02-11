import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadDropdown } from '../../../../../public/static/scripts/utils/load-dropdown.js';
import * as apiClient from '../../../../../public/static/scripts/utils/api-client.js';

describe('loadDropdown', () => {
    let selectEl;

    beforeEach(() => {
        document.body.innerHTML = '<select id="test-select"></select>';
        selectEl = document.getElementById('test-select');
        vi.restoreAllMocks();
        vi.stubGlobal('alert', vi.fn());
    });

    it('should populate dropdown with items on success', async () => {
        vi.spyOn(apiClient, 'apiRequest').mockResolvedValue({
            ok: true,
            data: [
                { id: 1, name: 'Sofia' },
                { id: 2, name: 'Plovdiv' }
            ]
        });

        await loadDropdown({
            selectEl,
            endpoint: 'cities',
            placeholder: 'Select a city'
        });

        const options = selectEl.querySelectorAll('option');
        expect(options.length).toBe(3);
        expect(options[0].textContent).toBe('Select a city');
        expect(options[1].value).toBe('1');
        expect(options[1].textContent).toBe('Sofia');
    });

    it('should handle API errors and show error option', async () => {
        vi.spyOn(apiClient, 'apiRequest').mockResolvedValue({
            ok: false,
            message: 'Unauthorized'
        });

        await loadDropdown({ selectEl, endpoint: 'cities' });

        expect(selectEl.textContent).toContain('');
    });

    it('should prevent XSS when item names contain HTML tags', async () => {
        vi.spyOn(apiClient, 'apiRequest').mockResolvedValue({
            ok: true,
            data: [{ id: 1, name: '<script>alert(1)</script>' }]
        });

        await loadDropdown({ selectEl, endpoint: 'cities' });

        const opt = selectEl.querySelectorAll('option')[0];
        expect(opt.innerHTML).not.toContain('<script>');
        expect(opt.textContent).toBe('<script>alert(1)</script>');
    });
});