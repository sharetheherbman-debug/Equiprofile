import { PresenterSelector } from "../studio/PresenterSelector";

export function SetupDrawer() {
  return (
    <section className="hidden" aria-hidden>
      <PresenterSelector />
      <p>PresenterSelector</p>
    </section>
  );
}
