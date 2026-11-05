import { signOutAction } from "@/app/actions/auth";
import type { UserRole } from "@/types/domain";
import { titleCaseStatus } from "@/lib/format";
import { SubmitButton } from "@/components/ui/submit-button";

export function DashboardUser({ name, email, roles }: { name: string; email: string; roles: UserRole[] }) {
  return (
    <div className="dashboard-user">
      <div>
        <strong>{name}</strong>
        <span>{email}</span>
      </div>
      <div className="role-list">
        {roles.filter((role) => role !== "PUBLIC").slice(0, 3).map((role) => (
          <span key={role}>{titleCaseStatus(role)}</span>
        ))}
      </div>
      <form action={signOutAction}>
        <SubmitButton className="button button-sidebar" pendingText="Signing out…">Sign out</SubmitButton>
      </form>
    </div>
  );
}
