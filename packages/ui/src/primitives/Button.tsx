import React from 'react'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement>

export function Button(props: Props) {
  return (
    <button
      {...props}
      style={{
        padding: '8px 12px',
        borderRadius: 8,
        background: '#111827',
        color: 'white',
        border: '1px solid #1f2937',
        cursor: 'pointer'
      }}
    />
  )
}

