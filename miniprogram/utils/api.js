const app = getApp();

function token() {
  return wx.getStorageSync("brand_access_token") || "";
}

function request(path, options = {}) {
  const needsAuth = options.auth !== false;
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.apiBase}${path}`,
      method: options.method || "GET",
      data: options.data || {},
      header: {
        "Content-Type": "application/json",
        ...(needsAuth && token() ? { Authorization: `Bearer ${token()}` } : {}),
      },
      success(response) {
        const data = response.data || {};
        if (response.statusCode >= 200 && response.statusCode < 300) return resolve(data);
        if (response.statusCode === 401) wx.removeStorageSync("brand_access_token");
        reject(new Error(data.error || "服务暂时不可用，请稍后再试。"));
      },
      fail() {
        reject(new Error("网络连接失败，请稍后再试。"));
      },
    });
  });
}

function setToken(value) {
  wx.setStorageSync("brand_access_token", value);
}

module.exports = { request, setToken, token };
