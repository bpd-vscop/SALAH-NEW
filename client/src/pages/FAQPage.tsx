import { Link } from 'react-router-dom';
import { SiteLayout } from '../components/layout/SiteLayout';

export const FAQPage: React.FC = () => {
  return (
    <SiteLayout>
      <section className="mx-auto mb-10 w-[88%] space-y-6 py-8">
        <div className="text-xs text-muted">
          <Link to="/" className="transition hover:text-primary">Home</Link>
          <span className="mx-2">/</span>
          <span className="font-semibold text-slate-900">Help / FAQ</span>
        </div>

        <div className="rounded-3xl border border-border bg-gradient-to-r from-[#f6b210] via-[#dc4f0c] to-[#a00b0b] p-10 text-white shadow-md">
          <h1 className="text-3xl font-semibold md:text-4xl">Help / FAQ</h1>
          <p className="mt-3 max-w-3xl text-sm text-white/85">
            Answers to frequently asked questions coming soon.
          </p>
        </div>
      </section>

      <section className="mx-auto w-[88%] pb-16">
        <div className="rounded-3xl border border-border bg-white p-8 shadow-sm">
          <div className="flex flex-col items-center justify-center py-20">
            <div className="mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-orange-100 to-red-100">
              <svg
                className="h-16 w-16 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="mb-4 text-3xl font-bold text-slate-900">Coming Soon</h2>
            <p className="mb-6 max-w-md text-center text-slate-600">
              We're working hard to bring you a comprehensive FAQ section with answers to all your questions about our products and services.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to="/about"
                className="rounded-lg bg-red-700 px-6 py-3 text-center font-medium text-white transition hover:bg-red-800"
              >
                Learn About Us
              </Link>
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('openContactWidget', { detail: { view: 'chat' } }));
                }}
                className="rounded-lg border border-red-700 bg-white px-6 py-3 text-center font-medium text-red-700 transition hover:bg-red-50"
              >
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
};
