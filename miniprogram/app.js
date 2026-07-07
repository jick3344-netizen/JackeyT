App({
  globalData: {
    apiBase: "https://laohuang-brand-three-questions.netlify.app",
    content: null,
  },
  onLaunch() {
    this.contentReady = this.loadContent();
  },
  loadContent() {
    return new Promise((resolve) => {
      wx.request({
        url: `${this.globalData.apiBase}/api/content`,
        method: "GET",
        success: (response) => {
          if (response.statusCode >= 200 && response.statusCode < 300) {
            this.globalData.content = response.data?.content || null;
          }
          resolve(this.globalData.content);
        },
        fail: () => resolve(null),
      });
    });
  },
});
