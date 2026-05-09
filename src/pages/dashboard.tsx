import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  CodeMapLogo,
  GitHubIcon,
  PlusIcon,
  CheckIcon,
  XIcon,
  ClockIcon,
  ArrowRightIcon,
  LoaderIcon,
  LayoutIcon,
  ShieldCheckIcon,
} from "@/components/icons";

interface RepoData {
  id: string;
  owner: string;
  repoName: string;
  status: 'complete' | 'analyzing' | 'failed';
  dirs: number;
  errors: number;
  timestamp: number;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [repos, setRepos] = useState<RepoData[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [repoUrl, setRepoUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    try {
      const storedRepo = localStorage.getItem('codemap_repo');
      const storedCurrent = localStorage.getItem('codemap_current_repo');
      const mockRepos: RepoData[] = [
        { id: 'mock-1', owner: 'facebook', repoName: 'react', status: 'complete', dirs: 47, errors: 2, timestamp: Date.now() - 10000000 },
        { id: 'mock-2', owner: 'vercel', repoName: 'next.js', status: 'complete', dirs: 89, errors: 5, timestamp: Date.now() - 20000000 },
      ];

      let activeRepos: RepoData[] = [...mockRepos];

      const stored = storedCurrent || storedRepo;
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.owner && parsed.repoName) {
          const exists = mockRepos.some(r => r.owner === parsed.owner && r.repoName === parsed.repoName);
          if (!exists) {
            const newRepo: RepoData = {
              id: `${parsed.owner}/${parsed.repoName}`,
              owner: parsed.owner,
              repoName: parsed.repoName,
              status: 'complete',
              dirs: 12,
              errors: 0,
              timestamp: Date.now()
            };
            activeRepos = [newRepo, ...mockRepos];
          }
        }
      }

      setRepos(activeRepos);
    } catch (e) {
      console.error("Error reading localStorage:", e);
      setRepos([
        { id: 'mock-1', owner: 'facebook', repoName: 'react', status: 'complete', dirs: 47, errors: 2, timestamp: Date.now() }
      ]);
    }
  }, []);

  const handleAddRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let owner = "";
      let repoName = "";

      let urlToParse = repoUrl.trim();
      if (urlToParse.endsWith('/')) urlToParse = urlToParse.slice(0, -1);

      if (!urlToParse.startsWith('http') && !urlToParse.startsWith('github.com')) {
        const parts = urlToParse.split('/');
        if (parts.length === 2) { owner = parts[0]; repoName = parts[1]; }
      } else {
        if (!urlToParse.startsWith('http')) urlToParse = 'https://' + urlToParse;
        const urlObj = new URL(urlToParse);
        const parts = urlObj.pathname.split('/').filter(Boolean);
        if (parts.length >= 2) { owner = parts[0]; repoName = parts[1]; }
      }

      if (!owner || !repoName) throw new Error("Invalid URL");

      localStorage.setItem('codemap_current_repo', JSON.stringify({
        url: `https://github.com/${owner}/${repoName}`,
        owner,
        repoName
      }));

      await new Promise(resolve => setTimeout(resolve, 800));

      toast.success("Repository added successfully");
      setIsDialogOpen(false);
      setRepoUrl("");

      navigate(`/repo/${owner}/${repoName}`);

    } catch {
      toast.error("Invalid GitHub URL. Format: owner/repo");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-sans selection:bg-cyan-500/30">
      {/* Header */}
      <header className="border-b border-white/[0.06] bg-[#030712]/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button className="flex items-center gap-3 hover:opacity-80 transition-opacity" onClick={() => navigate("/")}>
            <CodeMapLogo size={28} />
            <span className="text-lg font-semibold tracking-tight text-white">CodeMap</span>
          </button>

          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/")} className="text-sm text-slate-400 hover:text-white transition-colors">
              Home
            </button>
            <div className="h-6 w-px bg-white/[0.06]" />
            <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-slate-400 text-sm font-medium border border-white/[0.06]">
              U
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight mb-1">Dashboard</h1>
            <p className="text-slate-400 text-sm">Manage your analyzed repositories and view insights.</p>
          </div>

          <button
            onClick={() => setIsDialogOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 rounded-xl shadow-lg shadow-cyan-500/10 transition-all"
          >
            <PlusIcon size={16} />
            Add Repository
          </button>
        </div>

        {/* Modal */}
        {isDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#0a0f1a] border border-white/[0.08] rounded-2xl w-full max-w-md p-6 shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-5">Analyze Repository</h2>
              <form onSubmit={handleAddRepo} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">GitHub URL</label>
                  <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 focus-within:border-cyan-500/40 transition-colors">
                    <GitHubIcon className="text-slate-500 shrink-0" size={18} />
                    <input
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      placeholder="github.com/owner/repo"
                      required
                      autoFocus
                      className="w-full bg-transparent border-0 px-3 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl transition-colors"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 rounded-xl transition-all disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <LoaderIcon size={14} />
                      </span>
                    ) : "Analyze"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Repo Grid */}
        {repos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-dashed border-white/[0.06] bg-white/[0.01]">
            <div className="w-16 h-16 rounded-full bg-white/[0.04] flex items-center justify-center mb-5 border border-white/[0.06]">
              <GitHubIcon className="text-slate-500" size={28} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No repositories yet</h3>
            <p className="text-sm text-slate-400 max-w-md text-center mb-6">
              Add a GitHub repository to start mapping your codebase.
            </p>
            <button
              onClick={() => setIsDialogOpen(true)}
              className="px-5 py-2.5 text-sm font-medium text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl transition-colors"
            >
              Analyze First Repo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {repos.map((repo) => (
              <RepoCard key={repo.id} repo={repo} navigate={navigate} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function RepoCard({ repo, navigate }: { repo: RepoData, navigate: (path: string) => void }) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "complete": return { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: <CheckIcon className="text-emerald-400" size={12} /> };
      case "failed": return { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", icon: <XIcon className="text-red-400" size={12} /> };
      case "analyzing": return { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: <LoaderIcon className="text-amber-400" size={12} /> };
      default: return { color: "text-slate-400", bg: "bg-slate-500/10 border-slate-500/20", icon: <ClockIcon className="text-slate-400" size={12} /> };
    }
  };

  const cfg = getStatusConfig(repo.status);

  return (
    <div className="group flex flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300 overflow-hidden">
      <div className="p-5 border-b border-white/[0.04]">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <GitHubIcon className="text-slate-500" size={14} />
            <span className="text-xs text-slate-500 font-mono tracking-wide">{repo.owner}</span>
          </div>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider border ${cfg.bg}`}>
            {cfg.icon}
            <span className={cfg.color}>{repo.status}</span>
          </span>
        </div>
        <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors truncate">
          {repo.repoName}
        </h3>
      </div>

      <div className="p-5 flex-1 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/[0.03] p-3 rounded-xl border border-white/[0.04]">
            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] uppercase tracking-wider mb-1">
              <LayoutIcon size={10} /> Directories
            </div>
            <div className="text-xl font-mono text-white">{repo.dirs}</div>
          </div>
          <div className="bg-white/[0.03] p-3 rounded-xl border border-white/[0.04]">
            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] uppercase tracking-wider mb-1">
              <ShieldCheckIcon size={10} /> Errors
            </div>
            <div className={`text-xl font-mono ${repo.errors > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{repo.errors}</div>
          </div>
        </div>
      </div>

      <div className="px-5 pb-5">
        <button
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] group-hover:border-cyan-500/20 rounded-xl transition-all"
          onClick={() => navigate(`/repo/${repo.owner}/${repo.repoName}`)}
        >
          View Map <ArrowRightIcon size={14} className="opacity-50 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>
    </div>
  );
}
