import axios from 'axios';

import { STORAGE_KEYS } from '../utils/constants';
import { secureStorage } from '../utils/security';

const token = secureStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

export const api = axios.create({
    baseURL: '/api/v1',
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

