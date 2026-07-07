const { request } = require("../../utils/api");

Page({
  data: { id: "", diagnosis: null, report: null, loading: true },
  onLoad(options) {
    this.setData({ id: options.id || "" });
    this.load();
  },
  async load() {
    if (!this.data.id) return;
    this.setData({ loading: true });
    try {
      const result = await request(`/api/diagnoses/${this.data.id}`);
      const diagnosis = result.diagnosis;
      if (diagnosis.status !== "completed") {
        wx.redirectTo({ url: `/pages/loading/index?id=${diagnosis.id}` });
        return;
      }
      this.setData({ diagnosis, report: diagnosis.report });
    } catch (error) {
      wx.showToast({ title: error.message, icon: "none" });
    } finally {
      this.setData({ loading: false });
    }
  },
  dashboard() { wx.reLaunch({ url: "/pages/dashboard/index" }); },
});
