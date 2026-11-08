# adnaan.site：替换旧博客，复用公共基础设施

适用于本次已确认的服务器：项目目录 `/home/adnaan/project/tidepage/`，网络 `base-service_base-net`，基础容器 `base-nginx`、`base-pg`、`base-redis`。Redis 8.6.3 已启用 `noeviction` 和 AOF。新站开发环境已经连接同一台 `base-pg`，部署沿用其现有数据库，不能新建空库替代。HTTPS 在 CDN 终止，以 HTTP 回源服务器。

配置入口：

- `compose.production.yaml`：单独使用，不与 `compose.yaml` 用多个 `-f` 合并。通过 `extends` 复用 Web / Realtime 的环境变量和存储配置，只启动这两个服务；`tools` 是手动调用的一次性运维容器。没有 Nginx / 数据库 / Redis 服务，没有发布宿主机端口。
- `deploy/production.env.example`：生产环境模板。
- `nginx/tidepage-cdn.conf`：替换旧博客的 Nginx 配置，不能与旧域名 server 重复加载。

以下命令在服务器 Bash 中执行。此文件是部署操作说明，仓库修改不会自动更新服务器。

## 1. 准备代码、凭据和图片

把包含本次部署文件的最新代码上传或拉取到 `/home/adnaan/project/tidepage/`。不要上传开发 `.env.local`、`node_modules` 或 `.next`。先保留旧服务运行。

```bash
cd /home/adnaan/project/tidepage
test -f .env || cp deploy/production.env.example .env
chmod 600 .env
nano .env
```

填写已经有数据的 PostgreSQL 库名与账号，地址使用 `base-pg:5432`；Redis 地址使用 `base-redis:6379`。URL 中用户名与密码分别做百分号编码，不要编码整个 URL。环境变量文件中用单引号包住含凭据的值。模板中的 `TIDEPAGE_DOMAIN=adnaan.site` 也要保留：Compose 的 extends 会校验原文件的变量，虽然它不会启动原文件的 Nginx。使用 `openssl rand -hex 32` 生成私密 `REALTIME_AUTHOR_TOKEN`，Web 与网关共用；如果已有桌面助手，更新它的令牌与地址。

至少填写一种生产 OAuth 配置。Gitee 回调为 `https://adnaan.site/api/v1/auth/gitee/callback`。已有站主绑定保存在同一个数据库，不需重新初始化；仅当尚未绑定时执行第 3 步的 `admin:setup`。

把当前新站实际使用的 `UPLOAD_DIR` 中的文件同步到服务器 `storage/uploads/`，保留哈希文件名，不能使用旧博客的图片目录代替。Docker 镜像与 Git 都不包含这些文件。例如从本地 PowerShell 上传，先在服务器 `mkdir -p /home/adnaan/project/tidepage/storage/uploads`，再在本地执行（替换 SSH 地址，按实际上传目录调整源路径）：

```powershell
scp -r E:/26Project/adnaan-blog/storage/uploads/. root@YOUR_SERVER:/home/adnaan/project/tidepage/storage/uploads/
```

本地与生产现在共用业务数据库；上线后开发环境的编辑、测试写入也会修改线上内容。切换期间暂停内容写入，避免备份数据库与图片不一致。缓存与实时状态用独立 `CACHE_NAMESPACE=adnaan:prod:v1` 隔离。

## 2. 备份现有数据库和入口配置

以下变量留在当前 Bash 会话供后续切换、回滚使用。备份存到站点目录之外，避免被部署文件覆盖。

```bash
umask 077
TIDEPAGE_BACKUP="/home/adnaan/project/tidepage-backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$TIDEPAGE_BACKUP"
printf '备份目录：%s\n' "$TIDEPAGE_BACKUP"

read -r -p '现有新站 PostgreSQL 数据库名：' TIDEPAGE_DB
test -n "$TIDEPAGE_DB"
docker exec base-pg sh -c 'exec pg_dump -U "${POSTGRES_USER:-postgres}" -d "$1" -Fc' sh "$TIDEPAGE_DB" > "$TIDEPAGE_BACKUP/database.dump"
# 上一条失败则停止；不要继续迁移。以下检查应成功且目录包含业务表。
docker exec -i base-pg pg_restore --list < "$TIDEPAGE_BACKUP/database.dump" > "$TIDEPAGE_BACKUP/database.contents.txt"

tar -C /home/adnaan/project/base-service/nginx -czf "$TIDEPAGE_BACKUP/nginx-conf.tar.gz" conf
tar -C /home/adnaan/project/tidepage -czf "$TIDEPAGE_BACKUP/storage.tar.gz" storage
```

`pg_dump` 使用现有 PostgreSQL 容器初始化时的管理用户；若该实例要求本地密码认证，使用已有凭据配置完成备份，不要把密码贴到聊天。检查每条命令退出状态，失败时先解决备份问题。旧 MySQL 数据与旧博客目录继续保留，不执行 `down -v` 或清理镜像/卷。

## 3. 构建、迁移、启动

确认目标网络存在并检查配置。使用 `config -q`，不要把包含完整凭据的展开配置发到聊天。

```bash
cd /home/adnaan/project/tidepage
docker network inspect base-service_base-net --format '{{.Name}}'
docker compose -f compose.production.yaml --profile tools config -q
docker compose -f compose.production.yaml --profile tools build web realtime tools
```

构建失败时旧站仍正常运行。构建通过、备份确认后再执行迁移；下面每条命令都应成功才进入下一条：

```bash
docker compose -f compose.production.yaml run --rm tools pnpm db:migrate
docker compose -f compose.production.yaml run --rm tools pnpm db:check

# 仅未绑定站主时执行，替换为自己的用户名：
# docker compose -f compose.production.yaml run --rm tools pnpm admin:setup --gitee YOUR_USERNAME

docker compose -f compose.production.yaml up -d --wait --wait-timeout 180 web realtime
docker compose -f compose.production.yaml ps
```

若启动检查失败，先查 `docker compose -f compose.production.yaml logs --tail=100 web realtime`，不要切换 Nginx。Web 就绪端点在仅 Redis 异常时可能仍返回 200 / degraded，因此还要读返回 JSON，确认 PostgreSQL 与 Web Redis 均为 ready：

```bash
docker exec base-nginx wget -qO- http://adnaan-web:3000/api/v1/health/ready
docker exec base-nginx wget -qO- http://adnaan-realtime:3101/healthz
```

Web 和 Realtime 分别通过 `adnaan-web`、`adnaan-realtime` 网络别名被访问，容器内端口 3000 / 3101 不发布到主机，不与 devlog 的主机 3000 端口冲突。数据库迁移脚本位于 `tools` 镜像，不在精简的 Web 镜像中执行。

如果旧版本 `db:migrate` 成功、`db:check` 却持续提示一项未完成，可能是 Windows CRLF 与 Linux LF 的文件哈希差异。新版 `db:check` 会明确识别纯换行差异，不修改数据库迁移记录；SQL 实际变更和缺失记录仍会失败并列出文件名。更新代码后需 `docker compose -f compose.production.yaml build tools` 再运行检查，仅更新宿主机脚本不会改变镜像中的脚本。

## 4. 配置 CDN，再替换旧博客 Nginx 文件

CDN 需要保留原始 Host 回源 HTTP 80；对外强制 HTTPS、启用 WebSocket，空闲超时至少 120 秒。`www.adnaan.site` 会跳转到 `https://adnaan.site`，两域名的 CDN 证书都需有效。源站主域名不能再强制跳转 HTTPS，否则 HTTPS → HTTP 回源会循环重定向。

禁用 HTML、API、登录/后台、RSC 请求与 `/socket.io/` 的强制缓存，尊重应用的 Cache-Control / Vary。`/_next/static/` 可以长期缓存；不要沿用旧站按所有 `.js/.css/.png` 扩展名强制一年缓存的全局规则。切换后清理旧站 CDN 缓存。

新 Nginx 配置把 `X-Forwarded-Proto` 固定为外部 HTTPS，覆盖客户端提供的真实 IP 请求头，并关闭代理缓存和响应缓冲。容器 DNS 用 Docker resolver 定期刷新。当前 `$remote_addr` 可能是 CDN 节点地址，IP 限流会按节点聚合；要获得真实访客 IP，需根据实际 CDN 的官方来源网段设置 `set_real_ip_from` 和相应 `real_ip_header`，不能直接信任任意客户端 X-Forwarded-For。源站 HTTP 入口应只允许可信 CDN / 管理来源访问。

先找到旧博客文件的准确名称：

```bash
grep -lE 'server_name.*adnaan\.site' /home/adnaan/project/base-service/nginx/conf/*.conf
```

检查结果对应文件。**下列整文件替换仅适用于该文件只服务旧博客的情况**；若包含其他站点，保留其他站点，只替换博客 server。旧文件的 `$connection_upgrade` map 如果还被其他站点引用，要保留在一个单独加载的公共配置中；新文件使用独立变量名，不依赖旧 map。不要直接创建第二个同域名 `.conf` 文件。

输入已核实的旧博客配置完整路径，保存备份，再原位替换：

```bash
read -r -p '旧博客 .conf 的完整路径：' TIDEPAGE_OLD_CONF
test -f "$TIDEPAGE_OLD_CONF"
cp -a "$TIDEPAGE_OLD_CONF" "$TIDEPAGE_BACKUP/blog-original.conf"
printf '%s\n' "$TIDEPAGE_OLD_CONF" > "$TIDEPAGE_BACKUP/blog-config-path.txt"
cp /home/adnaan/project/tidepage/nginx/tidepage-cdn.conf "$TIDEPAGE_OLD_CONF"

if docker exec base-nginx nginx -t; then
    docker exec base-nginx nginx -s reload
else
    cp "$TIDEPAGE_BACKUP/blog-original.conf" "$TIDEPAGE_OLD_CONF"
    printf '检查失败，已恢复配置文件，尚未 reload。\n'
fi
```

以上失败时不要继续停旧服务。新的源站配置在 HTTP 80 接收流量，但对应用声明 HTTPS；验证公开入口必须使用 CDN 的 HTTPS 域名。

```bash
curl -fsS https://adnaan.site/api/v1/health/ready
curl -I https://www.adnaan.site/
```

浏览器验证首页、文章图片、OAuth 登录、后台上传、音乐播放、实时连接。WebSocket 在开发者工具 Network → WS 中应握手 101；普通 `curl /socket.io/` 不是 WebSocket 健康检查，不能以它返回普通 200 为成功标准。

## 5. 停止旧博客与回滚

确认公开入口和关键交互全部正常后再执行：

```bash
docker stop blog-backend blog-frontend-builder
```

保留旧容器、旧镜像与目录，不停 `base-nginx` / `base-pg` / `base-redis` / `base-mysql` 或其他应用。原来的部署任务若会自动拉起旧服务，也要同步停用该任务。需要开放搜索索引时设置 `.env` 的 `INDEXING_ENABLED=true`，再执行 `docker compose -f compose.production.yaml up -d --wait web`。

回滚旧站（替换为上面实际备份目录；先启动旧容器再恢复入口）：

```bash
TIDEPAGE_BACKUP=/home/adnaan/project/tidepage-backups/YOUR_TIMESTAMP
TIDEPAGE_OLD_CONF=$(cat "$TIDEPAGE_BACKUP/blog-config-path.txt")
docker start blog-backend blog-frontend-builder
# 确认旧后端实际恢复服务；它在本次切换前已有 unhealthy 状态，不能只看容器 Up。
cp "$TIDEPAGE_BACKUP/blog-original.conf" "$TIDEPAGE_OLD_CONF"
docker exec base-nginx nginx -t && docker exec base-nginx nginx -s reload
# 确认旧站恢复后，再停止新应用：
docker compose -f /home/adnaan/project/tidepage/compose.production.yaml stop web realtime
```

回滚入口后还要清理 CDN 缓存。旧站使用其原来的 MySQL，切回入口不意味着 PostgreSQL 表结构回退；不要自动覆盖现有 PostgreSQL。若确实要恢复数据库，应先暂停所有连接该库的写入并另存当前状态，再在确认目标与恢复范围后从备份恢复。

后续更新仍是先备份、构建、迁移/检查、再 `up -d --wait web realtime`。容器替换期间可能短暂中断，这份单实例配置不承诺零停机。
