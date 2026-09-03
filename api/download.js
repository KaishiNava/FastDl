const axios = require('axios');

const BASE_URL = 'https://getdl.space';
const API_ENDPOINT = `${BASE_URL}/api/download`;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Referer': `${BASE_URL}/id`,
  'Origin': BASE_URL,
  'Content-Type': 'application/json',
  'Accept': 'application/json, text/plain, */*',
  'Cookie': 'NEXT_LOCALE=id'
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ status: false, message: 'Method Not Allowed' });

  const { url } = req.body || {};
  if (!url) return res.status(400).json({ status: false, message: 'URL kosong' });

  try {
    const response = await axios.post(API_ENDPOINT, { url }, { headers: HEADERS, timeout: 15000 });
    const rawData = response.data;

    // Normalisasi struktur data
    let title = rawData.title || rawData.caption || rawData.desc || 'Video Downloader';
    let thumbnail = rawData.thumbnail || rawData.cover || rawData.image || '';
    let links = [];

    if (Array.isArray(rawData.medias)) {
      links = rawData.medias.map(m => ({ url: m.url, quality: m.quality || m.extension || 'Download' }));
    } else if (Array.isArray(rawData.urls)) {
      links = rawData.urls.map(u => ({ url: typeof u === 'string' ? u : u.url, quality: u.subname || 'Download' }));
    } else if (rawData.url) {
      links = [{ url: rawData.url, quality: 'Download Video' }];
    }

    return res.status(200).json({
      status: true,
      result: { title, thumbnail, links }
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: 'Gagal memproses URL' });
  }
};
