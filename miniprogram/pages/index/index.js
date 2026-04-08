// pages/index/index.js
const app = getApp();

Page({
  data: {
    isLoading: true,
    showPrivacyModal: false,
    webviewUrl: '',
    errorMessage: ''
  },

  onLoad(options) {
    console.log('Index page loaded, options:', options);
    
    // 检查是否已有隐私协议同意记录
    const hasAgreed = wx.getStorageSync('privacy_agreed');
    
    // 获取从URL参数传递的域名（如果有）
    let targetUrl = options.url || '';
    
    // 如果没有传递URL，使用默认的H5地址
    // ⚠️ 请将此地址替换为您部署的H5应用地址
    if (!targetUrl) {
      // 开发环境使用本地地址，生产环境使用您的公网地址
      targetUrl = 'https://your-h5-domain.com'; // ⚠️ 替换为您的实际地址
    }
    
    // 检查URL是否以https开头
    if (!targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }
    
    console.log('Target webview URL:', targetUrl);
    
    this.setData({
      webviewUrl: targetUrl
    });
    
    // 根据隐私协议状态决定是否显示弹窗
    if (!hasAgreed) {
      this.setData({
        showPrivacyModal: true,
        isLoading: false
      });
    } else {
      this.setData({
        showPrivacyModal: false,
        isLoading: false
      });
    }
  },

  onPrivacyAgree() {
    // 保存同意状态
    wx.setStorageSync('privacy_agreed', true);
    this.setData({
      showPrivacyModal: false
    });
  },

  onPrivacyDecline() {
    // 用户不同意，显示提示并阻止使用
    wx.showModal({
      title: '提示',
      content: '您需要同意隐私政策才能使用本小程序。',
      showCancel: false,
      success: () => {
        // 关闭小程序
        wx.navigateBack({
          delta: 1,
          fail: () => {
            // 如果无法返回，则提示用户手动关闭
            wx.showToast({
              title: '请关闭小程序',
              icon: 'none'
            });
          }
        });
      }
    });
  },

  onWebviewLoad(e) {
    console.log('Webview loaded successfully');
    this.setData({
      isLoading: false
    });
  },

  onWebviewError(e) {
    console.error('Webview error:', e);
    this.setData({
      isLoading: false,
      errorMessage: '页面加载失败，请检查网络连接'
    });
    
    wx.showToast({
      title: '页面加载失败',
      icon: 'none'
    });
  },

  onWebviewMessage(e) {
    console.log('Message from webview:', e.detail);
    
    const data = e.detail.data;
    if (!data || !data.length) return;
    
    const message = data[0];
    
    // 处理分享请求
    if (message.action === 'share') {
      this.handleShareRequest(message);
    }
    
    // 处理其他自定义消息
    if (message.action === 'getSystemInfo') {
      this.sendToWebview({
        action: 'systemInfo',
        data: wx.getSystemInfoSync()
      });
    }
  },

  handleShareRequest(message) {
    const shareData = {
      title: message.title || '肿瘤就医决策助手',
      path: message.path || '/pages/index/index',
      imageUrl: message.imageUrl || ''
    };
    
    wx.showShareMenu({
      withShareTicket: true,
      success: () => {
        console.log('Share menu enabled');
      }
    });
  },

  sendToWebview(data) {
    // 通过webview向H5页面发送消息
    const webview = this.selectComponent('#webview');
    if (webview) {
      webview.postMessage(data);
    }
  },

  onShareAppMessage() {
    return {
      title: '肿瘤就医决策助手 - 智能就医决策辅助',
      path: '/pages/index/index',
      imageUrl: '/assets/share-cover.png',
      success: (res) => {
        console.log('Share success:', res);
      },
      fail: (err) => {
        console.error('Share failed:', err);
      }
    };
  },

  onShareTimeline() {
    return {
      title: '肿瘤就医决策助手 - 智能就医决策辅助',
      imageUrl: '/assets/share-cover.png',
      query: 'from=timeline'
    };
  }
});
