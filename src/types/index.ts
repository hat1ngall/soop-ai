export interface User {
  id: string;
  name: string;
  email: string;
  plan: "free" | "pro" | "boost" | "enterprise";
  subscriptionExpiresAt: string | null;
}

export interface ChatSession {
  id: string;
  title: string;
  model: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}
