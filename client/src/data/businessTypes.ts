export const BUSINESS_TYPE_OPTIONS = [
  'Limited Liability Company (LLC)',
  'C Corporation (C-Corp)',
  'S Corporation (S-Corp)',
  'Sole Proprietorship',
  'Partnership / LLP',
  'Franchise Operator',
  'Nonprofit Organization',
  'Government Agency / Municipality',
  'Educational Institution',
  'Automotive Service & Repair',
] as const;

export type BusinessTypeOption = (typeof BUSINESS_TYPE_OPTIONS)[number];

export const isBusinessTypeOption = (value: string): value is BusinessTypeOption =>
  BUSINESS_TYPE_OPTIONS.includes(value as BusinessTypeOption);
