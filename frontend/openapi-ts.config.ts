import { defineConfig } from "@hey-api/openapi-ts";

const plugins = ["@hey-api/typescript", "@hey-api/sdk", "@hey-api/client-axios"] as const;

export default defineConfig([
  {
    input: "../api-specs/template-service.json",
    output: {
      path: "src/lib/api/generated/template-service",
      postProcess: ["prettier"],
    },
    plugins,
  },
  // Добавить новые сервисы по аналогии:
  // {
  //   input: "https://staging.alexeykiselev.tech/userservice/swagger/v1/swagger.json",
  //   output: { path: "src/lib/api/generated/userservice", postProcess: ["prettier"] },
  //   plugins,
  // },
]);