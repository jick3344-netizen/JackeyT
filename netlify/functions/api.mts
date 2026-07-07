import type { Config, Context } from "@netlify/functions";
import { getDeployStore, getStore } from "@netlify/blobs";
import crypto from "node:crypto";
import { DEFAULT_CONTENT } from "./_shared/default-content.mts";

type User = {
  id: string;
  displayName: string;
  role: "member" | "admin";
  createdAt?: string;
  source?: "invite" | "wechat";
  wechatOpenidHash?: string;
  wechatUnionidHash?: string;
  lastLoginAt?: string;
};
type Invite = {
  code: string;
  userId?: string;
  status: string;
  maxUses: number;
  used: number;
  expiresAt: string;
  permissions: Record<string, unknown>;
  createdAt?: string;
};
type AuthConfig = { users: User[]; invites: Invite[] };
type Diagnosis = {
  id: string;
  userId: string;
  type: "personal" | "corporate";
  name: string;
  status: "draft" | "generating" | "completed";
  progress: number;
  answers: Record<string, any>;
  report: any;
  contentVersion?: string;
  questionSnapshot?: any[];
  reportConfigSnapshot?: any;
  originalReport?: any;
  consultationRequestedAt?: string;
  consultationSource?: string;
  generationToken?: string;
  generationRequestedAt?: string;
  generationError?: string;
  createdAt: string;
  updatedAt: string;
};

export default async function handler(request: Request, context: Context) {
  try {
    const url = new URL(request.url);
    const path = url.pathname;
    const authStore = dataStore("brand-auth", context);
    const diagnosisStore = dataStore("brand-diagnoses", context);
    const contentStore = dataStore("brand-content", context);
    const assetStore = dataStore("brand-assets", context);

    if (request.method === "GET" && path === "/api/content") {
      return json(200, { content: await getPublishedContent(contentStore) });
    }

    const assetMatch = path.match(/^\/api\/assets\/([^/]+)$/);
    if (request.method === "GET" && assetMatch) {
      const key = `asset/${assetMatch[1]}`;
      const data = await assetStore.get(key, { type: "arrayBuffer" });
      const metadata = await assetStore.getMetadata(key);
      if (!data) return new Response("Not found", { status: 404 });
      return new Response(data, {
        status: 200,
        headers: {
          "Content-Type": String(metadata?.metadata?.contentType || "application/octet-stream"),
          "Cache-Control": "public, max-age=31536000, immutable",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    if (request.method === "POST" && path === "/api/auth/invite") {
      const body = await readJson(request);
      const config = await getAuthConfig(authStore);
      const code = String(body.code || "").trim().toUpperCase();
      const invite = config.invites.find((item) => item.code === code);
      if (!invite || invite.status !== "active") return json(403, { error: "邀请码无效或已停用。" });
      if (Date.now() > Date.parse(invite.expiresAt)) return json(403, { error: "邀请码已过期。" });
      if (invite.used >= invite.maxUses) return json(403, { error: "邀请码使用次数已满。" });

      invite.used += 1;
      let user = invite.userId ? config.users.find((item) => item.id === invite.userId) : undefined;
      if (!user) {
        user = {
          id: crypto.randomUUID(),
          displayName: "新用户",
          role: "member",
          createdAt: new Date().toISOString(),
        };
        config.users.push(user);
      }
      await authStore.setJSON("config", config);
      const token = await createSession(authStore, user.id);
      return json(200, { user, permissions: invite.permissions }, {
        "Set-Cookie": sessionCookie(token),
      });
    }

    if (request.method === "POST" && path === "/api/miniprogram/auth/invite") {
      const body = await readJson(request);
      const config = await getAuthConfig(authStore);
      const code = String(body.code || "").trim().toUpperCase();
      const invite = config.invites.find((item) => item.code === code);
      if (!invite || invite.status !== "active") return json(403, { error: "邀请码无效或已停用。" });
      if (Date.now() > Date.parse(invite.expiresAt)) return json(403, { error: "邀请码已过期。" });
      if (invite.used >= invite.maxUses) return json(403, { error: "邀请码使用次数已满。" });

      invite.used += 1;
      let user = invite.userId ? config.users.find((item) => item.id === invite.userId) : undefined;
      if (!user) {
        user = {
          id: crypto.randomUUID(),
          displayName: "新用户",
          role: "member",
          createdAt: new Date().toISOString(),
        };
        config.users.push(user);
      }
      await authStore.setJSON("config", config);
      const token = await createSession(authStore, user.id);
      return json(200, { user, permissions: invite.permissions, accessToken: token });
    }

    if (request.method === "POST" && path === "/api/miniprogram/auth/wechat") {
      const body = await readJson(request);
      const code = String(body.code || "").trim();
      if (!code) return json(400, { error: "微信登录凭证为空，请重新进入小程序。" });

      const appId = Netlify.env.get("WECHAT_MINIPROGRAM_APP_ID") || Netlify.env.get("WX_MINIPROGRAM_APP_ID");
      const appSecret = Netlify.env.get("WECHAT_MINIPROGRAM_APP_SECRET") || Netlify.env.get("WX_MINIPROGRAM_APP_SECRET");
      if (!appId || !appSecret) {
        return json(503, { error: "小程序微信登录尚未配置，请先添加 AppID 和 AppSecret。" });
      }

      const login = await exchangeWechatLoginCode({ appId, appSecret, code });
      if (!login.openid) return json(401, { error: login.message || "微信登录校验失败，请重新进入小程序后再试。" });

      const config = await getAuthConfig(authStore);
      const openidHash = hashStableId(`${appId}:${login.openid}`);
      const unionidHash = login.unionid ? hashStableId(`${appId}:${login.unionid}`) : undefined;
      const now = new Date().toISOString();
      let user = config.users.find((item) => item.wechatOpenidHash === openidHash)
        || config.users.find((item) => item.id === `wx-${openidHash.slice(0, 24)}`);

      if (!user) {
        user = {
          id: `wx-${openidHash.slice(0, 24)}`,
          displayName: "微信用户",
          role: "member",
          source: "wechat",
          wechatOpenidHash: openidHash,
          ...(unionidHash ? { wechatUnionidHash: unionidHash } : {}),
          createdAt: now,
          lastLoginAt: now,
        };
        config.users.push(user);
      } else {
        user.source ||= "wechat";
        user.wechatOpenidHash ||= openidHash;
        if (unionidHash) user.wechatUnionidHash ||= unionidHash;
        user.lastLoginAt = now;
      }

      await authStore.setJSON("config", config);
      const token = await createSession(authStore, user.id);
      return json(200, { user, accessToken: token });
    }

    if (request.method === "POST" && path === "/api/auth/logout") {
      const token = getSessionToken(request);
      if (token) await authStore.delete(`sessions/${hashToken(token)}`);
      return json(200, { ok: true }, {
        "Set-Cookie": "brand_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0",
      });
    }

    const session = await requireSession(request, authStore);
    if (!session) return json(401, { error: "请先登录。" });

    if (request.method === "GET" && path === "/api/session") {
      return json(200, { user: session.user });
    }

    if (request.method === "GET" && path === "/api/dashboard") {
      const diagnoses = (await allDiagnoses(diagnosisStore))
        .filter((item) => item.userId === session.user.id)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      return json(200, { user: session.user, diagnoses });
    }

    if (request.method === "GET" && path === "/api/admin/overview") {
      if (session.user.role !== "admin") return json(403, { error: "没有管理员权限。" });
      const diagnoses = (await allDiagnoses(diagnosisStore))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map(adminDiagnosisSummary);
      return json(200, {
        stats: {
          users: session.config.users.filter((item) => item.role === "member").length,
          diagnoses: diagnoses.length,
          completed: diagnoses.filter((item) => item.status === "completed").length,
          leads: diagnoses.filter((item) => item.contact.name && item.contact.email && item.contact.method).length,
          consultations: diagnoses.filter((item) => item.consultationRequestedAt).length,
        },
        diagnoses,
        invites: session.config.invites
          .filter((item) => !item.userId && item.code !== "LAOHUANG-2026")
          .sort((a, b) => String(b.createdAt || b.expiresAt).localeCompare(String(a.createdAt || a.expiresAt)))
          .slice(0, 8)
          .map(publicInvite),
      });
    }

    if (request.method === "GET" && path === "/api/admin/content") {
      if (session.user.role !== "admin") return json(403, { error: "没有管理员权限。" });
      const published = await getPublishedContent(contentStore);
      const draft = await getDraftContent(contentStore, published);
      const versions = await getContentVersions(contentStore);
      return json(200, { published, draft, versions });
    }

    if (request.method === "PUT" && path === "/api/admin/content/draft") {
      if (session.user.role !== "admin") return json(403, { error: "没有管理员权限。" });
      const body = await readJson(request);
      const next = normalizeContent(body.content);
      const validationError = validateContent(next);
      if (validationError) return json(400, { error: validationError });
      next.status = "draft";
      next.updatedAt = new Date().toISOString();
      await contentStore.setJSON("draft", next);
      return json(200, { draft: next });
    }

    if (request.method === "POST" && path === "/api/admin/content/publish") {
      if (session.user.role !== "admin") return json(403, { error: "没有管理员权限。" });
      const draft = await getDraftContent(contentStore, await getPublishedContent(contentStore));
      const validationError = validateContent(draft);
      if (validationError) return json(400, { error: validationError });
      const version = createContentVersion();
      const published = { ...clone(draft), version, status: "published", updatedAt: new Date().toISOString(), publishedAt: new Date().toISOString() };
      await contentStore.setJSON("published", published);
      await contentStore.setJSON(`versions/${version}`, published);
      await contentStore.setJSON("draft", { ...clone(published), status: "draft" });
      return json(200, { published, draft: { ...published, status: "draft" }, versions: await getContentVersions(contentStore) });
    }

    if (request.method === "POST" && path === "/api/admin/content/rollback") {
      if (session.user.role !== "admin") return json(403, { error: "没有管理员权限。" });
      const body = await readJson(request);
      const version = String(body.version || "");
      const previous = await contentStore.get(`versions/${version}`, { type: "json" }) as any;
      if (!previous) return json(404, { error: "未找到该内容版本。" });
      const nextVersion = createContentVersion();
      const published = { ...clone(previous), version: nextVersion, status: "published", updatedAt: new Date().toISOString(), publishedAt: new Date().toISOString(), rolledBackFrom: version };
      await contentStore.setJSON("published", published);
      await contentStore.setJSON(`versions/${nextVersion}`, published);
      await contentStore.setJSON("draft", { ...clone(published), status: "draft" });
      return json(200, { published, versions: await getContentVersions(contentStore) });
    }

    if (request.method === "POST" && path === "/api/admin/assets") {
      if (session.user.role !== "admin") return json(403, { error: "没有管理员权限。" });
      const body = await readJson(request);
      const contentType = String(body.contentType || "").toLowerCase();
      if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) return json(400, { error: "只支持 jpg、png 或 webp 图片。" });
      const base64 = String(body.data || "").replace(/^data:image\/[a-z0-9.+-]+;base64,/i, "");
      const buffer = Buffer.from(base64, "base64");
      if (!buffer.byteLength || buffer.byteLength > 5 * 1024 * 1024) return json(400, { error: "图片不能为空，且不能超过 5MB。" });
      const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
      const id = `${crypto.randomUUID()}.${extension}`;
      await assetStore.set(`asset/${id}`, buffer, {
        metadata: { contentType, name: String(body.name || id).slice(0, 120), uploadedAt: new Date().toISOString() },
      });
      return json(201, { asset: { id, url: `/api/assets/${id}`, contentType } });
    }

    if (request.method === "POST" && path === "/api/admin/invites") {
      if (session.user.role !== "admin") return json(403, { error: "没有管理员权限。" });
      const expiresAt = new Date(Date.now() + 30 * 864e5).toISOString();
      const invite: Invite = {
        code: createInviteCode(session.config),
        status: "active",
        maxUses: 1,
        used: 0,
        expiresAt,
        createdAt: new Date().toISOString(),
        permissions: { personal: true, corporate: true, fullReport: true, maxDiagnoses: 1 },
      };
      session.config.invites.push(invite);
      await authStore.setJSON("config", session.config);
      return json(201, { invite: publicInvite(invite) });
    }

    if (request.method === "GET" && path === "/api/admin/ai-status") {
      if (session.user.role !== "admin") return json(403, { error: "没有管理员权限。" });
      return json(200, await checkAiStatus());
    }

    const adminDiagnosisMatch = path.match(/^\/api\/admin\/diagnoses\/([^/]+)$/);
    if (request.method === "GET" && adminDiagnosisMatch) {
      if (session.user.role !== "admin") return json(403, { error: "没有管理员权限。" });
      const diagnosis = await getDiagnosis(diagnosisStore, adminDiagnosisMatch[1]);
      return diagnosis ? json(200, { diagnosis }) : json(404, { error: "未找到该诊断记录。" });
    }

    const adminReportMatch = path.match(/^\/api\/admin\/diagnoses\/([^/]+)\/report$/);
    if (request.method === "PATCH" && adminReportMatch) {
      if (session.user.role !== "admin") return json(403, { error: "没有管理员权限。" });
      const diagnosis = await getDiagnosis(diagnosisStore, adminReportMatch[1]);
      if (!diagnosis || !diagnosis.report) return json(404, { error: "未找到可修订的报告。" });
      const body = await readJson(request);
      const nextReport = body.report;
      if (!nextReport || typeof nextReport !== "object") return json(400, { error: "报告内容格式不正确。" });
      if (!diagnosis.originalReport) diagnosis.originalReport = clone(diagnosis.report);
      diagnosis.report = { ...nextReport, reviewStatus: "manual_reviewed", reviewedAt: new Date().toISOString(), reviewedBy: session.user.id };
      diagnosis.updatedAt = new Date().toISOString();
      await saveDiagnosis(diagnosisStore, diagnosis);
      return json(200, { diagnosis });
    }

    if (request.method === "POST" && path === "/api/diagnoses") {
      const body = await readJson(request);
      if (!["personal", "corporate"].includes(body.type)) return json(400, { error: "请选择有效的诊断类型。" });
      const content = await getPublishedContent(contentStore);
      const now = new Date().toISOString();
      const diagnosis: Diagnosis = {
        id: crypto.randomUUID(),
        userId: session.user.id,
        type: body.type,
        name: body.type === "personal" ? `${session.user.displayName}个人品牌` : "未命名企业品牌",
        status: "draft",
        progress: 0,
        answers: {},
        report: null,
        contentVersion: content.version,
        questionSnapshot: content.questions?.[body.type] || [],
        reportConfigSnapshot: content.reportConfig || {},
        createdAt: now,
        updatedAt: now,
      };
      await saveDiagnosis(diagnosisStore, diagnosis);
      return json(201, { diagnosis });
    }

    const diagnosisMatch = path.match(/^\/api\/diagnoses\/([^/]+)$/);
    if (request.method === "GET" && diagnosisMatch) {
      const diagnosis = await ownedDiagnosis(diagnosisStore, diagnosisMatch[1], session.user);
      return diagnosis ? json(200, { diagnosis }) : json(404, { error: "未找到该诊断记录。" });
    }

    const answerMatch = path.match(/^\/api\/diagnoses\/([^/]+)\/answers$/);
    if (request.method === "PUT" && answerMatch) {
      const diagnosis = await ownedDiagnosis(diagnosisStore, answerMatch[1], session.user);
      if (!diagnosis) return json(404, { error: "未找到该诊断记录。" });
      const body = await readJson(request);
      diagnosis.answers = { ...diagnosis.answers, ...(body.answers || {}) };
      diagnosis.name = diagnosis.type === "corporate"
        ? String(diagnosis.answers.brandName || "未命名企业品牌").trim()
        : `${String(diagnosis.answers.contactName || session.user.displayName || "未命名").trim()}个人品牌`;
      diagnosis.progress = Math.max(0, Math.min(100, Number(body.progress) || diagnosis.progress));
      diagnosis.status = "draft";
      diagnosis.updatedAt = new Date().toISOString();
      if (diagnosis.answers.contactName && session.user.role === "member") {
        const user = session.config.users.find((item) => item.id === session.user.id);
        if (user) {
          user.displayName = String(diagnosis.answers.contactName).trim();
          await authStore.setJSON("config", session.config);
        }
      }
      await saveDiagnosis(diagnosisStore, diagnosis);
      return json(200, { diagnosis });
    }

    const generateMatch = path.match(/^\/api\/diagnoses\/([^/]+)\/generate$/);
    if (request.method === "POST" && generateMatch) {
      const diagnosis = await ownedDiagnosis(diagnosisStore, generateMatch[1], session.user);
      if (!diagnosis) return json(404, { error: "未找到该诊断记录。" });
      const contactError = validateContact(diagnosis.answers);
      if (contactError) return json(400, { error: contactError });
      if (diagnosis.status === "generating") return json(202, { diagnosis: publicDiagnosis(diagnosis) });
      diagnosis.status = "generating";
      diagnosis.generationToken = crypto.randomBytes(24).toString("hex");
      diagnosis.generationRequestedAt = new Date().toISOString();
      delete diagnosis.generationError;
      diagnosis.updatedAt = new Date().toISOString();
      await saveDiagnosis(diagnosisStore, diagnosis);
      const worker = await fetch(new URL("/.netlify/functions/report-generator-background", request.url), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diagnosisId: diagnosis.id, token: diagnosis.generationToken }),
      }).catch((error) => {
        console.error("Report background task could not be started:", error);
        return null;
      });
      if (!worker?.ok) {
        diagnosis.status = "draft";
        delete diagnosis.generationToken;
        diagnosis.generationError = "报告生成任务未能启动，请稍后重试。";
        diagnosis.updatedAt = new Date().toISOString();
        await saveDiagnosis(diagnosisStore, diagnosis);
        return json(503, { error: diagnosis.generationError });
      }
      return json(202, { diagnosis: publicDiagnosis(diagnosis) });
    }

    const consultationMatch = path.match(/^\/api\/diagnoses\/([^/]+)\/consultation$/);
    if (request.method === "POST" && consultationMatch) {
      const diagnosis = await ownedDiagnosis(diagnosisStore, consultationMatch[1], session.user);
      if (!diagnosis) return json(404, { error: "未找到该诊断记录。" });
      const body = await readJson(request);
      diagnosis.consultationRequestedAt = new Date().toISOString();
      diagnosis.consultationSource = String(body.source || "report");
      diagnosis.updatedAt = new Date().toISOString();
      await saveDiagnosis(diagnosisStore, diagnosis);
      return json(200, { ok: true, diagnosis });
    }

    return json(404, { error: "接口不存在。" });
  } catch (error) {
    console.error(error);
    return json(500, { error: "服务暂时不可用，请稍后再试。" });
  }
}

export const config: Config = {
  path: "/api/*",
};

function dataStore(name: string, context: Context) {
  return context.deploy.context === "production"
    ? getStore(name, { consistency: "strong" })
    : getDeployStore(name);
}

async function getAuthConfig(store: ReturnType<typeof getStore>): Promise<AuthConfig> {
  const existing = await store.get("config", { type: "json" }) as AuthConfig | null;
  if (existing) {
    const demoInvite = existing.invites.find((item) => item.code === "LAOHUANG-2026");
    if (demoInvite && demoInvite.status !== "disabled") {
      demoInvite.status = "disabled";
      await store.setJSON("config", existing);
    }
    return existing;
  }
  const config: AuthConfig = {
    users: [{ id: "admin-local", displayName: "老黄", role: "admin" }],
    invites: [
      {
        code: "LAOHUANG-ADMIN",
        userId: "admin-local",
        status: "active",
        maxUses: 100,
        used: 0,
        expiresAt: "2027-12-31T23:59:59.000Z",
        permissions: { admin: true },
      },
    ],
  };
  await store.setJSON("config", config);
  return config;
}

async function requireSession(request: Request, store: ReturnType<typeof getStore>) {
  const token = getSessionToken(request);
  if (!token) return null;
  const session = await store.get(`sessions/${hashToken(token)}`, { type: "json" }) as any;
  if (!session || Date.now() > Date.parse(session.expiresAt)) return null;
  const config = await getAuthConfig(store);
  const user = config.users.find((item) => item.id === session.userId);
  return user ? { user, config } : null;
}

async function allDiagnoses(store: ReturnType<typeof getStore>) {
  const { blobs } = await store.list({ prefix: "diagnosis/" });
  return (await Promise.all(blobs.map((blob) => store.get(blob.key, { type: "json" }))))
    .filter(Boolean) as Diagnosis[];
}

function getDiagnosis(store: ReturnType<typeof getStore>, id: string) {
  return store.get(`diagnosis/${id}`, { type: "json" }) as Promise<Diagnosis | null>;
}

async function ownedDiagnosis(store: ReturnType<typeof getStore>, id: string, user: User) {
  const diagnosis = await getDiagnosis(store, id);
  return diagnosis && (diagnosis.userId === user.id || user.role === "admin") ? diagnosis : null;
}

function saveDiagnosis(store: ReturnType<typeof getStore>, diagnosis: Diagnosis) {
  return store.setJSON(`diagnosis/${diagnosis.id}`, diagnosis);
}

async function getPublishedContent(store: ReturnType<typeof getStore>) {
  const existing = await store.get("published", { type: "json" }) as any;
  return normalizeContent(existing || DEFAULT_CONTENT);
}

async function getDraftContent(store: ReturnType<typeof getStore>, fallback: any) {
  const existing = await store.get("draft", { type: "json" }) as any;
  return normalizeContent(existing || { ...clone(fallback), status: "draft" });
}

async function getContentVersions(store: ReturnType<typeof getStore>) {
  const { blobs } = await store.list({ prefix: "versions/" });
  const versions = await Promise.all(blobs.map(async (blob) => {
    const content = await store.get(blob.key, { type: "json" }) as any;
    return content ? {
      version: content.version || blob.key.replace("versions/", ""),
      publishedAt: content.publishedAt || content.updatedAt || null,
      heroTitle: content.site?.heroTitle || "",
      status: content.status || "published",
      rolledBackFrom: content.rolledBackFrom || null,
    } : null;
  }));
  return versions.filter(Boolean).sort((a: any, b: any) => String(b.publishedAt || "").localeCompare(String(a.publishedAt || ""))).slice(0, 20);
}

function normalizeContent(value: any) {
  const fallback = clone(DEFAULT_CONTENT) as any;
  const input = value && typeof value === "object" ? value : {};
  return {
    ...fallback,
    ...input,
    site: { ...fallback.site, ...(input.site || {}) },
    methods: normalizeArray(input.methods, fallback.methods).slice(0, 6),
    brandTypes: {
      personal: { ...fallback.brandTypes.personal, ...(input.brandTypes?.personal || {}) },
      corporate: { ...fallback.brandTypes.corporate, ...(input.brandTypes?.corporate || {}) },
    },
    questions: {
      personal: normalizeQuestions(input.questions?.personal || fallback.questions.personal),
      corporate: normalizeQuestions(input.questions?.corporate || fallback.questions.corporate),
    },
    reportConfig: {
      ...fallback.reportConfig,
      ...(input.reportConfig || {}),
      scoring: { ...fallback.reportConfig.scoring, ...(input.reportConfig?.scoring || {}) },
      levels: normalizeArray(input.reportConfig?.levels, fallback.reportConfig.levels),
      sections: normalizeArray(input.reportConfig?.sections, fallback.reportConfig.sections),
    },
    version: String(input.version || fallback.version || "default"),
    status: String(input.status || fallback.status || "published"),
    updatedAt: String(input.updatedAt || fallback.updatedAt || new Date().toISOString()),
  };
}

function normalizeQuestions(questions: any[]) {
  return normalizeArray(questions, []).map((question: any) => {
    const type = ["text", "email", "textarea", "single", "triple", "scale"].includes(question?.type) ? question.type : "textarea";
    return {
      key: String(question?.key || "").trim(),
      module: String(question?.module || ""),
      kicker: String(question?.kicker || ""),
      title: String(question?.title || ""),
      help: String(question?.help || ""),
      type,
      placeholder: String(question?.placeholder || ""),
      itemLabel: String(question?.itemLabel || ""),
      firstPlaceholder: String(question?.firstPlaceholder || ""),
      options: normalizeArray(question?.options, []).map(String).filter(Boolean),
      scaleLabels: normalizeArray(question?.scaleLabels, ["尚未建立", "较不一致", "部分一致", "基本一致", "高度一致"]).map(String).slice(0, 5),
    };
  }).filter((question: any) => question.key && question.title);
}

function validateContent(content: any) {
  for (const type of ["personal", "corporate"]) {
    const questions = content.questions?.[type] || [];
    const keys = new Set<string>();
    for (const question of questions) {
      if (!question.key || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(question.key)) return `${type} 问卷存在无效题目 key。`;
      if (keys.has(question.key)) return `${type} 问卷存在重复 key：${question.key}`;
      keys.add(question.key);
      if (!question.title) return `${type} 问卷存在未填写标题的题目。`;
      if (question.type === "single" && (!Array.isArray(question.options) || question.options.filter(Boolean).length < 2)) return `${question.title} 至少需要两个选项。`;
      if (question.type === "scale" && (!Array.isArray(question.scaleLabels) || question.scaleLabels.filter(Boolean).length !== 5)) return `${question.title} 必须有 5 个评分标签。`;
    }
    for (const required of ["contactName", "contactMethod", "email"]) {
      if (!keys.has(required)) return `${type} 问卷必须保留 ${required}。`;
    }
  }
  const scoring = content.reportConfig?.scoring || {};
  for (const key of ["positioning", "value", "trust"]) {
    if (Number(scoring[key]) <= 0) return "报告评分权重必须大于 0。";
  }
  return "";
}

function normalizeArray(value: any, fallback: any[]) {
  return Array.isArray(value) ? value : fallback;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function createContentVersion() {
  return `v${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${crypto.randomBytes(2).toString("hex")}`;
}

async function createSession(store: ReturnType<typeof getStore>, userId: string) {
  const token = crypto.randomBytes(24).toString("hex");
  await store.setJSON(`sessions/${hashToken(token)}`, {
    userId,
    expiresAt: new Date(Date.now() + 7 * 864e5).toISOString(),
  });
  return token;
}

function validateContact(answers: Record<string, any>) {
  if (String(answers.contactName || "").trim().length < 2) return "请填写姓名。";
  if (String(answers.contactMethod || "").trim().length < 5) return "请填写有效的手机号码或微信号。";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(answers.email || "").trim())) return "请填写有效的邮箱地址。";
  return "";
}

function adminDiagnosisSummary(diagnosis: Diagnosis) {
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

function publicDiagnosis(diagnosis: Diagnosis) {
  const result = { ...diagnosis };
  delete result.generationToken;
  return result;
}

function publicInvite(invite: Invite) {
  return {
    code: invite.code,
    status: invite.status,
    used: invite.used,
    maxUses: invite.maxUses,
    expiresAt: invite.expiresAt,
    createdAt: invite.createdAt || null,
  };
}

function createInviteCode(config: AuthConfig) {
  let code = "";
  do {
    const value = crypto.randomBytes(5).toString("hex").toUpperCase();
    code = `LHB-${value.slice(0, 5)}-${value.slice(5)}`;
  } while (config.invites.some((item) => item.code === code));
  return code;
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function json(status: number, payload: unknown, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders,
    },
  });
}

function getSessionToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  if (authorization.startsWith("Bearer ")) return authorization.slice(7).trim();
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)brand_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function sessionCookie(token: string) {
  return `brand_session=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${7 * 86400}`;
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function hashStableId(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function exchangeWechatLoginCode(params: { appId: string; appSecret: string; code: string }) {
  const url = new URL("https://api.weixin.qq.com/sns/jscode2session");
  url.searchParams.set("appid", params.appId);
  url.searchParams.set("secret", params.appSecret);
  url.searchParams.set("js_code", params.code);
  url.searchParams.set("grant_type", "authorization_code");

  try {
    const response = await fetch(url);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.errcode) {
      console.error("Wechat login failed:", {
        status: response.status,
        errcode: payload.errcode,
        errmsg: payload.errmsg,
      });
      return { message: "微信登录校验失败，请重新进入小程序后再试。" };
    }
    return {
      openid: String(payload.openid || ""),
      unionid: payload.unionid ? String(payload.unionid) : undefined,
    };
  } catch (error) {
    console.error("Wechat login request failed:", error);
    return { message: "微信登录服务暂时不可用，请稍后再试。" };
  }
}

async function checkAiStatus() {
  const minimaxKey = Netlify.env.get("MINIMAX_API_KEY");
  if (minimaxKey) {
    const model = Netlify.env.get("MINIMAX_MODEL") || "MiniMax-M3";
    try {
      const response = await fetch("https://api.minimaxi.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${minimaxKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          thinking: { type: "disabled" },
          messages: [{ role: "user", content: "只回复：连接正常" }],
          max_completion_tokens: 20,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      return {
        configured: true,
        provider: "minimax",
        model,
        ok: response.ok,
        status: response.status,
        error: payload?.base_resp?.status_code || payload?.error?.code || null,
        message: response.ok ? "模型连接正常" : String(payload?.base_resp?.status_msg || payload?.error?.message || "模型请求失败").slice(0, 240),
      };
    } catch (error) {
      return {
        configured: true,
        provider: "minimax",
        model,
        ok: false,
        status: 0,
        error: "network_error",
        message: String(error instanceof Error ? error.message : error).slice(0, 240),
      };
    }
  }

  return { configured: false, provider: "minimax", model: "MiniMax-M3", ok: false, error: "missing_api_key" };
}
