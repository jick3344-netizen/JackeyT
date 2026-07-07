const { request } = require("../../utils/api");

Page({
  data: { id: "", checking: false },
  onLoad(options) { this.setData({ id: options.id || "" }); },
  dashboard() { wx.reLaunch({ url: "/pages/dashboard/index" }); },
  async checkReport() {
    this.setData({ checking: true });
    try {
      const result = await request(`/api/diagnoses/${this.data.id}`);
      if (result.diagnosis.status !== "completed") return wx.showToast({ title: "报告仍在生成，请稍后再试", icon: "none" });
      wx.redirectTo({ url: `/pages/report/index?id=${this.data.id}` });
    } catch (error) {
      wx.showToast({ title: error.message, icon: "none" });
    } finally {
      this.setData({ checking: false });
    }
  },
});
