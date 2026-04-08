App({
  onLaunch() {
    console.log('App launched, running in miniprogram');
    wx.hideHomeButton({
      success: () => {
        console.log('Home button hidden');
      }
    });
  },
  onShow() {},
  onError(err) {
    console.error('App error:', err);
  },
  globalData: {
    userInfo: null,
    webviewUrl: ''
  }
})
