type FloatingBlobsProps = {
  variant?: "hero" | "subtle";
};

export default function FloatingBlobs({ variant = "hero" }: FloatingBlobsProps) {
  const opacity = variant === "hero" ? 0.12 : 0.08;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        className="landing-blob-1 absolute -top-32 -left-32 h-[600px] w-[600px] rounded-full"
        style={{
          background: "radial-gradient(closest-side, #3B82F6, transparent 70%)",
          filter: "blur(120px)",
          opacity,
        }}
      />
      <div
        className="landing-blob-2 absolute -bottom-32 -right-32 h-[600px] w-[600px] rounded-full"
        style={{
          background: "radial-gradient(closest-side, #06B6D4, transparent 70%)",
          filter: "blur(120px)",
          opacity,
        }}
      />
      <div
        className="landing-blob-3 absolute left-1/2 top-1/2 h-[500px] w-[500px] rounded-full"
        style={{
          background: "radial-gradient(closest-side, #8B5CF6, transparent 70%)",
          filter: "blur(140px)",
          opacity: opacity * 0.7,
        }}
      />
      <div className="landing-dot-grid absolute inset-0" />
    </div>
  );
}
