import axios from "axios";

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
  return axios.get(`${serverUrl}api/ops/database`).then((response) => {
    if (!response.data.success) {
      throw new Error(response.data.error || "Failed to load database stats");
    }
    return { totalBytes: response.data.totalBytes, tables: response.data.tables };
  });
}
