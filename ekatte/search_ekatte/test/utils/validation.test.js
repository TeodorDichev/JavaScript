import { describe, it, expect } from 'vitest';
import { 
    checkIsOnlyNumerical, 
    isPositiveInteger, 
    checkIsOnlyAlphabetical, 
    checkIsAlphaNumerical,
    checkRegionCodeFormat,
    checkMunicipalityCodeFormat,
    checkMayoralityCodeFormat,
    checkEkatteFormat,
    checkNuts3Format
} from '../../src/utils/validation.js';

describe('Validation Utility Functions (Format Checks)', () => {

    describe('checkIsOnlyNumerical', () => {
        it('should return true for strings containing only digits', () => {
            expect(checkIsOnlyNumerical('12345')).toBe(true);
        });

        it('should return false for strings with letters or symbols', () => {
            expect(checkIsOnlyNumerical('123a5')).toBe(false);
            expect(checkIsOnlyNumerical('12.45')).toBe(false);
        });

        it('should return false for empty strings or only spaces', () => {
            expect(checkIsOnlyNumerical('')).toBe(false);
            expect(checkIsOnlyNumerical('   ')).toBe(false);
        });

        it('should return false if input is not a string', () => {
            expect(checkIsOnlyNumerical(123)).toBe(false);
            expect(checkIsOnlyNumerical(null)).toBe(false);
            expect(checkIsOnlyNumerical(undefined)).toBe(false);
        });
    });

    describe('isPositiveInteger', () => {
        it('should return true for positive integers', () => {
            expect(isPositiveInteger(10)).toBe(true);
        });

        it('should return false for zero or negative integers', () => {
            expect(isPositiveInteger(0)).toBe(false);
            expect(isPositiveInteger(-5)).toBe(false);
        });

        it('should return false for floats', () => {
            expect(isPositiveInteger(10.5)).toBe(false);
        });

        it('should return false if input is not a number', () => {
            expect(isPositiveInteger('10')).toBe(false);
            expect(isPositiveInteger(null)).toBe(false);
            expect(isPositiveInteger(undefined)).toBe(false);
        });
    });

    describe('checkIsOnlyAlphabetical', () => {
        it('should return true for Latin and Cyrillic letters with spaces', () => {
            expect(checkIsOnlyAlphabetical('Sofia София')).toBe(true);
        });

        it('should return false if it contains numbers', () => {
            expect(checkIsOnlyAlphabetical('Sofia1')).toBe(false);
        });

        it('should return false for blanks and nulls', () => {
            expect(checkIsOnlyAlphabetical('  ')).toBe(false);
            expect(checkIsOnlyAlphabetical(null)).toBe(false);
            expect(checkIsOnlyAlphabetical(undefined)).toBe(false);
        });
    });

    describe('checkIsAlphaNumerical', () => {
        it('should return true for alphanumeric characters', () => {
            expect(checkIsAlphaNumerical('Sofia123')).toBe(true);
            expect(checkIsAlphaNumerical('София01')).toBe(true);
        });

        it('should return false for blanks and nulls', () => {
            expect(checkIsOnlyAlphabetical('  ')).toBe(false);
            expect(checkIsOnlyAlphabetical(null)).toBe(false);
            expect(checkIsOnlyAlphabetical(undefined)).toBe(false);
        });
    });

    describe('checkRegionCodeFormat', () => {
        it('should return true for exactly 3 alphabetical characters', () => {
            expect(checkRegionCodeFormat('SOF')).toBe(true);
            expect(checkRegionCodeFormat('ПЛВ')).toBe(true);
        });

        it('should return false if length is not 3', () => {
            expect(checkRegionCodeFormat('SO')).toBe(false);
            expect(checkRegionCodeFormat('SOFIA')).toBe(false);
        });

        it('should return false for 3 non-alphabetical characters', () => {
            expect(checkRegionCodeFormat('123')).toBe(false);
            expect(checkRegionCodeFormat('PL1')).toBe(false);
            expect(checkRegionCodeFormat('PL ')).toBe(false);
            expect(checkRegionCodeFormat('   ')).toBe(false);
            expect(checkRegionCodeFormat(null)).toBe(false);
            expect(checkRegionCodeFormat(undefined)).toBe(false);
        });
    });

    describe('checkMunicipalityCodeFormat', () => {
        it('should return true for 5 alphanumeric characters', () => {
            expect(checkMunicipalityCodeFormat('SOF01')).toBe(true);
        });

        it('should return false if length is not 5', () => {
            expect(checkMunicipalityCodeFormat('SOF1')).toBe(false);
            expect(checkMunicipalityCodeFormat('SOF123')).toBe(false);
        });

        it('should return false for 5 non-alphanumerical characters', () => {
            expect(checkMunicipalityCodeFormat('   ')).toBe(false);
            expect(checkMunicipalityCodeFormat(null)).toBe(false);
            expect(checkMunicipalityCodeFormat(undefined)).toBe(false);
        });
    });

    describe('checkMayoralityCodeFormat', () => {
        it('should return true for valid 8-char format (5 alpha-num + 3 extra + 2 digits logic)', () => {
            expect(checkMayoralityCodeFormat('SOF01-12')).toBe(true);
        });

        it('should return false if the last two characters are not digits', () => {
            expect(checkMayoralityCodeFormat('SOF01-AB')).toBe(false);
        });

        it('should return false for nulls and blanks', () => {
            expect(checkMayoralityCodeFormat('   ')).toBe(false);
            expect(checkMayoralityCodeFormat(null)).toBe(false);
            expect(checkMayoralityCodeFormat(undefined)).toBe(false);
        });
    });

    describe('checkEkatteFormat', () => {
        it('should return true for exactly 5 digits', () => {
            expect(checkEkatteFormat('01234')).toBe(true);
        });

        it('should return false for more or less digits', () => {
            expect(checkEkatteFormat('1234')).toBe(false);
            expect(checkEkatteFormat('123456')).toBe(false);
        });

        it('should return false for nulls and blanks', () => {
            expect(checkEkatteFormat('   ')).toBe(false);
            expect(checkEkatteFormat(null)).toBe(false);
            expect(checkEkatteFormat(undefined)).toBe(false);
        });

        it('should return false for strings', () => {
            expect(checkEkatteFormat('aaaaa')).toBe(false);
            expect(checkEkatteFormat('б1б1б')).toBe(false);
        });
    });

    describe('checkNuts3Format', () => {
        it('should return true for 2 alpha + 3 numerical chars', () => {
            expect(checkNuts3Format('BG411')).toBe(true);
        });

        it('should return false if format is swapped (3 num + 2 alpha)', () => {
            expect(checkNuts3Format('411BG')).toBe(false);
        });

        it('should return false if length is incorrect', () => {
            expect(checkNuts3Format('BG41')).toBe(false);
        });

        it('should return false for nulls and blanks', () => {
            expect(checkNuts3Format('   ')).toBe(false);
            expect(checkNuts3Format(null)).toBe(false);
            expect(checkNuts3Format(undefined)).toBe(false);
        });
    });
});