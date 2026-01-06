import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { legalDocumentsApi } from '../api/legalDocuments';
import type { LegalDocument, LegalDocumentType } from '../types/api';
import { SiteLayout } from '../components/layout/SiteLayout';

const DOCUMENT_TITLES: Record<LegalDocumentType, string> = {
  'privacy-policy': 'Privacy Policy',
  'terms-of-service': 'Terms of Service',
  'return-policy': 'Return Policy',
  'shipping-policy': 'Shipping Policy',
};

export const LegalDocumentPage: React.FC = () => {
  const { type } = useParams<{ type: LegalDocumentType }>();
  const [document, setDocument] = useState<LegalDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!type) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { document: doc } = await legalDocumentsApi.getByType(type as LegalDocumentType);
        setDocument(doc);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to load document');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [type]);

  const title = type ? DOCUMENT_TITLES[type as LegalDocumentType] || 'Legal Document' : 'Legal Document';

  return (
    <SiteLayout>
      <section className="mx-auto mb-10 w-[88%] space-y-6 py-8">
        <div className="rounded-3xl border border-border bg-gradient-to-r from-[#f6b210] via-[#dc4f0c] to-[#a00b0b] p-10 text-white shadow-md">
          <h1 className="text-3xl font-semibold md:text-4xl">{title}</h1>
          {document?.lastUpdated && (
            <p className="mt-2 text-sm text-white/80">
              Last updated: {new Date(document.lastUpdated).toLocaleDateString()}
            </p>
          )}
        </div>

        {loading && (
          <div className="h-72 animate-pulse rounded-3xl bg-slate-200" />
        )}
        {error && (
          <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-10 text-center text-sm text-red-700">
            {error}
          </div>
        )}
        {!loading && !error && !document && (
          <div className="rounded-3xl border border-dashed border-border bg-background px-6 py-10 text-center text-sm text-muted">
            Document not found.
          </div>
        )}

        {document && (
          <div className="rounded-3xl border border-border bg-white p-8 shadow-sm">
            <div
              className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-p:text-slate-700 prose-a:text-primary prose-strong:text-slate-900"
              dangerouslySetInnerHTML={{ __html: document.content }}
            />
          </div>
        )}
      </section>
    </SiteLayout>
  );
};
