import { tokenizeTranscript } from "@/lib/fillers";

export function TranscriptViewer({
  transcript,
  highlightFillers,
}: {
  transcript: string;
  highlightFillers: boolean;
}) {
  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-light">Transcript</h2>
        {highlightFillers && (
          <span className="flex items-center gap-1.5 font-label text-[0.65rem] uppercase tracking-[0.15em] text-faint">
            <span className="rounded bg-[#e8b45c]/25 px-1 text-[#e8b45c]">filler</span>
            highlighted
          </span>
        )}
      </div>

      <div className="glass mt-4 rounded-[18px] p-6">
        {!transcript ? (
          <p className="text-sm text-muted">(no speech detected)</p>
        ) : highlightFillers ? (
          <p className="whitespace-pre-wrap text-sm leading-7 text-muted">
            {tokenizeTranscript(transcript).map((t, i) =>
              t.isFiller ? (
                <mark key={i} className="rounded bg-[#e8b45c]/25 px-0.5 text-[#e8b45c]">
                  {t.text}
                </mark>
              ) : (
                <span key={i}>{t.text}</span>
              ),
            )}
          </p>
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-7 text-muted">{transcript}</p>
        )}
      </div>
    </section>
  );
}
