export class ApiResponse {
  constructor({ ok = false, data = null, message = '', errors = [] }) {
    this.ok = ok;
    this.data = data;
    this.message = message;
    this.errors = errors;
  }

  static success(data, message = 'Успешна заявка') {
    return new ApiResponse({ ok: true, data, message });
  }

  static error(message, errors = []) {
    return new ApiResponse({ ok: false, message, errors });
  }
}