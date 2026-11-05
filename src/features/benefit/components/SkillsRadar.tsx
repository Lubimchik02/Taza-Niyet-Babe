import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Svg, { Line, Polygon, Text as SvgText } from 'react-native-svg';

import type { Language } from '@/i18n/languages';
import { useTheme } from '@/theme/ThemeProvider';

import type { BenefitSkill } from '../api';
import { axisPoint, radarPolygon, toSvgPoints } from '../radar';

// Холст шире круга: длинным подписям («Коммуникация») хватает места по бокам.
const WIDTH = 380;
const HEIGHT = 300;
const RADIUS = 92;
const CENTER = { x: WIDTH / 2, y: HEIGHT / 2 };
// Шкала от 50 XP: у новичка диаграмма не пустая, но и не «полностью прокачана».
const MIN_SCALE = 50;

/** Радар-диаграмма прокачанных навыков. Для экранного чтеца — те же данные текстом. */
export function SkillsRadar({ skills }: { skills: BenefitSkill[] }) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const lang = (['kk', 'ru', 'en'].includes(i18n.language) ? i18n.language : 'ru') as Language;
  if (skills.length < 3) return null;

  const values = skills.map((s) => s.xp);
  const rings = [1 / 3, 2 / 3, 1].map((k) =>
    toSvgPoints(skills.map((_, i) => axisPoint(i, skills.length, RADIUS * k, CENTER))),
  );
  const description = skills.map((s) => `${s.name[lang]} ${s.xp} XP`).join(', ');

  return (
    <View
      accessible
      role="img"
      aria-label={t('benefit.skillsChart', { list: description })}
      style={{ width: '100%', maxWidth: 480, alignSelf: 'center' }}
    >
      <Svg
        width="100%"
        height={HEIGHT}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {rings.map((points, i) => (
          <Polygon key={i} points={points} fill="none" stroke={colors.border} strokeWidth={1} />
        ))}
        {skills.map((s, i) => {
          const end = axisPoint(i, skills.length, RADIUS, CENTER);
          return (
            <Line
              key={s.code}
              x1={CENTER.x}
              y1={CENTER.y}
              x2={end.x}
              y2={end.y}
              stroke={colors.border}
              strokeWidth={1}
            />
          );
        })}
        <Polygon
          points={toSvgPoints(radarPolygon(values, RADIUS, CENTER, MIN_SCALE))}
          fill={colors.primary}
          fillOpacity={0.35}
          stroke={colors.primary}
          strokeWidth={2}
        />
        {skills.map((s, i) => {
          const label = axisPoint(i, skills.length, RADIUS + 26, CENTER);
          return (
            <SvgText
              key={s.code}
              x={label.x}
              y={label.y + 4}
              fontSize={14}
              fontWeight="600"
              fill={colors.text}
              textAnchor={
                Math.abs(label.x - CENTER.x) < 4 ? 'middle' : label.x > CENTER.x ? 'start' : 'end'
              }
            >
              {s.name[lang]}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}
