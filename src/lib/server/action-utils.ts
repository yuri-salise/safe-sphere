import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUserContext } from "@/lib/auth";

export function formText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function formNumber(formData: FormData, key: string, fallback = 0) {
  const value = Number(formText(formData, key));
  return Number.isFinite(value) ? value : fallback;
}

export function formBool(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

export function actionErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "The requested operation could not be completed.";
}

export function redirectWithMessage(path: string, type: "success" | "error", message: string): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}${type}=${encodeURIComponent(message)}`);
}

export function refreshAndRedirect(path: string, message: string): never {
  revalidatePath(path);
  revalidatePath("/dashboard");
  redirectWithMessage(path, "success", message);
}

export async function actionContext() {
  const context = await requireUserContext();
  const supabase = await createClient();
  return { ...context, supabase };
}
