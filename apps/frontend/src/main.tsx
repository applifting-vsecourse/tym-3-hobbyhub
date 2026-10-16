import { StrictMode } from "react"
import ReactDOM from "react-dom/client"

import { Providers } from "@/app/Providers"

import "@/i18n"

const rootElement = document.getElementById("root")!

if (!rootElement.innerHTML) {
  ReactDOM.createRoot(rootElement).render(
    <StrictMode>
      <Providers />
    </StrictMode>,
  )
}
