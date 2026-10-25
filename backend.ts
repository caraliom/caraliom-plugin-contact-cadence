import { defineBackend } from "@caraliom/plugin-sdk/backend";
import type { BackendHandlers, SaveTransformHandlers } from "./generated/client";

export default defineBackend<BackendHandlers, SaveTransformHandlers>({
  handlers: {},
});
