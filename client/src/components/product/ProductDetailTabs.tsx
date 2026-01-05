import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { reviewsApi } from '../../api/reviews';
import { useAuth } from '../../context/AuthContext';
import type {
  ProductCompatibilityEntry,
  ProductDocument,
  ProductReview,
  ProductReviewsSummary,
  ProductSeo,
  ProductSpecification,
  ProductSupportDetails,
  ProductShipping,
  ProductNotes,
} from '../../types/api';
import { cn } from '../../utils/cn';
import { ProductCompatibilityExplorer } from './ProductCompatibilityExplorer';

interface ProductDetailTabsProps {
  productId: string;
  description?: string;
  featureHighlights?: string[];
  packageContents?: string[];
  specifications?: ProductSpecification[];
  attributes?: Record<string, string> | null;
  customAttributes?: Record<string, string> | null;
  compatibility?: ProductCompatibilityEntry[];
  documents?: ProductDocument[];
  videoUrls?: string[];
  reviewsSummary?: ProductReviewsSummary | null;
  support?: ProductSupportDetails | null;
  shipping?: ProductShipping | null;
  notes?: ProductNotes | null;
  seo?: ProductSeo | null;
}

type TabId = 'overview' | 'specifications' | 'compatibility' | 'documents' | 'reviews';

const ratings = [5, 4, 3, 2, 1] as const;

const renderDescription = (description?: string) => {
  if (!description) {
    return <p className="text-sm text-muted">No description provided yet.</p>;
  }

  return description
    .split('\n')
    .filter(Boolean)
    .map((paragraph, index) => (
      <p key={index} className="text-sm leading-relaxed text-slate-700">
        {paragraph}
      </p>
    ));
};

export const ProductDetailTabs: React.FC<ProductDetailTabsProps> = ({
  productId,
  description,
  featureHighlights,
  packageContents,
  specifications,
  attributes,
  customAttributes,
  compatibility,
  documents,
  videoUrls,
  reviewsSummary,
  support,
  shipping,
  notes,
  seo,
}) => {
  const { user } = useAuth();
  const hasSpecifications =
    Boolean(specifications?.length) || Boolean(attributes && Object.keys(attributes).length);
  const hasCompatibility = Boolean(compatibility?.length);
  const hasDocuments = Boolean(documents?.length) || Boolean(videoUrls?.length);
  const hasReviews = Boolean(productId);

  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ProductReviewsSummary | null>(reviewsSummary ?? null);
  const [ratingInput, setRatingInput] = useState('5');
  const [commentInput, setCommentInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replySavingIds, setReplySavingIds] = useState<Set<string>>(new Set());

  const tabs = useMemo(() => {
    const list: Array<{ id: TabId; label: string }> = [{ id: 'overview', label: 'Overview' }];
    if (hasSpecifications) list.push({ id: 'specifications', label: 'Specifications' });
    if (hasCompatibility) list.push({ id: 'compatibility', label: 'Compatibility' });
    if (hasDocuments) list.push({ id: 'documents', label: 'Documents & Media' });
    if (hasReviews) list.push({ id: 'reviews', label: 'Reviews' });
    return list;
  }, [hasSpecifications, hasCompatibility, hasDocuments, hasReviews]);

  const [active, setActive] = useState<TabId>(tabs[0]?.id ?? 'overview');

  useEffect(() => {
    if (!tabs.find((tab) => tab.id === active)) {
      setActive(tabs[0]?.id ?? 'overview');
    }
  }, [tabs, active]);

  useEffect(() => {
    setSummary(reviewsSummary ?? null);
  }, [reviewsSummary]);

  useEffect(() => {
    if (!productId) {
      setReviews([]);
      setReplyDrafts({});
      setReplySavingIds(new Set());
      return;
    }
    let cancelled = false;
    const loadReviews = async () => {
      setReviewsLoading(true);
      setReviewsError(null);
      try {
        const { reviews: data } = await reviewsApi.listByProduct(productId);
        if (cancelled) return;
        setReviews(data);
        setReplyDrafts({});
        setReplySavingIds(new Set());
      } catch (error) {
        if (!cancelled) {
          setReviewsError(error instanceof Error ? error.message : 'Unable to load reviews');
        }
      } finally {
        if (!cancelled) {
          setReviewsLoading(false);
        }
      }
    };
    void loadReviews();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const computedSummary = useMemo<ProductReviewsSummary>(() => {
    if (!reviews.length) {
      return {
        averageRating: 0,
        reviewCount: 0,
        ratingBreakdown: {},
      };
    }
    const breakdown: Record<string, number> = {};
    let sum = 0;
    reviews.forEach((review) => {
      const key = String(review.rating);
      breakdown[key] = (breakdown[key] ?? 0) + 1;
      sum += review.rating;
    });
    const count = reviews.length;
    return {
      averageRating: count ? Number((sum / count).toFixed(2)) : 0,
      reviewCount: count,
      ratingBreakdown: breakdown,
    };
  }, [reviews]);

  const displaySummary = useMemo(() => {
    if (!summary) {
      return computedSummary;
    }
    const summaryCount = summary.reviewCount ?? 0;
    if (summaryCount === 0 && computedSummary.reviewCount) {
      return computedSummary;
    }
    return summary;
  }, [summary, computedSummary]);

  const canReview = user?.role === 'client';

  const formatReviewDate = (value?: string | null) => {
    if (!value) return 'Just now';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Just now';
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getReviewReplies = (review: ProductReview) => {
    const legacyReply = review.adminComment
      ? [
          {
            id: `legacy-${review.id}`,
            authorRole: 'admin' as const,
            authorName: 'ULKSupply Team',
            message: review.adminComment,
            createdAt: null,
          },
        ]
      : [];
    return [...legacyReply, ...(review.replies ?? [])];
  };

  const getReplyAuthor = (reply: { authorRole: 'client' | 'admin'; authorName?: string | null }) =>
    reply.authorRole === 'admin' ? 'ULKSupply Team' : reply.authorName || 'Customer';

  const canReplyToReview = (review: ProductReview) => {
    if (!user) return false;
    if (['super_admin', 'admin', 'staff'].includes(user.role)) return true;
    if (user.role !== 'client') return false;
    return Boolean(review.userId && user.id && review.userId === user.id);
  };

  const handleSubmitReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!productId || !canReview) {
      return;
    }
    const parsedRating = Number(ratingInput);
    const comment = commentInput.trim();
    if (!Number.isFinite(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      setReviewsError('Please select a rating between 1 and 5.');
      return;
    }
    if (!comment) {
      setReviewsError('Please share your experience in the comment box.');
      return;
    }
    setSubmitting(true);
    setReviewsError(null);
    try {
      const { review, summary: nextSummary } = await reviewsApi.createForProduct(productId, {
        rating: parsedRating,
        comment,
      });
      setReviews((current) => [review, ...current]);
      setSummary(nextSummary ?? summary);
      setCommentInput('');
      setRatingInput('5');
    } catch (error) {
      setReviewsError(error instanceof Error ? error.message : 'Unable to submit your review.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async (reviewId: string) => {
    const message = (replyDrafts[reviewId] ?? '').trim();
    if (!message) {
      setReviewsError('Please enter a reply before sending.');
      return;
    }
    setReplySavingIds((current) => {
      const next = new Set(current);
      next.add(reviewId);
      return next;
    });
    try {
      const { review } = await reviewsApi.addReply(reviewId, { message });
      setReviews((current) => current.map((item) => (item.id === reviewId ? review : item)));
      setReplyDrafts((current) => ({ ...current, [reviewId]: '' }));
    } catch (error) {
      setReviewsError(error instanceof Error ? error.message : 'Unable to send reply.');
    } finally {
      setReplySavingIds((current) => {
        const next = new Set(current);
        next.delete(reviewId);
        return next;
      });
    }
  };

  return (
    <div className="space-y-6" id="product-detail-tabs">
      <div className="flex flex-wrap gap-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={cn(
              'rounded-full px-5 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              active === tab.id
                ? 'bg-primary text-white shadow-sm'
                : 'bg-white text-slate-600 ring-1 ring-border hover:text-primary'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
        {active === 'overview' && (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="space-y-5">
              <div className="space-y-3">{renderDescription(description)}</div>
              {featureHighlights?.length ? (
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Key Features</h3>
                  <ul className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                    {featureHighlights.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="mt-1 inline-block h-2 w-2 rounded-full bg-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {packageContents?.length ? (
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">What&apos;s in the box</h3>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
                    {packageContents.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {notes?.sales || notes?.internal ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  {notes?.sales && <p className="font-semibold">{notes.sales}</p>}
                  {notes?.internal && <p className="mt-1 text-xs text-amber-800/90">Internal: {notes.internal}</p>}
                </div>
              ) : null}
            </div>
            <div className="space-y-5">
              {support ? (
                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm text-slate-700">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">Support</h3>
                  <div className="mt-3 space-y-2">
                    {support.warranty && (
                      <p className="flex gap-2">
                        <span className="text-muted">Warranty:</span>
                        <span className="font-medium text-slate-900">{support.warranty}</span>
                      </p>
                    )}
                    {support.returnPolicy && (
                      <p className="flex gap-2">
                        <span className="text-muted">Returns:</span>
                        <span className="font-medium text-slate-900">{support.returnPolicy}</span>
                      </p>
                    )}
                    {support.supportHours && (
                      <p className="flex gap-2">
                        <span className="text-muted">Hours:</span>
                        <span className="font-medium text-slate-900">{support.supportHours}</span>
                      </p>
                    )}
                    {support.supportPhone && (
                      <p>
                        <span className="text-muted">Phone:</span>{' '}
                        <a href={`tel:${support.supportPhone}`} className="font-medium text-primary underline-offset-4 hover:underline">
                          {support.supportPhone}
                        </a>
                      </p>
                    )}
                    {support.supportEmail && (
                      <p>
                        <span className="text-muted">Email:</span>{' '}
                        <a href={`mailto:${support.supportEmail}`} className="font-medium text-primary underline-offset-4 hover:underline">
                          {support.supportEmail}
                        </a>
                      </p>
                    )}
                    {support.liveChatUrl && (
                      <p>
                        <a
                          href={support.liveChatUrl}
                          className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"
                        >
                          Start live chat
                        </a>
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
              {seo?.metaDescription ? (
                <div className="rounded-2xl border border-border bg-background p-4 text-xs text-muted">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">SEO description</h3>
                  <p className="mt-2 leading-relaxed">{seo.metaDescription}</p>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {active === 'specifications' && (
          <div className="space-y-6">
            {hasSpecifications ? (
              <div className="overflow-hidden rounded-2xl border border-border">
                <table className="min-w-full text-left text-sm">
                  <tbody className="divide-y divide-border/80">
                    {specifications?.map((spec) => (
                      <tr key={`${spec.label}-${spec.value}`} className="bg-white/90">
                        <th className="w-56 bg-background px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">
                          {spec.label}
                        </th>
                        <td className="px-4 py-3 text-sm text-slate-800">{spec.value}</td>
                      </tr>
                    ))}
                    {attributes &&
                      Object.entries(attributes).map(([key, value]) => (
                        <tr key={key} className="bg-white/90">
                          <th className="w-56 bg-background px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">
                            {key}
                          </th>
                          <td className="px-4 py-3 text-sm text-slate-800">{value}</td>
                        </tr>
                      ))}
                    {customAttributes &&
                      Object.entries(customAttributes).map(([key, value]) => (
                        <tr key={key} className="bg-white/90">
                          <th className="w-56 bg-background px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">
                            {key}
                          </th>
                          <td className="px-4 py-3 text-sm text-slate-800">{value}</td>
                        </tr>
                      ))}
                    {shipping ? (
                      <>
                        {typeof shipping.weight === 'number' ? (
                          <tr className="bg-white/90">
                            <th className="w-56 bg-background px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">
                              Weight
                            </th>
                            <td className="px-4 py-3 text-sm text-slate-800">
                              {shipping.weight}{' '}
                              {shipping.weightUnit ?? 'lb'}
                            </td>
                          </tr>
                        ) : null}
                        {shipping.dimensions &&
                        (typeof shipping.dimensions.length === 'number' ||
                          typeof shipping.dimensions.width === 'number' ||
                          typeof shipping.dimensions.height === 'number') ? (
                          <tr className="bg-white/90">
                            <th className="w-56 bg-background px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">
                              Dimensions
                            </th>
                            <td className="px-4 py-3 text-sm text-slate-800">
                              {[shipping.dimensions.length, shipping.dimensions.width, shipping.dimensions.height]
                                .filter((value) => typeof value === 'number')
                                .map((value) => value ?? '')
                                .join(' × ')}
                              {shipping.dimensions.unit ? ` ${shipping.dimensions.unit}` : ''}
                            </td>
                          </tr>
                        ) : null}
                        {shipping.shippingClass ? (
                          <tr className="bg-white/90">
                            <th className="w-56 bg-background px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">
                              Shipping class
                            </th>
                            <td className="px-4 py-3 text-sm text-slate-800">{shipping.shippingClass}</td>
                          </tr>
                        ) : null}
                        {shipping.hazardous ? (
                          <tr className="bg-white/90">
                            <th className="w-56 bg-background px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">
                              Hazardous material
                            </th>
                            <td className="px-4 py-3 text-sm text-slate-800">Yes</td>
                          </tr>
                        ) : null}
                        {shipping.warehouseLocation ? (
                          <tr className="bg-white/90">
                            <th className="w-56 bg-background px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">
                              Warehouse
                            </th>
                            <td className="px-4 py-3 text-sm text-slate-800">{shipping.warehouseLocation}</td>
                          </tr>
                        ) : null}
                      </>
                    ) : null}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-background px-4 py-6 text-sm text-muted">
                Specifications coming soon.
              </div>
            )}
          </div>
        )}

        {active === 'compatibility' && (
          <div id="compatibility-section">
            <ProductCompatibilityExplorer entries={compatibility} />
          </div>
        )}

        {active === 'documents' && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Downloads</h3>
              {documents?.length ? (
                <ul className="space-y-2 text-sm text-primary">
                  {documents.map((doc) => (
                    <li key={`${doc.label}-${doc.url}`}>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 font-medium underline-offset-4 hover:underline"
                      >
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="h-4 w-4"
                        >
                          <path d="M9 2a1 1 0 0 1 1 1v7.586l1.293-1.293a1 1 0 0 1 1.414 1.414l-3.004 3.004a1.5 1.5 0 0 1-2.121 0L4.578 10.707a1 1 0 0 1 1.414-1.414L7.293 10.586V3a1 1 0 0 1 1-1ZM4 15a1 1 0 0 1 1-1h10a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1Z" />
                        </svg>
                        {doc.label}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">No documents available yet.</p>
              )}
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Videos</h3>
              {videoUrls?.length ? (
                <ul className="space-y-2 text-sm text-primary">
                  {videoUrls.map((url, index) => (
                    <li key={url}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 font-medium underline-offset-4 hover:underline"
                      >
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="h-4 w-4"
                        >
                          <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3h9A1.5 1.5 0 0 1 16 4.5v11a1.5 1.5 0 0 1-2.238 1.306l-6.724-3.862A1.5 1.5 0 0 1 6 11.616V4.5Z" />
                        </svg>
                        Training video {index + 1}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">No videos available.</p>
              )}
            </div>
          </div>
        )}
        {active === 'reviews' && (
          <div className="space-y-6">
            <div className="flex flex-col gap-6 lg:flex-row">
              <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-background px-8 py-6 text-center">
                <p className="text-xs uppercase tracking-wide text-muted">Average rating</p>
                <p className="mt-2 text-5xl font-semibold text-slate-900">
                  {(displaySummary.averageRating ?? 0).toFixed(1)}
                </p>
                <p className="text-xs text-muted">
                  Based on {displaySummary.reviewCount ?? 0} review
                  {displaySummary.reviewCount === 1 ? '' : 's'}
                </p>
                <div className="mt-3 flex items-center gap-1 text-primary">
                  {Array.from({ length: 5 }).map((_, index) => {
                    const value = (displaySummary.averageRating ?? 0) - index;
                    const filled = value >= 1;
                    const half = value > 0 && value < 1;
                    return (
                      <svg
                        key={index}
                        aria-hidden="true"
                        viewBox="0 0 20 20"
                        className={cn(
                          'h-5 w-5',
                          filled || half ? 'text-primary' : 'text-slate-300'
                        )}
                        fill="currentColor"
                      >
                        <path d="M10 15.27 4.053 18l1.136-6.613L.378 6.987l6.632-.964L10 0l2.99 6.023 6.632.964-4.811 4.4L15.947 18z" />
                      </svg>
                    );
                  })}
                </div>
              </div>
              <div className="flex-1 space-y-2">
                {ratings.map((rating) => {
                  const total = displaySummary.reviewCount ?? 0;
                  const count = displaySummary.ratingBreakdown?.[String(rating)] ?? 0;
                  const percent = total ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={rating} className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-xs font-semibold text-slate-600">
                        <span>{rating}</span>
                        <Star className="h-3 w-3 text-amber-400" />
                      </div>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="w-14 text-right text-xs text-muted">{percent}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Customer reviews</h3>
                  {reviewsLoading ? (
                    <span className="text-xs text-muted">Loading...</span>
                  ) : (
                    <span className="text-xs text-muted">{reviews.length} total</span>
                  )}
                </div>
                {reviewsError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                    {reviewsError}
                  </div>
                )}
                {!reviewsLoading && !reviews.length && (
                  <div className="rounded-2xl border border-dashed border-border bg-background px-4 py-6 text-sm text-muted">
                    Be the first to review this product. Share fitment tips or installation notes with the community.
                  </div>
                )}
                {reviews.map((review) => {
                  const displayReplies = getReviewReplies(review);
                  const isReplyAllowed = canReplyToReview(review);
                  const isReplySaving = replySavingIds.has(review.id);
                  return (
                    <div key={review.id} className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{review.reviewerName}</p>
                        <p className="text-xs text-muted">{formatReviewDate(review.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {review.isVerifiedPurchase ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                            Verified purchase
                          </span>
                        ) : null}
                        <div className="flex items-center gap-1 text-amber-500">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <Star
                              key={index}
                              className={cn(
                                'h-4 w-4',
                                review.rating >= index + 1 ? 'fill-current text-amber-500' : 'text-slate-200'
                              )}
                            />
                          ))}
                          <span className="text-xs font-semibold text-slate-700">{review.rating.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-slate-700">{review.comment}</p>
                    {displayReplies.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {displayReplies.map((reply) => (
                          <div
                            key={reply.id}
                            className={cn(
                              'rounded-xl border px-3 py-2 text-xs',
                              reply.authorRole === 'admin'
                                ? 'border-slate-200 bg-slate-50 text-slate-700'
                                : 'border-primary/20 bg-primary/5 text-slate-700'
                            )}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                              <span className="font-semibold text-slate-700">{getReplyAuthor(reply)}</span>
                              {reply.createdAt ? <span>{formatReviewDate(reply.createdAt)}</span> : null}
                            </div>
                            <p className="mt-1 whitespace-pre-line">{reply.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {isReplyAllowed && (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <label className="text-xs font-semibold text-slate-600">Add a reply</label>
                        <textarea
                          value={replyDrafts[review.id] ?? ''}
                          onChange={(event) =>
                            setReplyDrafts((current) => ({
                              ...current,
                              [review.id]: event.target.value,
                            }))
                          }
                          rows={3}
                          className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          placeholder="Write your reply..."
                        />
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => void handleSendReply(review.id)}
                            disabled={isReplySaving || !(replyDrafts[review.id] ?? '').trim()}
                            className={cn(
                              'rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
                              isReplySaving || !(replyDrafts[review.id] ?? '').trim()
                                ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                                : 'border-primary bg-primary text-white hover:bg-primary/90'
                            )}
                          >
                            {isReplySaving ? 'Sending...' : 'Send reply'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Write a review</h3>
                {canReview ? (
                  <form onSubmit={handleSubmitReview} className="mt-4 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600">Rating</label>
                      <select
                        value={ratingInput}
                        onChange={(event) => setRatingInput(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        {ratings.map((rating) => (
                          <option key={rating} value={rating}>
                            {rating} star{rating === 1 ? '' : 's'}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600">Your review</label>
                      <textarea
                        value={commentInput}
                        onChange={(event) => setCommentInput(event.target.value)}
                        rows={4}
                        className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="Share your experience, tips, or installation feedback."
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {submitting ? 'Submitting...' : 'Submit review'}
                    </button>
                  </form>
                ) : (
                  <div className="mt-4 space-y-3 text-sm text-slate-600">
                    <p>Sign in with a client account to share your experience.</p>
                    <Link
                      to="/login"
                      className="inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
                    >
                      Sign in to review
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
