# 临时便签 (temp-note) - Cloudflare Pages + D1 + OAuth2 云同步版

专为临时文本记录设计的极简便签网页软件。

- **未登录可用**：数据自动保存在浏览器本地（`localStorage`），无需注册即可完全正常使用；
- **登录跨设备同步**：通过接入「一方工具箱统一登录（OAuth2）」，便签自动加密同步至 Cloudflare D1 数据库，实现电脑、手机等多设备无缝共享；
- **核心导出**：支持随时一键导出为本地 `.txt` 文本文件（单篇导出 / 全部打包备份）；
- **全平台自适应**：深度适配 PC 电脑桌面端与手机 H5 移动端。

---

## 目录结构

```text
├── index.html                  # 响应式前端页面 (PC & 手机 H5 自适应)
├── schema.sql                  # Cloudflare D1 数据库建表脚本
├── wrangler.toml               # Wrangler 部署配置文件
└── functions/                  # Cloudflare Pages Functions (无服务器后端)
    └── api/
        ├── _utils.js           # Session Cookie 签名验证与工具函数
        ├── sync.js             # 便签云端同步与拉取 API (/api/sync)
        └── auth/
            ├── login.js        # OAuth2 授权跳转入口 (/api/auth/login)
            ├── callback.js     # OAuth2 授权回跳处理 (/api/auth/callback)
            ├── me.js           # 查询当前用户信息 (/api/auth/me)
            └── logout.js       # 退出登录清空 Cookie (/api/auth/logout)
```

---

## 部署与配置指南

### 第一步：在一方工具箱创建 OAuth2 客户端

1. 打开 [https://tool.fologde.com](https://tool.fologde.com)；
2. 进入管理后台：**系统 → OAuth 应用 → 新建应用**；
3. 填写子站应用名称，例如 `temp-note`；
4. 配置**回调地址白名单**（精确匹配）：
   - 如果你的 Cloudflare Pages 域名是 `https://temp-note.pages.dev`：
     ```text
     https://temp-note.pages.dev/api/auth/callback
     ```
   - 如有本地调试需求，可增加一行：`http://localhost:8788/api/auth/callback`；
5. 保存后获取应用生成的：
   - `client_id` (如 `tc_xxxx`)
   - `client_secret` (如 `tcs_xxxx`，请妥善保存)

---

### 第二步：创建 Cloudflare D1 数据库

在 Cloudflare 控制台或终端中执行：

```bash
# 使用 wrangler 创建 D1 数据库
npx wrangler d1 create temp-note-db
```

创建后会输出类似如下信息：
```toml
[[d1_databases]]
binding = "DB"
database_name = "temp-note-db"
database_id = "xxxxxx-xxxx-xxxx-xxxx-xxxxxxxx"
```

初始化数据表结构：
```bash
# 执行建表 SQL
npx wrangler d1 execute temp-note-db --file=./schema.sql
```

---

### 第三步：部署到 Cloudflare Pages

你可以通过 **Git 仓库连接部署** 或 **Wrangler CLI 直接部署**：

#### 方式 A：通过 GitHub / GitLab 自动构建
1. 将当前项目推送到你的 GitHub 仓库；
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)，进入 **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**；
3. 选择刚才推送的仓库，构建设置如下：
   - **Framework preset**：`None`
   - **Build command**：留空
   - **Build output directory**：`/`（或者留空默认当前根目录）
4. 点击 **Save and Deploy** 完成初次部署。

#### 方式 B：通过 Wrangler 命令行部署
在项目根目录直接运行：
```bash
npx wrangler pages deploy . --project-name=temp-note
```

---

### 第四步：在 Cloudflare Pages 后台配置环境变量与 D1 绑定

部署完成后，进入 Cloudflare Pages 项目的 **Settings（设置）**：

1. **绑定 D1 数据库**：
   - 进入 **Settings** -> **Functions** -> **D1 database bindings**；
   - 点击 **Add binding**：
     - **Variable name（变量名称）**：`DB`（必须大写）
     - **D1 database**：选择刚才创建的 `temp-note-db`；
2. **设置环境变量与机密 (Environment Variables)**：
   - 进入 **Settings** -> **Environment variables**，添加以下环境变量：
     - `OAUTH_CLIENT_ID`：第一步申请的 `client_id`
     - `OAUTH_CLIENT_SECRET`：第一步申请的 `client_secret`（建议设为 Encrypted 机密）
     - `JWT_SECRET`：任意自定义的一串随机安全密钥（用于签名 Session Cookie）
3. 重新部署一次（或点 **Retry deployment**）使环境变量生效。

---

## 运行体验

- **未登录使用**：直接在输入框打字、新增多标签、重命名、导出 TXT，浏览器关闭后再打开文字仍在；
- **点击「登录」**：自动跳转至一方工具箱授权页面；授权同意后无缝跳回便签页；
- **多端同步**：登录后，便签自动同步至 D1 数据库；手机浏览器扫码或登录相同账号，即可实时拉取最新的便签内容！
