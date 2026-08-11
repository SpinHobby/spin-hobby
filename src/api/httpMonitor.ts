import axios from "axios";
import { reportBackendDown, reportBackendUp } from "../utils/maintenanceStatus";

// Global interceptor so every axios call across the app (all of which hit our
// own backend) reports connectivity, without touching each api/*.ts file.
// A missing response (network error) or a 502/503/504 from Render's proxy
// are the actual symptoms of a mid-deploy backend swap - a normal 4xx from
// our own validation is not, so those are left alone.
axios.interceptors.response.use(
  (response) => {
    reportBackendUp();
    return response;
  },
  (error) => {
    const status = error?.response?.status;
    const backendUnreachable = !error?.response || [502, 503, 504].includes(status);
    if (backendUnreachable) {
      reportBackendDown();
    } else {
      reportBackendUp();
    }
    return Promise.reject(error);
  }
);
