// @hidden

function MessageLoading() {
  return (
    <>
      <style>
        {`
        @keyframes shimmer {
          0% {
            background-position: 200% center;
          }
          100% {
            background-position: -200% center;
          }
        }
        .message-shimmer-text {
          background: linear-gradient(
            90deg, 
            rgba(59, 130, 246, 0.4) 0%, 
            rgba(99, 102, 241, 1) 25%, 
            rgba(79, 70, 229, 0.8) 50%, 
            rgba(59, 130, 246, 0.4) 100%
          );
          background-size: 200% auto;
          color: transparent;
          background-clip: text;
          -webkit-background-clip: text;
          animation: shimmer 2s linear infinite;
          display: inline-block;
        }
        `}
      </style>

      <div className="flex items-center justify-center my-2">
        <div className="message-shimmer-text text-lg font-medium">
          Generating response...
        </div>
      </div>
    </>
  );
}

export { MessageLoading };
  