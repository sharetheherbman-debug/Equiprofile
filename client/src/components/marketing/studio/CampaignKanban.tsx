import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type CampaignRow = {
  id?: string;
  status?: string;
  updatedAt?: string;
  createdAt?: string;
  output?: Record<string, unknown>;
  payload?: Record<string, unknown>;
};

const COLUMNS: Array<{ id: string; label: string; color: string }> = [
  { id: "Ideas", label: "Ideas", color: "border-stone-200 bg-stone-50" },
  { id: "Drafts", label: "Drafts", color: "border-blue-100 bg-blue-50" },
  { id: "Needs Approval", label: "Needs Approval", color: "border-amber-100 bg-amber-50" },
  { id: "Scheduled", label: "Scheduled", color: "border-violet-100 bg-violet-50" },
  { id: "Published", label: "Published", color: "border-emerald-100 bg-emerald-50" },
];

export function CampaignKanban({ drafts = [], approvals = [], scheduled = [] }: { drafts?: CampaignRow[]; approvals?: CampaignRow[]; scheduled?: CampaignRow[] }) {
  const cards = [
    ...drafts.map((row) => ({ ...row, column: "Drafts" })),
    ...approvals.map((row) => ({ ...row, column: "Needs Approval" })),
    ...scheduled.map((row) => ({ ...row, column: "Scheduled" })),
  ];

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm" aria-label="Campaign Kanban">
      <div className="mb-5">
        <h2 className="text-2xl font-semibold text-stone-900">Campaigns</h2>
        <p className="mt-1 text-sm text-stone-500">Card workflow — from idea to published.</p>
      </div>
      <div className="grid gap-3 xl:grid-cols-5">
        {COLUMNS.map(({ id: column, label, color }) => {
          const columnCards = cards.filter((card) => card.column === column);
          return (
            <div key={column} className={`min-h-80 rounded-2xl border p-3 ${color}`}>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-stone-800">{label}</p>
                <Badge className="rounded-full bg-white px-2 py-0.5 text-xs text-stone-500 shadow-sm">{columnCards.length}</Badge>
              </div>
              <div className="space-y-2">
                {columnCards.length ? columnCards.slice(0, 8).map((card) => (
                  <article key={`${column}-${card.id}`} className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
                    <p className="text-sm font-semibold text-stone-800">{String(card.output?.title || card.payload?.prompt || "Campaign draft")}</p>
                    <p className="mt-1 text-xs text-stone-500">{String(card.payload?.platform || card.output?.platform || "Multi-platform")}</p>
                    <div className="mt-2 flex gap-1.5">
                      <Button type="button" size="sm" variant="outline" className="h-7 rounded-lg border-stone-200 px-2.5 text-xs text-stone-600">Open</Button>
                      <Button type="button" size="sm" variant="outline" className="h-7 rounded-lg border-stone-200 px-2.5 text-xs text-stone-600">Schedule</Button>
                    </div>
                  </article>
                )) : (
                  <div className="rounded-xl border border-dashed border-stone-200 p-4 text-center text-xs text-stone-400">
                    No campaigns here yet
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
