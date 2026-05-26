import { Badge } from "@/components/ui/badge";

type CampaignRow = {
  id?: string;
  status?: string;
  updatedAt?: string;
  createdAt?: string;
  output?: Record<string, unknown>;
  payload?: Record<string, unknown>;
};

const COLUMNS = ["Drafts", "Needs Approval", "Scheduled", "Published", "Needs Attention"];

export function CampaignKanban({ drafts = [], approvals = [], scheduled = [] }: { drafts?: CampaignRow[]; approvals?: CampaignRow[]; scheduled?: CampaignRow[] }) {
  const cards = [
    ...drafts.map((row) => ({ ...row, column: "Drafts" })),
    ...approvals.map((row) => ({ ...row, column: "Needs Approval" })),
    ...scheduled.map((row) => ({ ...row, column: "Scheduled" })),
  ];

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 text-white shadow-2xl" aria-label="Campaign Kanban">
      <div className="mb-5">
        <h2 className="text-2xl font-semibold">Campaigns</h2>
        <p className="text-sm text-slate-300">Card workflow for drafts, approvals, scheduled content and items that need attention.</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-5">
        {COLUMNS.map((column) => {
          const columnCards = cards.filter((card) => card.column === column);
          return (
            <div key={column} className="min-h-80 rounded-3xl border border-white/10 bg-black/20 p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold">{column}</p>
                <Badge className="border-white/10 bg-white/10 text-white">{columnCards.length}</Badge>
              </div>
              <div className="space-y-3">
                {columnCards.length ? columnCards.slice(0, 8).map((card) => (
                  <article key={`${column}-${card.id}`} className="rounded-2xl border border-white/10 bg-white/[0.07] p-3">
                    <p className="text-sm font-semibold">{String(card.output?.title || card.payload?.prompt || "Campaign draft")}</p>
                    <p className="mt-2 text-xs text-slate-300">{String(card.payload?.platform || card.output?.platform || "Platform mix")} - {String(card.output?.cta || "Next action ready")}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge className="border-white/10 bg-white/10 text-white">Open</Badge>
                      <Badge className="border-white/10 bg-white/10 text-white">Schedule</Badge>
                    </div>
                  </article>
                )) : (
                  <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-300">No cards here yet.</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
