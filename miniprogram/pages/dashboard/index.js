const { request } = require("../../utils/api");

Page({
  data: { user: {}, diagnoses: [], loading: true },
  onShow() { this.load(); },
  async load() {
    this.setData({ loading: true });
    try {
      const result = await request("/api/dashboard");
      this.setData({ user: result.user, diagnoses: result.diagnoses || [] });
    } catch (error) {
      wx.showToast({ title: error.message, icon: "none" });
      if (/请先登录|登录/.test(error.message)) wx.reLaunch({ url: "/pages/home/index" });
    } finally {
      this.setData({ loading: false });
    }
  },
  create() { wx.navigateTo({ url: "/pages/type-select/index" }); },
  openReport(event) { wx.navigateTo({ url: `/pages/report/index?id=${event.currentTarget.dataset.id}` }); },
});
