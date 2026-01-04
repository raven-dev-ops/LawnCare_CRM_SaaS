'use client'

import { useEffect, useRef, useState } from 'react'
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps'
import { Input } from '@/components/ui/input'
import { GOOGLE_MAPS_BROWSER_API_KEY } from '@/lib/config'

interface AddressAutocompleteProps
  extends Omit<React.ComponentProps<'input'>, 'value' | 'onChange'> {
  value: string
  onChange: (value: string) => void
  onPlaceSelect?: (place: google.maps.places.PlaceResult) => void
  showMissingKeyHint?: boolean
}

function AddressAutocompleteInner({
  value,
  onChange,
  onPlaceSelect,
  ...props
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const placesLib = useMapsLibrary('places')
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null)

  useEffect(() => {
    if (!placesLib || !inputRef.current) return

    const instance = new placesLib.Autocomplete(inputRef.current, {
      fields: ['formatted_address', 'geometry', 'name', 'place_id'],
      types: ['address'],
    })

    setAutocomplete(instance)

    return () => {
      google.maps.event.clearInstanceListeners(instance)
    }
  }, [placesLib])

  useEffect(() => {
    if (!autocomplete) return

    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      const formatted = place.formatted_address || place.name
      if (formatted) {
        onChange(formatted)
      }
      if (place) {
        onPlaceSelect?.(place)
      }
    })

    return () => listener.remove()
  }, [autocomplete, onChange, onPlaceSelect])

  return (
    <Input
      ref={inputRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...props}
    />
  )
}

export function AddressAutocomplete({ showMissingKeyHint = true, ...props }: AddressAutocompleteProps) {
  const apiKey = GOOGLE_MAPS_BROWSER_API_KEY
  const { value, onChange, ...rest } = props

  return (
    <div className="space-y-1">
      {apiKey ? (
        <APIProvider apiKey={apiKey} libraries={['places']}>
          <AddressAutocompleteInner value={value} onChange={onChange} {...rest} />
        </APIProvider>
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          {...rest}
        />
      )}
      {!apiKey && showMissingKeyHint && (
        <p className="text-xs text-muted-foreground">
          Autocomplete is unavailable. Add a Google Maps API key to enable address lookup.
        </p>
      )}
    </div>
  )
}
