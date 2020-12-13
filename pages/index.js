import styles from '../styles/Home.module.scss'
import Map from '../components/Map'
import Head from 'next/head'
import { getStations } from '../components/data/stations'

const Home = props => {

  return (
    <div className={styles.container}>
      <Head>
        <title>Tartu Smart Bike Live Map</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <Map initialStations={props.initialStations}/>
      </main>
    </div>
  )
}

export default Home

export const getServerSideProps = async (context) => {
  // TODO: Offload the geojson generation to the client after load.
  const initialStations = await getStations()

  return { props: { initialStations } }
}
