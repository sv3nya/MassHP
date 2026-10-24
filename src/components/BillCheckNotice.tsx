import { t } from '../i18n'
import type { BillCheckFlag } from '../rules/types'
import { Icon } from './Icon'

type BillCheckNoticeProps = {
  flag?: BillCheckFlag
}

/**
 * Hedged retroactive-discount notice (R6.3). Shown only when the engine raised
 * the bill-check flag. The copy never states an amount — it comes from the
 * engine's messageKey.
 */
export function BillCheckNotice({ flag }: BillCheckNoticeProps) {
  if (!flag?.onStandardRate) return null

  return (
    <section className="rounded-2xl border border-brand/40 bg-brand/5 p-5">
      <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-ink">
        <Icon name="dollar" className="h-5 w-5 text-brand" />
        {t('billcheck.heading')}
      </h2>
      <p className="mt-2 text-base leading-snug text-muted">
        {t(flag.messageKey)}
      </p>
    </section>
  )
}
