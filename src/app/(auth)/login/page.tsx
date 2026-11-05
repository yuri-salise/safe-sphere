import type { Metadata } from "next";
import { AuthPanel } from "@/components/auth/auth-panel";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return <AuthPanel mode="login" />;
}
