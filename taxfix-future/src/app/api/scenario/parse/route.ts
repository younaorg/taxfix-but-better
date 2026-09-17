import { NextRequest, NextResponse } from "next/server";
import { ALEX_PROFILE } from "@/data/demo-profile";
import { parseScenario } from "@/agents/scenario-agent";
import type { UserProfile } from "@/types/profile";

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const offline =
    req.nextUrl.searchParams.get("offline") === "1" ||
    process.env.OFFLINE === "1";
  try {
    const body = (await req.json()) as {
      prompt?: string;
      profile?: UserProfile;
    };
    const prompt = body.prompt ?? "";
    const profile = body.profile ?? ALEX_PROFILE;
    const result = await parseScenario(prompt, profile, offline);
    return NextResponse.json(result);
  } catch {
    const { parseScenarioFallback } = await import("@/agents/scenario-agent");
    const scenario = parseScenarioFallback("", ALEX_PROFILE);
    return NextResponse.json({
      scenario,
      source: "fallback" as const,
      latencyMs: Date.now() - t0,
    });
  }
}
