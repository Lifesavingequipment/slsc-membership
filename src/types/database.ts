export interface Club {
  id: string
  club_name: string
  club_code: string
  country: string
  state_region: string
  subscription_status: string
}

export interface Member {
  id: string
  club_id: string
  slsa_member_number: string | null
  first_name: string
  last_name: string
  preferred_name: string | null
  date_of_birth: string | null
  gender: string | null
  email: string
  phone: string | null
  address: string | null
  suburb: string | null
  postcode: string | null
  country: string | null
  join_date: string | null
  membership_status: string
  membership_type: string
  profile_photo_url: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  emergency_contact_relation: string | null
  auth_user_id: string | null
  created_at: string | null
  updated_at: string | null
}

export interface Role {
  id: string
  club_id: string
  member_id: string
  role_name: string
  is_active: boolean
}

export interface Qualification {
  id: string
  code: string
  name: string
  category: string
  validity_years: number | null
  renewal_notice_days: number | null
  country: string | null
}

export interface MemberQualification {
  id: string
  club_id: string
  member_id: string
  qualification_id: string
  issued_date: string | null
  expiry_date: string | null
  certificate_number: string | null
  issued_by: string | null
  status: string
  notes: string | null
  qualification?: Qualification
}
