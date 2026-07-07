const { request } = require("../../utils/api");

Page({
  data: { creating: false },
  async select(event) {
    const type = event.currentTarget.dataset.type;
    this.setData({ creating: true });
    try {
      const result = await request("/api/diagnoses", { method: "POST", data: { type } });
      wx.setStorageSync("current_diagnosis", {
        id: result.diagnosis.id,
        type,
        answers: {},
        questionSnapshot: result.diagnosis.questionSnapshot || [],
      });
      wx.navigateTo({ url: "/pages/questionnaire/index" });
    } catch (error) {
      wx.showToast({ title: error.message, icon: "none" });
    } finally {
      this.setData({ creating: false });
    }
  },
});
