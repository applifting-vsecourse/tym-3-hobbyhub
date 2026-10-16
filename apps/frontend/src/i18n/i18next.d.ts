import type { resources } from "@/i18n/resources"

declare module "i18next" {
  type CustomTypeOptions = {
    defaultNS: "common"
    resources: (typeof resources)["cs"]
  }
}
