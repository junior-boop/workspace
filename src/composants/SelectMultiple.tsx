function SelectMultiple({ options, selected, onChange }: { options: string[], selected: string[], onChange: (values: string[]) => void }) {
  const toggle = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((item) => item !== option))
    } else {
      onChange([...selected, option])
    }
  }

  return (
    <div className='flex flex-wrap gap-2'>
      {options.map((option) => {
        const isSelected = selected.includes(option)
        return (
          <button
            key={option}
            type='button'
            onClick={() => toggle(option)}
            className={`px-4 py-2 rounded-full text-sm font-medium border ${isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'}`}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}

export default SelectMultiple
