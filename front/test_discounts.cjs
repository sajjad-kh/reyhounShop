const fs = require('fs');
const token = fs.readFileSync('C:/Users/ariana/AppData/Local/Temp/opencode/token.txt', 'utf8').trim();
const { api } = require('C:/Users/ariana/Desktop/reyhon/app/front/src/utils/api');
(async () => {
  try {
    const res = await api.get('/discounts', { headers: { Authorization: 'Bearer ' + token } });
    console.log('api.get res keys:', Object.keys(res));
    console.log('res.data keys:', res.data ? Object.keys(res.data) : 'null');
    const data = res.data;
    console.log('Array.isArray(data.discounts):', Array.isArray(data.discounts));
    const result = Array.isArray(data.discounts) ? data.discounts : 'NOT array';
    console.log('getDiscounts result:', Array.isArray(result) ? result.length + ' items' : result);
  } catch (e) { console.error('ERR:', e.message); }
})();
