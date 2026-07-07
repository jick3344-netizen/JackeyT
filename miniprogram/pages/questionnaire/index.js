const questionsByType = require("../../utils/questions");
const { request } = require("../../utils/api");
const app = getApp();

function currentQuestions(type) {
  return app.globalData.content?.questions?.[type] || questionsByType[type] || [];
}

function initialAnswers(type) {
  return currentQuestions(type).reduce((all, question) => {
    all[question.key] = question.type === "triple" ? ["", "", ""] : question.type === "scale" ? 0 : "";
    return all;
  }, {});
}

Page({
  data: { type: "personal", diagnosisId: "", index: 0, questions: [], question: {}, answers: {}, answer: "", saving: false },
  async onLoad() {
    if (app.contentReady) await app.contentReady;
    const saved = wx.getStorageSync("current_diagnosis");
    if (!saved?.id) return wx.reLaunch({ url: "/pages/dashboard/index" });
    const questions = saved.questionSnapshot?.length ? saved.questionSnapshot : currentQuestions(saved.type);
    const answers = { ...initialAnswers(saved.type), ...(saved.answers || {}) };
    this.setData({ type: saved.type, diagnosisId: saved.id, questions, answers }, () => this.showQuestion(0));
  },
  showQuestion(index) {
    const question = this.data.questions[index];
    this.setData({ index, question, answer: this.data.answers[question.key] });
  },
  setAnswer(key, value) {
    const answers = { ...this.data.answers, [key]: value };
    this.setData({ answers, answer: value });
    const saved = wx.getStorageSync("current_diagnosis");
    wx.setStorageSync("current_diagnosis", { ...saved, answers });
  },
  onTextInput(event) { this.setAnswer(this.data.question.key, event.detail.value); },
  onTripleInput(event) {
    const values = [...(this.data.answers[this.data.question.key] || ["", "", ""])];
    values[event.currentTarget.dataset.index] = event.detail.value;
    this.setAnswer(this.data.question.key, values);
  },
  choose(event) { this.setAnswer(this.data.question.key, event.currentTarget.dataset.value); },
  chooseScale(event) { this.setAnswer(this.data.question.key, Number(event.currentTarget.dataset.value)); },
  valid() {
    const question = this.data.question;
    const value = this.data.answers[question.key];
    if (question.type === "triple") return String(value?.[0] || "").trim().length >= 4;
    if (question.type === "scale") return Number(value) > 0;
    if (question.type === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
    if (question.key === "contactMethod") return String(value || "").trim().length >= 5;
    if (question.type === "text") return String(value || "").trim().length >= 2;
    return String(value || "").trim().length >= 4;
  },
  async save(progress) {
    return request(`/api/diagnoses/${this.data.diagnosisId}/answers`, {
      method: "PUT",
      data: { answers: this.data.answers, progress },
    });
  },
  async next() {
    if (!this.valid()) return wx.showToast({ title: "请先完成这一题", icon: "none" });
    this.setData({ saving: true });
    const last = this.data.index === this.data.questions.length - 1;
    try {
      const progress = Math.round(((this.data.index + 1) / this.data.questions.length) * 100);
      await this.save(progress);
      if (!last) {
        const index = this.data.index + 1;
        this.showQuestion(index);
        return;
      }
      await request(`/api/diagnoses/${this.data.diagnosisId}/generate`, { method: "POST" });
      wx.removeStorageSync("current_diagnosis");
      wx.redirectTo({ url: `/pages/loading/index?id=${this.data.diagnosisId}` });
    } catch (error) {
      wx.showToast({ title: error.message, icon: "none" });
    } finally {
      this.setData({ saving: false });
    }
  },
  previous() {
    if (!this.data.index) return;
    const index = this.data.index - 1;
    this.showQuestion(index);
  },
});
