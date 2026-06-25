'use client'

import { Bell, CheckCircle, AlertTriangle, Calendar, Zap, X, ChevronRight } from 'lucide-react'
import { useState } from 'react'

interface Notification {
  id: string
  title: string
  message: string
  type: 'reminder' | 'warning' | 'success' | 'info' | 'alert'
  timestamp: string
  isRead: boolean
  commitmentId?: string
}

interface NotificationTrayProps {
  notifications: Notification[]
  onDismiss?: (id: string) => void
  onMarkAllRead?: () => void
  onClearAll?: () => void
}

export default function NotificationTray({ 
  notifications,
  onDismiss,
  onMarkAllRead,
  onClearAll 
}: NotificationTrayProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const unreadCount = notifications.filter(n => !n.isRead).length

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />
      case 'alert':
        return <AlertTriangle className="h-4 w-4 text-rose-500" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-emerald-500" />
      case 'reminder':
        return <Calendar className="h-4 w-4 text-blue-500" />
      default:
        return <Bell className="h-4 w-4 text-slate-500" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800'
      case 'alert':
        return 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800'
      case 'success':
        return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800'
      case 'reminder':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800'
      default:
        return 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700'
    }
  }

  if (isCollapsed) {
    return (
      <div className="fixed right-0 top-1/2 transform -translate-y-1/2">
        <button
          onClick={() => setIsCollapsed(false)}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-l-lg p-3 shadow-lg cursor-pointer"
        >
          <div className="relative">
            <Bell className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
        </button>
      </div>
    )
  }

  return (
    <div className="w-80 border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Bell className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Notifications</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {unreadCount} unread • Activity feed
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <button 
            onClick={onMarkAllRead}
            className="flex-1 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors cursor-pointer"
          >
            Mark all read
          </button>
          <button 
            onClick={onClearAll}
            className="flex-1 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Clear all
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-2 p-4">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-3 rounded-xl border ${getNotificationColor(notification.type)} ${
                !notification.isRead ? 'border-l-4 border-l-blue-500' : ''
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-white text-sm">
                        {notification.title}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {notification.message}
                      </p>
                    </div>
                    <button 
                      onClick={() => onDismiss && onDismiss(notification.id)}
                      className="p-1 hover:bg-white/50 dark:hover:bg-slate-800/50 rounded-lg cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {notification.timestamp}
                    </span>
                    {notification.commitmentId && (
                      <button className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer">
                        View commitment →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {notifications.length === 0 && (
          <div className="text-center py-12 px-4">
            <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-slate-400 dark:text-slate-600" />
            </div>
            <h4 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              All caught up
            </h4>
            <p className="text-slate-550 dark:text-slate-450 text-xs">
              No new notifications. Your commitments are on track.
            </p>
          </div>
        )}
      </div>

      {/* AI Summary */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800">
        <div className="p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-100 dark:border-blue-800">
          <div className="flex items-center space-x-2">
            <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                AI Summary Active
              </p>
              <p className="text-[10px] text-slate-600 dark:text-slate-400">
                Analyzing commitment patterns in real-time
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}