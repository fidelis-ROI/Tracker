import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      email: string;
      role: "admin" | "operator";
      collaboratorId?: string;
    };
  }
  interface User {
    id: string;
    role?: string;
    collaboratorId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    collaboratorId?: string | null;
  }
}
