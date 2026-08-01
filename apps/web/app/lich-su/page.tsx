import HistoryClient from './client'
import { getWatchHistory } from './actions'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Lịch sử xem',
    description: 'Lịch sử xem phim của bạn trên ToTo TAD Cinema.',
}

export default async function HistoryPage() {
    const history = await getWatchHistory()
    const initialHistory = history.map((item) => ({
        movie_slug: item.movie_slug,
        movie_title: item.movie_title ?? item.movie_slug,
        poster_url: item.poster_url ?? "",
        episode_slug: item.episode_slug ?? "",
        episode_name: item.episode_name ?? "",
        duration: Number(item.duration ?? 0),
        playback_time: Number(item.playback_time ?? 0),
        updated_at: item.updated_at,
    }))

    return <HistoryClient initialHistory={initialHistory} />
}
