import { CreateProfileForm } from "@/components/creator/CreateProfileForm";
import { PageShell } from "@/components/layout/PageShell";

export default function CreatePage() {
  return (
    <PageShell maxWidth="xl">
      <div className="mb-10">
        <h1 className="font-display text-5xl mb-3">Create your profile</h1>
        <p className="text-[var(--color-ink-soft)]">
          Pick a handle, connect Freighter, and start receiving tips in under a
          minute.
        </p>
      </div>
      <CreateProfileForm />
    </PageShell>
  );
}
