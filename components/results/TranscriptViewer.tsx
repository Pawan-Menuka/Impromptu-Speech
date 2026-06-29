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
        <h2 className="text-sm font-medium">Transcript</h2>
        {highlightFillers && (
          <span className="text-xs text-zinc-400">filler words highlighted</span>
        )}
      </div>

      {!transcript ? (
        <p className="mt-2 text-sm text-zinc-500">(no speech detected)</p>
      ) : highlightFillers ? (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-7">
          {tokenizeTranscript(transcript).map((t, i) =>
            t.isFiller ? (
              <mark
                key={i}
                className="rounded bg-amber-200 px-0.5 text-amber-900 dark:bg-amber-500/30 dark:text-amber-200"
              >
                {t.text}
              </mark>
            ) : (
              <span key={i}>{t.text}</span>
            ),
          )}
        </p>
      ) : (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{transcript}</p>
      )}
    </section>
  );
}
