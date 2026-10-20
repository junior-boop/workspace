function Layout({ children, outils }: { children: React.ReactNode, outils?: React.ReactNode }) {
  return (
    <div className='flex gap-6 h-full'>
      <div className='w-full md:w-250 h-full overflow-y-auto overflow-x-hidden border-r border-gray-200'>
        {children}
      </div>
      <div className='flex-1 hidden lg:flex'>
        {outils}
      </div>
    </div>
  )
}

export default Layout
