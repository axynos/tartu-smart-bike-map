import Head from 'next/head'
import styles from '../styles/Home.module.scss'
import dynamic from 'next/dynamic'

const Map = dynamic(
  () => import('../components/Map'),
  { ssr: false }
)

const Home = () => {
  return (
    <div className={styles.container}>
      <Head>
        <title>Tartu Smart Bike mapping project</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <Map position={[58.370, 26.725]} zoom={12.15}>

        </Map>

      </main>
    </div>
  )
}

export default Home
