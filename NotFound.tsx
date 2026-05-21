import { Link } from 'react-router-dom';
import { SEO } from './SEO';
import { Home, AlertTriangle, ArrowRight } from 'lucide-react';
import { tools } from './toolsData';

const recommended = tools.filter((tool) => ['/tools/json', '/tools/jwt', '/tools/regex', '/ai/explainer'].includes(tool.path));

export const NotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-10 px-4 md:px-0 animate-fade-in">
        <SEO
        title="404 - Page Not Found"
        description="This page could not be found. Return to the hub or jump directly to popular developer tools."
        canonical="https://devtools-hubpro.netlify.app/404"
        robots="noindex, follow"
      />
      <div className="relative">
        <AlertTriangle size={120} className="text-blue-500/90" />
        <span className="absolute inset-0 flex items-center justify-center text-5xl font-black text-slate-950 dark:text-slate-50">404</span>
      </div>
      <div className="space-y-3 max-w-xl">
        <h1 className="text-4xl md:text-5xl font-bold">That page is missing.</h1>
        <p className="text-slate-500 dark:text-slate-300 leading-relaxed">
          The tool you're looking for may have moved, or you entered an outdated link. Use the shortcuts below to continue with the most useful developer utilities.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 w-full max-w-4xl">
        {recommended.map((tool) => (
          <Link
            key={tool.path}
            to={tool.path}
            className="flex items-center justify-between rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 text-left hover:border-blue-500/50 hover:bg-slate-50 dark:hover:bg-slate-900 transition"
          >
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Recommended</p>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{tool.name}</h2>
              <p className="text-slate-500 dark:text-slate-300 mt-2 text-sm">{tool.desc}</p>
            </div>
            <ArrowRight size={24} className="text-blue-500" />
          </Link>
        ))}
      </div>

      <Link
        to="/"
        className="inline-flex items-center gap-2 px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-3xl transition-shadow shadow-lg shadow-blue-600/20"
      >
        <Home size={20} />
        Back to Home
      </Link>
    </div>
  );
};