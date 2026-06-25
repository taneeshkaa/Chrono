'use client'

import { Calendar as CalendarIcon, Clock, Video, Users, BookOpen } from 'lucide-react'

interface CalendarEvent {
  id: string
  title: string
  time: string
  duration: number
  type: 'meeting' | 'focus' | 'learning' | 'collaboration'
  participants?: string[]
  commitmentId?: string
}

interface CalendarViewProps {
  events: CalendarEvent[]
}

export default function CalendarView({ events }: CalendarViewProps) {
  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'meeting':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800'
      case 'focus':
        return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800'
      case 'learning':
        return 'bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800'
      case 'collaboration':
        return 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800'
      default:
        return 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700'
    }
  }

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'meeting':
        return <Video className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
      case 'focus':
        return <BookOpen className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
      case 'learning':
        return <BookOpen className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
      case 'collaboration':
        return <Users className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
      default:
        return <CalendarIcon className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
    }
  }

  // Group events by time slots for visual timeline
  const timeSlots = [
    { label: 'Morning', start: 8, end: 12 },
    { label: 'Afternoon', start: 12, end: 17 },
    { label: 'Evening', start: 17, end: 21 },
  ]

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Calendar View</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Today&apos;s schedule timeline
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button className="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
            Day
          </button>
          <button className="px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
            Week
          </button>
          <button className="px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
            Month
          </button>
        </div>
      </div>

      {/* Visual Timeline */}
      <div className="space-y-4">
        {timeSlots.map((slot) => {
          const slotEvents = events.filter(event => {
            const hour = parseInt(event.time.split(':')[0])
            return hour >= slot.start && hour < slot.end
          })

          return (
            <div key={slot.label} className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="h-6 w-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Clock className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                </div>
                <h4 className="text-sm font-medium text-slate-900 dark:text-white">
                  {slot.label} ({slot.start}:00 - {slot.end}:00)
                </h4>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {slotEvents.length} event{slotEvents.length !== 1 ? 's' : ''}
                </span>
              </div>

              {slotEvents.length > 0 ? (
                <div className="space-y-2">
                  {slotEvents.map((event) => (
                    <div
                      key={event.id}
                      className={`p-4 rounded-xl border ${getEventTypeColor(event.type)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            {getEventTypeIcon(event.type)}
                            <span className="text-sm font-medium text-slate-900 dark:text-white">
                              {event.time} • {event.duration} min
                            </span>
                          </div>
                          <h4 className="font-medium text-slate-900 dark:text-white">
                            {event.title}
                          </h4>
                          {event.participants && event.participants.length > 0 && (
                            <div className="flex items-center space-x-2 mt-3">
                              <div className="flex -space-x-2">
                                {event.participants.slice(0, 3).map((participant, index) => (
                                  <div
                                    key={index}
                                    className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center border-2 border-white dark:border-slate-900"
                                  >
                                    <span className="text-xs font-medium text-white">
                                      {participant.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                ))}
                                {event.participants.length > 3 && (
                                  <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center border-2 border-white dark:border-slate-900">
                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                      +{event.participants.length - 3}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                {event.participants.length} participant{event.participants.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                        </div>
                        {event.commitmentId && (
                          <div className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                              Linked
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
                    No scheduled events in this time slot
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {events.length === 0 && (
        <div className="text-center py-12">
          <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <CalendarIcon className="h-8 w-8 text-slate-400 dark:text-slate-600" />
          </div>
          <h4 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Calendar is clear</h4>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Your calendar matches your commitments. No time conflicts detected.
          </p>
        </div>
      )}
    </div>
  )
}