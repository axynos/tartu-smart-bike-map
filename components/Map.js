import Head from 'next/head'
import { StaticMap } from 'react-map-gl';
import DeckGL from '@deck.gl/react';
import { MapView } from '@deck.gl/core'
import styles from '../styles/Map.module.scss'
import { useState, useRef } from 'react'

const DeckGlMap = ({ children, layers=[], endpoint, style={} }) => {

  const INITIAL_VIEW_STATE = {
    latitude: 58.379866,
    longitude: 26.721782,
    zoom: 17,
    bearing: 0,
    pitch: 60
  }

  const [mapLoaded, setMapLoaded] = useState(false)
  const mapRef = useRef(null)

  const onMapLoad = _ => {
    setMapLoaded(true)

    const map = mapRef.current.getMap()

    // Deck.GL doesn't automatically adjust to the terrain layer
    // implemented by Mapbox GL JS v2 yet. Disable terrain in the meantime.
    /*map.addSource('mapbox-dem', {
      'type': 'raster-dem',
      'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
      'tileSize': 512,
      'maxzoom': 14
    })*/

    //map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 2.5 })

    map.addLayer({
      'id': 'sky',
      'type': 'sky',
      'paint': {
        'sky-type': 'atmosphere',
        'sky-atmosphere-sun': [0.0, 0.0],
        'sky-atmosphere-sun-intensity': 15
      }
    })
  }

  const loadedClassName = mapLoaded ? styles.loaded : styles.loading

  return (
    <>
      <Head>
        // Preload bike station data for faster data render.
        <link rel="preload" href={endpoint} as="fetch" crossOrigin="anonymous" />
      </Head>
      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={layers}
        style={style}>
        <MapView id="map" width="100%" height="100%" controller={true} maxPitch={85}>
          <StaticMap
          ref={mapRef}
          className={loadedClassName}
          width='100%'
          height='100%'
          onLoad={onMapLoad}
          attributionControl={false}
          mapStyle='mapbox://styles/silverkruus/ckhanl4y90ilj18o1waihxjlh?optimize=true'
          mapboxApiAccessToken='pk.eyJ1Ijoic2lsdmVya3J1dXMiLCJhIjoiY2toYW1rMXk4MWZ4MDJ4bzV1bnZ5YmI2MyJ9.uf-Mz0Hj73G-fNog7k4YqA'/>
        </MapView>
        {children}
      </DeckGL>
    </>
  )
}

export default DeckGlMap
