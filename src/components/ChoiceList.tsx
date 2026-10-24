import { Icon } from './Icon'

export type Choice = {
  value: string
  label: string
  /** Optional sub-label shown under the main label. */
  hint?: string
}

type ChoiceListProps = {
  choices: Choice[]
  /** For single-select: the chosen value. For multi: the chosen values. */
  selected: string | string[]
  multi?: boolean
  onChange: (value: string) => void
  /** Accessible name for the group. */
  ariaLabel: string
}

/**
 * Large, tappable list of options for the phone-first user. Single-select
 * behaves like radios; multi-select behaves like checkboxes. Styling uses
 * design tokens; selection is shown with the brand color and a check.
 */
export function ChoiceList({
  choices,
  selected,
  multi = false,
  onChange,
  ariaLabel,
}: ChoiceListProps) {
  const isSelected = (value: string) =>
    Array.isArray(selected) ? selected.includes(value) : selected === value

  return (
    <div
      role={multi ? 'group' : 'radiogroup'}
      aria-label={ariaLabel}
      className="mt-6 flex flex-col gap-3"
    >
      {choices.map((choice) => {
        const active = isSelected(choice.value)
        return (
          <button
            key={choice.value}
            type="button"
            role={multi ? 'checkbox' : 'radio'}
            aria-checked={active}
            onClick={() => onChange(choice.value)}
            className={[
              'flex items-center justify-between gap-3 rounded-xl border px-4 py-4 text-left',
              active
                ? 'border-brand bg-brand/5'
                : 'border-ink/20 bg-card hover:border-ink/40',
            ].join(' ')}
          >
            <span>
              <span className="block text-lg font-semibold text-ink">
                {choice.label}
              </span>
              {choice.hint && (
                <span className="mt-0.5 block text-sm text-muted-2">
                  {choice.hint}
                </span>
              )}
            </span>
            <span
              className={[
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
                active ? 'border-brand bg-brand text-card' : 'border-ink/30',
              ].join(' ')}
            >
              {active && <Icon name="check" className="h-4 w-4" />}
            </span>
          </button>
        )
      })}
    </div>
  )
}
