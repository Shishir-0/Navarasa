import { ScenarioDefinition } from "../types/navrasa";

const API_BASE_URL = "http://localhost:8000";

export async function fetchHealth(): Promise<{ status: string; system: string; version: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) throw new Error("Health check failed");
    return await res.json();
  } catch (err) {
    return { status: "OFFLINE", system: "NAVRASA", version: "1.0.0" };
  }
}

export async function fetchTimelineHistory(limit: number = 50): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/timeline?limit=${limit}`);
    if (!res.ok) throw new Error("Failed to fetch timeline");
    return await res.json();
  } catch (err) {
    return [];
  }
}
