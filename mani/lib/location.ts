import * as Location from 'expo-location'
import { MINUTE_MS } from 'common/util/time'

type GPSData = {
  Latitude: number
  Longitude: number
  Altitude: number | null
  Radius: number | null
  Speed: number | null
  DateTime: string
}

export const checkLocationPermission = async () => {
  const { status } = await Location.getForegroundPermissionsAsync()
  return status
}

export const getLocation = async () => {
  const error =
    'Permission to access location was denied, please enable it in settings.'
  const status = await checkLocationPermission()
  if (status === 'denied') {
    console.log('Permission to access location was denied')
    return {
      error,
    }
  }

  if (status === 'undetermined') {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') {
      return { error }
    }
  }

  let location = await Location.getLastKnownPositionAsync({
    maxAge: 20 * MINUTE_MS,
  })
  if (!location) location = await Location.getCurrentPositionAsync({})

  return {
    Latitude: location.coords.latitude,
    Longitude: location.coords.longitude,
    Altitude: location.coords.altitude,
    Radius: location.coords.accuracy,
    DateTime: new Date(location.timestamp).toISOString(),
    Speed: location.coords.speed,
  } as GPSData
}
