import axios from 'axios';

const get = (url, params = {}) => axios.get(url, { params }).then((response) => response.data);
console.log("dummy client!!!");

const httpClient = {
  get,
};

export default httpClient;
