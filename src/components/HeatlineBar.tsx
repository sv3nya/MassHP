import { t } from '../i18n'
import { Icon } from './Icon'

/**
 * Massachusetts Heatline contact bar. Per compliance rules the Heatline
 * number must appear on screening and result screens. The number is a
 * tap-to-call link for the phone-first primary user.
 */
export function HeatlineBar() {
  const number = t('heatline.number')
  return (
    <div className="flex items-center gap-3 bg-heatline-bg px-6 py-4">
      <Icon name="phone" className="h-5 w-5 shrink-0 text-brand" />
      <p className="text-ink">
        <span className="font-semibold">{t('heatline.prompt')} </span>
        <a
          href={`tel:${number.replace(/[^0-9]/g, '')}`}
          className="font-semibold underline-offset-2 hover:underline"
          aria-label={t('heatline.callAriaLabel')}
        >
          {number}
        </a>
      </p>
    </div>
  )
}
