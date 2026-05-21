import { Link } from 'react-router-dom';
import { ArrowRight, Mail, MessageCircle, ShieldCheck } from 'lucide-react';
import { SEO } from './SEO';
import { site } from './toolsData';

const supportEmail = 'support@devtools-hubpro.netlify.app';
const description =
  'Contact DevTools Hub AI for product support, privacy questions, bug reports, partnership requests, and general developer tool feedback.';

const schema = {
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  name: 'Contact DevTools Hub AI',
  description,
  url: `${site.baseUrl}/contact`,
  mainEntity: {
    '@type': 'Organization',
    name: site.name,
    url: site.baseUrl,
    email: supportEmail,
  },
};

export const Contact = () => {
  return (
    <article className="mx-auto max-w-5xl space-y-10">
      <SEO
        title="Contact DevTools Hub AI"
        description={description}
        canonical={`${site.baseUrl}/contact`}
        schema={schema}
        keywords="contact DevTools Hub AI, developer tools support, privacy contact, bug report"
      />

      <header className="space-y-5 border-b border-slate-200 pb-8 dark:border-slate-800">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-500">Contact</p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-950 dark:text-white md:text-5xl">Contact DevTools Hub AI</h1>
        <p className="text-lg leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950/80 sm:p-8">
          <Mail size={32} className="text-blue-500" />
          <h2 className="mt-5 text-2xl font-semibold text-slate-950 dark:text-white">Email support</h2>
          <p className="mt-3 leading-relaxed text-slate-600 dark:text-slate-300">
            Use email for support, bug reports, privacy requests, policy questions, partnership inquiries, or launch feedback.
          </p>
          <a
            href={`mailto:${supportEmail}?subject=DevTools%20Hub%20AI%20support`}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            {supportEmail}
            <ArrowRight size={18} />
          </a>
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-500">Typical response time: 1-2 business days.</p>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950/80">
            <MessageCircle size={26} className="text-emerald-500" />
            <h2 className="mt-4 text-xl font-semibold text-slate-950 dark:text-white">What to include</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-600 dark:text-slate-300">
              <li>The page or tool URL.</li>
              <li>Browser and device details.</li>
              <li>Steps to reproduce bugs, without secrets or private keys.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950/80">
            <ShieldCheck size={26} className="text-blue-500" />
            <h2 className="mt-4 text-xl font-semibold text-slate-950 dark:text-white">Privacy and legal</h2>
            <p className="mt-3 leading-relaxed text-slate-600 dark:text-slate-300">
              Review the <Link to="/privacy" className="text-blue-500 hover:underline">Privacy Policy</Link> and <Link to="/terms" className="text-blue-500 hover:underline">Terms of Service</Link> before submitting sensitive questions.
            </p>
          </div>
        </div>
      </section>
    </article>
  );
};
