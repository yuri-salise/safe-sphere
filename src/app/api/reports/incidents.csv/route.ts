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
  const { data, error } = await supabase.from("incidents").select("code,title,incident_type,severity,status,location_label,estimated_affected,is_public,created_at,updated_at").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const header = ["Code","Title","Type","Severity","Status","Location","Estimated Affected","Public","Created","Updated"];
  const lines = [header.map(csvCell).join(","), ...(data ?? []).map((row) => [row.code,row.title,row.incident_type,row.severity,row.status,row.location_label,row.estimated_affected,row.is_public,row.created_at,row.updated_at].map(csvCell).join(","))];
  return new NextResponse(lines.join("\n"), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="safe-sphere-incidents.csv"' } });
}
