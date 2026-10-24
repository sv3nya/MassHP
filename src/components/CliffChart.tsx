import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
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
 * Cliff view (Requirement 5.1). Plots the estimated yearly energy-assistance
 * value for this household size against income, marks the 60% SMI cliff line,
 * and marks the household's own income. The value steps down to zero above the
 * cliff — the visual "cliff". All data comes from the pure `cliffData`
 * producer (policy-driven); all strings come from i18n; colors are tokens.
 * Dollar figures are estimates and labeled as such (R7.4).
 */
export function CliffChart({ household, policies }: CliffChartProps) {
  const { limit60Smi, householdIncome, aboveCliff, data } = cliffData(
    household,
    policies,
  )

  // The household's estimated value, for the "You are here" marker: the sample
  // closest to their income.
  const hereValue =
    data.reduce<(typeof data)[number] | null>((closest, d) => {
      if (closest === null) return d
      return Math.abs(d.income - householdIncome) <
        Math.abs(closest.income - householdIncome)
        ? d
        : closest
    }, null)?.estimatedValue ?? 0

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
          <AreaChart
            data={data}
            margin={{ top: 8, right: 8, bottom: 4, left: 0 }}
          >
            <defs>
              <linearGradient id="cliffFill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--color-brand)"
                  stopOpacity={0.35}
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-brand)"
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--color-hairline)" vertical={false} />
            <XAxis
              dataKey="income"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={usdShort}
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
                `$${Number(value).toLocaleString('en-US')} (${t('cliff.estimateLabel')})`,
                t('cliff.axis.value'),
              ]}
              labelFormatter={(label) =>
                `${t('cliff.axis.income')}: $${Number(label).toLocaleString('en-US')}`
              }
              contentStyle={{
                borderRadius: 12,
                border: '1px solid var(--color-hairline)',
                fontSize: 13,
              }}
            />
            <Area
              type="stepAfter"
              dataKey="estimatedValue"
              stroke="var(--color-brand)"
              strokeWidth={2}
              fill="url(#cliffFill)"
              isAnimationActive={false}
            />
            <ReferenceLine
              x={limit60Smi}
              stroke="var(--color-ink)"
              strokeDasharray="4 4"
              label={{
                value: t('cliff.cliffLineLabel'),
                position: 'insideTopRight',
                fill: 'var(--color-ink)',
                fontSize: 12,
              }}
            />
            <ReferenceDot
              x={householdIncome}
              y={hereValue}
              r={5}
              fill="var(--color-success)"
              stroke="var(--color-card)"
              strokeWidth={2}
              label={{
                value: t('cliff.youAreHereLabel'),
                position: 'top',
                fill: 'var(--color-success)',
                fontSize: 12,
              }}
            />
          </AreaChart>
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
