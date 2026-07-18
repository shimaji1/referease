import './globals.css'

export const metadata = {
  title: 'ReferEase — Ontario Healthcare Referral Platform',
  description: 'Cut your referral rejections to zero. Find the right specialist, first time, every time.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">{children}</body>
    </html>
  )
}
