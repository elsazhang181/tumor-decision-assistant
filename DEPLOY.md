# 肿瘤就医决策助手 - Vercel部署指南

## 快速部署

### 1. 准备Coze API Token

1. 访问 [https://www.coze.cn](https://www.coze.cn)
2. 登录后进入个人设置
3. 获取 API Token

### 2. 部署到Vercel

**方式A：使用Vercel CLI**

```bash
# 安装Vercel CLI
npm install -g vercel

# 登录
vercel login

# 部署
cd /workspace/projects
vercel
```

**方式B：使用GitHub**

1. 将代码推送到GitHub仓库
2. 在Vercel后台导入项目
3. 配置环境变量

### 3. 配置环境变量

在Vercel项目设置中添加以下环境变量：

| 变量名 | 值 |
|--------|-----|
| `COZE_API_TOKEN` | 您的Coze API Token |
| `COZE_BOT_ID` | 1118647974625609 (可选) |

### 4. 完成部署

部署成功后，Vercel会提供访问URL，例如：`https://your-project.vercel.app`

## 本地开发

```bash
# 复制环境变量模板
cp .env.example .env.local

# 编辑 .env.local 填入您的API Token

# 启动开发服务器
pnpm dev
```

## 技术说明

- **框架**: Next.js 16 (App Router)
- **AI能力**: 通过Coze Bot API实现
- **部署平台**: Vercel (Edge Runtime)
- **环境变量**: 所有敏感信息通过环境变量配置

## 注意事项

1. 确保Coze Bot已发布
2. API Token请妥善保管，不要提交到代码仓库
3. Vercel免费额度足够个人/演示使用
