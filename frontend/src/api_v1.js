import axios from 'axios';

const apiv1 = axios.create({ baseURL: '/v1' });

apiv1.interceptors.request.use((config) => {
  const token = localStorage.getItem('token_v1');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiv1.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token_v1');
      window.location.href = '/registro';
    }
    return Promise.reject(error);
  }
);

export default apiv1;
