import { Dashboard } from "@/components/creator/dashboard";
import { PageShell } from "@/components/layout/PageShell";

export const metadata = {
  title: "Dashboard · glint",
};

export default function DashboardPage() {
  return (
    <PageShell maxWidth="3xl">
      <div className="mb-10">
        <h1 className="font-display text-5xl mb-3">Settings</h1>
        <p className="text-[var(--color-ink-soft)]">
          Manage your profile, tipping link, and connected wallet.
        </p>
      </div>
      <Dashboard />
    </PageShell>
  );
}
