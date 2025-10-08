export const metadata = {
  title: 'StartupQuest AI',
  description: 'Learn AI + entrepreneurship through quests.'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header style={{ padding: 16 }}>
          <strong>StartupQuest AI</strong>
        </header>
        <main style={{ padding: 16 }}>{children}</main>
      </body>
    </html>
  )
}

