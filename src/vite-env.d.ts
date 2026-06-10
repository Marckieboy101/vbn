/// <reference types="vite/client" />

declare interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_GEMINI_API_KEY?: string;
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}
