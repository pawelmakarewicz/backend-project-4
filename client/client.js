import axios from 'axios';

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
