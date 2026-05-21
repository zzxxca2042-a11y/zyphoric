import { useState } from 'react';
import { ToolShell } from './ToolShell';
import { CopyButton } from './CopyButton';
import { useKeyboardShortcut } from './useKeyboardShortcut';
import { askAI } from './aiService';
import { Sparkles, Loader2 } from 'lucide-react';
import { useToast } from './ToastContext';

export const CodeExplainer = () => {
  const [code, setCode] = useState('');
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  const handleExplain = async () => {
    if (!code) return;
    setLoading(true);
    setError('');
    setExplanation('');
    try {
      const result = await askAI(
        `Please explain this code snippet in detail, focusing on its logic and functionality:\n\n\`\`\`\n${code}\n\`\`\``,
        "You are a helpful senior software engineer explaining code to another developer."
      );
      setExplanation(result);
    } catch (err) {
      setError('Unable to explain the code right now. Please try again.');
      showToast('AI response failed. Check your API key.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    (async () => {
      try {
        const { writeToClipboard } = await import('./clipboard');
        const ok = await writeToClipboard(explanation);
        if (ok) showToast('Explanation copied!', 'success');
        else showToast('Copy failed', 'error');
      } catch (e) {
        showToast('Copy failed', 'error');
      }
    })();
  };

  useKeyboardShortcut(
    { key: 'c', ctrl: true, shift: true },
    async () => {
      if (explanation) {
        try {
          const { writeToClipboard } = await import('./clipboard');
          const ok = await writeToClipboard(explanation);
          if (ok) showToast('Explanation copied to clipboard', 'success');
          else showToast('Copy failed', 'error');
        } catch (e) {
          showToast('Copy failed', 'error');
        }
      }
    },
    Boolean(explanation)
  );

  return (
    <ToolShell
      title="AI Code Explainer"
      description="Understand complex code snippets using AI-powered explanations."
      path="/ai/explainer"
      icon={Sparkles}
      iconColor="bg-emerald-500"
    >
      <div className="max-w-4xl mx-auto space-y-8">
      
      <div className="text-center space-y-4">
        <div className="inline-flex p-3 bg-emerald-500/10 rounded-2xl text-emerald-500 mb-2">
          <Sparkles size={32} />
        </div>
        <h2 className="text-4xl font-bold text-white">AI Code Explainer</h2>
        <p className="text-slate-400 text-lg">Paste your code and let AI break it down for you.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full h-64 bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-sm text-emerald-300 focus:ring-2 focus:ring-emerald-500 outline-none resize-none mb-4"
          placeholder="// Paste your code here..."
        />
        <button
          onClick={handleExplain}
          disabled={loading || !code}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
          {loading ? 'Analyzing Code...' : 'Explain Code'}
        </button>
      </div>

      {error && (
        <div className="bg-slate-900 border border-red-500/20 rounded-3xl p-6 text-red-200">
          <h3 className="text-lg font-semibold text-red-300 mb-2">Error</h3>
          <p>{error}</p>
        </div>
      )}

      {explanation && !error && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 relative group">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-emerald-400">Analysis</h3>
            <CopyButton value={explanation} label="Copy explanation" onCopy={copyToClipboard} />
          </div>
          <div className="prose prose-invert max-w-none text-slate-300 whitespace-pre-wrap leading-relaxed">
            {explanation}
          </div>
        </div>
      )}
      </div>
    </ToolShell>
  );
};