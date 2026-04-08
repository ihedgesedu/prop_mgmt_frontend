import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'https://prop-mgmt-api-674151449096.us-central1.run.app',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
