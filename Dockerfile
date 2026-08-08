# 使用 Node.js 20 作为基础镜像
FROM node:20-alpine

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制项目文件
COPY . .

# 构建项目
RUN pnpm build

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV PORT=3000

# 启动服务
CMD ["pnpm", "start"]
