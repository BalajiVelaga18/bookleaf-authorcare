export function successResponse(data = null, message = 'Success') {
  return { success: true, message, data };
}

export function errorResponse(message = 'An error occurred', errors = null, statusCode = 400) {
  const response = { success: false, message };
  if (errors) response.errors = errors;
  response.statusCode = statusCode;
  return response;
}

export function paginatedResponse(data, pagination) {
  return {
    success: true,
    data,
    pagination,
  };
}
