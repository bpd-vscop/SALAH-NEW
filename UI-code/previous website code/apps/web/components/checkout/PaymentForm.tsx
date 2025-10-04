// filepath: automotive-salah/apps/web/components/checkout/PaymentForm.tsx
'use client'

import { useState } from 'react'
import { Button, Input, Card, CardContent, CardHeader, CardTitle, RadioGroup, RadioGroupItem, Label } from '@automotive/ui'
import { CreditCard, Lock, Shield } from 'lucide-react'

interface PaymentData {
  paymentMethod: 'card' | 'paypal' | 'apple_pay'
  cardNumber: string
  expiryDate: string
  cvv: string
  cardholderName: string
  billingAddress: {
    sameAsShipping: boolean
    address?: string
    city?: string
    state?: string
    zipCode?: string
  }
}

interface PaymentFormProps {
  onSubmit?: (data: PaymentData) => void
  orderTotal?: number
}

export function PaymentForm({ onSubmit, orderTotal = 0 }: PaymentFormProps) {
  const [formData, setFormData] = useState<PaymentData>({
    paymentMethod: 'card',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    billingAddress: {
      sameAsShipping: true
    }
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (formData.paymentMethod === 'card') {
      if (!formData.cardNumber.trim()) {
        newErrors.cardNumber = 'Card number is required'
      } else if (!/^\d{16}$/.test(formData.cardNumber.replace(/\s/g, ''))) {
        newErrors.cardNumber = 'Card number must be 16 digits'
      }
      
      if (!formData.expiryDate.trim()) {
        newErrors.expiryDate = 'Expiry date is required'
      } else if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(formData.expiryDate)) {
        newErrors.expiryDate = 'Expiry date must be in MM/YY format'
      }
      
      if (!formData.cvv.trim()) {
        newErrors.cvv = 'CVV is required'
      } else if (!/^\d{3,4}$/.test(formData.cvv)) {
        newErrors.cvv = 'CVV must be 3 or 4 digits'
      }
      
      if (!formData.cardholderName.trim()) {
        newErrors.cardholderName = 'Cardholder name is required'
      }
      
      if (!formData.billingAddress.sameAsShipping) {
        if (!formData.billingAddress.address?.trim()) {
          newErrors.billingAddress = 'Billing address is required'
        }
        if (!formData.billingAddress.city?.trim()) {
          newErrors.billingCity = 'Billing city is required'
        }
        if (!formData.billingAddress.state?.trim()) {
          newErrors.billingState = 'Billing state is required'
        }
        if (!formData.billingAddress.zipCode?.trim()) {
          newErrors.billingZipCode = 'Billing ZIP code is required'
        }
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setIsLoading(true)
    
    try {
      if (onSubmit) {
        await onSubmit(formData)
      }
      // TODO: Implement payment processing with tRPC
      console.log('Payment form submitted:', formData)
    } catch (error) {
      console.error('Payment form error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    if (field.startsWith('billing.')) {
      const billingField = field.replace('billing.', '')
      setFormData(prev => ({
        ...prev,
        billingAddress: {
          ...prev.billingAddress,
          [billingField]: value
        }
      }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = matches && matches[0] || ''
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    if (parts.length) {
      return parts.join(' ')
    } else {
      return v
    }
  }

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4)
    }
    return v
  }

  const getCardType = (number: string) => {
    const num = number.replace(/\s/g, '')
    if (/^4/.test(num)) return 'Visa'
    if (/^5[1-5]/.test(num)) return 'Mastercard'
    if (/^3[47]/.test(num)) return 'American Express'
    if (/^6/.test(num)) return 'Discover'
    return 'Card'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Payment Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Payment Method Selection */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Payment Method</h3>
            <RadioGroup
              value={formData.paymentMethod}
              onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value as any }))}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="card" id="card" />
                <Label htmlFor="card" className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Credit/Debit Card
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="paypal" id="paypal" />
                <Label htmlFor="paypal">PayPal</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="apple_pay" id="apple_pay" />
                <Label htmlFor="apple_pay">Apple Pay</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Card Details */}
          {formData.paymentMethod === 'card' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="cardNumber" className="block text-sm font-medium mb-1">
                  Card Number *
                </label>
                <div className="relative">
                  <Input
                    id="cardNumber"
                    type="text"
                    value={formData.cardNumber}
                    onChange={(e) => {
                      const formatted = formatCardNumber(e.target.value)
                      handleInputChange('cardNumber', formatted)
                    }}
                    className={errors.cardNumber ? 'border-red-500' : ''}
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                    {getCardType(formData.cardNumber)}
                  </div>
                </div>
                {errors.cardNumber && (
                  <p className="text-red-500 text-xs mt-1">{errors.cardNumber}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="expiryDate" className="block text-sm font-medium mb-1">
                    Expiry Date *
                  </label>
                  <Input
                    id="expiryDate"
                    type="text"
                    value={formData.expiryDate}
                    onChange={(e) => {
                      const formatted = formatExpiryDate(e.target.value)
                      handleInputChange('expiryDate', formatted)
                    }}
                    className={errors.expiryDate ? 'border-red-500' : ''}
                    placeholder="MM/YY"
                    maxLength={5}
                  />
                  {errors.expiryDate && (
                    <p className="text-red-500 text-xs mt-1">{errors.expiryDate}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="cvv" className="block text-sm font-medium mb-1">
                    CVV *
                  </label>
                  <Input
                    id="cvv"
                    type="text"
                    value={formData.cvv}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '')
                      handleInputChange('cvv', value)
                    }}
                    className={errors.cvv ? 'border-red-500' : ''}
                    placeholder="123"
                    maxLength={4}
                  />
                  {errors.cvv && (
                    <p className="text-red-500 text-xs mt-1">{errors.cvv}</p>
                  )}
                </div>
              </div>
              
              <div>
                <label htmlFor="cardholderName" className="block text-sm font-medium mb-1">
                  Cardholder Name *
                </label>
                <Input
                  id="cardholderName"
                  type="text"
                  value={formData.cardholderName}
                  onChange={(e) => handleInputChange('cardholderName', e.target.value)}
                  className={errors.cardholderName ? 'border-red-500' : ''}
                  placeholder="John Doe"
                />
                {errors.cardholderName && (
                  <p className="text-red-500 text-xs mt-1">{errors.cardholderName}</p>
                )}
              </div>
            </div>
          )}

          {/* Alternative Payment Methods */}
          {formData.paymentMethod === 'paypal' && (
            <div className="p-4 bg-blue-50 rounded-lg text-center">
              <p className="text-sm text-gray-600 mb-4">
                You will be redirected to PayPal to complete your payment.
              </p>
            </div>
          )}

          {formData.paymentMethod === 'apple_pay' && (
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <p className="text-sm text-gray-600 mb-4">
                Use Touch ID or Face ID to pay with Apple Pay.
              </p>
            </div>
          )}

          {/* Billing Address */}
          {formData.paymentMethod === 'card' && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Billing Address</h3>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="sameAsShipping"
                  checked={formData.billingAddress.sameAsShipping}
                  onChange={(e) => {
                    setFormData(prev => ({
                      ...prev,
                      billingAddress: {
                        ...prev.billingAddress,
                        sameAsShipping: e.target.checked
                      }
                    }))
                  }}
                  className="rounded"
                />
                <label htmlFor="sameAsShipping" className="text-sm text-gray-700">
                  Same as shipping address
                </label>
              </div>
              
              {!formData.billingAddress.sameAsShipping && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="billingAddress" className="block text-sm font-medium mb-1">
                      Address *
                    </label>
                    <Input
                      id="billingAddress"
                      type="text"
                      value={formData.billingAddress.address || ''}
                      onChange={(e) => handleInputChange('billing.address', e.target.value)}
                      className={errors.billingAddress ? 'border-red-500' : ''}
                      placeholder="123 Main Street"
                    />
                    {errors.billingAddress && (
                      <p className="text-red-500 text-xs mt-1">{errors.billingAddress}</p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="billingCity" className="block text-sm font-medium mb-1">
                        City *
                      </label>
                      <Input
                        id="billingCity"
                        type="text"
                        value={formData.billingAddress.city || ''}
                        onChange={(e) => handleInputChange('billing.city', e.target.value)}
                        className={errors.billingCity ? 'border-red-500' : ''}
                        placeholder="New York"
                      />
                      {errors.billingCity && (
                        <p className="text-red-500 text-xs mt-1">{errors.billingCity}</p>
                      )}
                    </div>
                    
                    <div>
                      <label htmlFor="billingState" className="block text-sm font-medium mb-1">
                        State *
                      </label>
                      <Input
                        id="billingState"
                        type="text"
                        value={formData.billingAddress.state || ''}
                        onChange={(e) => handleInputChange('billing.state', e.target.value)}
                        className={errors.billingState ? 'border-red-500' : ''}
                        placeholder="NY"
                      />
                      {errors.billingState && (
                        <p className="text-red-500 text-xs mt-1">{errors.billingState}</p>
                      )}
                    </div>
                    
                    <div>
                      <label htmlFor="billingZipCode" className="block text-sm font-medium mb-1">
                        ZIP Code *
                      </label>
                      <Input
                        id="billingZipCode"
                        type="text"
                        value={formData.billingAddress.zipCode || ''}
                        onChange={(e) => handleInputChange('billing.zipCode', e.target.value)}
                        className={errors.billingZipCode ? 'border-red-500' : ''}
                        placeholder="12345"
                      />
                      {errors.billingZipCode && (
                        <p className="text-red-500 text-xs mt-1">{errors.billingZipCode}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Security Notice */}
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
            <Shield className="w-4 h-4 text-green-600" />
            <Lock className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700">
              Your payment information is encrypted and secure
            </span>
          </div>

          {/* Order Summary */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Total:</span>
              <span>${orderTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
            size="lg"
          >
            {isLoading ? 'Processing Payment...' : `Complete Order - $${orderTotal.toFixed(2)}`}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
