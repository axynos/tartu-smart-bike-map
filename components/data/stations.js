export const endpoint = 'https://tartu-smart-bikes-webhook.vercel.app/api/bikes'

export const getStations = async (url=endpoint) => {
  const data = await fetch(url).then(r => r.json())
  return data
}

export const generateStationsGeoJSON = data => {
  const cleanStations = data.map(station => {
    const { name, serialNumber, area, totalLockedCycleCount } = station

    const cleanStation = {
      name: name,
      id: serialNumber,
      area: area,
      cycleCount: totalLockedCycleCount
    }

    return cleanStation
  })

  const features = cleanStations.map(station => {
    let longitude = station.area.longitude
    let latitude = station.area.latitude


    // Stations with a location defined as a GeoPolygon don't have explicit coordinates
    // for the centre of the dock, so we find the center of the given GeoPolygon instead.
    if (station.area['@class'] == 'GeoPolygon') {
      const longitudeSum = station.area.points.map(point => {
        if (point.longitude) {
          return point.longitude
        }
      }).reduce((sum, current) => sum + current, 0)

      const latitudeSum = station.area.points.map(point => {
        if (point.latitude) {
          return point.latitude
        }
      }).reduce((sum, current) => sum + current, 0)

      longitude = longitudeSum / station.area.points.length
      latitude = latitudeSum / station.area.points.length
    }

    const feature = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [ longitude, latitude ]
      },
      properties: {
        name: station.name,
        cycleCount: station.cycleCount,
        'circle-radius': Math.sqrt(station.cycleCount*5)
      }
    }

    return feature
  })

  const geoJson = {
    type: 'FeatureCollection',
    features: features
  }

  return geoJson
}

export const getStationsGeoJSON = async (url=endpoint) => {
  const data = await getStations(url)
  const geoJson = generateStationsGeoJSON(data)

  return geoJson
}
