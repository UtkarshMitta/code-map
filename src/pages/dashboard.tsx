import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
// Only lucide-react for icons, no shadcn/ui where possible, or minimal as per plan
import { 
  Code, 
  Plus, 
  Github, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowRight,
  Search,
  Layout,
  ShieldCheck
} from "lucide-react";
import { toast } from "sonner";

// Simple UI components to replace shadcn for this file to be safe and dependency-free
const Button = ({ children, onClick, className, variant = 'primary', disabled }: any) => {
  const base = "px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: any = {
    primary: "bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/20",
    outline: "border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white bg-transparent",
    ghost: "text-slate-400 hover:text-white hover:bg-slate-800 bg-transparent"
  };
  return (
    <button onClick={onClick} className={`${base} ${variants[variant]} ${className}`} disabled={disabled}>
      {children}
    </button>
  );
};

const Input = ({ value, onChange, placeholder, className, required }: any) => (
  <input 
    value={value} 
    onChange={onChange} 
    placeholder={placeholder}
    required={required}
    className={`w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 ${className}`}
  />
);

const Card = ({ children, className }: any) => (
  <div className={`bg-slate-900 border border-slate-800 rounded-xl overflow-hidden ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, className }: any) => (
  <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${className}`}>
    {children}
  </span>
);

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
      // 1. Read the main active repo
      const storedRepo = localStorage.getItem('codemap_repo');
      const mockRepos: RepoData[] = [
        { id: 'mock-1', owner: 'facebook', repoName: 'react', status: 'complete', dirs: 47, errors: 2, timestamp: Date.now() - 10000000 },
        { id: 'mock-2', owner: 'vercel', repoName: 'next.js', status: 'complete', dirs: 89, errors: 5, timestamp: Date.now() - 20000000 },
      ];

      let activeRepos: RepoData[] = [...mockRepos];

      if (storedRepo) {
        const parsed = JSON.parse(storedRepo);
        if (parsed.owner && parsed.repoName) {
           const newRepo: RepoData = {
             id: `${parsed.owner}-${parsed.repoName}`,
             owner: parsed.owner,
             repoName: parsed.repoName,
             status: 'complete',
             dirs: 12, // Mock count
             errors: 0,
             timestamp: Date.now()
           };
           // Add to top
           activeRepos = [newRepo, ...mockRepos];
        }
      }
      
      setRepos(activeRepos);
    } catch (e) {
      console.error("Error reading localStorage:", e);
      // Fallback to mocks
      setRepos([
        { id: 'mock-1', owner: 'facebook', repoName: 'react', status: 'complete', dirs: 47, errors: 2, timestamp: Date.now() }
      ]);
    }
  }, []);

  const handleAddRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Parse URL
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

      const repoId = `${owner}-${repoName}`;

      // Save to localStorage
      localStorage.setItem('codemap_repo', JSON.stringify({ 
        url: `https://github.com/${owner}/${repoName}`, 
        owner, 
        repoName 
      }));

      // Simulate network request
      await new Promise(resolve => setTimeout(resolve, 800));

      toast.success("Repository added successfully");
      setIsDialogOpen(false);
      setRepoUrl("");
      
      // Navigate
      navigate(`/repo/${repoId}`);
      
    } catch (error) {
      toast.error("Invalid GitHub URL. Format: owner/repo");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30">
      
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-30">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate("/")}>
            <Code className="w-6 h-6 text-cyan-400" />
            <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              CodeMap
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/")}>
              Home
            </Button>
            <div className="h-8 w-px bg-slate-800" />
             <div className="flex items-center gap-2">
               <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 font-bold border border-cyan-500/20">
                 U
               </div>
             </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        
        {/* Title Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-slate-400">Manage your analyzed repositories and view insights.</p>
          </div>
          
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4" />
            Add Repository
          </Button>
        </div>

        {/* Modal/Dialog (Custom implementation to avoid shadcn deps issue if any) */}
        {isDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <h2 className="text-xl font-bold text-white mb-4">Analyze Repository</h2>
              <form onSubmit={handleAddRepo} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">GitHub URL</label>
                  <Input 
                    value={repoUrl}
                    onChange={(e: any) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/owner/repo"
                    required
                    autoFocus
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Analyze"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Repo Grid */}
        {repos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-900/30 rounded-2xl border border-slate-800 border-dashed">
            <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4 text-slate-500 ring-1 ring-slate-700">
              <Github className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-medium text-slate-200 mb-2">No repositories yet</h3>
            <p className="text-slate-400 max-w-md text-center mb-6">
              Add a GitHub repository to start mapping your codebase.
            </p>
            <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
              Analyze First Repo
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {repos.map((repo) => (
              <RepoCard key={repo.id} repo={repo} navigate={navigate} />
            ))}
          </div>
        )}

      </main>
    </div>
  );
}

function RepoCard({ repo, navigate }: { repo: RepoData, navigate: any }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "complete": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "failed": return "bg-red-500/10 text-red-400 border-red-500/20";
      case "analyzing": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      default: return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "complete": return <CheckCircle2 className="w-3 h-3" />;
      case "failed": return <XCircle className="w-3 h-3" />;
      case "analyzing": return <Loader2 className="w-3 h-3 animate-spin" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  return (
    <Card className="hover:border-cyan-500/30 transition-all duration-300 group flex flex-col h-full shadow-lg hover:shadow-cyan-900/10">
      <div className="p-5 border-b border-slate-800/50 bg-slate-900/50">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <Github className="w-4 h-4 text-slate-500" />
            <span className="text-xs text-slate-500 font-mono tracking-wide uppercase">{repo.owner}</span>
          </div>
          <Badge className={`${getStatusColor(repo.status)} border uppercase tracking-wider`}>
            {getStatusIcon(repo.status)}
            {repo.status}
          </Badge>
        </div>
        <h3 className="text-xl font-bold text-slate-100 group-hover:text-cyan-400 transition-colors truncate">
          {repo.repoName}
        </h3>
      </div>
      
      <div className="p-5 flex-1 bg-slate-900/30 space-y-4">
        <div className="grid grid-cols-2 gap-4">
           <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50">
             <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider mb-1">
               <Layout className="w-3 h-3" /> Directories
             </div>
             <div className="text-xl font-mono text-slate-200">{repo.dirs}</div>
           </div>
           <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50">
             <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider mb-1">
               <ShieldCheck className="w-3 h-3" /> Errors
             </div>
             <div className={`text-xl font-mono ${repo.errors > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{repo.errors}</div>
           </div>
        </div>
      </div>
      
      <div className="p-5 pt-0 bg-slate-900/30">
        <Button 
          className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 group-hover:border-cyan-500/30 group-hover:text-cyan-50"
          onClick={() => navigate(`/repo/${repo.id}`)}
        >
          View Map <ArrowRight className="w-4 h-4 ml-2 opacity-50 group-hover:opacity-100 transition-opacity" />
        </Button>
      </div>
    </Card>
  );
}
