import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
export default function RoleMarket() {
    const [templates, setTemplates] = useState([]);
    const [customRoles, setCustomRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ name: '', based_on: '', temperament: '', responsibilities: '' });
    const uid = () => localStorage.getItem('current_user_id') || 'admin';
    useEffect(() => {
        fetch('/api/roles/templates', { headers: { 'X-User-Id': uid() } }).then(r => r.json()).then(d => {
            setTemplates(d.templates || d.roles || []);
        }).catch(() => {
            // 回退到硬编码模板（code-kit 内置 12 角色）
            setTemplates([
                { id: 'architect', name: '架构师', temperament: '理性、全局视野、技术深度', responsibilities: ['技术方案审核', 'ADR决策', '模块边界定义', '架构对齐'],
                    triggers: [{ gate: 'G2方案门', topic: '技术方案合理性、ADR决策质量' }, { gate: 'G3代码门', topic: '代码是否偏离设计意图' }, { gate: 'G4审查门', topic: '架构一致性' }],
                    boundaries: { can: ['审核架构方案', '建议替代技术栈', '否决不合理ADR'], cannot: ['写代码', '替代研发负责人做实现决策'] },
                    evaluation: [{ step: '1', title: '方案合理性', items: ['技术栈是否匹配非功能需求', '模块边界是否清晰', 'ADR是否有取舍代价'] }],
                    inputs: ['DESIGN.md', 'CONTEXT.md', 'ARCHITECTURE.md'], outputs: ['门禁投票 ✅/❌ + 架构证据']
                },
                { id: 'senior-pm', name: '高级产品经理', temperament: '用户导向、数据分析、市场洞察', responsibilities: ['需求定位', '范围控制', '用户价值评估', 'v1/v2/out切分'],
                    triggers: [{ gate: 'G1需求门', topic: '需求定位、范围合理性' }, { gate: '测试门', topic: 'UAT覆盖核心场景' }],
                    boundaries: { can: ['判断需求优先级', '要求补充遗漏场景'], cannot: ['写代码', '替代架构师做ADR'] },
                    evaluation: [{ step: '1', title: '需求定位', items: ['痛点是否真实', '目标用户是否明确', '验收线是否用户可感知'] }],
                    inputs: ['CHANGE.md', 'REQUIREMENT.md', 'TEST.md'], outputs: ['✅/❌ + 产品视角理由']
                },
                { id: 'user-evaluator', name: '资深用户评测员', temperament: '同理心、细节敏感、场景思维', responsibilities: ['用户体验评估', '痛点验证', '学习成本评估'],
                    triggers: [{ gate: 'G1需求门', topic: '需求是否解决真实痛点' }, { gate: '测试门', topic: 'UAT用户路径自然度' }],
                    boundaries: { can: ['从用户视角评估', '指出不合理交互'], cannot: ['写代码', '做技术决策'] },
                    evaluation: [{ step: '1', title: '用户视角', items: ['操作路径是否最短', '首次使用是否可独立完成', '错误提示是否可理解'] }],
                    inputs: ['CHANGE.md', 'REQUIREMENT.md'], outputs: ['✅/❌ + 用户场景证据']
                },
                { id: 'security-auditor', name: '安全审计师', temperament: '谨慎、合规意识、攻防思维', responsibilities: ['安全设计审查', '威胁建模', '合规检查', '秘钥泄露扫描'],
                    triggers: [{ gate: 'G1需求门', topic: '安全风险预判' }, { gate: 'G2方案门', topic: '认证鉴权方案、数据流安全' }, { gate: 'Task门', topic: '自动化投票(安全敏感操作)' }, { gate: 'G3代码门', topic: '依赖安全、秘钥扫描' }, { gate: 'G4审查门', topic: '安全审查充分性' }],
                    boundaries: { can: ['识别安全风险', '标记敏感数据', '审核加密方案'], cannot: ['执行渗透测试', '写安全补丁', '旋转秘钥'] },
                    evaluation: [{ step: '1', title: '安全信号扫描', items: ['是否涉及用户数据', '是否涉及认证鉴权', '是否涉及支付/交易'] }, { step: '2', title: '威胁建模', items: ['Spoofing', 'Tampering', 'Repudiation', 'Info Disclosure', 'DoS', 'Elevation'] }, { step: '3', title: '秘钥扫描', items: ['AWS Key模式', 'API Key模式', '私钥模式', '硬编码密码模式'] }],
                    inputs: ['CHANGE.md', 'DESIGN.md', '全部SUMMARY.md', 'git diff'], outputs: ['✅/❌/⚪ + 安全证据 + fix方向']
                },
                { id: 'domain-expert', name: '领域专家', temperament: '行业深耕、专业纵深、最佳实践', responsibilities: ['业务逻辑审查', '领域建模', '数据流校验'],
                    triggers: [{ gate: 'G2方案门', topic: '业务逻辑、领域建模' }, { gate: 'G4审查门', topic: '领域建模一致性' }],
                    boundaries: { can: ['审查业务逻辑正确性', '发现领域边界模糊'], cannot: ['替代架构师做全局决策'] },
                    evaluation: [{ step: '1', title: '领域建模', items: ['领域概念是否1:1映射', '数据流方向是否符合业务', '是否有遗漏的业务实体'] }],
                    inputs: ['DESIGN.md', 'REQUIREMENT.md'], outputs: ['✅/❌ + 领域证据']
                },
                { id: 'ui-designer', name: '资深UI设计师', temperament: '审美敏感、视觉层次、设计系统', responsibilities: ['调性审核', '视觉层次', 'AI slop规避'],
                    triggers: [{ gate: 'G2a UI设计门', topic: '调性纯粹度、视觉层次' }],
                    boundaries: { can: ['审核视觉方案', '指出AI slop问题'], cannot: ['写CSS', '替代前端架构师做组件决策'] },
                    evaluation: [{ step: '1', title: '调性纯粹度', items: ['是否偏离既定调性', '颜色是否OKLCH', '字体是否避开AI slop默认'] }],
                    inputs: ['UI-DESIGN.md', 'CHANGE.md(视觉调性段)'], outputs: ['✅/❌ + 视觉证据']
                },
                { id: 'ux-officer', name: '资深用户体验官', temperament: '交互直觉、信息架构、可用性', responsibilities: ['交互审核', '信息架构', '状态完备性'],
                    triggers: [{ gate: 'G2a UI设计门', topic: '交互直觉、信息架构' }, { gate: '测试门', topic: 'UAT交互流程' }],
                    boundaries: { can: ['审核交互方案', '指出可用性硬伤'], cannot: ['写前端代码'] },
                    evaluation: [{ step: '1', title: '交互审核', items: ['操作步骤是否最少', '信息架构是否清晰', '状态是否完备(loading/empty/error)'] }],
                    inputs: ['UI-DESIGN.md', 'REQUIREMENT.md(US)'], outputs: ['✅/❌ + 交互证据']
                },
                { id: 'frontend-architect', name: '前端架构师', temperament: '工程化思维、组件设计、性能意识', responsibilities: ['组件架构', 'design tokens落地', '实现成本评估'],
                    triggers: [{ gate: 'G2a UI设计门', topic: '组件架构、tokens落地性' }, { gate: 'G2方案门', topic: '前端技术栈选型' }],
                    boundaries: { can: ['审核前端架构', '评估实现成本'], cannot: ['写完整组件代码'] },
                    evaluation: [{ step: '1', title: '组件架构', items: ['design tokens是否可直接粘贴为CSS', '是否与既有组件库冲突', '实现成本是否可控'] }],
                    inputs: ['UI-DESIGN.md', 'DESIGN.md##0'], outputs: ['✅/❌ + 前端架构证据']
                },
                { id: 'a11y-expert', name: '无障碍专家', temperament: '包容性设计、标准合规、用户多样性', responsibilities: ['WCAG合规', '色盲/低视力', '键盘可达', '读屏器友好'],
                    triggers: [{ gate: 'G2a UI设计门', topic: 'WCAG合规、无障碍' }],
                    boundaries: { can: ['审核无障碍方案', '指出不合规项'], cannot: ['写ARIA代码'] },
                    evaluation: [{ step: '1', title: 'WCAG检查', items: ['对比度≥4.5:1', '键盘可达(Tab顺序)', 'aria-label存在', 'prefers-reduced-motion响应'] }],
                    inputs: ['UI-DESIGN.md', 'ui-anti-patterns.md'], outputs: ['✅/❌ + 无障碍证据']
                },
                { id: 'eng-efficiency', name: '工程效能专家', temperament: '数据驱动、流程优化、工具链思维', responsibilities: ['任务粒度评估', '并行策略', '效能度量'],
                    triggers: [{ gate: 'Task门', topic: '任务拆分质量、波次效率' }],
                    boundaries: { can: ['评估任务粒度', '优化并行策略'], cannot: ['拆分任务(Task是Planner的职责)'] },
                    evaluation: [{ step: '1', title: '粒度', items: ['每个task是否2-10分钟', '是否有过大的task'] }, { step: '2', title: '并行度', items: ['同层task是否最大化并行', '依赖是否无环'] }],
                    inputs: ['TASK.md', 'DESIGN.md'], outputs: ['✅/❌ + 效能证据']
                },
                { id: 'dev-lead', name: '研发负责人', temperament: '执行力、风险意识、质量把控', responsibilities: ['实现可行性', '工时评估', '代码质量'],
                    triggers: [{ gate: 'G2方案门', topic: '实现可行性、工时' }, { gate: 'G3代码门(Master)', topic: '代码质量裁决' }, { gate: 'Task门', topic: '自动化投票(复杂度)' }] }
            ], boundaries, { can: ['审核实现可行性', '评估工时', '审查代码质量'], cannot: ['替代架构师做ADR', '替代测试工程师做测试策略'] }, evaluation, [{ step: '1', title: '可行性', items: ['技术栈是否团队已有', '是否有明显的实现陷阱', '依赖是否可靠'] }], inputs, ['DESIGN.md', 'TASK.md', '全部SUMMARY.md'], outputs, ['✅/❌ + 研发视角证据']);
        }, { id: 'test-engineer', name: '资深测试工程师', temperament: '严谨、边界思维、自动化优先', responsibilities: ['测试策略', 'verify可执行', '覆盖率评估', '5轮金字塔审核'],
            triggers: [{ gate: 'Task门', topic: 'verify可执行性、自动化投票' }, { gate: 'G3代码门', topic: 'verify输出真实性' }, { gate: '测试门(Master)', topic: '五轮测试完整性' }, { gate: 'G4审查门(Master)', topic: '最终裁决' }],
            boundaries: { can: ['审核测试质量', '要求补测', '作为Master最终裁决'], cannot: ['写测试代码', '修改AC'] },
            evaluation: [{ step: '1', title: 'verify检查', items: ['是否可执行命令', '是否有明确输出', '是否依赖外部服务'] }, { step: '2', title: '测试质量', items: ['T1测试晦涩', 'T2测试脆弱', 'T3测试重复', 'T4Mock滥用', 'T5覆盖率幻觉', 'T6架构错配'] }],
            inputs: ['TEST.md', 'REQUIREMENT.md', 'TASK.md', '全部SUMMARY.md'], outputs: ['✅/❌ + 测试质量证据 + 条件清单']
        });
    }).finally(() => setLoading(false));
    fetchCustom();
}
[];
;
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
if (loading)
    return _jsx("div", { style: { padding: 40, color: 'var(--text-weak)' }, children: "\u52A0\u8F7D\u4E2D..." });
return (_jsxs("div", { style: { padding: 24, height: '100%', overflow: 'auto' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 16 }, children: [_jsx("h1", { style: { fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, margin: 0 }, children: "\u89D2\u8272" }), _jsxs("button", { onClick: () => { setForm({ name: '', based_on: selected || '', temperament: '', responsibilities: '' }); setShowCreate(true); }, style: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }, children: [_jsx(Plus, { size: 14 }), " \u521B\u5EFA\u81EA\u5B9A\u4E49\u89D2\u8272"] })] }), _jsx("h2", { style: { fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }, children: "code-kit \u5185\u7F6E\u89D2\u8272\u6A21\u677F\uFF0812 \u4E2A\u00B7\u53EA\u8BFB\u53C2\u8003\uFF09" }), _jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10, marginBottom: 32 }, children: templates.map(t => (_jsxs("div", { onClick: () => setSelected(selected === t.id ? null : t.id), style: { background: 'var(--bg-card, #181a1f)', borderRadius: 8, padding: 14, border: selected === t.id ? '1px solid var(--color-primary)' : '1px solid var(--border-normal, #2a2d35)', cursor: 'pointer' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }, children: [_jsx(Users, { size: 14, color: "var(--color-primary)" }), _jsx("span", { style: { fontWeight: 600, fontSize: 14 }, children: t.name }), _jsx("span", { style: { fontSize: 10, padding: '1px 5px', borderRadius: 3, background: 'var(--blue-bg)', color: 'var(--blue)' }, children: "\u5185\u7F6E" })] }), _jsx("div", { style: { fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }, children: t.temperament }), selected === t.id && (_jsxs("div", { style: { marginTop: 8, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, maxHeight: 400, overflow: 'auto' }, children: [_jsxs("div", { style: { marginBottom: 8 }, children: [_jsx("strong", { children: "\u89E6\u53D1\u573A\u666F\uFF1A" }), (t.triggers || []).map(tg => _jsxs("span", { style: { display: 'inline-block', margin: '2px 4px', padding: '1px 6px', background: 'var(--bg-input)', borderRadius: 3, fontSize: 10 }, children: [tg.gate, ": ", tg.topic.slice(0, 20)] }, tg.gate))] }), _jsxs("div", { style: { marginBottom: 8 }, children: [_jsx("strong", { style: { color: 'var(--green)' }, children: "\u2705\u80FD\u505A\uFF1A" }), (t.boundaries?.can || []).join(' · ')] }), _jsxs("div", { style: { marginBottom: 8 }, children: [_jsx("strong", { style: { color: 'var(--red)' }, children: "\u274C\u4E0D\u80FD\u505A\uFF1A" }), (t.boundaries?.cannot || []).join(' · ')] }), _jsxs("div", { style: { marginBottom: 8 }, children: [_jsx("strong", { children: "\u8BC4\u4F30\u6846\u67B6\uFF1A" }), (t.evaluation || []).map(e => _jsxs("div", { style: { marginLeft: 8, marginTop: 4 }, children: ["\u6B65\u9AA4", e.step, "\u00B7", e.title, ": ", (e.items || []).join(', ')] }, e.step))] }), _jsxs("div", { style: { marginBottom: 4 }, children: [_jsx("strong", { children: "\u8F93\u5165\uFF1A" }), (t.inputs || []).join(' · ')] }), _jsxs("div", { style: { marginBottom: 8 }, children: [_jsx("strong", { children: "\u8F93\u51FA\uFF1A" }), (t.outputs || []).join(' · ')] }), _jsxs("button", { onClick: (e) => { e.stopPropagation(); setForm({ name: t.name + '（自定义）', based_on: t.id, temperament: t.temperament, responsibilities: (t.responsibilities || []).join('\n') }); setShowCreate(true); }, style: { padding: '4px 10px', fontSize: 11, background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }, children: [_jsx(Copy, { size: 11 }), " \u57FA\u4E8E\u6B64\u521B\u5EFA"] })] }))] }, t.id))) }), _jsx("h2", { style: { fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }, children: "\u6211\u7684\u81EA\u5B9A\u4E49\u89D2\u8272" }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }, children: [customRoles.map(r => (_jsxs("div", { style: { background: 'var(--bg-card, #181a1f)', borderRadius: 8, padding: 14, border: '1px solid var(--border-normal, #2a2d35)' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { style: { fontWeight: 600, fontSize: 14 }, children: r.name }), _jsx("span", { style: { fontSize: 10, padding: '1px 5px', borderRadius: 3, background: 'var(--green-bg)', color: 'var(--green)' }, children: "\u81EA\u5B9A\u4E49" })] }), _jsxs("div", { style: { fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }, children: ["\u57FA\u4E8E: ", r.based_on || '自定义'] })] }, r.id))), customRoles.length === 0 && _jsx("p", { style: { color: 'var(--text-dim)', fontSize: 12 }, children: "\u6682\u65E0\u81EA\u5B9A\u4E49\u89D2\u8272\uFF0C\u70B9\u51FB\u5185\u7F6E\u6A21\u677F\u7684\u300C\u57FA\u4E8E\u6B64\u521B\u5EFA\u300D\u5F00\u59CB" })] }), showCreate && (_jsx("div", { style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }, children: _jsxs("div", { style: { background: 'var(--bg-elevated, #22242a)', borderRadius: 8, padding: 24, width: 480, maxHeight: '85vh', overflow: 'auto' }, children: [_jsx("h2", { style: { fontFamily: 'var(--font-display)', fontSize: 18, marginTop: 0 }, children: "\u521B\u5EFA\u81EA\u5B9A\u4E49\u89D2\u8272" }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 10 }, children: [_jsxs("div", { children: [_jsx("label", { style: lbl, children: "\u540D\u79F0" }), _jsx("input", { value: form.name, onChange: e => setForm({ ...form, name: e.target.value }), style: inp })] }), _jsxs("div", { children: [_jsx("label", { style: lbl, children: "\u57FA\u4E8E\u6A21\u677F" }), _jsxs("select", { value: form.based_on, onChange: e => setForm({ ...form, based_on: e.target.value }), style: inp, children: [_jsx("option", { value: "", children: "-- \u9009\u62E9\u5185\u7F6E\u89D2\u8272 --" }), templates.map(t => _jsx("option", { value: t.id, children: t.name }, t.id))] })] }), _jsxs("div", { children: [_jsx("label", { style: lbl, children: "\u6027\u60C5\u63CF\u8FF0" }), _jsx("textarea", { value: form.temperament, onChange: e => setForm({ ...form, temperament: e.target.value }), rows: 2, style: { ...inp, resize: 'vertical' } })] }), _jsxs("div", { children: [_jsx("label", { style: lbl, children: "\u804C\u8D23\uFF08\u6BCF\u884C\u4E00\u6761\uFF09" }), _jsx("textarea", { value: form.responsibilities, onChange: e => setForm({ ...form, responsibilities: e.target.value }), rows: 3, style: { ...inp, resize: 'vertical' } })] })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }, children: [_jsx("button", { onClick: () => setShowCreate(false), style: btn2, children: "\u53D6\u6D88" }), _jsx("button", { onClick: handleCreate, disabled: !form.name, style: { ...btn1, opacity: form.name ? 1 : 0.5 }, children: "\u521B\u5EFA" })] })] }) }))] }));
const lbl = { fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 };
const inp = { width: '100%', padding: '8px', background: 'var(--bg-input, #0b0c10)', color: 'var(--color-text)', border: '1px solid var(--border-normal, #2a2d35)', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' };
const btn1 = { padding: '8px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 };
const btn2 = { padding: '8px 16px', background: 'var(--bg-card)', color: 'var(--color-text)', border: '1px solid var(--border-normal, #2a2d35)', borderRadius: 4, cursor: 'pointer', fontSize: 13 };
