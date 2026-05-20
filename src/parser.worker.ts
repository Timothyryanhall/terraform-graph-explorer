import { parseTerraformPlan } from "./parser";

self.onmessage = (event: MessageEvent<string>) => {
  try {
    const result = parseTerraformPlan(event.data);
    self.postMessage({ success: true, data: result });
  } catch (error) {
    self.postMessage({
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown error during parsing",
    });
  }
};
