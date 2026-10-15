import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "OWNER" | "OPERADOR";
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: "OWNER" | "OPERADOR";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "OWNER" | "OPERADOR";
  }
}
