import setupAxiosMock from "./setupAxiosMock";
import api from "../api";

export default function setupMocks() {
  if (process.env.REACT_APP_USE_MOCKS === "1") {
    setupAxiosMock(api);
    // eslint-disable-next-line no-console
    console.log("%c[MOCK] Axios mocks enabled", "color:#0a0");
  }
}
