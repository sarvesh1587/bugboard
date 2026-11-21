import axios from 'axios';

const TOKEN_KEY = 'bugboard_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && tokenStore.get() && !err.config.url.includes('/auth/login')) {
      tokenStore.clear();
      window.dispatchEvent(new Event('bugboard:logout'));
    }
    return Promise.reject(err);
  }
);

/** Human readable message from any API error */
export const errMsg = (err, fallback = 'Something went wrong') => {
  if (!err?.response) return err?.code === 'ECONNABORTED' ? 'Request timed out' : 'Cannot reach the server';
  const { message, details } = err.response.data || {};
  if (details?.length) return details[0].message;
  return message || fallback;
};

/** field → message map for forms */
export const fieldErrors = (err) =>
  Object.fromEntries((err?.response?.data?.details || []).map((d) => [d.field.split('.').pop(), d.message]));

export default api;
