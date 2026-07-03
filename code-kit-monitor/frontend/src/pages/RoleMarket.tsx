import { useEffect, useState } from 'react';
import { Plus, Copy, Trash2, Eye, Users, ShieldAlert, CheckCircle, AlertTriangle } from 'lucide-react';

interface RoleTemplate {
  id: string; name: string; temperament: string; responsibilities: string[];
  triggers: { gate: string; topic: string }[];
  boundaries: { can: string[]; cannot: string[] };
  evaluation: { step: string; title: string; items: string[] }[];
  inputs: string[];
  outputs: string[];
}
interface CustomRole { id: string; name: string; based_on: string; owner_id: string; }

export default function RoleMarket() {
  const [templates, setTemplates] = useState<RoleTemplate[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', based_on: '', temperament: '', responsibilities: '' });

  const uid = () => localStorage.getItem('current_user_id') || 'admin';

  useEffect(() => {
    fetch('/api/roles/templates', { headers: { 'X-User-Id': uid() } }).then(r => r.json()).then(d => {
      setTemplates(d.templates || d.roles || []);
    }).catch(() => {
      // 回退到硬编码模板（code-kit 内置 12 角色）
      setTemplates([
        { id: 'architect', name: '架构师', temperament: '理性、全局视野、技术深度', responsibilities: ['技术方案审核','ADR决策','模块边界定义','架构对齐'],
          triggers: [{gate:'G2方案门',topic:'技术方案合理性、ADR决策质量'},{gate:'G3代码门',topic:'代码是否偏离设计意图'},{gate:'G4审查门',topic:'架构一致性'}],
          boundaries: {can:['审核架构方案','建议替代技术栈','否决不合理ADR'],cannot:['写代码','替代研发负责人做实现决策']},
          evaluation: [{step:'1',title:'方案合理性',items:['技术栈是否匹配非功能需求','模块边界是否清晰','ADR是否有取舍代价']}],
          inputs: ['DESIGN.md','CONTEXT.md','ARCHITECTURE.md'], outputs: ['门禁投票 ✅/❌ + 架构证据']
        },
        { id: 'senior-pm', name: '高级产品经理', temperament: '用户导向、数据分析、市场洞察', responsibilities: ['需求定位','范围控制','用户价值评估','v1/v2/out切分'],
          triggers: [{gate:'G1需求门',topic:'需求定位、范围合理性'},{gate:'测试门',topic:'UAT覆盖核心场景'}],
          boundaries: {can:['判断需求优先级','要求补充遗漏场景'],cannot:['写代码','替代架构师做ADR']},
          evaluation: [{step:'1',title:'需求定位',items:['痛点是否真实','目标用户是否明确','验收线是否用户可感知']}],
          inputs: ['CHANGE.md','REQUIREMENT.md','TEST.md'], outputs: ['✅/❌ + 产品视角理由']
        },
        { id: 'user-evaluator', name: '资深用户评测员', temperament: '同理心、细节敏感、场景思维', responsibilities: ['用户体验评估','痛点验证','学习成本评估'],
          triggers: [{gate:'G1需求门',topic:'需求是否解决真实痛点'},{gate:'测试门',topic:'UAT用户路径自然度'}],
          boundaries: {can:['从用户视角评估','指出不合理交互'],cannot:['写代码','做技术决策']},
          evaluation: [{step:'1',title:'用户视角',items:['操作路径是否最短','首次使用是否可独立完成','错误提示是否可理解']}],
          inputs: ['CHANGE.md','REQUIREMENT.md'], outputs: ['✅/❌ + 用户场景证据']
        },
        { id: 'security-auditor', name: '安全审计师', temperament: '谨慎、合规意识、攻防思维', responsibilities: ['安全设计审查','威胁建模','合规检查','秘钥泄露扫描'],
          triggers: [{gate:'G1需求门',topic:'安全风险预判'},{gate:'G2方案门',topic:'认证鉴权方案、数据流安全'},{gate:'Task门',topic:'自动化投票(安全敏感操作)'},{gate:'G3代码门',topic:'依赖安全、秘钥扫描'},{gate:'G4审查门',topic:'安全审查充分性'}],
          boundaries: {can:['识别安全风险','标记敏感数据','审核加密方案'],cannot:['执行渗透测试','写安全补丁','旋转秘钥']},
          evaluation: [{step:'1',title:'安全信号扫描',items:['是否涉及用户数据','是否涉及认证鉴权','是否涉及支付/交易']},{step:'2',title:'威胁建模',items:['Spoofing','Tampering','Repudiation','Info Disclosure','DoS','Elevation']},{step:'3',title:'秘钥扫描',items:['AWS Key模式','API Key模式','私钥模式','硬编码密码模式']}],
          inputs: ['CHANGE.md','DESIGN.md','全部SUMMARY.md','git diff'], outputs: ['✅/❌/⚪ + 安全证据 + fix方向']
        },
        { id: 'domain-expert', name: '领域专家', temperament: '行业深耕、专业纵深、最佳实践', responsibilities: ['业务逻辑审查','领域建模','数据流校验'],
          triggers: [{gate:'G2方案门',topic:'业务逻辑、领域建模'},{gate:'G4审查门',topic:'领域建模一致性'}],
          boundaries: {can:['审查业务逻辑正确性','发现领域边界模糊'],cannot:['替代架构师做全局决策']},
          evaluation: [{step:'1',title:'领域建模',items:['领域概念是否1:1映射','数据流方向是否符合业务','是否有遗漏的业务实体']}],
          inputs: ['DESIGN.md','REQUIREMENT.md'], outputs: ['✅/❌ + 领域证据']
        },
        { id: 'ui-designer', name: '资深UI设计师', temperament: '审美敏感、视觉层次、设计系统', responsibilities: ['调性审核','视觉层次','AI slop规避'],
          triggers: [{gate:'G2a UI设计门',topic:'调性纯粹度、视觉层次'}],
          boundaries: {can:['审核视觉方案','指出AI slop问题'],cannot:['写CSS','替代前端架构师做组件决策']},
          evaluation: [{step:'1',title:'调性纯粹度',items:['是否偏离既定调性','颜色是否OKLCH','字体是否避开AI slop默认']}],
          inputs: ['UI-DESIGN.md','CHANGE.md(视觉调性段)'], outputs: ['✅/❌ + 视觉证据']
        },
        { id: 'ux-officer', name: '资深用户体验官', temperament: '交互直觉、信息架构、可用性', responsibilities: ['交互审核','信息架构','状态完备性'],
          triggers: [{gate:'G2a UI设计门',topic:'交互直觉、信息架构'},{gate:'测试门',topic:'UAT交互流程'}],
          boundaries: {can:['审核交互方案','指出可用性硬伤'],cannot:['写前端代码']},
          evaluation: [{step:'1',title:'交互审核',items:['操作步骤是否最少','信息架构是否清晰','状态是否完备(loading/empty/error)']}],
          inputs: ['UI-DESIGN.md','REQUIREMENT.md(US)'], outputs: ['✅/❌ + 交互证据']
        },
        { id: 'frontend-architect', name: '前端架构师', temperament: '工程化思维、组件设计、性能意识', responsibilities: ['组件架构','design tokens落地','实现成本评估'],
          triggers: [{gate:'G2a UI设计门',topic:'组件架构、tokens落地性'},{gate:'G2方案门',topic:'前端技术栈选型'}],
          boundaries: {can:['审核前端架构','评估实现成本'],cannot:['写完整组件代码']},
          evaluation: [{step:'1',title:'组件架构',items:['design tokens是否可直接粘贴为CSS','是否与既有组件库冲突','实现成本是否可控']}],
          inputs: ['UI-DESIGN.md','DESIGN.md##0'], outputs: ['✅/❌ + 前端架构证据']
        },
        { id: 'a11y-expert', name: '无障碍专家', temperament: '包容性设计、标准合规、用户多样性', responsibilities: ['WCAG合规','色盲/低视力','键盘可达','读屏器友好'],
          triggers: [{gate:'G2a UI设计门',topic:'WCAG合规、无障碍'}],
          boundaries: {can:['审核无障碍方案','指出不合规项'],cannot:['写ARIA代码']},
          evaluation: [{step:'1',title:'WCAG检查',items:['对比度≥4.5:1','键盘可达(Tab顺序)','aria-label存在','prefers-reduced-motion响应']}],
          inputs: ['UI-DESIGN.md','ui-anti-patterns.md'], outputs: ['✅/❌ + 无障碍证据']
        },
        { id: 'eng-efficiency', name: '工程效能专家', temperament: '数据驱动、流程优化、工具链思维', responsibilities: ['任务粒度评估','并行策略','效能度量'],
          triggers: [{gate:'Task门',topic:'任务拆分质量、波次效率'}],
          boundaries: {can:['评估任务粒度','优化并行策略'],cannot:['拆分任务(Task是Planner的职责)']},
          evaluation: [{step:'1',title:'粒度',items:['每个task是否2-10分钟','是否有过大的task']},{step:'2',title:'并行度',items:['同层task是否最大化并行','依赖是否无环']}],
          inputs: ['TASK.md','DESIGN.md'], outputs: ['✅/❌ + 效能证据']
        },
        { id: 'dev-lead', name: '研发负责人', temperament: '执行力、风险意识、质量把控', responsibilities: ['实现可行性','工时评估','代码质量'],
          triggers: [{gate:'G2方案门',topic:'实现可行性、工时'},{gate:'G3代码门(Master)',topic:'代码质量裁决'},{gate:'Task门',topic:'自动化投票(复杂度)'}],
          boundaries: {can:['审核实现可行性','评估工时','审查代码质量'],cannot:['替代架构师做ADR','替代测试工程师做测试策略']},
          evaluation: [{step:'1',title:'可行性',items:['技术栈是否团队已有','是否有明显的实现陷阱','依赖是否可靠']}],
          inputs: ['DESIGN.md','TASK.md','全部SUMMARY.md'], outputs: ['✅/❌ + 研发视角证据']
        },
        { id: 'test-engineer', name: '资深测试工程师', temperament: '严谨、边界思维、自动化优先', responsibilities: ['测试策略','verify可执行','覆盖率评估','5轮金字塔审核'],
          triggers: [{gate:'Task门',topic:'verify可执行性、自动化投票'},{gate:'G3代码门',topic:'verify输出真实性'},{gate:'测试门(Master)',topic:'五轮测试完整性'},{gate:'G4审查门(Master)',topic:'最终裁决'}],
          boundaries: {can:['审核测试质量','要求补测','作为Master最终裁决'],cannot:['写测试代码','修改AC']},
          evaluation: [{step:'1',title:'verify检查',items:['是否可执行命令','是否有明确输出','是否依赖外部服务']},{step:'2',title:'测试质量',items:['T1测试晦涩','T2测试脆弱','T3测试重复','T4Mock滥用','T5覆盖率幻觉','T6架构错配']}],
          inputs: ['TEST.md','REQUIREMENT.md','TASK.md','全部SUMMARY.md'], outputs: ['✅/❌ + 测试质量证据 + 条件清单']
        },
      ]);
    }).finally(() => setLoading(false));
    fetchCustom();
  }, []);

  const fetchCustom = async () => {
    const r = await fetch('/api/roles/custom', { headers: { 'X-User-Id': uid() } });
    const d = await r.json().catch(() => ({}));
    setCustomRoles(d.roles || []);
  };

  const handleCreate = async () => {
    await fetch('/api/roles/custom', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': uid() }, body: JSON.stringify({ name: form.name, based_on: form.based_on, temperament: form.temperament, responsibilities: form.responsibilities.split('\n').filter(Boolean) }) });
    setShowCreate(false);
    fetchCustom();
  };

  if (loading) return <div style={{ padding: 40, color: 'var(--text-weak)' }}>加载中...</div>;

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: 0 }}>角色</h1>
        <button onClick={() => { setForm({ name: '', based_on: selected || '', temperament: '', responsibilities: '' }); setShowCreate(true); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>
          <Plus size={14} /> 创建自定义角色
        </button>
      </div>

      {/* 内置角色模板（只读）*/}
      <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>code-kit 内置角色模板（12 个·只读参考）</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10, marginBottom: 32 }}>
        {templates.map(t => (
          <div key={t.id} onClick={() => setSelected(selected === t.id ? null : t.id)} style={{ background: 'var(--bg-card, #181a1f)', borderRadius: 8, padding: 14, border: selected === t.id ? '1px solid var(--color-primary)' : '1px solid var(--border-normal, #2a2d35)', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Users size={14} color="var(--color-primary)" />
              <span style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</span>
              <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: 'var(--blue-bg)', color: 'var(--blue)' }}>内置</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>{t.temperament}</div>
            {selected === t.id && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, maxHeight: 400, overflow: 'auto' }}>
                <div style={{ marginBottom: 8 }}><strong>触发场景：</strong>{(t.triggers||[]).map(tg => <span key={tg.gate} style={{display:'inline-block',margin:'2px 4px',padding:'1px 6px',background:'var(--bg-input)',borderRadius:3,fontSize:10}}>{tg.gate}: {tg.topic.slice(0,20)}</span>)}</div>
                <div style={{ marginBottom: 8 }}><strong style={{color:'var(--green)'}}>✅能做：</strong>{(t.boundaries?.can||[]).join(' · ')}</div>
                <div style={{ marginBottom: 8 }}><strong style={{color:'var(--red)'}}>❌不能做：</strong>{(t.boundaries?.cannot||[]).join(' · ')}</div>
                <div style={{ marginBottom: 8 }}><strong>评估框架：</strong>{(t.evaluation||[]).map(e => <div key={e.step} style={{marginLeft:8,marginTop:4}}>步骤{e.step}·{e.title}: {(e.items||[]).join(', ')}</div>)}</div>
                <div style={{ marginBottom: 4 }}><strong>输入：</strong>{(t.inputs||[]).join(' · ')}</div>
                <div style={{ marginBottom: 8 }}><strong>输出：</strong>{(t.outputs||[]).join(' · ')}</div>
                <button onClick={(e) => { e.stopPropagation(); setForm({ name: t.name + '（自定义）', based_on: t.id, temperament: t.temperament, responsibilities: (t.responsibilities || []).join('\n') }); setShowCreate(true); }} style={{ padding: '4px 10px', fontSize: 11, background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><Copy size={11} /> 基于此创建</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 自定义角色 */}
      <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>我的自定义角色</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
        {customRoles.map(r => (
          <div key={r.id} style={{ background: 'var(--bg-card, #181a1f)', borderRadius: 8, padding: 14, border: '1px solid var(--border-normal, #2a2d35)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</span>
              <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: 'var(--green-bg)', color: 'var(--green)' }}>自定义</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>基于: {r.based_on || '自定义'}</div>
          </div>
        ))}
        {customRoles.length === 0 && <p style={{ color: 'var(--text-dim)', fontSize: 12 }}>暂无自定义角色，点击内置模板的「基于此创建」开始</p>}
      </div>

      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--bg-elevated, #22242a)', borderRadius: 8, padding: 24, width: 480, maxHeight: '85vh', overflow: 'auto' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginTop: 0 }}>创建自定义角色</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div><label style={lbl}>名称</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inp} /></div>
              <div><label style={lbl}>基于模板</label><select value={form.based_on} onChange={e => setForm({ ...form, based_on: e.target.value })} style={inp}><option value="">-- 选择内置角色 --</option>{templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
              <div><label style={lbl}>性情描述</label><textarea value={form.temperament} onChange={e => setForm({ ...form, temperament: e.target.value })} rows={2} style={{ ...inp, resize: 'vertical' }} /></div>
              <div><label style={lbl}>职责（每行一条）</label><textarea value={form.responsibilities} onChange={e => setForm({ ...form, responsibilities: e.target.value })} rows={3} style={{ ...inp, resize: 'vertical' }} /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button onClick={() => setShowCreate(false)} style={btn2}>取消</button>
              <button onClick={handleCreate} disabled={!form.name} style={{ ...btn1, opacity: form.name ? 1 : 0.5 }}>创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 };
const inp: React.CSSProperties = { width: '100%', padding: '8px', background: 'var(--bg-input, #0b0c10)', color: 'var(--color-text)', border: '1px solid var(--border-normal, #2a2d35)', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' };
const btn1: React.CSSProperties = { padding: '8px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 };
const btn2: React.CSSProperties = { padding: '8px 16px', background: 'var(--bg-card)', color: 'var(--color-text)', border: '1px solid var(--border-normal, #2a2d35)', borderRadius: 4, cursor: 'pointer', fontSize: 13 };
