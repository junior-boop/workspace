function SoldeCaisse({ montant }: { montant: number }) {
  return (
    <div className='rounded-2xl bg-green-50 p-6'>
      <span className='text-sm text-gray-500 font-medium uppercase'>Solde total en caisse</span>
      <p className='text-5xl font-bold text-green-900 mt-2'>
        {montant.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FCFA
      </p>
    </div>
  )
}

export default SoldeCaisse
