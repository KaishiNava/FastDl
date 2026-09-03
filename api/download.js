const axios = require("axios");

const BASE_URL = "https://getdl.space";
const API_ENDPOINT = `${BASE_URL}/api/download`;

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Content-Type": "application/json",
  Referer: `${BASE_URL}/id`,
  Origin: BASE_URL,
  Cookie: "NEXT_LOCALE=id"
};

// =====================================================
// CORS
// =====================================================

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  res.setHeader(
    "Access-Control-Max-Age",
    "86400"
  );
}

// =====================================================
// NORMALIZE MEDIA
// =====================================================

function normalizeMedia(item) {
  if (!item) return null;

  // Jika API hanya mengembalikan string URL
  if (typeof item === "string") {
    return {
      url: item,
      quality: "Download"
    };
  }

  if (typeof item !== "object") {
    return null;
  }

  const url =
    item.url ||
    item.download ||
    item.download_url ||
    item.downloadUrl ||
    item.link ||
    item.src ||
    item.dlink;

  if (!url) {
    return null;
  }

  const quality =
    item.quality ||
    item.qualityLabel ||
    item.label ||
    item.name ||
    item.subname ||
    item.extension ||
    item.type ||
    "Download";

  return {
    url,
    quality
  };
}

// =====================================================
// EXTRACT RESULT
// =====================================================

function extractResult(data) {
  if (!data) {
    return {
      title: "Video Downloader",
      thumbnail: "",
      links: []
    };
  }

  /*
   * Antisipasi API yang membungkus response:
   *
   * {
   *   result: {...}
   * }
   *
   * atau
   *
   * {
   *   data: {...}
   * }
   */

  const root =
    data.result ||
    data.data ||
    data.response ||
    data;

  const title =
    root.title ||
    root.caption ||
    root.name ||
    root.desc ||
    root.description ||
    "Video Downloader";

  const thumbnail =
    root.thumbnail ||
    root.thumb ||
    root.cover ||
    root.image ||
    root.poster ||
    root.coverUrl ||
    "";

  let rawLinks = [];

  // medias
  if (Array.isArray(root.medias)) {
    rawLinks = root.medias;
  }

  // urls
  else if (Array.isArray(root.urls)) {
    rawLinks = root.urls;
  }

  // formats
  else if (Array.isArray(root.formats)) {
    rawLinks = root.formats;
  }

  // videos
  else if (Array.isArray(root.videos)) {
    rawLinks = root.videos;
  }

  // downloads
  else if (Array.isArray(root.downloads)) {
    rawLinks = root.downloads;
  }

  // media
  else if (Array.isArray(root.media)) {
    rawLinks = root.media;
  }

  // single URL
  else if (
    root.url ||
    root.download ||
    root.download_url ||
    root.downloadUrl ||
    root.link
  ) {
    rawLinks = [root];
  }

  const links = rawLinks
    .map(normalizeMedia)
    .filter(Boolean);

  return {
    title,
    thumbnail,
    links
  };
}

// =====================================================
// API HANDLER
// =====================================================

module.exports = async (req, res) => {
  setCors(res);

  // ---------------------------------------------------
  // PREFLIGHT
  // ---------------------------------------------------

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // ---------------------------------------------------
  // METHOD CHECK
  // ---------------------------------------------------

  if (req.method !== "POST") {
    return res.status(405).json({
      status: false,
      message: "Method Not Allowed",
      allowed: ["POST"]
    });
  }

  try {
    // -------------------------------------------------
    // PARSE BODY
    // -------------------------------------------------

    let body = req.body;

    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const url =
      typeof body?.url === "string"
        ? body.url.trim()
        : "";

    // -------------------------------------------------
    // URL EMPTY
    // -------------------------------------------------

    if (!url) {
      return res.status(400).json({
        status: false,
        message: "URL kosong"
      });
    }

    // -------------------------------------------------
    // URL VALIDATION
    // -------------------------------------------------

    try {
      const parsedUrl = new URL(url);

      if (
        parsedUrl.protocol !== "http:" &&
        parsedUrl.protocol !== "https:"
      ) {
        throw new Error("Invalid protocol");
      }
    } catch {
      return res.status(400).json({
        status: false,
        message: "URL tidak valid"
      });
    }

    // -------------------------------------------------
    // REQUEST TO UPSTREAM
    // -------------------------------------------------

    const response = await axios.post(
      API_ENDPOINT,
      {
        url
      },
      {
        headers: HEADERS,

        timeout: 30000,

        maxRedirects: 5,

        // Jangan biarkan Axios langsung throw
        // supaya status upstream bisa kita baca.
        validateStatus: () => true
      }
    );

    const rawData = response.data;

    // -------------------------------------------------
    // UPSTREAM ERROR
    // -------------------------------------------------

    if (
      response.status < 200 ||
      response.status >= 300
    ) {
      let upstreamMessage =
        "Upstream API gagal";

      if (
        rawData &&
        typeof rawData === "object"
      ) {
        upstreamMessage =
          rawData.message ||
          rawData.error ||
          rawData.msg ||
          upstreamMessage;
      }

      if (typeof rawData === "string") {
        upstreamMessage =
          rawData.substring(0, 500);
      }

      return res.status(502).json({
        status: false,
        message: upstreamMessage,
        upstream_status: response.status
      });
    }

    // -------------------------------------------------
    // NORMALIZE RESPONSE
    // -------------------------------------------------

    const result = extractResult(rawData);

    // -------------------------------------------------
    // NO DOWNLOAD LINK
    // -------------------------------------------------

    if (!result.links.length) {
      return res.status(422).json({
        status: false,
        message:
          "Media atau link download tidak ditemukan",
        result
      });
    }

    // -------------------------------------------------
    // SUCCESS
    // -------------------------------------------------

    return res.status(200).json({
      status: true,
      result
    });

  } catch (error) {

    console.error(
      "THERESIA FASTDL ERROR:",
      {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        data: error.response?.data
      }
    );

    // -------------------------------------------------
    // TIMEOUT
    // -------------------------------------------------

    if (
      error.code === "ECONNABORTED" ||
      error.code === "ETIMEDOUT"
    ) {
      return res.status(504).json({
        status: false,
        message: "Upstream API timeout"
      });
    }

    // -------------------------------------------------
    // AXIOS RESPONSE ERROR
    // -------------------------------------------------

    if (error.response) {
      let detail =
        error.response.data;

      if (
        typeof detail === "string"
      ) {
        detail =
          detail.substring(0, 500);
      }

      return res.status(502).json({
        status: false,
        message:
          "Upstream downloader gagal merespons",
        upstream_status:
          error.response.status,
        detail
      });
    }

    // -------------------------------------------------
    // OTHER ERROR
    // -------------------------------------------------

    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message
    });
  }
};