import { useState, useEffect, type ChangeEvent, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { formatCurrency } from '../../utils/format';
import { cn } from '../../utils/cn';
import { productsApi } from '../../api/products';
import type {
  Category,
  Product,
  ProductInventoryStatus,
  ProductStatus,
  ProductTag,
  ProductType,
  ProductVisibility,
} from '../../types/api';
import type { Manufacturer } from '../../api/manufacturers';
import type {
  ProductCompatibilityRow,
  ProductDocumentRow,
  ProductFormState,
  ProductSerialNumberRow,
  ProductVariationRow,
} from './types';

interface ProductsAdminSectionProps {
  products: Product[];
  categories: Category[];
  manufacturers: Manufacturer[];
  categoryNameById: Map<string, string>;
  selectedProductId: string;
  onSelectProduct: (id: string) => void;
  form: ProductFormState;
  setForm: Dispatch<SetStateAction<ProductFormState>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onBulkDelete: (ids: string[]) => Promise<void>;
  onRefreshProducts: () => Promise<void>;
  productTags: ProductTag[];
  view: 'all' | 'add';
  onViewChange: (view: 'all' | 'add') => void;
}

const productTypes: ProductType[] = ['simple', 'variable', 'grouped'];
const productStatuses: ProductStatus[] = ['draft', 'scheduled', 'private', 'published'];
const visibilityOptions: ProductVisibility[] = ['catalog', 'search', 'hidden', 'catalog-and-search'];
const inventoryStatuses: ProductInventoryStatus[] = ['in_stock', 'low_stock', 'out_of_stock', 'backorder', 'preorder'];
const reviewRatingDefaults = ['5', '4', '3', '2', '1'];

// Form steps configuration
const FORM_STEPS = [
  { id: 'basics', title: 'Basic Info', description: 'Product details' },
  { id: 'pricing', title: 'Pricing', description: 'Price & stock' },
  { id: 'media', title: 'Media', description: 'Images & videos' },
  { id: 'specs', title: 'Specifications', description: 'Technical details' },
  { id: 'variations', title: 'Variations', description: 'Product variants' },
  { id: 'serialNumbers', title: 'Serial Numbers', description: 'Track inventory' },
  { id: 'compatibility', title: 'Compatibility', description: 'Fitment data' },
  { id: 'logistics', title: 'Logistics', description: 'Shipping & support' },
  { id: 'seo', title: 'SEO', description: 'Search optimization' },
  { id: 'reviews', title: 'Reviews', description: 'Ratings & notes' },
] as const;

const PRODUCT_IMAGE_ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_PRODUCT_IMAGE_SIZE_BYTES = 3 * 1024 * 1024;
const MAX_PRODUCT_IMAGE_SIZE_MB = 3;
const MAX_PRODUCT_IMAGES = 5;

const normalizeImageSrc = (value: string) => {
  if (!value) return '';
  const trimmed = value.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed;
  }
  if (trimmed.startsWith('/uploads')) {
    return trimmed;
  }
  return `/uploads/${trimmed.replace(/^\/+/, '')}`;
};

const makeId = () => Math.random().toString(36).slice(2, 10);

interface SerialModalRow {
  id: string;
  existingId?: string;
  serialNumber: string;
  status: ProductSerialNumberRow['status'];
  notes: string;
  addedAt?: string | null;
}

const FormPanel: React.FC<{ title: string; description?: string; children: React.ReactNode }> = ({
  title,
  description,
  children,
}) => (
  <section className="space-y-4 rounded-2xl border border-border bg-white/80 p-5 shadow-inner">
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h3>
      {description ? <p className="mt-1 text-xs text-muted">{description}</p> : null}
    </div>
    <div className="grid gap-4">{children}</div>
  </section>
);

export const ProductsAdminSection: React.FC<ProductsAdminSectionProps> = ({
  products,
  categories,
  manufacturers,
  categoryNameById,
  selectedProductId,
  onSelectProduct,
  form,
  setForm,
  onSubmit,
  onDelete,
  onBulkDelete,
  onRefreshProducts,
  productTags,
  view,
  onViewChange,
}) => {
  const [displayMode, setDisplayMode] = useState<'card' | 'table'>('card');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'a-z' | 'z-a' | 'price-low' | 'price-high'>('recent');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [imageUploadWarnings, setImageUploadWarnings] = useState<string[]>([]);
  const [uploadingTarget, setUploadingTarget] = useState<'main' | 'thumbnails' | null>(null);
  const [serialModalProduct, setSerialModalProduct] = useState<Product | null>(null);
  const [serialModalRows, setSerialModalRows] = useState<SerialModalRow[]>([]);
  const [serialModalError, setSerialModalError] = useState<string | null>(null);
  const [serialModalSaving, setSerialModalSaving] = useState(false);

  // Step navigation state
  const [currentStep, setCurrentStep] = useState(0);
  const [stepValidation, setStepValidation] = useState<Record<number, 'valid' | 'warning' | 'incomplete'>>({});

  // Reset to first step when switching between products or returning to list
  useEffect(() => {
    setCurrentStep(0);
    setStepValidation({});
  }, [selectedProductId]);

  // Validate step requirements
  const validateStep = (stepIndex: number): 'valid' | 'warning' | 'incomplete' => {
    const step = FORM_STEPS[stepIndex];

    if (step.id === 'basics') {
      const hasName = form.name.trim().length >= 2;
      const hasCategory = form.categoryId.trim().length > 0;

      if (hasName && hasCategory) return 'valid';
      if (!hasName || !hasCategory) return 'warning';
      return 'warning';
    }

    if (step.id === 'pricing') {
      const hasPrice = form.price.trim().length > 0 && parseFloat(form.price) >= 0;

      if (hasPrice) return 'valid';
      return 'warning';
    }

    // Other steps are optional
    return 'valid';
  };

  const goToNextStep = (event?: React.MouseEvent<HTMLButtonElement>) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Validate current step before moving
    const validation = validateStep(currentStep);
    setStepValidation(prev => ({ ...prev, [currentStep]: validation }));

    if (currentStep < FORM_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToPreviousStep = (event?: React.MouseEvent<HTMLButtonElement>) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToStep = (stepIndex: number) => {
    // Validate all steps up to the target step when navigating
    const newValidations: Record<number, 'valid' | 'warning' | 'incomplete'> = {};

    // Determine which steps to validate
    const minStep = Math.min(currentStep, stepIndex);
    const maxStep = Math.max(currentStep, stepIndex);

    // Validate all steps from start up to the max of current and target
    for (let i = 0; i <= maxStep; i++) {
      newValidations[i] = validateStep(i);
    }

    setStepValidation(prev => ({ ...prev, ...newValidations }));
    setCurrentStep(stepIndex);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Prevent Enter key from submitting form unless on the last step
  const handleFormKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter' && currentStep < FORM_STEPS.length - 1) {
      // Allow Enter in textareas
      if (event.target instanceof HTMLTextAreaElement) {
        return;
      }
      event.preventDefault();
      // Optionally move to next step when Enter is pressed
      goToNextStep();
    }
  };
  const UploadingIndicator: React.FC<{ target: 'main' | 'thumbnails' }> = ({ target }) =>
    uploadingTarget === target ? (
      <span
        role="status"
        className="pointer-events-none absolute right-4 top-3 inline-flex items-center gap-2 rounded-full bg-white/95 px-2 py-1 text-xs font-semibold text-primary shadow-sm"
      >
        <svg
          className="h-4 w-4 animate-spin text-primary"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path
            className="opacity-80"
            d="M4 12a8 8 0 0 1 8-8"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        Uploading...
      </span>
    ) : null;
  const mainProductImage = form.primaryImage?.trim() ?? '';
  const thumbnailImages = form.galleryImages ?? [];
  const totalImagesCount = (mainProductImage ? 1 : 0) + thumbnailImages.length;

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const handleMainImageSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!files.length) {
      return;
    }

    const file = files[0];
    const warnings: string[] = [];

    if (files.length > 1) {
      warnings.push('Only the first selected file was used for the main image.');
    }
    if (!PRODUCT_IMAGE_ALLOWED_TYPES.includes(file.type)) {
      warnings.push(`${file.name} must be a JPEG, PNG, or WebP image.`);
    }
    if (file.size > MAX_PRODUCT_IMAGE_SIZE_BYTES) {
      warnings.push(`${file.name} must be ${MAX_PRODUCT_IMAGE_SIZE_MB} MB or smaller.`);
    }

    const hasBlockingWarning = warnings.some((message) => message.includes('must be'));
    if (hasBlockingWarning) {
      setImageUploadWarnings(warnings);
      setImageUploadError(null);
      return;
    }

    setIsUploadingImages(true);
    setUploadingTarget('main');
    setImageUploadError(null);
    setImageUploadWarnings(warnings);

    try {
      const path = await productsApi.uploadImage(file);
      const normalizedPath = path.trim();
      if (!normalizedPath) {
        return;
      }

      setForm((state) => {
        const filteredGallery = state.galleryImages.filter((value) => value !== normalizedPath);
        const maxThumbnails = Math.max(0, MAX_PRODUCT_IMAGES - 1);
        return {
          ...state,
          primaryImage: normalizedPath,
          galleryImages: filteredGallery.slice(0, maxThumbnails),
        };
      });
    } catch (error) {
      console.error('Failed to upload main product image', error);
      setImageUploadError('Unable to upload product images. Please try again.');
    } finally {
      setIsUploadingImages(false);
      setUploadingTarget(null);
    }
  };

  const handleThumbnailImagesSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!files.length) {
      return;
    }

    const warnings: string[] = [];
    const currentCount = totalImagesCount;
    const remainingSlots = Math.max(0, MAX_PRODUCT_IMAGES - currentCount);

    if (remainingSlots <= 0) {
      setImageUploadWarnings([
        `You can upload up to ${MAX_PRODUCT_IMAGES} images. Remove one to add a new image.`,
      ]);
      setImageUploadError(null);
      return;
    }

    const acceptedFiles: File[] = [];
    files.forEach((file) => {
      if (acceptedFiles.length >= remainingSlots) {
        warnings.push(`${file.name} was skipped. Only ${MAX_PRODUCT_IMAGES} images are allowed per product.`);
        return;
      }
      if (!PRODUCT_IMAGE_ALLOWED_TYPES.includes(file.type)) {
        warnings.push(`${file.name} must be a JPEG, PNG, or WebP image.`);
        return;
      }
      if (file.size > MAX_PRODUCT_IMAGE_SIZE_BYTES) {
        warnings.push(`${file.name} must be ${MAX_PRODUCT_IMAGE_SIZE_MB} MB or smaller.`);
        return;
      }
      acceptedFiles.push(file);
    });

    if (!acceptedFiles.length) {
      setImageUploadWarnings(warnings.length ? warnings : ['No valid images selected.']);
      setImageUploadError(null);
      return;
    }

    setIsUploadingImages(true);
    setUploadingTarget('thumbnails');
    setImageUploadError(null);
    setImageUploadWarnings(warnings);

    try {
      const uploadedPaths: string[] = [];
      for (const file of acceptedFiles) {
        const path = await productsApi.uploadImage(file);
        uploadedPaths.push(path);
      }

      if (uploadedPaths.length) {
        setForm((state) => {
          const normalizedPrimary = state.primaryImage.trim();
          const maxThumbnails = MAX_PRODUCT_IMAGES - (normalizedPrimary ? 1 : 0);
          const combined = [...state.galleryImages, ...uploadedPaths]
            .map((value) => value.trim())
            .filter(Boolean);
          const deduped: string[] = [];
          const seen = new Set<string>(normalizedPrimary ? [normalizedPrimary] : []);
          combined.forEach((value) => {
            if (seen.has(value)) {
              return;
            }
            seen.add(value);
            deduped.push(value);
          });
          return { ...state, galleryImages: deduped.slice(0, Math.max(0, maxThumbnails)) };
        });
      }
    } catch (error) {
      console.error('Failed to upload product images', error);
      setImageUploadError('Unable to upload product images. Please try again.');
    } finally {
      setIsUploadingImages(false);
      setUploadingTarget(null);
    }
  };

  const removeThumbnailAtIndex = (index: number) => {
    setForm((state) => ({
      ...state,
      galleryImages: state.galleryImages.filter((_, idx) => idx !== index),
    }));
  };

  const clearAllImages = () => {
    setForm((state) => ({ ...state, primaryImage: '', galleryImages: [] }));
    setImageUploadWarnings([]);
    setImageUploadError(null);
  };

  const removeMainImage = () => {
    setForm((state) => ({ ...state, primaryImage: '' }));
    setImageUploadWarnings([]);
    setImageUploadError(null);
  };

const createSerialModalRow = (defaults?: Partial<SerialModalRow>): SerialModalRow => ({
  id: makeId(),
  serialNumber: '',
  status: 'available',
  notes: '',
  addedAt: new Date().toISOString(),
  ...defaults,
});

  const openSerialModal = (product: Product) => {
    const initialRows =
      product.serialNumbers?.map((serial) =>
        createSerialModalRow({
          existingId: serial.id,
          serialNumber: serial.serialNumber ?? '',
          status: serial.status ?? 'available',
          notes: serial.notes ?? '',
          addedAt: serial.createdAt ?? serial.updatedAt ?? null,
        })
      ) ?? [];
    setSerialModalRows(initialRows.length ? initialRows : [createSerialModalRow()]);
    setSerialModalProduct(product);
    setSerialModalError(null);
  };

  const closeSerialModal = () => {
    if (serialModalSaving) {
      return;
    }
    setSerialModalProduct(null);
    setSerialModalRows([]);
    setSerialModalError(null);
  };

  const updateSerialModalRow = (
    id: string,
    field: keyof Omit<SerialModalRow, 'id' | 'existingId' | 'addedAt'>,
    value: string | SerialModalRow['status']
  ) => {
    setSerialModalRows((rows) =>
      rows.map((row) => (row.id === id ? { ...row, [field]: value } as SerialModalRow : row))
    );
  };

  const addSerialModalRow = () => {
    setSerialModalRows((rows) => [...rows, createSerialModalRow()]);
  };

  const removeSerialModalRow = (id: string) => {
    setSerialModalRows((rows) => rows.filter((row) => row.id !== id));
  };

  const toggleSerialRowUsed = (id: string, used: boolean) => {
    updateSerialModalRow(id, 'status', used ? 'sold' : 'available');
  };

  const handleSerialModalSave = async () => {
    if (!serialModalProduct) {
      return;
    }
    setSerialModalSaving(true);
    setSerialModalError(null);
    try {
      const payload = serialModalRows
        .filter((row) => row.serialNumber.trim())
        .map((row) => ({
          ...(row.existingId ? { _id: row.existingId } : {}),
          serialNumber: row.serialNumber.trim(),
          status: row.status,
          notes: row.notes.trim() || undefined,
        }));
      await productsApi.update(serialModalProduct.id, { serialNumbers: payload });
      await onRefreshProducts();
      closeSerialModal();
    } catch (error) {
      setSerialModalError(error instanceof Error ? error.message : 'Unable to save serial numbers');
    } finally {
      setSerialModalSaving(false);
    }
  };

  const clearThumbnailImages = () => {
    setForm((state) => ({ ...state, galleryImages: [] }));
    setImageUploadWarnings([]);
    setImageUploadError(null);
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === filteredAndSortedProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredAndSortedProducts.map(p => p.id)));
    }
  };

  const handleBulkDelete = async () => {
    await onBulkDelete(Array.from(selectedProducts));
    setSelectedProducts(new Set());
  };

  const toggleTag = (tag: ProductTag) => {
    setForm((state) => {
      const next = new Set(state.tags);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return { ...state, tags: next };
    });
  };

  const updateKeyValueRow = (
    listName: 'specifications' | 'attributes' | 'customAttributes',
    id: string,
    field: 'label' | 'value',
    value: string
  ) => {
    setForm((state) => ({
      ...state,
      [listName]: state[listName].map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    }));
  };

  const addKeyValueRow = (listName: 'specifications' | 'attributes' | 'customAttributes') => {
    setForm((state) => ({
      ...state,
      [listName]: [...state[listName], { id: makeId(), label: '', value: '' }],
    }));
  };

  const removeKeyValueRow = (listName: 'specifications' | 'attributes' | 'customAttributes', id: string) => {
    setForm((state) => ({
      ...state,
      [listName]: state[listName].filter((row) => row.id !== id),
    }));
  };

  const updateVariationField = (variationId: string, field: keyof Omit<ProductVariationRow, 'id' | 'existingId' | 'attributes'>, value: string | boolean) => {
    setForm((state) => ({
      ...state,
      variations: state.variations.map((variation) =>
        variation.id === variationId ? { ...variation, [field]: value } : variation
      ),
    }));
  };

  const addVariation = () => {
    setForm((state) => ({
      ...state,
      variations: [
        ...state.variations,
        {
          id: makeId(),
          existingId: undefined,
          name: '',
          sku: '',
          attributes: [],
          price: '',
          salePrice: '',
          stockQuantity: '',
          allowBackorder: false,
          image: '',
          weight: '',
        },
      ],
    }));
  };

  const removeVariation = (variationId: string) => {
    setForm((state) => ({
      ...state,
      variations: state.variations.filter((variation) => variation.id !== variationId),
    }));
  };

  const addVariationAttribute = (variationId: string) => {
    setForm((state) => ({
      ...state,
      variations: state.variations.map((variation) =>
        variation.id === variationId
          ? { ...variation, attributes: [...variation.attributes, { id: makeId(), label: '', value: '' }] }
          : variation
      ),
    }));
  };

  const updateVariationAttribute = (
    variationId: string,
    attributeId: string,
    field: 'label' | 'value',
    value: string
  ) => {
    setForm((state) => ({
      ...state,
      variations: state.variations.map((variation) =>
        variation.id === variationId
          ? {
              ...variation,
              attributes: variation.attributes.map((attribute) =>
                attribute.id === attributeId ? { ...attribute, [field]: value } : attribute
              ),
            }
          : variation
      ),
    }));
  };

  const removeVariationAttribute = (variationId: string, attributeId: string) => {
    setForm((state) => ({
      ...state,
      variations: state.variations.map((variation) =>
        variation.id === variationId
          ? {
              ...variation,
              attributes: variation.attributes.filter((attribute) => attribute.id !== attributeId),
            }
          : variation
      ),
    }));
  };

  // Serial Number management functions
  const addSerialNumber = () => {
    setForm((state) => ({
      ...state,
      serialNumbers: [
        ...state.serialNumbers,
        {
          id: makeId(),
          existingId: undefined,
          serialNumber: '',
          status: 'available',
          soldDate: '',
          orderId: '',
          notes: '',
        },
      ],
    }));
  };

  const removeSerialNumber = (serialId: string) => {
    setForm((state) => ({
      ...state,
      serialNumbers: state.serialNumbers.filter((serial) => serial.id !== serialId),
    }));
  };

  const updateSerialNumberField = (serialId: string, field: keyof Omit<ProductSerialNumberRow, 'id' | 'existingId'>, value: string) => {
    setForm((state) => ({
      ...state,
      serialNumbers: state.serialNumbers.map((serial) =>
        serial.id === serialId ? { ...serial, [field]: value } : serial
      ),
    }));
  };

  const addCompatibilityRow = () => {
    setForm((state) => ({
      ...state,
      compatibility: [
        ...state.compatibility,
        {
          id: makeId(),
          yearStart: '',
          yearEnd: '',
          year: '',
          make: '',
          model: '',
          subModel: '',
          engine: '',
          notes: '',
        },
      ],
    }));
  };

  const updateCompatibilityRow = (
    id: string,
    field: keyof Omit<ProductCompatibilityRow, 'id'>,
    value: string
  ) => {
    setForm((state) => ({
      ...state,
      compatibility: state.compatibility.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      ),
    }));
  };

  const removeCompatibilityRow = (id: string) => {
    setForm((state) => ({
      ...state,
      compatibility: state.compatibility.filter((entry) => entry.id !== id),
    }));
  };

  const addDocument = () => {
    setForm((state) => ({
      ...state,
      documents: [...state.documents, { id: makeId(), label: '', url: '' }],
    }));
  };

  const updateDocument = (id: string, field: keyof Omit<ProductDocumentRow, 'id'>, value: string) => {
    setForm((state) => ({
      ...state,
      documents: state.documents.map((document) =>
        document.id === id ? { ...document, [field]: value } : document
      ),
    }));
  };

  const removeDocument = (id: string) => {
    setForm((state) => ({
      ...state,
      documents: state.documents.filter((document) => document.id !== id),
    }));
  };

  const addBadge = () => {
    setForm((state) => ({
      ...state,
      badges: [...state.badges, { id: makeId(), label: '', description: '', icon: '' }],
    }));
  };

  const updateBadge = (id: string, field: 'label' | 'description' | 'icon', value: string) => {
    setForm((state) => ({
      ...state,
      badges: state.badges.map((badge) => (badge.id === id ? { ...badge, [field]: value } : badge)),
    }));
  };

  const removeBadge = (id: string) => {
    setForm((state) => ({
      ...state,
      badges: state.badges.filter((badge) => badge.id !== id),
    }));
  };

  const addHighlight = () => {
    setForm((state) => ({
      ...state,
      featureHighlights: [...state.featureHighlights, ''],
    }));
  };

  const updateHighlight = (index: number, value: string) => {
    setForm((state) => {
      const next = [...state.featureHighlights];
      next[index] = value;
      return { ...state, featureHighlights: next };
    });
  };

  const removeHighlight = (index: number) => {
    setForm((state) => {
      const next = [...state.featureHighlights];
      next.splice(index, 1);
      return { ...state, featureHighlights: next };
    });
  };

  const addPackageItem = () => {
    setForm((state) => ({
      ...state,
      packageContents: [...state.packageContents, ''],
    }));
  };

  const updatePackageItem = (index: number, value: string) => {
    setForm((state) => {
      const next = [...state.packageContents];
      next[index] = value;
      return { ...state, packageContents: next };
    });
  };

  const removePackageItem = (index: number) => {
    setForm((state) => {
      const next = [...state.packageContents];
      next.splice(index, 1);
      return { ...state, packageContents: next };
    });
  };

  const addVariationAttributeName = () => {
    setForm((state) => ({
      ...state,
      variationAttributes: [...state.variationAttributes, ''],
    }));
  };

  const updateVariationAttributeName = (index: number, value: string) => {
    setForm((state) => {
      const next = [...state.variationAttributes];
      next[index] = value;
      return { ...state, variationAttributes: next };
    });
  };

  const removeVariationAttributeName = (index: number) => {
    setForm((state) => {
      const next = [...state.variationAttributes];
      next.splice(index, 1);
      return { ...state, variationAttributes: next };
    });
  };

  const addRatingRow = () => {
    setForm((state) => ({
      ...state,
      reviewsSummary: {
        ...state.reviewsSummary,
        ratingBreakdown: [...state.reviewsSummary.ratingBreakdown, { id: makeId(), rating: '', count: '' }],
      },
    }));
  };

  const updateRatingRow = (id: string, field: 'rating' | 'count', value: string) => {
    setForm((state) => ({
      ...state,
      reviewsSummary: {
        ...state.reviewsSummary,
        ratingBreakdown: state.reviewsSummary.ratingBreakdown.map((row) =>
          row.id === id ? { ...row, [field]: value } : row
        ),
      },
    }));
  };

  const removeRatingRow = (id: string) => {
    setForm((state) => ({
      ...state,
      reviewsSummary: {
        ...state.reviewsSummary,
        ratingBreakdown: state.reviewsSummary.ratingBreakdown.filter((row) => row.id !== id),
      },
    }));
  };

  const addRatingDefaults = () => {
    setForm((state) => ({
      ...state,
      reviewsSummary: {
        ...state.reviewsSummary,
        ratingBreakdown: reviewRatingDefaults.map((rating) => ({
          id: makeId(),
          rating,
          count: '',
        })),
      },
    }));
  };

  const manufacturerOptions = manufacturers
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  // Filter and sort products
  const filteredAndSortedProducts = products
    .filter((product) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        product.name.toLowerCase().includes(query) ||
        product.sku?.toLowerCase().includes(query) ||
        product.productCode?.toLowerCase().includes(query) ||
        product.manufacturerName?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
        case 'oldest':
          return new Date(a.updatedAt ?? a.createdAt ?? 0).getTime() - new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
        case 'a-z':
          return a.name.localeCompare(b.name);
        case 'z-a':
          return b.name.localeCompare(a.name);
        case 'price-low':
          return (a.salePrice ?? a.price) - (b.salePrice ?? b.price);
        case 'price-high':
          return (b.salePrice ?? b.price) - (a.salePrice ?? a.price);
        default:
          return 0;
      }
    });

  return (
    <section className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
      {/* All Products View */}
      {view === 'all' && (
        <div className="space-y-6">
          {/* Filters and Search Bar */}
          <div className="space-y-4">
            {/* Search and View Toggle */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-white pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* View Mode Toggle */}
              <div className="flex gap-2 rounded-xl border border-border bg-white p-1">
                <button
                  type="button"
                  onClick={() => setDisplayMode('card')}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition',
                    displayMode === 'card'
                      ? 'bg-primary text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  )}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayMode('table')}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition',
                    displayMode === 'table'
                      ? 'bg-primary text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  )}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Table
                </button>
              </div>
            </div>

            {/* Sort Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted">Sort by:</span>
              {[
                { value: 'recent', label: 'Most Recent' },
                { value: 'oldest', label: 'Oldest' },
                { value: 'a-z', label: 'A-Z' },
                { value: 'z-a', label: 'Z-A' },
                { value: 'price-low', label: 'Price: Low to High' },
                { value: 'price-high', label: 'Price: High to Low' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSortBy(option.value as typeof sortBy)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition',
                    sortBy === option.value
                      ? 'bg-primary text-white'
                      : 'border border-border bg-white text-slate-600 hover:border-primary hover:text-primary'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Results Count and Bulk Actions */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted">
                Showing {filteredAndSortedProducts.length} of {products.length} products
                {selectedProducts.size > 0 && ` • ${selectedProducts.size} selected`}
              </p>
              {selectedProducts.size > 0 && (
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Selected ({selectedProducts.size})
                </button>
              )}
            </div>
          </div>

          {/* Card View */}
          {displayMode === 'card' && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredAndSortedProducts.map((product) => {
            const inventoryStatus = product.inventory?.status ?? 'in_stock';
            const badgeClasses = cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold',
              inventoryStatus === 'in_stock' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
              inventoryStatus === 'low_stock' && 'border-amber-200 bg-amber-50 text-amber-700',
              inventoryStatus === 'out_of_stock' && 'border-red-200 bg-red-50 text-red-700',
              inventoryStatus === 'backorder' && 'border-sky-200 bg-sky-50 text-sky-700',
              inventoryStatus === 'preorder' && 'border-indigo-200 bg-indigo-50 text-indigo-700'
            );
            const hasSale = typeof product.salePrice === 'number' && product.salePrice < product.price;
            return (
              <article
                key={product.id}
                className={cn(
                  'rounded-2xl border border-border bg-background overflow-hidden shadow-sm transition hover:border-primary hover:shadow-md',
                  selectedProductId === product.id && 'border-primary bg-white shadow-md'
                )}
              >
                {/* Product Image */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                  <img
                    src={product.images[0] ?? 'https://placehold.co/400x300?text=No+Image'}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                  {/* Selection Checkbox - Top Left */}
                  <div className="absolute left-2 top-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleProductSelection(product.id);
                      }}
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all',
                        selectedProducts.has(product.id)
                          ? 'border-primary bg-primary'
                          : 'border-white bg-white/90 backdrop-blur-sm hover:border-primary'
                      )}
                      title="Select product"
                    >
                      {selectedProducts.has(product.id) && (
                        <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {/* Action Icons - Top Right */}
                  <div className="absolute right-2 top-2 flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectProduct(product.id);
                        onViewChange('add');
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-md backdrop-blur-sm transition-all hover:scale-110 hover:bg-primary hover:text-white"
                      title="Edit product"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => openSerialModal(product)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-md backdrop-blur-sm transition-all hover:scale-110 hover:bg-primary hover:text-white"
                      title="Manage serial numbers"
                    >
                      SN
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDelete(product.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-600 shadow-md backdrop-blur-sm transition-all hover:scale-110 hover:bg-red-600 hover:text-white"
                      title="Delete product"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 p-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-slate-900 line-clamp-2">{product.name}</h3>
                    <p className="text-xs text-muted">
                      {categoryNameById.get(product.categoryId) ?? 'Unassigned'}
                    </p>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div className="text-left">
                      <p className="text-sm font-semibold text-primary">
                        {formatCurrency(hasSale ? product.salePrice ?? product.price : product.price)}
                      </p>
                      {hasSale && (
                        <p className="text-xs text-muted line-through">{formatCurrency(product.price)}</p>
                      )}
                    </div>
                    <span className={badgeClasses}>
                      {inventoryStatus.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-muted">
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                      {product.updatedAt
                        ? `Updated ${new Date(product.updatedAt).toLocaleDateString()}`
                        : product.createdAt
                        ? `Created ${new Date(product.createdAt).toLocaleDateString()}`
                        : 'No date'}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
          {!filteredAndSortedProducts.length && (
            <p className="col-span-full rounded-2xl border border-dashed border-border bg-background px-4 py-6 text-center text-sm text-muted">
              {products.length === 0
                ? 'No products yet. Click "Add Product" above to create your first product.'
                : 'No products match your search criteria.'}
            </p>
          )}
        </div>
          )}

          {/* Table View */}
          {displayMode === 'table' && (
            <div className="overflow-x-auto rounded-2xl border border-border bg-white">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className={cn(
                          'flex h-5 w-5 items-center justify-center rounded border-2 transition-all mx-auto',
                          selectedProducts.size === filteredAndSortedProducts.length && filteredAndSortedProducts.length > 0
                            ? 'border-primary bg-primary'
                            : 'border-slate-400 bg-white hover:border-primary'
                        )}
                        title="Select all"
                      >
                        {selectedProducts.size === filteredAndSortedProducts.length && filteredAndSortedProducts.length > 0 && (
                          <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Image</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Price</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Stock</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredAndSortedProducts.map((product) => {
                    const inventoryStatus = product.inventory?.status ?? 'in_stock';
                    const badgeClasses = cn(
                      'inline-flex items-center gap-2 rounded-full border px-2 py-1 text-[10px] font-semibold',
                      inventoryStatus === 'in_stock' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
                      inventoryStatus === 'low_stock' && 'border-amber-200 bg-amber-50 text-amber-700',
                      inventoryStatus === 'out_of_stock' && 'border-red-200 bg-red-50 text-red-700',
                      inventoryStatus === 'backorder' && 'border-sky-200 bg-sky-50 text-sky-700',
                      inventoryStatus === 'preorder' && 'border-indigo-200 bg-indigo-50 text-indigo-700'
                    );
                    const hasSale = typeof product.salePrice === 'number' && product.salePrice < product.price;

                    return (
                      <tr
                        key={product.id}
                        className={cn(
                          'transition hover:bg-slate-50',
                          selectedProductId === product.id && 'bg-primary/5',
                          selectedProducts.has(product.id) && 'bg-primary/5'
                        )}
                      >
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleProductSelection(product.id);
                            }}
                            className={cn(
                              'flex h-5 w-5 items-center justify-center rounded border-2 transition-all mx-auto',
                              selectedProducts.has(product.id)
                                ? 'border-primary bg-primary'
                                : 'border-slate-400 bg-white hover:border-primary'
                            )}
                            title="Select product"
                          >
                            {selectedProducts.has(product.id) && (
                              <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <img
                            src={product.images[0] ?? 'https://placehold.co/80x60?text=No+Image'}
                            alt={product.name}
                            className="h-12 w-16 rounded-lg border border-border object-cover"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-900 line-clamp-2">{product.name}</p>
                            <div className="flex flex-wrap gap-1">
                              {product.tags.slice(0, 2).map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-muted">
                            {categoryNameById.get(product.categoryId) ?? 'Unassigned'}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            <p className="text-sm font-semibold text-primary">
                              {formatCurrency(hasSale ? product.salePrice ?? product.price : product.price)}
                            </p>
                            {hasSale && (
                              <p className="text-xs text-muted line-through">{formatCurrency(product.price)}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={badgeClasses}>
                            {inventoryStatus.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-muted">
                            {product.updatedAt
                              ? new Date(product.updatedAt).toLocaleDateString()
                              : product.createdAt
                              ? new Date(product.createdAt).toLocaleDateString()
                              : 'N/A'}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="inline-flex items-center justify-center rounded-lg border border-border px-2 py-1 text-xs font-medium text-slate-700 transition hover:border-primary hover:text-primary"
                              onClick={() => {
                                onSelectProduct(product.id);
                                onViewChange('add');
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center rounded-lg border border-border px-2 py-1 text-xs font-medium text-slate-700 transition hover:border-primary hover:text-primary"
                              onClick={() => openSerialModal(product)}
                            >
                              SN
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
                              onClick={() => void onDelete(product.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!filteredAndSortedProducts.length && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted">
                        {products.length === 0
                          ? 'No products yet. Click "Add Product" above to create your first product.'
                          : 'No products match your search criteria.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {serialModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-10">
          <div className="relative w-full max-w-5xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-border px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted">Serial numbers</p>
                <h3 className="text-xl font-semibold text-slate-900">{serialModalProduct.name}</h3>
                <p className="text-sm text-muted">
                  Review every serialised unit. Mark items as used or add new numbers to maintain traceability.
                </p>
              </div>
              <button
                type="button"
                onClick={closeSerialModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-slate-600 transition hover:border-primary hover:text-primary"
                aria-label="Close serial numbers panel"
              >
                ×
              </button>
            </div>
            <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-6">
              {serialModalError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {serialModalError}
                </div>
              )}
              <div className="flex flex-col gap-4">
                <div className="overflow-hidden rounded-2xl border border-border">
                  <table className="w-full table-auto border-collapse text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
                      <tr>
                        <th className="px-4 py-3 text-left">Used</th>
                        <th className="px-4 py-3 text-left">Serial number</th>
                        <th className="px-4 py-3 text-left">Added date</th>
                        <th className="px-4 py-3 text-left">Notes</th>
                        <th className="px-4 py-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serialModalRows.map((row) => (
                        <tr key={row.id} className="border-t border-border/70 align-middle">
                          <td className="px-4 py-3 align-middle">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                role="switch"
                                aria-checked={row.status === 'sold'}
                                onClick={() => toggleSerialRowUsed(row.id, row.status !== 'sold')}
                                className={cn(
                                  'relative inline-flex h-6 w-11 items-center rounded-full transition',
                                  row.status === 'sold' ? 'bg-emerald-500' : 'bg-slate-300'
                                )}
                              >
                                <span className="sr-only">Mark serial as used</span>
                                <span
                                  className={cn(
                                    'inline-block h-5 w-5 transform rounded-full bg-white transition',
                                    row.status === 'sold' ? 'translate-x-5' : 'translate-x-1'
                                  )}
                                />
                              </button>
                              <span className="text-xs font-medium text-muted min-w-[72px]">
                                {row.status === 'sold' ? 'Marked used' : 'Available'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <input
                              type="text"
                              value={row.serialNumber}
                              onChange={(event) => updateSerialModalRow(row.id, 'serialNumber', event.target.value)}
                              placeholder="e.g. SN-12345"
                              className="h-11 w-full rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700 align-middle whitespace-nowrap">
                            {row.addedAt ? new Date(row.addedAt).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <textarea
                              value={row.notes}
                              onChange={(event) => updateSerialModalRow(row.id, 'notes', event.target.value)}
                              rows={2}
                              placeholder="Optional note"
                              className="w-full rounded-xl border border-border bg-white px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <button
                              type="button"
                              onClick={() => removeSerialModalRow(row.id)}
                              className="inline-flex items-center justify-center rounded-xl border border-border px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-red-200 hover:text-red-600"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                      {!serialModalRows.length && (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted">
                            No serial numbers yet. Use the button below to add entries.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  onClick={addSerialModalRow}
                  className="inline-flex items-center justify-center rounded-xl border border-dashed border-border px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary"
                  disabled={serialModalSaving}
                >
                  Add serial number
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-3 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={closeSerialModal}
                className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary"
                disabled={serialModalSaving}
              >
                Cancel
              </button>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSerialModalSave}
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={serialModalSaving}
                >
                  {serialModalSaving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Product View */}
      {view === 'add' && (
        <form
          className="flex flex-col gap-5 rounded-2xl border border-border bg-background p-6 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();

            // Validate all steps before submission
            const allValidations: Record<number, 'valid' | 'warning' | 'incomplete'> = {};
            let hasIncomplete = false;
            let firstIncompleteStep = -1;

            FORM_STEPS.forEach((_, index) => {
              const validation = validateStep(index);
              allValidations[index] = validation;

              if (validation === 'warning' && firstIncompleteStep === -1) {
                hasIncomplete = true;
                firstIncompleteStep = index;
              }
            });

            setStepValidation(allValidations);

            // If there are incomplete required fields, navigate to first incomplete step
            if (hasIncomplete) {
              setCurrentStep(firstIncompleteStep);
              window.scrollTo({ top: 0, behavior: 'smooth' });
              return;
            }

            // All required fields are filled, submit the form
            onSubmit(e);
          }}
          onKeyDown={handleFormKeyDown}
        >
          {/* Step Indicator */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">
                {selectedProductId ? 'Edit Product' : 'Add New Product'}
              </h2>
              <span className="text-sm text-muted">
                Step {currentStep + 1} of {FORM_STEPS.length}
              </span>
            </div>

            {/* Progress bar */}
            <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${((currentStep + 1) / FORM_STEPS.length) * 100}%` }}
              />
            </div>

            {/* Step tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {FORM_STEPS.map((step, index) => {
                const validation = stepValidation[index];
                const isIncomplete = validation === 'incomplete';
                const isWarning = validation === 'warning';

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => goToStep(index)}
                    className={cn(
                      'flex min-w-[140px] flex-col items-center gap-1 rounded-lg border px-4 py-3 text-left transition-all',
                      index === currentStep
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : isIncomplete
                        ? 'border-red-300 bg-red-50 hover:border-red-400'
                        : isWarning
                        ? 'hover:opacity-90'
                        : index < currentStep
                        ? 'border-green-300 bg-green-50 hover:border-green-400'
                        : 'border-border bg-white hover:border-primary/50'
                    )}
                    style={isWarning ? {
                      borderColor: '#ffcc00',
                      backgroundColor: '#fffbeb',
                    } : undefined}
                  >
                    <div className="flex w-full items-center gap-2">
                      <span
                        className={cn(
                          'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold',
                          index === currentStep
                            ? 'bg-primary text-white'
                            : isIncomplete
                            ? 'bg-red-500 text-white'
                            : isWarning
                            ? 'text-white'
                            : index < currentStep
                            ? 'bg-green-500 text-white'
                            : 'bg-slate-200 text-slate-600'
                        )}
                        style={isWarning ? { backgroundColor: '#ffcc00' } : undefined}
                      >
                        {isIncomplete ? '!' : isWarning ? '⚠' : index < currentStep ? '✓' : index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div
                          className={cn(
                            'text-sm font-semibold truncate',
                            index === currentStep
                              ? 'text-primary'
                              : isIncomplete
                              ? 'text-red-700'
                              : isWarning
                              ? ''
                              : index < currentStep
                              ? 'text-green-700'
                              : 'text-slate-600'
                          )}
                          style={isWarning ? { color: '#cc9900' } : undefined}
                        >
                          {step.title}
                        </div>
                        <div className="text-xs text-muted truncate">{step.description}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Validation Warning */}
            {stepValidation[currentStep] === 'warning' && (
              <div className="mt-4 flex items-start gap-3 rounded-lg border p-4" style={{ borderColor: '#ffcc00', backgroundColor: '#fffbeb' }}>
                <svg className="h-5 w-5 flex-shrink-0" style={{ color: '#cc9900' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold" style={{ color: '#cc9900' }}>Required Fields Missing</h4>
                  <p className="mt-1 text-sm" style={{ color: '#996600' }}>
                    Please fill in all required fields before proceeding. Required fields are marked on this step.
                  </p>
                </div>
              </div>
            )}
          </div>

          {FORM_STEPS[currentStep].id === 'basics' && (
          <FormPanel title="Basic information" description="Control naming, categorisation, and visibility.">
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              <span>
                Name <span className="text-red-600">*</span>
              </span>
              <input
                type="text"
                value={form.name}
                onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))}
                required
                className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Slug
              <input
                type="text"
                value={form.slug}
                onChange={(event) => setForm((state) => ({ ...state, slug: event.target.value }))}
                placeholder="auto-generate if left blank"
                className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                SKU
                <input
                  type="text"
                  value={form.sku}
                  onChange={(event) => setForm((state) => ({ ...state, sku: event.target.value }))}
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Product code
                <input
                  type="text"
                  value={form.productCode}
                  onChange={(event) => setForm((state) => ({ ...state, productCode: event.target.value }))}
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
            </div>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              <span>
                Category <span className="text-red-600">*</span>
              </span>
              <select
                value={form.categoryId}
                onChange={(event) => setForm((state) => ({ ...state, categoryId: event.target.value }))}
                required
                className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Manufacturer
                <select
                  value={form.manufacturerId}
                  onChange={(event) => {
                    const nextId = event.target.value;
                    const match = manufacturerOptions.find((option) => option.id === nextId);
                    setForm((state) => ({
                      ...state,
                      manufacturerId: nextId,
                      manufacturerName: match ? match.name : state.manufacturerName,
                    }));
                  }}
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Unassigned</option>
                  {manufacturerOptions.map((manufacturer) => (
                    <option key={manufacturer.id} value={manufacturer.id}>
                      {manufacturer.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Manufacturer name
                <input
                  type="text"
                  value={form.manufacturerName}
                  onChange={(event) => setForm((state) => ({ ...state, manufacturerName: event.target.value }))}
                  placeholder="Override or add new manufacturer label"
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Product type
                <select
                  value={form.productType}
                  onChange={(event) => setForm((state) => ({ ...state, productType: event.target.value as ProductType | '' }))}
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Default</option>
                  {productTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Status
                <select
                  value={form.status}
                  onChange={(event) => setForm((state) => ({ ...state, status: event.target.value as ProductStatus | '' }))}
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {productStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Visibility
                <select
                  value={form.visibility}
                  onChange={(event) =>
                    setForm((state) => ({ ...state, visibility: event.target.value as ProductVisibility | '' }))
                  }
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {visibilityOptions.map((visibility) => (
                    <option key={visibility} value={visibility}>
                      {visibility.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex flex-col gap-2 text-sm text-slate-600">
              <span>Tags</span>
              <div className="flex flex-wrap gap-2">
                {productTags.map((tag) => {
                  const active = form.tags.has(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        'rounded-full px-3 py-1 text-xs font-medium transition',
                        active
                          ? 'bg-primary text-white shadow-sm'
                          : 'border border-border bg-white text-slate-600 hover:border-primary hover:text-primary'
                      )}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Short description
              <textarea
                value={form.shortDescription}
                onChange={(event) => setForm((state) => ({ ...state, shortDescription: event.target.value }))}
                rows={3}
                placeholder="One or two sentences shown near pricing."
                className="rounded-xl border border-border bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Full description
              <textarea
                value={form.description}
                onChange={(event) => setForm((state) => ({ ...state, description: event.target.value }))}
                rows={6}
                className="rounded-xl border border-border bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
          </FormPanel>
          )}

          {FORM_STEPS[currentStep].id === 'pricing' && (
          <FormPanel title="Pricing & availability" description="Manage pricing, promos, and inventory signals.">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                <span>
                  Price <span className="text-red-600">*</span>
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.price}
                  onChange={(event) => setForm((state) => ({ ...state, price: event.target.value }))}
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Sale price
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.salePrice}
                  onChange={(event) => setForm((state) => ({ ...state, salePrice: event.target.value }))}
                  placeholder="Leave blank for standard pricing"
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Sale starts
                <input
                  type="datetime-local"
                  value={form.saleStartDate}
                  onChange={(event) => setForm((state) => ({ ...state, saleStartDate: event.target.value }))}
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Sale ends
                <input
                  type="datetime-local"
                  value={form.saleEndDate}
                  onChange={(event) => setForm((state) => ({ ...state, saleEndDate: event.target.value }))}
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
            </div>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Tax class
              <input
                type="text"
                value={form.taxClass}
                onChange={(event) => setForm((state) => ({ ...state, taxClass: event.target.value }))}
                placeholder="Standard, reduced, exempt..."
                className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Stock
                <input
                  type="number"
                  min={0}
                  value={form.inventory.quantity}
                  onChange={(event) =>
                    setForm((state) => ({
                      ...state,
                      inventory: { ...state.inventory, quantity: event.target.value },
                    }))
                  }
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Low-stock threshold
                <input
                  type="number"
                  min={0}
                  value={form.inventory.lowStockThreshold}
                  onChange={(event) =>
                    setForm((state) => ({
                      ...state,
                      inventory: { ...state.inventory, lowStockThreshold: event.target.value },
                    }))
                  }
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Inventory status
                <select
                  value={form.inventory.status}
                  onChange={(event) =>
                    setForm((state) => ({
                      ...state,
                      inventory: { ...state.inventory, status: event.target.value as ProductInventoryStatus | '' },
                    }))
                  }
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Automatic</option>
                  {inventoryStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Lead time
                <input
                  type="text"
                  value={form.inventory.leadTime}
                  onChange={(event) =>
                    setForm((state) => ({
                      ...state,
                      inventory: { ...state.inventory, leadTime: event.target.value },
                    }))
                  }
                  placeholder="Ships in 48 hours"
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
            </div>
            <label className="inline-flex items-center gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={form.inventory.allowBackorder}
                onChange={(event) =>
                  setForm((state) => ({
                    ...state,
                    inventory: { ...state.inventory, allowBackorder: event.target.checked },
                  }))
                }
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary/40"
              />
              Allow backorders
            </label>
          </FormPanel>
          )}

          {FORM_STEPS[currentStep].id === 'media' && (
          <FormPanel title="Media & marketing" description="Control imagery, highlights, and downloadable content.">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Feature highlights</span>
                <button
                  type="button"
                  onClick={addHighlight}
                  className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
                >
                  Add highlight
                </button>
              </div>
              {form.featureHighlights.map((highlight, index) => (
                <div key={`highlight-${index}`} className="flex gap-2">
                  <input
                    type="text"
                    value={highlight}
                    onChange={(event) => updateHighlight(index, event.target.value)}
                    placeholder="e.g. Includes Smart Key programming support"
                    className="h-11 flex-1 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => removeHighlight(index)}
                    className="h-11 rounded-xl border border-border px-3 text-sm text-muted transition hover:border-red-200 hover:text-red-600"
                    aria-label="Remove highlight"
                  >
                    ×
                  </button>
                </div>
              ))}
              {!form.featureHighlights.length && (
                <p className="text-xs text-muted">Add highlight bullets to summarise key selling points.</p>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Packaging contents</span>
                <button
                  type="button"
                  onClick={addPackageItem}
                  className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
                >
                  Add item
                </button>
              </div>
              {form.packageContents.map((item, index) => (
                <div key={`package-${index}`} className="flex gap-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(event) => updatePackageItem(index, event.target.value)}
                    placeholder="e.g. VVDI tool case"
                    className="h-11 flex-1 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => removePackageItem(index)}
                    className="h-11 rounded-xl border border-border px-3 text-sm text-muted transition hover:border-red-200 hover:text-red-600"
                    aria-label="Remove package item"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="space-y-4 text-sm text-slate-600">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>Product images</span>
                {totalImagesCount ? (
                  <button
                    type="button"
                    onClick={clearAllImages}
                    disabled={isUploadingImages}
                    className="text-xs font-semibold text-primary underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    Remove all
                  </button>
                ) : null}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3 rounded-2xl border border-border bg-white/70 p-4">
                  <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                    <span>Main image</span>
                    {mainProductImage ? (
                      <button
                        type="button"
                        onClick={removeMainImage}
                        disabled={isUploadingImages}
                        className="text-xs font-semibold text-primary underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-slate-400"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                  <label className="relative flex flex-col gap-2">
                    <input
                      type="file"
                      accept={PRODUCT_IMAGE_ALLOWED_TYPES.join(',')}
                      onChange={handleMainImageSelect}
                      disabled={isUploadingImages}
                      className="cursor-pointer rounded-xl border border-dashed border-border bg-white px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-75"
                    />
                    <UploadingIndicator target="main" />
                  </label>
                  {mainProductImage ? (
                    <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
                      <img
                        src={normalizeImageSrc(mainProductImage)}
                        alt="Main product image"
                        className="h-44 w-full object-cover"
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-muted">
                      Choose a primary image that will be used for listings and featured placements.
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>Thumbnail images</span>
                    {thumbnailImages.length ? (
                      <button
                        type="button"
                        onClick={clearThumbnailImages}
                        disabled={isUploadingImages}
                        className="text-xs font-semibold text-primary underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-slate-400"
                      >
                        Remove thumbnails
                      </button>
                    ) : null}
                  </div>
                  <label className="relative flex flex-col gap-2">
                    <input
                      type="file"
                      accept={PRODUCT_IMAGE_ALLOWED_TYPES.join(',')}
                      multiple
                      onChange={handleThumbnailImagesSelect}
                      disabled={isUploadingImages || totalImagesCount >= MAX_PRODUCT_IMAGES}
                      className="cursor-pointer rounded-xl border border-dashed border-border bg-white px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-75"
                    />
                    <UploadingIndicator target="thumbnails" />
                  </label>
                  {thumbnailImages.length ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {thumbnailImages.map((image, index) => (
                        <div
                          key={`${image}-${index}`}
                          className="group relative overflow-hidden rounded-xl border border-border bg-white shadow-sm"
                        >
                          <img
                            src={normalizeImageSrc(image)}
                            alt={`Thumbnail image ${index + 1}`}
                            className="h-36 w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeThumbnailAtIndex(index)}
                            className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-white"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted">Add supporting images for the gallery and marketing placements.</p>
                  )}
                </div>
              </div>

              {isUploadingImages && <p className="text-xs text-primary">Uploading images...</p>}
              {imageUploadError && <p className="text-xs text-red-600">{imageUploadError}</p>}
              {imageUploadWarnings.length > 0 && (
                <ul className="list-disc space-y-1 pl-4 text-xs text-amber-600">
                  {imageUploadWarnings.map((warning, index) => (
                    <li key={`${warning}-${index}`}>{warning}</li>
                  ))}
                </ul>
              )}
            </div>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Video URLs
              <textarea
                value={form.videoUrls.join('\n')}
                onChange={(event) =>
                  setForm((state) => ({
                    ...state,
                    videoUrls: event.target.value
                      .split(/\n+/)
                      .map((url) => url.trim())
                      .filter(Boolean),
                  }))
                }
                rows={2}
                placeholder="Only YouTube links (watch, share, or embed)"
                className="rounded-xl border border-border bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-muted">
                Example: https://youtu.be/VIDEO or https://www.youtube.com/watch?v=VIDEO
              </p>
            </label>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Documents</span>
                <button
                  type="button"
                  onClick={addDocument}
                  className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
                >
                  Add document
                </button>
              </div>
              {form.documents.map((document) => (
                <div key={document.id} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <input
                    type="text"
                    value={document.label}
                    onChange={(event) => updateDocument(document.id, 'label', event.target.value)}
                    placeholder="Installation manual"
                    className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <input
                    type="url"
                    value={document.url}
                    onChange={(event) => updateDocument(document.id, 'url', event.target.value)}
                    placeholder="https://example.com/manual.pdf"
                    className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => removeDocument(document.id)}
                    className="h-11 rounded-xl border border-border px-3 text-sm text-muted transition hover:border-red-200 hover:text-red-600"
                    aria-label="Remove document"
                  >
                    ×
                  </button>
                </div>
              ))}
              {!form.documents.length && (
                <p className="text-xs text-muted">Link PDFs or programming guides to support technicians.</p>
              )}
            </div>
          </FormPanel>
          )}

          {FORM_STEPS[currentStep].id === 'specs' && (
          <FormPanel title="Specifications & attributes" description="Surface technical details and variation rules.">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Specifications</span>
                <button
                  type="button"
                  onClick={() => addKeyValueRow('specifications')}
                  className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
                >
                  Add specification
                </button>
              </div>
              {form.specifications.map((row) => (
                <div key={row.id} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <input
                    type="text"
                    value={row.label}
                    onChange={(event) => updateKeyValueRow('specifications', row.id, 'label', event.target.value)}
                    placeholder="Transponder"
                    className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <input
                    type="text"
                    value={row.value}
                    onChange={(event) => updateKeyValueRow('specifications', row.id, 'value', event.target.value)}
                    placeholder="46 / 4D / 8A"
                    className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => removeKeyValueRow('specifications', row.id)}
                    className="h-11 rounded-xl border border-border px-3 text-sm text-muted transition hover:border-red-200 hover:text-red-600"
                    aria-label="Remove specification"
                  >
                    ×
                  </button>
                </div>
              ))}
              {!form.specifications.length && (
                <p className="text-xs text-muted">Add structured specs to populate comparison tables.</p>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Global attributes</span>
                <button
                  type="button"
                  onClick={() => addKeyValueRow('attributes')}
                  className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
                >
                  Add attribute
                </button>
              </div>
              {form.attributes.map((row) => (
                <div key={row.id} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <input
                    type="text"
                    value={row.label}
                    onChange={(event) => updateKeyValueRow('attributes', row.id, 'label', event.target.value)}
                    placeholder="Buttons"
                    className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <input
                    type="text"
                    value={row.value}
                    onChange={(event) => updateKeyValueRow('attributes', row.id, 'value', event.target.value)}
                    placeholder="4 (lock/unlock/panic/trunk)"
                    className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => removeKeyValueRow('attributes', row.id)}
                    className="h-11 rounded-xl border border-border px-3 text-sm text-muted transition hover:border-red-200 hover:text-red-600"
                    aria-label="Remove attribute"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Custom attributes</span>
                <button
                  type="button"
                  onClick={() => addKeyValueRow('customAttributes')}
                  className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
                >
                  Add custom attribute
                </button>
              </div>
              {form.customAttributes.map((row) => (
                <div key={row.id} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <input
                    type="text"
                    value={row.label}
                    onChange={(event) => updateKeyValueRow('customAttributes', row.id, 'label', event.target.value)}
                    placeholder="Programming notes"
                    className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <input
                    type="text"
                    value={row.value}
                    onChange={(event) => updateKeyValueRow('customAttributes', row.id, 'value', event.target.value)}
                    placeholder="Requires VVDI smart adapter"
                    className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => removeKeyValueRow('customAttributes', row.id)}
                    className="h-11 rounded-xl border border-border px-3 text-sm text-muted transition hover:border-red-200 hover:text-red-600"
                    aria-label="Remove custom attribute"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </FormPanel>
          )}

          {FORM_STEPS[currentStep].id === 'variations' && (
          <FormPanel title="Variations" description="Define variable configurations like shell colour or button layouts.">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Variation attributes</span>
                <button
                  type="button"
                  onClick={addVariationAttributeName}
                  className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
                >
                  Add attribute name
                </button>
              </div>
              {form.variationAttributes.map((attribute, index) => (
                <div key={`variation-attribute-${index}`} className="flex gap-2">
                  <input
                    type="text"
                    value={attribute}
                    onChange={(event) => updateVariationAttributeName(index, event.target.value)}
                    placeholder="e.g. Button count"
                    className="h-11 flex-1 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => removeVariationAttributeName(index)}
                    className="h-11 rounded-xl border border-border px-3 text-sm text-muted transition hover:border-red-200 hover:text-red-600"
                    aria-label="Remove variation attribute"
                  >
                    ×
                  </button>
                </div>
              ))}
              {!form.variationAttributes.length && (
                <p className="text-xs text-muted">Add attribute names to drive variation combinations.</p>
              )}
            </div>
            <div className="space-y-4">
              {form.variations.map((variation) => (
                <div key={variation.id} className="rounded-2xl border border-border bg-white/80 p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-800">
                      Variation {variation.name || variation.sku || ''}
                    </h4>
                    <button
                      type="button"
                      onClick={() => removeVariation(variation.id)}
                      className="text-xs font-semibold text-red-600 underline-offset-2 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                      Name
                      <input
                        type="text"
                        value={variation.name}
                        onChange={(event) => updateVariationField(variation.id, 'name', event.target.value)}
                        className="h-10 rounded-xl border border-border bg-white px-3 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                      SKU
                      <input
                        type="text"
                        value={variation.sku}
                        onChange={(event) => updateVariationField(variation.id, 'sku', event.target.value)}
                        className="h-10 rounded-xl border border-border bg-white px-3 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                      Price
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={variation.price}
                        onChange={(event) => updateVariationField(variation.id, 'price', event.target.value)}
                        className="h-10 rounded-xl border border-border bg-white px-3 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                      Sale price
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={variation.salePrice}
                        onChange={(event) => updateVariationField(variation.id, 'salePrice', event.target.value)}
                        className="h-10 rounded-xl border border-border bg-white px-3 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                      Stock quantity
                      <input
                        type="number"
                        min={0}
                        value={variation.stockQuantity}
                        onChange={(event) => updateVariationField(variation.id, 'stockQuantity', event.target.value)}
                        className="h-10 rounded-xl border border-border bg-white px-3 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                      Weight
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={variation.weight}
                        onChange={(event) => updateVariationField(variation.id, 'weight', event.target.value)}
                        className="h-10 rounded-xl border border-border bg-white px-3 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-muted md:col-span-2">
                      Image URL
                      <input
                        type="url"
                        value={variation.image}
                        onChange={(event) => updateVariationField(variation.id, 'image', event.target.value)}
                        className="h-10 rounded-xl border border-border bg-white px-3 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </label>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                      <input
                        type="checkbox"
                        checked={variation.allowBackorder}
                        onChange={(event) => updateVariationField(variation.id, 'allowBackorder', event.target.checked)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary/40"
                      />
                      Allow backorder
                    </label>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted">
                      <span>Attributes</span>
                      <button
                        type="button"
                        onClick={() => addVariationAttribute(variation.id)}
                        className="text-[11px] font-semibold text-primary underline-offset-2 hover:underline"
                      >
                        Add attribute
                      </button>
                    </div>
                    {variation.attributes.map((attribute) => (
                      <div key={attribute.id} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                        <input
                          type="text"
                          value={attribute.label}
                          onChange={(event) =>
                            updateVariationAttribute(variation.id, attribute.id, 'label', event.target.value)
                          }
                          placeholder="Attribute"
                          className="h-10 rounded-xl border border-border bg-white px-3 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <input
                          type="text"
                          value={attribute.value}
                          onChange={(event) =>
                            updateVariationAttribute(variation.id, attribute.id, 'value', event.target.value)
                          }
                          placeholder="Value"
                          className="h-10 rounded-xl border border-border bg-white px-3 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <button
                          type="button"
                          onClick={() => removeVariationAttribute(variation.id, attribute.id)}
                          className="h-10 rounded-xl border border-border px-3 text-sm text-muted transition hover:border-red-200 hover:text-red-600"
                          aria-label="Remove variation attribute"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {!variation.attributes.length && (
                      <p className="text-xs text-muted">Add attribute/value pairs to define this configuration.</p>
                    )}
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addVariation}
                className="inline-flex items-center justify-center rounded-xl border border-dashed border-border px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary"
              >
                Add variation
              </button>
            </div>
          </FormPanel>
          )}

          {FORM_STEPS[currentStep].id === 'serialNumbers' && (
          <FormPanel title="Serial Numbers" description="Track individual product units by their serial numbers for inventory management.">
            <div className="space-y-4">
              {form.serialNumbers.map((serial) => (
                <div key={serial.id} className="rounded-2xl border border-border bg-white/80 p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-800">
                      {serial.serialNumber || 'New Serial Number'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => removeSerialNumber(serial.id)}
                      className="text-xs font-semibold text-red-600 underline-offset-2 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-muted md:col-span-2">
                      Serial Number
                      <input
                        type="text"
                        value={serial.serialNumber}
                        onChange={(event) => updateSerialNumberField(serial.id, 'serialNumber', event.target.value)}
                        placeholder="e.g. SN123456789"
                        className="h-10 rounded-xl border border-border bg-white px-3 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                      Status
                      <select
                        value={serial.status}
                        onChange={(event) => updateSerialNumberField(serial.id, 'status', event.target.value)}
                        className="h-10 rounded-xl border border-border bg-white px-3 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="available">Available</option>
                        <option value="sold">Sold</option>
                        <option value="reserved">Reserved</option>
                        <option value="defective">Defective</option>
                        <option value="returned">Returned</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                      Order ID
                      <input
                        type="text"
                        value={serial.orderId}
                        onChange={(event) => updateSerialNumberField(serial.id, 'orderId', event.target.value)}
                        placeholder="Optional"
                        className="h-10 rounded-xl border border-border bg-white px-3 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-muted md:col-span-2">
                      Sold Date
                      <input
                        type="datetime-local"
                        value={serial.soldDate}
                        onChange={(event) => updateSerialNumberField(serial.id, 'soldDate', event.target.value)}
                        className="h-10 rounded-xl border border-border bg-white px-3 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-muted md:col-span-2">
                      Notes
                      <textarea
                        value={serial.notes}
                        onChange={(event) => updateSerialNumberField(serial.id, 'notes', event.target.value)}
                        placeholder="Optional notes about this serial number"
                        rows={2}
                        className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </label>
                  </div>
                </div>
              ))}
              {!form.serialNumbers.length && (
                <p className="text-sm text-muted">No serial numbers added yet. Click "Add Serial Number" to track individual product units.</p>
              )}
              <button
                type="button"
                onClick={addSerialNumber}
                className="w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 py-3 text-sm font-semibold text-slate-600 transition hover:border-primary hover:bg-primary/5 hover:text-primary"
              >
                Add Serial Number
              </button>
            </div>
          </FormPanel>
          )}

          {FORM_STEPS[currentStep].id === 'compatibility' && (
          <FormPanel title="Compatibility & recommendations" description="Control fitment data and related merchandising.">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Vehicle compatibility</span>
                <button
                  type="button"
                  onClick={addCompatibilityRow}
                  className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
                >
                  Add vehicle
                </button>
              </div>
              {form.compatibility.map((entry) => (
                <div key={entry.id} className="space-y-2 rounded-xl border border-border bg-white/70 p-3">
                  <div className="grid gap-2 md:grid-cols-3">
                    <input
                      type="number"
                      placeholder="Year start"
                      value={entry.yearStart}
                      onChange={(event) => updateCompatibilityRow(entry.id, 'yearStart', event.target.value)}
                      className="h-10 rounded-lg border border-border bg-white px-3 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <input
                      type="number"
                      placeholder="Year end"
                      value={entry.yearEnd}
                      onChange={(event) => updateCompatibilityRow(entry.id, 'yearEnd', event.target.value)}
                      className="h-10 rounded-lg border border-border bg-white px-3 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <input
                      type="number"
                      placeholder="Specific year"
                      value={entry.year}
                      onChange={(event) => updateCompatibilityRow(entry.id, 'year', event.target.value)}
                      className="h-10 rounded-lg border border-border bg-white px-3 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="grid gap-2 md:grid-cols-3">
                    <input
                      type="text"
                      placeholder="Make"
                      value={entry.make}
                      onChange={(event) => updateCompatibilityRow(entry.id, 'make', event.target.value)}
                      className="h-10 rounded-lg border border-border bg-white px-3 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Model"
                      value={entry.model}
                      onChange={(event) => updateCompatibilityRow(entry.id, 'model', event.target.value)}
                      className="h-10 rounded-lg border border-border bg-white px-3 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Sub-model"
                      value={entry.subModel}
                      onChange={(event) => updateCompatibilityRow(entry.id, 'subModel', event.target.value)}
                      className="h-10 rounded-lg border border-border bg-white px-3 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                    <input
                      type="text"
                      placeholder="Engine"
                      value={entry.engine}
                      onChange={(event) => updateCompatibilityRow(entry.id, 'engine', event.target.value)}
                      className="h-10 rounded-lg border border-border bg-white px-3 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <input
                      type="text"
                      placeholder="Notes"
                      value={entry.notes}
                      onChange={(event) => updateCompatibilityRow(entry.id, 'notes', event.target.value)}
                      className="h-10 rounded-lg border border-border bg-white px-3 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={() => removeCompatibilityRow(entry.id)}
                      className="h-10 rounded-lg border border-border px-3 text-sm text-muted transition hover:border-red-200 hover:text-red-600"
                      aria-label="Remove compatibility row"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              {!form.compatibility.length && (
                <p className="text-xs text-muted">
                  Capture supported vehicles to power fitment search experiences and warnings.
                </p>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Related product IDs
                <textarea
                  value={form.relatedProductIds.join(', ')}
                  onChange={(event) =>
                    setForm((state) => ({
                      ...state,
                      relatedProductIds: event.target.value
                        .split(/[,|\n]/)
                        .map((value) => value.trim())
                        .filter(Boolean),
                    }))
                  }
                  rows={2}
                  className="rounded-xl border border-border bg-white px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Upsell product IDs
                <textarea
                  value={form.upsellProductIds.join(', ')}
                  onChange={(event) =>
                    setForm((state) => ({
                      ...state,
                      upsellProductIds: event.target.value
                        .split(/[,|\n]/)
                        .map((value) => value.trim())
                        .filter(Boolean),
                    }))
                  }
                  rows={2}
                  className="rounded-xl border border-border bg-white px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Cross-sell product IDs
                <textarea
                  value={form.crossSellProductIds.join(', ')}
                  onChange={(event) =>
                    setForm((state) => ({
                      ...state,
                      crossSellProductIds: event.target.value
                        .split(/[,|\n]/)
                        .map((value) => value.trim())
                        .filter(Boolean),
                    }))
                  }
                  rows={2}
                  className="rounded-xl border border-border bg-white px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
            </div>
          </FormPanel>
          )}

          {FORM_STEPS[currentStep].id === 'logistics' && (
          <FormPanel title="Logistics & support" description="Capture dimensional data, badges, service and content.">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Weight
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.shipping.weight}
                  onChange={(event) =>
                    setForm((state) => ({
                      ...state,
                      shipping: { ...state.shipping, weight: event.target.value },
                    }))
                  }
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Weight unit
                <input
                  type="text"
                  value={form.shipping.weightUnit}
                  onChange={(event) =>
                    setForm((state) => ({
                      ...state,
                      shipping: { ...state.shipping, weightUnit: event.target.value },
                    }))
                  }
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Length
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.shipping.length}
                  onChange={(event) =>
                    setForm((state) => ({
                      ...state,
                      shipping: { ...state.shipping, length: event.target.value },
                    }))
                  }
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Width
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.shipping.width}
                  onChange={(event) =>
                    setForm((state) => ({
                      ...state,
                      shipping: { ...state.shipping, width: event.target.value },
                    }))
                  }
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Height
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.shipping.height}
                  onChange={(event) =>
                    setForm((state) => ({
                      ...state,
                      shipping: { ...state.shipping, height: event.target.value },
                    }))
                  }
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Size unit
                <input
                  type="text"
                  value={form.shipping.dimensionUnit}
                  onChange={(event) =>
                    setForm((state) => ({
                      ...state,
                      shipping: { ...state.shipping, dimensionUnit: event.target.value },
                    }))
                  }
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Shipping class
                <input
                  type="text"
                  value={form.shipping.shippingClass}
                  onChange={(event) =>
                    setForm((state) => ({
                      ...state,
                      shipping: { ...state.shipping, shippingClass: event.target.value },
                    }))
                  }
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Warehouse location
                <input
                  type="text"
                  value={form.shipping.warehouseLocation}
                  onChange={(event) =>
                    setForm((state) => ({
                      ...state,
                      shipping: { ...state.shipping, warehouseLocation: event.target.value },
                    }))
                  }
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
            </div>
            <label className="inline-flex items-center gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={form.shipping.hazardous}
                onChange={(event) =>
                  setForm((state) => ({
                    ...state,
                    shipping: { ...state.shipping, hazardous: event.target.checked },
                  }))
                }
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary/40"
              />
              Contains hazardous materials
            </label>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Trust badges & guarantees</span>
                <button
                  type="button"
                  onClick={addBadge}
                  className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
                >
                  Add badge
                </button>
              </div>
              {form.badges.map((badge) => (
                <div key={badge.id} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <input
                    type="text"
                    value={badge.label}
                    onChange={(event) => updateBadge(badge.id, 'label', event.target.value)}
                    placeholder="Warranty"
                    className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <input
                    type="text"
                    value={badge.description}
                    onChange={(event) => updateBadge(badge.id, 'description', event.target.value)}
                    placeholder="12-month manufacturer warranty"
                    className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <input
                    type="text"
                    value={badge.icon}
                    onChange={(event) => updateBadge(badge.id, 'icon', event.target.value)}
                    placeholder="shield-check"
                    className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => removeBadge(badge.id)}
                    className="h-11 rounded-xl border border-border px-3 text-sm text-muted transition hover:border-red-200 hover:text-red-600"
                    aria-label="Remove badge"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Warranty
                <input
                  type="text"
                  value={form.support.warranty}
                  onChange={(event) =>
                    setForm((state) => ({
                      ...state,
                      support: { ...state.support, warranty: event.target.value },
                    }))
                  }
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Return policy
                <input
                  type="text"
                  value={form.support.returnPolicy}
                  onChange={(event) =>
                    setForm((state) => ({
                      ...state,
                      support: { ...state.support, returnPolicy: event.target.value },
                    }))
                  }
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Support phone
                <input
                  type="tel"
                  value={form.support.supportPhone}
                  onChange={(event) =>
                    setForm((state) => ({
                      ...state,
                      support: { ...state.support, supportPhone: event.target.value },
                    }))
                  }
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Support email
                <input
                  type="email"
                  value={form.support.supportEmail}
                  onChange={(event) =>
                    setForm((state) => ({
                      ...state,
                      support: { ...state.support, supportEmail: event.target.value },
                    }))
                  }
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Live chat URL
                <input
                  type="url"
                  value={form.support.liveChatUrl}
                  onChange={(event) =>
                    setForm((state) => ({
                      ...state,
                      support: { ...state.support, liveChatUrl: event.target.value },
                    }))
                  }
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Support hours
                <input
                  type="text"
                  value={form.support.supportHours}
                  onChange={(event) =>
                    setForm((state) => ({
                      ...state,
                      support: { ...state.support, supportHours: event.target.value },
                    }))
                  }
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
            </div>
          </FormPanel>
          )}

          {FORM_STEPS[currentStep].id === 'seo' && (
          <FormPanel title="SEO & metadata" description="Craft search snippets and sharing content.">
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Meta title
              <input
                type="text"
                value={form.seo.metaTitle}
                onChange={(event) =>
                  setForm((state) => ({
                    ...state,
                    seo: { ...state.seo, metaTitle: event.target.value },
                  }))
                }
                className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Meta description
              <textarea
                value={form.seo.metaDescription}
                onChange={(event) =>
                  setForm((state) => ({
                    ...state,
                    seo: { ...state.seo, metaDescription: event.target.value },
                  }))
                }
                rows={3}
                className="rounded-xl border border-border bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Canonical URL
                <input
                  type="url"
                  value={form.seo.canonicalUrl}
                  onChange={(event) =>
                    setForm((state) => ({
                      ...state,
                      seo: { ...state.seo, canonicalUrl: event.target.value },
                    }))
                  }
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Open Graph image
                <input
                  type="url"
                  value={form.seo.openGraphImage}
                  onChange={(event) =>
                    setForm((state) => ({
                      ...state,
                      seo: { ...state.seo, openGraphImage: event.target.value },
                    }))
                  }
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
            </div>
          </FormPanel>
          )}

          {FORM_STEPS[currentStep].id === 'reviews' && (
          <FormPanel title="Internal notes & reviews" description="Store internal notes and manage review summaries.">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Sales note
                <textarea
                  value={form.notes.sales}
                  onChange={(event) =>
                    setForm((state) => ({
                      ...state,
                      notes: { ...state.notes, sales: event.target.value },
                    }))
                  }
                  rows={3}
                  placeholder="Visible to customer-facing teams."
                  className="rounded-xl border border-border bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Internal note
                <textarea
                  value={form.notes.internal}
                  onChange={(event) =>
                    setForm((state) => ({
                      ...state,
                      notes: { ...state.notes, internal: event.target.value },
                    }))
                  }
                  rows={3}
                  placeholder="Private notes for logistics or purchasing."
                  className="rounded-xl border border-border bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Average rating
                <input
                  type="number"
                  min={0}
                  max={5}
                  step="0.1"
                  value={form.reviewsSummary.averageRating}
                  onChange={(event) =>
                    setForm((state) => ({
                      ...state,
                      reviewsSummary: { ...state.reviewsSummary, averageRating: event.target.value },
                    }))
                  }
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Review count
                <input
                  type="number"
                  min={0}
                  value={form.reviewsSummary.reviewCount}
                  onChange={(event) =>
                    setForm((state) => ({
                      ...state,
                      reviewsSummary: { ...state.reviewsSummary, reviewCount: event.target.value },
                    }))
                  }
                  className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Rating breakdown</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={addRatingDefaults}
                    className="text-xs font-semibold text-muted underline-offset-2 hover:underline"
                  >
                    Use 5★ template
                  </button>
                  <button
                    type="button"
                    onClick={addRatingRow}
                    className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    Add rating tier
                  </button>
                </div>
              </div>
              {form.reviewsSummary.ratingBreakdown.map((row) => (
                <div key={row.id} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <input
                    type="text"
                    value={row.rating}
                    onChange={(event) => updateRatingRow(row.id, 'rating', event.target.value)}
                    placeholder="e.g. 5"
                    className="h-10 rounded-xl border border-border bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <input
                    type="number"
                    min={0}
                    value={row.count}
                    onChange={(event) => updateRatingRow(row.id, 'count', event.target.value)}
                    placeholder="Count"
                    className="h-10 rounded-xl border border-border bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => removeRatingRow(row.id)}
                    className="h-10 rounded-xl border border-border px-3 text-sm text-muted transition hover:border-red-200 hover:text-red-600"
                    aria-label="Remove rating row"
                  >
                    ×
                  </button>
                </div>
              ))}
              {!form.reviewsSummary.ratingBreakdown.length && (
                <p className="text-xs text-muted">Populate review tiers to mirror imported review data.</p>
              )}
            </div>
          </FormPanel>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between border-t border-border pt-6">
            <button
              type="button"
              onClick={goToPreviousStep}
              disabled={currentStep === 0}
              className={cn(
                'inline-flex items-center justify-center gap-2 rounded-xl border px-6 py-3 text-sm font-semibold transition',
                currentStep === 0
                  ? 'cursor-not-allowed border-border bg-slate-100 text-slate-400'
                  : 'border-primary bg-white text-primary hover:bg-primary hover:text-white'
              )}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            <div className="flex items-center gap-3">
              {currentStep === FORM_STEPS.length - 1 ? (
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20"
                >
                  {selectedProductId ? 'Save changes' : 'Create product'}
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={goToNextStep}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20"
                >
                  Next
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Secondary Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary"
              onClick={() => onViewChange('all')}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to All Products
            </button>
            {selectedProductId && (
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                onClick={() => {
                  onSelectProduct('');
                  onViewChange('all');
                }}
              >
                Cancel Editing
              </button>
            )}
          </div>
        </form>
      )}
    </section>
  );
};
