import dayjs from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween'
import { getStations } from './stations'
import {COORDINATE_SYSTEM} from '@deck.gl/core'
import { PointCloudLayer } from '@deck.gl/layers'

dayjs.extend(isBetween)

export const endpoint = 'https://tartu-smart-bike-data.vercel.app/api/get/between'

const test = {
  time_start: '2020-12-13T00:00:00.000+02:00',
  time_end: '2020-12-14T00:00:00.000+02:00'
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
      station_id: serialNumber,
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

// Generate chunks to be used to display averaged results on the map.
const generateTimeChunks = (start, end, chunkSize=1) => {
  let chunks = []
  const step  = chunkSize
  const chunkCount = end.diff(start, 'hour')

  const chunkIterator = makeChunkIterator(start, end, step)

  let result = chunkIterator.next()
  while (!result.done) {
    chunks = chunks.concat(result.value)
    result = chunkIterator.next()
  }

  return chunks
}

const makeChunkIterator = (start, end, step) => {
  let nextIndex = start

  const iterator = {
    next: _ => {
      if (nextIndex.isBefore(end)) {
        let stop = nextIndex.add(step, 'hour')
        if (nextIndex.add(step, 'hour').isAfter(end)) {
          stop = end
        }

        const chunk = {
          start: nextIndex,
          end: stop
        }

        nextIndex = stop
        return { value: chunk, done: false }
      }
      return { value: undefined, done: true}
    }
  }

  return iterator
}

const calculateChanges = (currentSnapshot, nextSnapshot) => {
  const currentStations = JSON.parse(currentSnapshot.stations)
  const nextStations = JSON.parse(nextSnapshot.stations)

  // This is going to be broken
  const changes = currentStations.map((station, index) => {
    const normalChanges = Math.abs(station.bikes_normal - nextStations[index].bikes_normal)
    const electricChanges = Math.abs(station.bikes_electric - nextStations[index].bikes_electric)

    return {
      name: station.name,
      station_id: station.station_id,
      changes: normalChanges + electricChanges
    }
  })

  return changes
}

// Duration input is given in hours
const calculateVolatility = (snapshots, duration) => {
  const volatilityIterator = makeVolatilityIterator(0, snapshots)

  let volatility = volatilityIterator.next()
  while (!volatility.done) {
    volatility = volatilityIterator.next()
  }

  const averageVolatilityOverTime = volatility.value.map(station => {
    station.volatility = (station.changes / duration).toFixed(3)

    return station
  })

  return averageVolatilityOverTime
}

const makeVolatilityIterator = (start=0, snapshots) => {
  let nextIndex = start

  const stations = snapshots[nextIndex].stations
  let accumulator = undefined

  const iterator = {
    next: _ => {
      // Continue if next sample is available.
      if (snapshots[nextIndex+1]) {
        const currentSnapshot = snapshots[nextIndex]
        const nextSnapshot = snapshots[nextIndex+1]

        const changes = calculateChanges(currentSnapshot, nextSnapshot)

        nextIndex += 1
        if (accumulator == undefined) {
          accumulator = changes
        } else {
          // This accumulator update method is inefficient, but I'm too tired to
          // think up a better solution.
          for (const changedStation of changes) {
            for (const station of accumulator) {
              if (station.station_id == changedStation.station_id) {
                station.changes += changedStation.changes
              }
            }
          }
        }

        return { value: nextIndex, done: false }
      }

      return { value: accumulator, done: true}
    }
  }

  return iterator
}

const generatePointCloudData = (data, locationStations) => {
  const timelineHeight = 675 //meters
  const chunkCount = data.length
  let pointSizeMap = {}

  data.forEach((chunk, index) => {
    const { volatility } = chunk

    const altitude = (index/chunkCount*timelineHeight)+75

    volatility.forEach(station => {
      const locationStation = locationStations.filter(_station => {
        return _station.station_id == station.station_id
      })[0]

      const { longitude, latitude } = locationStation
      //console.log(locationStation);

      const point = {
        position: [longitude, latitude, altitude],
        color: [58, 160, 255, 180]
      }

      if (pointSizeMap[station.volatility]) {
        const points = pointSizeMap[station.volatility].points

        pointSizeMap[station.volatility].points = points.concat(point)
      } else {
        pointSizeMap[station.volatility] = {
          pointSize: station.volatility*20,
          points: [point]
        }
      }

      //console.log(point)
    })
  })

  return pointSizeMap
}

export const generatePointCloudLayers = pointSizeMap => {
  let layers = []

  for (const pointType in pointSizeMap) {
    const pointSize = pointSizeMap[pointType].pointSize
    const points = pointSizeMap[pointType].points

    const layer = new PointCloudLayer({
      id: `pointcloud-${pointType}`,
      data: points,
      pointSize: Math.sqrt(pointSize),
      getColor: d => d.color
    })

    layers = layers.concat(layer)
  }

  return layers
}

// Chunk size is given in hours.
export const getTimelinePointCloudData = async (start_str = test.time_start, end_str = test.time_end, chunkSize=1) => {
  const start = dayjs(start_str)
  const end = dayjs(end_str)

  const snapshots = await getSnapshots(start, end)
  const locationStations = await getStationLocations()

  const timeChunks = generateTimeChunks(start, end, chunkSize)

  const volatilityChunks = timeChunks.map(timeChunk => {
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
      volatility: volatility
    }
  })

  const pointCloudData = generatePointCloudData(volatilityChunks, locationStations)

  //console.log(layers)
  //console.log(pointCloudData);

  return pointCloudData
}
