// filepath: automotive-salah/apps/web/components/product/ProductReviews.tsx
'use client'

import { useState } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Textarea, Input } from '@automotive/ui'
import { Star, ThumbsUp, ThumbsDown, User } from 'lucide-react'

interface Review {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  rating: number
  title: string
  comment: string
  date: string
  verified: boolean
  helpful: number
  notHelpful: number
  images?: string[]
}

interface ProductReviewsProps {
  productId?: string
  reviews?: Review[]
  averageRating?: number
  totalReviews?: number
}

// Mock reviews data - replace with actual data fetching
const mockReviews: Review[] = [
  {
    id: '1',
    userId: 'user1',
    userName: 'Mike Johnson',
    rating: 5,
    title: 'Excellent programming tool!',
    comment: 'This device has saved me countless hours. Works perfectly with all the vehicles I\'ve tested it on. The wireless connectivity is a game-changer.',
    date: '2024-01-15',
    verified: true,
    helpful: 12,
    notHelpful: 1
  },
  {
    id: '2',
    userId: 'user2',
    userName: 'Sarah Chen',
    rating: 4,
    title: 'Great value for money',
    comment: 'Very satisfied with this purchase. Easy to use interface and comprehensive vehicle support. Only minor issue is the battery life could be better.',
    date: '2024-01-10',
    verified: true,
    helpful: 8,
    notHelpful: 0
  },
  {
    id: '3',
    userId: 'user3',
    userName: 'David Rodriguez',
    rating: 5,
    title: 'Professional quality',
    comment: 'Been using this for 3 months now. Reliable, accurate, and the customer support is excellent. Highly recommend for any locksmith.',
    date: '2024-01-05',
    verified: true,
    helpful: 15,
    notHelpful: 2
  },
  {
    id: '4',
    userId: 'user4',
    userName: 'Lisa Thompson',
    rating: 3,
    title: 'Good but has limitations',
    comment: 'Works well for most vehicles but had issues with some newer models. The software updates help but could be more frequent.',
    date: '2023-12-28',
    verified: false,
    helpful: 5,
    notHelpful: 3
  }
]

export function ProductReviews({ 
  productId = '1', 
  reviews = mockReviews, 
  averageRating = 4.5, 
  totalReviews = 127 
}: ProductReviewsProps) {
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful'>('newest')
  const [filterRating, setFilterRating] = useState<number | null>(null)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [newReview, setNewReview] = useState({
    rating: 5,
    title: '',
    comment: ''
  })

  const renderStars = (rating: number, interactive = false, onRatingChange?: (rating: number) => void) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 cursor-pointer ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        } ${interactive ? 'hover:text-yellow-400' : ''}`}
        onClick={() => interactive && onRatingChange && onRatingChange(i + 1)}
      />
    ))
  }

  const getRatingDistribution = () => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    reviews.forEach(review => {
      distribution[review.rating as keyof typeof distribution]++
    })
    return distribution
  }

  const ratingDistribution = getRatingDistribution()

  const sortedReviews = [...reviews].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      case 'oldest':
        return new Date(a.date).getTime() - new Date(b.date).getTime()
      case 'highest':
        return b.rating - a.rating
      case 'lowest':
        return a.rating - b.rating
      case 'helpful':
        return b.helpful - a.helpful
      default:
        return 0
    }
  })

  const filteredReviews = filterRating 
    ? sortedReviews.filter(review => review.rating === filterRating)
    : sortedReviews

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement review submission with tRPC
    console.log('Submitting review:', { productId, ...newReview })
    setShowReviewForm(false)
    setNewReview({ rating: 5, title: '', comment: '' })
  }

  const handleHelpful = (reviewId: string, helpful: boolean) => {
    // TODO: Implement helpful/not helpful logic with tRPC
    console.log('Review feedback:', { reviewId, helpful })
  }

  return (
    <div className="space-y-6">
      {/* Reviews Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Customer Reviews</span>
            <Button onClick={() => setShowReviewForm(!showReviewForm)}>
              Write a Review
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Overall Rating */}
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">{averageRating}</div>
              <div className="flex items-center justify-center mb-2">
                {renderStars(averageRating)}
              </div>
              <div className="text-sm text-gray-600">
                Based on {totalReviews} reviews
              </div>
            </div>

            {/* Rating Distribution */}
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map(rating => {
                const count = ratingDistribution[rating as keyof typeof ratingDistribution]
                const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0
                
                return (
                  <div key={rating} className="flex items-center gap-2 text-sm">
                    <span className="w-8">{rating}</span>
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-yellow-400 h-2 rounded-full" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-8 text-right">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Review Form */}
      {showReviewForm && (
        <Card>
          <CardHeader>
            <CardTitle>Write a Review</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Rating</label>
                <div className="flex items-center gap-1">
                  {renderStars(newReview.rating, true, (rating) => 
                    setNewReview(prev => ({ ...prev, rating }))
                  )}
                </div>
              </div>
              
              <div>
                <label htmlFor="reviewTitle" className="block text-sm font-medium mb-2">
                  Review Title
                </label>
                <Input
                  id="reviewTitle"
                  value={newReview.title}
                  onChange={(e) => setNewReview(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Summarize your experience"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="reviewComment" className="block text-sm font-medium mb-2">
                  Your Review
                </label>
                <Textarea
                  id="reviewComment"
                  value={newReview.comment}
                  onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder="Share your thoughts about this product"
                  rows={4}
                  required
                />
              </div>
              
              <div className="flex gap-2">
                <Button type="submit">Submit Review</Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowReviewForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters and Sorting */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Sort by:</span>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className="border rounded px-3 py-1 text-sm"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="highest">Highest Rating</option>
            <option value="lowest">Lowest Rating</option>
            <option value="helpful">Most Helpful</option>
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Filter:</span>
          <div className="flex gap-1">
            <Button
              variant={filterRating === null ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterRating(null)}
            >
              All
            </Button>
            {[5, 4, 3, 2, 1].map(rating => (
              <Button
                key={rating}
                variant={filterRating === rating ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterRating(rating)}
                className="flex items-center gap-1"
              >
                {rating} <Star className="w-3 h-3" />
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.map(review => (
          <Card key={review.id}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">{review.userName}</span>
                    {review.verified && (
                      <Badge variant="secondary" className="text-xs">
                        Verified Purchase
                      </Badge>
                    )}
                    <span className="text-sm text-gray-500">
                      {new Date(review.date).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-3">
                    {renderStars(review.rating)}
                    <span className="font-medium">{review.title}</span>
                  </div>
                  
                  <p className="text-gray-700 mb-4 leading-relaxed">{review.comment}</p>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <button 
                      onClick={() => handleHelpful(review.id, true)}
                      className="flex items-center gap-1 text-gray-600 hover:text-green-600"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      Helpful ({review.helpful})
                    </button>
                    
                    <button 
                      onClick={() => handleHelpful(review.id, false)}
                      className="flex items-center gap-1 text-gray-600 hover:text-red-600"
                    >
                      <ThumbsDown className="w-4 h-4" />
                      Not Helpful ({review.notHelpful})
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredReviews.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No reviews found for the selected criteria.
        </div>
      )}
    </div>
  )
}
