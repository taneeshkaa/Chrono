'use client'

import { Calendar as CalendarIcon, Clock, Video, Users, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

interface CalendarEvent {
  id: string
  title: string
  time: string
  duration: number
  type: 'meeting' | 'focus' | 'learning' | 'collaboration'
  participants?: string[]
  commitmentId?: string
  date: string
}

interface CalendarViewProps {
  events: CalendarEvent[]
}

export default function CalendarView({ events }: CalendarViewProps) {
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

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
        return 'bg-slate-50 dark:bg-slate-850 border-slate-100 dark:border-slate-700'
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

  const isSameDay = (d1: Date, d2: Date) => 
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear()

  // Date navigation handlers
  const handlePrev = () => {
    const newDate = new Date(selectedDate)
    if (viewMode === 'day') {
      newDate.setDate(selectedDate.getDate() - 1)
    } else if (viewMode === 'week') {
      newDate.setDate(selectedDate.getDate() - 7)
    } else if (viewMode === 'month') {
      newDate.setMonth(selectedDate.getMonth() - 1)
    }
    setSelectedDate(newDate)
  }

  const handleNext = () => {
    const newDate = new Date(selectedDate)
    if (viewMode === 'day') {
      newDate.setDate(selectedDate.getDate() + 1)
    } else if (viewMode === 'week') {
      newDate.setDate(selectedDate.getDate() + 7)
    } else if (viewMode === 'month') {
      newDate.setMonth(selectedDate.getMonth() + 1)
    }
    setSelectedDate(newDate)
  }

  // Group events by time slots for visual timeline (Day view)
  const timeSlots = [
    { label: 'Morning', start: 8, end: 12 },
    { label: 'Afternoon', start: 12, end: 17 },
    { label: 'Evening', start: 17, end: 21 },
  ]

  // Week calculation
  const getStartOfWeek = (d: Date) => {
    const day = d.getDay()
    const diff = d.getDate() - day
    return new Date(d.getFullYear(), d.getMonth(), diff)
  }
  const startOfWeek = getStartOfWeek(selectedDate)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    return d
  })

  // Month calculation
  const year = selectedDate.getFullYear()
  const month = selectedDate.getMonth()
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const monthCells: (Date | null)[] = []
  for (let i = 0; i < firstDayOfMonth; i++) {
    monthCells.push(null)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    monthCells.push(new Date(year, month, d))
  }
  const remainingCells = monthCells.length % 7
  if (remainingCells > 0) {
    for (let i = 0; i < 7 - remainingCells; i++) {
      monthCells.push(null)
    }
  }

  // Filter events for the navigation title text
  const getNavigationLabel = () => {
    if (viewMode === 'day') {
      return selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    }
    if (viewMode === 'week') {
      const start = weekDays[0]
      const end = weekDays[6]
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    }
    return selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  // Filter today's events for day view
  const dayEvents = events.filter(event => isSameDay(new Date(event.date), selectedDate))

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-6 h-full flex flex-col">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Calendar View</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Unified timeline & tasks
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setViewMode('day')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              viewMode === 'day'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Day
          </button>
          <button 
            onClick={() => setViewMode('week')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              viewMode === 'week'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Week
          </button>
          <button 
            onClick={() => setViewMode('month')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              viewMode === 'month'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {/* Date Navigation Bar */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
        <button 
          onClick={handlePrev}
          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer text-slate-600 dark:text-slate-450"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          {getNavigationLabel()}
        </span>
        <button 
          onClick={handleNext}
          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer text-slate-600 dark:text-slate-450"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        {/* DAY VIEW */}
        {viewMode === 'day' && (
          <div className="space-y-4">
            {timeSlots.map((slot) => {
              const slotEvents = dayEvents.filter(event => {
                const hour = parseInt(event.time.split(':')[0])
                return hour >= slot.start && hour < slot.end
              })

              return (
                <div key={slot.label} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="h-6 w-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <Clock className="h-3.5 w-3.5 text-slate-600 dark:text-slate-450" />
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
                          className={`p-4 rounded-xl border transition-all ${getEventTypeColor(event.type)}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1.5">
                                {getEventTypeIcon(event.type)}
                                <span className="text-xs font-semibold text-slate-850 dark:text-slate-250">
                                  {event.time} • {event.duration} min
                                </span>
                              </div>
                              <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                                {event.title}
                              </h4>
                              {event.participants && event.participants.length > 0 && (
                                <div className="flex items-center space-x-2 mt-2">
                                  <div className="flex -space-x-1.5">
                                    {event.participants.slice(0, 3).map((participant, index) => (
                                      <div
                                        key={index}
                                        className="h-5 w-5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center border border-white dark:border-slate-900"
                                        title={participant}
                                      >
                                        <span className="text-[10px] font-medium text-white">
                                          {participant.charAt(0).toUpperCase()}
                                        </span>
                                      </div>
                                    ))}
                                    {event.participants.length > 3 && (
                                      <div className="h-5 w-5 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center border border-white dark:border-slate-900">
                                        <span className="text-[9px] font-medium text-slate-600 dark:text-slate-400">
                                          +{event.participants.length - 3}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-500 dark:text-slate-450">
                                    {event.participants.length} guest{event.participants.length !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              )}
                            </div>
                            {event.commitmentId && (
                              <div className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md flex-shrink-0">
                                <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                                  Task
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl border border-dashed border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
                      <p className="text-xs text-slate-500 dark:text-slate-400 text-center italic">
                        No events
                      </p>
                    </div>
                  )}
                </div>
              )
            })}

            {dayEvents.length === 0 && (
              <div className="text-center py-10">
                <div className="h-12 w-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                  <CalendarIcon className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                </div>
                <h4 className="text-sm font-medium text-slate-900 dark:text-white">Day is clear</h4>
                <p className="text-xs text-slate-500 dark:text-slate-450 mt-1">
                  No scheduled items for this day.
                </p>
              </div>
            )}
          </div>
        )}

        {/* WEEK VIEW */}
        {viewMode === 'week' && (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {weekDays.map((day, idx) => {
              const dayEvents = events.filter(e => isSameDay(new Date(e.date), day))
              const isToday = isSameDay(day, new Date())

              return (
                <div 
                  key={idx} 
                  className={`border rounded-xl p-3 flex flex-col min-h-[160px] ${
                    isToday 
                      ? 'border-blue-200 dark:border-blue-800 bg-blue-50/20 dark:bg-blue-900/5' 
                      : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50'
                  }`}
                >
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-2 flex items-center justify-between">
                    <span className={`text-[10px] font-bold uppercase ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}>
                      {day.toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    <span className={`text-xs font-semibold h-5 w-5 rounded-full flex items-center justify-center ${
                      isToday ? 'bg-blue-600 text-white' : 'text-slate-800 dark:text-slate-200'
                    }`}>
                      {day.getDate()}
                    </span>
                  </div>

                  <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[180px] pr-0.5">
                    {dayEvents.map(e => (
                      <div 
                        key={e.id} 
                        className={`p-1.5 rounded-lg border text-[10px] leading-snug cursor-pointer hover:shadow-sm transition-all ${getEventTypeColor(e.type)}`}
                        onClick={() => {
                          setSelectedDate(day)
                          setViewMode('day')
                        }}
                      >
                        <div className="font-semibold truncate text-slate-900 dark:text-white" title={e.title}>
                          {e.title}
                        </div>
                        <div className="text-[9px] text-slate-500 mt-0.5">{e.time}</div>
                      </div>
                    ))}
                    {dayEvents.length === 0 && (
                      <div className="text-[10px] text-slate-400 dark:text-slate-550 italic text-center py-4">
                        Clear
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* MONTH VIEW */}
        {viewMode === 'month' && (
          <div>
            {/* Week Headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="py-1">{d}</div>
              ))}
            </div>

            {/* Calendar Cells */}
            <div className="grid grid-cols-7 gap-1.5">
              {monthCells.map((cellDate, idx) => {
                if (!cellDate) {
                  return (
                    <div key={idx} className="aspect-square bg-slate-50/30 dark:bg-slate-950/10 rounded-lg border border-transparent"></div>
                  )
                }

                const cellEvents = events.filter(e => isSameDay(new Date(e.date), cellDate))
                const isToday = isSameDay(cellDate, new Date())
                const isSel = isSameDay(cellDate, selectedDate)

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedDate(cellDate)
                      setViewMode('day')
                    }}
                    className={`aspect-square p-2 rounded-lg border flex flex-col justify-between cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800 ${
                      isSel 
                        ? 'border-blue-500 bg-blue-50/10 dark:bg-blue-900/10'
                        : isToday
                          ? 'border-blue-200 dark:border-blue-800 bg-blue-50/20'
                          : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/40'
                    }`}
                  >
                    <span className={`text-[10px] font-semibold h-4 w-4 rounded-full flex items-center justify-center self-end ${
                      isToday ? 'bg-blue-600 text-white' : 'text-slate-700 dark:text-slate-350'
                    }`}>
                      {cellDate.getDate()}
                    </span>

                    {cellEvents.length > 0 && (
                      <div className="flex flex-wrap gap-0.5 justify-center mt-1">
                        {cellEvents.slice(0, 3).map(e => (
                          <span 
                            key={e.id} 
                            className={`h-1.5 w-1.5 rounded-full ${
                              e.type === 'meeting' ? 'bg-blue-500' :
                              e.type === 'focus' ? 'bg-emerald-500' :
                              e.type === 'learning' ? 'bg-purple-500' : 'bg-amber-500'
                            }`}
                            title={e.title}
                          />
                        ))}
                        {cellEvents.length > 3 && (
                          <span className="text-[7px] text-slate-400 font-bold leading-none self-center">+</span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}