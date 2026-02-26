import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Github, Code, Layout, Layers, Zap, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function HomePage() {
  const navigate = useNavigate();
  const [repoUrl, setRepoUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl) {
      toast.error("Please enter a GitHub repository URL");
      return;
    }
    
    setIsAnalyzing(true);
    
    try {
      let raw = repoUrl.trim()
        .replace(/^https?:\/\//i, '')
        .replace(/^www\./i, '')
        .replace(/^github\.com\//i, '')
        .split('#')[0]
        .split('?')[0]
        .replace(/\/+$/, '')
        .replace(/\.git$/i, '');

      const parts = raw.split('/');
      const owner = parts[0];
      const repoName = parts[1];

      if (!owner || !repoName) {
        toast.error('Invalid GitHub URL. Use format: github.com/owner/repo');
        setIsAnalyzing(false);
        return;
      }

      // Consistent storage for history/dashboard, though viewer uses params
      localStorage.setItem('codemap_current_repo', JSON.stringify({ url: repoUrl, owner, repoName }));
      
      // Also update the history list if needed, but for now just the current one as requested
      // We'll leave existing localStorage logic if it's not breaking things, but the plan emphasized ONE key.
      // actually the plan said: Use ONE key: "codemap_current_repo"
      
      navigate(`/repo/${owner}/${repoName}`);
      
    } catch (error) {
      console.error("Analysis failed:", error);
      toast.error("Failed to start analysis. Please try again.");
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code className="w-6 h-6 text-cyan-400" />
            <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              CodeMap
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/dashboard")} className="text-slate-300 hover:text-white hover:bg-slate-800">
              Dashboard
            </Button>
            <Button 
              className="bg-cyan-600 hover:bg-cyan-500 text-white border-0"
              onClick={() => {
                const element = document.getElementById('analyze-section');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      <main className="pt-32 pb-20">
        {/* Hero Section */}
        <section id="analyze-section" className="container mx-auto px-4 text-center max-w-4xl">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
            Understand Any Codebase{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Instantly
            </span>
          </h1>
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            AI-powered recursive analysis that maps dependencies, detects intent mismatches, 
            and surfaces errors — visually. No sign-up required.
          </p>

          <div className="bg-slate-900/50 border border-slate-800 p-2 rounded-2xl max-w-2xl mx-auto backdrop-blur-sm shadow-2xl shadow-cyan-900/10 mb-6">
            <form onSubmit={handleAnalyze} className="flex flex-col md:flex-row gap-2">
              <div className="relative flex-1">
                <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input 
                  placeholder="https://github.com/owner/repo" 
                  className="pl-10 bg-slate-950 border-slate-800 focus:border-cyan-500 h-12 text-base text-slate-100 placeholder:text-slate-600"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                />
              </div>
              <Button 
                type="submit" 
                size="lg" 
                className="h-12 px-8 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 text-white font-semibold transition-all"
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⚡</span> Analyzing...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Analyze Repository <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="container mx-auto px-4 py-24">
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard 
              icon={<Search className="w-6 h-6 text-cyan-400" />}
              title="Intent-Aware Analysis"
              description="Agents read READMEs, docstrings, and comments to understand what code is supposed to do — then verify it actually does."
            />
            <FeatureCard 
              icon={<Layout className="w-6 h-6 text-emerald-400" />}
              title="Visual Dependency Maps"
              description="Navigate your codebase as an interactive graph. Click any directory node to drill down into its structure."
            />
            <FeatureCard 
              icon={<ShieldCheck className="w-6 h-6 text-red-400" />}
              title="Error Detection"
              description="Red-highlighted nodes instantly reveal where your code diverges from its stated intent — down to the function level."
            />
            <FeatureCard 
              icon={<Zap className="w-6 h-6 text-amber-400" />}
              title="Auto Re-analysis"
              description="Connect GitHub webhooks to automatically re-analyze on every push and get email notifications."
            />
            <FeatureCard 
              icon={<Layers className="w-6 h-6 text-purple-400" />}
              title="Recursive Architecture"
              description="One AI agent per directory. Each agent understands its scope and reports up to its parent — exactly like your team does."
            />
            <FeatureCard 
              icon={<Code className="w-6 h-6 text-blue-400" />}
              title="Fast Navigation"
              description="Generated static maps load instantly. Navigate complex repos without waiting for repeated analyses."
            />
          </div>
        </section>

        {/* How It Works */}
        <section className="container mx-auto px-4 py-12 border-t border-slate-800">
          <h2 className="text-3xl font-bold text-center mb-12 text-slate-100">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <Step number="1" title="Paste URL" desc="Enter any public GitHub repository URL" />
            <Step number="2" title="AI Analysis" desc="Agents recursively analyze structure & intent" />
            <Step number="3" title="Explore Map" desc="Navigate the interactive visual dependency graph" />
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800 py-8 text-center text-slate-500 text-sm bg-slate-950">
        <p>Built for hackathons. Powered by OpenAI + Convex.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl hover:border-cyan-500/30 transition-colors group">
      <div className="mb-4 bg-slate-800 w-12 h-12 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-3 text-slate-100">{title}</h3>
      <p className="text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}

function Step({ number, title, desc }: { number: string, title: string, desc: string }) {
  return (
    <div className="relative">
      <div className="w-16 h-16 bg-slate-900 border border-slate-700 rounded-full flex items-center justify-center text-2xl font-bold text-cyan-400 mx-auto mb-4 z-10 relative shadow-lg shadow-cyan-900/20">
        {number}
      </div>
      <h3 className="text-lg font-semibold mb-2 text-slate-200">{title}</h3>
      <p className="text-slate-400">{desc}</p>
    </div>
  );
}
