import { NextResponse } from "next/server";
import { hasSupabasePublicConfig } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

function csvCell(value: unknown) {
  let text = String(value ?? "");
  // Prevent spreadsheet applications from interpreting user-controlled cells as formulas.
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  text = text.replaceAll('"', '""');
  return `"${text}"`;
}

export async function GET() {
  if (!hasSupabasePublicConfig()) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase.from("donations").select("code,incident_id,donation_type,review_status,current_status,amount,currency,is_anonymous,payment_method,payment_reference,created_at,updated_at").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const header = ["Code","Incident ID","Type","Approval","Status","Amount","Currency","Anonymous","Payment Method","Payment Reference","Created","Updated"];
  const lines = [header.map(csvCell).join(","), ...(data ?? []).map((row) => [row.code,row.incident_id,row.donation_type,row.review_status === "PENDING" ? "Needs admin approval" : row.review_status,row.current_status,row.amount,row.currency,row.is_anonymous,row.payment_method,row.payment_reference,row.created_at,row.updated_at].map(csvCell).join(","))];
  return new NextResponse(lines.join("\n"), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="safe-sphere-donations.csv"' } });
}
