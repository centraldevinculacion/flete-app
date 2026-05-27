export function Stars({ value = 0, max = 5, size = 20, onClick }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => {
        const filled = i < Math.round(value)
        return (
          <svg
            key={i}
            width={size} height={size}
            viewBox="0 0 24 24"
            fill={filled ? '#FBBF24' : 'none'}
            stroke={filled ? '#FBBF24' : '#D1D5DB'}
            strokeWidth="1.5"
            onClick={onClick ? () => onClick(i + 1) : undefined}
            className={onClick ? 'cursor-pointer hover:scale-110 transition-transform' : ''}
          >
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
          </svg>
        )
      })}
    </div>
  )
}

export function RatingInput({ value, onChange, required3justification = true }) {
  return (
    <div>
      <Stars value={value} size={36} onClick={onChange} />
      {value > 0 && (
        <p className="text-xs text-gray-500 mt-1">
          {value === 1 && '⭐ Muy malo'}
          {value === 2 && '⭐⭐ Malo'}
          {value === 3 && '⭐⭐⭐ Regular'}
          {value === 4 && '⭐⭐⭐⭐ Bueno'}
          {value === 5 && '⭐⭐⭐⭐⭐ Excelente'}
        </p>
      )}
    </div>
  )
}

export default Stars
