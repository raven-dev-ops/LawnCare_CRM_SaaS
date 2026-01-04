import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SHOP_LOCATION } from '@/lib/config'

export interface SettingsValues {
  businessName: string
  businessEmail: string | null
  businessPhone: string | null
  shopAddress: string
  shopLat: number
  shopLng: number
  notifyNewInquiryEmail: boolean
  notifyNewInquirySms: boolean
  notifyRouteCompletedEmail: boolean
  notifyRouteCompletedSms: boolean
}

export interface ShopLocation {
  lat: number
  lng: number
  address: string
}

const DEFAULT_SETTINGS: SettingsValues = {
  businessName: 'Lawn Care CRM',
  businessEmail: null,
  businessPhone: null,
  shopAddress: SHOP_LOCATION.address,
  shopLat: SHOP_LOCATION.lat,
  shopLng: SHOP_LOCATION.lng,
  notifyNewInquiryEmail: true,
  notifyNewInquirySms: false,
  notifyRouteCompletedEmail: true,
  notifyRouteCompletedSms: false,
}

export async function getSettings(): Promise<SettingsValues> {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()
  const adminClient = authData.user ? null : createAdminClient()
  const client = adminClient ?? supabase

  const { data, error } = await client
    .from('settings')
    .select(
      'business_name, business_email, business_phone, shop_address, shop_lat, shop_lng, notify_new_inquiry_email, notify_new_inquiry_sms, notify_route_completed_email, notify_route_completed_sms'
    )
    .maybeSingle()

  if (error) {
    console.error('Error loading settings:', error)
    return DEFAULT_SETTINGS
  }

  if (!data) {
    return DEFAULT_SETTINGS
  }

  return {
    businessName: data.business_name || DEFAULT_SETTINGS.businessName,
    businessEmail: data.business_email ?? DEFAULT_SETTINGS.businessEmail,
    businessPhone: data.business_phone ?? DEFAULT_SETTINGS.businessPhone,
    shopAddress: data.shop_address || DEFAULT_SETTINGS.shopAddress,
    shopLat: typeof data.shop_lat === 'number' ? data.shop_lat : DEFAULT_SETTINGS.shopLat,
    shopLng: typeof data.shop_lng === 'number' ? data.shop_lng : DEFAULT_SETTINGS.shopLng,
    notifyNewInquiryEmail:
      data.notify_new_inquiry_email ?? DEFAULT_SETTINGS.notifyNewInquiryEmail,
    notifyNewInquirySms:
      data.notify_new_inquiry_sms ?? DEFAULT_SETTINGS.notifyNewInquirySms,
    notifyRouteCompletedEmail:
      data.notify_route_completed_email ?? DEFAULT_SETTINGS.notifyRouteCompletedEmail,
    notifyRouteCompletedSms:
      data.notify_route_completed_sms ?? DEFAULT_SETTINGS.notifyRouteCompletedSms,
  }
}

export async function getShopLocation(): Promise<ShopLocation> {
  const settings = await getSettings()
  return {
    lat: settings.shopLat,
    lng: settings.shopLng,
    address: settings.shopAddress,
  }
}

export async function getBusinessProfile() {
  if (process.env.SUPABASE_AUTH_DISABLED === 'true') {
    return {
      name: DEFAULT_SETTINGS.businessName,
      email: DEFAULT_SETTINGS.businessEmail,
      phone: DEFAULT_SETTINGS.businessPhone,
    }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_public_business_profile')

  if (error) {
    console.error('Error loading public business profile:', error)
    return {
      name: DEFAULT_SETTINGS.businessName,
      email: DEFAULT_SETTINGS.businessEmail,
      phone: DEFAULT_SETTINGS.businessPhone,
    }
  }

  const profile = Array.isArray(data) ? data[0] : data

  if (!profile) {
    return {
      name: DEFAULT_SETTINGS.businessName,
      email: DEFAULT_SETTINGS.businessEmail,
      phone: DEFAULT_SETTINGS.businessPhone,
    }
  }

  return {
    name: profile.business_name || DEFAULT_SETTINGS.businessName,
    email: profile.business_email ?? DEFAULT_SETTINGS.businessEmail,
    phone: profile.business_phone ?? DEFAULT_SETTINGS.businessPhone,
  }
}
