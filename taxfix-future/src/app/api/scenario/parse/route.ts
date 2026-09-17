import { NextRequest, NextResponse } from "next/server";
import { parseScenario, parseScenarioFallback } from "@/agents/scenario-agent";
import { UserProfile } from "@/types/profile";

export async function POST(req: NextRequest) {
  let body: { prompt?: string; profile?: UserProfile; offline?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { prompt, profile, offline } = body;
  if (!prompt || !profile) {
    return NextResponse.json({ error: "prompt and profile are required" }, { status: 400 });
  }

  // Never returns 500 on a model failure — on any failure, fall back and return 200.
  if (offline) {
    const scenario = parseScenarioFallback(prompt, profile);
    scenario.inferred.push("Parsed offline");
    return NextResponse.json({ scenario, source: "fallback", latencyMs: 0 });
  }

  const result = await parseScenario(prompt, profile);
  return NextResponse.json(result);
}
