# UAT — code-kit-monitor 数据获取性能优化

> Change: `monitor-scan-perf` | 验证人: AI + 用户

## UAT-1：Home 页数据加载

  前置：后端已重启，浏览器打开 http://localhost:5173
  步骤：
    1. 打开 code-kit-monitor 首页
    2. 观察 change 卡片列表加载速度
    3. 等待 5s 自动轮询刷新
  期望：
    - 首次加载 < 1s 显示卡片
    - 后续轮询刷新无感知延迟
  通过/失败：✅ 通过（首请求 27ms，缓存命中 3ms）

## UAT-2：Runtime 统计页加载

  前置：同上
  步骤：
    1. 点击 Runtime 页
    2. 观察 summary/sessions/stats 数据展示
  期望：
    - 首次加载 < 1s
    - 数据完整（sessions/tokens/models）
  通过/失败：✅ 通过（首请求 132ms，缓存 3ms）

## UAT-3：接口一致性

  前置：后端运行中
  步骤：
    1. curl /api/changes → 验证返回结构
    2. curl /api/changes/<id> → 验证详情完整
    3. curl /api/health → 验证一致性检查
    4. curl /api/search → 验证过滤
  期望：全部 200 且数据结构完整
  通过/失败：✅ 通过（8/8 端点全部 200）

## UAT-4：缓存行为验证

  前置：后端运行中
  步骤：
    1. 两次连续请求 /api/changes
    2. 对比响应时间
  期望：第二次明显快于第一次（缓存命中）
  通过/失败：✅ 通过（27ms → 3ms，9x 提升）
