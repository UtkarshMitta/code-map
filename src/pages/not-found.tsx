import { ArrowLeftIcon, CodeMapLogo } from '@/components/icons';

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#030712]">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-cyan-500/[0.03] rounded-full blur-[120px]" />
      </div>

      <div className="text-center space-y-8 px-4 relative z-10">
        <div className="flex justify-center mb-6">
          <CodeMapLogo size={48} />
        </div>

        <div className="space-y-3">
          <h1 className="text-8xl font-bold text-white/[0.06] tracking-tighter font-mono">
            404
          </h1>
          <p className="text-2xl font-semibold text-white">
            Page Not Found
          </p>
          <p className="text-slate-400 max-w-md mx-auto text-sm leading-relaxed">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <a
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-xl transition-all"
        >
          <ArrowLeftIcon size={16} />
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
