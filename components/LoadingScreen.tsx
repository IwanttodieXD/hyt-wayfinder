export default function LoadingScreen() {
  return (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-700">
      <div className="text-center space-y-6">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white mx-auto"></div>
        <h2 className="text-2xl font-semibold text-white">Loading 3D Environment...</h2>
        <p className="text-blue-200">Preparing HYT Global Institute tour</p>
      </div>
    </div>
  );
}
