import FavoritesClient from './client'
import { getFavorites } from './actions'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Phim yêu thích',
    description: 'Danh sách phim yêu thích của bạn trên ToTo TAD Cinema.',
}

export default async function FavoritesPage() {
    const favorites = await getFavorites()
    const initialFavorites = favorites.map((favorite) => ({
        movie_slug: favorite.movie_slug,
        movie_title: favorite.movie_title ?? favorite.movie_slug,
        poster_url: favorite.poster_url ?? "",
    }))

    return <FavoritesClient initialFavorites={initialFavorites} />
}
