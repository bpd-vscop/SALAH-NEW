import { useEffect, useMemo, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, Eye, Plus, RefreshCw, Search, Trash2, X, ChevronDown } from 'lucide-react';
import { invoicesApi } from '../../api/invoices';
import { estimatesApi } from '../../api/estimates';
import { productsApi } from '../../api/products';
import { usersApi } from '../../api/users';
import type { Estimate, Invoice, InvoiceStatus, Product, User } from '../../types/api';
import { formatCurrency } from '../../utils/format';
import { cn } from '../../utils/cn';
import { Select } from '../ui/Select';
import { StatusPill } from '../common/StatusPill';
import { CountrySelect } from '../common/CountrySelect';

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
  'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
  'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
  'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah',
  'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
];

interface InvoiceFormItem {
  id: string;
  productId: string;
  name: string;
  sku: string;
  quantity: string;
  price: string;
}

interface InvoiceFormAddress {
  companyName: string;
  name: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface InvoiceForm {
  billTo: InvoiceFormAddress;
  shipTo: InvoiceFormAddress;
  items: InvoiceFormItem[];
  status: InvoiceStatus;
  taxRate: string;
  shippingAmount: string;
  currency: string;
  terms: string;
  dueDate: string;
  notes: string;
  secondPageContent: string;
}

type DocumentType = 'invoice' | 'estimate';

interface BillingDocument {
  id: string;
  documentType: DocumentType;
  documentNumber: string;
  customerId?: string | null;
  status: InvoiceStatus;
  billTo: Invoice['billTo'];
  shipTo: Invoice['shipTo'];
  items: Invoice['items'];
  subtotal: number;
  taxRate?: number | null;
  taxAmount?: number | null;
  shippingAmount?: number | null;
  total: number;
  currency?: string | null;
  terms?: string | null;
  dueDate?: string | null;
  notes?: string | null;
  secondPageContent?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  createdBy?: string | null;
}

const COMPANY_DETAILS = {
  name: 'ULK Supply LLC',
  addressLine1: '1508 West Vine Street',
  addressLine2: '',
  city: 'Kissimmee',
  state: 'FL',
  postalCode: '34741',
  country: 'United States',
  phone: '',
  email: '',
};

const makeTempId = () => Math.random().toString(36).slice(2, 10);

const createEmptyAddress = (): InvoiceFormAddress => ({
  companyName: '',
  name: '',
  email: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'United States',
});

const createEmptyItem = (): InvoiceFormItem => ({
  id: makeTempId(),
  productId: '',
  name: '',
  sku: '',
  quantity: '1',
  price: '',
});

const createEmptyForm = (): InvoiceForm => ({
  billTo: createEmptyAddress(),
  shipTo: createEmptyAddress(),
  items: [createEmptyItem()],
  status: 'pending',
  taxRate: '',
  shippingAmount: '',
  currency: 'USD',
  terms: '',
  dueDate: '',
  notes: '',
  secondPageContent: '',
});

const mapInvoiceToDocument = (invoice: Invoice): BillingDocument => ({
  ...invoice,
  documentType: 'invoice',
  documentNumber: invoice.invoiceNumber,
});

const mapEstimateToDocument = (estimate: Estimate): BillingDocument => ({
  ...estimate,
  documentType: 'estimate',
  documentNumber: estimate.estimateNumber,
});

const getDocumentLabel = (documentType: DocumentType) =>
  documentType === 'invoice' ? 'Invoice' : 'Estimate';

const CODE39_PATTERNS: Record<string, string> = {
  '0': 'nnnwwnwnn',
  '1': 'wnnwnnnnw',
  '2': 'nnwwnnnnw',
  '3': 'wnwwnnnnn',
  '4': 'nnnwwnnnw',
  '5': 'wnnwwnnnn',
  '6': 'nnwwwnnnn',
  '7': 'nnnwnnwnw',
  '8': 'wnnwnnwnn',
  '9': 'nnwwnnwnn',
  A: 'wnnnnwnnw',
  B: 'nnwnnwnnw',
  C: 'wnwnnwnnn',
  D: 'nnnnwwnnw',
  E: 'wnnnwwnnn',
  F: 'nnwnwwnnn',
  G: 'nnnnnwwnn',
  H: 'wnnnnwwnn',
  I: 'nnwnnwwnn',
  J: 'nnnnwwwnn',
  K: 'wnnnnnnww',
  L: 'nnwnnnnww',
  M: 'wnwnnnnwn',
  N: 'nnnnwnnww',
  O: 'wnnnwnnwn',
  P: 'nnwnwnnwn',
  Q: 'nnnnnnwww',
  R: 'wnnnnnwwn',
  S: 'nnwnnnwwn',
  T: 'nnnnwnwwn',
  U: 'wwnnnnnnw',
  V: 'nwwnnnnnw',
  W: 'wwwnnnnnn',
  X: 'nwnnwnnnw',
  Y: 'wwnnwnnnn',
  Z: 'nwwnwnnnn',
  '-': 'nwnnnnwnw',
  '.': 'wwnnnnwnn',
  ' ': 'nwwnnnwnn',
  $: 'nwnwnwnnn',
  '/': 'nwnwnnnwn',
  '+': 'nwnnnwnwn',
  '%': 'nnnwnwnwn',
  '*': 'nwnnwnwnn',
};

const buildBarcodeSvg = (value: string) => {
  const normalized = value
    .toUpperCase()
    .split('')
    .filter((char) => CODE39_PATTERNS[char])
    .join('');
  const encoded = normalized || 'NA';
  const narrow = 2.5;
  const wide = narrow * 2.5;
  const height = 110;
  const quietZone = narrow * 10;
  let x = quietZone;
  let bars = '';
  const addPattern = (pattern: string) => {
    for (let index = 0; index < pattern.length; index += 1) {
      const unitWidth = pattern[index] === 'w' ? wide : narrow;
      if (index % 2 === 0) {
        bars += `<rect x="${x}" y="0" width="${unitWidth}" height="${height}" fill="#000" />`;
      }
      x += unitWidth;
    }
    x += narrow;
  };
  addPattern(CODE39_PATTERNS['*']);
  for (const char of encoded) {
    addPattern(CODE39_PATTERNS[char]);
  }
  addPattern(CODE39_PATTERNS['*']);
  const totalWidth = x + quietZone;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" viewBox="0 0 ${totalWidth} ${height}" aria-label="Barcode">${bars}</svg>`;
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  try {
    return new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const getStatusTone = (status: InvoiceStatus) => {
  switch (status) {
    case 'completed':
      return 'positive';
    case 'canceled':
      return 'critical';
    default:
      return 'warning';
  }
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatClientPhone = (client: User) => {
  if (client.phoneNumber) {
    const code = client.phoneCode ? `${client.phoneCode} ` : '';
    return `${code}${client.phoneNumber}`.trim();
  }
  return '';
};

const parseCompanyAddress = (address?: string | null) => {
  const trimmed = address?.trim();
  if (!trimmed) {
    return {
      addressLine1: '',
      city: '',
      state: '',
      country: '',
    };
  }
  const parts = trimmed.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 4) {
    const [addressLine1, city, state, ...rest] = parts;
    return {
      addressLine1,
      city,
      state,
      country: rest.join(', '),
    };
  }
  if (parts.length === 3) {
    const [addressLine1, city, state] = parts;
    return { addressLine1, city, state, country: '' };
  }
  if (parts.length === 2) {
    const [addressLine1, city] = parts;
    return { addressLine1, city, state: '', country: '' };
  }
  return { addressLine1: trimmed, city: '', state: '', country: '' };
};

const getDefaultShipping = (client: User) => {
  if (!client.shippingAddresses?.length) return null;
  return client.shippingAddresses.find((address) => address.isDefault) ?? client.shippingAddresses[0];
};

const buildBillToFromClient = (client: User): InvoiceFormAddress => {
  const fallback = createEmptyAddress();
  const shipping = getDefaultShipping(client);
  const phone = client.company?.phone || formatClientPhone(client) || shipping?.phone || '';
  if (client.clientType === 'C2B') {
    const billing = client.billingAddress;
    return {
      companyName: '',
      name: client.name ?? '',
      email: client.email ?? '',
      phone,
      addressLine1: billing?.addressLine1 || shipping?.addressLine1 || '',
      addressLine2: billing?.addressLine2 || shipping?.addressLine2 || '',
      city: billing?.city || shipping?.city || '',
      state: billing?.state || shipping?.state || '',
      postalCode: billing?.postalCode || shipping?.postalCode || '',
      country: billing?.country || shipping?.country || fallback.country,
    };
  }
  const companyAddress = parseCompanyAddress(client.company?.address);
  return {
    companyName: client.company?.name ?? '',
    name: client.name ?? '',
    email: client.email ?? '',
    phone,
    addressLine1: companyAddress.addressLine1 || shipping?.addressLine1 || '',
    addressLine2: shipping?.addressLine2 || '',
    city: companyAddress.city || shipping?.city || '',
    state: companyAddress.state || shipping?.state || '',
    postalCode: shipping?.postalCode || '',
    country: companyAddress.country || shipping?.country || fallback.country,
  };
};

export const InvoicesAdminSection: React.FC = () => {
  const [documents, setDocuments] = useState<BillingDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [activeDocument, setActiveDocument] = useState<BillingDocument | null>(null);
  const [createMode, setCreateMode] = useState<DocumentType>('invoice');
  const [form, setForm] = useState<InvoiceForm>(() => createEmptyForm());
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusUpdatingKey, setStatusUpdatingKey] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearchQueries, setProductSearchQueries] = useState<Record<string, string>>({});
  const [productDropdownOpen, setProductDropdownOpen] = useState<Record<string, boolean>>({});
  const productDropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [clients, setClients] = useState<User[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<BillingDocument | null>(null);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientLoadError, setClientLoadError] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const statusOptions = useMemo(
    () => [
      { value: 'pending', label: 'Pending' },
      { value: 'completed', label: 'Completed' },
      { value: 'canceled', label: 'Canceled' },
    ],
    []
  );
  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? null,
    [clients, selectedClientId]
  );
  const clientOptions = useMemo(
    () => [
      { value: '', label: 'Manual entry' },
      ...clients.map((client) => {
        const company = client.company?.name?.trim();
        const baseLabel = company ? `${company} - ${client.name}` : client.name;
        const emailLabel = client.email ? ` | ${client.email}` : '';
        return { value: client.id, label: `${baseLabel}${emailLabel}` };
      }),
    ],
    [clients]
  );

  // Check if country is United States
  const isBillToUnitedStates = ['united states', 'united states of america', 'usa', 'us'].includes(
    form.billTo.country.trim().toLowerCase()
  );
  const isShipToUnitedStates = ['united states', 'united states of america', 'usa', 'us'].includes(
    form.shipTo.country.trim().toLowerCase()
  );

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const [invoicesResponse, estimatesResponse] = await Promise.all([
        invoicesApi.list(),
        estimatesApi.list(),
      ]);
      const combined = [
        ...invoicesResponse.invoices.map(mapInvoiceToDocument),
        ...estimatesResponse.estimates.map(mapEstimateToDocument),
      ].sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
      setDocuments(combined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load invoices and estimates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDocuments();
  }, []);

  useEffect(() => {
    if (!showCreateModal || products.length > 0) return;
    const loadProducts = async () => {
      setProductsLoading(true);
      try {
        const { products: data } = await productsApi.list({ limit: 200 });
        setProducts(data);
      } catch {
        setProducts([]);
      } finally {
        setProductsLoading(false);
      }
    };
    void loadProducts();
  }, [showCreateModal, products.length]);

  useEffect(() => {
    if (!showCreateModal || clients.length > 0) return;
    const loadClients = async () => {
      setClientsLoading(true);
      setClientLoadError(null);
      try {
        const { users } = await usersApi.list({
          role: 'client',
          clientType: ['B2B', 'C2B'],
          status: 'active',
          sort: 'name-asc',
        });
        setClients(users);
      } catch (err) {
        setClientLoadError(err instanceof Error ? err.message : 'Unable to load clients.');
        setClients([]);
      } finally {
        setClientsLoading(false);
      }
    };
    void loadClients();
  }, [showCreateModal, clients.length]);

  useEffect(() => {
    if (!sameAsBilling) return;
    setForm((state) => ({ ...state, shipTo: { ...state.billTo } }));
  }, [sameAsBilling, form.billTo]);

  useEffect(() => {
    if (!selectedClient) return;
    setForm((state) => ({ ...state, billTo: buildBillToFromClient(selectedClient) }));
  }, [selectedClient]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      Object.entries(productDropdownRefs.current).forEach(([itemId, ref]) => {
        if (ref && !ref.contains(event.target as Node)) {
          setProductDropdownOpen((prev) => ({ ...prev, [itemId]: false }));
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredDocuments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return documents.filter((document) => {
      if (statusFilter !== 'all' && document.status !== statusFilter) {
        return false;
      }
      if (!query) return true;
      const fields = [
        document.documentNumber,
        document.id,
        document.billTo?.name,
        document.billTo?.email,
        document.shipTo?.name,
        document.items?.map((item) => item.name).join(' '),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return fields.includes(query);
    });
  }, [documents, searchQuery, statusFilter]);

  const productOptions = useMemo(() => {
    const options = products.map((product) => ({
      value: product.id,
      label: product.sku ? `${product.name} (${product.sku})` : product.name,
    }));
    return [{ value: '', label: 'Manual entry' }, ...options];
  }, [products]);

  const getFilteredProducts = (itemId: string) => {
    const query = (productSearchQueries[itemId] || '').trim().toLowerCase();
    return products.filter((product) => {
      if (!query) return true;
      const name = product.name?.toLowerCase() ?? '';
      const sku = product.sku?.toLowerCase() ?? '';
      return name.includes(query) || sku.includes(query);
    }).sort((a, b) => a.name.localeCompare(b.name));
  };

  const updateAddress = (target: 'billTo' | 'shipTo', field: keyof InvoiceFormAddress, value: string) => {
    setForm((state) => ({
      ...state,
      [target]: {
        ...state[target],
        [field]: value,
      },
    }));
  };

  const handleSelectClient = (value: string) => {
    setSelectedClientId(value);
    if (!value) {
      setForm((state) => ({ ...state, billTo: createEmptyAddress() }));
      return;
    }
    const client = clients.find((entry) => entry.id === value);
    if (!client) return;
    setForm((state) => ({ ...state, billTo: buildBillToFromClient(client) }));
  };

  const updateItem = (id: string, updates: Partial<InvoiceFormItem>) => {
    setForm((state) => ({
      ...state,
      items: state.items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    }));
  };

  const addItem = () => {
    setForm((state) => ({
      ...state,
      items: [...state.items, createEmptyItem()],
    }));
  };

  const removeItem = (id: string) => {
    setForm((state) => {
      if (state.items.length === 1) return state;
      return {
        ...state,
        items: state.items.filter((item) => item.id !== id),
      };
    });
  };

  const handleSelectProduct = (itemId: string, productId: string) => {
    if (!productId) {
      updateItem(itemId, { productId: '' });
      return;
    }
    const product = products.find((entry) => entry.id === productId);
    updateItem(itemId, {
      productId,
      name: product?.name ?? '',
      sku: product?.sku ?? '',
      price: product ? String(product.salePrice ?? product.price ?? '') : '',
    });
  };

  const resetForm = () => {
    setForm(createEmptyForm());
    setSameAsBilling(true);
    setFormError(null);
    setSelectedClientId('');
    setClientLoadError(null);
  };

  const handleOpenCreate = (mode: DocumentType) => {
    setCreateMode(mode);
    resetForm();
    setShowCreateModal(true);
  };

  const handleCloseCreate = () => {
    setShowCreateModal(false);
    resetForm();
  };

  const parseNumber = (value: string) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const roundCurrency = (value: number) => Math.round(value * 100) / 100;

  const summary = useMemo(() => {
    const subtotal = form.items.reduce((sum, item) => {
      const quantity = parseNumber(item.quantity);
      const price = parseNumber(item.price);
      return sum + quantity * price;
    }, 0);
    const taxRate = Math.max(0, parseNumber(form.taxRate));
    const taxAmount = taxRate > 0 ? roundCurrency((subtotal * taxRate) / 100) : 0;
    const shippingAmount = Math.max(0, parseNumber(form.shippingAmount));
    const total = roundCurrency(subtotal + taxAmount + shippingAmount);
    return {
      subtotal: roundCurrency(subtotal),
      taxRate,
      taxAmount,
      shippingAmount,
      total,
    };
  }, [form.items, form.taxRate, form.shippingAmount]);

  const handleCreateDocument = async () => {
    const documentLabel = getDocumentLabel(createMode);
    const documentLabelLower = documentLabel.toLowerCase();
    setFormError(null);
    if (!form.billTo.name.trim()) {
      setFormError(
        selectedClientId
          ? 'Selected client is missing a billing name. Clear the selection or update the client profile.'
          : 'Billing name is required.'
      );
      return;
    }
    if (!form.billTo.addressLine1.trim()) {
      setFormError(
        selectedClientId
          ? 'Selected client is missing a billing address. Clear the selection or update the client profile.'
          : 'Billing address is required.'
      );
      return;
    }
    if (!form.shipTo.name.trim()) {
      setFormError('Shipping name is required.');
      return;
    }
    if (!form.shipTo.addressLine1.trim()) {
      setFormError('Shipping address is required.');
      return;
    }

    const items = form.items.map((item) => {
      const name = item.name.trim();
      const quantity = parseNumber(item.quantity);
      const price = parseNumber(item.price);
      return {
        productId: item.productId ? item.productId : null,
        name,
        sku: item.sku.trim() || null,
        quantity,
        price,
      };
    });

    const invalidIndex = items.findIndex(
      (item) => !item.name || item.quantity <= 0 || !Number.isFinite(item.quantity) || item.price < 0
    );
    if (invalidIndex !== -1) {
      setFormError(`Item ${invalidIndex + 1} needs a name, quantity, and price.`);
      return;
    }
    if (items.length === 0) {
      setFormError(`At least one ${documentLabelLower} item is required.`);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        customerId: selectedClientId || undefined,
        billTo: {
          ...form.billTo,
          companyName: form.billTo.companyName || null,
          email: form.billTo.email || null,
          phone: form.billTo.phone || null,
          addressLine2: form.billTo.addressLine2 || null,
          city: form.billTo.city || null,
          state: form.billTo.state || null,
          postalCode: form.billTo.postalCode || null,
          country: form.billTo.country || null,
        },
        shipTo: {
          ...form.shipTo,
          companyName: form.shipTo.companyName || null,
          email: form.shipTo.email || null,
          phone: form.shipTo.phone || null,
          addressLine2: form.shipTo.addressLine2 || null,
          city: form.shipTo.city || null,
          state: form.shipTo.state || null,
          postalCode: form.shipTo.postalCode || null,
          country: form.shipTo.country || null,
        },
        items,
        status: form.status,
        taxRate: summary.taxRate,
        taxAmount: summary.taxAmount,
        shippingAmount: summary.shippingAmount,
        currency: form.currency || 'USD',
        terms: form.terms || undefined,
        dueDate: form.dueDate || null,
        notes: form.notes || undefined,
        secondPageContent: form.secondPageContent || undefined,
      };
      if (createMode === 'invoice') {
        const { invoice } = await invoicesApi.create(payload);
        setDocuments((prev) => [mapInvoiceToDocument(invoice), ...prev]);
      } else {
        const { estimate } = await estimatesApi.create(payload);
        setDocuments((prev) => [mapEstimateToDocument(estimate), ...prev]);
      }
      handleCloseCreate();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : `Unable to create ${documentLabelLower}.`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDocument = (document: BillingDocument) => {
    setDocumentToDelete(document);
    setShowDeleteModal(true);
  };

  const confirmDeleteDocument = async () => {
    if (!documentToDelete) return;
    const documentLabel = getDocumentLabel(documentToDelete.documentType);
    const documentLabelLower = documentLabel.toLowerCase();
    try {
      if (documentToDelete.documentType === 'invoice') {
        await invoicesApi.delete(documentToDelete.id);
      } else {
        await estimatesApi.delete(documentToDelete.id);
      }
      setDocuments((prev) =>
        prev.filter((entry) => !(entry.id === documentToDelete.id && entry.documentType === documentToDelete.documentType))
      );
      setShowDeleteModal(false);
      setDocumentToDelete(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Unable to delete ${documentLabelLower}.`
      );
      setShowDeleteModal(false);
      setDocumentToDelete(null);
    }
  };

  const replaceDocument = (updated: BillingDocument) => {
    setDocuments((prev) =>
      prev.map((entry) =>
        entry.id === updated.id && entry.documentType === updated.documentType ? updated : entry
      )
    );
    setActiveDocument((prev) =>
      prev && prev.id === updated.id && prev.documentType === updated.documentType ? updated : prev
    );
  };

  const handleStatusChange = async (document: BillingDocument, nextStatus: InvoiceStatus) => {
    if (document.status === nextStatus) return;
    const previousStatus = document.status;
    setError(null);
    const documentKey = `${document.documentType}-${document.id}`;
    setStatusUpdatingKey(documentKey);
    replaceDocument({ ...document, status: nextStatus });
    try {
      if (document.documentType === 'invoice') {
        const { invoice: updated } = await invoicesApi.update(document.id, { status: nextStatus });
        replaceDocument(mapInvoiceToDocument(updated));
      } else {
        const { estimate: updated } = await estimatesApi.update(document.id, { status: nextStatus });
        replaceDocument(mapEstimateToDocument(updated));
      }
    } catch (err) {
      replaceDocument({ ...document, status: previousStatus });
      const documentLabelLower = getDocumentLabel(document.documentType).toLowerCase();
      setError(
        err instanceof Error ? err.message : `Unable to update ${documentLabelLower} status.`
      );
    } finally {
      setStatusUpdatingKey(null);
    }
  };

  const buildPrintHtml = (document: BillingDocument) => {
    const invoice = document;
    const documentLabel = getDocumentLabel(document.documentType);
    const documentNumber = document.documentNumber;
    const barcodeSvg = buildBarcodeSvg(documentNumber);
    const barcodeDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(barcodeSvg)}`;
    const logoUrl = `${window.location.origin}/logo-png.png`;
    const createdDate = formatDate(invoice.createdAt);
    const dueDate = invoice.dueDate ? formatDate(invoice.dueDate) : '';
    const subtotal = formatCurrency(invoice.subtotal, invoice.currency ?? 'USD');
    const taxAmount = formatCurrency(invoice.taxAmount ?? 0, invoice.currency ?? 'USD');
    const shippingAmount = formatCurrency(invoice.shippingAmount ?? 0, invoice.currency ?? 'USD');
    const amountDue = formatCurrency(invoice.total, invoice.currency ?? 'USD');
    const companyCityState = [COMPANY_DETAILS.city, COMPANY_DETAILS.state].filter(Boolean).join(', ');
    const companyCityLine = `${companyCityState}${COMPANY_DETAILS.postalCode ? ` ${COMPANY_DETAILS.postalCode}` : ''}`.trim();

    const contactLine = (phone?: string | null, email?: string | null) => {
      const parts = [phone, email].filter(Boolean).map((value) => escapeHtml(String(value)));
      return parts.length ? `${parts.join(' | ')}<br>` : '';
    };
    const displayName = (companyName?: string | null, name?: string | null) => {
      const company = companyName?.trim();
      const person = name?.trim();
      if (company && person) return `${company} - ${person}`;
      return company || person || '';
    };

    const itemRows = invoice.items
      .map((item) => {
        const lineTotal = formatCurrency(item.price * item.quantity, invoice.currency ?? 'USD');
        return `
          <tr>
            <td class="text-center">${escapeHtml(String(item.quantity))}</td>
            <td>
              <div class="item-name">${escapeHtml(item.name)}</div>
              ${item.sku ? `<div class="item-sku">${escapeHtml(item.sku)}</div>` : ''}
            </td>
            <td class="text-right">${escapeHtml(formatCurrency(item.price, invoice.currency ?? 'USD'))}</td>
            <td class="text-right">${escapeHtml(lineTotal)}</td>
          </tr>
        `;
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(documentLabel)} ${escapeHtml(documentNumber)}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: Arial, Helvetica, sans-serif;
              font-size: 11px;
              color: #000;
              padding: 50px 60px;
              line-height: 1.4;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              position: relative;
              min-height: 100vh;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 30px;
              padding-bottom: 20px;
            }
            .company {
              display: flex;
              flex-direction: row;
              gap: 20px;
              align-items: flex-start;
            }
            .company img {
              max-width: 180px;
              height: auto;
            }
            .company-address {
              font-size: 10px;
              color: #000;
              border: 2px solid #d32f2f;
              padding: 6px 10px;
              display: inline-block;
            }
            .invoice-header {
              text-align: right;
            }
            .invoice-header h1 {
              font-size: 36px;
              font-weight: normal;
              color: #000;
              margin-bottom: 4px;
            }
            .invoice-number {
              font-size: 12px;
              font-weight: bold;
              color: #000;
              background: #f0f0f0;
              padding: 4px 8px;
              display: inline-block;
              margin-bottom: 8px;
            }
            .invoice-meta {
              text-align: left;
              font-size: 10px;
              margin-top: 8px;
            }
            .invoice-meta table {
              border-collapse: collapse;
            }
            .invoice-meta td {
              padding: 2px 8px 2px 0;
              border: none;
            }
            .invoice-meta td:first-child {
              font-weight: bold;
              min-width: 90px;
            }
            .page-header {
              position: fixed;
              top: 90px;
              right: 60px;
              text-align: right;
              font-size: 9px;
              line-height: 1.2;
              z-index: 2;
            }
            .page-header-id {
              font-weight: bold;
              font-size: 12px;
              color: #000;
              background: #f0f0f0;
              padding: 4px 8px;
              display: inline-block;
              margin-bottom: 8px;
            }
            .page-header-row {
              display: flex;
              justify-content: flex-end;
              gap: 6px;
            }
            .page-header-label {
              color: #555;
            }
            .invoice-number,
            .invoice-meta {
              visibility: hidden;
            }
            .invoice-total {
              padding: 12px 16px;
              background: #f3f3f3 !important;
              border: 1px solid #ddd;
              border-left: 3px solid #d32f2f;
              text-align: right;
              min-width: 200px;
            }
            .invoice-total .total-label {
              font-size: 11px;
              font-weight: bold;
              color: #666;
              margin-bottom: 4px;
            }
            .invoice-total .total-amount {
              font-size: 24px;
              font-weight: bold;
              color: #000;
              margin-bottom: 4px;
            }
            .invoice-total .due-date-label {
              font-size: 9px;
              color: #666;
            }
            .addresses-section {
              display: flex;
              gap: 40px;
              margin-bottom: 24px;
              align-items: flex-start;
            }
            .addresses {
              display: flex;
              gap: 40px;
              flex: 1;
            }
            .address-block {
              flex: 1;
            }
            .address-block h3 {
              font-size: 11px;
              font-weight: bold;
              text-transform: uppercase;
              margin-bottom: 8px;
              background: #f5f5f5;
              padding: 4px 8px;
              border-left: 3px solid #d32f2f;
            }
            .address-content {
              font-size: 10px;
              line-height: 1.5;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 24px 0;
              border: 1px solid #ddd;
            }
            .items-table thead {
              background: #f3f3f3 !important;
            }
            .items-table th {
              text-align: left;
              padding: 8px;
              font-size: 10px;
              font-weight: bold;
              text-transform: uppercase;
              border-bottom: 1px solid #ddd;
              background: #f3f3f3 !important;
            }
            .items-table th:first-child {
              border-left: 3px solid #d32f2f;
            }
            .items-table th.text-right {
              text-align: right;
            }
            .items-table td.text-right {
              text-align: right;
            }
            .items-table td.text-center {
              text-align: center;
            }
            .items-table td {
              padding: 10px 8px;
              font-size: 10px;
              border-bottom: 1px solid #ddd;
              vertical-align: top;
            }
            .items-table tbody tr:last-child td {
              border-bottom: 1px solid #ddd;
            }
            .item-name {
              font-weight: bold;
              color: #000;
              margin-bottom: 2px;
            }
            .item-sku {
              font-size: 9px;
              color: #666;
            }
            .totals-section {
              display: flex;
              justify-content: flex-end;
              margin-top: 20px;
            }
            .totals {
              width: 280px;
            }
            .totals table {
              width: 100%;
              border-collapse: collapse;
            }
            .totals td {
              padding: 6px 8px;
              font-size: 11px;
              border: none;
            }
            .totals td:first-child {
              text-align: left;
              color: #666;
            }
            .totals td:last-child {
              text-align: right;
              font-weight: bold;
            }
            .totals .total-row {
              border-top: none;
              padding-top: 8px;
            }
            .totals .total-row td {
              font-size: 13px;
              font-weight: bold;
              padding-top: 8px;
            }
            .totals .amount-due {
              background: #f3f3f3 !important;
            }
            .totals .amount-due td:first-child {
              border-left: 3px solid #d32f2f;
              padding-left: 8px;
            }
            .totals .amount-due td {
              background: #f3f3f3 !important;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 9px;
              color: #666;
              text-align: center;
            }
            .barcode {
              position: fixed;
              left: 60px;
              right: auto;
              bottom: 40px;
              display: inline-flex;
              flex-direction: column;
              gap: 0px;
              align-items: center;
              color: #000;
              font-size: 9px;
              letter-spacing: 0.3px;
              font-weight: 400;
              font-family: Arial, Helvetica, sans-serif;
            }
            .barcode svg,
            .barcode img {
              display: block;
              height: 110px;
              width: auto;
              max-width: 260px;
            }
            .barcode div {
              white-space: nowrap;
              margin-top: -30px;
              line-height: 1;
              font-size: 13px;
              font-weight: 300;
              letter-spacing: 0;
              font-family: inherit;
            }
            @media print {
              body { padding: 50px 60px; }
              @page { margin: 0.75in; }
            }
          </style>
        </head>
        <body>
          <div class="page-header">
            <div class="page-header-id">#${escapeHtml(documentNumber)}</div>
            <div class="page-header-row">
              <span class="page-header-label">Sales Order #</span>
              <span>SO${escapeHtml(documentNumber.slice(-6))}</span>
            </div>
            <div class="page-header-row">
              <span class="page-header-label">Date:</span>
              <span>${escapeHtml(createdDate)}</span>
            </div>
            ${dueDate ? `
              <div class="page-header-row">
                <span class="page-header-label">Due Date:</span>
                <span>${escapeHtml(dueDate)}</span>
              </div>
            ` : ''}
          </div>
          <div class="header">
            <div class="company">
              <img src="${logoUrl}" alt="${escapeHtml(COMPANY_DETAILS.name)}" />
              <div class="company-address">
                <strong>${escapeHtml(COMPANY_DETAILS.name)}</strong><br>
                ${escapeHtml(COMPANY_DETAILS.addressLine1)}<br>
                ${escapeHtml(companyCityLine)}<br>
                ${escapeHtml(COMPANY_DETAILS.country)}
              </div>
            </div>
            <div class="invoice-header">
              <h1>${escapeHtml(documentLabel)}</h1>
              <div class="invoice-number">#${escapeHtml(documentNumber)}</div>
              <div class="invoice-meta">
                <table>
                  <tr>
                    <td>Sales Order #</td>
                    <td>SO${escapeHtml(documentNumber.slice(-6))}</td>
                  </tr>
                  <tr>
                    <td>Date:</td>
                    <td>${escapeHtml(createdDate)}</td>
                  </tr>
                  ${dueDate ? `<tr><td>Due Date:</td><td>${escapeHtml(dueDate)}</td></tr>` : ''}
                </table>
              </div>
            </div>
          </div>

          <div class="addresses-section">
            <div class="addresses">
              <div class="address-block">
                <h3>Bill To</h3>
                <div class="address-content">
                  <strong>${escapeHtml(displayName(invoice.billTo.companyName, invoice.billTo.name))}</strong><br>
                  ${contactLine(invoice.billTo.phone, invoice.billTo.email)}
                  ${invoice.billTo.addressLine1 ? escapeHtml(invoice.billTo.addressLine1) + '<br>' : ''}
                  ${[invoice.billTo.city, invoice.billTo.state, invoice.billTo.postalCode].filter(Boolean).join(', ')}<br>
                  ${invoice.billTo.country ? escapeHtml(invoice.billTo.country) : ''}
                </div>
              </div>
              <div class="address-block">
                <h3>Ship To</h3>
                <div class="address-content">
                  <strong>${escapeHtml(displayName(invoice.shipTo.companyName, invoice.shipTo.name))}</strong><br>
                  ${contactLine(invoice.shipTo.phone, invoice.shipTo.email)}
                  ${invoice.shipTo.addressLine1 ? escapeHtml(invoice.shipTo.addressLine1) + '<br>' : ''}
                  ${[invoice.shipTo.city, invoice.shipTo.state, invoice.shipTo.postalCode].filter(Boolean).join(', ')}<br>
                  ${invoice.shipTo.country ? escapeHtml(invoice.shipTo.country) : ''}
                </div>
              </div>
            </div>
            <div class="invoice-total">
              <div class="total-label">TOTAL</div>
              <div class="total-amount">${escapeHtml(amountDue)}</div>
              ${dueDate ? `<div class="due-date-label">Due Date: ${escapeHtml(dueDate)}</div>` : ''}
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 60px; text-align: center;">Qty</th>
                <th>Item</th>
                <th style="width: 100px;" class="text-right">Rate</th>
                <th style="width: 100px;" class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>

          <div class="totals-section">
            <div class="totals">
              <table>
                <tr>
                  <td>Subtotal</td>
                  <td>${escapeHtml(subtotal)}</td>
                </tr>
                <tr>
                  <td>Tax Total (%)</td>
                  <td>${escapeHtml(taxAmount)}</td>
                </tr>
                <tr>
                  <td>Shipping + Handling</td>
                  <td>${escapeHtml(shippingAmount)}</td>
                </tr>
                <tr class="total-row amount-due">
                  <td>Amount Due</td>
                  <td>${escapeHtml(amountDue)}</td>
                </tr>
              </table>
            </div>
          </div>

          ${invoice.terms || invoice.notes ? `
            <div class="footer">
              ${invoice.terms ? `<div><strong>Terms:</strong> ${escapeHtml(invoice.terms)}</div>` : ''}
              ${invoice.notes ? `<div style="margin-top: 8px;">${escapeHtml(invoice.notes)}</div>` : ''}
            </div>
          ` : ''}
          <div class="barcode">
            <img src="${barcodeDataUrl}" alt="Barcode" />
            <div>${escapeHtml(documentNumber)}</div>
          </div>

          ${document.secondPageContent ? `
            <div style="page-break-before: always; padding-top: 50px;">
              <div class="header">
                <div class="company">
                  <img src="${logoUrl}" alt="${escapeHtml(COMPANY_DETAILS.name)}" />
                  <div class="company-address">
                    <strong>${escapeHtml(COMPANY_DETAILS.name)}</strong><br>
                    ${escapeHtml(COMPANY_DETAILS.addressLine1)}<br>
                    ${escapeHtml(companyCityLine)}<br>
                    ${escapeHtml(COMPANY_DETAILS.country)}
                  </div>
                </div>
                <div class="invoice-header">
                  <h1>${escapeHtml(documentLabel)}</h1>
                  <div class="invoice-number">#${escapeHtml(documentNumber)}</div>
                </div>
              </div>

              <div style="margin-top: 40px; margin-bottom: 120px; white-space: pre-wrap; line-height: 1.6;">
                ${escapeHtml(document.secondPageContent)}
              </div>

              <div class="barcode">
                <img src="${barcodeDataUrl}" alt="Barcode" />
                <div>${escapeHtml(documentNumber)}</div>
              </div>
            </div>
          ` : ''}
        </body>
      </html>
    `;
  };

  const handleDownloadDocument = (billingDocument: BillingDocument) => {
    const html = buildPrintHtml(billingDocument);

    // Create a blob from the HTML content
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    // Create a temporary iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    document.body.appendChild(iframe);

    // Write content to iframe and print
    if (iframe.contentWindow) {
      iframe.contentWindow.document.open();
      iframe.contentWindow.document.write(html);
      iframe.contentWindow.document.close();

      // Wait for content to load, then print
      iframe.onload = () => {
        setTimeout(() => {
          if (iframe.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();

            // Clean up after a delay
            setTimeout(() => {
              document.body.removeChild(iframe);
              URL.revokeObjectURL(url);
            }, 1000);
          }
        }, 250);
      };
    }
  };

  const createLabel = getDocumentLabel(createMode);
  const createLabelLower = createLabel.toLowerCase();

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Invoices & Estimates</h2>
            <p className="text-sm text-muted">Create, track, and deliver invoices and estimates to customers.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadDocuments()}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => handleOpenCreate('invoice')}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark"
            >
              <Plus className="h-4 w-4" />
              Create invoice
            </button>
            <button
              type="button"
              onClick={() => handleOpenCreate('estimate')}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
            >
              <Plus className="h-4 w-4" />
              Create estimate
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search invoices and estimates"
              className="h-7 w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="w-44">
            <Select
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as InvoiceStatus | 'all')}
              options={[{ value: 'all', label: 'All statuses' }, ...statusOptions]}
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-surface shadow-sm overflow-hidden">
        <div className="overflow-auto">
          <table className="min-w-full divide-y divide-border text-left text-sm">
            <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Document ID</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Items</th>
                <th className="px-4 py-3 font-semibold text-right">Total</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-muted">
                    Loading invoices and estimates...
                  </td>
                </tr>
              )}
              {!loading &&
                filteredDocuments.map((document) => {
                  const itemsCount = document.items.reduce((sum, item) => sum + item.quantity, 0);
                  const documentKey = `${document.documentType}-${document.id}`;
                  const documentLabel = getDocumentLabel(document.documentType);
                  return (
                    <tr key={documentKey} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-sm font-semibold text-primary">
                        {document.documentNumber}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">
                        {formatDate(document.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="font-medium text-slate-900">{document.billTo.name}</div>
                          <div className="text-xs text-muted">{document.billTo.email || document.shipTo.email || '-'}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {itemsCount} item{itemsCount !== 1 ? 's' : ''}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {formatCurrency(document.total, document.currency ?? 'USD')}
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={document.status}
                          onChange={(value) => handleStatusChange(document, value as InvoiceStatus)}
                          options={statusOptions}
                          disabled={statusUpdatingKey === documentKey}
                          className="w-36"
                          buttonClassName="h-8 text-xs"
                          portal
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:border-primary hover:text-primary"
                            title={`View ${documentLabel.toLowerCase()}`}
                            onClick={() => {
                              setActiveDocument(document);
                              setShowPreviewModal(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:border-primary hover:text-primary"
                            title={`Download ${documentLabel.toLowerCase()}`}
                            onClick={() => handleDownloadDocument(document)}
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-slate-200 p-2 text-red-600 transition hover:border-red-500 hover:text-red-600"
                            title={`Delete ${documentLabel.toLowerCase()}`}
                            onClick={() => void handleDeleteDocument(document)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              {!loading && filteredDocuments.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted">
                    {searchQuery
                      ? 'No invoices or estimates match your search.'
                      : 'No invoices or estimates created yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="max-h-full w-full max-w-6xl overflow-y-auto rounded-2xl border border-border bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-white px-6 py-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Create New {createLabel}</h3>
                <p className="mt-1 text-sm text-muted">Fill in customer details and items to generate a professional {createLabelLower}.</p>
              </div>
              <button
                type="button"
                onClick={handleCloseCreate}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              {formError && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {formError}
                </div>
              )}

              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">Existing client</h4>
                      <p className="text-xs text-muted">Select a client to auto-fill billing details.</p>
                    </div>
                    {selectedClientId && (
                      <button
                        type="button"
                        onClick={() => handleSelectClient('')}
                        className="text-xs font-semibold text-primary hover:text-primary-dark"
                      >
                        Use manual entry
                      </button>
                    )}
                  </div>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="w-full max-w-md">
                      <Select
                        value={selectedClientId}
                        onChange={handleSelectClient}
                        options={clientOptions}
                        disabled={clientsLoading}
                        searchable
                        searchPlaceholder="Search clients..."
                      />
                    </div>
                    {clientsLoading && (
                      <span className="text-xs text-muted">Loading clients...</span>
                    )}
                  </div>
                  {clientLoadError && (
                    <div className="mt-2 text-xs text-red-600">{clientLoadError}</div>
                  )}
                  {!clientsLoading && !clientLoadError && clients.length === 0 && (
                    <div className="mt-2 text-xs text-muted">No clients found.</div>
                  )}
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                {selectedClientId ? (
                  <div className="space-y-3 rounded-xl border border-border bg-white p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-900">Bill To</h4>
                      <span className="text-xs text-muted">From client profile</span>
                    </div>
                    <div className="space-y-1 text-sm text-slate-700">
                      <div className="font-semibold">
                        {form.billTo.companyName
                          ? `${form.billTo.companyName} - ${form.billTo.name}`
                          : form.billTo.name || '-'}
                      </div>
                      {(form.billTo.phone || form.billTo.email) && (
                        <div>{[form.billTo.phone, form.billTo.email].filter(Boolean).join(' | ')}</div>
                      )}
                      <div>{form.billTo.addressLine1 || '-'}</div>
                      {form.billTo.addressLine2 && <div>{form.billTo.addressLine2}</div>}
                      <div>
                        {[form.billTo.city, form.billTo.state, form.billTo.postalCode]
                          .filter(Boolean)
                          .join(', ') || '-'}
                      </div>
                      <div>{form.billTo.country || '-'}</div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 rounded-xl border border-border bg-white p-4">
                    <h4 className="text-sm font-semibold text-slate-900">Bill To <span className="text-red-500">*</span></h4>
                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Company name</label>
                        <input
                          type="text"
                          value={form.billTo.companyName}
                          onChange={(event) => updateAddress('billTo', 'companyName', event.target.value)}
                          placeholder="Company name"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Name <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={form.billTo.name}
                          onChange={(event) => updateAddress('billTo', 'name', event.target.value)}
                          placeholder="Customer name"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                          <input
                            type="email"
                            value={form.billTo.email}
                            onChange={(event) => updateAddress('billTo', 'email', event.target.value)}
                            placeholder="email@example.com"
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                          <input
                            type="text"
                            value={form.billTo.phone}
                            onChange={(event) => updateAddress('billTo', 'phone', event.target.value)}
                            placeholder="Phone number"
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Address Line 1 <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={form.billTo.addressLine1}
                          onChange={(event) => updateAddress('billTo', 'addressLine1', event.target.value)}
                          placeholder="Street address"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Address Line 2</label>
                        <input
                          type="text"
                          value={form.billTo.addressLine2}
                          onChange={(event) => updateAddress('billTo', 'addressLine2', event.target.value)}
                          placeholder="Apt, suite, etc. (optional)"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Country</label>
                        <CountrySelect
                          value={form.billTo.country}
                          onChange={(value) => updateAddress('billTo', 'country', value)}
                          placeholder="Select country"
                          searchPlaceholder="Search countries..."
                          placement="auto"
                          className="w-full h-9"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2.5">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">City</label>
                          <input
                            type="text"
                            value={form.billTo.city}
                            onChange={(event) => updateAddress('billTo', 'city', event.target.value)}
                            placeholder="City"
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">State</label>
                          {isBillToUnitedStates ? (
                            <CountrySelect
                              value={form.billTo.state}
                              onChange={(value) => updateAddress('billTo', 'state', value)}
                              options={US_STATES}
                              placeholder="Select state"
                              searchPlaceholder="Search states..."
                              placement="auto"
                              className="w-full h-9"
                            />
                          ) : (
                            <input
                              type="text"
                              value={form.billTo.state}
                              onChange={(event) => updateAddress('billTo', 'state', event.target.value)}
                              placeholder="State / Province"
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">ZIP</label>
                          <input
                            type="text"
                            value={form.billTo.postalCode}
                            onChange={(event) => updateAddress('billTo', 'postalCode', event.target.value)}
                            placeholder="ZIP"
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              <div className="space-y-3 rounded-xl border border-border bg-white p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-900">Ship To</h4>
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
                    <input
                      type="checkbox"
                      checked={sameAsBilling}
                      onChange={(event) => setSameAsBilling(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
                    />
                    Same as billing
                  </label>
                </div>
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Company name</label>
                    <input
                      type="text"
                      value={form.shipTo.companyName}
                      onChange={(event) => updateAddress('shipTo', 'companyName', event.target.value)}
                      disabled={sameAsBilling}
                      placeholder="Company name"
                      className={cn(
                        'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
                        sameAsBilling && 'bg-slate-100 text-slate-500 cursor-not-allowed'
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                    <input
                      type="text"
                      value={form.shipTo.name}
                      onChange={(event) => updateAddress('shipTo', 'name', event.target.value)}
                      disabled={sameAsBilling}
                      placeholder="Customer name"
                      className={cn(
                        'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
                        sameAsBilling && 'bg-slate-100 text-slate-500 cursor-not-allowed'
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                      <input
                        type="email"
                        value={form.shipTo.email}
                        onChange={(event) => updateAddress('shipTo', 'email', event.target.value)}
                        disabled={sameAsBilling}
                        placeholder="email@example.com"
                        className={cn(
                          'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
                          sameAsBilling && 'bg-slate-100 text-slate-500 cursor-not-allowed'
                        )}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                      <input
                        type="text"
                        value={form.shipTo.phone}
                        onChange={(event) => updateAddress('shipTo', 'phone', event.target.value)}
                        disabled={sameAsBilling}
                        placeholder="Phone number"
                        className={cn(
                          'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
                          sameAsBilling && 'bg-slate-100 text-slate-500 cursor-not-allowed'
                        )}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Address Line 1</label>
                    <input
                      type="text"
                      value={form.shipTo.addressLine1}
                      onChange={(event) => updateAddress('shipTo', 'addressLine1', event.target.value)}
                      disabled={sameAsBilling}
                      placeholder="Street address"
                      className={cn(
                        'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
                        sameAsBilling && 'bg-slate-100 text-slate-500 cursor-not-allowed'
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Address Line 2</label>
                    <input
                      type="text"
                      value={form.shipTo.addressLine2}
                      onChange={(event) => updateAddress('shipTo', 'addressLine2', event.target.value)}
                      disabled={sameAsBilling}
                      placeholder="Apt, suite, etc. (optional)"
                      className={cn(
                        'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
                        sameAsBilling && 'bg-slate-100 text-slate-500 cursor-not-allowed'
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Country</label>
                    <div className={cn(sameAsBilling && 'pointer-events-none opacity-60')}>
                      <CountrySelect
                        value={form.shipTo.country}
                        onChange={(value) => updateAddress('shipTo', 'country', value)}
                        placeholder="Select country"
                        searchPlaceholder="Search countries..."
                        placement="auto"
                        className="w-full h-9"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">City</label>
                      <input
                        type="text"
                        value={form.shipTo.city}
                        onChange={(event) => updateAddress('shipTo', 'city', event.target.value)}
                        disabled={sameAsBilling}
                        placeholder="City"
                        className={cn(
                          'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
                          sameAsBilling && 'bg-slate-100 text-slate-500 cursor-not-allowed'
                        )}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">State</label>
                      {isShipToUnitedStates ? (
                        <div className={cn(sameAsBilling && 'pointer-events-none opacity-60')}>
                          <CountrySelect
                            value={form.shipTo.state}
                            onChange={(value) => updateAddress('shipTo', 'state', value)}
                            options={US_STATES}
                            placeholder="Select state"
                            searchPlaceholder="Search states..."
                            placement="auto"
                            className="w-full h-9"
                          />
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={form.shipTo.state}
                          onChange={(event) => updateAddress('shipTo', 'state', event.target.value)}
                          disabled={sameAsBilling}
                          placeholder="State / Province"
                          className={cn(
                            'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
                            sameAsBilling && 'bg-slate-100 text-slate-500 cursor-not-allowed'
                          )}
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">ZIP</label>
                      <input
                        type="text"
                        value={form.shipTo.postalCode}
                        onChange={(event) => updateAddress('shipTo', 'postalCode', event.target.value)}
                        disabled={sameAsBilling}
                        placeholder="ZIP"
                        className={cn(
                          'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
                          sameAsBilling && 'bg-slate-100 text-slate-500 cursor-not-allowed'
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">Items</h4>
                  <p className="text-xs text-muted">Add products or custom line items.</p>
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
                >
                  Add item
                </button>
              </div>

              <div className="space-y-3">
                {form.items.map((item, index) => (
                  <div key={item.id} className="rounded-2xl border border-border bg-white p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700">Item {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        disabled={form.items.length === 1}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-500 transition hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                      <div className="md:col-span-2">
                        <label className="text-xs font-medium text-muted">Product</label>
                        <div className="relative mt-1" ref={(el) => { productDropdownRefs.current[item.id] = el; }}>
                          <button
                            type="button"
                            onClick={() => setProductDropdownOpen((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                            disabled={productsLoading}
                            className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm hover:border-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              {item.productId && products.find((p) => p.id === item.productId)?.images?.[0] && (
                                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-300">
                                  <img
                                    src={products.find((p) => p.id === item.productId)!.images![0]}
                                    alt={item.name}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              )}
                              <span className={cn('truncate text-sm font-medium', !item.productId && 'text-slate-400')}>
                                {item.productId
                                  ? products.find((p) => p.id === item.productId)?.name || 'Manual entry'
                                  : 'Select product or manual entry'}
                              </span>
                            </div>
                            <ChevronDown
                              className={cn(
                                'h-4 w-4 flex-shrink-0 text-slate-400 transition-transform',
                                productDropdownOpen[item.id] && 'rotate-180'
                              )}
                            />
                          </button>
                          <AnimatePresence>
                            {productDropdownOpen[item.id] && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.1 }}
                                className="absolute left-0 right-0 top-full z-[100] mt-1 max-h-96 overflow-y-auto rounded-lg border border-slate-300 bg-white p-2 shadow-xl"
                              >
                                <div className="sticky top-0 z-10 bg-white pb-2">
                                  <div className="relative">
                                    <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                    <input
                                      type="text"
                                      placeholder="Search products..."
                                      value={productSearchQueries[item.id] || ''}
                                      onChange={(event) => setProductSearchQueries((prev) => ({ ...prev, [item.id]: event.target.value }))}
                                      className="h-8 w-full rounded-md border border-slate-300 bg-white pl-8 pr-3 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleSelectProduct(item.id, '');
                                    setProductDropdownOpen((prev) => ({ ...prev, [item.id]: false }));
                                    setProductSearchQueries((prev) => ({ ...prev, [item.id]: '' }));
                                  }}
                                  className="flex w-full items-center gap-2 rounded-md border border-slate-200 p-2 text-left text-xs transition hover:border-primary hover:bg-primary/5 mb-2"
                                >
                                  <span className="font-medium text-slate-600">Manual entry (no product)</span>
                                </button>
                                <div className="grid grid-cols-3 gap-2 sm:grid-cols-3">
                                  {getFilteredProducts(item.id).length ? (
                                    getFilteredProducts(item.id).map((product) => (
                                      <button
                                        key={product.id}
                                        type="button"
                                        onClick={() => {
                                          handleSelectProduct(item.id, product.id);
                                          setProductDropdownOpen((prev) => ({ ...prev, [item.id]: false }));
                                          setProductSearchQueries((prev) => ({ ...prev, [item.id]: '' }));
                                        }}
                                        className="flex flex-col items-center gap-1 rounded-md border border-slate-200 p-2 text-center transition hover:border-primary hover:bg-primary/5"
                                      >
                                        {product.images?.[0] && (
                                          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-slate-200">
                                            <img
                                              src={product.images[0]}
                                              alt={product.name}
                                              className="h-full w-full object-cover"
                                            />
                                          </div>
                                        )}
                                        <span className="text-[0.6rem] font-medium leading-tight line-clamp-2 text-slate-600">
                                          {product.name}
                                        </span>
                                        {product.sku && (
                                          <span className="text-[0.55rem] text-slate-400 line-clamp-1">
                                            {product.sku}
                                          </span>
                                        )}
                                      </button>
                                    ))
                                  ) : (
                                    <div className="col-span-full rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
                                      No products found.
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted">SKU</label>
                        <input
                          type="text"
                          value={item.sku}
                          onChange={(event) => updateItem(item.id, { sku: event.target.value })}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted">Quantity</label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(event) => updateItem(item.id, { quantity: event.target.value })}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs font-medium text-muted">Item name</label>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(event) => updateItem(item.id, { name: event.target.value })}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted">Price</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.price}
                          onChange={(event) => updateItem(item.id, { price: event.target.value })}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted">Line total</label>
                        <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                          {formatCurrency(
                            parseNumber(item.quantity) * parseNumber(item.price),
                            form.currency
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-4">
                <div className="lg:col-span-3 space-y-3 rounded-xl border border-border bg-white p-4">
                  <h4 className="text-sm font-semibold text-slate-900">Payment & Additional Details</h4>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                      <Select
                        value={form.status}
                        onChange={(value) => setForm((state) => ({ ...state, status: value as InvoiceStatus }))}
                        options={[
                          { value: 'pending', label: 'Pending' },
                          { value: 'completed', label: 'Completed' },
                          { value: 'canceled', label: 'Canceled' },
                        ]}
                        buttonClassName="h-9"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Due Date</label>
                      <input
                        type="date"
                        value={form.dueDate}
                        onChange={(event) => setForm((state) => ({ ...state, dueDate: event.target.value }))}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Terms</label>
                      <input
                        type="text"
                        value={form.terms}
                        onChange={(event) => setForm((state) => ({ ...state, terms: event.target.value }))}
                        placeholder="Net 30"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Tax Rate (%)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.taxRate}
                        onChange={(event) => setForm((state) => ({ ...state, taxRate: event.target.value }))}
                        placeholder="0.00"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Shipping ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.shippingAmount}
                        onChange={(event) => setForm((state) => ({ ...state, shippingAmount: event.target.value }))}
                        placeholder="0.00"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                      <textarea
                        value={form.notes}
                        onChange={(event) => setForm((state) => ({ ...state, notes: event.target.value }))}
                        rows={2}
                        placeholder="Additional notes or payment instructions..."
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Second Page Content</label>
                      <textarea
                        value={form.secondPageContent}
                        onChange={(event) => setForm((state) => ({ ...state, secondPageContent: event.target.value }))}
                        rows={6}
                        placeholder="Content for the second page (terms, conditions, additional information, etc.)..."
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <p className="mt-1 text-xs text-slate-500">This content will appear on a separate page with the invoice header and barcode</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-xl border border-border bg-slate-50 p-4">
                    <h4 className="text-sm font-semibold text-slate-900 mb-3">Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between text-slate-700">
                        <span>Subtotal</span>
                        <span className="font-medium">{formatCurrency(summary.subtotal, form.currency)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700">
                        <span>Tax ({summary.taxRate || 0}%)</span>
                        <span className="font-medium">{formatCurrency(summary.taxAmount, form.currency)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700">
                        <span>Shipping</span>
                        <span className="font-medium">{formatCurrency(summary.shippingAmount, form.currency)}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
                        <span>Total</span>
                        <span>{formatCurrency(summary.total, form.currency)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 border-t border-border bg-white px-6 py-4 mt-6">
              <button
                type="button"
                onClick={handleCloseCreate}
                className="rounded-lg border border-slate-200 px-6 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateDocument}
                disabled={saving}
                className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? 'Creating...' : `Create ${createLabel}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPreviewModal && activeDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-10">
          <div className="max-h-full w-full max-w-4xl overflow-y-auto rounded-2xl border border-border bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {getDocumentLabel(activeDocument.documentType)} {activeDocument.documentNumber}
                </h3>
                <p className="text-sm text-muted">Created {formatDate(activeDocument.createdAt)}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPreviewModal(false);
                  setActiveDocument(null);
                }}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <StatusPill label={activeDocument.status} tone={getStatusTone(activeDocument.status)} />
              <span className="text-xs text-muted">Due {formatDate(activeDocument.dueDate)}</span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-slate-50/60 p-4">
                <h4 className="text-xs font-semibold text-slate-700">Bill To</h4>
                <div className="mt-2 space-y-1 text-sm text-slate-700">
                  <div className="font-semibold">
                    {activeDocument.billTo.companyName
                      ? `${activeDocument.billTo.companyName} - ${activeDocument.billTo.name}`
                      : activeDocument.billTo.name}
                  </div>
                  {(activeDocument.billTo.phone || activeDocument.billTo.email) && (
                    <div>
                      {[activeDocument.billTo.phone, activeDocument.billTo.email].filter(Boolean).join(' | ')}
                    </div>
                  )}
                  <div>{activeDocument.billTo.addressLine1}</div>
                  <div>
                    {[activeDocument.billTo.city, activeDocument.billTo.state, activeDocument.billTo.postalCode]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                  <div>{activeDocument.billTo.country}</div>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-slate-50/60 p-4">
                <h4 className="text-xs font-semibold text-slate-700">Ship To</h4>
                <div className="mt-2 space-y-1 text-sm text-slate-700">
                  <div className="font-semibold">
                    {activeDocument.shipTo.companyName
                      ? `${activeDocument.shipTo.companyName} - ${activeDocument.shipTo.name}`
                      : activeDocument.shipTo.name}
                  </div>
                  {(activeDocument.shipTo.phone || activeDocument.shipTo.email) && (
                    <div>
                      {[activeDocument.shipTo.phone, activeDocument.shipTo.email].filter(Boolean).join(' | ')}
                    </div>
                  )}
                  <div>{activeDocument.shipTo.addressLine1}</div>
                  <div>
                    {[activeDocument.shipTo.city, activeDocument.shipTo.state, activeDocument.shipTo.postalCode]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                  <div>{activeDocument.shipTo.country}</div>
                </div>
              </div>
            </div>

            <div className="mt-6 overflow-auto rounded-2xl border border-border">
              <table className="min-w-full divide-y divide-border text-left text-sm">
                <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Qty</th>
                    <th className="px-4 py-2 font-semibold">Item</th>
                    <th className="px-4 py-2 font-semibold text-right">Rate</th>
                    <th className="px-4 py-2 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-white">
                  {activeDocument.items.map((item, index) => (
                    <tr key={`${activeDocument.id}-${index}`}>
                      <td className="px-4 py-2 text-slate-700">{item.quantity}</td>
                      <td className="px-4 py-2">
                        <div className="font-medium text-slate-900">{item.name}</div>
                        {item.sku && <div className="text-xs text-muted">{item.sku}</div>}
                      </td>
                      <td className="px-4 py-2 text-right text-slate-700">
                        {formatCurrency(item.price, activeDocument.currency ?? 'USD')}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold text-slate-900">
                        {formatCurrency(item.price * item.quantity, activeDocument.currency ?? 'USD')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end">
              <div className="w-full max-w-sm rounded-2xl border border-border bg-slate-50/60 p-4 text-sm">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="text-muted">Subtotal</span>
                  <span>{formatCurrency(activeDocument.subtotal, activeDocument.currency ?? 'USD')}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-slate-700">
                  <span className="text-muted">Tax</span>
                  <span>{formatCurrency(activeDocument.taxAmount ?? 0, activeDocument.currency ?? 'USD')}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-slate-700">
                  <span className="text-muted">Shipping</span>
                  <span>{formatCurrency(activeDocument.shippingAmount ?? 0, activeDocument.currency ?? 'USD')}</span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-dashed border-slate-200 pt-3 text-base font-semibold text-slate-900">
                  <span>Total</span>
                  <span>{formatCurrency(activeDocument.total, activeDocument.currency ?? 'USD')}</span>
                </div>
              </div>
            </div>

            {activeDocument.notes && (
              <div className="mt-4 rounded-2xl border border-border bg-white p-4 text-sm text-slate-700">
                <div className="text-xs font-semibold text-muted">Notes</div>
                <p className="mt-2 whitespace-pre-wrap">{activeDocument.notes}</p>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => handleDownloadDocument(activeDocument)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPreviewModal(false);
                  setActiveDocument(null);
                }}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && documentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-white shadow-xl">
            <div className="border-b border-slate-200 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Delete {getDocumentLabel(documentToDelete.documentType)}</h3>
                  <p className="text-sm text-slate-600">This action cannot be undone</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <p className="text-sm text-slate-700">
                Are you sure you want to delete <span className="font-semibold">{getDocumentLabel(documentToDelete.documentType)} {documentToDelete.documentNumber}</span>?
                This will permanently remove it from your records.
              </p>
            </div>

            <div className="flex gap-3 border-t border-slate-200 p-6">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDocumentToDelete(null);
                }}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDeleteDocument()}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
