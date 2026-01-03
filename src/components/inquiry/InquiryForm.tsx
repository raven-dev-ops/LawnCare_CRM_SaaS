'use client'

import { useState } from 'react'
import Script from 'next/script'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { AddressAutocomplete } from '@/components/inputs/AddressAutocomplete'
import { RECAPTCHA_SITE_KEY } from '@/lib/config'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, Phone, Mail, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

const SERVICE_OPTIONS = [
  'Mowing',
  'Trimming',
  'Edging',
  'Fertilizing',
  'Aeration',
  'Seeding',
  'Mulching',
  'Leaf Removal',
  'Snow Removal',
]

declare global {
  interface Window {
    grecaptcha?: {
      execute: (siteKey: string, options: { action: string }) => Promise<string>
      ready?: (cb: () => void) => void
    }
  }
}

interface InquiryFormProps {
  businessName: string
  businessEmail?: string | null
  businessPhone?: string | null
}

export default function InquiryForm({
  businessName,
  businessEmail,
  businessPhone,
}: InquiryFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [propertyType, setPropertyType] = useState<string | undefined>('Residential')
  const [lotSize, setLotSize] = useState('')
  const [servicesInterested, setServicesInterested] = useState<string[]>([])
  const [preferredContactMethod, setPreferredContactMethod] = useState<string | undefined>('email')
  const [preferredContactTime, setPreferredContactTime] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [company, setCompany] = useState('')

  const recaptchaEnabled = Boolean(RECAPTCHA_SITE_KEY)

  const toggleService = (service: string) => {
    setServicesInterested((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !email.trim() || !address.trim()) {
      toast.error('Please fill in your name, email, and address.')
      return
    }

    setIsSubmitting(true)

    let recaptchaToken: string | undefined

    if (recaptchaEnabled) {
      const grecaptcha = window.grecaptcha

      if (!grecaptcha?.execute) {
        toast.error('reCAPTCHA is not ready. Please try again.')
        setIsSubmitting(false)
        return
      }

      try {
        if (grecaptcha.ready) {
          await new Promise<void>((resolve) => grecaptcha.ready?.(resolve))
        }
        recaptchaToken = await grecaptcha.execute(RECAPTCHA_SITE_KEY, {
          action: 'inquiry_submit',
        })
      } catch (error) {
        console.error('reCAPTCHA error:', error)
        toast.error('reCAPTCHA verification failed. Please try again.')
        setIsSubmitting(false)
        return
      }
    }

    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          phone: phone || null,
          address,
          propertyType,
          lotSize: lotSize || null,
          servicesInterested,
          preferredContactMethod,
          preferredContactTime: preferredContactTime || null,
          notes: notes || null,
          recaptchaToken,
          honeypot: company || null,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data?.success) {
        toast.error(data?.error || 'Failed to submit your request. Please try again.')
        setIsSubmitting(false)
        return
      }

      setSubmitted(true)
      toast.success('Thanks! Your inquiry has been submitted.')
    } catch (error) {
      console.error('Inquiry submit error:', error)
      toast.error('Something went wrong. Please try again.')
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader className="flex flex-col items-center space-y-2">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <CardTitle className="text-center">
              Thanks for reaching out!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center text-sm text-muted-foreground">
            <p>
              We&apos;ve received your request and will follow up soon with a quote or a few quick questions.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      {recaptchaEnabled && (
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`}
          strategy="afterInteractive"
        />
      )}
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-3">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold">
              Get a Free Lawn Care Quote
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Tell us a bit about your property and we&apos;ll follow up with pricing and options.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="font-semibold text-slate-700">{businessName}</span>
            {businessPhone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {businessPhone}
              </span>
            )}
            {businessEmail && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {businessEmail}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="absolute left-[-10000px] top-auto h-0 w-0 overflow-hidden" aria-hidden="true">
              <label htmlFor="company">Company</label>
              <input
                id="company"
                name="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Name<span className="text-red-500">*</span>
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Email<span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  Phone
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  Address<span className="text-red-500">*</span>
                </label>
                <AddressAutocomplete
                  value={address}
                  onChange={setAddress}
                  placeholder="Street, city, ZIP"
                  required
                  showMissingKeyHint={false}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Property Type</label>
                <Select
                  value={propertyType}
                  onValueChange={(value) => setPropertyType(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Residential">Residential</SelectItem>
                    <SelectItem value="Commercial">Commercial</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Lot Size</label>
                <Input
                  value={lotSize}
                  onChange={(e) => setLotSize(e.target.value)}
                  placeholder="e.g., 1/4 acre"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  Contact Method
                </label>
                <Select
                  value={preferredContactMethod}
                  onValueChange={(value) => setPreferredContactMethod(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">
                  Services Interested In
                </label>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_OPTIONS.map((service) => {
                    const selected = servicesInterested.includes(service)
                    return (
                      <button
                        key={service}
                        type="button"
                        onClick={() => toggleService(service)}
                        className="focus:outline-none"
                      >
                        <Badge
                          variant={selected ? 'default' : 'outline'}
                          className="cursor-pointer"
                        >
                          {service}
                        </Badge>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Best Time to Reach You</label>
                <Input
                  value={preferredContactTime}
                  onChange={(e) => setPreferredContactTime(e.target.value)}
                  placeholder="e.g., Weekdays after 5pm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Anything else we should know?
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Gate codes, pets in yard, steep slopes, specific trouble spots, etc."
              />
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <p>
                We&apos;ll never share your information. This form creates a lead in our system so we can follow up.
              </p>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-emerald-500 hover:bg-emerald-600"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Request Quote'
              )}
            </Button>

            <div className="border-t pt-4 text-xs text-muted-foreground">
              <div className="font-medium text-slate-700">{businessName}</div>
              <div className="flex flex-wrap gap-3">
                {businessPhone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {businessPhone}
                  </span>
                )}
                {businessEmail && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {businessEmail}
                  </span>
                )}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
