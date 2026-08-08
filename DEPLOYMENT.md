# 部署指南

## 环境变量配置（两个平台都需要）

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `COZE_API_TOKEN` | `pat_XGRZfUI7AZvh8ulwyMrf3p537rx4eny8gRIhuw2VdGpm74NiJNVqpdwWANJWIliK` | Coze API 令牌 |
| `COZE_BOT_ID` | `7633265670037323818` | Bot ID |
| `COZE_API_BASE_URL` | `https://api.coze.cn` | Coze API 地址（中国版） |

---

## 方案一：Railway 部署

### 步骤

1. **注册 Railway**
   - 访问 [railway.app](https://railway.app)
   - 用 GitHub 账号登录

2. **新建项目**
   - 点击 "New Project"
   - 选择 "Deploy from GitHub repo"
   - 选择 `tumor-decision-assistant` 仓库

3. **配置环境变量**
   - 点击项目 → "Variables" 标签
   - 添加上述三个环境变量

4. **部署**
   - Railway 会自动检测 Next.js 项目并部署
   - 等待 2-3 分钟完成

5. **获取访问地址**
   - 部署完成后会生成域名（如 `https://xxx.up.railway.app`）
   - 点击 "Domains" 可以查看或添加自定义域名

### 优势
- ✅ 自动检测 Next.js
- ✅ 支持亚洲区域（新加坡）
- ✅ 免费额度：$5/月
- ✅ 自动 HTTPS

---

## 方案二：腾讯云部署

### 方式 A：云开发 CloudBase（推荐，最简单）

1. **注册腾讯云**
   - 访问 [cloud.tencent.com](https://cloud.tencent.com)
   - 开通"云开发 CloudBase"

2. **创建环境**
   - 进入 CloudBase 控制台
   - 创建新环境（选择"按量计费"）

3. **部署静态网站**
   - 进入环境 → "静态网站"
   - 点击"上传部署"
   - 上传 `.next` 目录内容（需先本地构建）

4. **配置云函数（用于 API）**
   - 创建云函数 `api-chat`
   - 运行时选择 "Nodejs16"
   - 上传 `src/app/api/chat` 目录代码
   - 配置环境变量

### 方式 B：轻量应用服务器（更灵活）

1. **购买服务器**
   - 选择"轻量应用服务器"
   - 系统：Ubuntu 22.04
   - 配置：2核4G（足够运行 Next.js）

2. **安装环境**
   ```bash
   # 安装 Node.js 20
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # 安装 pnpm
   npm install -g pnpm
   ```

3. **部署代码**
   ```bash
   # 克隆代码
   git clone https://github.com/elsazhang181/tumor-decision-assistant.git
   cd tumor-decision-assistant
   
   # 安装依赖
   pnpm install
   
   # 创建环境变量文件
   cat > .env.local << EOF
   COZE_API_TOKEN=pat_XGRZfUI7AZvh8ulwyMrf3p537rx4eny8gRIhuw2VdGpm74NiJNVqpdwWANJWIliK
   COZE_BOT_ID=7633265670037323818
   COZE_API_BASE_URL=https://api.coze.cn
   EOF
   
   # 构建
   pnpm build
   
   # 启动（使用 PM2 保持运行）
   npm install -g pm2
   pm2 start npm --name "health-assistant" -- start
   pm2 save
   pm2 startup
   ```

4. **配置域名和 HTTPS**
   - 在腾讯云 DNS 解析中添加域名
   - 使用 Nginx 反向代理
   - 配置 Let's Encrypt SSL 证书

### 方式 C：Docker 部署（通用）

1. **购买服务器**（同方式 B）

2. **安装 Docker**
   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker $USER
   ```

3. **构建并运行**
   ```bash
   # 克隆代码
   git clone https://github.com/elsazhang181/tumor-decision-assistant.git
   cd tumor-decision-assistant
   
   # 构建镜像
   docker build -t health-assistant .
   
   # 运行容器
   docker run -d \
     --name health-assistant \
     -p 3000:3000 \
     -e COZE_API_TOKEN=pat_XGRZfUI7AZvh8ulwyMrf3p537rx4eny8gRIhuw2VdGpm74NiJNVqpdwWANJWIliK \
     -e COZE_BOT_ID=7633265670037323818 \
     -e COZE_API_BASE_URL=https://api.coze.cn \
     health-assistant
   ```

4. **配置 Nginx 反向代理**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

---

## 推荐选择

| 场景 | 推荐方案 | 原因 |
|------|---------|------|
| 快速上线、测试 | Railway | 5 分钟部署，免费额度够用 |
| 国内用户为主 | 腾讯云轻量服务器 | 国内访问快，稳定 |
| 长期运营、自定义 | 腾讯云 Docker | 完全控制，可扩展 |
| 不想运维 | 腾讯云 CloudBase | 全托管，无需管服务器 |

---

## 部署后验证

1. 访问部署的网址
2. 发送测试消息："你好"
3. 确认收到 AI 回复
4. 测试文件上传功能（如有）

## 常见问题

### Q: 部署后仍然显示"服务暂时不可用"
A: 检查环境变量是否正确配置，特别是 `COZE_API_BASE_URL` 必须是 `https://api.coze.cn`

### Q: 国内访问慢
A: 使用腾讯云国内服务器，或配置 CDN 加速

### Q: 如何更新代码
A: 推送代码到 GitHub main 分支，Railway 会自动重新部署；腾讯云需手动拉取最新代码并重新构建
