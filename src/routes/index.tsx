import { createFileRoute } from '@tanstack/react-router'
import { Canvas } from '../components/Canvas'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <main className="w-full h-screen overflow-hidden">
      <Canvas />
    </main>
  )
}
