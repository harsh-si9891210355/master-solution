export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between text-xs text-gray-400 flex-shrink-0">
      <p className="text-xs text-gray-700">
          Copyright © {new Date().getFullYear()}{' '}
          <strong>HCLTECH</strong> and its related entities. All Rights Reserved.
        </p>
      <div className="flex gap-4">
        <a href="#" className="hover:text-gray-600 transition-colors">Privacy</a>
        <a href="#" className="hover:text-gray-600 transition-colors">Terms</a>
        <a href="#" className="hover:text-gray-600 transition-colors">Help</a>
      </div>
    </footer>
  )
}