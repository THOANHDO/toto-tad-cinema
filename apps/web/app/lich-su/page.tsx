import HistoryClient from './client'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Lịch sử xem | ToTo TAD Media',
    description: 'Lịch sử xem phim của bạn trên ToTo TAD Media.',
}

export default async function HistoryPage() {
    return <HistoryClient initialHistory={[]} />
}
