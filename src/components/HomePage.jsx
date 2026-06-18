export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-4xl font-medium tracking-tight mb-1">
          <img src="/assets/FeedbackLOGO.png" alt="GreLines" className="w-12 h-12 inline-block align-middle mr-3 object-contain" />
          <span className="align-middle">Évaluation</span>
        </h1>
        <h1 className="text-2xl font-medium tracking-tight mb-1">
          Nouvelle évaluation
        </h1>
        <p className="text-sm text-[#555] mb-10">
          Choissez le site que vous souhaitez évaluer.
        </p>

        <div className="flex flex-col gap-4">

          {/* GreLines */}
          <a
            href="/grelines"
            className="group flex items-center gap-4 rounded-[20px] bg-[#141414] border border-[#222] px-6 py-5 hover:bg-[#191919] hover:border-[#333] transition-all"
          >
            <div className="w-10 h-10 rounded-[10px] bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img src="/assets/GreLinesLOGO.png" alt="GreLines" className="w-6 h-6 object-contain" />
            </div>
            <div className="text-left flex-1">
              <p className="text-[15px] font-medium text-white">GreLines</p>
              <p className="text-xs text-[#555] mt-0.5">Évaluer le site GreLines</p>
            </div>
            <svg className="w-4 h-4 text-[#333] group-hover:text-[#555] transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
            </svg>
          </a>

          {/* GreGo */}
          <a
            href="/grego"
            className="group flex items-center gap-4 rounded-[20px] bg-[#141414] border border-[#222] px-6 py-5 hover:bg-[#191919] hover:border-[#333] transition-all"
          >
            <div className="w-10 h-10 rounded-[10px] bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img src="/assets/GreGoLOGO.png" alt="GreGo" className="w-6 h-6 object-contain" />
            </div>
            <div className="text-left flex-1">
              <p className="text-[15px] font-medium text-white">GreGo</p>
              <p className="text-xs text-[#555] mt-0.5">Évaluer le site GreGo</p>
            </div>
            <svg className="w-4 h-4 text-[#333] group-hover:text-[#555] transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
            </svg>
          </a>

        </div>

        <p className="text-xs text-[#333] mt-10">GreStudio Feedback - @antquu - All rights reserved</p>
      </div>
    </main>
  );
}