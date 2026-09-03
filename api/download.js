const axios = require('axios');

const BASE_URL = 'https://getdl.space';
const API_ENDPOINT = `${BASE_URL}/api/download`;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': `${BASE_URL}/id`,
  'Origin': BASE_URL,
  'Content-Type': 'application/json',
  'Accept': 'application/json, text/plain, */*',
  'Cookie': 'NEXT_LOCALE=id'
};

module.exports = async (req, res) => {
  // Setup CORS Header
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ status: false, message: 'Method Not Allowed' });
  }

  const { url } = req.body || {};

  if (!url) {
    return res.status(400).json({ status: false, message: 'URL tidak boleh kosong' });
  }

  try {
    const response = await axios.post(API_ENDPOINT, 
      { url: url }, 
      {
        headers: HEADERS,
        responseType: 'json',
        timeout: 15000
      }
    );

    return res.status(200).json({
      status: true,
      data: response.data
    });
  } catch (error) {
    console.error('[ERROR] Request Gagal:', error.message);
    
    return res.status(error.response?.status || 500).json({
      status: false,
      message: 'Gagal mengambil data dari getdl.space.',
      error: error.response?.data || error.message
    });
  }
};
