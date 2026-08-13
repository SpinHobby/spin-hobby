import axios from "axios";
import { adminAuthHeaders } from "./adminAuth";

const serverUrl =
  process.env.NODE_ENV === "production"
    ? "https://spin-hobby-server.onrender.com/"
    : "http://localhost:8001/";

export interface IDatabaseTableStat {
  name: string;
  bytes: number;
  rowEstimate: number;
}

export interface IDatabaseStats {
  totalBytes: number;
  tables: IDatabaseTableStat[];
}

export function getDatabaseStats(): Promise<IDatabaseStats> {
  return axios.get(`${serverUrl}api/ops/database`, { headers: adminAuthHeaders() }).then((response) => {
    if (!response.data.success) {
      throw new Error(response.data.error || "Failed to load database stats");
    }
    return { totalBytes: response.data.totalBytes, tables: response.data.tables };
  });
}

export interface IAiToolBudget {
  tool: string;
  spendUsd: number;
  warnThresholdUsd: number;
  stopThresholdUsd: number;
  status: "ok" | "warn" | "blocked";
}

export function getAiUsage(): Promise<IAiToolBudget[]> {
  return axios.get(`${serverUrl}api/ops/ai-usage`, { headers: adminAuthHeaders() }).then((response) => {
    if (!response.data.success) {
      throw new Error(response.data.error || "Failed to load AI usage");
    }
    return response.data.tools;
  });
}

export function updateAiBudget(
  tool: string,
  warnThresholdUsd: number,
  stopThresholdUsd: number
): Promise<IAiToolBudget> {
  return axios
    .put(
      `${serverUrl}api/ops/ai-usage/${tool}`,
      { warnThresholdUsd, stopThresholdUsd },
      { headers: adminAuthHeaders() }
    )
    .then((response) => {
      if (!response.data.success) {
        throw new Error(response.data.error || "Failed to update budget");
      }
      return response.data.tool;
    });
}
