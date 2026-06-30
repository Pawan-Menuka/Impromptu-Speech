export function AudioPlayback({ src }: { src: string }) {
  return (
    <section>
      <h2 className="text-sm font-medium">Your recording</h2>
      <audio controls src={src} className="mt-2 w-full">
        <track kind="captions" />
      </audio>
    </section>
  );
}
