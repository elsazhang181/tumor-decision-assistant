# 健康就医决策助手

基于 Next.js 16 + React 19 + TypeScript 5 构建的 AI 就医决策辅助应用。

## 功能特性

- 🤖 AI 智能问答（接入 Coze Bot API）
- 📋 多任务窗口架构（即时问答/患者随访/多患者管理）
-  46 家医院挂号指南
- 📱 响应式设计，支持移动端

## 技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI**: shadcn/ui + Tailwind CSS 4
- **API**: Coze Bot API v3

## 快速开始

### 开发环境

```bash
# 安装依赖
pnpm install

# 复制环境变量配置
cp .env.example .env.local

# 编辑 .env.local 填入你的 Coze API Token
# COZE_API_TOKEN=pat_XXX
# COZE_BOT_ID=7633265670037323818
# COZE_API_BASE_URL=https://api.coze.cn

# 启动开发服务器
pnpm dev
```

访问 http://localhost:5000

### 生产构建

```bash
pnpm build
pnpm start
```

## Vercel 部署

### 方式一：通过 Vercel Dashboard

1. 访问 [vercel.com](https://vercel.com)
2. 点击 "New Project"
3. 导入你的 Git 仓库
4. 配置环境变量：
   - `COZE_API_TOKEN` - 你的 Coze API Token
   - `COZE_BOT_ID` - Bot ID（默认：7633265670037323818）
   - `COZE_API_BASE_URL` - API 地址（默认：https://api.coze.cn）
5. 点击 "Deploy"

### 方式二：通过 Vercel CLI

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel

# 生产部署
vercel --prod
```

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `COZE_API_TOKEN` | Coze API 访问令牌 | 必填 |
| `COZE_BOT_ID` | Bot ID | 7633265670037323818 |
| `COZE_API_BASE_URL` | API 基础地址 | https://api.coze.cn |

## 项目结构

```
├── public/                 # 静态资源
├── scripts/                # 构建脚本
├── src/
│   ├── app/                # 页面路由
│   │   ├── api/chat/       # API 路由
│   │   └── page.tsx        # 主页面
│   ├── components/ui/      # shadcn/ui 组件
│   ├── hooks/              # 自定义 Hooks
│   └── lib/                # 工具库
├── .env.example            # 环境变量示例
├── next.config.ts          # Next.js 配置
├── package.json            # 依赖管理
├── tsconfig.json           # TypeScript 配置
└── vercel.json             # Vercel 部署配置
```

## 注意事项

1. **API Token 安全**：不要将 `.env.local` 提交到 Git
2. **Bot 发布**：确保 Bot 在 Coze 平台已通过审核
3. **网络访问**：部署环境需要能访问 `api.coze.cn`

## License

Private
