# 肿瘤就医决策助手 - 微信小程序

基于Webview技术，将H5应用封装为微信小程序。

## 项目结构

```
miniprogram/
├── app.js          # 小程序入口
├── app.json        # 小程序配置
├── app.wxss        # 全局样式
├── sitemap.json    # SEO配置
├── pages/
│   ├── index/      # 主页面（Webview）
│   └── agreement/  # 隐私协议页面
└── assets/         # 静态资源
    └── share-cover.png  # 分享封面图
```

## 配置说明

### 1. 修改Webview地址

打开 `pages/index/index.js`，找到以下代码，替换为您实际的H5地址：

```javascript
// ⚠️ 请将此地址替换为您部署的H5应用地址
targetUrl = 'https://your-h5-domain.com';
```

### 2. 添加业务域名

在微信公众平台后台 → 开发 → 开发设置 → 业务域名 中添加您的H5域名。

### 3. 上传校验文件

将微信提供的校验文件（如 `MT4xTjRj.txt`）放入H5项目的 `public/` 目录。

## 使用说明

1. 使用微信开发者工具打开本项目
2. 在 `app.js` 中确认AppID（已配置为测试号）
3. 运行项目测试
4. 发布前修改为正式AppID

## 功能特性

- ✅ Webview加载H5页面
- ✅ 隐私协议弹窗
- ✅ 分享功能
- ✅ 加载状态展示
- ✅ 错误处理

## 注意事项

- ⚠️ H5地址必须为HTTPS
- ⚠️ 必须在微信后台配置业务域名
- ⚠️ 医疗类小程序需遵守相关规定
