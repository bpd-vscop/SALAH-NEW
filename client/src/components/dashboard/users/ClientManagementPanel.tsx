import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersApi, type CreateUserPayload, type ListUsersParams, type UpdateUserPayload } from '../../../api/users';
import type { ClientType, User, UserRole } from '../../../types/api';
import type { ComposeClientRef, StatusSetter } from '../types';
import { StatusPill } from '../../common/StatusPill';
import { cn } from '../../../utils/cn';
import { PhoneNumberInput, type PhoneNumberInputValue } from '../../common/PhoneInput';
import { CountrySelect } from '../../common/CountrySelect';
import { BusinessTypeSelect } from '../../common/BusinessTypeSelect';
import { isBusinessTypeOption, type BusinessTypeOption } from '../../../data/businessTypes';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Download, Eye, EyeOff, Loader2, MessageSquare, Pencil, Search, Send, Trash2, X } from 'lucide-react';
import { PASSWORD_COMPLEXITY_MESSAGE, evaluatePasswordStrength, meetsPasswordPolicy } from '../../../utils/password';
import { Select } from '../../ui/Select';

interface ClientManagementPanelProps {
  role: UserRole;
  currentUserId: string;
  setStatus: StatusSetter;
}

type SortOption = 'recent' | 'name-asc' | 'name-desc';
type StatusFilter = 'all' | 'active' | 'inactive';
type TypeFilter = 'all' | ClientType;
type VerificationFilter = 'all' | 'verified' | 'pending';

interface ClientFormState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  status: User['status'];
  clientType: ClientType;
  companyName: string;
  companyPhone: string;
  companyAddress: string;
  companyCity: string;
  companyState: string;
  companyCountry: string;
  companyBusinessType: string;
  companyTaxId: string;
  companyWebsite: string;
}

const SORT_TO_QUERY: Record<SortOption, ListUsersParams['sort']> = {
  recent: 'recent',
  'name-asc': 'name-asc',
  'name-desc': 'name-desc',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const EMAIL_DOMAINS = [
  '@gmail.com',
  '@yahoo.com',
  '@outlook.com',
  '@hotmail.com',
  '@icloud.com',
  '@aol.com',
  '@protonmail.com',
  '@zoho.com',
  '@mail.com',
  '@yandex.com',
];

const US_STATES = [
  'Alabama',
  'Alaska',
  'Arizona',
  'Arkansas',
  'California',
  'Colorado',
  'Connecticut',
  'Delaware',
  'District of Columbia',
  'Florida',
  'Georgia',
  'Hawaii',
  'Idaho',
  'Illinois',
  'Indiana',
  'Iowa',
  'Kansas',
  'Kentucky',
  'Louisiana',
  'Maine',
  'Maryland',
  'Massachusetts',
  'Michigan',
  'Minnesota',
  'Mississippi',
  'Missouri',
  'Montana',
  'Nebraska',
  'Nevada',
  'New Hampshire',
  'New Jersey',
  'New Mexico',
  'New York',
  'North Carolina',
  'North Dakota',
  'Ohio',
  'Oklahoma',
  'Oregon',
  'Pennsylvania',
  'Rhode Island',
  'South Carolina',
  'South Dakota',
  'Tennessee',
  'Texas',
  'Utah',
  'Vermont',
  'Virginia',
  'Washington',
  'West Virginia',
  'Wisconsin',
  'Wyoming',
];

const buildEmptyForm = (): ClientFormState => ({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  status: 'active',
  clientType: 'C2B',
  companyName: '',
  companyPhone: '',
  companyAddress: '',
  companyCity: '',
  companyState: '',
  companyCountry: 'United States',
  companyBusinessType: '',
  companyTaxId: '',
  companyWebsite: '',
});

const toneForClientStatus = (status: User['status']) => (status === 'active' ? 'positive' : 'warning');
const toneForVerification = (isVerified?: boolean | null) => (isVerified ? 'positive' : 'warning');
const statusBadgeClasses = (status: User['status']) =>
  status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700';
const typeBadgeClasses = (clientType?: ClientType | null) =>
  clientType === 'B2B'
    ? 'bg-gradient-to-r from-[#f6b210] to-[#a00b0b]'
    : 'bg-gradient-to-r from-[#60a5fa] to-[#1d4ed8]';
const resolveUpdatedByLabel = (client: User) => {
  const role = client.accountUpdatedByRole ?? null;
  const name = client.accountUpdatedByName ?? null;
  const normalizedRole = role === 'super_admin' ? 'admin' : role;
  if (normalizedRole !== 'admin' && normalizedRole !== 'staff') {
    return '-';
  }
  const roleLabel = normalizedRole === 'admin' ? 'Admin' : 'Staff';
  if (name) {
    return `${name} (${roleLabel})`;
  }
  return roleLabel;
};

const formatShortTimestamp = (value?: string | null) => {
  if (!value) return '-';
  try {
    const date = new Date(value);
    const datePart = new Intl.DateTimeFormat('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit',
    }).format(date);
    const timePart = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
    return `${datePart} - ${timePart}`;
  } catch {
    return value;
  }
};

const deriveVerificationFilename = (client: User) => {
  const base = client.name?.trim() || client.email?.split('@')[0] || 'client';
  return `${base.replace(/\s+/g, '-').toLowerCase()}-verification-${client.id}`;
};

const resolveUploadsHref = (value?: string | null) => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('/uploads/')) {
    return trimmed;
  }
  return `/uploads/${trimmed.replace(/^\/+/, '')}`;
};

export const ClientManagementPanel: React.FC<ClientManagementPanelProps> = ({ role, currentUserId, setStatus }) => {
  void currentUserId;
  const navigate = useNavigate();
  const canManageClients = role === 'admin' || role === 'super_admin';

  const [records, setRecords] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [verificationFilter, setVerificationFilter] = useState<VerificationFilter>('all');
  const [sort, setSort] = useState<SortOption>('recent');
  const [form, setForm] = useState<ClientFormState>(() => buildEmptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<User | null>(null);
  const [sendingVerificationId, setSendingVerificationId] = useState<string | null>(null);
  const [phoneValue, setPhoneValue] = useState<PhoneNumberInputValue>({ countryCode: '+1', number: '' });
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [useCustomBusinessType, setUseCustomBusinessType] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formCollapsed, setFormCollapsed] = useState(true);
  const [emailSuggestion, setEmailSuggestion] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [reasonModal, setReasonModal] = useState<{
    mode: 'delete' | 'downgrade' | 'bulkDowngrade' | 'inactive' | 'bulkInactive';
    client?: User;
    context?: 'form' | 'table';
  } | null>(null);
  const [reasonInput, setReasonInput] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState<string | null>(null);
  const [clientTypeDowngradeId, setClientTypeDowngradeId] = useState<string | null>(null);
  const [clientTypeDowngradeReason, setClientTypeDowngradeReason] = useState<string | null>(null);
  const [statusChangeTargetId, setStatusChangeTargetId] = useState<string | null>(null);
  const [statusChangeReason, setStatusChangeReason] = useState<string | null>(null);
  const [statusMenuOpenId, setStatusMenuOpenId] = useState<string | null>(null);
  const [typeMenuOpenId, setTypeMenuOpenId] = useState<string | null>(null);
  const [rowActionId, setRowActionId] = useState<string | null>(null);
  const [documentPreview, setDocumentPreview] = useState<{ href: string; name: string } | null>(null);

  const passwordStrength = useMemo(() => evaluatePasswordStrength(form.password), [form.password]);
  const isFormVisible = !formCollapsed || Boolean(editingId);
  const isEditingB2B = Boolean(editingId && form.clientType === 'B2B');
  const showStepOne = !editingId ? formStep === 1 : !isEditingB2B || formStep === 1;
  const showStepTwo = !editingId ? formStep === 2 : isEditingB2B && formStep === 2;
  const isUnitedStates = [
    'united states',
    'united states of america'
  ].includes(form.companyCountry.trim().toLowerCase());
  const hideMetaColumns = isFormVisible;
  const tableColumnCount = hideMetaColumns ? 5 : 8;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadClients = useCallback(async () => {
    const params: ListUsersParams = {
      role: ['client'],
      sort: SORT_TO_QUERY[sort],
    };

    if (statusFilter !== 'all') {
      params.status = statusFilter;
    }

    if (typeFilter !== 'all') {
      params.clientType = typeFilter;
    }

    if (verificationFilter !== 'all') {
      params.emailVerified = verificationFilter === 'verified';
    }

    if (debouncedSearch) {
      params.search = debouncedSearch;
    }

    setLoading(true);
    setLocalError(null);
    try {
      const response = await usersApi.list(params);
      setRecords(response.users.filter((user) => user.role === 'client'));
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Failed to load clients';
      setLocalError(message);
      setStatus(null, message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, setStatus, sort, statusFilter, typeFilter, verificationFilter]);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  useEffect(() => {
    if (!selectionMode) {
      setSelectedClientIds(new Set());
      setBulkMenuOpen(false);
      return;
    }
    setSelectedClientIds((current) => {
      if (current.size === 0) return current;
      const recordIds = new Set(records.map((record) => record.id));
      const next = new Set<string>();
      current.forEach((id) => {
        if (recordIds.has(id)) {
          next.add(id);
        }
      });
      return next;
    });
  }, [records, selectionMode]);

  useEffect(() => {
    const handleDocClick = () => {
      setStatusMenuOpenId(null);
      setTypeMenuOpenId(null);
    };

    document.addEventListener('mousedown', handleDocClick);
    return () => {
      document.removeEventListener('mousedown', handleDocClick);
    };
  }, []);

  const editingClient = useMemo(
    () => (editingId ? records.find((record) => record.id === editingId) ?? null : null),
    [editingId, records]
  );

  const selectedClients = useMemo(
    () => records.filter((client) => selectedClientIds.has(client.id)),
    [records, selectedClientIds]
  );
  const selectedCount = selectedClientIds.size;
  const selectedWithEmail = selectedClients.filter((client) => Boolean(client.email)).length;
  const selectedB2BCount = selectedClients.filter((client) => client.clientType === 'B2B').length;

  const resetForm = (options?: { collapse?: boolean }) => {
    setEditingId(null);
    setForm(buildEmptyForm());
    setPhoneValue({ countryCode: '+1', number: '' });
    setFormStep(1);
    setUseCustomBusinessType(false);
    setFormError(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setEmailSuggestion('');
    setClientTypeDowngradeId(null);
    setClientTypeDowngradeReason(null);
    setStatusChangeTargetId(null);
    setStatusChangeReason(null);
    if (options?.collapse) {
      setFormCollapsed(true);
    }
  };

  const handleEdit = (client: User) => {
    setEditingId(client.id);
    const [firstName = '', lastName = ''] = (client.name ?? '').split(/\s+/, 2);
    setForm({
      firstName,
      lastName,
      email: client.email ?? '',
      password: '',
      confirmPassword: '',
      status: client.status,
      clientType: client.clientType ?? 'C2B',
      companyName: client.company?.name ?? '',
      companyPhone: client.company?.phone ?? '',
      companyAddress: client.company?.address ?? '',
      companyCity: '',
      companyState: '',
      companyCountry: 'United States',
      companyBusinessType: client.company?.businessType ?? '',
      companyTaxId: client.company?.taxId ?? '',
      companyWebsite: client.company?.website ?? '',
    });
    setPhoneValue({
      countryCode: client.phoneCode ?? '+1',
      number: client.phoneNumber ?? '',
    });
    setUseCustomBusinessType(
      !!client.company?.businessType && !isBusinessTypeOption(client.company.businessType)
    );
    setFormError(null);
    setFormStep(1);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setFormCollapsed(false);
    setEmailSuggestion('');
    setClientTypeDowngradeId(null);
    setClientTypeDowngradeReason(null);
    setStatusChangeTargetId(null);
    setStatusChangeReason(null);
  };

  const buildComposeClient = (client: User): ComposeClientRef | null => {
    const email = client.email ?? null;
    if (!client.id || !email) return null;
    return {
      id: client.id,
      name: client.name ?? null,
      email,
      clientType: client.clientType ?? null,
    };
  };

  const toggleSelectionMode = () => {
    setSelectionMode((prev) => !prev);
    setSelectedClientIds(new Set());
    setBulkMenuOpen(false);
  };

  const toggleClientSelection = (clientId: string) => {
    setSelectedClientIds((current) => {
      const next = new Set(current);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  };

  const toggleTypeMenu = (clientId: string) => {
    setTypeMenuOpenId((prev) => (prev === clientId ? null : clientId));
    setStatusMenuOpenId(null);
    setBulkMenuOpen(false);
  };

  const toggleStatusMenu = (clientId: string) => {
    setStatusMenuOpenId((prev) => (prev === clientId ? null : clientId));
    setTypeMenuOpenId(null);
    setBulkMenuOpen(false);
  };

  const openReasonPrompt = (
    mode: 'delete' | 'downgrade' | 'bulkDowngrade' | 'inactive' | 'bulkInactive',
    client?: User,
    context?: 'form' | 'table'
  ) => {
    setReasonInput('');
    setReasonError(null);
    setBulkMenuOpen(false);
    setStatusMenuOpenId(null);
    setTypeMenuOpenId(null);
    setReasonModal({ mode, client, context });
  };

  const handleReasonConfirm = async () => {
    const trimmed = reasonInput.trim();
    if (!trimmed) {
      setReasonError('Reason is required');
      return;
    }
    if (!reasonModal) return;

    if (reasonModal.mode === 'delete') {
      if (!reasonModal.client) return;
      setDeleteReason(trimmed);
      setPendingDelete(reasonModal.client);
      setReasonModal(null);
      return;
    }

    if (reasonModal.mode === 'downgrade') {
      if (!reasonModal.client) return;
      if (reasonModal.context === 'form') {
        setClientTypeDowngradeId(reasonModal.client.id);
        setClientTypeDowngradeReason(trimmed);
        setForm((prev) => ({
          ...prev,
          clientType: 'C2B',
          companyName: '',
          companyPhone: '',
          companyAddress: '',
          companyCity: '',
          companyState: '',
          companyCountry: 'United States',
          companyBusinessType: '',
          companyTaxId: '',
          companyWebsite: '',
        }));
        setUseCustomBusinessType(false);
        setReasonModal(null);
        return;
      }
      setReasonModal(null);
      await handleQuickDowngrade(reasonModal.client, trimmed);
      return;
    }

    if (reasonModal.mode === 'bulkDowngrade') {
      setReasonModal(null);
      await handleBulkChangeToC2B(trimmed);
      return;
    }

    if (reasonModal.mode === 'inactive') {
      if (!reasonModal.client) return;
      if (reasonModal.context === 'form') {
        setStatusChangeTargetId(reasonModal.client.id);
        setStatusChangeReason(trimmed);
        setForm((prev) => ({ ...prev, status: 'inactive' }));
        setReasonModal(null);
        return;
      }
      setReasonModal(null);
      await handleQuickStatusChange(reasonModal.client, 'inactive', trimmed);
      return;
    }

    if (reasonModal.mode === 'bulkInactive') {
      setReasonModal(null);
      await handleBulkStatusUpdate('inactive', trimmed);
    }
  };

  const handleBusinessTypePresetSelect = (option: BusinessTypeOption) => {
    setUseCustomBusinessType(false);
    setForm((prev) => ({ ...prev, companyBusinessType: option }));
  };

  const handleEnableCustomBusinessType = () => {
    setUseCustomBusinessType(true);
    setForm((prev) => ({ ...prev, companyBusinessType: '' }));
  };

  const handleCustomBusinessTypeChange = (value: string) => {
    setForm((prev) => ({ ...prev, companyBusinessType: value }));
  };

  const handleEmailChange = (value: string) => {
    const lowerValue = value.toLowerCase();
    setForm((prev) => ({ ...prev, email: lowerValue }));

    if (!lowerValue) {
      setEmailSuggestion('');
    } else if (!lowerValue.includes('@')) {
      setEmailSuggestion(`${lowerValue}@gmail.com`);
    } else if (!lowerValue.includes('.')) {
      const afterAt = lowerValue.split('@')[1] || '';
      const suggestion = EMAIL_DOMAINS.find((domain) =>
        domain.toLowerCase().startsWith(`@${afterAt.toLowerCase()}`)
      );
      if (suggestion) {
        setEmailSuggestion(`${lowerValue.split('@')[0]}${suggestion}`);
      } else {
        setEmailSuggestion('');
      }
    } else {
      setEmailSuggestion('');
    }
  };

  const handleEmailKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Tab' && emailSuggestion) {
      event.preventDefault();
      setForm((prev) => ({ ...prev, email: emailSuggestion }));
      setEmailSuggestion('');
    }
  };

  const validateEmail = (value: string) => {
    if (!value) {
      return true;
    }
    return EMAIL_REGEX.test(value);
  };

  const ensureBasicsValid = (requirePassword: boolean) => {
    const trimmedEmail = form.email.trim();
    if (!validateEmail(trimmedEmail)) {
      setFormError('Enter a valid email address');
      return null;
    }

    const trimmedFirstName = form.firstName.trim();
    if (!trimmedFirstName) {
      setFormError('First name is required');
      return null;
    }
    if (trimmedFirstName.length < 2) {
      setFormError('First name must be at least 2 characters');
      return null;
    }

    const trimmedLastName = form.lastName.trim();
    if (!trimmedLastName) {
      setFormError('Last name is required');
      return null;
    }
    if (trimmedLastName.length < 2) {
      setFormError('Last name must be at least 2 characters');
      return null;
    }

    const trimmedFullName = `${trimmedFirstName} ${trimmedLastName}`.trim();

    const trimmedPassword = form.password.trim();
    const trimmedConfirmPassword = form.confirmPassword.trim();

    if (requirePassword) {
      if (!trimmedPassword) {
        setFormError('Password is required');
        return null;
      }
      if (trimmedPassword !== trimmedConfirmPassword) {
        setFormError('Passwords do not match');
        return null;
      }
      if (!meetsPasswordPolicy(trimmedPassword)) {
        setFormError(PASSWORD_COMPLEXITY_MESSAGE);
        return null;
      }
    } else if (trimmedPassword || trimmedConfirmPassword) {
      if (trimmedPassword !== trimmedConfirmPassword) {
        setFormError('Passwords do not match');
        return null;
      }
      if (!meetsPasswordPolicy(trimmedPassword)) {
        setFormError(PASSWORD_COMPLEXITY_MESSAGE);
        return null;
      }
    }

    return { trimmedEmail, trimmedFullName, trimmedPassword };
  };

  const handleAdvanceToCompanyDetails = (requirePassword: boolean) => {
    setFormError(null);
    const basics = ensureBasicsValid(requirePassword);
    if (!basics) {
      return;
    }
    setFormStep(2);
  };

  const handleStartCreate = () => {
    resetForm();
    setFormCollapsed(false);
  };

  const handleDownloadCsv = () => {
    const headers = [
      'ID',
      'First Name',
      'Last Name',
      'Email',
      'Status',
      'Client Type',
      'Phone Code',
      'Phone Number',
      'Company Name',
      'Company Phone',
      'Company Address',
      'Company Business Type',
      'Company Tax ID',
      'Company Website',
      'Account Created',
      'Account Updated',
      'Email Verified',
    ];

    const escapeCsvValue = (value: unknown) => {
      if (value === null || value === undefined) {
        return '';
      }
      return String(value).replace(/"/g, '""');
    };

    const rows = records.map((client) => {
      const nameParts = (client.name ?? '').trim().split(/\s+/);
      const firstName = nameParts.shift() ?? '';
      const lastName = nameParts.join(' ');
      return [
        client.id ?? '',
        firstName,
        lastName,
        client.email ?? '',
        client.status === 'active' ? 'Active' : 'Inactive',
        client.clientType ?? 'C2B',
        client.phoneCode ?? '',
        client.phoneNumber ?? '',
        client.company?.name ?? '',
        client.company?.phone ?? '',
        client.company?.address ?? '',
        client.company?.businessType ?? '',
        client.company?.taxId ?? '',
        client.company?.website ?? '',
        client.accountCreated ?? '',
        client.accountUpdated ?? '',
        client.isEmailVerified ? 'Yes' : 'No',
      ];
    });

    const csvLines = [headers, ...rows].map((row) =>
      row.map((value) => `"${escapeCsvValue(value)}"`).join(',')
    );

    const csvContent = csvLines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.download = `clients-${dateStamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 0);
    setStatus('Client CSV downloaded');
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    setFormError(null);

    const basics = ensureBasicsValid(!editingId);

    if (!basics) {
      return;
    }

    const { trimmedEmail, trimmedFullName, trimmedPassword } = basics;
    const trimmedPhoneCode = phoneValue.countryCode.trim();
    const trimmedPhoneNumber = phoneValue.number.trim();
    const trimmedCompanyName = form.companyName.trim();
    const trimmedCompanyPhone = form.companyPhone.trim();
    const trimmedCompanyAddressLine = form.companyAddress.trim();
    const trimmedCompanyCity = form.companyCity.trim();
    const trimmedCompanyState = form.companyState.trim();
    const trimmedCompanyCountry = form.companyCountry.trim();
    const formattedCompanyAddress = trimmedCompanyAddressLine && trimmedCompanyCity && trimmedCompanyState && trimmedCompanyCountry
      ? `${trimmedCompanyAddressLine}, ${trimmedCompanyCity}, ${trimmedCompanyState}, ${trimmedCompanyCountry}`
      : trimmedCompanyAddressLine;
    const trimmedCompanyBusinessType = form.companyBusinessType.trim();
    const trimmedCompanyTaxId = form.companyTaxId.trim();
    const trimmedCompanyWebsite = form.companyWebsite.trim();

    if (!editingId && form.clientType === 'B2B') {
      if (!trimmedCompanyAddressLine || !trimmedCompanyCity || !trimmedCompanyState || !trimmedCompanyCountry) {
        setFormError('Company address, country, state, and city are required for B2B clients.');
        return;
      }
    }

    try {
      setSubmitting(true);

      if (!editingId) {
        if (!canManageClients) {
          throw forbiddenError();
        }

        const createPayload: CreateUserPayload = {
          role: 'client',
          status: form.status,
          clientType: form.clientType,
          name: trimmedFullName,
          password: trimmedPassword,
        };

        if (trimmedEmail) {
          createPayload.email = trimmedEmail.toLowerCase();
        }
        if (trimmedPhoneNumber) {
          createPayload.phoneNumber = trimmedPhoneNumber;
          if (trimmedPhoneCode) {
            createPayload.phoneCode = trimmedPhoneCode;
          }
        }

        const { user } = await usersApi.create(createPayload);

        const detailsPayload: UpdateUserPayload = {
          name: trimmedFullName,
          fullName: trimmedFullName,
        };
        if (trimmedPhoneNumber) {
          detailsPayload.phoneNumber = trimmedPhoneNumber;
          detailsPayload.phoneCode = trimmedPhoneCode || '+1';
        }
        if (trimmedCompanyName) {
          detailsPayload.companyName = trimmedCompanyName;
        }
        if (trimmedCompanyPhone) {
          detailsPayload.companyPhone = trimmedCompanyPhone;
        }
        if (formattedCompanyAddress) {
          detailsPayload.companyAddress = formattedCompanyAddress;
        }
        if (trimmedCompanyBusinessType) {
          detailsPayload.companyBusinessType = trimmedCompanyBusinessType;
        }
        if (trimmedCompanyTaxId) {
          detailsPayload.companyTaxId = trimmedCompanyTaxId;
        }
        if (trimmedCompanyWebsite) {
          detailsPayload.companyWebsite = trimmedCompanyWebsite;
        }

        if (Object.keys(detailsPayload).length > 0) {
          await usersApi.update(user.id, detailsPayload);
        }

        setStatus('Client record created');
        resetForm({ collapse: true });
        await loadClients();
        return;
      }

      const hasPhone = Boolean(trimmedPhoneNumber);
      const isDowngradingToC2B =
        editingClient?.clientType === 'B2B' && form.clientType === 'C2B';
      const downgradeReason =
        clientTypeDowngradeId === editingId ? clientTypeDowngradeReason?.trim() : null;
      const isInactivating =
        editingClient?.status !== 'inactive' && form.status === 'inactive';
      const statusReason =
        statusChangeTargetId === editingId ? statusChangeReason?.trim() : null;

      if (isDowngradingToC2B && !downgradeReason) {
        setFormError('Reason is required to change a B2B client to C2B');
        return;
      }
      if (isInactivating && !statusReason) {
        setFormError('Reason is required to set this account inactive');
        return;
      }

      const updatePayload: UpdateUserPayload = {
        status: form.status,
        clientType: form.clientType,
        phoneCode: hasPhone ? trimmedPhoneCode || '+1' : null,
        phoneNumber: hasPhone ? trimmedPhoneNumber : null,
        companyName: trimmedCompanyName || null,
        companyPhone: trimmedCompanyPhone || null,
        companyAddress: formattedCompanyAddress || null,
        companyBusinessType: trimmedCompanyBusinessType || null,
        companyTaxId: trimmedCompanyTaxId || null,
        companyWebsite: trimmedCompanyWebsite || null,
      };

      if (isDowngradingToC2B && downgradeReason) {
        updatePayload.clientTypeChangeReason = downgradeReason;
        updatePayload.companyName = null;
        updatePayload.companyPhone = null;
        updatePayload.companyAddress = null;
        updatePayload.companyBusinessType = null;
        updatePayload.companyTaxId = null;
        updatePayload.companyWebsite = null;
      }
      if (isInactivating && statusReason) {
        updatePayload.statusChangeReason = statusReason;
      }

      updatePayload.name = trimmedFullName;
      updatePayload.fullName = trimmedFullName;
      if (trimmedEmail) {
        updatePayload.email = trimmedEmail.toLowerCase();
      }
      if (trimmedPassword) {
        updatePayload.password = trimmedPassword;
      }

      await usersApi.update(editingId, updatePayload);
      setStatus('Client details updated');
      resetForm({ collapse: true });
      await loadClients();
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Unable to save client';
      setFormError(message === 'FORBIDDEN' ? 'You do not have permission to manage clients.' : message);
      if (message !== 'FORBIDDEN') {
        setStatus(null, message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, reason: string | null) => {
    if (!canManageClients) {
      setStatus(null, 'You do not have permission to remove clients');
      return;
    }
    setDeletingId(id);
    try {
      await usersApi.delete(id, reason ? { reason } : undefined);
      setStatus('Client removed');
      if (editingId === id) {
        resetForm({ collapse: true });
      }
      await loadClients();
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Unable to delete client';
      setStatus(null, message);
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
      setDeleteReason(null);
    }
  };

  const handleSendVerification = async (client: User) => {
    if (!canManageClients) {
      setStatus(null, 'You do not have permission to send verification emails');
      return;
    }
    if (!client.email) {
      setStatus(null, 'Client does not have an email address');
      return;
    }
    setSendingVerificationId(client.id);
    try {
      const response = await usersApi.sendVerification(client.id);
      const baseMessage = response.message || (response.alreadyVerified ? 'Email is already verified' : 'Verification email sent');
      const fullMessage = response.previewCode ? `${baseMessage} (code: ${response.previewCode})` : baseMessage;
      setStatus(fullMessage);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Unable to send verification email';
      setStatus(null, message);
    } finally {
      setSendingVerificationId(null);
    }
  };

  const handleMessageClient = (client: User) => {
    const compose = buildComposeClient(client);
    if (!compose) {
      setStatus(null, 'Client does not have an email address');
      return;
    }
    navigate('/admin', { state: { active: 'messages', openCompose: true, preselectedClients: [compose] } });
  };

  const handleBulkMessage = () => {
    if (selectedClients.length === 0) {
      setStatus(null, 'Select at least one client to message');
      return;
    }
    const composeClients = selectedClients
      .map(buildComposeClient)
      .filter((client): client is ComposeClientRef => Boolean(client));
    if (composeClients.length === 0) {
      setStatus(null, 'Selected clients do not have email addresses');
      return;
    }
    navigate('/admin', { state: { active: 'messages', openCompose: true, preselectedClients: composeClients } });
    setBulkMenuOpen(false);
  };

  const handleBulkSendVerification = async () => {
    if (!canManageClients) {
      setStatus(null, 'You do not have permission to send verification emails');
      return;
    }
    if (selectedClients.length === 0) {
      setStatus(null, 'Select at least one client');
      return;
    }

    const targets = selectedClients.filter((client) => client.email);
    if (targets.length === 0) {
      setStatus(null, 'Selected clients do not have email addresses');
      return;
    }

    setBulkActionLoading(true);
    let sent = 0;
    let failed = 0;
    const skipped = selectedClients.length - targets.length;
    try {
      for (const client of targets) {
        try {
          await usersApi.sendVerification(client.id);
          sent += 1;
        } catch (error) {
          console.error(error);
          failed += 1;
        }
      }
      const parts = [`Sent ${sent} verification email${sent === 1 ? '' : 's'}`];
      if (skipped > 0) parts.push(`${skipped} skipped`);
      if (failed > 0) parts.push(`${failed} failed`);
      setStatus(parts.join(' | '));
    } finally {
      setBulkActionLoading(false);
      setBulkMenuOpen(false);
    }
  };

  const handleBulkDeselect = () => {
    setSelectedClientIds(new Set());
    setSelectionMode(false);
    setBulkMenuOpen(false);
  };

  const handleBulkChangeToC2B = async (reason: string) => {
    if (!canManageClients) {
      setStatus(null, 'You do not have permission to change client types');
      return;
    }

    const targets = selectedClients.filter((client) => client.clientType === 'B2B');
    if (targets.length === 0) {
      setStatus(null, 'Select at least one B2B client to change');
      return;
    }

    setBulkActionLoading(true);
    try {
      for (const client of targets) {
        await usersApi.update(client.id, {
          clientType: 'C2B',
          clientTypeChangeReason: reason,
          companyName: null,
          companyPhone: null,
          companyAddress: null,
          companyBusinessType: null,
          companyTaxId: null,
          companyWebsite: null,
        });
      }
      await loadClients();
      setStatus(`Updated ${targets.length} client${targets.length === 1 ? '' : 's'} to C2B`);
      setSelectedClientIds(new Set());
      setSelectionMode(false);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Unable to update client types';
      setStatus(null, message);
    } finally {
      setBulkActionLoading(false);
      setBulkMenuOpen(false);
    }
  };

  const handleQuickDowngrade = async (client: User, reason: string) => {
    if (!canManageClients) {
      setStatus(null, 'You do not have permission to change client types');
      return;
    }
    if (client.clientType !== 'B2B') {
      setStatus('Client is already C2B');
      return;
    }
    setRowActionId(client.id);
    try {
      await usersApi.update(client.id, {
        clientType: 'C2B',
        clientTypeChangeReason: reason,
        companyName: null,
        companyPhone: null,
        companyAddress: null,
        companyBusinessType: null,
        companyTaxId: null,
        companyWebsite: null,
      });
      await loadClients();
      setStatus(`Updated ${client.name || client.email || 'client'} to C2B`);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Unable to update client type';
      setStatus(null, message);
    } finally {
      setRowActionId(null);
      setTypeMenuOpenId(null);
    }
  };

  const handleQuickStatusChange = async (
    client: User,
    nextStatus: User['status'],
    reason?: string
  ) => {
    if (!canManageClients) {
      setStatus(null, 'You do not have permission to change client status');
      return;
    }
    if (client.status === nextStatus) {
      setStatus(`Client is already ${nextStatus}`);
      return;
    }
    if (nextStatus === 'inactive' && !reason) {
      setStatus(null, 'Reason is required to set this account inactive');
      return;
    }

    setRowActionId(client.id);
    try {
      const payload: UpdateUserPayload = { status: nextStatus };
      if (nextStatus === 'inactive' && reason) {
        payload.statusChangeReason = reason;
      }
      await usersApi.update(client.id, payload);
      await loadClients();
      setStatus(`Client marked ${nextStatus}`);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Unable to update client status';
      setStatus(null, message);
    } finally {
      setRowActionId(null);
      setStatusMenuOpenId(null);
    }
  };

  const handleBulkStatusUpdate = async (nextStatus: User['status'], reason?: string) => {
    if (!canManageClients) {
      setStatus(null, 'You do not have permission to change client status');
      return;
    }
    if (selectedClients.length === 0) {
      setStatus(null, 'Select at least one client');
      return;
    }
    if (nextStatus === 'inactive' && !reason) {
      setStatus(null, 'Reason is required to set accounts inactive');
      return;
    }

    const targets = selectedClients.filter((client) => client.status !== nextStatus);
    if (targets.length === 0) {
      setStatus(`Selected clients are already ${nextStatus}`);
      return;
    }

    setBulkActionLoading(true);
    try {
      for (const client of targets) {
        const payload: UpdateUserPayload = { status: nextStatus };
        if (nextStatus === 'inactive' && reason) {
          payload.statusChangeReason = reason;
        }
        await usersApi.update(client.id, payload);
      }
      await loadClients();
      setStatus(`Updated ${targets.length} client${targets.length === 1 ? '' : 's'} to ${nextStatus}`);
      setSelectedClientIds(new Set());
      setSelectionMode(false);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Unable to update client status';
      setStatus(null, message);
    } finally {
      setBulkActionLoading(false);
      setBulkMenuOpen(false);
    }
  };

  const reasonTargetLabel = reasonModal?.client?.name || reasonModal?.client?.email || reasonModal?.client?.id || '';
  const reasonTitle =
    reasonModal?.mode === 'delete'
      ? 'Delete client'
      : reasonModal?.mode === 'downgrade'
        ? 'Change client type to C2B'
        : reasonModal?.mode === 'inactive'
          ? 'Set account inactive'
          : reasonModal?.mode === 'bulkInactive'
            ? 'Set selected clients inactive'
            : 'Change selected clients to C2B';
  const reasonDescription =
    reasonModal?.mode === 'delete'
      ? `Provide a reason for deleting ${reasonTargetLabel || 'this client'}. The reason will be included in the email.`
      : reasonModal?.mode === 'downgrade'
        ? `Provide a reason for changing ${reasonTargetLabel || 'this client'} back to C2B. The reason will be included in the email.`
        : reasonModal?.mode === 'inactive'
          ? `Provide a reason for setting ${reasonTargetLabel || 'this client'} to inactive. The reason will be included in the email.`
          : reasonModal?.mode === 'bulkInactive'
            ? 'Provide a reason for setting the selected clients to inactive. The reason will be included in the email.'
            : 'Provide a reason for changing the selected clients back to C2B. The reason will be included in the email.';
  const reasonActionLabel =
    reasonModal?.mode === 'delete'
      ? 'Continue'
      : reasonModal?.mode === 'inactive' || reasonModal?.mode === 'bulkInactive'
        ? 'Set inactive'
        : 'Confirm change';

  return (
    <section className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Registered clients</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="inline-flex items-center justify-center rounded-xl border border-primary/40 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading || records.length === 0}
          >
            Download CSV
          </button>
          <button
            type="button"
            onClick={handleStartCreate}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!canManageClients}
          >
            New client
          </button>
        </div>
      </div>

      {localError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {localError}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSort('recent')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition',
              sort === 'recent' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            Recent
          </button>
          <button
            type="button"
            onClick={() => setSort('name-asc')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition',
              sort === 'name-asc' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            A-Z
          </button>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative">
            {!selectionMode ? (
              <button
                type="button"
                onClick={toggleSelectionMode}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary"
              >
                Select
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setBulkMenuOpen((prev) => !prev)}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary"
                >
                  {selectedCount > 0 ? `Selected ${selectedCount}` : 'Actions'}
                  <ChevronDown className="h-4 w-4" />
                </button>
                {bulkMenuOpen && (
                  <div className="absolute left-0 top-[calc(100%+0.5rem)] z-20 w-56 rounded-xl border border-border bg-white shadow-lg">
                    <button
                      type="button"
                      onClick={handleBulkDeselect}
                      className="flex w-full items-center px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      Deselect all
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleBulkSendVerification()}
                      disabled={bulkActionLoading || selectedWithEmail === 0}
                      className={cn(
                        'flex w-full items-center px-4 py-2 text-sm',
                        bulkActionLoading || selectedWithEmail === 0
                          ? 'cursor-not-allowed text-slate-400'
                          : 'text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      Send verification
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleBulkStatusUpdate('active')}
                      disabled={bulkActionLoading || selectedCount === 0}
                      className={cn(
                        'flex w-full items-center px-4 py-2 text-sm',
                        bulkActionLoading || selectedCount === 0
                          ? 'cursor-not-allowed text-slate-400'
                          : 'text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      Set active
                    </button>
                    <button
                      type="button"
                      onClick={() => openReasonPrompt('bulkInactive')}
                      disabled={bulkActionLoading || selectedCount === 0}
                      className={cn(
                        'flex w-full items-center px-4 py-2 text-sm',
                        bulkActionLoading || selectedCount === 0
                          ? 'cursor-not-allowed text-slate-400'
                          : 'text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      Set inactive
                    </button>
                    <button
                      type="button"
                      onClick={() => openReasonPrompt('bulkDowngrade')}
                      disabled={bulkActionLoading || selectedB2BCount === 0}
                      className={cn(
                        'flex w-full items-center px-4 py-2 text-sm',
                        bulkActionLoading || selectedB2BCount === 0
                          ? 'cursor-not-allowed text-slate-400'
                          : 'text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      Change to C2B
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkMessage}
                      disabled={selectedWithEmail === 0}
                      className={cn(
                        'flex w-full items-center px-4 py-2 text-sm',
                        selectedWithEmail === 0
                          ? 'cursor-not-allowed text-slate-400'
                          : 'text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      Message them
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
          <Select
            value={typeFilter}
            onChange={(value) => setTypeFilter(value as TypeFilter)}
            options={[
              { value: 'all', label: 'Type' },
              { value: 'B2B', label: 'B2B' },
              { value: 'C2B', label: 'C2B' },
            ]}
            placeholder="Type"
            className="min-w-[120px]"
          />
          <Select
            value={verificationFilter}
            onChange={(value) => setVerificationFilter(value as VerificationFilter)}
            options={[
              { value: 'all', label: 'Verification' },
              { value: 'verified', label: 'Verified' },
              { value: 'pending', label: 'Awaiting verification' },
            ]}
            placeholder="Verification"
            className="min-w-[150px]"
          />
          <Select
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as StatusFilter)}
            options={[
              { value: 'all', label: 'Status' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
            placeholder="Status"
            className="min-w-[120px]"
          />
          <div className="relative w-full sm:w-auto">
            <motion.div
              animate={{ width: searchOpen ? 300 : 40 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <AnimatePresence mode="wait">
                {searchOpen ? (
                  <motion.div
                    key="search-input"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="relative"
                  >
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                      placeholder="Search by name or email"
                      className="h-10 w-full rounded-xl border border-border bg-white pl-9 pr-9 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    {searchInput && (
                      <button
                        type="button"
                        onClick={() => setSearchInput('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        aria-label="Clear search"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </motion.div>
                ) : (
                  <motion.button
                    key="search-icon"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    type="button"
                    className="h-10 w-10 flex items-center justify-center rounded-xl border border-border bg-white text-slate-600 hover:bg-slate-100"
                    onClick={() => setSearchOpen(true)}
                    aria-label="Open search"
                  >
                    <Search className="h-4 w-4" />
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>

      <div
        className={cn(
          'grid gap-6 items-start',
          isFormVisible ? 'xl:grid-cols-[minmax(0,1fr)_480px]' : 'xl:grid-cols-[minmax(0,1fr)]'
        )}
      >
        {/* Table Section */}
        <div className="flex flex-col gap-3">
          {/* Table */}
          <div className="max-h-[600px] overflow-auto rounded-2xl border border-border bg-background">
            <table className="min-w-full divide-y divide-border text-left text-sm">
              <thead className="sticky top-0 z-10 bg-background text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Verification</th>
                  {!hideMetaColumns && <th className="px-4 py-3 font-semibold">Created</th>}
                  {!hideMetaColumns && <th className="px-4 py-3 font-semibold">Updated</th>}
                  <th className="px-4 py-3 font-semibold">Documents</th>
                  {!hideMetaColumns && <th className="px-4 py-3 text-right font-semibold">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {loading && (
                  <tr>
                    <td colSpan={tableColumnCount} className="px-4 py-6 text-center text-sm text-muted">
                      Loading clients...
                    </td>
                  </tr>
                )}
                {!loading && records.length === 0 && (
                  <tr>
                    <td colSpan={tableColumnCount} className="px-4 py-6 text-center text-sm text-muted">
                      No clients found.
                    </td>
                  </tr>
                )}
                {!loading &&
                  records.map((client) => {
                    const isEditing = editingId === client.id;
                    const verificationHref = resolveUploadsHref(client.verificationFileUrl);
                    return (
                      <tr
                        key={client.id}
                        className={cn('transition hover:bg-primary/5', isEditing && 'bg-primary/10')}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-3">
                            {selectionMode && (
                              <input
                                type="checkbox"
                                checked={selectedClientIds.has(client.id)}
                                onChange={() => toggleClientSelection(client.id)}
                                className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary/40"
                                aria-label={`Select ${client.name || client.email || 'client'}`}
                              />
                            )}
                            <div>
                              <div className="font-medium text-slate-900">{client.name || '-'}</div>
                              <div className="text-xs text-slate-500">{client.email || 'Email not set'}</div>
                              {client.company?.name && (
                                <div className="text-xs text-slate-400">{client.company.name}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {client.clientType === 'B2B' && canManageClients ? (
                            <div className="relative inline-flex" onMouseDown={(event) => event.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => toggleTypeMenu(client.id)}
                                disabled={rowActionId === client.id}
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-white shadow-sm transition',
                                  typeBadgeClasses(client.clientType),
                                  rowActionId === client.id
                                    ? 'cursor-not-allowed opacity-70'
                                    : 'hover:opacity-90'
                                )}
                              >
                                {client.clientType}
                                <ChevronDown className="h-3 w-3" />
                              </button>
                              {typeMenuOpenId === client.id && (
                                <div className="absolute left-0 top-full z-20 mt-1 w-40 rounded-xl border border-border bg-white shadow-lg">
                                  <button
                                    type="button"
                                    onClick={() => openReasonPrompt('downgrade', client, 'table')}
                                    disabled={rowActionId === client.id}
                                    className={cn(
                                      'flex w-full items-center px-4 py-2 text-sm',
                                      rowActionId === client.id
                                        ? 'cursor-not-allowed text-slate-400'
                                        : 'text-slate-700 hover:bg-slate-50'
                                    )}
                                  >
                                    Change to C2B
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span
                              className={cn(
                                'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white shadow-sm',
                                typeBadgeClasses(client.clientType ?? 'C2B')
                              )}
                            >
                              {client.clientType ?? 'C2B'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {canManageClients ? (
                            <div className="relative inline-flex" onMouseDown={(event) => event.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => toggleStatusMenu(client.id)}
                                disabled={rowActionId === client.id}
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition',
                                  statusBadgeClasses(client.status),
                                  rowActionId === client.id
                                    ? 'cursor-not-allowed opacity-70'
                                    : 'hover:opacity-90'
                                )}
                              >
                                {client.status === 'active' ? 'Active' : 'Inactive'}
                                <ChevronDown className="h-3 w-3" />
                              </button>
                              {statusMenuOpenId === client.id && (
                                <div className="absolute left-0 top-full z-20 mt-1 w-36 rounded-xl border border-border bg-white shadow-lg">
                                  <button
                                    type="button"
                                    onClick={() => void handleQuickStatusChange(client, 'active')}
                                    disabled={client.status === 'active' || rowActionId === client.id}
                                    className={cn(
                                      'flex w-full items-center px-4 py-2 text-sm',
                                      client.status === 'active' || rowActionId === client.id
                                        ? 'cursor-not-allowed text-slate-400'
                                        : 'text-slate-700 hover:bg-slate-50'
                                    )}
                                  >
                                    Active
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openReasonPrompt('inactive', client, 'table')}
                                    disabled={client.status === 'inactive' || rowActionId === client.id}
                                    className={cn(
                                      'flex w-full items-center px-4 py-2 text-sm',
                                      client.status === 'inactive' || rowActionId === client.id
                                        ? 'cursor-not-allowed text-slate-400'
                                        : 'text-slate-700 hover:bg-slate-50'
                                    )}
                                  >
                                    Inactive
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <StatusPill
                              label={client.status === 'active' ? 'Active' : 'Inactive'}
                              tone={toneForClientStatus(client.status)}
                            />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill label={client.isEmailVerified ? 'Verified' : 'Pending'} tone={toneForVerification(client.isEmailVerified)} />
                        </td>
                        {!hideMetaColumns && (
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {formatShortTimestamp(client.accountCreated)}
                          </td>
                        )}
                        {!hideMetaColumns && (
                          <td className="px-4 py-3 text-xs text-slate-500">
                            <div className="flex flex-col gap-1">
                              <span>{formatShortTimestamp(client.accountUpdated ?? client.accountCreated)}</span>
                              <span className="text-[10px] text-slate-400">
                                {resolveUpdatedByLabel(client)}
                              </span>
                            </div>
                          </td>
                        )}
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {verificationHref ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setDocumentPreview({
                                    href: verificationHref,
                                    name: client.name || client.email || deriveVerificationFilename(client),
                                  })
                                }
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-white text-slate-600 transition hover:border-primary hover:text-primary"
                                title="View document"
                                aria-label="View document"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <a
                                href={verificationHref}
                                download={`${deriveVerificationFilename(client)}`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-white text-slate-600 transition hover:border-primary hover:text-primary"
                                title="Download document"
                                aria-label="Download document"
                              >
                                <Download className="h-4 w-4" />
                              </a>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">No document</span>
                          )}
                        </td>
                        {!hideMetaColumns && (
                          <td className="px-4 py-3 text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleMessageClient(client)}
                                className={cn(
                                  'inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-slate-600 transition',
                                  client.email ? 'hover:border-primary hover:text-primary' : 'cursor-not-allowed opacity-50'
                                )}
                                disabled={!client.email}
                                title={client.email ? 'Message client' : 'Client has no email'}
                              >
                                <MessageSquare className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEdit(client)}
                                className={cn(
                                  'inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-slate-600 transition hover:border-primary hover:text-primary',
                                  !canManageClients && 'cursor-not-allowed opacity-50'
                                )}
                                disabled={!canManageClients}
                                aria-label="Edit client"
                                title="Edit client"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSendVerification(client)}
                                className={cn(
                                  'inline-flex h-8 w-8 items-center justify-center rounded-full border border-primary/40 text-primary transition hover:bg-primary/5',
                                  (!canManageClients || !client.email || sendingVerificationId === client.id) && 'cursor-not-allowed opacity-50'
                                )}
                                disabled={!canManageClients || !client.email || sendingVerificationId === client.id}
                                aria-label="Send verification"
                                title={client.email ? 'Send verification' : 'Client has no email'}
                              >
                                {sendingVerificationId === client.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Send className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => openReasonPrompt('delete', client)}
                                className={cn(
                                  'inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 text-red-600 transition hover:bg-red-50',
                                  !canManageClients && 'cursor-not-allowed opacity-50'
                                )}
                                disabled={!canManageClients}
                                aria-label="Delete client"
                                title="Delete client"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        <AnimatePresence initial={false} mode="wait">
          {isFormVisible && (
            <motion.form
              key={editingId ?? 'create'}
              onSubmit={handleSubmit}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className={cn(
                'flex h-full flex-col gap-4 rounded-2xl border p-6 shadow-sm',
                editingId
                  ? 'border-blue-300 bg-blue-50/50 ring-2 ring-blue-200/50'
                  : 'border-border bg-background'
              )}
            >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                {editingId
                  ? `Edit client details${isEditingB2B ? ` - Step ${formStep} of 2` : ''}`
                  : `Create client record${formStep === 2 ? ' - Step 2' : ''}`}
              </h3>
              <p className="text-sm text-slate-600">
                {editingId
                  ? isEditingB2B
                    ? formStep === 1
                      ? 'Update client details before moving to company info.'
                      : 'Update company details for this B2B client.'
                    : 'Update client information.'
                  : formStep === 1
                    ? 'Enter basic client information to get started.'
                    : form.clientType === 'B2B'
                      ? 'Provide company details for this B2B client.'
                      : 'Review and create the client record.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => resetForm({ collapse: true })}
              className="inline-flex items-center rounded-lg border border-border px-3 py-1 text-xs font-medium text-slate-500 transition hover:border-primary hover:text-primary"
            >
              Collapse
            </button>
          </div>

          {!canManageClients && !editingId && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              You do not have permission to create new clients.
            </div>
          )}

          {formError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div>
          )}

          {/* Step 1: Basic Info */}
          {showStepOne && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  First name
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, firstName: event.target.value }))
                    }
                    placeholder="e.g. Jane"
                    className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  Last name
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, lastName: event.target.value }))
                    }
                    placeholder="e.g. Doe"
                    className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Email
                <div className="relative rounded-xl bg-white">
                  {emailSuggestion && form.email && (
                    <div
                      className="absolute inset-0 px-4 pointer-events-none flex items-center overflow-hidden whitespace-nowrap"
                      aria-hidden="true"
                    >
                      <span className="opacity-0 text-sm">{form.email}</span>
                      <span className="text-red-300/70 text-sm">
                        {emailSuggestion.slice(form.email.length)}
                      </span>
                    </div>
                  )}
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => handleEmailChange(event.target.value)}
                    onKeyDown={handleEmailKeyDown}
                    placeholder="Optional"
                    className="h-11 w-full rounded-xl border border-border bg-transparent px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                {emailSuggestion && form.email && (
                  <span className="text-xs text-slate-400">Press Tab to complete</span>
                )}
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Phone Number
                <PhoneNumberInput
                  value={phoneValue}
                  onChange={setPhoneValue}
                  placeholder="1234567890"
                />
              </label>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-600">Status</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {(['active', 'inactive'] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => {
                        if (
                          status === 'inactive' &&
                          editingId &&
                          editingClient &&
                          editingClient.status !== 'inactive'
                        ) {
                          openReasonPrompt('inactive', editingClient, 'form');
                          return;
                        }
                        setForm((prev) => ({ ...prev, status }));
                        if (status === 'active') {
                          setStatusChangeReason(null);
                          setStatusChangeTargetId(null);
                        }
                      }}
                      className={`rounded-full px-2 py-1.5 border font-semibold cursor-pointer transition-all duration-300 ease-in-out ${
                        form.status === status
                          ? 'text-white scale-[1.01]'
                          : 'border-slate-400/40 bg-white/70 text-slate-600 hover:border-slate-400/55 hover:bg-white/95 hover:-translate-y-0.5 hover:shadow-md'
                      }`}
                      style={
                        form.status === status
                          ? {
                              background:
                                status === 'active'
                                  ? 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)'
                                  : 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                              borderColor: status === 'active' ? '#22c55e' : '#ef4444',
                            }
                          : undefined
                      }
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-600">Client type</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {(['C2B', 'B2B'] as const).map((type) => {
                      const canSelect =
                        !editingId || (editingClient?.clientType === 'B2B' && type === 'C2B');
                      const isDisabled = !canSelect;
                      const isActive = form.clientType === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            if (!editingId) {
                              setForm((prev) => ({ ...prev, clientType: type }));
                              return;
                            }
                            if (editingClient?.clientType === 'B2B' && type === 'C2B') {
                              openReasonPrompt('downgrade', editingClient, 'form');
                            }
                          }}
                          disabled={isDisabled}
                          className={cn(
                            `rounded-full px-2 py-1.5 border font-semibold cursor-pointer transition-all duration-300 ease-in-out ${
                              isActive
                                ? 'text-white scale-[1.01]'
                                : 'border-slate-400/40 bg-white/70 text-slate-600 hover:border-slate-400/55 hover:bg-white/95 hover:-translate-y-0.5 hover:shadow-md'
                            }`,
                            isDisabled && !isActive && 'cursor-not-allowed opacity-50'
                          )}
                          style={
                            form.clientType === type
                              ? {
                                  background:
                                    type === 'C2B'
                                      ? 'linear-gradient(135deg, #60a5fa 0%, #1d4ed8 100%)'
                                      : 'linear-gradient(135deg, #f6b210 0%, #a00b0b 100%)',
                                  borderColor: type === 'C2B' ? '#60a5fa' : '#a00b0b',
                                }
                              : undefined
                          }
                        >
                          {type === 'B2B' ? 'Business (B2B)' : 'Individual (C2B)'}
                        </button>
                      );
                    })}
                  </div>
              </div>

              <label className="flex flex-col gap-2 text-sm text-slate-600">
                {editingId ? 'New password' : 'Password'}
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                    placeholder={editingId ? 'Leave blank to keep current password' : 'Strong password required'}
                    className={cn(
                      'h-11 w-full rounded-xl border px-4 text-sm focus:outline-none',
                      form.password
                        ? `${passwordStrength.borderClass} ${passwordStrength.focusClass}`
                        : 'border-border focus:border-primary focus:ring-2 focus:ring-primary/20'
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-primary"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {form.password && passwordStrength.label && (
                  <span className={cn('text-xs font-semibold', passwordStrength.colorClass)}>
                    {passwordStrength.label}
                  </span>
                )}
                {!editingId && (
                  <span className="text-xs text-slate-400">{PASSWORD_COMPLEXITY_MESSAGE}</span>
                )}
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-600">
                Confirm password
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                    }
                    placeholder={editingId ? 'Repeat new password' : 'Repeat password'}
                    className="h-11 w-full rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-primary"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </label>
            </>
          )}

          {/* Step 2: Additional Details */}
          {showStepTwo && (
            <>
              {form.clientType === 'B2B' && (
                <div className="space-y-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">Company details</h4>
                    <p className="text-xs text-slate-500">Provide business information for this B2B client.</p>
                  </div>

                  <label className="flex flex-col gap-2 text-sm text-slate-600">
                    Company name
                    <input
                      type="text"
                      value={form.companyName}
                      onChange={(event) => setForm((prev) => ({ ...prev, companyName: event.target.value }))}
                      placeholder="e.g. ULK Supply"
                      className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm text-slate-600">
                    Business type
                    <BusinessTypeSelect
                      value={
                        !useCustomBusinessType && isBusinessTypeOption(form.companyBusinessType)
                          ? form.companyBusinessType
                          : ''
                      }
                      onSelect={handleBusinessTypePresetSelect}
                      onSelectCustom={handleEnableCustomBusinessType}
                      placeholder="Select business type"
                    />
                    {useCustomBusinessType && (
                      <div className="grid gap-2 pt-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                        <input
                          type="text"
                          value={form.companyBusinessType}
                          onChange={(event) => handleCustomBusinessTypeChange(event.target.value)}
                          className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          placeholder="Enter your business type"
                        />
                        <button
                          type="button"
                          className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:bg-slate-100"
                          onClick={() => {
                            setUseCustomBusinessType(false);
                            setForm((prev) => ({ ...prev, companyBusinessType: '' }));
                          }}
                        >
                          Choose preset
                        </button>
                      </div>
                    )}
                  </label>

                  <label className="flex flex-col gap-2 text-sm text-slate-600">
                    Company phone
                    <input
                      type="text"
                      value={form.companyPhone}
                      onChange={(event) => setForm((prev) => ({ ...prev, companyPhone: event.target.value }))}
                      placeholder="Optional"
                      className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm text-slate-600">
                    Tax ID
                    <input
                      type="text"
                      value={form.companyTaxId}
                      onChange={(event) => setForm((prev) => ({ ...prev, companyTaxId: event.target.value }))}
                      placeholder="Optional"
                      className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </label>

                  {!editingId ? (
                    <div className="flex flex-col gap-3">
                      <label className="flex flex-col gap-2 text-sm text-slate-600">
                        Company address
                        <input
                          type="text"
                          value={form.companyAddress}
                          onChange={(event) => setForm((prev) => ({ ...prev, companyAddress: event.target.value }))}
                          placeholder="Street address"
                          className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </label>

                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="flex flex-col gap-2 text-sm text-slate-600">
                          <span>Country</span>
                          <CountrySelect
                            value={form.companyCountry}
                            onChange={(value) => setForm((prev) => ({ ...prev, companyCountry: value }))}
                            placeholder="Select country"
                            searchPlaceholder="Search countries..."
                            className="w-full"
                          />
                        </div>

                        <div className="flex flex-col gap-2 text-sm text-slate-600">
                          <span>State</span>
                          {isUnitedStates ? (
                            <CountrySelect
                              value={form.companyState}
                              onChange={(value) => setForm((prev) => ({ ...prev, companyState: value }))}
                              options={US_STATES}
                              placeholder="Select state"
                              searchPlaceholder="Search states..."
                              className="w-full"
                            />
                          ) : (
                            <input
                              type="text"
                              value={form.companyState}
                              onChange={(event) => setForm((prev) => ({ ...prev, companyState: event.target.value }))}
                              placeholder="State / Province"
                              className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                          )}
                        </div>

                        <div className="flex flex-col gap-2 text-sm text-slate-600">
                          <span>City</span>
                          <input
                            type="text"
                            value={form.companyCity}
                            onChange={(event) => setForm((prev) => ({ ...prev, companyCity: event.target.value }))}
                            placeholder="City"
                            className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col gap-2 text-sm text-slate-600">
                      Company address
                      <textarea
                        value={form.companyAddress}
                        onChange={(event) => setForm((prev) => ({ ...prev, companyAddress: event.target.value }))}
                        placeholder="Optional"
                        className="min-h-[80px] rounded-xl border border-border bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </label>
                  )}

                  <label className="flex flex-col gap-2 text-sm text-slate-600">
                    Company website
                    <input
                      type="text"
                      value={form.companyWebsite}
                      onChange={(event) => setForm((prev) => ({ ...prev, companyWebsite: event.target.value }))}
                      placeholder="Optional"
                      className="h-11 rounded-xl border border-border bg-white px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                </div>
              )}

              {!editingId && form.clientType === 'C2B' && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  C2B clients don't require additional company details. Click "Create client" to finish.
                </div>
              )}
            </>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            {!editingId && formStep === 1 && (
              <button
                type={form.clientType === 'C2B' ? 'submit' : 'button'}
                onClick={form.clientType === 'B2B' ? () => handleAdvanceToCompanyDetails(true) : undefined}
                className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
                disabled={submitting || !canManageClients}
              >
                {submitting ? 'Creating...' : form.clientType === 'C2B' ? 'Create client' : 'Next'}
              </button>
            )}

            {!editingId && formStep === 2 && (
              <>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={submitting || !canManageClients}
                >
                  {submitting ? 'Creating...' : 'Create client'}
                </button>
                <button
                  type="button"
                  onClick={() => setFormStep(1)}
                  className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary"
                  disabled={submitting}
                >
                  Back
                </button>
              </>
            )}

            {editingId && !isEditingB2B && (
              <>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={submitting || !canManageClients}
                >
                  {submitting ? 'Saving...' : 'Save changes'}
                </button>
                <button
                  type="button"
                  onClick={() => resetForm({ collapse: true })}
                  className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary"
                  disabled={submitting}
                >
                  Cancel
                </button>
              </>
            )}

            {editingId && isEditingB2B && formStep === 1 && (
              <>
                <button
                  type="button"
                  onClick={() => handleAdvanceToCompanyDetails(false)}
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={submitting || !canManageClients}
                >
                  Next
                </button>
                <button
                  type="button"
                  onClick={() => resetForm({ collapse: true })}
                  className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary"
                  disabled={submitting}
                >
                  Cancel
                </button>
              </>
            )}

            {editingId && isEditingB2B && formStep === 2 && (
              <>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={submitting || !canManageClients}
                >
                  {submitting ? 'Saving...' : 'Save changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setFormStep(1)}
                  className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary"
                  disabled={submitting}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => resetForm({ collapse: true })}
                  className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary"
                  disabled={submitting}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {documentPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setDocumentPreview(null)}
        >
          <div
            className="w-full max-w-4xl rounded-2xl border border-border bg-surface p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Document preview</h3>
                <p className="text-xs text-slate-500">{documentPreview.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setDocumentPreview(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-slate-600 transition hover:border-primary hover:text-primary"
                aria-label="Close preview"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="h-[70vh] w-full overflow-hidden rounded-xl border border-border bg-white">
              <iframe
                src={documentPreview.href}
                title={documentPreview.name}
                className="h-full w-full"
              />
            </div>
          </div>
        </div>
      )}

      {reasonModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900">{reasonTitle}</h3>
              <p className="mt-2 text-sm text-slate-600">{reasonDescription}</p>
            </div>
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              Reason
              <textarea
                value={reasonInput}
                onChange={(event) => {
                  setReasonInput(event.target.value);
                  if (reasonError) {
                    setReasonError(null);
                  }
                }}
                placeholder="Enter the reason..."
                className="min-h-[110px] rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            {reasonError && <p className="mt-2 text-xs font-semibold text-red-500">{reasonError}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setReasonModal(null)}
                className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleReasonConfirm()}
                className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
              >
                {reasonActionLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDelete && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <div className="mb-4 flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900">Remove client</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Are you sure you want to remove {pendingDelete.name || pendingDelete.email || pendingDelete.id}?
                </p>
                <p className="mt-2 text-xs font-semibold text-red-500">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!deletingId) {
                    setPendingDelete(null);
                    setDeleteReason(null);
                  }
                }}
                className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                disabled={Boolean(deletingId) || !deleteReason}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(pendingDelete.id, deleteReason)}
                className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={Boolean(deletingId)}
              >
                {deletingId === pendingDelete.id ? 'Removing...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

const forbiddenError = () => Object.assign(new Error('FORBIDDEN'), { message: 'FORBIDDEN' });
