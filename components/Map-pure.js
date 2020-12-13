// This is a map component implemented with the pure mapbox-gl library, supports
// Mapbox-gl v2, which supports terrain rendering.
// This is kept for reference, but the actual map component to be used is Map.js

import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer } from '@deck.gl/layers';
import mapboxgl from 'mapbox-gl'
import useSWR from 'swr'
import styles from '../styles/Map.module.scss'
import { generateStationsGeoJSON, getStationsGeoJSON } from './data/stations'

const endpoint = 'https://tartu-smart-bikes-webhook.vercel.app/api/bikes'

const MapboxMap = ({ position, zoom, pitch, bearing=0, rotate=false, terrain=false, initialStations }) => {

  // Generate initial data from prefetched stations data.
  const initialData = generateStationsGeoJSON(initialStations)
  const options = {
    initialData: initialData
  }

  const { data, error } = useSWR(endpoint, getStationsGeoJSON, options)

  // Lifecycle management for the Mapbox component so we can avoid loading data at the wrong time.
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
        // Interactivity is turned off because deck.gl handles the interactivity.
        interactive: true
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
  useEffect(() => {
    if (mapIsMounted && mapIsInitialized && rotate) {
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
  }, [mapIsInitialized])

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

const DeckGlMap = ({ position, zoom, pitch, bearing=0, rotate=false, terrain=false, initialStations }) => {

  const INITIAL_VIEW_STATE = {
    latitude: position[1],
    longitude: position[0],
    zoom: zoom,
    bearing: bearing,
    pitch: pitch
  }

  const deckLayers = [
    new GeoJsonLayer({
      id: 'test',
      data: data,
      // Styles
      filled: true,
      pointRadiusMinPixels: 2,
      pointRadiusScale: 1,
      getRadius: f => 1,
      getFillColor: [200, 0, 80, 180],
      // Interactive props
      pickable: true,
      autoHighlight: true,
      onClick: info =>
        // eslint-disable-next-line
        info.object && alert(`${info.object.properties.name} (${info.object.properties.abbrev})`)
    })
  ]

  // Left off trying to combine deck.gl with mapbox-gl v2
  // ViewState matching was my last idea

  return (
    <MapboxMap position={[26.721782, 58.379866]} zoom={17} pitch={70} initialStations={props.initialStations} />

  )
}

/*<DeckGL
  initialViewState={INITIAL_VIEW_STATE}
  controller={true}
  layers={deckLayers}>
</DeckGL>*/

export default MapboxMap
