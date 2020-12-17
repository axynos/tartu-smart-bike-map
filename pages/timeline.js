import styles from '../styles/Home.module.scss'
import Map from '../components/Map'
import Head from 'next/head'
import { endpoint, getTimelinePointCloudData, generatePointCloudLayers } from '../components/data/timeline'
import { getStations, getStationsGeoJSON, generateStationsGeoJSON } from '../components/data/stations'
import Link from 'next/link'
import { useState } from 'react'
import { GeoJsonLayer } from '@deck.gl/layers';

const Timeline = props => {

  const pointCloudLayers = generatePointCloudLayers(props.pointCloudData)
  const baseStations = generateStationsGeoJSON(props.baseStations)
  //console.log(pointCloudLayers)

  const stationsLayer = new GeoJsonLayer({
    id: 'stations',
    data: baseStations,
    // Styles
    filled: true,
    stroked: false,
    pointRadiusMinPixels: 2,
    pointRadiusScale: 4,
    getRadius: f => 5,
    getFillColor: [58, 160, 255, 180],
    // Interactive props
    pickable: true,
    autoHighlight: true,
    onClick: info =>
      // eslint-disable-next-line
      info.object && alert(`${info.object.properties.name}`)
  })

  const layers = [...pointCloudLayers, stationsLayer]

  return (
    <div className={styles.container}>
      <Head>
        <title>Tartu Smart Bike Live Map</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        {/*Set position to relative so that the map can be put into a grid.*/}
        <Map layers={layers} style={{ position: 'relative' }}/>
      </main>
    </div>
  )
}

export default Timeline

export const getServerSideProps = async (context) => {
  const pointCloudData = await getTimelinePointCloudData()
  const baseStations = await getStations()

  return { props: { pointCloudData: pointCloudData, baseStations: baseStations } }
}
