export default function BottomSheet({ children }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 bg-[#FAF8F3] rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-4 pt-3 pb-8 animate-slide-up">
      <div className="w-12 h-1.5 bg-[#CBD5E1]/80 rounded-full mx-auto mb-3 cursor-grab" />
      {children}
    </div>
  );
}
