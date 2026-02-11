import { describe, it, expect, vi } from 'vitest';
import { calculateStats, formatNullValues } from '../../src/utils/export-helper.js';

describe('export-helper tests', () => {
    describe('calculateStats', () => {
        it('should return the correct object structure', () => {
            const startTime = performance.now();
            const startUsage = process.cpuUsage();

            const stats = calculateStats(startTime, startUsage);

            expect(stats).toHaveProperty('time');
            expect(stats).toHaveProperty('memory');
            expect(stats).toHaveProperty('cpu');
            
            expect(stats.time).toMatch(/s$/);
            expect(stats.memory).toMatch(/MB$/);
            expect(stats.cpu).toMatch(/%$/);
        });

        it('should calculate duration correctly when time passes', async () => {
            const startTime = performance.now();
            const startUsage = process.cpuUsage();

            await new Promise(resolve => setTimeout(resolve, 100));

            const stats = calculateStats(startTime, startUsage);
            const timeValue = parseFloat(stats.time);

            expect(timeValue).toBeGreaterThanOrEqual(0.1);
        });

        it('should handle mock values for precise calculation testing', () => {
            const startTime = 1000;
            vi.spyOn(performance, 'now').mockReturnValue(2500);

            const startUsage = { user: 10000, system: 5000 };
            vi.spyOn(process, 'cpuUsage').mockReturnValue({ user: 20000, system: 10000 });

            const stats = calculateStats(startTime, startUsage);

            expect(stats.time).toBe('1500ms');
            expect(stats.cpu).toBe('3.0%');
            
            vi.restoreAllMocks();
        });
    });

    describe('formatNullValues', () => {
        it('should replace null and undefined with "-"', () => {
            const input = [
                { id: 1, name: 'Sofia', population: null },
                { id: 2, name: null, population: 5000 },
                { id: 3, name: 'Varna', population: undefined }
            ];

            const expected = [
                { id: 1, name: 'Sofia', population: '-' },
                { id: 2, name: '-', population: 5000 },
                { id: 3, name: 'Varna', population: '-' }
            ];

            expect(formatNullValues(input)).toEqual(expected);
        });

        it('should not change valid values like 0 or empty strings', () => {
            const input = [{ id: 0, name: '', active: false }];
            const result = formatNullValues(input);

            expect(result[0].id).toBe(0);
            expect(result[0].name).toBe('');
            expect(result[0].active).toBe(false);
        });

        it('should return an empty array if input is not an array', () => {
            expect(formatNullValues(null)).toEqual([]);
            expect(formatNullValues(undefined)).toEqual([]);
        });

        it('should return a new object (not modify the original)', () => {
            const input = [{ a: null }];
            const result = formatNullValues(input);
            
            expect(result[0]).not.toBe(input[0]);
            expect(input[0].a).toBeNull();
        });
    });
})
