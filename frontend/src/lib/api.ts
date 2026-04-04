export const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_BASE_URL || '';
};

export const apiFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const baseUrl = getApiBaseUrl();
  let url = input.toString();
  
  if (url.startsWith('/')) {
    url = `${baseUrl}${url}`;
  }
  
  return fetch(url, init);
};
