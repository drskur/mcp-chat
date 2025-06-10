export function StatusBar() {
  return (
    <div className="bg-gray-900/80 border-t border-gray-900 p-2 px-4 text-xs text-gray-500 flex flex-col md:flex-row justify-between items-center">
      <div className="flex items-center gap-2 mb-1 md:mb-0">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3 w-3"
        >
          <path d="M14 5c.5 1.5 1.5 2 2.5 2h1a3 3 0 0 1 0 6h-.5A5.5 5.5 0 0 1 14 7.5V5Z" />
          <path d="M6 8h2a2 2 0 0 0 0-4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-2a4 4 0 0 1-4 4v4h-2.5" />
          <path d="M4 14a4 4 0 0 1 4-4" />
        </svg>
        <span className="font-medium">POWERED BY AWS</span>
      </div>
      <div className="mb-1 md:mb-0">
        <span>Designed and built by the AWS KOREA PACE Team</span>
      </div>
      <div>
        <span>
          &copy; 2025 Amazon Web Services, Inc. All rights reserved.
        </span>
      </div>
    </div>
  );
}