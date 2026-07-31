import FavoritesClient from './client'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Phim yêu thích | ToTo TAD Media',
    description: 'Danh sách phim yêu thích của bạn trên ToTo TAD Media.',
}

export default async function FavoritesPage() {
    return <FavoritesClient initialFavorites={[]} />
}
