import { useState } from 'react'
import type { TabType } from './Sidebar'

type Props = {
  activeTab: TabType
  onSelectTab: (tab: TabType) => void
  onCloseTour: () => void
}

const TOUR_STEPS = [
  {
    step: 1,
    tab: 'overview' as TabType,
    title: 'Welcome',
    body: 'This is the dashboard where you can view and manage all incoming orders, truck availability, and logistics status.',
    positionClass: 'top-20 left-24',
  },
  {
    step: 2,
    tab: 'routes' as TabType,
    title: 'Vehicles & Route Planning',
    body: 'You can see the list of vehicles that appears here. You can also search for the vehicles and also change the routes by selecting.',
    positionClass: 'top-28 left-80',
  },
  {
    step: 3,
    tab: 'load' as TabType,
    title: 'Load Management & Axle Balancing',
    body: 'Visualize truck capacity, 100KG and 200KG weight blocks, and assign cargo orders into available slots interactively.',
    positionClass: 'top-32 left-1/3',
  },
  {
    step: 4,
    tab: 'tracking' as TabType,
    title: 'Status & Live GPS Telemetry',
    body: 'You can see the status of the vehicle and track over here along with the visual representation. The time left and detailed track information also.',
    positionClass: 'top-24 left-1/3',
  },
  {
    step: 5,
    tab: 'dispatch' as TabType,
    title: 'AI Tech Engine & Geopolitical Dispatch',
    body: 'Powered by LLaMA 3.1 8B: predicts transit time in days/hours, models geopolitical risks, and ensures safe warehouse capacity.',
    positionClass: 'top-24 left-1/4',
  },
]

export default function GuidedTour({ onSelectTab, onCloseTour }: Props) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  const currentTour = TOUR_STEPS[currentStepIndex]

  function handleNext() {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      const nextIndex = currentStepIndex + 1
      setCurrentStepIndex(nextIndex)
      onSelectTab(TOUR_STEPS[nextIndex].tab)
    } else {
      onCloseTour()
    }
  }

  function handlePrevious() {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1
      setCurrentStepIndex(prevIndex)
      onSelectTab(TOUR_STEPS[prevIndex].tab)
    }
  }

  return (
    <div className={`fixed z-50 ${currentTour.positionClass} max-w-sm w-80 animate-in fade-in zoom-in-95 duration-200 select-none shadow-2xl`}>
      <div className="bg-blue-600 text-white rounded-2xl p-4 shadow-xl border border-blue-400 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-1.5">
          <h4 className="text-xs font-bold tracking-tight text-white">{currentTour.title}</h4>
          <button
            type="button"
            onClick={onCloseTour}
            className="text-white/70 hover:text-white text-xs font-bold leading-none p-1 rounded-md"
            title="Dismiss Tour"
          >
            ✕
          </button>
        </div>

        {/* Body Text */}
        <p className="text-[11px] text-blue-100 leading-relaxed mb-3">
          {currentTour.body}
        </p>

        {/* Footer with Step Counter and Next/Previous Buttons */}
        <div className="flex items-center justify-between pt-2.5 border-t border-blue-500/60 text-xs font-medium">
          <span className="text-blue-200 font-mono text-[11px]">
            {currentTour.step} / {TOUR_STEPS.length}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentStepIndex === 0}
              className="text-blue-200 hover:text-white disabled:opacity-40 text-xs px-2 py-0.5"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="bg-white hover:bg-blue-50 text-blue-600 font-bold px-3 py-1 rounded-lg text-xs shadow-xs transition-colors"
            >
              {currentStepIndex === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

