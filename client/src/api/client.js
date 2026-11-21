import axios from 'axios';

const TOKEN_KEY = 'bugboard_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

const API_URL = import.meta.env.VITE_API_URL || '/api';
const api = axios.create({ baseURL: API_URL, timeout: 15000 });

// When the API is on another domain (e.g. Render), uploaded files live there too
const FILE_ORIGIN = /^https?:\/\//.test(API_URL) ? new URL(API_URL).origin : '';
export const fileUrl = (url = '') => (/^https?:\/\//.test(url) ? url : `${FILE_ORIGIN}${url}`);

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
