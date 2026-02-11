import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupAutocomplete } from '../../../../../public/static/scripts/utils/autocomplete.js';
import * as apiModule from '../../../../../public/static/scripts/utils/api-client.js';
import { ApiResponse } from '../../../../../public/static/scripts/utils/api-response.js';

describe('setupAutocomplete', () => {
    let input, listBox;

    beforeEach(() => {

        vi.clearAllMocks();

        document.body.innerHTML = `
            <input id="test-input" />
            <div id="test-list"></div>
        `;
        input = document.getElementById('test-input');
        listBox = document.getElementById('test-list');
        
        vi.useFakeTimers();

        vi.spyOn(apiModule, 'apiRequest');
    });

    it('should debounce the API call', async () => {
        setupAutocomplete({ input, listBox, endpoint: 'test', debounce: 300 });

        input.value = 'sof';
        input.dispatchEvent(new Event('input'));
        input.value = 'sofia';
        input.dispatchEvent(new Event('input'));

        expect(apiModule.apiRequest).not.toHaveBeenCalled();

        vi.advanceTimersByTime(300);

        expect(apiModule.apiRequest).toHaveBeenCalledTimes(1);
        expect(apiModule.apiRequest).toHaveBeenCalledWith(expect.stringContaining('q=sofia'));
    });

    it('should render items correctly when ApiResponse is successful', async () => {
        const mockData = [{ id: 1, name: 'София' }, { id: 2, name: 'Сопот' }];
        apiModule.apiRequest.mockResolvedValue(ApiResponse.success(mockData));

        setupAutocomplete({ input, listBox, endpoint: 'test', minChars: 2 });

        input.value = 'so';
        input.dispatchEvent(new Event('input'));
        vi.advanceTimersByTime(300);

        await vi.runAllTimersAsync();

        const items = listBox.querySelectorAll('.autocomplete-item');
        expect(items.length).toBe(2);
        expect(items[0].textContent).toBe('София');
    });

    it('should not call API if input length is less than minChars', async () => {
        setupAutocomplete({ input, listBox, endpoint: 'test', minChars: 3 });

        input.value = 'so';
        input.dispatchEvent(new Event('input'));
        vi.advanceTimersByTime(300);

        expect(apiModule.apiRequest).not.toHaveBeenCalled();
    });

    it('should call onSelect and update input when an item is clicked', async () => {
        const onSelect = vi.fn();
        const mockData = [{ id: 5, name: 'Пловдив' }];
        apiModule.apiRequest.mockResolvedValue(ApiResponse.success(mockData));

        setupAutocomplete({ input, listBox, endpoint: 'test', onSelect });

        input.value = 'plov';
        input.dispatchEvent(new Event('input'));
        vi.advanceTimersByTime(300);
        await vi.runAllTimersAsync();

        const item = listBox.querySelector('.autocomplete-item');
        item.click();

        expect(input.value).toBe('Пловдив');
        expect(input.dataset.id).toBe('5');
        expect(onSelect).toHaveBeenCalledWith(mockData[0]);
        expect(listBox.innerHTML).toBe("");
    });
});