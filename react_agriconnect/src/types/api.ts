export type Profile = {
  id: number
  userId: number
  address: string | null
  yearsOfExperience: string | null
  professionType: string | null
  farmSize: string | null
  farmingType: string | null
  technicianType: string | null
  userImage: string | null
}

export type UserPayload = {
  id: number
  email: string
  phone: string
  name: string
  accountType: string
  profile: Profile | null
  jwtToken: string
  signInCount: number
}

export type AuthResponse = {
  user: UserPayload
}

export type Course = {
  id: number | string
  title: string
  subtitle: string | null
  description: string | null
  price: string | null
  duration: string | null
  previewVideo:
    | ''
    | {
        url: string
        contentType: 'image' | 'video'
      }
  thumbnailUrl: string
  instructor: string | null
}

export type Lesson = {
  id: number | string
  title: string
  content: string | null
  contentPlain: string | null
  asset:
    | null
    | {
        url: string
        contentType: 'image' | 'video'
        duration: number | null
      }
  thumbnailUrl: string
}

export type Enrollment = {
  id: number | string
  lessonIds: Array<number | string>
  course: Course
}

export type LessonProgress = {
  id: number | string
  user_id: number | string
  lesson_id: number | string
  completed: boolean
}

export type MarketplaceCategory = {
  id: number | string
  name: string
  description: string | null
  is_active: boolean
}

export type MarketplaceProduct = {
  id: number | string
  title: string
  description: string | null
  thumbnail_url?: string | null
  main_picture_url?: string | null
  gallery_urls?: string[] | null
  unit_price: string | number
  stock_quantity: number
  status: string
  avgRating?: number
  reviewCount?: number
  category?: MarketplaceCategory | null
  farmer?: {
    id: number | string
    name: string
    phone: string
    email?: string
  } | null
}

export type ServiceCategory = {
  id: number | string
  name: string
  description: string | null
  is_active: boolean
}

export type ServiceListing = {
  id: number | string
  title: string
  description: string | null
  thumbnail_url?: string | null
  main_picture_url?: string | null
  gallery_urls?: string[] | null
  service_area: string | null
  contact_email: string | null
  is_active: boolean
  avgRating?: number
  reviewCount?: number
  category?: ServiceCategory | null
  technician?: {
    id: number | string
    name: string
    phone: string
    email?: string
  } | null
}

export type ServiceRequest = {
  id: number | string
  service_listing_id: number | string
  requester_name: string
  requester_phone: string
  requester_email: string | null
  message: string
  status: string
  email_delivery_status: string
  created_at?: string
  updated_at?: string
  listing?: ServiceListing | null
}

export type ListingReview = {
  id: number | string
  rating: number
  comment: string | null
  created_at?: string
  reviewer?: {
    id: number | string
    name: string
  } | null
}

export type FarmerOnboarding = {
  completed: boolean
  storeName?: string
  storeTagline?: string
  businessType?: string
  serviceArea?: string
  contactPhone?: string
  contactEmail?: string
  completedAt?: number
}

export type SellerStatus = 'pending' | 'approved' | 'rejected'

export type SellerReviewMeta = {
  sellerStatus: SellerStatus
  sellerStatusReason?: string | null
}
