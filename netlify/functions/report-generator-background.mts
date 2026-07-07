import type { Context } from "@netlify/functions";
import { getDeployStore, getStore } from "@netlify/blobs";
import { generateReport } from "./_shared/report.mts";

type Diagnosis = {
  id: string;
  userId: string;
  type: "personal" | "corporate";
  name: string;
  status: "draft" | "generating" | "completed";
  progress: number;
  answers: Record<string, unknown>;
  report: unknown;
  reportConfigSnapshot?: unknown;
  consultationRequestedAt?: string;
  consultationSource?: string;
  generationToken?: string;
  generationRequestedAt?: string;
  generationError?: string;
  createdAt: string;
  updatedAt: string;
};

export default async function generateInBackground(request: Request, context: Context) {
  const body = await request.json().catch(() => ({})) as { diagnosisId?: string; token?: string };
  if (!body.diagnosisId || !body.token) return;

  const store = context.deploy.context === "production"
    ? getStore("brand-diagnoses", { consistency: "strong" })
    : getDeployStore("brand-diagnoses");
  const key = `diagnosis/${body.diagnosisId}`;
  const diagnosis = await store.get(key, { type: "json" }) as Diagnosis | null;
  if (!diagnosis || diagnosis.status !== "generating" || diagnosis.generationToken !== body.token) return;

  try {
    diagnosis.report = await generateReport(diagnosis, (name) => Netlify.env.get(name), diagnosis.reportConfigSnapshot);
    diagnosis.progress = 100;
    diagnosis.status = "completed";
    if (String(diagnosis.answers.consultationInterest || "").includes("需要")) {
      diagnosis.consultationRequestedAt = new Date().toISOString();
      diagnosis.consultationSource = "questionnaire_1v1";
    }
    delete diagnosis.generationError;
  } catch (error) {
    console.error("Report background generation failed:", error);
    diagnosis.status = "draft";
    diagnosis.generationError = "报告暂时无法生成，请稍后重试。";
  }

  delete diagnosis.generationToken;
  diagnosis.updatedAt = new Date().toISOString();
  await store.setJSON(key, diagnosis);
}
