export type Profile = {
  id: string
  full_name: string | null
  phone: string | null
  is_admin: boolean
  created_at: string
}

export type GalleryWork = {
  id: string
  title: string | null
  description: string | null
  cover_image_url: string
  tags_json: string | null
  is_featured: boolean
  is_published: boolean
  created_at: string
}

export type GalleryWorkImage = {
  id: string
  work_id: string
  image_url: string
  sort_order: number
  created_at: string
}

export type QuoteRequest = {
  id: string
  user_id: string | null
  contact_email: string
  contact_phone: string | null
  reference_image_url: string
  specs_json: string
  status: string
  quoted_price: number | null
  customer_decision?: 'accepted' | 'rejected' | null
  decision_at?: string | null
  payment_provider?: 'mercadopago' | null
  payment_status?: 'pending' | 'paid' | 'failed' | null
  payment_preference_id?: string | null
  payment_id?: string | null
  payment_paid_at?: string | null
  payment_method?: 'transfer' | null
  payment_reference?: string | null
  payment_receipt_url?: string | null
  payment_submitted_at?: string | null
  payment_verified_at?: string | null
  created_at: string
  updated_at: string
}

export type PaymentSettings = {
  id: string
  transfer_holder: string | null
  transfer_bank: string | null
  transfer_alias: string | null
  transfer_cbu: string | null
  transfer_cuit: string | null
  created_at: string
  updated_at: string
}

export type Order = {
  id: string
  user_id: string | null
  quote_request_id: string | null
  status: string
  total_amount: number | null
  shipping_json: string | null
  created_at: string
  updated_at: string
}

export type Notification = {
  id: string
  user_id: string
  title: string
  body: string
  link_url: string | null
  read_at: string | null
  created_at: string
}
