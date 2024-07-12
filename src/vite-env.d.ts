/// <reference types="vite/client" />

interface APIResponse {
  status: "success" | "error";
  message: string;
  data?: any;
  detailed?: string[];
}

interface Window {
  api: {
    send(channel: string, ...args: any[]): void;
    invoke(channel: string, ...args: any[]): Promise<APIResponse>;
  };
}
