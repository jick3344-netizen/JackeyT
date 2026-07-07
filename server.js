const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const host = "127.0.0.1";
const port = Number(process.env.PORT || 4188);
const publicDir = path.join(__dirname, "public");
const dataDir = path.join(__dirname, "data");
const storePath = path.join(dataDir, "store.json");

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
};

ensureStore();

http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
      return;
    }
    serveStatic(response, url.pathname);
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: "服务暂时不可用，请稍后再试。" });
  }
}).listen(port, host, () => {
  console.log(`老黄的品牌三问已启动：http://${host}:${port}`);
});

async function handleApi(request, response, url) {
  if (request.method === "POST" && url.pathname === "/api/auth/invite") {
    const body = await readJson(request);
    const store = readStore();
    const code = String(body.code || "").trim().toUpperCase();
    const invite = store.invites.find((item) => item.code === code);

    if (!invite || invite.status !== "active") {
      sendJson(response, 403, { error: "邀请码无效或已停用。" });
      return;
    }
    if (invite.expiresAt && Date.now() > Date.parse(invite.expiresAt)) {
      sendJson(response, 403, { error: "邀请码已过期。" });
      return;
    }
    if (invite.used >= invite.maxUses) {
      sendJson(response, 403, { error: "邀请码使用次数已满。" });
      return;
    }

    invite.used += 1;
    let user = invite.userId
      ? store.users.find((item) => item.id === invite.userId)
      : null;
    if (!user) {
      user = {
        id: crypto.randomUUID(),
        displayName: "新用户",
        role: "member",
        createdAt: new Date().toISOString(),
      };
      store.users.push(user);
    }
    const token = crypto.randomBytes(24).toString("hex");
    store.sessions.push({
      tokenHash: hashToken(token),
      userId: user.id,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 864e5).toISOString(),
    });
    writeStore(store);

    response.setHeader("Set-Cookie", sessionCookie(token));
    sendJson(response, 200, {
      user,
      permissions: invite.permissions,
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/auth/logout") {
    const store = readStore();
    const token = getSessionToken(request);
    store.sessions = store.sessions.filter((item) => item.tokenHash !== hashToken(token));
    writeStore(store);
    response.setHeader("Set-Cookie", "brand_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0");
    sendJson(response, 200, { ok: true });
    return;
  }

  const context = requireSession(request, response);
  if (!context) return;

  if (request.method === "GET" && url.pathname === "/api/session") {
    sendJson(response, 200, { user: context.user });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/dashboard") {
    const diagnoses = context.store.diagnoses
      .filter((item) => item.userId === context.user.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    sendJson(response, 200, { user: context.user, diagnoses });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/admin/overview") {
    if (!requireAdmin(context, response)) return;
    const diagnoses = context.store.diagnoses
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(adminDiagnosisSummary);
    sendJson(response, 200, {
      stats: {
        users: context.store.users.filter((item) => item.role === "member").length,
        diagnoses: diagnoses.length,
        completed: diagnoses.filter((item) => item.status === "completed").length,
        leads: diagnoses.filter((item) => item.contact.name && item.contact.email && item.contact.method).length,
        consultations: diagnoses.filter((item) => item.consultationRequestedAt).length,
      },
      diagnoses,
    });
    return;
  }

  const adminDiagnosisMatch = url.pathname.match(/^\/api\/admin\/diagnoses\/([^/]+)$/);
  if (request.method === "GET" && adminDiagnosisMatch) {
    if (!requireAdmin(context, response)) return;
    const diagnosis = context.store.diagnoses.find((item) => item.id === adminDiagnosisMatch[1]);
    if (!diagnosis) {
      sendJson(response, 404, { error: "未找到该诊断记录。" });
      return;
    }
    sendJson(response, 200, { diagnosis });
    return;
  }

  const diagnosisMatch = url.pathname.match(/^\/api\/diagnoses\/([^/]+)$/);
  if (request.method === "GET" && diagnosisMatch) {
    const diagnosis = findDiagnosis(context, diagnosisMatch[1], response);
    if (!diagnosis) return;
    sendJson(response, 200, { diagnosis });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/diagnoses") {
    const body = await readJson(request);
    if (!["personal", "corporate"].includes(body.type)) {
      sendJson(response, 400, { error: "请选择有效的诊断类型。" });
      return;
    }
    const now = new Date().toISOString();
    const diagnosis = {
      id: crypto.randomUUID(),
      userId: context.user.id,
      type: body.type,
      name: body.type === "personal" ? `${context.user.displayName}个人品牌` : "未命名企业品牌",
      status: "draft",
      progress: 0,
      answers: {},
      report: null,
      createdAt: now,
      updatedAt: now,
    };
    context.store.diagnoses.push(diagnosis);
    writeStore(context.store);
    sendJson(response, 201, { diagnosis });
    return;
  }

  const answerMatch = url.pathname.match(/^\/api\/diagnoses\/([^/]+)\/answers$/);
  if (request.method === "PUT" && answerMatch) {
    const diagnosis = findDiagnosis(context, answerMatch[1], response);
    if (!diagnosis) return;
    const body = await readJson(request);
    diagnosis.answers = { ...diagnosis.answers, ...(body.answers || {}) };
    if (diagnosis.answers.contactName) {
      const user = context.store.users.find((item) => item.id === context.user.id);
      if (user && user.role === "member") user.displayName = String(diagnosis.answers.contactName).trim();
    }
    diagnosis.name = diagnosis.type === "corporate"
      ? String(diagnosis.answers.brandName || "未命名企业品牌").trim()
      : `${String(diagnosis.answers.contactName || context.user.displayName || "未命名").trim()}个人品牌`;
    diagnosis.progress = Math.max(0, Math.min(100, Number(body.progress) || diagnosis.progress));
    diagnosis.status = "draft";
    diagnosis.updatedAt = new Date().toISOString();
    writeStore(context.store);
    sendJson(response, 200, { diagnosis });
    return;
  }

  const generateMatch = url.pathname.match(/^\/api\/diagnoses\/([^/]+)\/generate$/);
  if (request.method === "POST" && generateMatch) {
    const diagnosis = findDiagnosis(context, generateMatch[1], response);
    if (!diagnosis) return;
    const contactError = validateContact(diagnosis.answers);
    if (contactError) {
      sendJson(response, 400, { error: contactError });
      return;
    }
    diagnosis.progress = 100;
    diagnosis.status = "completed";
    diagnosis.report = await generateReport(diagnosis);
    diagnosis.updatedAt = new Date().toISOString();
    writeStore(context.store);
    sendJson(response, 200, { diagnosis });
    return;
  }

  const consultationMatch = url.pathname.match(/^\/api\/diagnoses\/([^/]+)\/consultation$/);
  if (request.method === "POST" && consultationMatch) {
    const diagnosis = findDiagnosis(context, consultationMatch[1], response);
    if (!diagnosis) return;
    const body = await readJson(request);
    diagnosis.consultationRequestedAt = new Date().toISOString();
    diagnosis.consultationSource = String(body.source || "report");
    diagnosis.updatedAt = new Date().toISOString();
    writeStore(context.store);
    sendJson(response, 200, { ok: true, diagnosis });
    return;
  }

  sendJson(response, 404, { error: "接口不存在。" });
}

function requireSession(request, response) {
  const store = readStore();
  const token = getSessionToken(request);
  const tokenHash = hashToken(token);
  const session = store.sessions.find((item) => item.tokenHash === tokenHash);

  if (!token || !session || Date.now() > Date.parse(session.expiresAt)) {
    sendJson(response, 401, { error: "请先使用邀请码进入。" });
    return null;
  }

  const user = store.users.find((item) => item.id === session.userId);
  if (!user) {
    sendJson(response, 401, { error: "用户状态无效。" });
    return null;
  }
  return { store, session, user };
}

function findDiagnosis(context, id, response) {
  const diagnosis = context.store.diagnoses.find(
    (item) => item.id === id && item.userId === context.user.id,
  );
  if (!diagnosis) {
    sendJson(response, 404, { error: "未找到该诊断记录。" });
    return null;
  }
  return diagnosis;
}

function requireAdmin(context, response) {
  if (context.user.role === "admin") return true;
  sendJson(response, 403, { error: "没有管理员权限。" });
  return false;
}

function validateContact(answers = {}) {
  if (String(answers.contactName || "").trim().length < 2) return "请填写姓名。";
  if (String(answers.contactMethod || "").trim().length < 5) return "请填写有效的手机号码或微信号。";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(answers.email || "").trim())) return "请填写有效的邮箱地址。";
  return "";
}

function adminDiagnosisSummary(diagnosis) {
  return {
    id: diagnosis.id,
    name: diagnosis.name,
    type: diagnosis.type,
    status: diagnosis.status,
    progress: diagnosis.progress,
    score: diagnosis.report?.overallScore ?? null,
    consultationRequestedAt: diagnosis.consultationRequestedAt || null,
    updatedAt: diagnosis.updatedAt,
    contact: {
      name: String(diagnosis.answers?.contactName || ""),
      method: String(diagnosis.answers?.contactMethod || ""),
      email: String(diagnosis.answers?.email || ""),
    },
  };
}

async function generateReport(diagnosis) {
  if (!process.env.OPENAI_API_KEY) return buildLocalReport(diagnosis);

  try {
    const model = process.env.AI_MODEL_REPORT || "gpt-5.5";
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        store: false,
        reasoning: { effort: "medium" },
        input: [
          {
            role: "system",
            content: "你是严谨的品牌战略诊断顾问。只依据用户答案判断，区分陈述与证据，不得虚构事实。品牌定位、品牌价值、品牌信任状的分数上限分别为35、35、30，总分必须为三项之和。",
          },
          {
            role: "user",
            content: JSON.stringify({
              diagnosisType: diagnosis.type,
              answers: diagnosis.answers,
            }),
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "brand_diagnosis_report",
            strict: true,
            schema: reportSchema(),
          },
        },
      }),
    });

    if (!response.ok) throw new Error(`OpenAI request failed: ${response.status}`);
    const payload = await response.json();
    const outputText = payload.output
      ?.flatMap((item) => item.content || [])
      .find((item) => item.type === "output_text")
      ?.text;
    if (!outputText) throw new Error("OpenAI response did not include output_text");
    return normalizeReport(JSON.parse(outputText), model);
  } catch (error) {
    console.error("AI report generation failed, using local fallback:", error.message);
    const fallback = buildLocalReport(diagnosis);
    fallback.fallbackReason = "ai_unavailable";
    return fallback;
  }
}

function buildLocalReport(diagnosis) {
  const answers = diagnosis.answers || {};
  const positioning = scoreDimension(
    [answers.identity, answers.audience, answers.problems, answers.difference],
    35,
  );
  const value = scoreDimension(
    [answers.outcomes, answers.coreValue, answers.consistency],
    35,
  );
  const trust = scoreDimension(
    [answers.trustAssets, answers.cases, answers.trustSystem],
    30,
    String(answers.trustAssets || "").includes("缺少明确证据") ? 0.72 : 1,
  );
  const overallScore = positioning + value + trust;
  const weakest = [
    ["品牌定位", positioning / 35],
    ["品牌价值", value / 35],
    ["品牌信任状", trust / 30],
  ].sort((a, b) => a[1] - b[1])[0][0];

  return {
    overallScore,
    level: maturityLevel(overallScore),
    confidence: Math.min(92, Math.round(completionRate(answers) * 72 + 20)),
    dimensions: {
      positioning: localDimension(positioning, 35, "目标对象与差异表达需要进一步聚焦。"),
      value: localDimension(value, 35, "用户结果已经出现，但独特价值仍需说得更具体。"),
      trust: localDimension(trust, 30, "现有经历和案例需要整理成可验证的证据体系。"),
    },
    summary: `当前信息显示，品牌已经形成一定基础，其中最需要优先补强的是${weakest}。建议继续把抽象表述转化为更具体的目标对象、用户结果和可验证证据。`,
    brandOverview: {
      currentStrength: "已经形成初步的专业方向和服务价值。",
      keyIssue: `${weakest}仍是当前最主要的品牌短板。`,
      biggestOpportunity: "把经验、方法和案例整理成一致、可复用的品牌表达。",
    },
    positioningStatement: "为明确的目标对象，解决关键问题，并用可验证的方法形成差异。",
    valueProposition: "把提供的服务进一步翻译为客户可以感知和验证的具体结果。",
    trustPlan: "优先整理三个代表案例，并补充过程、结果、客户评价或数据证据。",
    expressionSuggestions: {
      headline: "用一句话说清楚你服务谁、解决什么问题。",
      introduction: "围绕身份、对象、问题、方法和结果组织品牌介绍。",
      proof: "每项核心承诺后至少配置一个案例、数据或第三方证据。",
    },
    actionPlan: [
      { period: "0-30天", title: "统一核心定位", detail: "统一主页、内容和产品中的身份与目标对象表达。", priority: "高" },
      { period: "31-60天", title: "整理代表案例", detail: "按照问题、方法、结果和证据重写三个代表案例。", priority: "高" },
      { period: "61-90天", title: "建立证据体系", detail: "持续积累评价、成果数据、作品和第三方认可。", priority: "中" },
    ],
    generatedBy: "local-scoring-engine",
    reviewStatus: "ai_generated",
    generatedAt: new Date().toISOString(),
  };
}

function localDimension(score, total, diagnosis) {
  return {
    score,
    total,
    status: dimensionStatus(score / total),
    diagnosis,
    strengths: ["已有基础信息可以支撑初步判断。"],
    risks: ["部分表述仍偏抽象，缺少足够证据。"],
    recommendations: ["将抽象描述改写为具体对象、结果和证据。"],
  };
}

function scoreDimension(values, maxScore, modifier = 1) {
  const strengths = values.map(answerStrength);
  const average = strengths.reduce((sum, value) => sum + value, 0) / Math.max(1, strengths.length);
  return Math.max(0, Math.min(maxScore, Math.round(maxScore * (0.2 + average * 0.72) * modifier)));
}

function answerStrength(value) {
  if (Array.isArray(value)) {
    const meaningful = value.filter((item) => String(item || "").trim().length >= 4);
    const lengthQuality = meaningful.reduce((sum, item) => sum + Math.min(1, String(item).trim().length / 35), 0);
    return Math.min(1, meaningful.length / 3 * 0.55 + lengthQuality / 3 * 0.45);
  }
  if (typeof value === "number") return Math.max(0, Math.min(1, value / 5));
  const text = String(value || "").trim();
  if (!text) return 0;
  return Math.min(1, 0.45 + text.length / 80);
}

function completionRate(answers) {
  const values = Object.values(answers);
  if (!values.length) return 0;
  return values.filter((value) => answerStrength(value) > 0).length / values.length;
}

function maturityLevel(score) {
  if (score >= 85) return "A 级 · 品牌引领";
  if (score >= 70) return "B 级 · 品牌成长";
  if (score >= 55) return "C 级 · 品牌成形";
  if (score >= 40) return "D 级 · 品牌模糊";
  return "E 级 · 品牌起步";
}

function dimensionStatus(ratio) {
  if (ratio >= 0.82) return "表现突出";
  if (ratio >= 0.68) return "基本清晰";
  if (ratio >= 0.52) return "有待加强";
  return "基础较弱";
}

function normalizeReport(report, model) {
  const positioning = clampScore(report.dimensions?.positioning?.score, 35);
  const value = clampScore(report.dimensions?.value?.score, 35);
  const trust = clampScore(report.dimensions?.trust?.score, 30);
  const overallScore = positioning + value + trust;
  return {
    overallScore,
    level: maturityLevel(overallScore),
    confidence: Math.max(0, Math.min(100, Number(report.confidence) || 0)),
    dimensions: {
      positioning: { score: positioning, total: 35, status: String(report.dimensions?.positioning?.status || dimensionStatus(positioning / 35)) },
      value: { score: value, total: 35, status: String(report.dimensions?.value?.status || dimensionStatus(value / 35)) },
      trust: { score: trust, total: 30, status: String(report.dimensions?.trust?.status || dimensionStatus(trust / 30)) },
    },
    summary: String(report.summary || "诊断报告已生成。"),
    generatedBy: model,
    reviewStatus: "ai_generated",
    generatedAt: new Date().toISOString(),
  };
}

function clampScore(value, max) {
  return Math.max(0, Math.min(max, Math.round(Number(value) || 0)));
}

function reportSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["confidence", "summary", "dimensions"],
    properties: {
      confidence: { type: "integer", minimum: 0, maximum: 100 },
      summary: { type: "string" },
      dimensions: {
        type: "object",
        additionalProperties: false,
        required: ["positioning", "value", "trust"],
        properties: {
          positioning: dimensionSchema(35),
          value: dimensionSchema(35),
          trust: dimensionSchema(30),
        },
      },
    },
  };
}

function dimensionSchema(maximum) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["score", "status"],
    properties: {
      score: { type: "integer", minimum: 0, maximum },
      status: { type: "string" },
    },
  };
}

function serveStatic(response, pathname) {
  const requested = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = path.normalize(path.join(publicDir, requested));

  if (!filePath.startsWith(publicDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, contents) => {
    if (error) {
      fs.readFile(path.join(publicDir, "index.html"), (fallbackError, fallback) => {
        if (fallbackError) {
          response.writeHead(404);
          response.end("Not found");
          return;
        }
        response.writeHead(200, { "Content-Type": mime[".html"], "Cache-Control": "no-store" });
        response.end(fallback);
      });
      return;
    }

    response.writeHead(200, {
      "Content-Type": mime[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(contents);
  });
}

function ensureStore() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (fs.existsSync(storePath)) {
    const store = readStore();
    migrateStore(store);
    writeStore(store);
    return;
  }
  const store = {
    users: [{ id: "admin-local", displayName: "老黄", role: "admin" }],
    invites: [{
      code: "LAOHUANG-2026",
      status: "active",
      maxUses: 100,
      used: 0,
      expiresAt: "2027-12-31T23:59:59.000Z",
      permissions: { personal: true, corporate: true, fullReport: true, maxDiagnoses: 20 },
    }, {
      code: "LAOHUANG-ADMIN",
      userId: "admin-local",
      status: "active",
      maxUses: 100,
      used: 0,
      expiresAt: "2027-12-31T23:59:59.000Z",
      permissions: { admin: true },
    }],
    sessions: [],
    diagnoses: [],
  };
  writeStore(store);
}

function migrateStore(store) {
  if (!store.users.some((item) => item.id === "admin-local")) {
    store.users.push({ id: "admin-local", displayName: "老黄", role: "admin" });
  }
  if (!store.invites.some((item) => item.code === "LAOHUANG-ADMIN")) {
    store.invites.push({
      code: "LAOHUANG-ADMIN",
      userId: "admin-local",
      status: "active",
      maxUses: 100,
      used: 0,
      expiresAt: "2027-12-31T23:59:59.000Z",
      permissions: { admin: true },
    });
  }
}

function readStore() {
  return JSON.parse(fs.readFileSync(storePath, "utf8"));
}

function writeStore(store) {
  const temporaryPath = `${storePath}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(store, null, 2), "utf8");
  fs.renameSync(temporaryPath, storePath);
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) request.destroy();
    });
    request.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(new Error("Invalid JSON"));
      }
    });
    request.on("error", reject);
  });
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function getSessionToken(request) {
  const cookie = request.headers.cookie || "";
  const match = cookie.match(/(?:^|;\s*)brand_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function sessionCookie(token) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `brand_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${7 * 86400}${secure}`;
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}
