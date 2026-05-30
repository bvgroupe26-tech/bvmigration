export default function AuthLoading() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#F4F7FB]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#2F5F9D]/20 border-t-[#2F5F9D]" />
        <p className="text-sm font-medium text-slate-600">Chargement de votre session…</p>
      </div>
    </div>
  );
}
