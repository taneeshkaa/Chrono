export default function ConnectionsPage() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Connections</h1>

      <div className="grid gap-4">
        <div className="border rounded-xl p-4">
          <h2 className="text-lg font-semibold">Gmail</h2>
          <p className="text-sm text-gray-500">
            Connect Gmail accounts to discover commitments from emails.
          </p>

          <a
            href="/api/connections/gmail/connect"
            className="inline-block mt-3 px-4 py-2 border rounded-lg"
          >
            Connect Gmail
          </a>
        </div>

        <div className="border rounded-xl p-4">
          <h2 className="text-lg font-semibold">Google Calendar</h2>
          <p className="text-sm text-gray-500">
            Sync events, interviews, exams and meetings.
          </p>
          <button className="mt-3 px-4 py-2 border rounded-lg">
            Connect Calendar
          </button>
        </div>

        <div className="border rounded-xl p-4">
          <h2 className="text-lg font-semibold">Outlook</h2>
          <p className="text-sm text-gray-500">
            Connect Outlook email and calendar.
          </p>
          <button className="mt-3 px-4 py-2 border rounded-lg">
            Connect Outlook
          </button>
        </div>
      </div>
    </div>
  );
}