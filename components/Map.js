import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import useSWR from 'swr'
import mapboxgl from 'mapbox-gl/dist/mapbox-gl.js'
import { generateStationsGeoJSON, getStationsGeoJSON } from './data/stations'
import styles from '../styles/Map.module.scss'

const endpoint = 'https://tartu-smart-bikes-webhook.vercel.app/api/bikes'

const MapboxMap = ({ position, zoom, pitch, rotate=false, terrain=false, initialStations }) => {

  // Generate initial data from prefetched stations data.
  const initialData = generateStationsGeoJSON(initialStations)
  const options = {
    initialData: initialData
  }

  const { data, error } = useSWR(endpoint, getStationsGeoJSON, options)

  const [mapIsMounted, setMapIsMounted] = useState(false)
  const [mapIsInitialized, setMapIsInitialized] = useState(false)

  // https://dev.to/naomigrace/how-to-integrate-mapbox-gl-js-in-your-next-js-project-without-react-map-gl-or-a-react-wrapper-library-50f
  const [Map, setMap] = useState()

  // Create a map after component mounts.
  // https://docs.mapbox.com/help/troubleshooting/mapbox-gl-js-performance/#remove-unused-features
  useEffect(_ => {
      const map = new mapboxgl.Map({
        accessToken: 'pk.eyJ1Ijoic2lsdmVya3J1dXMiLCJhIjoiY2toYW1rMXk4MWZ4MDJ4bzV1bnZ5YmI2MyJ9.uf-Mz0Hj73G-fNog7k4YqA',
        container: 'map',
        zoom: zoom,
        center: position,
        pitch: pitch,
        style: 'mapbox://styles/silverkruus/ckhanl4y90ilj18o1waihxjlh?optimize=true',
        hash: true
      })

      setMapIsMounted(true)
      setMap(map)
  }, [])

  // Load sources and add them to the map as layers.
  useEffect(_ => {
    if (mapIsMounted) {
      Map.once('load', () => {
        Map.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 22,
          tolerance: 1
        })

        // Initialize stations data source with prefetched data.
        Map.addSource('stations', {
          type: 'geojson',
          data: initialData
        })

        if (terrain) {
          // Enable 3D terrain rendering. Will cause less powerful devices to come to a crawl.
          Map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 2.5 })
        }

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
            'circle-radius': ['get', 'circle-radius'],
            'circle-color': '#FF0000'
          }
        })

        setMapIsInitialized(true)
      })
    }
  }, [mapIsMounted])

  // Enable camera rotation.
  /*useEffect(() => {
    if (pageIsMounted && mapIsLoaded && rotate) {
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
  }, [mapIsLoaded])*/

  // Update map with new data when new data has been fetched.
  useEffect(_ => {
    if (mapIsMounted && mapIsLoaded && data) {

      Map.getSource('stations').setData(data)
    }
  }, [data])

  return (
    <>
      <Head>
        // Preload bike station data for faster data render.
        <link rel="preload" href={endpoint} as="fetch" crossOrigin="anonymous" />
      </Head>
      <div id="map" className={styles['map-container']}/>
    </>
  )
}

export default MapboxMap
