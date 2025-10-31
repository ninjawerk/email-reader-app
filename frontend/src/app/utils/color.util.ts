// Returns a pastel background color chosen from a distinct, curated palette based on input string
export function colorFromString(input: string): string {
  const palette = [
    '#F9C74F', // saffron
    '#90BE6D', // green
    '#4D908E', // teal
    '#577590', // desat blue
    '#F8961E', // orange
    '#43AA8B', // jade
    '#277DA1', // deep cyan
    '#F9844A', // tangerine
    '#B56576', // mauve
    '#6D597A', // purple gray
    '#84A59D', // sage
    '#F28482', // coral
    '#A4C3B2', // soft mint
    '#FFB3C6', // rose
    '#BDE0FE', // powder blue
    '#C1D3FE'  // light periwinkle
  ];

  const str = input || '';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  const idx = Math.abs(hash) % palette.length;
  return palette[idx];
}
