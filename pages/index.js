import Head from 'next/head'
import styles from '../styles/Home.module.scss'
//import dynamic from 'next/dynamic'
//import { Source, Layer } from 'react-map-gl'
import { fromJS } from 'immutable'
import useSWR from 'swr'
import mapboxgl from 'mapbox-gl/dist/mapbox-gl.js'
import React, { useState, useEffect } from 'react'

const endpoint = 'https://tartu-smart-bikes-webhook.vercel.app/api/bikes'

/*const Map = dynamic(
  () => import('../components/Map'),
  { ssr: false }
)*/

const getStations = async url => {
  const data = await fetch(url).then(r => r.json())

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


    // Stations with a location defined as a GeoPolygon don't have coordinates
    // for the centre of the dock, so we find the center of the polygon instead.
    if (station.area['@class'] == 'GeoPolygon') {
      const longitudes = station.area.points.map(point => {
        if (point.longitude) {
          return point.longitude
        }
      })

      const latitudes = station.area.points.map(point => {
        if (point.latitude) {
          return point.latitude
        }
      })

      const longitudeSum = longitudes.reduce((sum, current) => sum + current, 0)
      const latitudeSum = latitudes.reduce((sum, current) => sum + current, 0)

      longitude = longitudeSum / longitudes.length
      latitude = latitudeSum / latitudes.length
    }

    const feature = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [ longitude, latitude ]
      },
      properties: {
        name: station.name,
        radius: station.area.radius*15000,
        cycleCount: Math.sqrt(station.cycleCount)*2
      }
    }

    return feature
  })

  /*const geojson = fromJS({
    type: 'FeatureCollection',
    features: features
  })*/

  const geojson = {
    type: 'FeatureCollection',
    features: features
  }

  return geojson
}

mapboxgl.accessToken = 'pk.eyJ1Ijoic2lsdmVya3J1dXMiLCJhIjoiY2toYW1rMXk4MWZ4MDJ4bzV1bnZ5YmI2MyJ9.uf-Mz0Hj73G-fNog7k4YqA'


const Home = props => {
  //console.log(props);

  // Set initial data to be given to the MapBox layer to avoid an error.
  const options = {
    initialData: props.initialData
  }
  const { data, error } = useSWR(endpoint, getStations, options)

  const [pageIsMounted, setPageIsMounted] = useState(false)
  const [mapIsLoaded, setMapIsLoaded] = useState(false)

  // https://dev.to/naomigrace/how-to-integrate-mapbox-gl-js-in-your-next-js-project-without-react-map-gl-or-a-react-wrapper-library-50f
  const [Map, setMap] = useState()

  useEffect(_ => {
      const map = new mapboxgl.Map({
        container: 'map',
        zoom: 17,
        // Tartu Town Hall
        center: [26.721782, 58.379866],
        pitch: 70,
        style: 'mapbox://styles/silverkruus/ckhanl4y90ilj18o1waihxjlh'
      })

      setPageIsMounted(true)
      setMap(map)
  }, [])

  useEffect(_ => {
    if (pageIsMounted) {
      Map.once('load', () => {
        Map.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 22
        })

        // Does the map automatically update when the data changes?
        Map.addSource('stations', {
          type: 'geojson',
          data: data
        })

        // Enable 3D terrain rendering. Comment out if expecting to run on less powerful hardware.
        //Map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 2.5 })

        Map.addLayer({
          id: 'sky',
          type: 'sky',
          paint: {
            'sky-type': 'atmosphere',
            'sky-atmosphere-sun': [0.0, 0.0],
            'sky-atmosphere-sun-intensity': 15
          }
        })

        Map.addLayer({
          id: 'stations',
          source: 'stations',
          type: 'circle',
          paint: {
            'circle-radius': ['get', 'cycleCount'],
            'circle-color': '#FF0000'
          }
        })

        setMapIsLoaded(true)
      })
    }
  }, [pageIsMounted, setMap, Map])

  useEffect(() => {
    if (pageIsMounted && mapIsLoaded) {
      Map.on('idle', () => {
        const rotateCamera = timestamp => {
          // clamp the rotation between 0 -360 degrees
          // Divide timestamp by 100 to slow rotation to ~10 degrees / sec
          Map.rotateTo((timestamp / 1000) % 360, { duration: 0 });

          // Request the next frame of the animation.
          requestAnimationFrame(rotateCamera);
        }

        // Start camera rotate animation.
        //rotateCamera(0)
      })
    }
  }, [mapIsLoaded])

  // Update map with new data when new data has been fetched.
  useEffect(_ => {
    if (pageIsMounted && mapIsLoaded) {
      //console.log(data)
      Map.getSource('stations').setData(data)
    }
  }, [data])

  return (
    <div className={styles.container}>
      <Head>
        <title>Tartu Smart Bike Live Map</title>
        <link rel="icon" href="/favicon.ico" />

        // Preload bike station data for faster data render.
        <link rel="preload" href={endpoint} as="fetch" crossOrigin="anonymous" />
      </Head>

      <main className={styles.main}>
        {/*<Map position={[58.370, 26.725]} zoom={12.15}>
          {data ?
            <Source id="stations" type="geojson" data={data}>
              <Layer
                id="point"
                type="circle"
                paint={{
                  'circle-radius': ['get', 'cycleCount'],
                  'circle-color': '#FF0000'
                }} />
            </Source>
            : ''}
          <Layer
            id="building-extrusion-custom"
            type="fill-extrusion" />
        </Map>*/}
        <div id="map" style={{ height: '100%', width: '100%' }}/>

      </main>
    </div>
  )
}

export const getServerSideProps = async context => {
  // TODO: Offload the geojson generation to the client after load.
  const initialData = await getStations(endpoint)

  const test = {
    type: 'FeatureCollection',
    features: []
  }

  return { props: { initialData: initialData } }
}

export default Home
