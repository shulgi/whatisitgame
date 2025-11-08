import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'What Is It? - Guessing Game',
  description: 'Guess mystery objects from r/whatisthisthing with semantic similarity feedback',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
