# 雾港档案 3.0 生产发布记录

发布完成时间：2026-09-06 16:48:55（Asia/Shanghai）。

## 发布结果

[PR #10](https://github.com/luomo66ccff/fog-harbor-archive/pull/10) 已合并，正式入口 [fog-harbor-archive.luomo.moe](https://fog-harbor-archive.luomo.moe) 已从 2.2.0 升级到 3.0.0。

合并提交为 `41ab13d9744ee458ff3a8f9c1d279d5f3211baca`。发布镜像取自 `74c37971a055acb0a955eab386fcd7f7b90cce01`；后者仅在合并结果上增加手动触发的 Linux 镜像构建与验收流程。本文及发布证据属于发布后的记录，不改变应用代码。

应用运行于硅谷服务器的 Linux amd64 容器，使用 Node.js 24.20.0、Next.js 16.3.4 和非 root 用户。发布采用独立版本目录、不可变镜像标签和 Compose 覆盖文件。原 Cloudflare Tunnel 容器保持运行。

## 验收结果

| 项目 | 结果 |
| --- | --- |
| 发布提交的 GitHub CI | 通过：规范、类型、构建、生产资源、46 项单测、依赖审计与 20 项浏览器测试 |
| Linux 发布镜像 | 构建成功；非 root、Node 24、HTML / JavaScript / CSS / WebP 均通过 |
| 上传完整性 | 本地与服务器的归档校验通过，镜像配置与 OCI 清单对应关系核对通过 |
| 服务器备用端口 | 3.0.0 实际容器页面与静态资源均返回 200 |
| 正式域名 | 20 项浏览器测试全部通过，0 失败、0 跳过、0 重试后通过；耗时 53.7 秒 |
| 玩法与存档 | 桌面和 390×844 触控流程、四项对质、三个结局、草稿续存、旧档迁移与备份恢复通过 |
| 线上截图 | 桌面和手机截图来自正式域名，无页面脚本错误或横向溢出 |
| 发布后运行 | healthy，重启计数 0，未发生 OOM；16:51:48 再次确认页面与资源正常 |

- [发布提交的 CI](https://github.com/luomo66ccff/fog-harbor-archive/actions/runs/34022471764)
- [Linux 镜像构建与验收](https://github.com/luomo66ccff/fog-harbor-archive/actions/runs/34022477196)
- [桌面截图](../screenshots/confrontation-desktop-t004.webp) · [手机截图](../screenshots/confrontation-mobile-t004.webp)
- [发布活动清单](deployment-t001.manifest.json)：制品哈希、镜像标识、服务状态、回滚快照和线上测试摘要。

浏览器验收使用 Edge Chromium 的桌面与触控模拟环境；没有将模拟测试表述为真实手机硬件测试。

## 版本与回滚

当前版本目录：

`/home/luomo/apps/fog-harbor-archive/releases/v3.0.0-74c3797-t001`

回滚目录：

`/home/luomo/apps/fog-harbor-archive/backups/deploy-t001`

已保留 2.2.0 镜像归档、原发布目录、Compose 配置及服务器本地环境文件。环境文件未进入仓库或发布报告。旧镜像在独立容器中启动，并通过首页、脚本、样式和图片检查；本次没有把线上服务切回旧版。

服务器已保存回滚脚本。需要恢复旧版时执行：

```sh
ssh sv 'bash /home/luomo/apps/fog-harbor-archive/backups/deploy-t001/rollback.sh'
```

脚本会使用已保留的旧镜像，恢复应用，等待健康检查，再确认实际 HTTP 与资源响应并恢复版本目录链接。新版切换脚本也包含失败时恢复旧版的处理。

存档位于玩家浏览器。3.0 迁移保留 v1 原档；如需在回滚期间保留 3.0 的新进度，应先导出 v3 备份，2.2.0 不支持直接导入 v3 备份。

## 后续发布入口

仓库新增 `Server image` 手动工作流，用于在 GitHub 构建与验证 Linux 镜像，避免在内存紧张的生产服务器上执行构建。工作流只生成保留 3 天的可下载镜像制品，不会自动切换线上版本。此次使用的镜像归档另行保存在服务器的发布备份目录中。
