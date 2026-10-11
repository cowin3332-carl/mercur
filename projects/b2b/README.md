# Mercur × Medusa B2B

一个独立运行的 B2B 项目：Mercur 多供应商核心 + Medusa 官方 B2B Starter 的企业账户、询报价、审批模块 + Next.js 前台。

本目录是一个完整 pnpm workspace。仓库原有的 Mercur 源码保留，不参与本项目的安装和启动。

## 版本

| 依赖 | 固定版本 |
| --- | --- |
| Mercur Core / Types | 2.3.7 |
| Medusa | 2.21.2 |
| Next.js | 15.5.21 |
| React | 19.0.5 |
| Node.js | 建议 24，至少 22.22 |
| pnpm | 11.25.0 |
| PostgreSQL | 16 |

## 第一次运行

需要 Node.js、pnpm、Docker Compose。所有命令在本目录执行：

```bash
pnpm install --frozen-lockfile
pnpm setup
docker compose up -d --wait
pnpm db:migrate
pnpm seed
node scripts/sync-key.mjs
pnpm dev
```

- 客户前台：http://localhost:8000/gb
- 商品目录：http://localhost:8000/gb/store
- 企业账户：http://localhost:8000/gb/account
- Medusa 管理后台：http://localhost:9000/app
- API：http://localhost:9000

管理账户邮箱默认 `admin@example.test`，随机密码保存在 `apps/backend/.env` 的 `DEMO_ADMIN_PASSWORD`，不进入 Git。`pnpm setup` 不覆盖已有配置。

前台注册时创建企业，并由服务端将注册人绑定为该企业管理员。已有客户不能再自建另一家企业。

演示数据使用欧洲区域和欧元，默认国家英国，用于验证上游流程。中国供应商、人民币及中国化字段属于后续业务配置；本项目没有假设 ERPNext 已经接入。

## 验证

```bash
pnpm typecheck
node scripts/verify.mjs --build
```

验证脚本临时启动前后端，检查真实 API 和 SSR 页面，结束时关闭它启动的服务。需要数据库已初始化，并且 8000、9000 端口空闲。

包括商品及供应商报价、注册登录、企业管理员绑定、单件与批量加购、错误 offer 拒绝、询价消息、平台发送报价、客户接受报价和普通订单转换。还验证其他客户不能访问企业或操作报价。运行结果和服务日志在 `.local/`。

GitHub Actions 工作流 `.github/workflows/b2b-integration.yml` 使用真实 PostgreSQL 16，执行类型检查、迁移、种子数据、联调与前台生产构建。

## 整合边界

`apps/backend` 是唯一业务 API：`withMercur` 加载 Mercur 插件，同时加载 B2B Starter 的 Company、Quote、Approval 模块、API、工作流和管理后台扩展。

`apps/storefront` 是唯一客户网站，直接接这个 API。商品取自 Mercur，无独立商品展示服务，也无独立 NestJS 服务。

Mercur 2.3 的加购要求 `offer_id`。前台适配层按当前区域的计算报价选最低价 offer；批量加购后端检查 offer 与 variant 的对应关系。V1 没有供应商选择器，客户可在询报价阶段与平台协商。

V1 报价由平台管理员处理。多供应商分别回复、报价接受后自动拆成供应商订单/结算、ERPNext 同步、支付网关和正式出口履约尚未接通。报价转出的订单是平台采购服务订单，不代表供应商结算已完成。

种子数据中的商品关闭库存控制，仅用于演示；正式商品需要配置库存、运费、税和支付。开发时使用 Medusa 内存缓存/队列；生产部署需配置 Redis 和持久文件存储。

pnpm `packageExtensions` 补上 Mercur 2.3.7 发布包未声明的运行时依赖。React 类型统一到 19，避免工作区出现两套类型。上游漏列的 Accordion、date-fns 等依赖已补齐；前台构建不忽略 TypeScript 错误。

## 继续开发

1. 在当前前台补供应商选择与 B2B 页面设计。
2. 为报价接受流程增加 Mercur 的供应商订单/订单组连接，验证拆单与结算。
3. 将平台采购订单同步到 ERPNext；ERPNext 保持采购、履约和财务权威。
4. 增加中国企业字段、检测项目、打样、验货和出口进度。

不要同时启动仓库旧的 `apps/api` 和这个后端来维护两份业务数据。
