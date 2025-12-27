import axios from 'axios';
import axiosDebug from 'axios-debug-log';

axiosDebug({
  request(debug, config) {
    debug('Request:', config.method?.toUpperCase(), config.url);
  },
  response(debug, response) {
    debug('Response:', response.status, response.config.url);
  },
  error(debug, error) {
    debug('Error:', error.message);
  },
});

const get = (url, params = {}) => axios.get(url, { params }).then((response) => response.data);

const getBinary = (url, params = {}) => axios.get(url, {
  params,
  responseType: 'arraybuffer', // This handles binary data
}).then((response) => response.data);

const httpClient = {
  get,
  getBinary,
};

export default httpClient;
