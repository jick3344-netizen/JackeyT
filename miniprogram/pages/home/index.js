const { request, setToken, token } = require("../../utils/api");

Page({
  data: { submitting: false },
  onShow() {
    if (token()) wx.reLaunch({ url: "/pages/dashboard/index" });
  },
  async login() {
    this.setData({ submitting: true });
    try {
      const login = await wxLogin();
      if (!login.code) throw new Error("没有获取到微信登录凭证，请稍后再试。");
      const result = await request("/api/miniprogram/auth/wechat", {
        method: "POST",
        auth: false,
        data: { code: login.code },
      });
      setToken(result.accessToken);
      wx.reLaunch({ url: "/pages/dashboard/index" });
    } catch (error) {
      wx.showToast({ title: error.message, icon: "none" });
    } finally {
      this.setData({ submitting: false });
    }
  },
});

function wxLogin() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: resolve,
      fail: () => reject(new Error("微信登录失败，请稍后再试。")),
    });
  });
}
