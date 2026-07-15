import './globals.css'

export const metadata = {
  title: 'ReferEase — Ontario Healthcare Referral Platform',
  description: 'Find the right provider. Reduce referral rejections. Thornhill, ON pilot.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
