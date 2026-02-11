import { CONFIG } from '../config.js';
import { ApiResponse } from './api-response.js';
import { ErrorHandler } from './error-handler.js';

/**
 * Always returns an ApiResponse instance.
 * Never throws.
*/
export async function apiRequest(endpoint, method = 'GET', body = null) {
  const url = `${CONFIG.API_URL}${endpoint}`;
  
  /**
  * AbortController allows you to gracefully cancel one or more Web requests 
  * (like fetch) as and when desired. It is primarily used here to implement 
  * a request timeout.
  * @see https://developer.mozilla.org/en-US/docs/Web/API/AbortController
  */
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT || 5000);

  /**
  * The 'signal' property is passed into the fetch options to associate 
  * the request with our controller. This allows us to trigger the 'abort' 
  * event if the timeout is reached.
  * @see https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal
  */
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
    signal: controller.signal
  };

  if (body) options.body = JSON.stringify(body);

  try {
    const response = await fetch(url, options);
    clearTimeout(timeoutId);

    try {
      const result = await response.json();
      return new ApiResponse({
        ok: response.ok,
        data: result.data,
        message: result.message,
        errors: result.errors
      });
    } catch (jsonError) {
      return response.ok 
        ? ApiResponse.success(null) 
        : ApiResponse.error('Невалиден формат на отговора', [jsonError.message]);
    }
  } catch (error) {
    clearTimeout(timeoutId);
    
    const errorMessage = error.name === 'AbortError' 
      ? `Заявката бе прекъсната поради пресрочване на времето (${CONFIG.TIMEOUT}ms)` 
      : error.message;

    return ApiResponse.error('Възникна грешка при запитването към сървъра', [errorMessage]);
  }
}


/**
 * Always returns an the raw fetch Response object.
 * Never throws. Returns null on error.
 * Will leave in case if i have to handle file streaming elsewhere
*/
export async function apiFileRequest(endpoint, method = 'GET', body = null) {
  const url = `${CONFIG.API_URL}${endpoint}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT || 5000);

  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
    signal: controller.signal
  };

  if (body) options.body = JSON.stringify(body);

  try {
    const response = await fetch(url, options);
    if (response.status === 500) {
      ErrorHandler.handle(ApiResponse.error('Сървърна грешка при обработка на заявката за файл.'));
      return null;
    }

    clearTimeout(timeoutId);
    return response;
    
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      ErrorHandler.handle(ApiResponse.error('Заявката отне твърде много време и беше прекратена.'));
    } else {
      ErrorHandler.handle(ApiResponse.error('Възникна грешка при връзката със сървъра', [error.message]));
    }
    return null;
  }
}