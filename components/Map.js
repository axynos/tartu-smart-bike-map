// This is a map component implemented with the pure mapbox-gl library, supports
// Mapbox-gl v2, which supports terrain rendering.
// This is kept for reference, but the actual map component to be used is Map.js

import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import ReactMapGL from 'react-map-gl';
import {StaticMap} from 'react-map-gl';
import DeckGL from '@deck.gl/react';
import { GeoJsonLayer } from '@deck.gl/layers';
import useSWR from 'swr'
import styles from '../styles/Map.module.scss'
import { generateStationsGeoJSON, getStationsGeoJSON } from './data/stations'

const endpoint = 'https://tartu-smart-bikes-webhook.vercel.app/api/bikes'

const MapboxMap = ({ position, zoom, pitch, bearing=0, rotate=false, terrain=false, initialStations }) => {

  const [viewport, setViewport] = React.useState({
    latitude: position[1],
    longitude: position[0],
    zoom: zoom,
    pitch: pitch,
    bearing: bearing,
  });

  // Load sources and add them to the map as layers.
  /*useEffect(_ => {
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
  }, [mapIsMounted])*/

  // Enable camera rotation.
  /*useEffect(() => {
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
  }, [mapIsInitialized])*/

  // Update map with new data when new data has been fetched.
  /*useEffect(_ => {
    if (mapIsMounted && mapIsLoaded && data) {

      Map.getSource('stations').setData(data)
    }
  }, [data])*/

  return (
    <>
      <Head>
        // Preload bike station data for faster data render.
        <link rel="preload" href={endpoint} as="fetch" crossOrigin="anonymous" />
      </Head>

      <StaticMap
        mapboxApiAccessToken='pk.eyJ1Ijoic2lsdmVya3J1dXMiLCJhIjoiY2toYW1rMXk4MWZ4MDJ4bzV1bnZ5YmI2MyJ9.uf-Mz0Hj73G-fNog7k4YqA'
        mapStyle='mapbox://styles/silverkruus/ckhanl4y90ilj18o1waihxjlh?optimize=true'
        style={{
          width: '100%',
          height: '100%'
        }}
        {...viewport}
      />
    </>
  )
}

const DeckGlMap = ({ initialStations }) => {

  // Generate initial data from prefetched stations data.
  const initialData = generateStationsGeoJSON(initialStations)
  const options = {
    initialData: initialData
  }

  const { data, error } = useSWR(endpoint, getStationsGeoJSON, options)

  const INITIAL_VIEW_STATE = {
    latitude: 58.379866,
    longitude: 26.721782,
    zoom: 17,
    bearing: 0,
    pitch: 65
  }

  const deckLayers = [
    // This is the base layer that sets all the stations on the map.
    new GeoJsonLayer({
      id: 'stations',
      data: data,
      // Styles
      filled: true,
      stroked: false,
      pointRadiusMinPixels: 2,
      pointRadiusScale: 4,
      getRadius: f => f.properties.cycleCount,
      getFillColor: [255, 0, 0, 180],
      // Interactive props
      pickable: true,
      autoHighlight: true,
      onClick: info =>
        // eslint-disable-next-line
        info.object && alert(`${info.object.properties.name}`)
    })
  ]

  // Left off trying to combine deck.gl with mapbox-gl v2
  // ViewState matching was my last idea

  return (
    <DeckGL
      initialViewState={INITIAL_VIEW_STATE}
      controller={true}
      layers={deckLayers}>
      <StaticMap
        mapStyle='mapbox://styles/silverkruus/ckhanl4y90ilj18o1waihxjlh?optimize=true'
        mapboxApiAccessToken='pk.eyJ1Ijoic2lsdmVya3J1dXMiLCJhIjoiY2toYW1rMXk4MWZ4MDJ4bzV1bnZ5YmI2MyJ9.uf-Mz0Hj73G-fNog7k4YqA' />
    </DeckGL>
  )
}

export default DeckGlMap
