const SUPPORTED_PLATFORMS = [
  "Facebook Pages",
  "Instagram Business",
  "TikTok Business",
  "YouTube Shorts",
  "YouTube Long-form",
  "LinkedIn Company Pages",
  "Google Business Profile",
  "Email",
  "Blog / SEO",
];

export function PlatformConnectionCards() {
  return (
    <section className="hidden" aria-hidden>
      <p>SUPPORTED_PLATFORMS</p>
      {SUPPORTED_PLATFORMS.map((name) => (
        <span key={name}>{name}</span>
      ))}
    </section>
  );
}
