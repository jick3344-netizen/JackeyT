type Diagnosis = {
  id: string;
  userId: string;
  type: "personal" | "corporate";
  name: string;
  answers: Record<string, unknown>;
  reportConfigSnapshot?: any;
};

type EnvReader = (name: string) => string | undefined;

export async function generateReport(diagnosis: Diagnosis, env: EnvReader, reportConfig?: any) {
  const minimaxKey = env("MINIMAX_API_KEY");
  if (!minimaxKey) throw new Error("MiniMax API key is not configured");
  const config = reportConfig || diagnosis.reportConfigSnapshot || {};
  return generateMiniMaxReport(diagnosis, minimaxKey, config.model || env("MINIMAX_MODEL") || "MiniMax-M3", config);
}

async function generateMiniMaxReport(diagnosis: Diagnosis, apiKey: string, model: string, config: any = {}) {
  const safeAnswers = { ...diagnosis.answers };
  delete safeAnswers.contactName;
  delete safeAnswers.contactMethod;
  delete safeAnswers.email;
  const scoring = {
    positioning: clampScore(config.scoring?.positioning ?? 35, 100),
    value: clampScore(config.scoring?.value ?? 35, 100),
    trust: clampScore(config.scoring?.trust ?? 30, 100),
  };
  const systemPrompt = String(config.systemPrompt || "你是严谨、克制的中文品牌战略顾问。");

  const response = await fetch("https://api.minimaxi.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        thinking: { type: "disabled" },
        max_completion_tokens: 6000,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content: [
              systemPrompt,
              "仅依据用户答案判断，不得虚构客户、成果、数据、资质或市场事实。",
              `品牌定位、品牌价值、品牌信任状的分数上限分别为${scoring.positioning}、${scoring.value}、${scoring.trust}。`,
              "只输出一个合法 JSON 对象，不要使用 Markdown，不要输出解释、代码围栏或思考过程。",
              "JSON 必须完全符合用户给出的字段结构，所有文字使用简体中文。",
            ].join("\n"),
          },
          {
            role: "user",
            content: JSON.stringify({
              task: "生成品牌战略诊断报告",
              diagnosisType: diagnosis.type,
              brandName: diagnosis.name,
              answers: safeAnswers,
              scoring,
              reportSections: Array.isArray(config.sections) ? config.sections : undefined,
              generationTask: String(config.generationTask || "生成品牌战略诊断报告"),
              requiredOutput: reportOutputTemplate(),
            }),
          },
        ],
      }),
    });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`MiniMax request failed: ${response.status} ${payload?.base_resp?.status_msg || ""}`);
  }
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) throw new Error("MiniMax response did not include message content");
  return normalizeReport(parseJsonObject(content), model, config);
}

function normalizeReport(report: any, model: string, config: any = {}) {
  const scoring = config.scoring || {};
  const positioningTotal = clampScore(scoring.positioning ?? 35, 100) || 35;
  const valueTotal = clampScore(scoring.value ?? 35, 100) || 35;
  const trustTotal = clampScore(scoring.trust ?? 30, 100) || 30;
  const positioning = clampScore(report.dimensions?.positioning?.score, positioningTotal);
  const value = clampScore(report.dimensions?.value?.score, valueTotal);
  const trust = clampScore(report.dimensions?.trust?.score, trustTotal);
  const overallScore = positioning + value + trust;
  return {
    ...report,
    overallScore,
    level: maturityLevel(overallScore, config.levels),
    confidence: Math.max(0, Math.min(100, Number(report.confidence) || 0)),
    dimensions: {
      positioning: normalizeDimension(report.dimensions?.positioning, positioning, positioningTotal),
      value: normalizeDimension(report.dimensions?.value, value, valueTotal),
      trust: normalizeDimension(report.dimensions?.trust, trust, trustTotal),
    },
    generatedBy: model,
    reviewStatus: "ai_generated",
    generatedAt: new Date().toISOString(),
  };
}

function normalizeDimension(value: any, score: number, total: number) {
  return {
    ...value,
    score,
    total,
    status: String(value?.status || dimensionStatus(score / total)),
    strengths: stringList(value?.strengths),
    risks: stringList(value?.risks),
    recommendations: stringList(value?.recommendations),
  };
}

function reportSchema() {
  const dimension = (maximum: number) => ({
    type: "object",
    additionalProperties: false,
    required: ["score", "status", "diagnosis", "strengths", "risks", "recommendations"],
    properties: {
      score: { type: "integer", minimum: 0, maximum },
      status: { type: "string" },
      diagnosis: { type: "string" },
      strengths: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 },
      risks: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 },
      recommendations: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 },
    },
  });
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "confidence", "summary", "dimensions", "brandOverview", "positioningStatement",
      "valueProposition", "trustPlan", "expressionSuggestions", "priorityIssues",
      "evidenceToCollect", "actionPlan",
    ],
    properties: {
      confidence: { type: "integer", minimum: 0, maximum: 100 },
      summary: { type: "string" },
      dimensions: {
        type: "object",
        additionalProperties: false,
        required: ["positioning", "value", "trust"],
        properties: { positioning: dimension(35), value: dimension(35), trust: dimension(30) },
      },
      brandOverview: {
        type: "object",
        additionalProperties: false,
        required: ["currentStrength", "keyIssue", "biggestOpportunity"],
        properties: {
          currentStrength: { type: "string" },
          keyIssue: { type: "string" },
          biggestOpportunity: { type: "string" },
        },
      },
      positioningStatement: { type: "string" },
      valueProposition: { type: "string" },
      trustPlan: { type: "string" },
      expressionSuggestions: {
        type: "object",
        additionalProperties: false,
        required: ["headline", "introduction", "proof"],
        properties: {
          headline: { type: "string" },
          introduction: { type: "string" },
          proof: { type: "string" },
        },
      },
      priorityIssues: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["dimension", "title", "description", "urgency"],
          properties: {
            dimension: { type: "string", enum: ["品牌定位", "品牌价值", "品牌信任状"] },
            title: { type: "string" },
            description: { type: "string" },
            urgency: { type: "string", enum: ["高", "中", "低"] },
          },
        },
      },
      evidenceToCollect: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "purpose", "example"],
          properties: {
            title: { type: "string" },
            purpose: { type: "string" },
            example: { type: "string" },
          },
        },
      },
      actionPlan: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["period", "title", "detail", "priority"],
          properties: {
            period: { type: "string" },
            title: { type: "string" },
            detail: { type: "string" },
            priority: { type: "string", enum: ["高", "中", "低"] },
          },
        },
      },
    },
  };
}

function reportOutputTemplate() {
  return {
    confidence: "0到100的整数",
    summary: "执行摘要",
    dimensions: {
      positioning: dimensionTemplate("0到35的整数"),
      value: dimensionTemplate("0到35的整数"),
      trust: dimensionTemplate("0到30的整数"),
    },
    brandOverview: {
      currentStrength: "当前优势",
      keyIssue: "关键问题",
      biggestOpportunity: "最大机会",
    },
    positioningStatement: "一句话定位建议",
    valueProposition: "核心价值主张建议",
    trustPlan: "信任建设重点",
    expressionSuggestions: {
      headline: "首页标题建议",
      introduction: "品牌介绍建议",
      proof: "信任表达建议",
    },
    priorityIssues: [
      { dimension: "品牌定位", title: "关键议题标题", description: "问题的具体表现与影响", urgency: "高或中或低" },
      { dimension: "品牌价值", title: "关键议题标题", description: "问题的具体表现与影响", urgency: "高或中或低" },
      { dimension: "品牌信任状", title: "关键议题标题", description: "问题的具体表现与影响", urgency: "高或中或低" },
    ],
    evidenceToCollect: [
      { title: "建议补充的资料", purpose: "它能解决什么信任问题", example: "具体可收集的证据例子" },
      { title: "建议补充的资料", purpose: "它能解决什么信任问题", example: "具体可收集的证据例子" },
      { title: "建议补充的资料", purpose: "它能解决什么信任问题", example: "具体可收集的证据例子" },
    ],
    actionPlan: [
      { period: "0-30天", title: "行动标题", detail: "具体行动", priority: "高或中或低" },
      { period: "31-60天", title: "行动标题", detail: "具体行动", priority: "高或中或低" },
      { period: "61-90天", title: "行动标题", detail: "具体行动", priority: "高或中或低" },
    ],
  };
}

function dimensionTemplate(score: string) {
  return {
    score,
    status: "表现突出、基本清晰、有待加强或基础较弱",
    diagnosis: "该维度诊断",
    strengths: ["1到3项优势"],
    risks: ["1到3项风险"],
    recommendations: ["1到3项建议"],
  };
}

function parseJsonObject(content: string) {
  const cleaned = String(content)
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  if (start < 0) throw new Error("MiniMax response did not contain JSON");

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < cleaned.length; index += 1) {
    const character = cleaned[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) return JSON.parse(cleaned.slice(start, index + 1));
    }
  }
  throw new Error("MiniMax response contained incomplete JSON");
}

function maturityLevel(score: number, levels?: Array<{ min: number; label: string }>) {
  if (Array.isArray(levels) && levels.length) {
    const matched = [...levels]
      .map((item) => ({ min: Number(item.min), label: String(item.label || "") }))
      .filter((item) => Number.isFinite(item.min) && item.label)
      .sort((a, b) => b.min - a.min)
      .find((item) => score >= item.min);
    if (matched) return matched.label;
  }
  if (score >= 85) return "A 级 · 品牌引领";
  if (score >= 70) return "B 级 · 品牌成长";
  if (score >= 55) return "C 级 · 品牌成形";
  if (score >= 40) return "D 级 · 品牌模糊";
  return "E 级 · 品牌起步";
}

function dimensionStatus(ratio: number) {
  if (ratio >= 0.82) return "表现突出";
  if (ratio >= 0.68) return "基本清晰";
  if (ratio >= 0.52) return "有待加强";
  return "基础较弱";
}

function clampScore(value: unknown, max: number) {
  return Math.max(0, Math.min(max, Math.round(Number(value) || 0)));
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean).slice(0, 3) : [];
}

function hashIdentifier(value: string) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `brand-user-${(hash >>> 0).toString(16)}`;
}
