# My Personal 3D Room

一个以游戏、阅读、音乐、摄影旅行、跑步和羽毛球为内容的个人 3D 房间。

当前版本为 `V2.3 · DUAL GAME THEATRE`：两张游戏海报使用官方 Steam 纵向主视觉，并共享全屏游戏剧场、播放控制、进度和概念音景。《艾尔登法环》完成清晰度修复后的 12 秒黑金视觉预演；《光与影：33号远征队》完成数字、绘画笔触、花瓣与远征队剪影组成的 12 秒绘画化预演。两段主动播放的演出在系统开启“减少动态效果”时仍会保留完整时间线。

## 本地运行

```bash
npm install
npm run dev
```

默认地址：`http://127.0.0.1:4173/`

## 生产构建

```bash
npm run build
npm run preview
```

## GitHub Pages 发布

项目已包含 `.github/workflows/deploy-pages.yml`。将代码推送到 GitHub 的 `main` 分支后，在仓库的 **Settings → Pages → Build and deployment** 中把 Source 设为 **GitHub Actions**，工作流会自动构建并发布。

项目仓库的展示地址通常是：

```text
https://<GitHub 用户名>.github.io/<仓库名>/?view=1
```

`?view=1` 会直接进入只读访客模式。访客在自己浏览器里添加的内容不会影响其他人，也不会覆盖房间主人本地保存的内容。

## 当前交互

- 鼠标拖动旋转房间；
- 滚轮缩放；
- 悬停物品显示名称；
- 点击物品后相机移动到对应正面机位；
- 关闭内容后返回点击前视角；
- 点击“重置视角”返回默认构图。
- 点击“编辑内容”进入主人编辑状态，再点击“完成编辑”回到干净的访客阅读状态。
- 前五本书可以分别编辑读后感，内容和编辑状态自动保存在当前浏览器。
- 书籍阅读器支持目录、底部翻页按钮及键盘左右方向键翻页。
- 点击唱片机可播放当前七首个人音乐或继续加入本地音频；关闭面板后音乐继续播放。
- 点击电脑可浏览项目档案与代码；编辑模式下可以新增、修改和删除项目。
- 白板在房间中直接展示标题、介绍、语录、关键词和个人图片；点击后可近距离阅读或实时编辑。
- 点击跑步机或羽毛球拍可打开独立运动档案；标题栏下方使用大图生活相册展示运动瞬间，文字自动保存在本机，照片保存在浏览器 IndexedDB 中并按运动分开管理。
- 首次访问包含约 3 秒的房间序章，可点击跳过；“声音开启/声音静音”只控制物品提示音，不影响唱片音乐。
- 点击《艾尔登法环》官方海报可播放黑金视觉预演；点击《33号远征队》官方海报可播放绘画化视觉预演。两段演出都支持重播、独立音景开关和返回房间。

## 设计与计划

- 最终布局：`design/room-layout-final.png`
- 灰模预览：`design/previews/v0.1-graybox.png`
- 清爽基线：`design/previews/v0.2-clean-baseline.png`
- 桌面样板：`design/previews/v0.3-desk-sample.png`
- 唱片机样板：`design/previews/v0.4-record-player.png`
- 首批书籍样板：`design/previews/v0.5-first-books.png`
- 桌面第二轮：`design/previews/v0.6-desk-details.png`
- 游戏海报画框：`design/previews/v0.7-poster-frames.png`
- 摄影旅行区：`design/previews/v0.8-travel-details.png`
- 运动区：`design/previews/v0.9-sports-details.png`
- 全局光照基线：`design/previews/v1.0-lighting-pass.png`
- 新椅子与五本书：`design/previews/v1.1-chair-five-books.png`
- 书籍资料面板：`design/previews/v1.1-book-panel.png`
- 实施方案：`PROJECT_PLAN.md`
