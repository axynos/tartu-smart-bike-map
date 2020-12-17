import dayjs from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween'
import { getStations } from './stations'

dayjs.extend(isBetween)

export const endpoint = 'https://tartu-smart-bike-data.vercel.app/api/get'

const test = {
  time_start: '2020-12-13T10:00:00.000+02:00'
}

const getStationLocations = async _ => {
  const data = await fetch('https://tartu-smart-bikes-webhook.vercel.app/api/bikes').then(r => r.json())

  const cleanStations = data.map(station => {
    const { name, serialNumber, area } = station

    let longitude = area.longitude
    let latitude = area.latitude


    // Stations with a location defined as a GeoPolygon don't have explicit coordinates
    // for the centre of the dock, so we find the center of the given GeoPolygon instead.
    if (area['@class'] == 'GeoPolygon') {
      const longitudeSum = area.points.map(point => {
        if (point.longitude) {
          return point.longitude
        }
      }).reduce((sum, current) => sum + current, 0)

      const latitudeSum = area.points.map(point => {
        if (point.latitude) {
          return point.latitude
        }
      }).reduce((sum, current) => sum + current, 0)

      longitude = longitudeSum / area.points.length
      latitude = latitudeSum / area.points.length
    }

    const cleanStation = {
      name: name,
      id: serialNumber,
      latitude: latitude,
      longitude: longitude
    }

    return cleanStation
  })

  return cleanStations
}

// Gets all snapshots from database between the given two dates.
const getSnapshots = async (start, end) => {
  // Vercel has a function payload limit of 5MB, so adjust for that by
  // splitting up the requests into smaller chunks.
  // https://vercel.com/docs/platform/limits#serverless-function-payload-size-limit
  const requestChunks = generateTimeChunks(start, end, 6)

  //console.log(requestChunks)

  const data = await Promise.all(requestChunks.map(async chunk => {
    const body = {
      'time_start': chunk.start.format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
      'time_end': chunk.end.format('YYYY-MM-DDTHH:mm:ss.SSSZ')
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    }).then(r => r.json())

    return response
  }))

  // Data comes back as array of arrays, this flattens it to array of snapshots.
  const snapshots = data.flat(1)

  return snapshots
}

// Chunk size is given in hours.
export const generateGeoJson = async (start_str = test.time_start) => {
  const start = dayjs(start_str)
  const end = dayjs(end_str)

  const snapshots = await getSnapshots(start, end)
  const locations = await getStationLocations()

  const timeChunks = generateTimeChunks(start, end, chunkSize)

  const chunks = timeChunks.map(timeChunk => {
    let includedSnapshots = []
    for (const snapshot of snapshots) {
      const timestamp = dayjs(snapshot.timestamp)

      if (timestamp.isBetween(timeChunk.start, timeChunk.end)) {
        includedSnapshots = includedSnapshots.concat(snapshot)
      }
    }

    const volatility = calculateVolatility(includedSnapshots, chunkSize)

    return {
      start: timeChunk.start,
      end: timeChunk.end,
      snapshots: includedSnapshots,
      volatility:
    }
  })

  const pointCloudData = {}

  return pointCloudData
}
