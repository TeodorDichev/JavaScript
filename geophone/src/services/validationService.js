export const isValidPhone = (phoneNumber) => {
    if (phoneNumber === null || phoneNumber === undefined) return false;
    const phoneStr = phoneNumber.toString().trim();
    const phoneRegex = /^[0-9]{5,15}$/;
    return phoneRegex.test(phoneStr);
};

export const isValidCountryId = (countryId) => {
    const id = parseInt(countryId);
    return !isNaN(id) && id > 0;
};

export const isValidPhoneCode = (code) => {
    if (!code) return false;
    const codeStr = code.toString().trim();
    const codeRegex = /^\+?[0-9]{1,4}$/;
    return codeRegex.test(codeStr);
};

export const isValidCountryName = (name) => {
    return typeof name === 'string' && name.trim().length >= 2;
};
