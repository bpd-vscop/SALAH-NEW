// filepath: automotive-salah/apps/web/components/product/ProductDetail.tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button, Badge, Card, CardContent, Separator } from '@automotive/ui'
import { Star, ShoppingCart, Heart, Share2, Truck, Shield, RotateCcw } from 'lucide-react'

interface Product {
  id: string
  name: string
  description: string
  price: number
  originalPrice?: number
  images: string[]
  category: string
  brand: string
  inStock: boolean
  stockCount: number
  rating: number
  reviewCount: number
  features: string[]
  specifications: Record<string, string>
}

interface ProductDetailProps {
  product?: Product
  slug?: string
}

// Mock product data - replace with actual data fetching
const mockProduct: Product = {
  id: '1',
  name: 'Professional Car Key Programming Tool',
  description: 'Advanced automotive key programming device with support for 200+ vehicle models. Features wireless connectivity, automatic key detection, and comprehensive diagnostic capabilities.',
  price: 299.99,
  originalPrice: 399.99,
  images: [
    '/placeholder.svg',
    '/placeholder.svg',
    '/placeholder.svg'
  ],
  category: 'Programming Tools',
  brand: 'AutoTech Pro',
  inStock: true,
  stockCount: 15,
  rating: 4.8,
  reviewCount: 127,
  features: [
    'Supports 200+ vehicle models',
    'Wireless Bluetooth connectivity',
    'Automatic key detection',
    'Real-time diagnostics',
    'Firmware updates via app',
    'Compact portable design'
  ],
  specifications: {
    'Compatibility': '2010-2024 vehicles',
    'Connectivity': 'Bluetooth 5.0, USB-C',
    'Battery Life': '8 hours continuous use',
    'Dimensions': '15cm x 8cm x 3cm',
    'Weight': '280g',
    'Warranty': '2 years'
  }
}

export function ProductDetail({ product = mockProduct, slug }: ProductDetailProps) {
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [isWishlisted, setIsWishlisted] = useState(false)

  const handleAddToCart = () => {
    // TODO: Implement add to cart logic with tRPC
    console.log('Adding to cart:', { productId: product.id, quantity })
  }

  const handleWishlist = () => {
    setIsWishlisted(!isWishlisted)
    // TODO: Implement wishlist logic with tRPC
    console.log('Wishlist toggle:', { productId: product.id, wishlisted: !isWishlisted })
  }

  const handleShare = () => {
    // TODO: Implement share functionality
    console.log('Sharing product:', product.id)
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < Math.floor(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ))
  }

  const discountPercentage = product.originalPrice 
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Product Images */}
        <div className="space-y-4">
          <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden">
            <Image
              src={product.images[selectedImage]}
              alt={product.name}
              fill
              className="object-cover"
            />
            {discountPercentage > 0 && (
              <Badge className="absolute top-4 left-4 bg-red-500 text-white">
                -{discountPercentage}%
              </Badge>
            )}
          </div>
          
          {/* Thumbnail Images */}
          <div className="flex gap-2">
            {product.images.map((image, index) => (
              <button
                key={index}
                onClick={() => setSelectedImage(index)}
                className={`w-20 h-20 relative bg-gray-100 rounded-md overflow-hidden border-2 ${
                  selectedImage === index ? 'border-blue-500' : 'border-transparent'
                }`}
              >
                <Image
                  src={image}
                  alt={`${product.name} ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <span>{product.brand}</span>
              <span>•</span>
              <span>{product.category}</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>
            
            {/* Rating */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center">
                {renderStars(product.rating)}
              </div>
              <span className="text-sm text-gray-600">
                {product.rating} ({product.reviewCount} reviews)
              </span>
            </div>
          </div>

          {/* Price */}
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-gray-900">
              ${product.price.toFixed(2)}
            </span>
            {product.originalPrice && (
              <span className="text-xl text-gray-500 line-through">
                ${product.originalPrice.toFixed(2)}
              </span>
            )}
          </div>

          {/* Stock Status */}
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              product.inStock ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span className={`text-sm font-medium ${
              product.inStock ? 'text-green-600' : 'text-red-600'
            }`}>
              {product.inStock ? `In Stock (${product.stockCount} available)` : 'Out of Stock'}
            </span>
          </div>

          {/* Description */}
          <p className="text-gray-600 leading-relaxed">{product.description}</p>

          {/* Features */}
          <div>
            <h3 className="font-semibold mb-3">Key Features:</h3>
            <ul className="space-y-2">
              {product.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Quantity and Actions */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center border rounded-md">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-2 hover:bg-gray-100"
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <span className="px-4 py-2 border-x">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-3 py-2 hover:bg-gray-100"
                  disabled={quantity >= product.stockCount}
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleAddToCart}
                disabled={!product.inStock}
                className="flex-1 flex items-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                Add to Cart
              </Button>
              
              <Button
                variant="outline"
                onClick={handleWishlist}
                className={`px-4 ${isWishlisted ? 'text-red-500 border-red-500' : ''}`}
              >
                <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
              </Button>
              
              <Button variant="outline" onClick={handleShare} className="px-4">
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Shipping Info */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Truck className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium">Free Shipping</p>
                    <p className="text-sm text-gray-600">On orders over $200</p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium">2 Year Warranty</p>
                    <p className="text-sm text-gray-600">Full manufacturer warranty</p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex items-center gap-3">
                  <RotateCcw className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="font-medium">30-Day Returns</p>
                    <p className="text-sm text-gray-600">Easy return policy</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Specifications */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Specifications</h2>
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(product.specifications).map(([key, value]) => (
                <div key={key} className="flex justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <span className="font-medium text-gray-700">{key}:</span>
                  <span className="text-gray-600">{value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
