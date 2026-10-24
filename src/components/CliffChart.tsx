import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { t } from '../i18n'
import { cliffData } from '../rules/cliff'
import type { Household, Policies } from '../rules/types'

type CliffChartProps = {
  household: Household
  policies: Policies
}

/** Compact USD formatter for axis ticks ($1.2k, $103k). */
function usdShort(value: number): string {
  if (value >= 1000) return `$${Math.round(value / 1000)}k`
  return `$${value}`
}

/**
 * Cliff view (Requirement 5). The policy files carry no "estimated yearly
 * energy cost" curve, so — per the cliff.ts design note — this charts the real
 * policy thresholds for the household's size: each FPL band upper limit as a
 * bar, the 60% SMI cliff as a reference line, and the household's own income
 * as a reference line ("You"). Everything comes from the pure `cliffData`
 * producer; all strings come from i18n; colors are design tokens.
 */
export function CliffChart({ household, policies }: CliffChartProps) {
  const { limit60Smi, householdIncome, aboveCliff, markers } = cliffData(
    household,
    policies,
  )

  // One bar per FPL band threshold, labeled via i18n. The smi_60 band is the
  // cliff line itself and is highlighted.
  const data = markers.map((m) => ({
    band: t(m.labelKey),
    value: m.value,
    isCliff: m.id === 'smi_60',
  }))

  return (
    <section className="rounded-2xl border border-hairline bg-card p-6 shadow-sm">
      <h2 className="font-heading text-xl font-extrabold text-ink">
        {t('cliff.title')}
      </h2>
      <p className="mt-2 text-base leading-snug text-muted">
        {t('cliff.description')}
      </p>

      <div
        className="mt-4 h-56 w-full"
        role="img"
        aria-label={t('cliff.chartAriaLabel')}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, bottom: 4, left: 0 }}
          >
            <CartesianGrid stroke="var(--color-hairline)" vertical={false} />
            <XAxis
              dataKey="band"
              tick={{ fill: 'var(--color-muted-2)', fontSize: 12 }}
              stroke="var(--color-hairline)"
            />
            <YAxis
              tickFormatter={usdShort}
              tick={{ fill: 'var(--color-muted-2)', fontSize: 12 }}
              stroke="var(--color-hairline)"
              width={44}
            />
            <Tooltip
              formatter={(value) => [
                `$${Number(value).toLocaleString('en-US')}`,
                t('cliff.axis.income'),
              ]}
              contentStyle={{
                borderRadius: 12,
                border: '1px solid var(--color-hairline)',
                fontSize: 13,
              }}
            />
            <Bar dataKey="value" isAnimationActive={false} radius={[4, 4, 0, 0]}>
              {data.map((d) => (
                <Cell
                  key={d.band}
                  fill={
                    d.isCliff ? 'var(--color-ink)' : 'var(--color-brand)'
                  }
                  fillOpacity={d.isCliff ? 1 : 0.55}
                />
              ))}
            </Bar>
            <ReferenceLine
              y={limit60Smi}
              stroke="var(--color-ink)"
              strokeDasharray="4 4"
              label={{
                value: t('cliff.cliffLineLabel'),
                position: 'insideTopRight',
                fill: 'var(--color-ink)',
                fontSize: 12,
              }}
            />
            <ReferenceLine
              y={householdIncome}
              stroke="var(--color-success)"
              strokeWidth={2}
              label={{
                value: t('cliff.youAreHereLabel'),
                position: 'insideBottomRight',
                fill: 'var(--color-success)',
                fontSize: 12,
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-3 text-sm text-muted-2">{t('cliff.estimateNote')}</p>

      <div
        className={[
          'mt-4 rounded-xl border p-4',
          aboveCliff
            ? 'border-brand/40 bg-brand/5'
            : 'border-success/40 bg-success-tint',
        ].join(' ')}
      >
        <p className="font-semibold text-ink">
          {aboveCliff
            ? t('cliff.aboveCliff.heading')
            : t('cliff.aboveCliff.belowBody')}
        </p>
        {aboveCliff && (
          <p className="mt-1 text-sm text-muted">{t('cliff.aboveCliff.body')}</p>
        )}
      </div>
    </section>
  )
}
