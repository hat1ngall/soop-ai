export default function DashboardLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex gap-1">
        <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400" style={{ animationDelay: "0ms" }} />
        <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400" style={{ animationDelay: "150ms" }} />
        <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}
