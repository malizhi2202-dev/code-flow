import { useState } from 'react';
import { CheckCircle, Circle, Play, AlertTriangle, Users, GitCommit, ArrowRight, Bot } from 'lucide-react';

interface StageInfo {
  id: string;
  name: string;
  what: string;
  tasks: string[];
  experts: string[];
  autoAction: string;  // 门禁通过后自动做什么
}

const STAGES: StageInfo[] = [
  { id: '0-change', name: '变更提案', what: '把模糊想法变成 CHANGE.md', tasks: ['生成 change-id', '反问澄清需求', '架构级预检', '视觉调性预选(前端)'], experts: ['高级产品经理', '资深用户评测员', '架构师', '安全审计师'], autoAction: 'G1 全票/多数通过 → ✅ 自动进入 1-requirement' },
  { id: '1-requirement', name: '需求分析', what: '写 REQUIREMENT.md + 更新 CONTEXT.md', tasks: ['写用户故事(US)', '验收准则(AC) Given/When/Then', 'v1/v2/out 范围切分', '非功能性需求', '提取域语言到 CONTEXT'], experts: ['高级产品经理', '资深用户评测员', '架构师', '安全审计师'], autoAction: '需求门通过 → ✅ 自动进入 2-design' },
  { id: '2-design', name: '技术设计', what: '产出 DESIGN.md + 技术栈 + ADR', tasks: ['技术栈预选', '既有架构对齐', '技术决策(ADR)', '数据流/架构图', '风险分析(≥3条)'], experts: ['架构师(M)', '研发负责人', '领域专家', '安全审计师'], autoAction: 'G2 通过 → ✅ 自动进入 2a(前端)/3-task' },
  { id: '2a-ui-design', name: 'UI 设计', what: '产出 UI-DESIGN.md · 视觉+交互', tasks: ['美学方向 4 问', '5 维决策(字体/颜色/动效/空间/质感)', 'Design Tokens', '关键组件规约(≥5)', 'Anti-slop 自检', '占位符策略'], experts: ['资深UI设计师', '资深用户体验官', '前端架构师', '无障碍专家'], autoAction: 'G2a 通过 → ✅ 自动进入 3-task' },
  { id: '3-task', name: '任务拆分', what: '产出 TASK.md · 波次+自动化策略', tasks: ['原子任务拆分(2~10min)', '波次划分(Wave)', 'read_files/write_files 边界', 'verify + done 定义', '逐 task 🤖/👤 自动化投票'], experts: ['工程效能专家', '架构师', '研发负责人', '资深测试工程师'], autoAction: 'Task 门通过 → ✅ 自动进入 4-dev · 🤖task 自动执行 · 👤task 暂停等人' },
  { id: '4-dev', name: '开发执行', what: '逐个 task TDD 实现 + SUMMARY', tasks: ['自动化门禁检查(<auto>字段)', '沿用抽象 grep', 'TDD: RED→GREEN→REFACTOR', '提交前 self-review(6维)', 'diff 边界 verify', '写 SUMMARY.md'], experts: ['研发负责人(M)', '架构师', '资深测试工程师', '安全审计师'], autoAction: '每 task 提交后 → 🤖自动下一task / 👤暂停等人 · 全部完成 → G3 自动审核' },
  { id: '5-test', name: '测试验证', what: '产出 TEST.md · 5 轮金字塔', tasks: ['第1轮·功能(AC→用例)', '第2轮·性能(预算vs实测)', '第3轮·安全(依赖/秘钥/OWASP)', '第4轮·兼容(跨浏览器/迁移)', '第5轮·可观测(日志/指标/告警)'], experts: ['资深测试工程师', '研发负责人', '高级产品经理', '资深用户体验官'], autoAction: '测试门通过 → ✅ 自动进入 6-review · 🔴问题自动回 4-dev' },
  { id: '6-review', name: '代码审查', what: '产出 REVIEW.md · 三轮审查', tasks: ['第一轮·Spec 合规(AC 对照)', '第二轮·代码质量(6维衰退)', '第三轮·UI 视觉(前端项目)', '第四轮·技术债+跨模型(可选)', '产出 fix 任务(T-FIX-xx)'], experts: ['资深测试工程师(M)', '架构师', '领域专家', '安全审计师'], autoAction: 'G4 通过 → ✅ 自动进入 7-integration · Critical 自动回 4-dev 修复' },
  { id: '7-integration', name: '集成归档', what: '全量测试 + UAT + 归档', tasks: ['全量单测/e2e/build', '人工 UAT 引导', '失败诊断+fix-plan', '提名 LESSONS', '归档到 archive/'], experts: ['Verifier + Release 角色', 'UAT 人工确认'], autoAction: '归档完成 → git 自动提交 · 📦 移入 archive/' },
];

const ROLE_COLOR: Record<string, string> = {
  '高级产品经理': 'var(--color-warning)',
  '资深用户评测员': 'var(--color-info)',
  '架构师': 'var(--color-primary)',
  '安全审计师': 'var(--color-danger)',
  '研发负责人': 'var(--color-info)',
  '领域专家': 'var(--color-success)',
  '资深UI设计师': 'var(--color-warning)',
  '资深用户体验官': 'var(--color-info)',
  '前端架构师': 'var(--color-primary)',
  '无障碍专家': 'var(--color-success)',
  '工程效能专家': 'var(--color-warning)',
  '资深测试工程师': 'var(--color-success)',
};

function GateResultBadge({ gate }: { gate: string }) {
  // 检查这个阶段是否有对应的 gate 数据
  // 简化处理：从 data 中查找匹配的 gate
  return null;
}

export default function WorkflowTab({ data }: { data: any }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const currentIdx = STAGES.findIndex((s) => data.phase === s.id || data.phase?.startsWith(s.id));
  const gateMap = new Map<string, any>();
  (data.gates || []).forEach((g: any) => {
    const key = g.name?.replace(/[G\d\s门需求方案UI设计Task代码审查测试]/g, '').trim() || g.name;
    gateMap.set(g.name || '', g);
  });

  return (
    <div style={{ fontFamily: 'var(--font-body)' }}>
      {STAGES.map((stage, i) => {
        const done = i < currentIdx;
        const current = i === currentIdx;
        const pending = i > currentIdx;
        const isExpanded = expanded === stage.id;

        // 找对应 gate
        let gateResult: string | null = null;
        for (const [k, g] of gateMap) {
          const stageNum = stage.id.split('-')[0];
          if (k.includes(stageNum) || k.includes(stage.name)) { gateResult = g.result; break; }
        }

        const statusIcon = done ? <CheckCircle size={20} color="var(--color-success)" />
          : current ? <Play size={20} color="var(--color-primary)" style={{ animation: 'pulse-dot 2s ease-in-out infinite' }} />
          : <Circle size={20} color="var(--color-grid)" />;

        const borderColor = done ? 'var(--color-success)'
          : current ? 'var(--color-primary)'
          : 'var(--color-grid)';

        return (
          <div key={stage.id} style={{ display: 'flex', gap: 12, marginBottom: 4 }}>
            {/* 时间线 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 32 }}>
              {statusIcon}
              {i < STAGES.length - 1 && (
                <div style={{ width: 2, flex: 1, minHeight: 20, background: i < currentIdx ? 'var(--color-success)' : 'var(--color-grid)', marginTop: 4 }} />
              )}
            </div>

            {/* 内容 */}
            <div
              onClick={() => setExpanded(isExpanded ? null : stage.id)}
              style={{
                flex: 1, background: current ? 'var(--color-elevated)' : 'var(--color-surface)',
                border: `1px solid ${current ? borderColor : 'var(--color-grid)'}`,
                borderLeft: `3px solid ${borderColor}`,
                borderRadius: 'var(--radius-md)', padding: '10px 14px',
                cursor: 'pointer', opacity: pending ? 0.5 : 1,
                transition: 'opacity var(--duration-micro), background var(--duration-micro)',
                marginBottom: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--color-text-dim)', minWidth: 18 }}>{stage.id}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: current ? 'var(--color-text)' : 'var(--color-text-secondary)' }}>{stage.name}</span>
                  {current && <span style={{ fontSize: 10, fontFamily: 'var(--font-display)', background: 'var(--color-primary)', color: '#fff', padding: '1px 6px', borderRadius: 'var(--radius-sm)' }}>当前</span>}
                  {done && <span style={{ fontSize: 10, fontFamily: 'var(--font-display)', background: 'var(--color-success)', color: '#fff', padding: '1px 6px', borderRadius: 'var(--radius-sm)' }}>完成</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {gateResult && (
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-display)', color: gateResult.includes('通过') ? 'var(--color-success)' : gateResult.includes('驳回') ? 'var(--color-danger)' : 'var(--color-warning)' }}>
                      🗳️ {gateResult}
                    </span>
                  )}
                  <span style={{ fontSize: 10, color: 'var(--color-text-dim)' }}>{isExpanded ? '收起 ▲' : '展开 ▼'}</span>
                </div>
              </div>

              {/* 摘要 */}
              <div style={{ marginTop: 4, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                {stage.what}
              </div>

              {/* 展开详情 */}
              {isExpanded && (
                <div style={{ marginTop: 10, borderTop: '1px solid var(--color-grid)', paddingTop: 10 }}>
                  {/* 任务清单 */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontFamily: 'var(--font-display)', color: 'var(--color-text-dim)', marginBottom: 4, textTransform: 'uppercase' }}>📋 本阶段任务</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 16px' }}>
                      {stage.tasks.map((t, j) => (
                        <div key={j} style={{ fontSize: 12, color: 'var(--color-text-secondary)', padding: '2px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-primary)', flexShrink: 0 }} />
                          {t}
                        </div>
                      ))}
                    </div>
                    {/* 任务进度（仅当前阶段显示） */}
                    {current && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontSize: 10, color: 'var(--color-text-dim)', marginBottom: 3 }}>
                          进度: {data.progress || '0/0'}
                        </div>
                        <div style={{ height: 3, background: 'var(--color-grid)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: (() => {
                              const [d, t] = (data.progress || '0/0').split('/').map(Number);
                              return t > 0 ? `${(d / t) * 100}%` : '0%';
                            })(),
                            background: 'var(--color-primary)',
                            transition: 'width var(--duration-standard) var(--easing-standard)',
                          }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 专家团 */}
                  <div>
                    <div style={{ fontSize: 11, fontFamily: 'var(--font-display)', color: 'var(--color-text-dim)', marginBottom: 4, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Users size={12} /> 审核专家团
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {stage.experts.map((expert, j) => {
                        const name = expert.replace('(M)', '');
                        const isMaster = expert.includes('(M)');
                        return (
                          <span key={j} style={{
                            fontSize: 11, padding: '2px 8px', borderRadius: 'var(--radius-sm)',
                            background: ROLE_COLOR[name] || 'var(--color-grid)',
                            color: '#fff', fontFamily: 'var(--font-body)',
                            fontWeight: isMaster ? 600 : 400,
                            border: isMaster ? '1px solid #fff' : 'none',
                          }} title={isMaster ? 'Master · 拥有最终裁决权' : ''}>
                            {expert}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* 自动化执行链路 */}
                  <div style={{ marginTop: 10, marginBottom: 10, background: 'oklch(0.65 0.18 230 / 0.08)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontFamily: 'var(--font-body)' }}>
                    <ArrowRight size={14} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                    <span style={{ color: 'var(--color-text)' }}>{stage.autoAction}</span>
                    {stage.id === '3-task' && <GitCommit size={12} color="var(--color-info)" />}
                  </div>

                  {/* Gate 投票详情 */}
                  {gateResult && (
                    <div style={{ marginTop: 10, background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', padding: 8 }}>
                      <div style={{ fontSize: 11, fontFamily: 'var(--font-display)', color: 'var(--color-text-dim)', marginBottom: 4 }}>🗳️ 门禁结果: {gateResult}</div>
                      {/* 如果 gate data 有详细投票，展示 */}
                      {(() => {
                        for (const [k, g] of gateMap) {
                          if (k.includes(stage.id.split('-')[0]) || k.includes(stage.name)) {
                            return (g.votes || []).map((v: any, vi: number) => (
                              <div key={vi} style={{ fontSize: 11, color: 'var(--color-text-secondary)', padding: '1px 0' }}>
                                {v.role}: {v.vote} — {v.reason?.slice(0, 60)}{(v.reason?.length || 0) > 60 ? '...' : ''}
                              </div>
                            ));
                          }
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
