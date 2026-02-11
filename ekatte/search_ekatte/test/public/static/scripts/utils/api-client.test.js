import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiRequest } from '../../../../../public/static/scripts/utils/api-client.js';
import { ApiResponse } from '../../../../../public/static/scripts/utils/api-response.js';

describe('apiRequest utility', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    it('should return ApiResponse instance and correct data on success', async () => {
        const mockResponse = { data: { id: 1 }, message: 'OK', errors: [] };
        
        fetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => mockResponse,
        });

        const result = await apiRequest('/cities');

        expect(result).toBeInstanceOf(ApiResponse);
        expect(result.ok).toBe(true);
        expect(result.data).toEqual(mockResponse.data);
        expect(result.message).toBe('OK');
    });

    it('should handle invalid JSON and return ApiResponse.error', async () => {
        fetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
            json: () => Promise.reject(new Error('Syntax Error')),
        });

        const result = await apiRequest('/error');

        expect(result).toBeInstanceOf(ApiResponse);
        expect(result.ok).toBe(false);
        expect(result.message).toBe("Невалиден формат на отговора");
    });

    it('should handle network failures and return proper ApiResponse object', async () => {
        const networkError = 'Failed to fetch';
        fetch.mockRejectedValueOnce(new Error(networkError));

        const result = await apiRequest('/offline');

        expect(result).toBeInstanceOf(ApiResponse);
        expect(result.ok).toBe(false);
        expect(result.message).toBe('Възникна грешка при запитването към сървъра');
        expect(result.errors).toContain(networkError);
    });

    it('should handle successful response with no body (empty JSON)', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: () => Promise.reject(new Error('Unexpected end of JSON input')),
        });

        const result = await apiRequest('/empty');

        expect(result.ok).toBe(true);
        expect(result.data).toBeNull();
    });

    it('should return a specific error message when fetch is aborted due to timeout', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    
    fetch.mockRejectedValueOnce(abortError);

    const result = await apiRequest('/slow-endpoint');

    expect(result).toBeInstanceOf(ApiResponse);
    expect(result.ok).toBe(false);
    expect(result.message).toBe('Възникна грешка при запитването към сървъра');
    expect(result.errors[0]).toContain('пресрочване на времето');
});
});