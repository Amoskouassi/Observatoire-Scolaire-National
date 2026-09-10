export default function BottomSheet({ children }) {
  return (
    <div className="bottom-sheet animate-slide-up">
      {/* Handle */}
      <div className="bottom-sheet-handle cursor-grab" />
      {children}
    </div>
  );
}
