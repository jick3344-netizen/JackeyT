const state = {
  screen: "home",
  invite: "",
  diagnosisType: "personal",
  diagnosisId: null,
  user: null,
  diagnoses: [],
  activeDiagnosis: null,
  adminData: null,
  adminDetail: null,
  adminContent: null,
  adminTab: "overview",
  content: null,
  createdInvite: null,
  questionIndex: 0,
  answers: {},
  loadingTimer: null,
  reportReady: false,
};

function currentQuestions() {
  if (state.activeDiagnosis?.questionSnapshot?.length) return state.activeDiagnosis.questionSnapshot;
  return state.content?.questions?.[state.diagnosisType] || window.QUESTION_SETS[state.diagnosisType] || window.QUESTION_SETS.personal;
}

function createEmptyAnswers(type) {
  const questions = state.activeDiagnosis?.questionSnapshot?.length
    ? state.activeDiagnosis.questionSnapshot
    : state.content?.questions?.[type] || window.QUESTION_SETS[type] || [];
  return Object.fromEntries(questions.map((question) => [
    question.key,
    question.type === "triple" ? ["", "", ""] : question.type === "scale" ? 0 : "",
  ]));
}

function render() {
  const app = document.querySelector("#app");
  const screens = {
    home: renderHome,
    invite: renderInvite,
    dashboard: renderDashboard,
    select: renderTypeSelect,
    questionnaire: renderQuestionnaire,
    loading: renderLoading,
    preview: renderPreview,
    report: renderReport,
    admin: renderAdmin,
  };
  app.innerHTML = (screens[state.screen] || renderHome)();
  window.scrollTo({ top: 0, behavior: "instant" });
  bindEvents();
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "请求失败");
  return payload;
}

function logo(compact = false) {
  const site = siteContent();
  return `
    <button class="logo" data-go="home" aria-label="返回首页">
      <span>
        <strong>${escapeHtml(site.brandName)}</strong>
        ${compact ? "" : `<small>${escapeHtml(site.subtitle)}</small>`}
      </span>
    </button>
  `;
}

function publicHeader() {
  return `
    <header class="site-header">
      <div class="wrap header-inner">
        ${logo()}
        <nav class="nav" aria-label="主导航">
          <button data-scroll="method">诊断方法</button>
          <button data-scroll="types">个人品牌</button>
          <button data-scroll="types">企业品牌</button>
          <button class="button primary" data-go="invite">使用邀请码</button>
        </nav>
      </div>
    </header>
  `;
}

function appHeader() {
  const displayName = state.user?.displayName || "黄先生";
  const adminNavigation = `
    <button data-action="open-admin">管理后台</button>
    <span class="user-chip"><span class="user-dot">${escapeHtml(displayName.slice(0, 1))}</span> ${escapeHtml(displayName)}</span>
  `;
  const memberNavigation = `
    <button data-go="dashboard">工作台</button>
    <button data-toast="历史报告已集中展示在工作台">历史报告</button>
    <button class="button primary" data-go="select">新建诊断</button>
    <span class="user-chip"><span class="user-dot">${escapeHtml(displayName.slice(0, 1))}</span> ${escapeHtml(displayName)}</span>
  `;
  return `
    <header class="app-header">
      <div class="wrap header-inner">
        ${logo(true)}
        <nav class="app-nav">
          ${state.user?.role === "admin" ? adminNavigation : memberNavigation}
        </nav>
      </div>
    </header>
  `;
}

function renderHome() {
  const site = siteContent();
  const methods = state.content?.methods || [];
  const types = state.content?.brandTypes || {};
  const personal = types.personal || {};
  const corporate = types.corporate || {};
  return `
    <div class="shell">
      ${publicHeader()}
      <main>
        <section class="wrap hero">
          <div>
            <p class="eyebrow">${escapeHtml(site.heroEyebrow)}</p>
            <h1>${formatHeroTitle(site.heroTitle)}</h1>
            <p class="lead">${escapeHtml(site.heroLead)}</p>
            <div class="hero-actions">
              <button class="button primary" data-go="invite">${escapeHtml(site.primaryCta)} <span>›</span></button>
              <button class="button secondary" data-scroll="method">${escapeHtml(site.secondaryCta)}</button>
            </div>
          </div>
          <aside class="hero-visual" aria-label="品牌诊断的三个问题">
            <img src="${escapeHtml(site.heroImage)}" alt="品牌战略诊断的纸张与卡片" fetchpriority="high" decoding="async" />
            <div class="diagnosis-stamp" aria-hidden="true">三问</div>
            <div class="three-paper">
              <small>BRAND DIAGNOSIS NOTE</small>
              <div class="question-line"><span>POSITIONING · 定位</span><strong>你是谁？</strong></div>
              <div class="question-line"><span>VALUE · 价值</span><strong>为什么选择你？</strong></div>
              <div class="question-line"><span>TRUST · 信任</span><strong>为什么相信你？</strong></div>
              <p>先问清楚，再下判断。</p>
            </div>
          </aside>
        </section>

        <section class="method" id="method">
          <div class="wrap method-grid">
            ${methods.map((item) => `<article class="method-item ${escapeHtml(item.key || "")}"><span class="method-symbol" aria-hidden="true"></span><span class="method-number">${escapeHtml(item.number)}</span><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.description)}</p></article>`).join("")}
          </div>
        </section>

        <section class="section" id="types">
          <div class="wrap">
            <div class="section-heading"><p class="eyebrow">${escapeHtml(site.methodTitle)}</p><h2>选择与你有关的品牌类型</h2><p>${escapeHtml(site.methodIntro)}</p></div>
            <div class="type-grid">
              <article class="type-card"><span class="tag">${escapeHtml(personal.tag || "")}</span><h3>${escapeHtml(personal.title || "个人品牌诊断")}</h3><p>${escapeHtml(personal.description || "")}</p><button class="button secondary" data-go="invite">开始个人品牌诊断</button></article>
              <article class="type-card"><span class="tag">${escapeHtml(corporate.tag || "")}</span><h3>${escapeHtml(corporate.title || "企业品牌诊断")}</h3><p>${escapeHtml(corporate.description || "")}</p><button class="button secondary" data-go="invite">开始企业品牌诊断</button></article>
            </div>
          </div>
        </section>

        <section class="report-strip">
          <div class="wrap report-grid">
            <h2>${escapeHtml(site.reportStripTitle)}</h2>
            <div class="report-feature"><span>01</span><strong>三维评分</strong></div>
            <div class="report-feature"><span>02</span><strong>问题清单</strong></div>
            <div class="report-feature"><span>03</span><strong>表达建议</strong></div>
            <div class="report-feature"><span>04</span><strong>行动方案</strong></div>
          </div>
        </section>

        ${consultationBlock("首页咨询")}
      </main>
      <footer class="footer"><div class="wrap footer-inner"><span>${escapeHtml(site.footerLeft)}</span><span>${escapeHtml(site.footerRight)}</span></div></footer>
    </div>
  `;
}

function renderInvite() {
  return `
    <main class="center-page">
      <section class="auth-card">
        <div class="auth-brand"><h1>老黄的品牌三问</h1><p>品牌战略诊断工具</p></div>
        <h2>输入你的邀请码</h2>
        <p class="auth-copy">请输入有效的邀请码。验证成功后，即可进入诊断与报告流程。</p>
        <div class="field">
          <label for="inviteCode">邀请码</label>
          <input class="input" id="inviteCode" data-testid="invite-code" value="${escapeHtml(state.invite)}" placeholder="请输入邀请码" autocomplete="off" />
        </div>
        <button class="button primary wide" data-action="verify-invite">验证并继续</button>
        <button class="button text wide" data-go="home">返回首页</button>
      </section>
    </main>
  `;
}

function renderDashboard() {
  const displayName = state.user?.displayName || "黄先生";
  const draft = state.diagnoses.find((item) => item.status === "draft");
  const generating = state.diagnoses.find((item) => item.status === "generating");
  const completed = state.diagnoses.filter((item) => item.status === "completed");
  return `
    <div class="shell">
      ${appHeader()}
      <main class="wrap dashboard">
        <div class="dashboard-top">
          <div><p class="eyebrow">MY WORKSPACE</p><h1>${escapeHtml(displayName)}，欢迎回来。</h1><p>继续未完成的内容，或开始一次新的品牌诊断。</p></div>
          <button class="button primary" data-go="select">新建诊断 <span>＋</span></button>
        </div>

        ${generating ? `
          <section class="draft">
            <div>
              <span class="draft-label">报告正在生成中</span>
              <h3>${escapeHtml(generating.name)}</h3>
              <p>通常需要 1 至 3 分钟。请稍后刷新工作台，即可领取完整报告。</p>
              <div class="progress-track"><i style="width:72%"></i></div>
            </div>
            <button class="button secondary" data-go="dashboard">刷新工作台</button>
          </section>` : draft ? `
          <section class="draft">
            <div>
              <span class="draft-label">未完成的诊断</span>
              <h3>${escapeHtml(draft.name)}</h3>
              <p>已完成 ${draft.progress}% · 上次保存：${formatDateTime(draft.updatedAt)}</p>
              <div class="progress-track"><i style="width:${draft.progress}%"></i></div>
            </div>
            <button class="button secondary" data-resume-id="${draft.id}">继续填写</button>
          </section>` : `
          <section class="draft">
            <div><span class="draft-label">开始诊断</span><h3>目前没有未完成的问卷</h3><p>选择个人品牌或企业品牌，开始一次新的诊断。</p></div>
            <button class="button secondary" data-go="select">开始诊断</button>
          </section>`}

        <h2 class="subheading">最近报告</h2>
        <section class="reports">
          ${completed.slice(0, 2).map((diagnosis) => `
            <article class="report-card">
              <small>${diagnosis.type === "personal" ? "PERSONAL BRAND" : "CORPORATE BRAND"} · ${formatDate(diagnosis.updatedAt)}</small>
              <h3>${escapeHtml(diagnosis.name)}</h3>
              <p class="score">${diagnosis.report?.overallScore || "未生成"} <span>/ 100</span></p>
              <button class="button text" data-report-id="${diagnosis.id}">查看报告 ›</button>
            </article>`).join("")}
          <article class="report-card new">
            <span class="plus">＋</span>
            <button class="button text" data-go="select">开始一次新诊断</button>
          </article>
        </section>
      </main>
    </div>
  `;
}

function renderTypeSelect() {
  const types = state.content?.brandTypes || {};
  const personal = types.personal || {};
  const corporate = types.corporate || {};
  return `
    <div class="shell">
      ${appHeader()}
      <main class="type-select">
        <div class="wrap">
          <p class="eyebrow">NEW DIAGNOSIS</p>
          <h1 class="page-title">你希望诊断哪一种品牌？</h1>
          <p>系统会自动保存。完整填写大约需要 12 到 18 分钟。</p>
          <div class="select-grid">
            <article class="select-card">
              <span class="select-card-number">01 / PERSONAL</span>
              <h2>${escapeHtml(personal.selectTitle || "个人品牌")}</h2>
              <p>${escapeHtml(personal.selectDescription || "")}</p>
              <ul>${(personal.bullets || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
              <button class="button primary" data-type="personal">选择个人品牌</button>
            </article>
            <article class="select-card">
              <span class="select-card-number">02 / CORPORATE</span>
              <h2>${escapeHtml(corporate.selectTitle || "企业品牌")}</h2>
              <p>${escapeHtml(corporate.selectDescription || "")}</p>
              <ul>${(corporate.bullets || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
              <button class="button primary" data-type="corporate">选择企业品牌</button>
            </article>
          </div>
        </div>
      </main>
    </div>
  `;
}

function renderQuestionnaire() {
  const questions = currentQuestions();
  const question = questions[state.questionIndex];
  const progress = Math.round(((state.questionIndex + 1) / questions.length) * 100);
  return `
    <div class="flow-page">
      <header class="flow-header">
        <div class="wrap flow-header-inner">${logo(true)}<button class="button text" data-go="dashboard">退出并保存</button></div>
      </header>
      <main class="flow-main">
        <div class="flow-meta"><span>${state.diagnosisType === "personal" ? "个人品牌诊断" : "企业品牌诊断"} · ${escapeHtml(state.activeDiagnosis?.name || state.user?.displayName || "")}</span><span>${progress}%</span></div>
        <div class="stepbar">${[0,1,2,3,4].map((step) => `<i class="${step < Math.ceil(progress / 20) ? "done" : ""}"></i>`).join("")}</div>
        <p class="question-kicker">${question.kicker}</p>
        <div class="question-notice"><strong>请认真填写。</strong>信息越具体、真实，诊断结论越有帮助。你提供的所有信息将被严格保密，不会向第三方透露，仅用于本次诊断与经你同意的后续服务。</div>
        <h1 class="question-title">${question.title}</h1>
        <p class="question-help">${question.help}</p>
        ${renderQuestionInput(question)}
      </main>
      <footer class="flow-actions">
        <div class="flow-actions-inner">
          <span class="save-state">✓ 内容已自动保存</span>
          <div class="action-pair">
            <button class="button secondary" data-action="previous-question" ${state.questionIndex === 0 ? "disabled" : ""}>上一步</button>
            <button class="button primary" data-action="next-question">${state.questionIndex === questions.length - 1 ? "生成诊断报告" : "继续"} <span>›</span></button>
          </div>
        </div>
      </footer>
    </div>
  `;
}

function renderQuestionInput(question) {
  if (question.type === "single") {
    return `<div class="option-list">${question.options.map((option) => `
      <button class="option ${state.answers[question.key] === option ? "selected" : ""}" data-answer="${escapeHtml(option)}">
        <span class="option-marker"></span><span>${escapeHtml(option)}</span>
      </button>`).join("")}</div>`;
  }
  if (question.type === "textarea") {
    return `<textarea class="textarea" data-question-input="${question.key}" placeholder="${escapeHtml(question.placeholder)}">${escapeHtml(state.answers[question.key] || "")}</textarea>`;
  }
  if (question.type === "text" || question.type === "email") {
    return `<div class="field contact-field"><label for="answer-${question.key}">必填</label><input class="input" id="answer-${question.key}" type="${question.type === "email" ? "email" : "text"}" data-question-input="${question.key}" value="${escapeHtml(state.answers[question.key] || "")}" placeholder="${escapeHtml(question.placeholder || "")}" autocomplete="${question.type === "email" ? "email" : "off"}" /></div>`;
  }
  if (question.type === "triple") {
    const values = Array.isArray(state.answers[question.key]) ? state.answers[question.key] : ["", "", ""];
    return `<div class="triple-fields">${values.map((value, index) => `
      <div class="field"><label for="${question.key}-${index}">${question.itemLabel || "内容"} ${index + 1}${index === 0 ? " *" : ""}</label><textarea class="textarea" id="${question.key}-${index}" data-triple-key="${question.key}" data-triple-index="${index}" placeholder="${index === 0 ? escapeHtml(question.firstPlaceholder || "") : "选填"}">${escapeHtml(value)}</textarea></div>`).join("")}</div>`;
  }
  const labels = question.scaleLabels || ["尚未建立", "较不一致", "部分一致", "基本一致", "高度一致"];
  return `
    <div class="range-wrap">
      <div class="range-labels"><span>完全不一致</span><span>高度一致</span></div>
      <div class="scale">${labels.map((label, index) => `
        <button class="${state.answers[question.key] === index + 1 ? "selected" : ""}" data-scale-key="${question.key}" data-scale="${index + 1}"><strong>${index + 1}</strong><span>${label}</span></button>`).join("")}</div>
    </div>`;
}

function renderLoading() {
  const ready = state.reportReady;
  return `
    <main class="loading-page">
      <section class="loading-box">
        <p class="eyebrow">REPORT GENERATION</p>
        <h1>正在形成你的品牌诊断。</h1>
        <p>${ready ? "报告已经整理好。回到工作台就能查看。" : "报告正在生成。通常需要 1 到 3 分钟。你可以先离开，稍后刷新工作台领取报告。"}</p>
        <div class="analysis-list">
          <div class="analysis-row ${ready ? "done" : "active"}"><span>梳理品牌定位</span><span>${ready ? "已完成" : "进行中"}</span></div>
          <div class="analysis-row ${ready ? "done" : ""}"><span>核对价值表达</span><span>${ready ? "已完成" : "等待中"}</span></div>
          <div class="analysis-row ${ready ? "done" : ""}"><span>检查信任证据</span><span>${ready ? "已完成" : "等待中"}</span></div>
          <div class="analysis-row ${ready ? "done" : ""}"><span>形成完整报告</span><span>${ready ? "可领取" : "等待中"}</span></div>
        </div>
        ${ready ? '<button class="button primary" style="margin-top:32px" data-go="dashboard">前往工作台领取报告</button>' : '<button class="button secondary" style="margin-top:32px" data-go="dashboard">稍后前往工作台查看</button>'}
      </section>
    </main>
  `;
}

function renderPreview() {
  const diagnosis = state.activeDiagnosis || {};
  const report = diagnosis.report || defaultReport();
  const dimensions = report.dimensions || defaultReport().dimensions;
  return `
    <div class="result-page">
      ${appHeader()}
      <main>
        <section class="result-hero">
          <div class="wrap">
            <span class="result-meta">${diagnosis.type === "corporate" ? "企业品牌诊断" : "个人品牌诊断"} · ${formatDate(diagnosis.updatedAt || new Date().toISOString())}</span>
            <h1 class="result-title">${escapeHtml(diagnosis.name || "品牌诊断")}</h1>
            <div class="score-layout">
              <div class="big-score"><strong>${report.overallScore}</strong><span> / 100</span><p>${escapeHtml(report.level)}</p></div>
              <div class="dimension-list">
                ${dimension("品牌定位", dimensions.positioning.score, 35, dimensions.positioning.status)}
                ${dimension("品牌价值", dimensions.value.score, 35, dimensions.value.status)}
                ${dimension("品牌信任状", dimensions.trust.score, 30, dimensions.trust.status)}
              </div>
            </div>
          </div>
        </section>
        <section class="wrap summary-section">
          <div class="summary-box"><h2>预检摘要</h2><p>${escapeHtml(report.summary)}</p></div>
          <div class="unlock">
            <div><h3>邀请权益已包含完整报告</h3><p>查看二级指标、判断依据、品牌表达建议和 90 天行动方案。</p></div>
            <button class="button primary" data-go="report">查看完整诊断报告 <span>›</span></button>
          </div>
          ${consultationBlock("报告咨询")}
        </section>
      </main>
    </div>
  `;
}

function dimension(name, value, total, status) {
  return `<div class="dimension"><span>${name}</span><div class="bar"><i style="width:${Math.round(value / total * 100)}%"></i></div><strong>${value}<small> / ${total}</small></strong><em>${status}</em></div>`;
}

function renderReport() {
  const diagnosis = state.activeDiagnosis || {};
  const report = diagnosis.report || defaultReport();
  const overview = report.brandOverview || defaultReport().brandOverview;
  const expressions = report.expressionSuggestions || defaultReport().expressionSuggestions;
  const actions = Array.isArray(report.actionPlan) ? report.actionPlan : defaultReport().actionPlan;
  const positioning = report.dimensions?.positioning || defaultReport().dimensions.positioning;
  const value = report.dimensions?.value || defaultReport().dimensions.value;
  const trust = report.dimensions?.trust || defaultReport().dimensions.trust;
  return `
    <div class="report-page">
      ${appHeader()}
      <main class="report-shell">
        <aside class="report-aside">
          <p>DIAGNOSIS REPORT</p>
          <nav>
            <button class="active">01 执行摘要</button><button>02 品牌全景</button><button>03 品牌定位</button><button>04 价值与信任</button><button>05 优先议题</button><button>06 信任资料</button><button>07 表达建议</button><button>08 行动方案</button>
          </nav>
          <button class="button secondary wide" data-toast="PDF 导出还没开放">导出 PDF</button>
        </aside>
        <article class="report-content">
          <p class="eyebrow">老黄的品牌三问</p>
          <h1>${escapeHtml(diagnosis.name || "品牌")}<br />诊断报告</h1>
          <p class="subtitle">品牌战略诊断工具 · ${formatDate(diagnosis.updatedAt || new Date().toISOString())}</p>

          <section class="report-section">
            <span class="report-section-label">01 / EXECUTIVE SUMMARY</span>
            <h2>执行摘要</h2>
            <p class="diagnosis-quote">${escapeHtml(report.summary)}</p>
            <span class="evidence-note">综合判断 · 基于用户陈述与现有资料</span>
          </section>

          <section class="report-section">
            <span class="report-section-label">02 / BRAND OVERVIEW</span>
            <h2>品牌全景</h2>
            <div class="insight-grid">
              <div class="insight"><span>当前优势</span><h3>已识别的品牌基础</h3><p>${escapeHtml(overview.currentStrength)}</p></div>
              <div class="insight"><span>问题</span><h3>当前最该处理的短板</h3><p>${escapeHtml(overview.keyIssue)}</p></div>
              <div class="insight"><span>最大机会</span><h3>下一阶段突破口</h3><p>${escapeHtml(overview.biggestOpportunity)}</p></div>
              <div class="insight"><span>资料可信度</span><h3>${Number(report.confidence || 0)}% · 信息完整度</h3><p>完整度反映本次填写内容对诊断结论的支撑程度。</p></div>
            </div>
          </section>

          <section class="report-section">
            <span class="report-section-label">03 / POSITIONING</span>
            <h2>品牌定位诊断</h2>
            <p>${escapeHtml(positioning.diagnosis)}</p>
            ${renderReportPoints("已有优势", positioning.strengths)}
            ${renderReportPoints("潜在风险", positioning.risks)}
            ${renderReportPoints("改进建议", positioning.recommendations)}
            <div class="suggestion"><small>建议的一句话定位</small><p>${escapeHtml(report.positioningStatement)}</p></div>
          </section>

          <section class="report-section">
            <span class="report-section-label">04 / VALUE & TRUST</span>
            <h2>价值与信任诊断</h2>
            <div class="insight-grid">
              <div class="insight"><span>品牌价值 · ${value.score}/35</span><h3>${escapeHtml(value.status)}</h3><p>${escapeHtml(value.diagnosis)}</p></div>
              <div class="insight"><span>品牌信任状 · ${trust.score}/30</span><h3>${escapeHtml(trust.status)}</h3><p>${escapeHtml(trust.diagnosis)}</p></div>
            </div>
            ${renderDimensionDetail("品牌价值深度判断", value)}
            ${renderDimensionDetail("品牌信任状深度判断", trust)}
            <div class="suggestion"><small>建议的价值主张</small><p>${escapeHtml(report.valueProposition)}</p></div>
            <div class="suggestion"><small>信任建设重点</small><p>${escapeHtml(report.trustPlan)}</p></div>
          </section>

          <section class="report-section">
            <span class="report-section-label">05 / PRIORITIES</span>
            <h2>先处理这些问题</h2>
            <div class="action-list">
              ${(report.priorityIssues || []).map((item) => `<div class="action-item"><div><small>${escapeHtml(item.dimension)} · ${escapeHtml(item.urgency)}优先级</small><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.description)}</p></div></div>`).join("")}
            </div>
          </section>

          <section class="report-section">
            <span class="report-section-label">06 / EVIDENCE</span>
            <h2>建议补充的信任资料</h2>
            <div class="insight-grid">
              ${(report.evidenceToCollect || []).map((item) => `<div class="insight"><span>${escapeHtml(item.title)}</span><h3>${escapeHtml(item.purpose)}</h3><p>${escapeHtml(item.example)}</p></div>`).join("")}
            </div>
          </section>

          <section class="report-section">
            <span class="report-section-label">07 / EXPRESSION</span>
            <h2>品牌表达建议</h2>
            <div class="insight-grid">
              <div class="insight"><span>首页标题</span><p>${escapeHtml(expressions.headline)}</p></div>
              <div class="insight"><span>品牌介绍</span><p>${escapeHtml(expressions.introduction)}</p></div>
              <div class="insight"><span>信任表达</span><p>${escapeHtml(expressions.proof)}</p></div>
            </div>
          </section>

          <section class="report-section">
            <span class="report-section-label">08 / ACTION PLAN</span>
            <h2>未来 90 天优先行动</h2>
            <div class="action-list">
              ${actions.map((item) => `<div class="action-item"><div><small>${escapeHtml(item.period)} · ${escapeHtml(item.priority)}优先级</small><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.detail)}</p></div></div>`).join("")}
            </div>
          </section>

          <section class="report-section">
            <span class="report-section-label">09 / CONSULTATION</span>
            <h2>需要继续往下聊？</h2>
            ${consultationBlock("完整报告咨询", true)}
          </section>
        </article>
      </main>
    </div>
  `;
}

function consultationBlock(source, compact = false) {
  const site = siteContent();
  return `
    <section class="consultation ${compact ? "compact" : ""}">
      <div>
        <p class="eyebrow">BRAND CONSULTATION</p>
        <h2>${escapeHtml(site.consultationTitle)}</h2>
        <p>${escapeHtml(site.consultationText)}</p>
        <button class="button secondary" data-consult-source="${escapeHtml(source)}">${escapeHtml(site.consultationButton)}</button>
      </div>
      <div class="wechat-qr">
        <img src="${escapeHtml(site.wechatQr)}" alt="老黄的微信二维码" loading="lazy" decoding="async" />
        <small>${escapeHtml(site.wechatNote)}</small>
      </div>
    </section>
  `;
}

function renderAdmin() {
  const data = state.adminData || { stats: {}, diagnoses: [], invites: [] };
  const tabs = [
    ["overview", "数据总览"],
    ["content", "内容管理"],
    ["questions", "问卷管理"],
    ["report", "报告设置"],
    ["assets", "素材管理"],
  ];
  return `
    <div class="shell">
      ${appHeader()}
      <main class="wrap admin-page">
        <div class="dashboard-top">
          <div><p class="eyebrow">ADMIN CONSOLE</p><h1>内容管理后台</h1><p>统一管理前台、问卷、素材、报告设置和用户诊断记录。</p></div>
          <button class="button secondary" data-action="refresh-admin">刷新数据</button>
        </div>
        <nav class="admin-tabs">${tabs.map(([key, label]) => `<button class="${state.adminTab === key ? "active" : ""}" data-admin-tab="${key}">${label}</button>`).join("")}</nav>
        ${state.adminTab === "overview" ? renderAdminOverview(data) : ""}
        ${state.adminTab === "content" ? renderContentManager() : ""}
        ${state.adminTab === "questions" ? renderQuestionManager() : ""}
        ${state.adminTab === "report" ? renderReportSettings() : ""}
        ${state.adminTab === "assets" ? renderAssetManager() : ""}
      </main>
    </div>
  `;
}

function renderAdminOverview(data) {
  const detail = state.adminDetail;
  return `
        <section class="admin-stats">
          ${adminStat("用户", data.stats.users || 0)}
          ${adminStat("诊断记录", data.stats.diagnoses || 0)}
          ${adminStat("已完成报告", data.stats.completed || 0)}
          ${adminStat("完整线索", data.stats.leads || 0)}
          ${adminStat("咨询意向", data.stats.consultations || 0)}
        </section>
        ${renderInviteManager(data.invites || [])}
        <section class="admin-layout">
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead><tr><th>姓名 / 品牌</th><th>联系方式</th><th>类型</th><th>状态</th><th>咨询</th><th>分数</th><th>更新时间</th><th></th></tr></thead>
              <tbody>
                ${data.diagnoses.length ? data.diagnoses.map((item) => `
                  <tr>
                    <td><strong>${escapeHtml(item.contact.name || item.name)}</strong><small>${escapeHtml(item.contact.email || "邮箱未填写")}</small></td>
                    <td>${escapeHtml(item.contact.method || "未填写")}</td>
                    <td>${item.type === "personal" ? "个人品牌" : "企业品牌"}</td>
                    <td>${item.status === "completed" ? "已完成" : `填写中 ${item.progress}%`}</td>
                    <td>${item.consultationRequestedAt ? "有意向" : "-"}</td>
                    <td>${item.score ?? "-"}</td>
                    <td>${formatDateTime(item.updatedAt)}</td>
                    <td class="admin-actions">
                      <button class="button text" data-admin-detail="${item.id}">问卷</button>
                      ${item.status === "completed" ? `<button class="button text" data-admin-report="${item.id}">报告</button>` : ""}
                    </td>
                  </tr>`).join("") : '<tr><td colspan="8" class="admin-empty">暂时还没有诊断数据。</td></tr>'}
              </tbody>
            </table>
          </div>
          ${detail ? renderAdminDetail(detail) : '<aside class="admin-detail empty"><p>选择一条记录查看问卷或已完成的报告。</p></aside>'}
        </section>
  `;
}

function renderInviteManager(invites) {
  const created = state.createdInvite;
  return `
    <section class="invite-manager">
      <div>
        <p class="eyebrow">INVITE ACCESS</p>
        <h2>邀请码管理</h2>
        <p>生成后可将邀请码发送给指定用户。每个邀请码仅可使用一次，自生成起 30 天内有效。</p>
      </div>
      <div class="invite-manager-actions">
        <button class="button primary" data-action="create-invite">生成一次性邀请码 <span>＋</span></button>
        ${created ? `<div class="new-invite"><span>刚生成的邀请码</span><code>${escapeHtml(created.code)}</code><small>有效至 ${formatDate(created.expiresAt)}</small></div>` : ""}
      </div>
      ${invites.length ? `<div class="invite-list">${invites.map((invite) => `<div><code>${escapeHtml(invite.code)}</code><span>${invite.status === "active" ? `${invite.used}/${invite.maxUses} 次使用` : "已停用"} · 有效至 ${formatDate(invite.expiresAt)}</span></div>`).join("")}</div>` : ""}
    </section>
  `;
}

function adminStat(label, value) {
  return `<article><span>${label}</span><strong>${value}</strong></article>`;
}

function renderContentManager() {
  const draft = editableContent();
  const site = draft.site || {};
  const fields = [
    ["site.brandName", "产品名称"],
    ["site.subtitle", "副标题"],
    ["site.heroEyebrow", "首页眉标"],
    ["site.heroTitle", "首页主标题"],
    ["site.heroLead", "首页说明"],
    ["site.primaryCta", "主按钮文字"],
    ["site.secondaryCta", "副按钮文字"],
    ["site.methodTitle", "类型区眉标"],
    ["site.methodIntro", "类型区说明"],
    ["site.reportStripTitle", "报告区标题"],
    ["site.footerLeft", "页脚左侧"],
    ["site.footerRight", "页脚右侧"],
    ["site.consultationTitle", "咨询区标题"],
    ["site.consultationText", "咨询区说明"],
    ["site.consultationButton", "咨询按钮"],
    ["site.wechatNote", "二维码说明"],
  ];
  return `
    ${renderContentToolbar()}
    <section class="admin-editor-grid">
      <article class="admin-panel">
        <h2>前台内容</h2>
        <div class="editor-fields">
          ${fields.map(([path, label]) => editorField(path, label, getPath(draft, path), path.includes("Lead") || path.includes("Text") || path.includes("Intro") || path.includes("Title"))).join("")}
        </div>
      </article>
      <article class="admin-panel">
        <h2>视觉素材引用</h2>
        ${editorField("site.heroImage", "首页主图地址", site.heroImage)}
        ${editorField("site.wechatQr", "微信二维码地址", site.wechatQr)}
        <p class="admin-help">可在“素材管理”上传图片，上传后会自动回填到对应字段。</p>
        <h2>品牌类型卡片</h2>
        ${renderBrandTypeFields("personal", "个人品牌")}
        ${renderBrandTypeFields("corporate", "企业品牌")}
        <h2>三问方法</h2>
        ${(draft.methods || []).map((item, index) => `
          <div class="mini-card">
            ${editorField(`methods.${index}.number`, "编号/分值", item.number)}
            ${editorField(`methods.${index}.title`, "标题", item.title)}
            ${editorField(`methods.${index}.description`, "说明", item.description, true)}
          </div>`).join("")}
      </article>
    </section>
  `;
}

function renderBrandTypeFields(type, label) {
  const base = `brandTypes.${type}`;
  const item = getPath(editableContent(), base) || {};
  return `
    <div class="mini-card">
      <strong>${escapeHtml(label)}</strong>
      ${editorField(`${base}.tag`, "英文标签", item.tag)}
      ${editorField(`${base}.title`, "卡片标题", item.title)}
      ${editorField(`${base}.description`, "卡片说明", item.description, true)}
      ${editorField(`${base}.selectTitle`, "选择页标题", item.selectTitle)}
      ${editorField(`${base}.selectDescription`, "选择页说明", item.selectDescription, true)}
      ${editorTextarea(`${base}.bullets`, "选择页要点（一行一个）", (item.bullets || []).join("\n"))}
    </div>
  `;
}

function renderQuestionManager() {
  const draft = editableContent();
  return `
    ${renderContentToolbar()}
    <section class="admin-editor-grid">
      ${["personal", "corporate"].map((type) => `
        <article class="admin-panel">
          <div class="panel-heading"><h2>${type === "personal" ? "个人品牌问卷" : "企业品牌问卷"}</h2><button class="button secondary" data-add-question="${type}">新增题目</button></div>
          <div class="question-editor-list">
            ${(draft.questions?.[type] || []).map((question, index) => renderQuestionEditor(type, question, index)).join("")}
          </div>
        </article>`).join("")}
    </section>
  `;
}

function renderQuestionEditor(type, question, index) {
  const locked = ["contactName", "contactMethod", "email"].includes(question.key);
  const optionsText = (question.options || []).join("\n");
  const scaleText = (question.scaleLabels || []).join("\n");
  return `
    <div class="question-editor mini-card">
      <div class="question-editor-top">
        <strong>${index + 1}. ${escapeHtml(question.title || "未命名题目")}</strong>
        <span>
          <button class="button text" data-move-question="${type}:${index}:-1">上移</button>
          <button class="button text" data-move-question="${type}:${index}:1">下移</button>
          <button class="button text" data-delete-question="${type}:${index}" ${locked ? "disabled" : ""}>删除</button>
        </span>
      </div>
      <div class="question-grid">
        ${editorField(`questions.${type}.${index}.key`, "Key", question.key, false, locked)}
        ${editorSelect(`questions.${type}.${index}.type`, "题型", question.type, [["text", "文本"], ["email", "邮箱"], ["textarea", "长文本"], ["single", "单选"], ["triple", "三空格"], ["scale", "评分"]])}
        ${editorField(`questions.${type}.${index}.module`, "模块", question.module)}
        ${editorField(`questions.${type}.${index}.kicker`, "眉标", question.kicker)}
      </div>
      ${editorField(`questions.${type}.${index}.title`, "题目标题", question.title, true)}
      ${editorField(`questions.${type}.${index}.help`, "帮助说明", question.help, true)}
      ${editorField(`questions.${type}.${index}.placeholder`, "占位提示", question.placeholder, true)}
      ${editorField(`questions.${type}.${index}.itemLabel`, "三空格标签", question.itemLabel)}
      ${editorField(`questions.${type}.${index}.firstPlaceholder`, "第一个空格提示", question.firstPlaceholder, true)}
      ${editorTextarea(`questions.${type}.${index}.options`, "单选选项（一行一个）", optionsText)}
      ${editorTextarea(`questions.${type}.${index}.scaleLabels`, "评分标签（必须 5 行）", scaleText)}
    </div>
  `;
}

function renderReportSettings() {
  const draft = editableContent();
  const report = draft.reportConfig || {};
  return `
    ${renderContentToolbar()}
    <section class="admin-editor-grid">
      <article class="admin-panel">
        <h2>评分权重</h2>
        <div class="question-grid">
          ${editorField("reportConfig.scoring.positioning", "品牌定位", report.scoring?.positioning)}
          ${editorField("reportConfig.scoring.value", "品牌价值", report.scoring?.value)}
          ${editorField("reportConfig.scoring.trust", "品牌信任状", report.scoring?.trust)}
        </div>
        ${editorTextarea("reportConfig.levels", "等级文案（格式：最低分|文案）", (report.levels || []).map((item) => `${item.min}|${item.label}`).join("\n"))}
        ${editorTextarea("reportConfig.sections", "报告章节（一行一个）", (report.sections || []).join("\n"))}
      </article>
      <article class="admin-panel">
        <h2>生成规则</h2>
        ${editorField("reportConfig.model", "默认模型", report.model)}
        ${editorTextarea("reportConfig.systemPrompt", "系统提示词", report.systemPrompt || "")}
        ${editorTextarea("reportConfig.generationTask", "生成任务说明", report.generationTask || "")}
        <div class="report-preview-box"><strong>报告结构预览</strong><p>${(report.sections || []).map(escapeHtml).join(" / ")}</p></div>
      </article>
    </section>
  `;
}

function renderAssetManager() {
  const versions = state.adminContent?.versions || [];
  return `
    ${renderContentToolbar()}
    <section class="admin-editor-grid">
      <article class="admin-panel">
        <h2>上传素材</h2>
        <label class="file-upload">上传首页主图<input type="file" accept="image/png,image/jpeg,image/webp" data-upload-asset="site.heroImage" /></label>
        <label class="file-upload">上传微信二维码<input type="file" accept="image/png,image/jpeg,image/webp" data-upload-asset="site.wechatQr" /></label>
        <p class="admin-help">支持 jpg、png、webp，单张不超过 5MB。上传后先进入草稿，需要点击发布才会对用户生效。</p>
      </article>
      <article class="admin-panel">
        <h2>历史版本</h2>
        <div class="version-list">
          ${versions.length ? versions.map((version) => `<div><strong>${escapeHtml(version.version)}</strong><span>${formatDateTime(version.publishedAt)}</span><button class="button text" data-rollback-version="${escapeHtml(version.version)}">回滚到此版本</button></div>`).join("") : "<p class='admin-help'>还没有历史发布版本。</p>"}
        </div>
      </article>
    </section>
  `;
}

function renderContentToolbar() {
  const published = state.adminContent?.published;
  const draft = editableContent();
  return `
    <section class="content-toolbar">
      <div>
        <strong>当前发布版本：${escapeHtml(published?.version || "default")}</strong>
        <span>草稿更新时间：${formatDateTime(draft.updatedAt || new Date().toISOString())}</span>
      </div>
      <div>
        <button class="button secondary" data-action="preview-draft-home">预览首页</button>
        <button class="button secondary" data-action="save-content-draft">保存草稿</button>
        <button class="button primary" data-action="publish-content">发布草稿</button>
      </div>
    </section>
  `;
}

function editorField(path, label, value, multiline = false, disabled = false) {
  const input = multiline
    ? `<textarea class="textarea small" data-content-path="${escapeHtml(path)}" ${disabled ? "disabled" : ""}>${escapeHtml(value || "")}</textarea>`
    : `<input class="input compact" data-content-path="${escapeHtml(path)}" value="${escapeHtml(value || "")}" ${disabled ? "disabled" : ""} />`;
  return `<label class="editor-field"><span>${escapeHtml(label)}</span>${input}</label>`;
}

function editorTextarea(path, label, value) {
  return `<label class="editor-field"><span>${escapeHtml(label)}</span><textarea class="textarea small" data-content-path="${escapeHtml(path)}">${escapeHtml(value || "")}</textarea></label>`;
}

function editorSelect(path, label, value, options) {
  return `<label class="editor-field"><span>${escapeHtml(label)}</span><select class="input compact" data-content-path="${escapeHtml(path)}">${options.map(([key, name]) => `<option value="${escapeHtml(key)}" ${value === key ? "selected" : ""}>${escapeHtml(name)}</option>`).join("")}</select></label>`;
}

function editableContent() {
  if (!state.adminContent?.draft) {
    state.adminContent = state.adminContent || {};
    state.adminContent.draft = structuredCloneSafe(state.content || defaultClientContent());
  }
  return state.adminContent.draft;
}

function updateContentFromInputs() {
  const draft = editableContent();
  document.querySelectorAll("[data-content-path]").forEach((element) => {
    const path = element.dataset.contentPath;
    let value = element.value;
    if (path.endsWith(".options") || path.endsWith(".scaleLabels") || path.endsWith(".bullets") || path === "reportConfig.sections") {
      value = value.split("\n").map((item) => item.trim()).filter(Boolean);
    }
    if (path === "reportConfig.levels") {
      value = value.split("\n").map((line) => {
        const [min, ...label] = line.split("|");
        return { min: Number(min), label: label.join("|").trim() };
      }).filter((item) => Number.isFinite(item.min) && item.label);
    }
    if (/reportConfig\.scoring\./.test(path)) value = Number(value) || 0;
    setPath(draft, path, value);
  });
  draft.updatedAt = new Date().toISOString();
}

function getPath(target, path) {
  return String(path).split(".").reduce((value, key) => value?.[key], target);
}

function setPath(target, path, value) {
  const parts = String(path).split(".");
  let current = target;
  parts.slice(0, -1).forEach((part) => {
    if (/^\d+$/.test(part)) part = Number(part);
    if (current[part] == null) current[part] = {};
    current = current[part];
  });
  const last = parts[parts.length - 1];
  current[/^\d+$/.test(last) ? Number(last) : last] = value;
}

function structuredCloneSafe(value) {
  return JSON.parse(JSON.stringify(value));
}

function defaultClientContent() {
  return {
    version: "default",
    status: "published",
    updatedAt: new Date().toISOString(),
    site: {
      brandName: "老黄的品牌三问",
      subtitle: "品牌战略诊断工具",
      heroEyebrow: "品牌战略诊断工具",
      heroTitle: "先把品牌讲明白，\\n再谈增长。",
      heroLead: "这套工具只问三件事：你是谁，别人为什么选你，别人凭什么信你。填完问卷后，你会拿到一份能直接拿来改表达、补案例、调方向的诊断报告。",
      primaryCta: "输入邀请码",
      secondaryCta: "看看怎么判断",
      heroImage: "/assets/brand-three-questions-hero.svg",
      footerLeft: "老黄的品牌三问 · 品牌战略诊断工具",
      footerRight: "仅限受邀用户访问",
      consultationTitle: "看完报告，想继续往下走。",
      consultationText: "扫码加老黄微信，备注“品牌三问”。如果你需要 1 对 1 梳理，我会先看你的报告，再判断该从哪里聊。",
      consultationButton: "登记咨询意向",
      wechatQr: "/assets/contact-placeholder.svg",
      wechatNote: "扫码添加微信 · 请备注“品牌三问”",
      methodTitle: "老黄只看三件事",
      methodIntro: "定位说不清，价值就很难被选中。信任没有证据，承诺再好也悬。",
      reportStripTitle: "报告会告诉你先改哪里",
    },
    methods: [
      { key: "positioning", number: "01 / 35 分", title: "品牌定位", description: "看别人能不能一句话听懂你是谁、服务谁、想占什么位置。" },
      { key: "value", number: "02 / 35 分", title: "品牌价值", description: "看用户选你之后，能得到什么具体结果，而不是只听你说自己专业。" },
      { key: "trust", number: "03 / 30 分", title: "品牌信任状", description: "看案例、数据、评价和作品能不能撑住你的承诺。" },
    ],
    brandTypes: {
      personal: { tag: "PERSONAL BRAND", title: "个人品牌诊断", description: "适合创始人、顾问、讲师、内容创作者，以及想把专业能力讲清楚的人。", selectTitle: "个人品牌", selectDescription: "梳理你的专业身份、目标对象、价值表达和可信证据。", bullets: ["专家、顾问与自由职业者", "创始人和企业管理者", "内容创作者与知识型 IP"] },
      corporate: { tag: "COMPANY BRAND", title: "企业品牌诊断", description: "适合新品牌、新业务和正在升级的企业。先看定位、价值和信任，再谈传播。", selectTitle: "企业品牌", selectDescription: "检查你的市场定位、客户价值、差异化和信任资产。", bullets: ["初创与成长型企业", "新品牌、新产品与新业务", "成熟企业品牌升级"] },
    },
    questions: structuredCloneSafe(window.QUESTION_SETS),
    reportConfig: {
      scoring: { positioning: 35, value: 35, trust: 30 },
      model: "MiniMax-M3",
      systemPrompt: "你是严谨、克制的中文品牌战略顾问。仅依据用户答案判断，不得虚构客户、成果、数据、资质或市场事实。",
      generationTask: "生成品牌战略诊断报告",
      levels: [
        { min: 85, label: "A 级 · 品牌引领" },
        { min: 70, label: "B 级 · 品牌成长" },
        { min: 55, label: "C 级 · 品牌成形" },
        { min: 40, label: "D 级 · 品牌模糊" },
        { min: 0, label: "E 级 · 品牌起步" },
      ],
      sections: ["执行摘要", "品牌全景", "品牌定位诊断", "价值与信任诊断", "优先议题", "信任资料", "表达建议", "行动方案"],
    },
  };
}

function siteContent() {
  return (state.content || defaultClientContent()).site;
}

function formatHeroTitle(value) {
  const escaped = escapeHtml(value || "");
  const parts = escaped.split(/\\n|\n/);
  if (parts.length > 1) return `${parts[0]}<br /><em>${parts.slice(1).join("<br />")}</em>`;
  return escaped;
}

function renderAdminDetail(diagnosis) {
  const questions = diagnosis.questionSnapshot?.length ? diagnosis.questionSnapshot : (state.content?.questions?.[diagnosis.type] || window.QUESTION_SETS[diagnosis.type] || []);
  const hasReport = diagnosis.status === "completed" && diagnosis.report;
  return `
    <aside class="admin-detail">
      <button class="button text admin-close" data-action="close-admin-detail">关闭</button>
      <p class="eyebrow">DIAGNOSIS DETAIL</p>
      <h2>${escapeHtml(diagnosis.name)}</h2>
      ${hasReport ? '<button class="button primary wide admin-report-button" data-action="open-admin-report">查看用户完整报告 <span>›</span></button>' : '<p class="admin-report-pending">这份报告尚未完成生成。</p>'}
      ${hasReport ? renderReportRevisionForm(diagnosis.report) : ""}
      <div class="admin-contact">
        <p><span>姓名</span>${escapeHtml(diagnosis.answers.contactName || "未填写")}</p>
        <p><span>联系方式</span>${escapeHtml(diagnosis.answers.contactMethod || "未填写")}</p>
        <p><span>邮箱</span>${escapeHtml(diagnosis.answers.email || "未填写")}</p>
      </div>
      <div class="answer-list">
        ${questions.map((question) => {
          const value = diagnosis.answers[question.key];
          const display = Array.isArray(value) ? value.filter(Boolean).join("；") : value;
          return `<div><span>${escapeHtml(question.title)}</span><p>${escapeHtml(display || "未填写")}</p></div>`;
        }).join("")}
      </div>
    </aside>
  `;
}

function renderReportRevisionForm(report) {
  return `
    <div class="report-revision">
      <h3>人工修订报告</h3>
      <p>保存后，用户看到的是修订版；原始生成报告会保留在后台数据中。</p>
      ${reportField("summary", "执行摘要", report.summary)}
      ${reportField("brandOverview.currentStrength", "当前优势", report.brandOverview?.currentStrength)}
      ${reportField("brandOverview.keyIssue", "主要问题", report.brandOverview?.keyIssue)}
      ${reportField("brandOverview.biggestOpportunity", "最大机会", report.brandOverview?.biggestOpportunity)}
      ${reportField("positioningStatement", "一句话定位", report.positioningStatement)}
      ${reportField("valueProposition", "价值主张", report.valueProposition)}
      ${reportField("trustPlan", "信任建设重点", report.trustPlan)}
      <button class="button secondary wide" data-action="save-report-revision">保存报告修订</button>
    </div>
  `;
}

function reportField(path, label, value) {
  return `<label class="editor-field"><span>${escapeHtml(label)}</span><textarea class="textarea small" data-report-path="${escapeHtml(path)}">${escapeHtml(value || "")}</textarea></label>`;
}

function bindEvents() {
  document.querySelectorAll("[data-go]").forEach((element) => {
    element.addEventListener("click", async () => {
      clearTimeout(state.loadingTimer);
      if (element.dataset.go === "dashboard") {
        await loadDashboard();
      } else {
        state.screen = element.dataset.go;
      }
      render();
    });
  });

  document.querySelectorAll("[data-scroll]").forEach((element) => {
    element.addEventListener("click", () => document.querySelector(`#${element.dataset.scroll}`)?.scrollIntoView({ behavior: "smooth" }));
  });

  document.querySelectorAll("[data-toast]").forEach((element) => {
    element.addEventListener("click", () => showToast(element.dataset.toast));
  });

  const inviteInput = document.querySelector("#inviteCode");
  inviteInput?.addEventListener("input", (event) => { state.invite = event.target.value; });

  document.querySelector("[data-action='verify-invite']")?.addEventListener("click", async () => {
    try {
      const result = await api("/api/auth/invite", {
        method: "POST",
        body: JSON.stringify({ code: state.invite }),
      });
      state.user = result.user;
      if (state.user.role === "admin") await loadAdmin();
      else await loadDashboard();
      render();
    } catch (error) {
      showToast(error.message);
    }
  });

  document.querySelectorAll("[data-type]").forEach((element) => {
    element.addEventListener("click", async () => {
      try {
        state.diagnosisType = element.dataset.type;
        const result = await api("/api/diagnoses", {
          method: "POST",
          body: JSON.stringify({ type: state.diagnosisType }),
        });
        state.diagnosisId = result.diagnosis.id;
        state.activeDiagnosis = result.diagnosis;
        state.answers = createEmptyAnswers(state.diagnosisType);
        state.questionIndex = 0;
        state.screen = "questionnaire";
        render();
      } catch (error) {
        showToast(error.message);
      }
    });
  });

  document.querySelector("[data-action='open-admin']")?.addEventListener("click", loadAndRenderAdmin);
  document.querySelector("[data-action='refresh-admin']")?.addEventListener("click", loadAndRenderAdmin);
  document.querySelectorAll("[data-admin-tab]").forEach((element) => {
    element.addEventListener("click", () => {
      updateContentFromInputs();
      state.adminTab = element.dataset.adminTab;
      render();
    });
  });
  document.querySelector("[data-action='save-content-draft']")?.addEventListener("click", saveContentDraft);
  document.querySelector("[data-action='publish-content']")?.addEventListener("click", publishContent);
  document.querySelector("[data-action='preview-draft-home']")?.addEventListener("click", () => {
    updateContentFromInputs();
    state.content = structuredCloneSafe(editableContent());
    state.screen = "home";
    render();
  });
  document.querySelectorAll("[data-add-question]").forEach((element) => {
    element.addEventListener("click", () => {
      updateContentFromInputs();
      const type = element.dataset.addQuestion;
      editableContent().questions[type].push({
        key: `customQuestion${Date.now()}`,
        module: "自定义模块",
        kicker: "自定义题目",
        title: "新的问题",
        help: "请填写这道题的说明。",
        type: "textarea",
        placeholder: "请输入答案",
        options: [],
        scaleLabels: ["尚未建立", "较不一致", "部分一致", "基本一致", "高度一致"],
      });
      render();
    });
  });
  document.querySelectorAll("[data-move-question]").forEach((element) => {
    element.addEventListener("click", () => {
      updateContentFromInputs();
      const [type, rawIndex, rawDelta] = element.dataset.moveQuestion.split(":");
      const index = Number(rawIndex);
      const nextIndex = index + Number(rawDelta);
      const questions = editableContent().questions[type];
      if (nextIndex < 0 || nextIndex >= questions.length) return;
      [questions[index], questions[nextIndex]] = [questions[nextIndex], questions[index]];
      render();
    });
  });
  document.querySelectorAll("[data-delete-question]").forEach((element) => {
    element.addEventListener("click", () => {
      updateContentFromInputs();
      const [type, rawIndex] = element.dataset.deleteQuestion.split(":");
      editableContent().questions[type].splice(Number(rawIndex), 1);
      render();
    });
  });
  document.querySelectorAll("[data-upload-asset]").forEach((element) => {
    element.addEventListener("change", () => uploadAsset(element));
  });
  document.querySelectorAll("[data-rollback-version]").forEach((element) => {
    element.addEventListener("click", () => rollbackContent(element.dataset.rollbackVersion));
  });
  document.querySelector("[data-action='save-report-revision']")?.addEventListener("click", saveReportRevision);
  document.querySelector("[data-action='create-invite']")?.addEventListener("click", async () => {
    try {
      const result = await api("/api/admin/invites", { method: "POST" });
      state.createdInvite = result.invite;
      await loadAdmin();
      render();
    } catch (error) {
      showToast(error.message);
    }
  });
  document.querySelector("[data-action='close-admin-detail']")?.addEventListener("click", () => {
    state.adminDetail = null;
    render();
  });
  document.querySelector("[data-action='open-admin-report']")?.addEventListener("click", () => {
    state.activeDiagnosis = state.adminDetail;
    state.screen = "report";
    render();
  });
  document.querySelectorAll("[data-admin-detail]").forEach((element) => {
    element.addEventListener("click", async () => {
      try {
        const result = await api(`/api/admin/diagnoses/${element.dataset.adminDetail}`);
        state.adminDetail = result.diagnosis;
        render();
      } catch (error) {
        showToast(error.message);
      }
    });
  });
  document.querySelectorAll("[data-admin-report]").forEach((element) => {
    element.addEventListener("click", async () => {
      try {
        const result = await api(`/api/admin/diagnoses/${element.dataset.adminReport}`);
        state.adminDetail = result.diagnosis;
        state.activeDiagnosis = result.diagnosis;
        state.screen = "report";
        render();
      } catch (error) {
        showToast(error.message);
      }
    });
  });
  document.querySelectorAll("[data-consult-source]").forEach((element) => {
    element.addEventListener("click", async () => {
      if (!state.diagnosisId) {
        showToast("可直接扫描页面上的二维码添加老黄微信。");
        return;
      }
      try {
        await api(`/api/diagnoses/${state.diagnosisId}/consultation`, {
          method: "POST",
          body: JSON.stringify({ source: element.dataset.consultSource }),
        });
        showToast("已登记咨询意向，也可以直接扫码添加老黄微信。");
      } catch (error) {
        showToast(error.message);
      }
    });
  });

  document.querySelectorAll("[data-answer]").forEach((element) => {
    element.addEventListener("click", () => {
      const question = currentQuestions()[state.questionIndex];
      state.answers[question.key] = element.dataset.answer;
      render();
    });
  });

  document.querySelector("[data-question-input]")?.addEventListener("input", (event) => {
    state.answers[event.target.dataset.questionInput] = event.target.value;
  });

  document.querySelectorAll("[data-triple-index]").forEach((element) => {
    element.addEventListener("input", (event) => {
      const key = event.target.dataset.tripleKey;
      if (!Array.isArray(state.answers[key])) state.answers[key] = ["", "", ""];
      state.answers[key][Number(event.target.dataset.tripleIndex)] = event.target.value;
    });
  });

  document.querySelectorAll("[data-scale-key]").forEach((element) => {
    element.addEventListener("click", () => {
      state.answers[element.dataset.scaleKey] = Number(element.dataset.scale);
      render();
    });
  });

  document.querySelectorAll("[data-resume-id]").forEach((element) => {
    element.addEventListener("click", async () => {
      try {
        await openDiagnosis(element.dataset.resumeId, false);
      } catch (error) {
        showToast(error.message);
      }
    });
  });

  document.querySelectorAll("[data-report-id]").forEach((element) => {
    element.addEventListener("click", async () => {
      try {
        await openDiagnosis(element.dataset.reportId, true);
      } catch (error) {
        showToast(error.message);
      }
    });
  });

  document.querySelector("[data-action='previous-question']")?.addEventListener("click", () => {
    state.questionIndex = Math.max(0, state.questionIndex - 1);
    render();
  });

  document.querySelector("[data-action='next-question']")?.addEventListener("click", async () => {
    if (!canContinue()) {
      showToast("请先完成这一页的主要问题");
      return;
    }
    try {
      await saveAnswers();
    } catch (error) {
      showToast(`保存失败：${error.message}`);
      return;
    }
    const questions = currentQuestions();
    if (state.questionIndex < questions.length - 1) {
      state.questionIndex += 1;
      render();
      return;
    }
    state.screen = "loading";
    state.reportReady = false;
    render();
    try {
      const result = await api(`/api/diagnoses/${state.diagnosisId}/generate`, { method: "POST" });
      state.activeDiagnosis = result.diagnosis;
      state.reportReady = result.diagnosis.status === "completed";
      if (state.screen === "loading") render();
    } catch (error) {
      showToast(`报告生成失败：${error.message}`);
      state.screen = "questionnaire";
      render();
    }
  });
}

async function saveAnswers() {
  if (!state.diagnosisId) return;
  const progress = Math.round(((state.questionIndex + 1) / currentQuestions().length) * 100);
  const result = await api(`/api/diagnoses/${state.diagnosisId}/answers`, {
    method: "PUT",
    body: JSON.stringify({ answers: state.answers, progress }),
  });
  state.activeDiagnosis = result.diagnosis;
}

function canContinue() {
  const question = currentQuestions()[state.questionIndex];
  const answer = state.answers[question.key];
  if (question.type === "single") return Boolean(answer);
  if (question.type === "text") return String(answer || "").trim().length >= (question.key === "contactMethod" ? 5 : 2);
  if (question.type === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(answer || "").trim());
  if (question.type === "textarea") return String(answer || "").trim().length >= 4;
  if (question.type === "triple") return Array.isArray(answer) && String(answer[0] || "").trim().length >= 4;
  return Number(answer) > 0;
}

async function loadDashboard() {
  const result = await api("/api/dashboard");
  state.user = result.user;
  state.diagnoses = result.diagnoses;
  state.screen = "dashboard";
}

async function loadAdmin() {
  const [overview, content] = await Promise.all([
    api("/api/admin/overview"),
    api("/api/admin/content"),
  ]);
  state.adminData = overview;
  state.adminContent = content;
  state.content = content.published || state.content;
  state.screen = "admin";
}

async function loadContent() {
  try {
    const result = await api("/api/content");
    state.content = result.content || defaultClientContent();
    window.QUESTION_SETS = state.content.questions || window.QUESTION_SETS;
  } catch {
    state.content = defaultClientContent();
  }
}

async function saveContentDraft() {
  try {
    const result = await persistContentDraft();
    showToast("草稿已保存，还没有影响用户端。");
    render();
    return result;
  } catch (error) {
    showToast(error.message);
    throw error;
  }
}

async function persistContentDraft() {
  updateContentFromInputs();
  const result = await api("/api/admin/content/draft", {
    method: "PUT",
    body: JSON.stringify({ content: editableContent() }),
  });
  state.adminContent.draft = result.draft;
  return result;
}

async function publishContent() {
  try {
    await persistContentDraft();
    const result = await api("/api/admin/content/publish", { method: "POST" });
    state.adminContent = result;
    state.content = result.published;
    window.QUESTION_SETS = result.published.questions || window.QUESTION_SETS;
    showToast("已发布，新建诊断将使用新版本。");
    render();
  } catch (error) {
    showToast(error.message);
  }
}

async function rollbackContent(version) {
  try {
    const result = await api("/api/admin/content/rollback", {
      method: "POST",
      body: JSON.stringify({ version }),
    });
    state.adminContent.published = result.published;
    state.adminContent.draft = structuredCloneSafe(result.published);
    state.adminContent.versions = result.versions;
    state.content = result.published;
    showToast("已回滚并发布为新版本。");
    render();
  } catch (error) {
    showToast(error.message);
  }
}

async function uploadAsset(input) {
  const file = input.files?.[0];
  if (!file) return;
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    showToast("只支持 jpg、png 或 webp 图片。");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast("图片不能超过 5MB。");
    return;
  }
  try {
    const data = await readFileAsDataUrl(file);
    const result = await api("/api/admin/assets", {
      method: "POST",
      body: JSON.stringify({ name: file.name, contentType: file.type, data }),
    });
    updateContentFromInputs();
    setPath(editableContent(), input.dataset.uploadAsset, result.asset.url);
    await persistContentDraft();
    showToast("图片已上传并写入草稿。");
  } catch (error) {
    showToast(error.message);
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("图片读取失败。"));
    reader.readAsDataURL(file);
  });
}

async function saveReportRevision() {
  if (!state.adminDetail?.report) return;
  const report = structuredCloneSafe(state.adminDetail.report);
  document.querySelectorAll("[data-report-path]").forEach((element) => setPath(report, element.dataset.reportPath, element.value));
  try {
    const result = await api(`/api/admin/diagnoses/${state.adminDetail.id}/report`, {
      method: "PATCH",
      body: JSON.stringify({ report }),
    });
    state.adminDetail = result.diagnosis;
    state.activeDiagnosis = result.diagnosis;
    showToast("报告修订已保存，用户将看到修订版。");
    render();
  } catch (error) {
    showToast(error.message);
  }
}

async function loadAndRenderAdmin() {
  try {
    await loadAdmin();
    render();
  } catch (error) {
    showToast(error.message);
  }
}

async function openDiagnosis(id, showReport) {
  const result = await api(`/api/diagnoses/${id}`);
  const diagnosis = result.diagnosis;
  state.activeDiagnosis = diagnosis;
  state.diagnosisId = diagnosis.id;
  state.diagnosisType = diagnosis.type;
  state.answers = { ...createEmptyAnswers(diagnosis.type), ...(diagnosis.answers || {}) };
  if (showReport && diagnosis.report) {
    state.screen = "preview";
  } else {
    const count = currentQuestions().length;
    state.questionIndex = Math.min(count - 1, Math.floor((diagnosis.progress / 100) * count));
    state.screen = "questionnaire";
  }
  render();
}

function defaultReport() {
  return {
    overallScore: 0,
    level: "尚未生成",
    summary: "报告正在准备中。",
    dimensions: {
      positioning: { score: 0, status: "待分析", diagnosis: "报告正在准备中。", strengths: [], risks: [], recommendations: [] },
      value: { score: 0, status: "待分析", diagnosis: "报告正在准备中。", strengths: [], risks: [], recommendations: [] },
      trust: { score: 0, status: "待分析", diagnosis: "报告正在准备中。", strengths: [], risks: [], recommendations: [] },
    },
    brandOverview: {
      currentStrength: "报告正在准备中。",
      keyIssue: "报告正在准备中。",
      biggestOpportunity: "报告正在准备中。",
    },
    positioningStatement: "报告正在准备中。",
    valueProposition: "报告正在准备中。",
    trustPlan: "报告正在准备中。",
    expressionSuggestions: {
      headline: "报告正在准备中。",
      introduction: "报告正在准备中。",
      proof: "报告正在准备中。",
    },
    actionPlan: [
      { period: "0-30天", priority: "高", title: "统一核心定位", detail: "统一主页、内容和产品中的身份与目标对象表达。" },
      { period: "31-60天", priority: "高", title: "整理代表案例", detail: "按照问题、方法、结果和证据重写三个代表案例。" },
      { period: "61-90天", priority: "中", title: "建立证据体系", detail: "持续积累评价、成果数据、作品和第三方认可。" },
    ],
    priorityIssues: [],
    evidenceToCollect: [],
  };
}

function renderReportPoints(title, items) {
  const values = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!values.length) return "";
  return `<div class="suggestion"><small>${escapeHtml(title)}</small><p>${values.map(escapeHtml).join("；")}</p></div>`;
}

function renderDimensionDetail(title, dimension) {
  const strengths = Array.isArray(dimension.strengths) ? dimension.strengths : [];
  const risks = Array.isArray(dimension.risks) ? dimension.risks : [];
  const recommendations = Array.isArray(dimension.recommendations) ? dimension.recommendations : [];
  return `<div class="suggestion"><small>${escapeHtml(title)} / 优势</small><p>${strengths.map(escapeHtml).join("；") || "待补充"}</p></div>
    <div class="suggestion"><small>${escapeHtml(title)} / 风险</small><p>${risks.map(escapeHtml).join("；") || "待补充"}</p></div>
    <div class="suggestion"><small>${escapeHtml(title)} / 建议</small><p>${recommendations.map(escapeHtml).join("；") || "待补充"}</p></div>`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function bootstrap() {
  const contentPromise = loadContent();
  const sessionPromise = api("/api/session");
  try {
    const session = await sessionPromise;
    await contentPromise;
    state.user = session.user;
    if (state.user.role === "admin") await loadAdmin();
    else await loadDashboard();
  } catch {
    await contentPromise;
    state.screen = "home";
  }
  render();
}

bootstrap();
