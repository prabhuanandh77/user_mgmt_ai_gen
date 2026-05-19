import axios from 'axios';

// The /api route will be proxied to the backend via Nginx in production
const api = axios.create({
  baseURL: '/api/users'
});

export const getUsers = () => api.get('');
export const addUser = (user) => api.post('', user);
export const deleteUser = (id) => api.delete(`/${id}`);

export default api;
